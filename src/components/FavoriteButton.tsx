"use client";

import { useFavorites } from '@/hooks/useFavorites';
import { Manga } from '@/lib/scraper';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';

interface FavoriteButtonProps {
    manga: Manga;
}

export default function FavoriteButton({ manga }: FavoriteButtonProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = async () => {
        setIsAnimating(true);
        await toggleFavorite(manga);
        setTimeout(() => setIsAnimating(false), 500);
    };

    const favorited = isFavorite(manga.id);

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${favorited
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'
                } ${isAnimating ? 'animate-bounce' : ''}`}
        >
            {favorited ? (
                <>
                    <BookmarkCheck className="w-5 h-5 fill-current" />
                    <span>In Library</span>
                </>
            ) : (
                <>
                    <Bookmark className="w-5 h-5" />
                    <span>Add to Library</span>
                </>
            )}
        </button>
    );
}
