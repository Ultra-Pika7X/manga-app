import { useState, useEffect, useCallback, useRef } from 'react';
import { useFavorites } from './useFavorites';
import { getMangaDetailsAction } from '@/app/actions';
import { useDownload } from './useDownload';
import { useSettings } from './useSettings';

const CHECK_INTERVAL = 60 * 1000; // Check 1 item per minute
const STALE_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours
const STORAGE_KEY = 'manga_updates_status';

interface UpdateStatus {
    mangaId: string;
    lastChecked: number;
    lastKnownChapter: string; // ID or Title
    hasNewChapter: boolean;
    lastKnownChapterNumber?: number;
}

export function useUpdateChecker() {
    const { favorites } = useFavorites();
    const { queueDownload } = useDownload();
    const { settings } = useSettings(); // Assuming autoDownload is in settings
    const [updates, setUpdates] = useState<Record<string, UpdateStatus>>({});

    // Load state
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setUpdates(JSON.parse(stored));
        }
    }, []);

    const saveUpdates = (newUpdates: Record<string, UpdateStatus>) => {
        setUpdates(newUpdates);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUpdates));
    };

    // Queue management
    const checkQueue = useRef<string[]>([]);
    const isChecking = useRef(false);

    // Main Check Logic
    const checkNext = useCallback(async () => {
        if (isChecking.current || checkQueue.current.length === 0) return;

        isChecking.current = true;
        const mangaId = checkQueue.current.shift();

        if (mangaId) {
            console.log(`[UpdateChecker] Checking ${mangaId}...`);
            // Find favorite metadata
            const fav = favorites.find(f => f.id === mangaId);
            if (fav) {
                try {
                    // Fetch latest
                    const details = await getMangaDetailsAction(mangaId, fav.sourceId);
                    if (details && details.chapters.length > 0) {
                        const latest = details.chapters[0]; // Assuming sorted descending

                        // Get local state
                        const current = updates[mangaId] || {
                            mangaId,
                            lastChecked: 0,
                            lastKnownChapter: '',
                            hasNewChapter: false
                        };

                        // Compare
                        if (current.lastKnownChapter && current.lastKnownChapter !== latest.id) {
                            console.log(`[UpdateChecker] NEW CHAPTER: ${latest.title}`);
                            current.hasNewChapter = true;

                            // Auto-Download Logic
                            if (settings.autoDownload) {
                                queueDownload({
                                    id: `${mangaId}_${latest.id}`,
                                    mangaId,
                                    chapterId: latest.id,
                                    sourceId: fav.sourceId,
                                    mangaTitle: fav.title,
                                    chapterTitle: latest.title,
                                    cover: fav.cover
                                });
                            }
                        }

                        // Update State
                        current.lastChecked = Date.now();
                        current.lastKnownChapter = latest.id;

                        saveUpdates({
                            ...updates,
                            [mangaId]: current
                        });
                    }
                } catch (e) {
                    console.error(`[UpdateChecker] Failed to check ${mangaId}`, e);
                }
            }
        }

        isChecking.current = false;
    }, [favorites, settings.autoDownload, updates, queueDownload]);

    // Scheduler
    useEffect(() => {
        const interval = setInterval(() => {
            // Refill queue if empty
            if (checkQueue.current.length === 0 && favorites.length > 0) {
                // Find stale items
                const stale = favorites.filter(f => {
                    const status = updates[f.id];
                    if (!status) return true; // Never checked
                    return (Date.now() - status.lastChecked) > STALE_THRESHOLD;
                });

                if (stale.length > 0) {
                    // Add 1 stale item to queue
                    checkQueue.current.push(stale[0].id);
                }
            }

            checkNext();

        }, CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [favorites, updates, checkNext]);

    return { updates, checkNow: () => isChecking.current = false }; // Debug helper
}
