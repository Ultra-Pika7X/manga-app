"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface HistoryItem {
    id: string; // chapterId
    mangaId: string;
    mangaTitle: string;
    chapterTitle: string;
    cover: string;
    sourceId: string; // Source of the manga
    timestamp: any;
    progress?: number;
}

const LOCAL_STORAGE_KEY = 'manga-history';

export function useHistory() {
    const { user, isFirebaseEnabled } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load history from localStorage
    const loadLocalHistory = (): HistoryItem[] => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    // Save history to localStorage
    const saveLocalHistory = (items: HistoryItem[]) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error("Error saving history to localStorage:", error);
        }
    };

    useEffect(() => {
        if (!isFirebaseConfigured || !isFirebaseEnabled || !user || !db) {
            const local = loadLocalHistory();
            setHistory(local.sort((a, b) => b.timestamp - a.timestamp));
            setLoading(false);
            return;
        }

        const historyRef = collection(db, 'users', user.uid, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: HistoryItem[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data() as HistoryItem;
                // Backfill sourceId for legacy items
                if (!data.sourceId) {
                    data.sourceId = 'mangadex';
                }
                items.push(data);
            });
            setHistory(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isFirebaseEnabled]);

    const addToHistory = async (item: Omit<HistoryItem, 'timestamp'>) => {
        const timestamp = Date.now();
        // Ensure sourceId is present, default to mangadex if missing (shouldn't happen with new logic but safe fallback)
        const newItem = {
            ...item,
            sourceId: item.sourceId || 'mangadex',
            timestamp
        };

        if (!isFirebaseConfigured || !isFirebaseEnabled || !user || !db) {
            const currentHistory = loadLocalHistory();
            // Remove existing entry for this manga if it exists to move it to the top
            const filtered = currentHistory.filter(h => h.mangaId !== item.mangaId);
            const updated = [newItem, ...filtered].slice(0, 20);
            saveLocalHistory(updated);
            setHistory(updated);
            return;
        }

        const docRef = doc(db, 'users', user.uid, 'history', item.mangaId); // Use mangaId as doc ID to only keep latest chapter per manga
        try {
            await setDoc(docRef, { ...newItem, timestamp: Timestamp.now() });
        } catch (error) {
            console.error("Error adding to history:", error);
        }
    };

    return { history, addToHistory, loading };
}
