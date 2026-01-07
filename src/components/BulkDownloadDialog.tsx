"use client";

import { useState } from 'react';
import { Download, AlertTriangle, X, HardDrive, Check, Loader } from 'lucide-react';
import { useDownloadSafety } from '@/components/DownloadSafetyProvider';
import { DownloadManager } from '@/lib/downloadManager';

import { useAniList } from '@/hooks/useAniList';

interface Chapter {
    id: string;
    title: string;
    estimatedPages?: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    mangaId: string;
    mangaTitle: string;
    cover: string;
    sourceId: string;
    chapters: Chapter[];
}

const AVG_PAGES_PER_CHAPTER = 25;
const AVG_PAGE_SIZE_KB = 150;

export default function BulkDownloadDialog({
    isOpen,
    onClose,
    mangaId,
    mangaTitle,
    cover,
    sourceId,
    chapters
}: Props) {
    const { checkStorageBeforeDownload } = useDownloadSafety();
    const { getEntry, token } = useAniList();
    const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, chapter: '' });
    const [result, setResult] = useState<{ queued: number; skipped: number; estimatedSizeMB: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const alEntry = getEntry(mangaId);
    const alProgress = alEntry?.progress || 0;

    const parseChapterNum = (title: string) => {
        const match = title.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    if (!isOpen) return null;

    // Actions
    const selectNextUnread = () => {
        // Sort chapters 1 -> N (ascending)
        const sorted = [...chapters].sort((a, b) => parseChapterNum(a.title) - parseChapterNum(b.title));
        const next = sorted.find(c => parseChapterNum(c.title) > alProgress);
        if (next) {
            setSelectedChapters(new Set([next.id]));
        }
    };

    const selectAllUnread = () => {
        const unread = chapters.filter(c => parseChapterNum(c.title) > alProgress).map(c => c.id);
        setSelectedChapters(new Set(unread));
    };

    const selectEntireManga = () => {
        setSelectedChapters(new Set(chapters.map(ch => ch.id)));
    };

    const deselectAll = () => {
        setSelectedChapters(new Set());
    };

    const selectRange = (start: number, end: number) => {
        const range = chapters.slice(start, end + 1).map(ch => ch.id);
        setSelectedChapters(new Set([...selectedChapters, ...range]));
    };

    // Calculate estimates
    const selectedCount = selectedChapters.size;
    const selectedList = chapters.filter(ch => selectedChapters.has(ch.id));
    const totalPages = selectedList.reduce((sum, ch) => sum + (ch.estimatedPages || AVG_PAGES_PER_CHAPTER), 0);
    const estimatedSizeMBValue = (totalPages * AVG_PAGE_SIZE_KB) / 1024;
    const estimatedSizeMB = estimatedSizeMBValue.toFixed(0);
    const isLargeDownload = estimatedSizeMBValue > 500;

    const toggleChapter = (id: string) => {
        const next = new Set(selectedChapters);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedChapters(next);
    };

    const handleDownload = async () => {
        if (selectedCount === 0) return;

        const canProceed = await checkStorageBeforeDownload(estimatedSizeMBValue);
        if (!canProceed) return;

        setIsDownloading(true);
        setError(null);
        setResult(null);

        try {
            const chaptersToDownload = chapters
                .filter(ch => selectedChapters.has(ch.id))
                .map(ch => ({
                    id: `${mangaId}_${ch.id}`,
                    mangaId,
                    chapterId: ch.id,
                    sourceId,
                    mangaTitle,
                    chapterTitle: ch.title,
                    cover,
                    estimatedPages: ch.estimatedPages
                }));

            const downloadResult = await DownloadManager.queueBulkDownload(chaptersToDownload, {
                onProgress: (completed, total, chapter) => {
                    setProgress({ current: completed, total, chapter });
                }
            });

            setResult(downloadResult);
        } catch (e: any) {
            setError(e.message || 'Bulk download failed');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Bulk Download</h2>
                        <p className="text-sm text-gray-400 truncate">{mangaTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Selection Controls */}
                <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-white/5 overflow-x-auto gap-2">
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={selectNextUnread}
                            className="px-3 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition whitespace-nowrap"
                        >
                            Next Unread
                        </button>
                        <button
                            onClick={selectAllUnread}
                            className="px-3 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition whitespace-nowrap"
                        >
                            Unread
                        </button>
                        <button
                            onClick={selectEntireManga}
                            className="px-3 py-1 text-xs bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition whitespace-nowrap"
                        >
                            All ({chapters.length})
                        </button>
                        <button
                            onClick={deselectAll}
                            className="px-3 py-1 text-xs bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="text-sm text-gray-400 shrink-0">
                        {selectedCount} selected
                    </div>
                </div>

                {/* Chapter List */}
                <div className="max-h-64 overflow-y-auto">
                    {chapters.map((chapter, index) => (
                        <label
                            key={chapter.id}
                            className={`flex items-center gap-3 px-6 py-2 cursor-pointer hover:bg-white/5 transition ${selectedChapters.has(chapter.id) ? 'bg-purple-500/10' : ''
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedChapters.has(chapter.id)}
                                onChange={() => toggleChapter(chapter.id)}
                                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-300 truncate flex-1">
                                {chapter.title}
                            </span>
                            <span className="text-xs text-gray-500">
                                ~{chapter.estimatedPages || AVG_PAGES_PER_CHAPTER}p
                            </span>
                        </label>
                    ))}
                </div>

                {/* Estimation */}
                {selectedCount > 0 && (
                    <div className="px-6 py-3 border-t border-white/5 bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <HardDrive className="w-4 h-4" />
                                <span>Estimated size</span>
                            </div>
                            <span className={`text-sm font-medium ${isLargeDownload ? 'text-yellow-400' : 'text-white'}`}>
                                ~{estimatedSizeMBValue.toFixed(0)} MB
                            </span>
                        </div>

                        {isLargeDownload && (
                            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Large download. Ensure you have enough storage and a stable connection.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Progress */}
                {isDownloading && (
                    <div className="px-6 py-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Queuing chapters...</span>
                            <span className="text-sm text-white">{progress.current}/{progress.total}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{progress.chapter}</p>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="px-6 py-4 border-t border-white/5 bg-green-500/10">
                        <div className="flex items-center gap-2 text-green-400">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">
                                Queued {result.queued} chapters ({result.estimatedSizeMB} MB)
                            </span>
                        </div>
                        {result.skipped > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                                {result.skipped} chapters were already downloaded
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="px-6 py-4 border-t border-white/5 bg-red-500/10">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition font-medium"
                    >
                        {result ? 'Close' : 'Cancel'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleDownload}
                            disabled={selectedCount === 0 || isDownloading}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span>Queuing...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span>Download {selectedCount} Chapters</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
