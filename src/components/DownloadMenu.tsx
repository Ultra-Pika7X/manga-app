"use client";

import { useState, useEffect } from 'react';
import { Download, ChevronDown, FileArchive, Image, AlertTriangle, Check, Loader, X } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';
import { DownloadStatus } from '@/lib/downloadManager';
import { useDownloadSafety } from '@/components/DownloadSafetyProvider';

interface Props {
    mangaId: string;
    chapterId: string;
    mangaTitle: string;
    chapterTitle: string;
    cover: string;
    sourceId: string;
    totalImages: number;
}

const AVG_IMAGE_SIZE_KB = 150; // Rough estimate per page
const LARGE_DOWNLOAD_THRESHOLD_MB = 50;

export default function DownloadMenu({
    mangaId,
    chapterId,
    mangaTitle,
    chapterTitle,
    cover,
    sourceId,
    totalImages
}: Props) {
    const { queueDownload, getDownload, downloads, exportChapter } = useDownload();
    const { checkStorageBeforeDownload, showNotification } = useDownloadSafety();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'zip' | 'cbz' | null>(null);

    const downloadId = `${mangaId}_${chapterId}`;
    const currentDownload = getDownload(downloadId);

    const estimatedSizeMBValue = (totalImages * AVG_IMAGE_SIZE_KB) / 1024;
    const estimatedSizeMB = estimatedSizeMBValue.toFixed(1);
    const isLargeDownload = estimatedSizeMBValue > LARGE_DOWNLOAD_THRESHOLD_MB;
    const isDownloaded = currentDownload?.status === DownloadStatus.Completed;

    const isDownloading = currentDownload?.status === DownloadStatus.Downloading ||
        currentDownload?.status === DownloadStatus.FetchingMeta ||
        currentDownload?.status === DownloadStatus.Pending;
    const progress = currentDownload?.progress || 0;

    // Haptic helper
    const vibrate = () => {
        if (navigator.vibrate) navigator.vibrate(10);
    };

    const handleQueueDownload = async () => {
        if (isDownloaded || isDownloading) return;

        vibrate();

        // Safety Check
        const canProceed = await checkStorageBeforeDownload(estimatedSizeMBValue);
        if (!canProceed) return;

        queueDownload({
            id: downloadId,
            mangaId,
            chapterId,
            sourceId,
            mangaTitle,
            chapterTitle,
            cover
        });

        showNotification({
            type: 'info',
            title: 'Download Started',
            message: `${chapterTitle} queued for offline reading.`,
            duration: 3000
        });

        setIsOpen(false);
    };

    const handleExport = async (format: 'zip' | 'cbz') => {
        if (!isDownloaded) return;

        vibrate();
        setIsExporting(true);
        setExportFormat(format);

        try {
            // Dynamic import for code splitting
            const { saveFile, getFileTypeConfig } = await import('@/lib/fileSaver');
            const { DownloadManager } = await import('@/lib/downloadManager');

            // Generate archive with progress tracking
            const blob = await DownloadManager.exportChapter(downloadId, {
                format,
                onProgress: (p) => {
                    // Could update UI with export progress if needed
                    console.log(`Export progress: ${p}%`);
                }
            });

            // Build filename
            const safeTitle = mangaTitle.replace(/[<>:"/\\|?*]/g, '_');
            const safeChapter = chapterTitle.replace(/[<>:"/\\|?*]/g, '_');
            const filename = `${safeTitle} - ${safeChapter}.${format}`;

            // Use File System Access API (shows native Save As dialog on Chrome/Edge)
            // Falls back to download link on Firefox/Safari
            const typeConfig = getFileTypeConfig(format);
            const saved = await saveFile(blob, {
                filename,
                ...typeConfig
            });

            if (!saved) {
                // User cancelled - not an error
                console.log('Save cancelled by user');
            }
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export chapter');
        } finally {
            setIsExporting(false);
            setExportFormat(null);
            setIsOpen(false);
        }
    };

    const handleDownloadPages = async () => {
        // For individual pages, we need to download each as a separate file
        // This requires the chapter to be downloaded first
        if (!isDownloaded) {
            alert('Please download the chapter first, then export individual pages.');
            return;
        }

        vibrate();
        setIsExporting(true);

        try {
            const { DownloadManager } = await import('@/lib/downloadManager');

            for (let i = 0; i < (currentDownload?.totalImages || 0); i++) {
                const blob = await DownloadManager.getChapterImage(downloadId, i);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${mangaTitle} - ${chapterTitle} - Page ${(i + 1).toString().padStart(3, '0')}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    // Small delay to prevent browser blocking
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        } catch (e) {
            console.error('Page export failed:', e);
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            {/* Main Button */}
            <button
                onClick={() => { vibrate(); setIsOpen(!isOpen); }}
                className={`p-2 rounded-full text-white backdrop-blur-md transition-all flex items-center gap-1 ${isDownloaded
                    ? 'bg-green-500/20 text-green-400'
                    : isDownloading
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
            >
                {isDownloading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                ) : isDownloaded ? (
                    <Check className="w-5 h-5" />
                ) : (
                    <Download className="w-5 h-5" />
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Progress Bar (shown when downloading) */}
            {isDownloading && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-black/90 rounded-lg p-3 border border-white/10">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Downloading...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                        {currentDownload?.downloadedImages || 0} / {currentDownload?.totalImages || '?'} pages
                    </div>
                </div>
            )}

            {/* Dropdown Menu */}
            {isOpen && !isDownloading && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header with size estimate */}
                    <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white font-medium">Download Options</span>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{totalImages} pages</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-400">~{estimatedSizeMB} MB</span>
                            {isLargeDownload && (
                                <span className="text-xs text-yellow-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Large
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Download to App (IndexedDB) */}
                    {!isDownloaded && (
                        <button
                            onClick={handleQueueDownload}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Download className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-sm text-white font-medium">Save for Offline</div>
                                <div className="text-[10px] text-gray-500">Read without internet</div>
                            </div>
                        </button>
                    )}

                    {/* Export Options (only if downloaded) */}
                    {isDownloaded && (
                        <>
                            <button
                                onClick={() => handleExport('zip')}
                                disabled={isExporting}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    {isExporting && exportFormat === 'zip' ? (
                                        <Loader className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <FileArchive className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium">Export as ZIP</div>
                                    <div className="text-[10px] text-gray-500">Standard archive format</div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleExport('cbz')}
                                disabled={isExporting}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    {isExporting && exportFormat === 'cbz' ? (
                                        <Loader className="w-4 h-4 text-green-400 animate-spin" />
                                    ) : (
                                        <FileArchive className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium">Export as CBZ</div>
                                    <div className="text-[10px] text-gray-500">Comic book format</div>
                                </div>
                            </button>

                            <button
                                onClick={handleDownloadPages}
                                disabled={isExporting}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-t border-white/5 disabled:opacity-50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                    {isExporting && !exportFormat ? (
                                        <Loader className="w-4 h-4 text-orange-400 animate-spin" />
                                    ) : (
                                        <Image className="w-4 h-4 text-orange-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm text-white font-medium">Download Pages</div>
                                    <div className="text-[10px] text-gray-500">Individual image files</div>
                                </div>
                            </button>
                        </>
                    )}

                    {/* Already downloaded indicator */}
                    {isDownloaded && (
                        <div className="px-4 py-2 bg-green-500/10 border-t border-white/5">
                            <div className="flex items-center gap-2 text-xs text-green-400">
                                <Check className="w-3 h-3" />
                                <span>Saved for offline reading</span>
                            </div>
                        </div>
                    )}

                    {/* Large download warning */}
                    {isLargeDownload && !isDownloaded && (
                        <div className="px-4 py-2 bg-yellow-500/10 border-t border-white/5">
                            <div className="flex items-center gap-2 text-xs text-yellow-400">
                                <AlertTriangle className="w-3 h-3" />
                                <span>This is a large download ({estimatedSizeMB} MB)</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
