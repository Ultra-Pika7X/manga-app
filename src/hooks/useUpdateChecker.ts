import { useState, useEffect, useCallback, useRef } from 'react';
import { useAniList } from './useAniList';
import { useDownload } from './useDownload';
import { useSettings } from './useSettings';
import { resolveMappingAction } from '@/app/actions';

/**
 * Update Checker Logic & Rate Limiting:
 * 1. POLL: We fetch the user's entire 'READING' list from AniList in one GraphQL request.
 * 2. COMPARE: We compare `media.chapters` (total) vs `entry.progress` (local read count).
 * 3. DELTA: We store the 'last total' in localStorage to distinguish between 'unread' and 'newly released'.
 * 
 * RATE LIMITING:
 * AniList allows 90 requests per minute. Since we check the whole list in 1-2 requests,
 * we can safely poll every 30 minutes without ever hitting limits. 
 * We do not scrape; we only use authoritative AniList metadata.
 */

const POLL_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'anilist_updates_status';

interface AniListUpdateStatus {
    mangaId: string;
    lastTotalChapters: number;
    hasNotification: boolean;
    unreadCount: number;
}

export function useUpdateChecker() {
    const { user, token, getReadingEntries, refreshList } = useAniList();
    const { queueDownload } = useDownload();
    const { settings } = useSettings();
    const [updates, setUpdates] = useState<Record<string, AniListUpdateStatus>>({});
    const isRunning = useRef(false);

    // Initial Load
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setUpdates(JSON.parse(stored));
    }, []);

    const checkForUpdates = useCallback(async () => {
        if (!token || !user || isRunning.current) return;
        isRunning.current = true;

        try {
            console.log('[UpdateChecker] Polling AniList for updates...');
            // Ensure entries are fresh
            await refreshList();
            const entries = getReadingEntries();

            const newUpdates: Record<string, AniListUpdateStatus> = { ...updates };
            let foundNew = false;

            for (const entry of entries) {
                const mangaId = entry.media.id.toString();
                const totalChapters = entry.media.chapters || 0;
                const progress = entry.progress || 0;

                const currentStatus = newUpdates[mangaId] || {
                    mangaId,
                    lastTotalChapters: totalChapters,
                    hasNotification: false,
                    unreadCount: 0
                };

                // 1. Detection of 'Unread' (Total > Progress)
                const unreadCount = Math.max(0, totalChapters - progress);

                // 2. Detection of 'New Release' (Total > last known total)
                if (totalChapters > currentStatus.lastTotalChapters) {
                    currentStatus.hasNotification = true;
                    foundNew = true;

                    console.log(`[UpdateChecker] NEW RELEASE found for ${entry.media.title.english || entry.media.title.romaji}: ${totalChapters} chapters total.`);

                    // 3. Optional Auto-Download
                    if (settings.autoDownload && unreadCount > 0) {
                        try {
                            const mapping = await resolveMappingAction(mangaId, entry.media.title);
                            if (mapping && mapping.mangaId) {
                                // For now, we queue the "next" chapter (progress + 1)
                                // In a real scenario, we might want to fetch the actual chapter list to get the ID.
                                // For simplicity here, we trigger a notification.
                            }
                        } catch (e) {
                            console.error('[UpdateChecker] Auto-download mapping failed', e);
                        }
                    }
                }

                currentStatus.unreadCount = unreadCount;
                currentStatus.lastTotalChapters = totalChapters;
                newUpdates[mangaId] = currentStatus;
            }

            if (foundNew || Object.keys(newUpdates).length > 0) {
                setUpdates(newUpdates);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newUpdates));
            }
        } catch (error) {
            console.error('[UpdateChecker] Poll failed:', error);
        } finally {
            isRunning.current = false;
        }
    }, [token, user, refreshList, getReadingEntries, updates, settings.autoDownload]);

    // Interval Logic
    useEffect(() => {
        if (!token) return;

        // Check on mount
        checkForUpdates();

        const interval = setInterval(checkForUpdates, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [token, checkForUpdates]);

    return {
        updates,
        checkForUpdates,
        clearNotification: (mangaId: string) => {
            if (updates[mangaId]) {
                const next = { ...updates, [mangaId]: { ...updates[mangaId], hasNotification: false } };
                setUpdates(next);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
        }
    };
}
