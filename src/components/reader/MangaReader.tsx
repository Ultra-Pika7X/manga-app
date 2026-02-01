"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReaderProvider, useReader } from '@/context/ReaderContext';
import { VerticalReader } from './VerticalReader';
import { HorizontalReader } from './HorizontalReader';
import { ReaderBar } from './ReaderBar';
import { ReaderSettingsDrawer } from './ReaderSettingsDrawer';
import { useHistory } from '@/hooks/useHistory';
import { useAniList } from '@/hooks/useAniList';
import { useDownload } from '@/hooks/useDownload';
import { cn } from '@/lib/utils';

interface MangaReaderProps {
    images: string[];
    mangaId: string;
    chapterId: string;
    mangaTitle: string;
    chapterTitle: string;
    cover: string;
    sourceId: string;
    anilistId: string;
    onPrevChapter?: () => void;
    onNextChapter?: () => void;
    hasPrevChapter?: boolean;
    hasNextChapter?: boolean;
}

/**
 * MangaReader - Main reader component adapted from Seanime
 * 
 * Combines all reader components:
 * - ReaderProvider for state management
 * - VerticalReader / HorizontalReader based on mode
 * - ReaderBar for controls
 * - ReaderSettingsDrawer for settings
 * - History and AniList sync integration
 */
function MangaReaderInner({
    images,
    mangaId,
    chapterId,
    mangaTitle,
    chapterTitle,
    cover,
    sourceId,
    anilistId,
    onPrevChapter,
    onNextChapter,
    hasPrevChapter,
    hasNextChapter,
}: MangaReaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const { settings, state, updateSettings, setCurrentPageIndex } = useReader();
    const { addToHistory } = useHistory();
    const { syncProgress } = useAniList();
    const { queueDownload } = useDownload();

    const handleDownload = () => {
        queueDownload({
            id: `${mangaId}_${chapterId}`,
            mangaId,
            chapterId,
            sourceId,
            mangaTitle,
            chapterTitle,
            cover
        });
        // Optional: Show toast
        console.log('Download started');
    };

    let controlsTimeoutRef = useRef<NodeJS.Timeout>();

    // Add to history on mount
    useEffect(() => {
        addToHistory({
            id: chapterId,
            mangaId,
            mangaTitle,
            chapterTitle,
            cover,
            sourceId
        });
    }, [chapterId, mangaId, mangaTitle, chapterTitle, cover, sourceId, addToHistory]);

    // Restore page progress on mount
    useEffect(() => {
        if (images.length > 0) {
            const key = `progress_${mangaId}_${chapterId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const index = parseInt(saved);
                if (!isNaN(index) && index < images.length) {
                    setCurrentPageIndex(index);
                }
            }
        }
    }, [images.length, mangaId, chapterId, setCurrentPageIndex]);

    // Save progress when page changes
    useEffect(() => {
        const key = `progress_${mangaId}_${chapterId}`;
        localStorage.setItem(key, state.currentPageIndex.toString());

        // AniList sync at 80% progress
        if (state.currentPageIndex >= images.length * 0.8) {
            const match = chapterTitle.match(/(\d+(\.\d+)?)/);
            if (match) {
                const chapNum = parseFloat(match[1]);
                if (!isNaN(chapNum)) {
                    syncProgress(mangaId, mangaTitle, Math.floor(chapNum));
                }
            }
        }
    }, [state.currentPageIndex, mangaId, chapterId, images.length, chapterTitle, mangaTitle, syncProgress]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard: F for fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleFullscreen]);

    // Auto-hide controls
    const resetControlsTimeout = useCallback(() => {
        setShowControls(true);
        updateSettings({ hiddenBar: false });

        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
            updateSettings({ hiddenBar: true });
        }, 3000);
    }, [updateSettings]);

    useEffect(() => {
        const handleMouseMove = () => resetControlsTimeout();
        const handleTouchStart = () => resetControlsTimeout();

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchstart', handleTouchStart);
        resetControlsTimeout();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchstart', handleTouchStart);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [resetControlsTimeout]);

    // Handle page change from reader components
    const handlePageChange = useCallback((index: number) => {
        // Already handled by context, but we can add additional logic here if needed
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                'h-screen w-full overflow-hidden bg-black transition-colors duration-300',
                'focus-visible:outline-none'
            )}
        >
            {/* Reader Bar */}
            <ReaderBar
                mangaId={anilistId}
                mangaTitle={mangaTitle}
                chapterTitle={chapterTitle}
                totalPages={images.length}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onPrevChapter={onPrevChapter}
                onNextChapter={onNextChapter}
                onDownload={handleDownload}
                hasPrevChapter={hasPrevChapter}
                hasNextChapter={hasNextChapter}
            />

            {/* Reader Content */}
            {settings.readingMode === 'vertical' ? (
                <VerticalReader
                    images={images}
                    onPageChange={handlePageChange}
                />
            ) : (
                <HorizontalReader
                    images={images}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Settings Drawer */}
            <ReaderSettingsDrawer
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}

/**
 * MangaReader wrapper with Provider
 */
export function MangaReader(props: MangaReaderProps) {
    return (
        <ReaderProvider totalPages={props.images.length}>
            <MangaReaderInner {...props} />
        </ReaderProvider>
    );
}

export default MangaReader;
