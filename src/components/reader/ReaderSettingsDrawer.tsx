"use client";

import React from 'react';
import { useReader, ReadingMode, PageFit, ReadingDirection } from '@/context/ReaderContext';
import { X, Monitor, BookOpen, Columns2, ArrowRightLeft, AlignVerticalJustifyStart, Maximize, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReaderSettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * ReaderSettingsDrawer - Adapted from Seanime's chapter-reader-settings.tsx
 * 
 * Provides comprehensive reader settings:
 * - Reading mode (Vertical, Paged, Double-page)
 * - Page fit (Contain, Cover, Width, Original, Larger)
 * - Reading direction (LTR/RTL)
 * - Gap between pages toggle
 * - Page overflow width slider
 */
export function ReaderSettingsDrawer({ isOpen, onClose }: ReaderSettingsDrawerProps) {
    const { settings, updateSettings } = useReader();

    const readingModes: { value: ReadingMode; label: string; icon: React.ReactNode }[] = [
        { value: 'vertical', label: 'Vertical', icon: <AlignVerticalJustifyStart className="w-4 h-4" /> },
        { value: 'paged', label: 'Paged', icon: <Monitor className="w-4 h-4" /> },
        { value: 'double', label: 'Double Page', icon: <Columns2 className="w-4 h-4" /> },
    ];

    const pageFitOptions: { value: PageFit; label: string; description: string }[] = [
        { value: 'width', label: 'Fit Width', description: 'Fill container width, maintain aspect ratio' },
        { value: 'contain', label: 'Fit Height', description: 'Fill container height, maintain aspect ratio' },
        { value: 'cover', label: 'Cover', description: 'Fill entire container (may crop)' },
        { value: 'original', label: 'True Size', description: 'No scaling, original image dimensions' },
        { value: 'larger', label: 'Overflow', description: 'Larger than viewport, scrollable' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60]"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-[320px] max-w-[90vw] bg-gray-900 border-l border-white/10 z-[61] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">Reader Settings</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Reading Mode */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    Reading Mode
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {readingModes.map((mode) => (
                                        <button
                                            key={mode.value}
                                            onClick={() => updateSettings({ readingMode: mode.value })}
                                            className={cn(
                                                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                                                settings.readingMode === mode.value
                                                    ? 'bg-purple-600 border-purple-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                            )}
                                        >
                                            {mode.icon}
                                            <span className="text-xs">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Page Fit */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    Page Fit
                                </label>
                                <div className="space-y-2">
                                    {pageFitOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => updateSettings({ pageFit: option.value })}
                                            className={cn(
                                                'w-full text-left p-3 rounded-lg border transition-all',
                                                settings.pageFit === option.value
                                                    ? 'bg-purple-600/20 border-purple-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                            )}
                                        >
                                            <div className="font-medium text-sm">{option.label}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reading Direction */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    Reading Direction
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateSettings({ readingDirection: 'ltr' })}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                                            settings.readingDirection === 'ltr'
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        )}
                                    >
                                        <ArrowRightLeft className="w-4 h-4" />
                                        <span className="text-sm">Left → Right</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ readingDirection: 'rtl' })}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                                            settings.readingDirection === 'rtl'
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                        )}
                                    >
                                        <ArrowRightLeft className="w-4 h-4 transform scale-x-[-1]" />
                                        <span className="text-sm">Right → Left</span>
                                    </button>
                                </div>
                            </div>

                            {/* Gap Toggle */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    Page Gap
                                </label>
                                <button
                                    onClick={() => updateSettings({ showGap: !settings.showGap })}
                                    className={cn(
                                        'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                                        settings.showGap
                                            ? 'bg-purple-600/20 border-purple-500'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    )}
                                >
                                    <span className="text-sm text-gray-300">Show gap between pages</span>
                                    <div className={cn(
                                        'w-10 h-6 rounded-full transition-colors relative',
                                        settings.showGap ? 'bg-purple-600' : 'bg-gray-700'
                                    )}>
                                        <div className={cn(
                                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                            settings.showGap ? 'left-5' : 'left-1'
                                        )} />
                                    </div>
                                </button>
                            </div>

                            {/* Overflow Width Slider (only for larger mode) */}
                            {settings.pageFit === 'larger' && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                        Page Width: {settings.pageOverflowWidth}%
                                    </label>
                                    <input
                                        type="range"
                                        min="100"
                                        max="200"
                                        value={settings.pageOverflowWidth}
                                        onChange={(e) => updateSettings({ pageOverflowWidth: parseInt(e.target.value) })}
                                        className="w-full accent-purple-600"
                                    />
                                </div>
                            )}

                            {/* Keyboard Shortcuts Info */}
                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                                    Keyboard Shortcuts
                                </label>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <div className="flex justify-between">
                                        <span>Previous/Next Page</span>
                                        <span className="text-gray-600">← / →</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Scroll</span>
                                        <span className="text-gray-600">↑ / ↓</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Next Page (Alt)</span>
                                        <span className="text-gray-600">Space</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Toggle Fullscreen</span>
                                        <span className="text-gray-600">F</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
