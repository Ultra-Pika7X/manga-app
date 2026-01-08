"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { ChapterPage } from './ChapterPage';
import { useReader } from '@/context/ReaderContext';
import { cn } from '@/lib/utils';

interface HorizontalReaderProps {
    images: string[];
    onPageChange?: (index: number) => void;
}

/**
 * HorizontalReader - Adapted from Seanime's chapter-horizontal-reader.tsx
 * 
 * Features:
 * - Paged and Double-page modes
 * - RTL/LTR reading direction
 * - Click zones for navigation (left 40%, center 20%, right 40%)
 * - Keyboard navigation (left/right arrows)
 * - Page shadows for double-page mode
 */
export function HorizontalReader({ images, onPageChange }: HorizontalReaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pageWrapperRef = useRef<HTMLDivElement>(null);

    const {
        settings,
        state,
        setCurrentPageIndex,
        setIsLastPage,
        nextPage,
        prevPage,
        toggleBar
    } = useReader();

    const isDoublePage = settings.readingMode === 'double';
    const isRTL = settings.readingDirection === 'rtl';

    // Update isLastPage state
    useEffect(() => {
        const step = isDoublePage ? 2 : 1;
        setIsLastPage(state.currentPageIndex + step >= images.length);
    }, [state.currentPageIndex, images.length, isDoublePage, setIsLastPage]);

    // Handle click navigation
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!pageWrapperRef.current) return;

        const { clientX } = e.nativeEvent;
        const divWidth = pageWrapperRef.current.offsetWidth;
        const clickPosition = clientX - pageWrapperRef.current.getBoundingClientRect().left;
        const clickPercentage = (clickPosition / divWidth) * 100;

        if (clickPercentage <= 40) {
            // Left zone
            if (isRTL) {
                nextPage();
            } else {
                prevPage();
            }
        } else if (clickPercentage >= 60) {
            // Right zone
            if (isRTL) {
                prevPage();
            } else {
                nextPage();
            }
        } else {
            // Center zone - toggle controls
            toggleBar();
        }
    }, [isRTL, nextPage, prevPage, toggleBar]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (isRTL) {
                        nextPage();
                    } else {
                        prevPage();
                    }
                    break;
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    if (isRTL) {
                        prevPage();
                    } else {
                        nextPage();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    containerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    containerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRTL, nextPage, prevPage]);

    // Notify parent of page changes
    useEffect(() => {
        onPageChange?.(state.currentPageIndex);
    }, [state.currentPageIndex, onPageChange]);

    // Get current pages to display
    const currentPages = isDoublePage
        ? [state.currentPageIndex, state.currentPageIndex + 1].filter(i => i < images.length)
        : [state.currentPageIndex];

    // Get image class based on settings
    const getImageClass = (pageIndex: number) => {
        const baseClass = 'h-full inset-0 object-center select-none z-[4] relative focus-visible:outline-none';

        switch (settings.pageFit) {
            case 'contain':
                return cn(baseClass, 'object-contain w-full h-full');
            case 'cover':
                return cn(baseClass, 'w-full h-auto');
            case 'original':
                return cn(baseClass, 'object-none h-auto w-auto mx-auto');
            case 'larger':
                return cn(baseClass, 'w-[1400px] h-auto object-cover mx-auto');
            case 'width':
            default:
                return cn(baseClass, 'w-full h-full object-contain');
        }
    };

    // Check if showing two pages
    const showingTwoPages = isDoublePage && currentPages.length === 2;

    return (
        <div
            ref={containerRef}
            data-horizontal-reader-container
            className={cn(
                'w-full overflow-x-hidden select-none relative focus-visible:outline-none',
                settings.hiddenBar ? 'h-dvh max-h-full' : 'h-[calc(100dvh-3rem)]',
                settings.pageFit === 'cover' && 'overflow-y-auto',
                settings.pageFit === 'original' && 'overflow-y-auto',
                settings.pageFit === 'larger' && 'overflow-y-auto px-4'
            )}
            tabIndex={-1}
        >
            <div
                ref={pageWrapperRef}
                data-horizontal-reader-page-wrapper
                className={cn(
                    'h-full focus-visible:outline-none cursor-pointer',
                    showingTwoPages && 'flex transition-transform duration-300',
                    showingTwoPages && settings.showGap && 'gap-2',
                    showingTwoPages && 'flex-row-reverse' // For proper manga reading order
                )}
                onClick={handleClick}
            >
                {currentPages.map((pageIndex) => (
                    <ChapterPage
                        key={`page-${pageIndex}`}
                        src={images[pageIndex]}
                        index={pageIndex}
                        containerClass={cn(
                            'w-full scroll-div min-h-[200px] relative page',
                            settings.hiddenBar ? 'h-dvh max-h-full' : 'h-[calc(100dvh-3rem)]',
                            'focus-visible:outline-none',
                            // Double page shadows
                            showingTwoPages && settings.showGap && currentPages[0] === pageIndex &&
                            "before:content-[''] before:absolute before:w-[3%] before:z-[5] before:h-full before:[background:_linear-gradient(-90deg,_rgba(17,17,17,0)_0,_rgba(17,17,17,.3)_100%)]",
                            showingTwoPages && settings.showGap && currentPages[1] === pageIndex &&
                            "before:content-[''] before:absolute before:right-0 before:w-[3%] before:z-[5] before:h-full before:[background:_linear-gradient(90deg,_rgba(17,17,17,0)_0,_rgba(17,17,17,.3)_100%)]"
                        )}
                        imageClass={getImageClass(pageIndex)}
                    />
                ))}
            </div>
        </div>
    );
}
