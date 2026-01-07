"use client";

import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'manga-app-settings';

interface Settings {
    theme: 'dark' | 'light' | 'system';
    readerDirection: 'vertical' | 'horizontal';
    imageQuality: 'high' | 'medium' | 'low';
    notifications: boolean;
    autoDownload: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'dark',
    readerDirection: 'vertical',
    imageQuality: 'high',
    notifications: true,
    autoDownload: false
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSettings = (newSettings: Partial<Settings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    };

    return { settings, updateSettings, loading };
}
