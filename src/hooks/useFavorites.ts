"use client";

import { useState, useEffect } from 'react';
import { Manga } from '@/lib/scraper';

const LOCAL_STORAGE_KEY = 'manga-favorites';

export function useFavorites() {
    const [favorites, setFavorites] = useState<Manga[]>([]);
    const [loading, setLoading] = useState(true);

    // Load favorites from localStorage
    const loadLocalFavorites = () => {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    // Save favorites to localStorage
    const saveLocalFavorites = (favs: Manga[]) => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(favs));
        } catch (error) {
            console.error("Error saving to localStorage:", error);
        }
    };

    useEffect(() => {
        setFavorites(loadLocalFavorites());
        setLoading(false);
    }, []);

    const isFavorite = (mangaId: string) => {
        return favorites.some(f => f.id === mangaId);
    };

    const toggleFavorite = async (manga: Manga) => {
        const currentFavorites = loadLocalFavorites();
        const exists = currentFavorites.some((f: Manga) => f.id === manga.id);

        let newFavorites: Manga[];
        if (exists) {
            newFavorites = currentFavorites.filter((f: Manga) => f.id !== manga.id);
        } else {
            newFavorites = [...currentFavorites, manga];
        }

        saveLocalFavorites(newFavorites);
        setFavorites(newFavorites);
    };

    return { favorites, isFavorite, toggleFavorite, loading };
}
