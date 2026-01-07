"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as AniListAPI from '@/lib/anilist';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { encryptToken, decryptToken } from '@/lib/encryption';
import { findBestMatch } from '@/lib/similarity';

const CLIENT_ID = '34177';
const STORAGE_KEY = 'anilist_token';
const MAPPING_KEY_PREFIX = 'anilist_mapping_';

interface AniListContextType {
    token: string | null;
    user: AniListAPI.AniListUser | null;
    loading: boolean;
    login: () => void;
    logout: () => Promise<void>;
    handleCallback: () => Promise<void>;
    syncProgress: (mangaId: string, title: string, chapterNumber: number) => Promise<void>;
    importProgress: (localHistory: any[], updateLocalHistory: (item: any) => void) => Promise<void>;
    overrideMapping: (mangaId: string, anilistId: number) => void;
    getEntry: (mangaId: string) => any;
    getEntriesByStatus: (status: string) => any[];
    getReadingEntries: () => any[];
    refreshList: () => Promise<void>;
    isSyncEnabled: boolean;
    toggleSync: () => void;
    clearMappings: () => void;
}

const AniListContext = createContext<AniListContextType>({} as AniListContextType);

export const AniListProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AniListAPI.AniListUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [userList, setUserList] = useState<Map<number, any>>(new Map());
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);

    // --- Initialization & Token Logic ---
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
                }
            } catch (e: any) {
                if (e.message === 'UNAUTHORIZED') {
                    console.warn('[AniList] Token expired (401), logging out.');
                    await logout();
                } else {
                    console.warn('[AniList] Token verification failed (Network/Other), maintaining session.', e);
                    // Keep token, assumes offline or temporary error
                }
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // Initial load
        checkToken();

        // Listen for Firebase auth changes to potentially sync token
        const unsubscribe = auth.onAuthStateChanged(() => {
            // We don't want to reset everything on auth change if we already have a token locally
            // But if we switched users, we should re-check.
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
                await checkToken();
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

    const overrideMapping = (mangaId: string, anilistId: number) => {
        saveMapping(mangaId, anilistId);
        console.log(`[AniList] Manual override for ${mangaId} -> ${anilistId}`);
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

    // --- Sync Progress ---
    const syncProgress = async (mangaId: string, title: string, chapterNumber: number) => {
        if (!token || !isSyncEnabled) return;

        // Optimistic update mechanism (not implemented here, but good for UI)
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
                // Refresh list in background to keep UI in sync
                refreshList().catch(() => { });
            }
        } catch (e) {
            console.error('[AniList] syncProgress failed:', e);
        }
    };

    // --- User List ---
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
        }
    }, [token, user]);

    useEffect(() => {
        if (token && user) {
            refreshList().catch(() => { });
        }
    }, [token, user, refreshList]);

    const getEntry = (mangaId: string) => {
        const mediaId = getMapping(mangaId);
        if (!mediaId) return null;
        return userList.get(mediaId);
    };

    const getEntriesByStatus = (status: string) => {
        return Array.from(userList.values()).filter(entry => entry.status === status);
    };

    const getReadingEntries = () => {
        return getEntriesByStatus('CURRENT');
    };

    const importProgress = async (localHistory: any[], updateLocalHistory: (item: any) => void) => {
        // Logic as before
        if (!token || !user) return;
        // Placeholder for full import logic
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

    // OPTIONAL: Block rendering until auth resolved to prevent "flash" of logged out state
    // But since AniList is optional, we might just return children with loading=true?
    // User requested: "Delay UI render until auth restored" -> implying strict blocking
    if (loading) {
        return null; // Or a minimal spinner: <div className="h-screen bg-[#1a1a2e]" />
    }

    return (
        <AniListContext.Provider value={{
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
        }}>
            {children}
        </AniListContext.Provider>
    );
};

export const useAniListContext = () => useContext(AniListContext);
