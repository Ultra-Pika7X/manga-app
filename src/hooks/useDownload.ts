"use client";

import { useState, useEffect } from 'react';
import { DownloadManager, ChapterDownload, DownloadStatus } from '@/lib/downloadManager';

export function useDownload() {
    const [downloads, setDownloads] = useState<ChapterDownload[]>([]);

    useEffect(() => {
        // Subscribe to changes
        const unsubscribe = DownloadManager.subscribe((updated) => {
            setDownloads(updated);
        });
        return () => unsubscribe();
    }, []);

    const queueDownload = (chapter: {
        id: string;
        mangaId: string;
        chapterId: string;
        sourceId: string;
        mangaTitle: string;
        chapterTitle: string;
        cover: string;
    }) => {
        DownloadManager.queueDownload(chapter);
    };

    const pauseDownload = (id: string) => {
        DownloadManager.pauseDownload(id);
    };

    const resumeDownload = (id: string) => {
        DownloadManager.resumeDownload(id);
    };

    const deleteDownload = (id: string) => {
        DownloadManager.deleteDownload(id);
    };

    const getDownload = (id: string) => {
        return downloads.find(d => d.id === id);
    };

    const exportChapter = async (id: string) => {
        return DownloadManager.exportChapter(id);
    };

    const getStorageEstimate = async () => {
        return DownloadManager.getStorageEstimate();
    };

    const clearAllDownloads = async () => {
        return DownloadManager.clearAllDownloads();
    };

    const updateSettings = (settings: { imageQuality?: 'high' | 'medium' | 'low'; autoPauseOnMobile?: boolean; warnStorageQuota?: boolean }) => {
        DownloadManager.updateSettings(settings);
    };

    const getSettings = () => DownloadManager.settings;

    const activeDownloads = downloads.filter(d =>
        d.status === DownloadStatus.Pending ||
        d.status === DownloadStatus.FetchingMeta ||
        d.status === DownloadStatus.Downloading
    );

    return {
        downloads,
        activeDownloads,
        queueDownload,
        pauseDownload,
        resumeDownload,
        deleteDownload,
        getDownload,
        exportChapter,
        getStorageEstimate,
        clearAllDownloads,
        updateSettings,
        getSettings
    };
}
