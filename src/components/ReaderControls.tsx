"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Maximize, Minimize, Moon, Sun, Monitor, AlertCircle, Loader } from 'lucide-react';
import DownloadMenu from './DownloadMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from '@/hooks/useHistory';
import { useDownload } from '@/hooks/useDownload';
import { useAniList } from '@/hooks/useAniList';
import { getProxyUrl } from '@/lib/utils';
import { getChapterImagesAutoAction } from '@/app/actions';
import { DownloadStatus } from '@/lib/downloadManager';

chapterTitle: string;
cover: string;
sourceId: string;
anilistId: string;
}

type ReadingMode = 'vertical' | 'paged' | 'double';
type PageFit = 'contain' | 'cover' | 'width' | 'original';

export default function ReaderControls({
    images,
    chapterId,
    mangaId,
    mangaTitle,
    chapterTitle,
    cover,
    sourceId,
    anilistId
}: ReaderControlsProps) {
    const { addToHistory } = useHistory();
    const { syncProgress } = useAniList();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoadingOffline, setIsLoadingOffline] = useState(false);
    const [offlineError, setOfflineError] = useState<string | null>(null);

    // Reading Settings
    const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
    const [pageFit, setPageFit] = useState<PageFit>('width');
    const [showGap, setShowGap] = useState(true);
    const [isRTL, setIsRTL] = useState(true); // Default to RTL for manga

    const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        addToHistory({
            id: chapterId,
            mangaId,
            mangaTitle,
            chapterTitle,
            cover,
            sourceId
        });
    }, [chapterId, mangaId, sourceId, mangaTitle, chapterTitle, cover]);

    const [displayImages, setDisplayImages] = useState<string[]>(images);

    useEffect(() => {
        setImagesLoaded(new Array(displayImages.length).fill(false));
    }, [displayImages.length]);

    // Restore scroll/page on mount
    useEffect(() => {
        if (displayImages.length > 0) {
            const key = `progress_${mangaId}_${chapterId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const index = parseInt(saved);
                if (!isNaN(index)) {
                    setCurrentPageIndex(index);
                    if (readingMode === 'vertical') {
                        setTimeout(() => {
                            imageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 800);
                    }
                }
            }
        }
    }, [displayImages.length, mangaId, chapterId]);

    // Save Progress
    const savePageProgress = (index: number) => {
        setCurrentPageIndex(index);
        const key = `progress_${mangaId}_${chapterId}`;
        localStorage.setItem(key, index.toString());

        // AniList Sync at 80% progress
        if (index >= displayImages.length * 0.8) {
            const match = chapterTitle.match(/(\d+(\.\d+)?)/);
            if (match) {
                const chapNum = parseFloat(match[1]);
                if (!isNaN(chapNum)) {
                    syncProgress(mangaId, mangaTitle, Math.floor(chapNum));
                }
            }
        }
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (readingMode === 'vertical') {
                if (e.key === ' ') {
                    e.preventDefault();
                    contentRef.current?.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                }
                return;
            }

            if (e.key === 'ArrowLeft') {
                isRTL ? handleNext() : handlePrev();
            } else if (e.key === 'ArrowRight') {
                isRTL ? handlePrev() : handleNext();
            } else if (e.key === ' ') {
                e.preventDefault();
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readingMode, currentPageIndex, displayImages.length, isRTL]);

    const handleNext = () => {
        const step = readingMode === 'double' ? 2 : 1;
        if (currentPageIndex + step < displayImages.length) {
            const nextIdx = currentPageIndex + step;
            savePageProgress(nextIdx);
        }
    };

    const handlePrev = () => {
        const step = readingMode === 'double' ? 2 : 1;
        if (currentPageIndex - step >= 0) {
            const prevIdx = currentPageIndex - step;
            savePageProgress(prevIdx);
        }
    };

    // Download integration
    const { getDownload, queueDownload, downloads } = useDownload();
    const downloadId = `${mangaId}_${chapterId}`;
    const currentDownload = getDownload(downloadId);

    useEffect(() => {
        if (images && images.length > 0) {
            setDisplayImages(images);
        } else if (!isLoadingOffline && !offlineError) {
            const attemptHeal = async () => {
                setIsLoadingOffline(true);
                try {
                    // SILENT FALLBACK: Using the comprehensive backend auto-retry
                    const result = await getChapterImagesAutoAction(anilistId, mangaTitle, chapterTitle, sourceId);
                    if (result && result.images.length > 0) {
                        setDisplayImages(result.images);
                        // Backend already handles silent source caching via saveLastWorkingSource
                        console.log(`[Reader] Silent fallback successful on ${result.sourceId}`);
                    } else {
                        throw new Error("No alternate sources could provide this chapter.");
                    }
                } catch (e: any) {
                    setOfflineError(e.message || "Failed to load chapter content.");
                } finally {
                    setIsLoadingOffline(false);
                }
            };
            attemptHeal();
        }
    }, [images, chapterTitle, anilistId, mangaTitle, sourceId]);


    useEffect(() => {
        const loadOfflineImages = async () => {
            const isCompleted = currentDownload?.status === DownloadStatus.Completed;
            const isOnlineMissing = !images || images.length === 0;

            if (isCompleted || isOnlineMissing) {
                if (isOnlineMissing) setIsLoadingOffline(true);
                try {
                    const { DownloadManager } = await import('@/lib/downloadManager');
                    const blobs = await DownloadManager.getChapterBlobs(downloadId);
                    if (blobs.length > 0) {
                        setDisplayImages(blobs);
                        setOfflineError(null);
                    }
                } catch (e: any) {
                    if (isOnlineMissing) setOfflineError(e.message || "Failed to load offline chapter");
                } finally {
                    setIsLoadingOffline(false);
                }
            }
        };
        loadOfflineImages();
    }, [currentDownload?.status, chapterId, images, downloads.length]);

    useEffect(() => {
        return () => {
            displayImages.forEach(url => {
                if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, [displayImages]);

    const [showControls, setShowControls] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light' | 'cloudy'>('dark');
    let controlsTimeout: NodeJS.Timeout;

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const resetControlsTimeout = () => {
        setShowControls(true);
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => {
        window.addEventListener('mousemove', resetControlsTimeout);
        window.addEventListener('touchstart', resetControlsTimeout);
        resetControlsTimeout();
        return () => {
            window.removeEventListener('mousemove', resetControlsTimeout);
            window.removeEventListener('touchstart', resetControlsTimeout);
            clearTimeout(controlsTimeout);
        };
    }, []);

    const getBgColor = () => {
        switch (theme) {
            case 'light': return 'bg-gray-100';
            case 'cloudy': return 'bg-[#1a1a2e]';
            case 'dark': default: return 'bg-black';
        }
    };

    const getFitClass = () => {
        switch (pageFit) {
            case 'contain': return 'max-h-screen w-auto mx-auto object-contain';
            case 'cover': return 'w-full h-auto min-h-screen object-cover';
            case 'original': return 'w-auto h-auto mx-auto object-none';
            case 'width': default: return 'w-full h-auto';
        }
    };

    if (offlineError && (!displayImages || displayImages.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Unable to load chapter</h2>
                <p className="text-gray-400 text-center mb-6">{offlineError}</p>
                <Link href="/" className="px-6 py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition">
                    Return to Library
                </Link>
            </div>
        );
    }

    if (isLoadingOffline && (!displayImages || displayImages.length === 0)) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Loader className="w-10 h-10 animate-spin text-purple-500 mb-4" />
                <p>Preparing chapter...</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`h-screen overflow-hidden flex flex-col transition-colors duration-300 ${getBgColor()}`}
        >
            {/* Top Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 w-full p-4 z-50 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center"
                    >
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                                <ArrowLeft className="w-6 h-6" />
                            </Link>
                            <div className="flex flex-col">
                                <h1 className="text-white text-sm font-bold truncate max-w-[200px]">{mangaTitle}</h1>
                                <p className="text-gray-400 text-xs">{chapterTitle}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10">
                            {/* Mode Selectors */}
                            <select
                                value={readingMode}
                                onChange={(e) => setReadingMode(e.target.value as ReadingMode)}
                                className="bg-transparent text-white text-xs border-none focus:ring-0 cursor-pointer"
                            >
                                <option value="vertical" className="bg-gray-900">Vertical</option>
                                <option value="paged" className="bg-gray-900">Paged</option>
                                <option value="double" className="bg-gray-900">Double</option>
                            </select>

                            <select
                                value={pageFit}
                                onChange={(e) => setPageFit(e.target.value as PageFit)}
                                className="bg-transparent text-white text-xs border-none focus:ring-0 cursor-pointer border-l border-white/10 pl-2"
                            >
                                <option value="width" className="bg-gray-900">Fit Width</option>
                                <option value="contain" className="bg-gray-900">Contain</option>
                                <option value="cover" className="bg-gray-900">Cover</option>
                                <option value="original" className="bg-gray-900">Original</option>
                            </select>

                            <button
                                onClick={() => setIsRTL(!isRTL)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${isRTL ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                            >
                                {isRTL ? 'RTL' : 'LTR'}
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <DownloadMenu
                                mangaId={mangaId}
                                chapterId={chapterId}
                                mangaTitle={mangaTitle}
                                chapterTitle={chapterTitle}
                                cover={cover}
                                sourceId={sourceId}
                                totalImages={displayImages.length}
                            />
                            <button onClick={toggleFullscreen} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md">
                                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div
                ref={contentRef}
                className={`flex-1 overflow-y-auto overflow-x-hidden relative ${readingMode !== 'vertical' ? 'flex items-center justify-center' : ''}`}
                onClick={(e) => {
                    const x = e.clientX / window.innerWidth;
                    if (x > 0.3 && x < 0.7) {
                        setShowControls(!showControls);
                    } else if (readingMode !== 'vertical') {
                        if (x <= 0.3) isRTL ? handleNext() : handlePrev();
                        else if (x >= 0.7) isRTL ? handlePrev() : handleNext();
                    }
                }}
            >
                {readingMode === 'vertical' ? (
                    <div className={`max-w-4xl mx-auto shadow-2xl ${showGap ? 'space-y-2' : ''}`}>
                        {displayImages.map((src, index) => (
                            <div
                                key={index}
                                className="relative w-full"
                                ref={(el) => {
                                    imageRefs.current[index] = el;
                                    if (el && typeof IntersectionObserver !== 'undefined') {
                                        const observer = new IntersectionObserver(([entry]) => {
                                            if (entry.isIntersecting) savePageProgress(index);
                                        }, { threshold: 0.2 });
                                        observer.observe(el);
                                    }
                                }}
                            >
                                <img
                                    src={src.startsWith('blob:') ? src : getProxyUrl(src)}
                                    alt={`Page ${index + 1}`}
                                    className={getFitClass()}
                                    loading="lazy"
                                />
                                {currentPageIndex === index && (
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md">
                                        {index + 1} / {displayImages.length}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={`w-full h-full flex items-center justify-center select-none ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        {readingMode === 'double' && currentPageIndex > 0 && (currentPageIndex % 2 === 0) && (
                            <div className="flex-1 flex justify-end px-1">
                                <img
                                    src={displayImages[currentPageIndex - 1].startsWith('blob:') ? displayImages[currentPageIndex - 1] : getProxyUrl(displayImages[currentPageIndex - 1])}
                                    className="max-h-screen w-auto object-contain"
                                    alt="Prev Page"
                                />
                            </div>
                        )}
                        <div className="flex-1 flex justify-center px-1">
                            <img
                                src={displayImages[currentPageIndex].startsWith('blob:') ? displayImages[currentPageIndex] : getProxyUrl(displayImages[currentPageIndex])}
                                className="max-h-screen w-auto object-contain"
                                alt="Current Page"
                            />
                        </div>
                        {readingMode === 'double' && currentPageIndex + 1 < displayImages.length && (
                            <div className="flex-1 flex justify-start px-1">
                                <img
                                    src={displayImages[currentPageIndex + 1].startsWith('blob:') ? displayImages[currentPageIndex + 1] : getProxyUrl(displayImages[currentPageIndex + 1])}
                                    className="max-h-screen w-auto object-contain"
                                    alt="Next Page"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Progress Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 w-full p-4 z-50 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center"
                    >
                        <div className="w-full max-w-2xl flex flex-col space-y-2">
                            <div className="w-full flex justify-between text-[10px] text-gray-400 font-medium">
                                <span>{currentPageIndex + 1}</span>
                                <span>{displayImages.length} Pages</span>
                            </div>
                            <div className="relative w-full h-1 bg-white/10 rounded-full group cursor-pointer overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentPageIndex + 1) / displayImages.length) * 100}%` }}
                                />
                                <div className="absolute inset-0 flex">
                                    {displayImages.map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 h-full hover:bg-white/20 transition-colors"
                                            onClick={() => {
                                                if (readingMode === 'vertical') {
                                                    imageRefs.current[i]?.scrollIntoView({ behavior: 'smooth' });
                                                } else {
                                                    savePageProgress(i);
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
