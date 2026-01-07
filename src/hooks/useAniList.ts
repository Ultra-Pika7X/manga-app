"use client";

import { useState, useEffect, useCallback } from 'react';
import * as AniListAPI from '@/lib/anilist';
import { findBestMatch } from '@/lib/similarity';
import { db, isFirebaseConfigured, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CLIENT_ID = '34177';
const STORAGE_KEY = 'anilist_token';
const MAPPING_KEY_PREFIX = 'anilist_mapping_';

export function useAniList() {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AniListAPI.AniListUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [userList, setUserList] = useState<Map<number, any>>(new Map());
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);

    // --- Token Validation & Auto-Logout ---
    const checkToken = useCallback(async () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setToken(stored);
            try {
                const viewer = await AniListAPI.getViewer(stored);
                if (viewer) {
                    setUser(viewer);
                } else {
                    // Token invalid or expired → Logout
                    console.warn('[AniList] Token invalid/expired. Logging out.');
                    logout();
                }
            } catch (e) {
                // Network error (AniList down) → Keep token, set user null temporarily
                console.error('[AniList] Failed to verify token (network?):', e);
                // Don't logout on network error - token may still be valid
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        checkToken();
    }, [checkToken]);

    const login = () => {
        const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token`;
        window.location.href = url;
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        setUserList(new Map());
    };

    const handleCallback = () => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (accessToken) {
                localStorage.setItem(STORAGE_KEY, accessToken);
                setToken(accessToken);
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

            const currentUser = auth?.currentUser;
            if (isFirebaseConfigured && db && currentUser) {
                const docRef = doc(db, 'users', currentUser.uid, 'integrations', 'anilist');
                await setDoc(docRef, { mappings: { [mangaId]: mediaId } }, { merge: true });
            }
        } catch (e) {
            console.error('[AniList] Failed to save mapping:', e);
        }
    };

    // --- Load Remote Mappings ---
    useEffect(() => {
        const loadRemoteMappings = async () => {
            const currentUser = auth?.currentUser;
            if (!isFirebaseConfigured || !db || !currentUser) return;

            try {
                const docRef = doc(db, 'users', currentUser.uid, 'integrations', 'anilist');
                const snapshot = await getDoc(docRef);

                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const remoteMappings = data.mappings || {};

                    Object.entries(remoteMappings).forEach(([mangaId, mediaId]) => {
                        const localVal = getMapping(mangaId);
                        if (!localVal || localVal !== mediaId) {
                            localStorage.setItem(MAPPING_KEY_PREFIX + mangaId, String(mediaId));
                        }
                    });
                }
            } catch (err) {
                console.error("[AniList] Failed to load remote mappings:", err);
            }
        };

        loadRemoteMappings();
    }, [user]);

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
        refreshList,
        isSyncEnabled,
        toggleSync,
        clearMappings
    };
}
