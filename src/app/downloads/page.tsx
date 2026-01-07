"use client";

import Navbar from '@/components/Navbar';
import { useDownload } from '@/hooks/useDownload';
import Link from 'next/link';
import { Trash2, Pause, Play, DownloadCloud, AlertCircle, Archive, HardDrive, ChevronDown, ChevronUp, FolderX } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';
import { DownloadStatus } from '@/lib/downloadManager';
import { useState, useEffect } from 'react';

// Format bytes to readable string (KB, MB, GB)
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DownloadsPage() {
    const {
        downloads,
        pauseDownload,
        resumeDownload,
        deleteDownload,
        exportChapter,
        getStorageEstimate,
        clearAllDownloads
    } = useDownload();

    const [expandedManga, setExpandedManga] = useState<Set<string>>(new Set());
    const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

    // Refresh storage estimate
    useEffect(() => {
        const checkStorage = async () => {
            const estimate = await getStorageEstimate();
            if (estimate) setStorage(estimate);
        };

        checkStorage();
        // Poll every 5 seconds if downloading
        const interval = setInterval(checkStorage, 5000);
        return () => clearInterval(interval);
    }, [downloads]);

    const toggleManga = (mangaId: string) => {
        const next = new Set(expandedManga);
        if (next.has(mangaId)) next.delete(mangaId);
        else next.add(mangaId);
        setExpandedManga(next);
    };

    const handleExport = async (id: string, fileName: string) => {
        try {
            const blob = await exportChapter(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
            alert('Failed to export chapter');
        }
    };

    const handleDeleteAll = async () => {
        if (confirm("Are you sure you want to delete ALL downloaded manga? This action cannot be undone.")) {
            await clearAllDownloads();
        }
    };

    // Group downloads by Manga
    const groupedDownloads = downloads.reduce((acc, download) => {
        if (!acc[download.mangaId]) {
            acc[download.mangaId] = {
                mangaId: download.mangaId,
                title: download.mangaTitle,
                cover: download.cover,
                chapters: []
            };
        }
        acc[download.mangaId].chapters.push(download);
        return acc;
    }, {} as Record<string, { mangaId: string; title: string; cover: string; chapters: typeof downloads }>);

    const sortedGroups = Object.values(groupedDownloads).sort((a, b) => a.title.localeCompare(b.title));

    return (
        <main className="min-h-screen bg-[#0f0f1a] pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-24">
                {/* Header & Storage */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <DownloadCloud className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Downloads Manager</h1>
                                <p className="text-gray-400 text-sm">Manage your offline library</p>
                            </div>
                        </div>

                        {downloads.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/10 text-sm font-semibold"
                            >
                                <FolderX className="w-4 h-4" />
                                Clear All Data
                            </button>
                        )}
                    </div>

                    {/* Storage Bar */}
                    {storage && (
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between text-sm mb-2">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <HardDrive className="w-4 h-4 text-purple-400" />
                                    <span>Storage Usage</span>
                                </div>
                                <span className="text-purple-300 font-mono">
                                    {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-1000"
                                    style={{ width: `${Math.min((storage.usage / storage.quota) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="text-right text-xs text-gray-500 mt-1">
                                {((storage.usage / storage.quota) * 100).toFixed(1)}% Used
                            </div>
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {downloads.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                        <DownloadCloud className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Library is empty</h2>
                        <p className="text-gray-500">
                            Downloaded chapters will appear here.<br />
                            Go read a manga to start downloading!
                        </p>
                        <Link href="/" className="inline-block mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors">
                            Browse Manga
                        </Link>
                    </div>
                ) : (
                    /* Manga Groups */
                    <div className="space-y-6">
                        {sortedGroups.map((group) => {
                            const isExpanded = expandedManga.has(group.mangaId);
                            const totalChapters = group.chapters.length;
                            const completedChapters = group.chapters.filter(c => c.status === DownloadStatus.Completed).length;

                            return (
                                <div key={group.mangaId} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:bg-white/[0.07]">
                                    {/* Manga Header */}
                                    <div
                                        onClick={() => toggleManga(group.mangaId)}
                                        className="p-4 flex items-center gap-4 cursor-pointer select-none"
                                    >
                                        <div className="w-12 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
                                            <img
                                                src={getProxyUrl(group.cover)}
                                                alt={group.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white truncate">{group.title}</h3>
                                            <p className="text-sm text-gray-400">
                                                {totalChapters} chapter{totalChapters !== 1 ? 's' : ''} • {completedChapters} ready
                                            </p>
                                        </div>
                                        <div className="text-gray-400">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>

                                    {/* Chapter List */}
                                    {isExpanded && (
                                        <div className="border-t border-white/10 bg-black/20">
                                            {group.chapters.map((download) => (
                                                <div key={download.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                                    {/* Status Icon */}
                                                    <div className="w-8 flex-shrink-0 flex justify-center">
                                                        {download.status === DownloadStatus.Completed ? (
                                                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                        ) : download.status === DownloadStatus.Failed ? (
                                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                                        ) : (
                                                            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                                        )}
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-gray-200 font-medium truncate">{download.title}</p>
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                {download.status === DownloadStatus.Downloading
                                                                    ? `${download.progress}%`
                                                                    : download.status
                                                                }
                                                            </span>
                                                        </div>
                                                        {download.status === DownloadStatus.Downloading && (
                                                            <div className="mt-2 w-full bg-gray-700/50 rounded-full h-1">
                                                                <div
                                                                    className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                                                    style={{ width: `${download.progress}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                        {download.error && (
                                                            <p className="text-xs text-red-400 mt-1">{download.error}</p>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        {download.status === DownloadStatus.Downloading && (
                                                            <button onClick={(e) => { e.stopPropagation(); pauseDownload(download.id); }} className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg">
                                                                <Pause className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {download.status === DownloadStatus.Paused && (
                                                            <button onClick={(e) => { e.stopPropagation(); resumeDownload(download.id); }} className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg">
                                                                <Play className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {download.status === DownloadStatus.Completed && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleExport(download.id, `${group.title} - ${download.title}`); }}
                                                                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                                                                    title="Export ZIP"
                                                                >
                                                                    <Archive className="w-4 h-4" />
                                                                </button>
                                                                <Link
                                                                    href={`/read/${download.chapterId}?sourceId=${download.sourceId}&mangaId=${download.mangaId}&mode=offline`}
                                                                    className="p-2 text-purple-400 hover:bg-purple-400/10 rounded-lg"
                                                                >
                                                                    <Play className="w-4 h-4" />
                                                                </Link>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteDownload(download.id); }}
                                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
