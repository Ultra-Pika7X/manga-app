"use client";

import { useState, useEffect } from 'react';

export interface HistoryItem {
    id: string; // chapterId
    mangaId: string;
    mangaTitle: string;
    chapterTitle: string;
    cover: string;
    sourceId: string;
    timestamp: number;
    progress?: number;
}

const LOCAL_STORAGE_KEY = 'manga-history';

export function useHistory() {
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
        const local = loadLocalHistory();
        setHistory(local.sort((a, b) => b.timestamp - a.timestamp));
        setLoading(false);
    }, []);

    const addToHistory = async (item: Omit<HistoryItem, 'timestamp'>) => {
        const timestamp = Date.now();
        const newItem: HistoryItem = {
            ...item,
            timestamp
        };

        const currentHistory = loadLocalHistory();
        // Remove existing entry for this manga if it exists to move it to the top
        const filtered = currentHistory.filter(h => h.mangaId !== item.mangaId);
        const updated = [newItem, ...filtered].slice(0, 20);

        saveLocalHistory(updated);
        setHistory(updated);
    };

    return { history, addToHistory, loading };
}
