"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

interface SourceSwitcherProps {
    currentSource: string;
    mangaTitle: string;
}

const sources = [
    { id: 'mangadex', name: 'MangaDex' },
    { id: 'mangabuddy', name: 'MangaBuddy' },
    { id: 'mangapark', name: 'MangaPark' },
    { id: 'weebdex', name: 'WeebDex' },
    { id: 'mangakakalot', name: 'Mangakakalot' },
];

export default function SourceSwitcher({ currentSource, mangaTitle }: SourceSwitcherProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleSourceChange = (sourceId: string) => {
        // If clicking same source, do nothing
        if (sourceId === currentSource) return;

        // Redirect to search for this title on the new source
        // This is the best effort since we don't have ID mappings
        const params = new URLSearchParams();
        params.set('q', mangaTitle);
        params.set('sourceId', sourceId);
        router.push(`/search?${params.toString()}`);
    };

    const currentSourceName = sources.find(s => s.id === (currentSource || 'mangadex'))?.name || 'Unknown Source';

    return (
        <div className="relative inline-block text-left ml-4">
            <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Source: {currentSourceName}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right bg-[#1a1a2e] border border-white/10 divide-y divide-gray-700 rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="px-1 py-1">
                        {sources.map((source) => (
                            <button
                                key={source.id}
                                className={`${currentSource === source.id ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    } group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}
                                onClick={() => {
                                    handleSourceChange(source.id);
                                    setIsOpen(false);
                                }}
                            >
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
