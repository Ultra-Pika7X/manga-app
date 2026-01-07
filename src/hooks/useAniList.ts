"use client";

import { useState, useEffect, useCallback } from 'react';
import * as AniListAPI from '@/lib/anilist';
import { findBestMatch } from '@/lib/similarity';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { encryptToken, decryptToken } from '@/lib/encryption';

const CLIENT_ID = '34177';
const STORAGE_KEY = 'anilist_token';
const MAPPING_KEY_PREFIX = 'anilist_mapping_';
// Note: We still use localStorage as a "fast cache" but the source of truth is now Firestore

export function useAniList() {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AniListAPI.AniListUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [userList, setUserList] = useState<Map<number, any>>(new Map());
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);

    // --- Token Logic ---
    const checkToken = useCallback(async () => {
        let stored = localStorage.getItem(STORAGE_KEY);
        const currentUser = auth?.currentUser;

        // If no local token, try pulling from encrypted Firestore
        if (!stored && currentUser) {
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'integrations', 'anilist');
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (data.token && data.iv) {
                        const decrypted = await decryptToken(currentUser.uid, data.token, data.iv);
                        if (decrypted) {
                            stored = decrypted;
                            localStorage.setItem(STORAGE_KEY, decrypted);
                        }
                    }
                }
            } catch (e) {
                console.error('[AniList] Firestore token fetch failed:', e);
            }
        }

        if (stored) {
            setToken(stored);
            try {
                const viewer = await AniListAPI.getViewer(stored);
                if (viewer) {
                    setUser(viewer);
                } else {
                    logout();
                }
            } catch (e) {
                console.error('[AniList] Failed to verify token:', e);
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // We wait for auth to be ready if firebase is enabled
        const unsubscribe = auth.onAuthStateChanged(() => {
            checkToken();
        });
        return () => unsubscribe();
    }, [checkToken]);

    const login = () => {
        const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token`;
        window.location.href = url;
    };

    const logout = async () => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        setUserList(new Map());

        const currentUser = auth?.currentUser;
        if (currentUser && db) {
            try {
                // We keep the mapping cache, but clear the token
                const docRef = doc(db, 'users', currentUser.uid, 'integrations', 'anilist');
                await setDoc(docRef, { token: null, iv: null }, { merge: true });
            } catch { }
        }
    };

    const handleCallback = async () => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
                localStorage.setItem(STORAGE_KEY, accessToken);
                setToken(accessToken);

                // Encrypt and save to Firestore
                const currentUser = auth?.currentUser;
                if (currentUser && db) {
                    try {
                        const { encrypted, iv } = await encryptToken(currentUser.uid, accessToken);
                        const docRef = doc(db, 'users', currentUser.uid, 'integrations', 'anilist');
                        await setDoc(docRef, {
                            token: encrypted,
                            iv,
                            updatedAt: Date.now(),
                            service: 'anilist'
                        }, { merge: true });
                    } catch (e) {
                        console.error('[AniList] Failed to sync token to Cloud:', e);
                    }
                }

                window.history.replaceState(null, '', window.location.pathname);
                checkToken();
            }
        }
    };

    // --- Mappings ---
    const getMapping = (mangaId: string): number | null => {
        try {
            const check = localStorage.getItem(MAPPING_KEY_PREFIX + mangaId);
            return check ? parseInt(check) : null;
        } catch {
            return null;
        }
    };

    const saveMapping = async (mangaId: string, mediaId: number) => {
        try {
            localStorage.setItem(MAPPING_KEY_PREFIX + mangaId, mediaId.toString());
        } catch (e) {
            console.error('[AniList] Failed to save mapping:', e);
        }
    };

    // --- Sync Progress (Fire-and-Forget with Resilience) ---
    const syncProgress = async (mangaId: string, title: string, chapterNumber: number) => {
        if (!token || !isSyncEnabled) return;

        try {
            let mediaId = getMapping(mangaId);

            if (!mediaId) {
                console.log(`[AniList] Not mapped: ${title}. Searching...`);
                const candidates = await AniListAPI.searchManga(title, token);
                const best = findBestMatch(title, candidates);

                if (best) {
                    console.log(`[AniList] Auto-Matched: ${best.title.english || best.title.romaji}`);
                    mediaId = best.id;
                    await saveMapping(mangaId, mediaId);
                } else {
                    console.warn(`[AniList] No confident match for: ${title}`);
                    return;
                }
            }

            if (mediaId) {
                console.log(`[AniList] Syncing ${title} -> Ch ${chapterNumber}`);
                await AniListAPI.updateProgress(mediaId, chapterNumber, token);
            }
        } catch (e) {
            // RESILIENCE: AniList is down or rate limited - fail silently
            console.error('[AniList] syncProgress failed (network/rate limit?):', e);
        }
    };

    const overrideMapping = (mangaId: string, anilistId: number) => {
        saveMapping(mangaId, anilistId);
        console.log(`[AniList] Manual override for ${mangaId} -> ${anilistId}`);
    };

    // --- User List (Cached) ---
    const refreshList = useCallback(async () => {
        if (!token || !user) return;

        try {
            console.log('[AniList] Refreshing user list...');
            const list = await AniListAPI.getUserList(user.id, token);
            const map = new Map();
            list.forEach(entry => map.set(entry.media.id, entry));
            setUserList(map);
        } catch (e) {
            console.error('[AniList] Failed to refresh list:', e);
            throw e; // Re-throw so UI can show error state
        }
    }, [token, user]);

    useEffect(() => {
        if (token && user) {
            refreshList().catch(() => { }); // Ignore errors on initial load
        }
    }, [token, user, refreshList]);

    const getEntry = (mangaId: string) => {
        try {
            const mediaId = getMapping(mangaId);
            if (!mediaId) return null;
            return userList.get(mediaId);
        } catch {
            return null;
        }
    };

    // --- Import Progress ---
    const importProgress = async (localHistory: any[], updateLocalHistory: (item: any) => void) => {
        if (!token || !user) return;

        try {
            console.log('[AniList] Importing progress...');
            let list = Array.from(userList.values());
            if (list.length === 0) {
                list = await AniListAPI.getUserList(user.id, token);
            }
            console.log(`[AniList] Found ${list.length} remote entries.`);
            // Further import logic...
        } catch (e) {
            console.error('[AniList] Import failed:', e);
        }
    };

    // --- Settings ---
    useEffect(() => {
        try {
            const stored = localStorage.getItem('anilist_sync_enabled');
            if (stored !== null) {
                setIsSyncEnabled(stored === 'true');
            }
        } catch { }
    }, []);

    const toggleSync = () => {
        const newValue = !isSyncEnabled;
        setIsSyncEnabled(newValue);
        try {
            localStorage.setItem('anilist_sync_enabled', String(newValue));
        } catch { }
    };

    const clearMappings = () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(MAPPING_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            console.log('[AniList] Mappings cleared.');
        } catch { }
    };

    const getEntriesByStatus = (status: string) => {
        return Array.from(userList.values()).filter(entry => entry.status === status);
    };

    const getReadingEntries = () => {
        return getEntriesByStatus('CURRENT');
    };

    return {
        token,
        user,
        loading,
        login,
        logout,
        handleCallback,
        syncProgress,
        importProgress,
        overrideMapping,
        getEntry,
        getEntriesByStatus,
        getReadingEntries,
        refreshList,
        isSyncEnabled,
        toggleSync,
        clearMappings
    };
}
