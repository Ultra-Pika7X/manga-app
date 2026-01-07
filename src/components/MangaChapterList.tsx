"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Download, CheckCircle2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Chapter, Manga } from '@/lib/scraper/types';
import DownloadMenu from './DownloadMenu';
import BulkDownloadDialog from './BulkDownloadDialog';
import { useDownload } from '@/hooks/useDownload';
import { DownloadStatus } from '@/lib/downloadManager';
import { useAniList } from '@/hooks/useAniList';

interface MangaChapterListProps {
    chapters: Chapter[];
    manga: Manga;
    sourceId: string;
    headerExtras?: React.ReactNode;
}

export default function MangaChapterList({ chapters, manga, sourceId, headerExtras }: MangaChapterListProps) {
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const { getDownload } = useDownload();
    const { getEntry } = useAniList();

    const alEntry = getEntry(manga.id);
    const alProgress = alEntry?.progress || 0;
    const alTotalRows = alEntry?.media?.chapters || 0;

    const parseChapterNum = (title: string) => {
        const match = title.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    // Calculate if source is lagging
    const sortedChapters = [...chapters].sort((a, b) => parseChapterNum(b.title) - parseChapterNum(a.title));
    const latestSourceChapter = sortedChapters.length > 0 ? parseChapterNum(sortedChapters[0].title) : 0;
    const isLagging = alTotalRows > 0 && latestSourceChapter < alTotalRows;

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-bold flex items-center">
                        <span className="w-1 h-6 bg-purple-500 rounded-full mr-3" />
                        Chapters
                    </h2>
                    {isLagging && (
                        <p className="text-xs text-yellow-500 font-bold flex items-center mt-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Source may be lagging (AniList reports {alTotalRows} chapters)
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
                    {headerExtras}

                    {chapters.length > 0 && (
                        <button
                            onClick={() => setIsBulkOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Bulk
                        </button>
                    )}
                </div>
            </div>

            {/* Read Status Summary */}
            {alProgress > 0 && (
                <div className="mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3 text-xs">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 font-medium">You've read up to Chapter {alProgress} on AniList</span>
                </div>
            )}

            <div className="glass rounded-xl overflow-hidden divide-y divide-white/10">
                {chapters.length > 0 ? (
                    chapters.map((chapter) => {
                        const downloadId = `${manga.id}_${chapter.id}`;
                        const download = getDownload(downloadId);
                        const isDownloaded = download?.status === DownloadStatus.Completed;

                        return (
                            <div key={chapter.id} className="p-4 hover:bg-white/5 transition-colors group flex items-center justify-between">
                                <div className="flex flex-col flex-1 min-w-0 pr-4">
                                    <h4 className={`font-semibold transition-colors truncate ${isDownloaded ? 'text-green-400' : 'text-white group-hover:text-purple-300'}`}>
                                        {chapter.title}
                                    </h4>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                        {chapter.volume && <span>Vol. {chapter.volume}</span>}
                                        {chapter.publishAt && (
                                            <span className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {new Date(chapter.publishAt).toLocaleDateString()}
                                            </span>
                                        )}
                                        {isDownloaded && (
                                            <span className="flex items-center text-green-500/80">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Offline Ready
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Download Menu (with 0 images initially) */}
                                    <div className="relative z-10">
                                        <DownloadMenu
                                            mangaId={manga.id}
                                            chapterId={chapter.id}
                                            mangaTitle={manga.title}
                                            chapterTitle={chapter.title}
                                            cover={manga.cover}
                                            sourceId={chapter.sourceId || sourceId}
                                            totalImages={0} // Metadata unknown in list view
                                        />
                                    </div>

                                    <Link
                                        href={`/read/${chapter.id}?sourceId=${chapter.sourceId || sourceId}&mangaId=${manga.id}&chapterTitle=${encodeURIComponent(chapter.title)}`}
                                        className="px-6 py-2 bg-white/10 text-white hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Read
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No chapters found.
                    </div>
                )}
            </div>

            {/* Bulk Download Dialog */}
            {isBulkOpen && (
                <BulkDownloadDialog
                    isOpen={isBulkOpen}
                    onClose={() => setIsBulkOpen(false)}
                    mangaId={manga.id}
                    mangaTitle={manga.title}
                    cover={manga.cover}
                    chapters={chapters}
                    sourceId={sourceId}
                />
            )}
        </>
    );
}
