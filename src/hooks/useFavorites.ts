"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { Manga } from '@/lib/scraper';

const LOCAL_STORAGE_KEY = 'manga-favorites';

export function useFavorites() {
    const { user, isFirebaseEnabled } = useAuth();
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
        // Use localStorage if Firebase is not configured or user is not logged in
        if (!isFirebaseConfigured || !isFirebaseEnabled || !user || !db) {
            setFavorites(loadLocalFavorites());
            setLoading(false);
            return;
        }

        const favoritesRef = collection(db, 'users', user.uid, 'favorites');
        const unsubscribe = onSnapshot(favoritesRef, (snapshot) => {
            const favs: Manga[] = [];
            snapshot.forEach((doc) => {
                favs.push(doc.data() as Manga);
            });
            setFavorites(favs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isFirebaseEnabled]);

    const isFavorite = (mangaId: string) => {
        return favorites.some(f => f.id === mangaId);
    };

    const toggleFavorite = async (manga: Manga) => {
        // Use localStorage if Firebase is not configured
        if (!isFirebaseConfigured || !isFirebaseEnabled || !user || !db) {
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
            return;
        }

        const docRef = doc(db, 'users', user.uid, 'favorites', manga.id);

        try {
            if (isFavorite(manga.id)) {
                await deleteDoc(docRef);
            } else {
                await setDoc(docRef, manga);
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        }
    };

    return { favorites, isFavorite, toggleFavorite, loading };
}
