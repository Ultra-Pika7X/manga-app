"use client";

import { useState, useEffect } from 'react';
import { Settings2, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Manga } from '@/lib/scraper';
import { MangaMapping } from '@/lib/mapping';
import { searchMangaAction, saveManualMappingAction } from '@/app/actions';

interface SourceMapperProps {
    anilistId: string;
    currentMapping: MangaMapping | null;
    mangaTitle: string;
}

export default function SourceMapper({ anilistId, currentMapping, mangaTitle }: SourceMapperProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(mangaTitle);
    const [results, setResults] = useState<Manga[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        const searchResults = await searchMangaAction(searchQuery);
        setResults(searchResults);
        setIsLoading(false);
    };

    const handleSave = async (manga: Manga) => {
        setIsSaving(true);
        const mapping = {
            sourceId: manga.sourceId,
            mangaId: manga.id,
            sourceName: manga.sourceId.charAt(0).toUpperCase() + manga.sourceId.slice(1),
            matchedTitle: manga.title
        };
        const success = await saveManualMappingAction(anilistId, mapping);
        if (success) {
            window.location.reload(); // Refresh to apply new mapping
        }
        setIsSaving(false);
    };

    return (
        <>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl group transition-all hover:bg-white/10">
                <div className="flex items-center gap-2">
                    {currentMapping ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm font-medium text-gray-300">
                        {currentMapping ? `Source: ${currentMapping.sourceName}` : 'No source matched'}
                    </span>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2"
                    title="Change Content Source"
                >
                    <Settings2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden group-hover:block">Fix Mapping</span>
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1a1a2e] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white">Map Source for AniList</h3>
                                <p className="text-sm text-gray-400">Search and select the correct entry for <span className="text-purple-400 font-bold">{mangaTitle}</span></p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <Search className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search on all sources..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-purple-500 transition-all font-medium"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                                </button>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {results.length > 0 ? (
                                results.map((manga) => (
                                    <button
                                        key={`${manga.sourceId}-${manga.id}`}
                                        onClick={() => handleSave(manga)}
                                        disabled={isSaving}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/10"
                                    >
                                        <img
                                            src={manga.cover}
                                            alt=""
                                            className="w-16 h-24 object-cover rounded-lg shadow-lg"
                                        />
                                        <div className="flex-1 text-left">
                                            <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">{manga.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold uppercase text-gray-300">
                                                    {manga.sourceId}
                                                </span>
                                                {manga.status && (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{manga.status}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-gray-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                            Select
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    {isLoading ? (
                                        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                                    ) : (
                                        <>
                                            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                            <p className="text-gray-400 font-medium">Search for manga to map it to AniList</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
