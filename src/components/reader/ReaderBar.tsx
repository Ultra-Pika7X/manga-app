"use client";

import React from 'react';
import Link from 'next/link';
import { useReader } from '@/context/ReaderContext';
import {
    ArrowLeft,
    Settings,
    Maximize,
    Minimize,
    ChevronLeft,
    ChevronRight,
    Monitor,
    AlignVerticalJustifyStart,
    Columns2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReaderBarProps {
    mangaId: string;
    mangaTitle: string;
    chapterTitle: string;
    totalPages: number;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onOpenSettings: () => void;
    onPrevChapter?: () => void;
    onNextChapter?: () => void;
    hasPrevChapter?: boolean;
    hasNextChapter?: boolean;
}

/**
 * ReaderBar - Adapted from Seanime's manga-reader-bar.tsx
 * 
 * Features:
 * - Top bar with title and controls
 * - Bottom bar with progress slider
 * - Quick mode switcher
 * - Chapter navigation
 * - Auto-hide functionality
 */
export function ReaderBar({
    mangaId,
    mangaTitle,
    chapterTitle,
    totalPages,
    isFullscreen,
    onToggleFullscreen,
    onOpenSettings,
    onPrevChapter,
    onNextChapter,
    hasPrevChapter = false,
    hasNextChapter = false,
}: ReaderBarProps) {
    const { settings, state, updateSettings, goToPage } = useReader();
    const progressRef = React.useRef<HTMLDivElement>(null);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const pageIndex = Math.floor(percentage * totalPages);
        goToPage(Math.max(0, Math.min(pageIndex, totalPages - 1)));
    };

    const modeIcons: Record<string, React.ReactNode> = {
        vertical: <AlignVerticalJustifyStart className="w-4 h-4" />,
        paged: <Monitor className="w-4 h-4" />,
        double: <Columns2 className="w-4 h-4" />,
    };

    const cycleReadingMode = () => {
        const modes: ('vertical' | 'paged' | 'double')[] = ['vertical', 'paged', 'double'];
        const currentIndex = modes.indexOf(settings.readingMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        updateSettings({ readingMode: modes[nextIndex] });
    };

    return (
        <AnimatePresence>
            {!settings.hiddenBar && (
                <>
                    {/* Top Bar */}
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 w-full p-4 z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent"
                    >
                        <div className="flex items-center justify-between max-w-7xl mx-auto">
                            {/* Left: Back & Title */}
                            <div className="flex items-center gap-4">
                                <Link
                                    href={`/manga/${mangaId}`}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Link>
                                <div className="flex flex-col">
                                    <h1 className="text-white text-sm font-bold truncate max-w-[200px] md:max-w-[400px]">
                                        {mangaTitle}
                                    </h1>
                                    <p className="text-gray-400 text-xs">{chapterTitle}</p>
                                </div>
                            </div>

                            {/* Right: Controls */}
                            <div className="flex items-center gap-2">
                                {/* Quick Mode Toggle */}
                                <button
                                    onClick={cycleReadingMode}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                                    title={`Mode: ${settings.readingMode}`}
                                >
                                    {modeIcons[settings.readingMode]}
                                    <span className="text-xs hidden sm:inline capitalize">
                                        {settings.readingMode}
                                    </span>
                                </button>

                                {/* RTL Toggle */}
                                <button
                                    onClick={() => updateSettings({
                                        readingDirection: settings.readingDirection === 'rtl' ? 'ltr' : 'rtl'
                                    })}
                                    className={cn(
                                        'px-3 py-2 rounded-full text-xs font-bold backdrop-blur-md transition-all',
                                        settings.readingDirection === 'rtl'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                    )}
                                >
                                    {settings.readingDirection.toUpperCase()}
                                </button>

                                {/* Settings */}
                                <button
                                    onClick={onOpenSettings}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>

                                {/* Fullscreen */}
                                <button
                                    onClick={onToggleFullscreen}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                                >
                                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bottom Bar */}
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 w-full p-4 z-50 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
                    >
                        <div className="max-w-4xl mx-auto space-y-3">
                            {/* Page Info */}
                            <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                                <span>Page {state.currentPageIndex + 1}</span>
                                <span>{totalPages} Pages</span>
                            </div>

                            {/* Progress Bar */}
                            <div
                                ref={progressRef}
                                className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer group overflow-hidden"
                                onClick={handleProgressClick}
                            >
                                {/* Progress Fill */}
                                <div
                                    className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all duration-150"
                                    style={{ width: `${((state.currentPageIndex + 1) / totalPages) * 100}%` }}
                                />

                                {/* Hover segments */}
                                <div className="absolute inset-0 flex">
                                    {Array.from({ length: totalPages }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 h-full hover:bg-white/20 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                goToPage(i);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Chapter Navigation */}
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={onPrevChapter}
                                    disabled={!hasPrevChapter}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium',
                                        hasPrevChapter
                                            ? 'bg-white/10 hover:bg-white/20 text-white'
                                            : 'bg-white/5 text-gray-600 cursor-not-allowed'
                                    )}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>

                                <button
                                    onClick={onNextChapter}
                                    disabled={!hasNextChapter}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium',
                                        hasNextChapter
                                            ? 'bg-white/10 hover:bg-white/20 text-white'
                                            : 'bg-white/5 text-gray-600 cursor-not-allowed'
                                    )}
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
