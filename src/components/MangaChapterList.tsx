"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, ExternalLink, Download, CheckCircle2 } from 'lucide-react';
import { Chapter, Manga } from '@/lib/scraper/types';
import DownloadMenu from './DownloadMenu';
import BulkDownloadDialog from './BulkDownloadDialog';
import { useDownload } from '@/hooks/useDownload';
import { DownloadStatus } from '@/lib/downloadManager';

interface MangaChapterListProps {
    chapters: Chapter[];
    manga: Manga;
    sourceId: string;
    headerExtras?: React.ReactNode;
}

export default function MangaChapterList({ chapters, manga, sourceId, headerExtras }: MangaChapterListProps) {
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const { getDownload } = useDownload();

    // Sort chapters relative to reading order (descending by default usually)
    // But Bulk Download usually assumes 1->N.
    // Let's pass the raw list to BulkDownloadDialog and let it handle sorting/selection.

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center mb-4 md:mb-0">
                    <span className="w-1 h-6 bg-purple-500 rounded-full mr-3" />
                    Chapters
                </h2>

                <div className="flex flex-wrap items-center gap-4">
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

                                    {chapter.externalUrl ? (
                                        <a
                                            href={chapter.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                                        >
                                            External <ExternalLink className="w-3 h-3 ml-2" />
                                        </a>
                                    ) : (
                                        <Link
                                            href={`/read/${chapter.id}?sourceId=${chapter.sourceId || sourceId}&mangaId=${manga.id}&title=${encodeURIComponent(manga.title)}&chapterTitle=${encodeURIComponent(chapter.title)}&cover=${encodeURIComponent(manga.cover)}`}
                                            className="px-6 py-2 bg-white/10 text-white hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Read
                                        </Link>
                                    )}
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
