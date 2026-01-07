"use client";

import { useHistory } from '@/hooks/useHistory';
import { useDownload } from '@/hooks/useDownload';
import Link from 'next/link';
import { Play, Clock, AlertTriangle } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';
import { useAniList } from '@/hooks/useAniList';
import { useState, useEffect } from 'react';

export default function ContinueReading() {
    const { history, loading } = useHistory();
    const { downloads } = useDownload();
    const { token, getEntry, refreshList, login: loginAniList, loading: anilistLoading } = useAniList();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [anilistError, setAnilistError] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAnilistError(false);
        try {
            await refreshList();
        } catch (e) {
            console.error('[ContinueReading] AniList refresh failed:', e);
            setAnilistError(true);
        } finally {
            setIsRefreshing(false);
        }
    };

    // RESILIENCE RULE: History loading should never block rendering
    // If local history is present, show it regardless of AniList status.

    if (loading) return null;

    // If no history, show nothing. AniList status is irrelevant.
    if (history.length === 0) {
        // If token is missing, offer connection prompt
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
                                Connect AniList to track your reading history across devices and never lose your place.
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
        return null;
    }

    // MAIN RENDER: History exists. Show it regardless of AniList health.
    return (
        <section className="max-w-7xl mx-auto px-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white relative pl-4 flex items-center">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink-500 rounded-full" />
                    <Clock className="w-5 h-5 mr-2 text-pink-500" />
                    Continue Reading
                </h2>
                {token && (
                    <button
                        onClick={handleRefresh}
                        className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                        disabled={isRefreshing}
                    >
                        {anilistError ? (
                            <>
                                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                <span className="text-yellow-500">AniList Offline</span>
                            </>
                        ) : (
                            <>
                                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                                {isRefreshing ? 'Syncing...' : 'AniList Synced'}
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.slice(0, 3).map((item) => {
                    const downloadId = `${item.mangaId}_${item.id}`;
                    const isDownloaded = downloads.some(d => d.id === downloadId && d.status === 'completed');
                    const offlineParam = isDownloaded ? '&mode=offline' : '';

                    // AniList Status - Gracefully handle if unavailable
                    let entry = null;
                    try {
                        entry = token ? getEntry(item.mangaId) : null;
                    } catch (e) {
                        // Silent fail - AniList data unavailable
                    }
                    const isTracked = !!entry;
                    const progress = entry?.progress;
                    // Check if local is ahead
                    const match = item.chapterTitle.match(/(\d+(\.\d+)?)/);
                    const localNum = match ? parseFloat(match[1]) : 0;
                    const isBehind = isTracked && progress < localNum;

                    return (
                        <Link
                            key={item.mangaId}
                            href={`/read/${item.id}?sourceId=${item.sourceId || 'mangadex'}&mangaId=${item.mangaId}&title=${encodeURIComponent(item.mangaTitle)}&chapterTitle=${encodeURIComponent(item.chapterTitle)}&cover=${encodeURIComponent(item.cover)}${offlineParam}`}
                            className="group relative flex gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                        >
                            <div className="relative w-24 aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                                <img
                                    src={getProxyUrl(item.cover)}
                                    alt={item.mangaTitle}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="w-8 h-8 text-white fill-white" />
                                </div>
                            </div>

                            <div className="flex flex-col justify-center min-w-0">
                                <h3 className="text-white font-bold truncate text-lg group-hover:text-pink-400 transition-colors">
                                    {item.mangaTitle}
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-gray-400 text-sm">{item.chapterTitle}</p>
                                    {isBehind && (
                                        <span className="w-2 h-2 rounded-full bg-pink-500" title="Unsynced changes" />
                                    )}
                                </div>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <span className="text-[10px] px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full font-bold uppercase tracking-wider">
                                        Resuming
                                    </span>
                                    {isDownloaded && (
                                        <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-300 rounded-full font-bold uppercase tracking-wider">
                                            Offline
                                        </span>
                                    )}
                                    {entry && (
                                        <span className="text-[10px] px-2 py-1 bg-[#02A9FF]/20 text-[#02A9FF] rounded-full font-bold uppercase tracking-wider">
                                            AL: {entry.progress}
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
