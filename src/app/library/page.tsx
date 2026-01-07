"use client";

import { useState, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import MangaCard from '@/components/MangaCard';
import { useAniList } from '@/hooks/useAniList';
import { Bookmark, RefreshCw, LogIn, Clock, CheckCircle2, PauseCircle, ListPlus } from 'lucide-react';
import { convertAniListToManga } from '@/lib/anilist';

/**
 * SYNC STRATEGY (AniList Sovereignty):
 * 1. AUTHORITATIVE REMOTE: AniList is the absolute source of truth for library state and progress.
 * 2. CACHED LOCAL: The app maintains a local reactive Map of these entries for instant UI updates.
 * 3. REACTIVE REFRESH: We refresh the list automatically on page mount and allow manual force-refresh.
 * 4. TABBED FILTERING: We filter the central 'userList' by status property ('CURRENT', 'COMPLETED', etc.) to build the tabs.
 */

type TabType = 'CURRENT' | 'COMPLETED' | 'PAUSED' | 'PLANNING';

export default function LibraryPage() {
    const { token, user, loading, getEntriesByStatus, refreshList, login } = useAniList();
    const [activeTab, setActiveTab] = useState<TabType>('CURRENT');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshList();
        } finally {
            setIsRefreshing(false);
        }
    };

    const tabEntries = useMemo(() => getEntriesByStatus(activeTab), [activeTab, getEntriesByStatus]);

    const tabs = [
        { id: 'CURRENT', label: 'Reading', icon: Clock, color: 'text-blue-400' },
        { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2, color: 'text-green-400' },
        { id: 'PAUSED', label: 'Paused', icon: PauseCircle, color: 'text-yellow-400' },
        { id: 'PLANNING', label: 'Planning', icon: ListPlus, color: 'text-purple-400' },
    ];

    if (!token) {
        return (
            <main className="min-h-screen bg-cloudy pb-20">
                <Navbar />
                <div className="max-w-7xl mx-auto px-6 pt-48">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 text-center rounded-3xl shadow-2xl">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LogIn className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Sync Your Library</h2>
                        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                            Connect your AniList account to manage your library across all devices and keep track of your progress.
                        </p>
                        <button
                            onClick={login}
                            className="inline-flex items-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            <LogIn className="w-5 h-5" />
                            Login with AniList
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-extrabold text-white flex items-center">
                            <span className="w-1.5 h-8 bg-blue-500 rounded-full mr-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                            My Library
                        </h1>
                        <p className="text-gray-400 mt-2 font-medium">
                            Manage your collection synced with AniList
                        </p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all disabled:opacity-50 group"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Sync'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                                {tab.label}
                                <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                                    {getEntriesByStatus(tab.id).length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {loading && !isRefreshing ? (
                    <div className="flex flex-col justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-500 animate-pulse font-medium">Fetching your collection...</p>
                    </div>
                ) : tabEntries.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {tabEntries.map((entry) => (
                            <div key={entry.id} className="relative group">
                                <MangaCard manga={convertAniListToManga(entry.media)} />
                                {/* Progress Overlay for Reading Tab */}
                                {activeTab === 'CURRENT' && (
                                    <div className="absolute top-2 right-2 z-20">
                                        <div className="px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-bold text-blue-400 shadow-xl flex items-center gap-1">
                                            <span>CH {entry.progress}</span>
                                            {entry.media.chapters && (
                                                <span className="text-gray-500 font-normal">/ {entry.media.chapters}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 text-center rounded-3xl shadow-2xl">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bookmark className="w-10 h-10 text-gray-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Nothing here yet</h2>
                        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                            Your "{tabs.find(t => t.id === activeTab)?.label}" list is empty on AniList.
                        </p>
                        <a
                            href="/search"
                            className="inline-block px-8 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10"
                        >
                            Explore Manga
                        </a>
                    </div>
                )}
            </div>
        </main>
    );
}
