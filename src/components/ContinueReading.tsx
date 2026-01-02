"use client";

import { useHistory } from '@/hooks/useHistory';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';

export default function ContinueReading() {
    const { history, loading } = useHistory();

    if (loading || history.length === 0) return null;

    return (
        <section className="max-w-7xl mx-auto px-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white relative pl-4 flex items-center">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-pink-500 rounded-full" />
                    <Clock className="w-5 h-5 mr-2 text-pink-500" />
                    Continue Reading
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.slice(0, 3).map((item) => (
                    <Link
                        key={item.mangaId}
                        href={`/read/${item.id}?sourceId=${item.sourceId || 'mangadex'}&mangaId=${item.mangaId}&title=${encodeURIComponent(item.mangaTitle)}&chapterTitle=${encodeURIComponent(item.chapterTitle)}&cover=${encodeURIComponent(item.cover)}`}
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
                            <p className="text-gray-400 text-sm mt-1 mb-2">
                                {item.chapterTitle}
                            </p>
                            <div className="mt-auto">
                                <span className="text-[10px] px-2 py-1 bg-pink-500/20 text-pink-300 rounded-full font-bold uppercase tracking-wider">
                                    Resuming
                                </span>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-pink-600/10 transition-colors" />
                    </Link>
                ))}
            </div>
        </section>
    );
}
