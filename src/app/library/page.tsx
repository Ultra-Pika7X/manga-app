"use client";

import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { useFavorites } from '@/hooks/useFavorites';
import { Bookmark } from 'lucide-react';

export default function LibraryPage() {
    const { favorites, loading } = useFavorites();

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-4xl font-extrabold text-white flex items-center">
                        <span className="w-1.5 h-8 bg-pink-500 rounded-full mr-4" />
                        My Library
                    </h1>
                    <p className="text-gray-400 font-medium">
                        {favorites.length} Manga Saved
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
                    </div>
                ) : favorites.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {favorites.map((manga) => (
                            <MangaCard key={manga.id} manga={manga} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 text-center rounded-3xl shadow-2xl">
                        <div className="w-20 h-20 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bookmark className="w-10 h-10 text-pink-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Your library is empty</h2>
                        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                            Start exploring and add your favorite manga to your library to keep track of them.
                        </p>
                        <a
                            href="/"
                            className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Browse Manga
                        </a>
                    </div>
                )}
            </div>
        </main>
    );
}
