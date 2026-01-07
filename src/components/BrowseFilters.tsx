"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Filter, TrendingUp, Star, Calendar, Search } from 'lucide-react';

interface BrowseFiltersProps {
    genres: string[];
}

export default function BrowseFilters({ genres }: BrowseFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get current values from URL
    const currentSort = searchParams.get('sort') || 'TRENDING_DESC';
    const currentGenres = searchParams.get('genres')?.split(',') || [];
    const currentStatus = searchParams.get('status') || '';
    const currentSearch = searchParams.get('q') || '';

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(currentSearch);

    // Update URL helper
    const updateUrl = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '') {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });
        // Reset page on filter change
        params.delete('page');
        router.push(`/browse?${params.toString()}`);
    };

    const toggleGenre = (genre: string) => {
        const newGenres = currentGenres.includes(genre)
            ? currentGenres.filter(g => g !== genre)
            : [...currentGenres, genre];
        updateUrl({ genres: newGenres.join(',') });
    };

    return (
        <div className="space-y-6">
            {/* Main Tabs / Quick Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <button
                    onClick={() => updateUrl({ sort: 'TRENDING_DESC', season: null, seasonYear: null, q: null })}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all ${currentSort === 'TRENDING_DESC' && !searchParams.get('season')
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Trending</span>
                </button>

                <button
                    onClick={() => updateUrl({ sort: 'POPULARITY_DESC', season: null, seasonYear: null, q: null })}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all ${currentSort === 'POPULARITY_DESC' && !searchParams.get('season')
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Star className="w-4 h-4" />
                    <span>Most Popular</span>
                </button>

                <button
                    onClick={() => {
                        const year = new Date().getFullYear();
                        const month = new Date().getMonth();
                        let season = 'WINTER';
                        if (month >= 2 && month <= 4) season = 'SPRING';
                        else if (month >= 5 && month <= 7) season = 'SUMMER';
                        else if (month >= 8 && month <= 10) season = 'FALL';
                        updateUrl({ season, seasonYear: year.toString(), sort: 'POPULARITY_DESC', q: null });
                    }}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all ${searchParams.get('season')
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Seasonal</span>
                </button>

                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all ${isFilterOpen || currentGenres.length > 0 || currentStatus
                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span>Filters {currentGenres.length > 0 ? `(${currentGenres.length})` : ''}</span>
                </button>

                <div className="flex-1 min-w-[300px] relative">
                    <form onSubmit={(e) => { e.preventDefault(); updateUrl({ q: localSearch }); }}>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            placeholder="Find something specific..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all"
                        />
                    </form>
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {isFilterOpen && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 animation-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Genres */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Genres</h4>
                            <div className="flex flex-wrap gap-2">
                                {genres.map(genre => (
                                    <button
                                        key={genre}
                                        onClick={() => toggleGenre(genre)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${currentGenres.includes(genre)
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Status</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['RELEASING', 'FINISHED', 'CANCELLED', 'HIATUS'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => updateUrl({ status: currentStatus === status ? null : status })}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentStatus === status
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Order By */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sort Order</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Trending', val: 'TRENDING_DESC' },
                                    { label: 'Popularity', val: 'POPULARITY_DESC' },
                                    { label: 'Avg Score', val: 'SCORE_DESC' },
                                    { label: 'Recently Updated', val: 'UPDATED_AT_DESC' },
                                    { label: 'Latest Release', val: 'START_DATE_DESC' },
                                    { label: 'Favorites', val: 'FAVOURITES_DESC' }
                                ].map(sort => (
                                    <button
                                        key={sort.val}
                                        onClick={() => updateUrl({ sort: sort.val })}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentSort === sort.val
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {sort.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                        <button
                            onClick={() => {
                                router.push('/browse');
                                setLocalSearch('');
                            }}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            Reset all filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
