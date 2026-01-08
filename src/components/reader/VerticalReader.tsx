"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { ChapterPage } from './ChapterPage';
import { useReader } from '@/context/ReaderContext';
import { cn } from '@/lib/utils';

interface VerticalReaderProps {
    images: string[];
    onPageChange?: (index: number) => void;
}

/**
 * VerticalReader - Adapted from Seanime's chapter-vertical-reader.tsx
 * 
 * Features:
 * - Smooth vertical scrolling
 * - Automatic page tracking via intersection observer
 * - Gap between pages (toggleable)
 * - Page fit modes (width, contain, cover, original, larger)
 * - Keyboard navigation (up/down arrows, space)
 */
export function VerticalReader({ images, onPageChange }: VerticalReaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { settings, state, setCurrentPageIndex, setIsLastPage, toggleBar } = useReader();

    // Handle scroll to detect last page
    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;

        // Check if near the end (within 1500px of bottom)
        if (scrollTop > 1000 && scrollTop + clientHeight >= scrollHeight - 1500) {
            setIsLastPage(true);
        } else {
            setIsLastPage(false);
        }
    }, [setIsLastPage]);

    // Add scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Handle page visibility change
    const handlePageVisible = useCallback((index: number) => {
        setCurrentPageIndex(index);
        onPageChange?.(index);
    }, [setCurrentPageIndex, onPageChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const container = containerRef.current;
            if (!container) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    container.scrollBy({ top: -100, behavior: 'smooth' });
                    break;
                case 'ArrowDown':
                case ' ':
                    e.preventDefault();
                    container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    const prevPage = document.getElementById(`page-${state.currentPageIndex - 1}`);
                    prevPage?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const nextPage = document.getElementById(`page-${state.currentPageIndex + 1}`);
                    nextPage?.scrollIntoView({ behavior: 'smooth' });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.currentPageIndex]);

    // Get image class based on settings
    const getImageClass = () => {
        switch (settings.pageFit) {
            case 'contain':
                return 'max-h-screen w-auto mx-auto object-contain';
            case 'cover':
                return 'w-full h-auto object-cover';
            case 'original':
                return 'w-auto h-auto mx-auto object-none';
            case 'larger':
                return 'w-full h-auto max-w-[1400px] mx-auto';
            case 'width':
            default:
                return 'w-full h-auto max-w-4xl mx-auto';
        }
    };

    return (
        <div
            data-vertical-reader-container
            className={cn(
                'h-full overflow-hidden relative focus-visible:outline-none',
                settings.hiddenBar ? 'max-h-full' : 'max-h-[calc(100dvh-3rem)]'
            )}
            onClick={() => toggleBar()}
            tabIndex={-1}
        >
            <div
                ref={containerRef}
                data-vertical-reader-scroll
                className={cn(
                    'w-full overflow-y-auto overflow-x-hidden px-4 select-none relative focus-visible:outline-none hide-scrollbar',
                    settings.hiddenBar ? 'h-dvh' : 'h-[calc(100dvh-3rem)]',
                    settings.showGap && 'space-y-4'
                )}
                tabIndex={-1}
            >
                {images.map((src, index) => (
                    <ChapterPage
                        key={`${src}-${index}`}
                        src={src}
                        index={index}
                        onVisible={handlePageVisible}
                        containerClass="mx-auto scroll-div"
                        imageClass={getImageClass()}
                        containerMaxWidth={settings.pageFit === 'larger' ? `${settings.pageOverflowWidth}%` : undefined}
                    />
                ))}

                {/* End spacer */}
                <div className="h-20" />
            </div>
        </div>
    );
}
