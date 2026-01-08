"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Reading mode types matching Seanime
export type ReadingMode = 'vertical' | 'paged' | 'double';
export type PageFit = 'contain' | 'cover' | 'width' | 'original' | 'larger';
export type ReadingDirection = 'ltr' | 'rtl';

interface ReaderSettings {
    readingMode: ReadingMode;
    pageFit: PageFit;
    readingDirection: ReadingDirection;
    showGap: boolean;
    pageOverflowWidth: number;
    hiddenBar: boolean;
}

interface ReaderState {
    currentPageIndex: number;
    isLastPage: boolean;
    paginationMap: Record<number, number[]>; // Map of display index to page indexes
}

interface ReaderContextValue {
    // Settings
    settings: ReaderSettings;
    updateSettings: (updates: Partial<ReaderSettings>) => void;

    // State
    state: ReaderState;
    setCurrentPageIndex: (index: number) => void;
    setIsLastPage: (value: boolean) => void;
    setPaginationMap: (map: Record<number, number[]>) => void;

    // Actions
    goToPage: (index: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    toggleBar: () => void;
}

const defaultSettings: ReaderSettings = {
    readingMode: 'vertical',
    pageFit: 'width',
    readingDirection: 'rtl', // Default for manga
    showGap: true,
    pageOverflowWidth: 100,
    hiddenBar: false,
};

const defaultState: ReaderState = {
    currentPageIndex: 0,
    isLastPage: false,
    paginationMap: {},
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

const SETTINGS_STORAGE_KEY = 'manga_reader_settings';

export function ReaderProvider({ children, totalPages = 0 }: { children: ReactNode; totalPages?: number }) {
    // Load settings from localStorage on mount
    const [settings, setSettings] = useState<ReaderSettings>(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
                if (stored) {
                    return { ...defaultSettings, ...JSON.parse(stored) };
                }
            } catch { }
        }
        return defaultSettings;
    });

    const [state, setState] = useState<ReaderState>(defaultState);

    // Persist settings to localStorage
    const updateSettings = useCallback((updates: Partial<ReaderSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
            } catch { }
            return newSettings;
        });
    }, []);

    const setCurrentPageIndex = useCallback((index: number) => {
        setState(prev => ({ ...prev, currentPageIndex: index }));
    }, []);

    const setIsLastPage = useCallback((value: boolean) => {
        setState(prev => ({ ...prev, isLastPage: value }));
    }, []);

    const setPaginationMap = useCallback((map: Record<number, number[]>) => {
        setState(prev => ({ ...prev, paginationMap: map }));
    }, []);

    const goToPage = useCallback((index: number) => {
        if (index >= 0 && index < totalPages) {
            setCurrentPageIndex(index);
        }
    }, [totalPages, setCurrentPageIndex]);

    const nextPage = useCallback(() => {
        const step = settings.readingMode === 'double' ? 2 : 1;
        setState(prev => {
            const nextIndex = prev.currentPageIndex + step;
            if (nextIndex < totalPages) {
                return { ...prev, currentPageIndex: nextIndex };
            }
            return prev;
        });
    }, [settings.readingMode, totalPages]);

    const prevPage = useCallback(() => {
        const step = settings.readingMode === 'double' ? 2 : 1;
        setState(prev => {
            const prevIndex = prev.currentPageIndex - step;
            if (prevIndex >= 0) {
                return { ...prev, currentPageIndex: prevIndex };
            }
            return prev;
        });
    }, [settings.readingMode]);

    const toggleBar = useCallback(() => {
        updateSettings({ hiddenBar: !settings.hiddenBar });
    }, [settings.hiddenBar, updateSettings]);

    const value: ReaderContextValue = {
        settings,
        updateSettings,
        state,
        setCurrentPageIndex,
        setIsLastPage,
        setPaginationMap,
        goToPage,
        nextPage,
        prevPage,
        toggleBar,
    };

    return (
        <ReaderContext.Provider value={value}>
            {children}
        </ReaderContext.Provider>
    );
}

export function useReader() {
    const context = useContext(ReaderContext);
    if (!context) {
        throw new Error('useReader must be used within a ReaderProvider');
    }
    return context;
}
