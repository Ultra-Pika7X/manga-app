"use client";

import Link from 'next/link';
import { useDownload } from '@/hooks/useDownload';
import { Play, Clock, RefreshCw } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';
import { useAniList } from '@/hooks/useAniList';
import { useState } from 'react';

export default function ContinueReading() {
    const { downloads } = useDownload();
    const { token, getReadingEntries, refreshList, login: loginAniList, loading: anilistLoading } = useAniList();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [anilistError, setAnilistError] = useState(false);

    if (anilistLoading) return null;

    // RULE: AniList login is REQUIRED for Continue Reading
    if (!token) {
        return (
            <section className="max-w-7xl mx-auto px-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-6 opacity-50">
                    <h2 className="text-2xl font-bold text-white relative pl-4 flex items-center">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gray-600 rounded-full" />
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Continue Reading
                    </h2>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-8 md:p-12 text-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-tr from-[#02A9FF] to-[#0083C7] flex items-center justify-center shadow-lg shadow-[#02A9FF]/20">
                            <Clock className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Sync Your Progress</h3>
                        <p className="text-gray-400 max-w-md mb-6">
                            Connect AniList to sync your reading progress across all your devices.
                        </p>
                        <button
                            onClick={loginAniList}
                            className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <span>Connect AniList</span>
                            <div className="w-2 h-2 rounded-full bg-[#02A9FF]" />
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    const readingList = getReadingEntries().sort((a, b) => b.updatedAt - a.updatedAt);

    if (readingList.length === 0) return null;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAnilistError(false);
        try {
            await refreshList();
        } catch (e) {
            setAnilistError(true);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <section className="max-w-7xl mx-auto px-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white relative pl-4 flex items-center">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink-500 rounded-full" />
                    <Clock className="w-5 h-5 mr-2 text-pink-500" />
                    Continue Reading
                </h2>
                <button
                    onClick={handleRefresh}
                    className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-full"
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readingList.slice(0, 3).map((entry) => {
                    const manga = entry.media;
                    const anilistId = manga.id.toString();

                    // Note: We don't have the technical chapterId here because AniList only stores the number.
                    // This will link to the Manga Detail page with a "Resume" hint, or we can use a direct resolver.
                    // For now, linking to the Manga Page is safest so the mapping can resolve.

                    return (
                        <Link
                            key={anilistId}
                            href={`/manga/${anilistId}?sourceId=anilist&resume=true`}
                            className="group relative flex gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                        >
                            <div className="relative w-24 aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                                <img
                                    src={getProxyUrl(manga.coverImage.large)}
                                    alt={manga.title.english || manga.title.romaji}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="w-8 h-8 text-white fill-white" />
                                </div>
                            </div>

                            <div className="flex flex-col justify-center min-w-0">
                                <h3 className="text-white font-bold truncate text-lg group-hover:text-pink-400 transition-colors">
                                    {manga.title.english || manga.title.romaji}
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-gray-400 text-sm">Chapter {entry.progress}</p>
                                </div>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <span className="text-[10px] px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full font-bold uppercase tracking-wider">
                                        Last Read
                                    </span>
                                    {entry.media.status && (
                                        <span className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full font-bold uppercase tracking-wider">
                                            {entry.media.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-pink-600/10 transition-colors" />
                        </Link>
                    )
                })}
            </div>
        </section>
    );
}
