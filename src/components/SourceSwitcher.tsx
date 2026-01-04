"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Loader2 } from 'lucide-react';

interface SourceSwitcherProps {
    currentSource: string;
    mangaTitle: string;
}

const sources = [
    { id: 'mangabuddy', name: 'MangaBuddy' },
    { id: 'mangadex', name: 'MangaDex' },
    { id: 'weebdex', name: 'WeebDex' },
    { id: 'mangakakalot', name: 'Mangakakalot' },
];

export default function SourceSwitcher({ currentSource, mangaTitle }: SourceSwitcherProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingSource, setLoadingSource] = useState<string | null>(null);

    const handleSourceChange = async (sourceId: string) => {
        if (sourceId === currentSource) return;

        setIsLoading(true);
        setLoadingSource(sourceId);
        setIsOpen(false);

        try {
            // Call API to find manga on the new source
            const res = await fetch(`/api/find-manga?title=${encodeURIComponent(mangaTitle)}&sourceId=${sourceId}`);
            const data = await res.json();

            if (data.found && data.mangaId) {
                // Navigate directly to the manga details page on the new source
                router.push(`/manga/${data.mangaId}?sourceId=${sourceId}`);
            } else {
                // Fallback: go to search if not found
                router.push(`/search?q=${encodeURIComponent(mangaTitle)}&sourceId=${sourceId}`);
            }
        } catch (error) {
            console.error('Source switch error:', error);
            // Fallback to search
            router.push(`/search?q=${encodeURIComponent(mangaTitle)}&sourceId=${sourceId}`);
        } finally {
            setIsLoading(false);
            setLoadingSource(null);
        }
    };

    const currentSourceName = sources.find(s => s.id === (currentSource || 'mangabuddy'))?.name || 'Unknown Source';

    return (
        <div className="relative inline-block text-left ml-4">
            <button
                type="button"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 transition-colors disabled:opacity-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                ) : (
                    <Globe className="w-4 h-4 text-purple-400" />
                )}
                <span>Source: {currentSourceName}</span>
            </button>

            {isOpen && !isLoading && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right bg-[#1a1a2e] border border-white/10 divide-y divide-gray-700 rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="px-1 py-1">
                        {sources.map((source) => (
                            <button
                                key={source.id}
                                disabled={loadingSource === source.id}
                                className={`${currentSource === source.id ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors disabled:opacity-50`}
                                onClick={() => handleSourceChange(source.id)}
                            >
                                {loadingSource === source.id && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                {source.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
