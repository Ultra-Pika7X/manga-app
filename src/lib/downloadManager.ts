import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { getChapterImagesAction, findAlternativeChapterAction } from '../app/actions';

export enum DownloadStatus {
    Pending = 'pending',
    FetchingMeta = 'fetching_meta',
    Downloading = 'downloading',
    Completed = 'completed',
    Paused = 'paused',
    Failed = 'failed'
}

// --- Network Types ---
interface NetworkInformation extends EventTarget {
    readonly type?: ConnectionType;
    readonly effectiveType?: EffectiveConnectionType;
    readonly saveData?: boolean;
    onchange?: EventListener;
}

type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'mixed' | 'none' | 'other' | 'unknown' | 'wifi' | 'wimax';
type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

// Extend Navigator interface
declare global {
    interface Navigator {
        connection?: NetworkInformation;
    }
}

interface MangaMetadata {
    id: string; // mangaId
    title: string;
    cover: string;
    sourceId: string;
    updatedAt: number;
}

interface ChapterMetadata {
    id: string; // chapterId or mangaId_chapterId. We will use mangaId_chapterId to be safe globally
    mangaId: string;
    chapterId: string; // The original simple ID
    title: string;
    status: DownloadStatus;
    totalImages: number;
    downloadedImages: number;
    addedAt: number;
    lastUpdated: number;
    error?: string;
    sourceId: string; // Duplicated for convenience
    retryCount?: number;
    imageUrls?: string[]; // Temporary storage for download session
}

interface PageData {
    chapterId: string; // part of key
    pageIndex: number; // part of key
    blob: Blob;
    url: string; // original source url
    mimeType: string;
}

// --- Public View Interface (Denormalized for UI) ---
export interface ChapterDownload extends ChapterMetadata {
    mangaTitle: string;
    cover: string;
    progress: number;
}

interface MangaDB extends DBSchema {
    manga: {
        key: string;
        value: MangaMetadata;
    };
    chapters: {
        key: string;
        value: ChapterMetadata;
        indexes: { 'by_mangaId': string };
    };
    pages: {
        key: [string, number]; // [chapterId, pageIndex]
        value: PageData;
        indexes: { 'by_chapterId': string };
    };
}

const DB_NAME = 'manga-cloud-offline';
const DB_VERSION = 2; // Bumped for schema change

class DownloadManagerService {
    private dbPromise: Promise<IDBPDatabase<MangaDB>> | null = null;
    private listeners: ((downloads: ChapterDownload[]) => void)[] = [];
    private activeDownloads: Set<string> = new Set();

    // Default Settings
    public settings = {
        imageQuality: 'high' as 'high' | 'medium' | 'low',
        autoPauseOnMobile: true,
        warnStorageQuota: true
    };

    private isMobileData = false;
    private isOnline = true;
    private recoveryAttempted = false;

    constructor() {
        if (typeof window !== 'undefined') {
            // Load settings
            const savedSettings = localStorage.getItem('download_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }

            // Setup DB
            this.dbPromise = openDB<MangaDB>(DB_NAME, DB_VERSION, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    if (oldVersion < 2) {
                        // Nuke old stores if they exist to avoid migration complexity for this refactor
                        if (db.objectStoreNames.contains('downloads' as never)) {
                            db.deleteObjectStore('downloads' as never);
                        }
                        if (db.objectStoreNames.contains('images' as never)) {
                            db.deleteObjectStore('images' as never);
                        }

                        if (!db.objectStoreNames.contains('manga')) {
                            db.createObjectStore('manga', { keyPath: 'id' });
                        }
                        if (!db.objectStoreNames.contains('chapters')) {
                            const store = db.createObjectStore('chapters', { keyPath: 'id' });
                            store.createIndex('by_mangaId', 'mangaId');
                        }
                        if (!db.objectStoreNames.contains('pages')) {
                            const store = db.createObjectStore('pages', { keyPath: ['chapterId', 'pageIndex'] });
                            store.createIndex('by_chapterId', 'chapterId');
                        }
                    }
                },
            });

            // === EDGE CASE HANDLING ===

            // 1. NETWORK LOSS: Monitor online/offline status
            this.isOnline = navigator.onLine;

            window.addEventListener('online', () => {
                console.log('[DownloadManager] Network restored');
                this.isOnline = true;
                this.resumeInterruptedDownloads();
            });

            window.addEventListener('offline', () => {
                console.log('[DownloadManager] Network lost - pausing downloads');
                this.isOnline = false;
                this.pauseAllDownloads();
            });

            // 2. MOBILE DATA: Monitor connection type changes
            this.checkNetwork();
            if (navigator.connection) {
                navigator.connection.onchange = () => {
                    this.checkNetwork();
                    if (this.isMobileData && this.settings.autoPauseOnMobile) {
                        console.log('[DownloadManager] Switched to mobile data - pausing');
                        this.pauseAllDownloads();
                    }
                };
            }

            // 3. BROWSER REFRESH: Warn user about active downloads
            window.addEventListener('beforeunload', (e) => {
                if (this.activeDownloads.size > 0) {
                    e.preventDefault();
                    e.returnValue = 'Downloads in progress will be paused. Continue?';
                    return e.returnValue;
                }
            });

            // 4. PAGE VISIBILITY: Pause when tab is hidden for performance
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.activeDownloads.size > 0) {
                    console.log('[DownloadManager] Tab hidden - downloads continue in background');
                    // Note: We don't pause here as downloads should continue
                    // But on low memory devices, we might want to pause
                }
            });

            // 5. RECOVERY: Check for interrupted downloads on startup
            this.recoverInterruptedDownloads();
        }
    }

    /**
     * Recover downloads that were interrupted by browser refresh/crash
     */
    private async recoverInterruptedDownloads() {
        if (this.recoveryAttempted) return;
        this.recoveryAttempted = true;

        try {
            const db = await this.getDB();
            const allChapters = await db.getAll('chapters');

            // Find chapters that were in progress when interrupted
            const interrupted = allChapters.filter(ch =>
                ch.status === DownloadStatus.Downloading ||
                ch.status === DownloadStatus.FetchingMeta
            );

            if (interrupted.length > 0) {
                console.log(`[DownloadManager] Found ${interrupted.length} interrupted downloads`);

                // Mark them as pending so they can be resumed
                for (const chapter of interrupted) {
                    chapter.status = DownloadStatus.Pending;
                    chapter.lastUpdated = Date.now();
                    await db.put('chapters', chapter);
                }

                this.notifyListeners();

                // Don't auto-resume - let DownloadSafetyProvider prompt user
                // This avoids surprising the user with bandwidth usage
            }

            // Clean up orphaned pages (pages without parent chapters)
            await this.cleanupOrphanedPages();

        } catch (e) {
            console.error('[DownloadManager] Recovery failed:', e);
        }
    }

    /**
     * Resume downloads that were paused due to network loss
     */
    private async resumeInterruptedDownloads() {
        try {
            const db = await this.getDB();
            const chapters = await db.getAll('chapters');
            const paused = chapters.filter(ch => ch.status === DownloadStatus.Paused);

            if (paused.length > 0) {
                console.log(`[DownloadManager] Resuming ${paused.length} paused downloads`);
                for (const ch of paused) {
                    ch.status = DownloadStatus.Pending;
                    await db.put('chapters', ch);
                }
                this.notifyListeners();
                this.processQueue();
            }
        } catch (e) {
            console.error('[DownloadManager] Resume failed:', e);
        }
    }

    /**
     * Clean up pages that belong to deleted/failed chapters
     */
    private async cleanupOrphanedPages() {
        try {
            const db = await this.getDB();
            const tx = db.transaction(['chapters', 'pages'], 'readwrite');

            const chapterIds = new Set((await tx.objectStore('chapters').getAllKeys()) as string[]);

            let cursor = await tx.objectStore('pages').openCursor();
            let orphanedCount = 0;

            while (cursor) {
                const [chapterId] = cursor.key as [string, number];
                if (!chapterIds.has(chapterId)) {
                    await cursor.delete();
                    orphanedCount++;
                }
                cursor = await cursor.continue();
            }

            await tx.done;

            if (orphanedCount > 0) {
                console.log(`[DownloadManager] Cleaned up ${orphanedCount} orphaned pages`);
            }
        } catch (e) {
            console.error('[DownloadManager] Cleanup failed:', e);
        }
    }

    /**
     * Check if we can safely download (network + memory + storage)
     */
    async canDownload(): Promise<{ ok: boolean; reason?: string }> {
        // 1. Check network
        if (!this.isOnline) {
            return { ok: false, reason: 'No internet connection' };
        }

        // 2. Check mobile data
        if (this.isMobileData && this.settings.autoPauseOnMobile) {
            return { ok: false, reason: 'On mobile data (auto-pause enabled)' };
        }

        // 3. Check storage
        const estimate = await this.getStorageEstimate();
        if (estimate && estimate.usage / estimate.quota > 0.95) {
            return { ok: false, reason: 'Storage almost full (>95%)' };
        }

        // 4. Check memory pressure
        if (await this.isMemoryPressure()) {
            return { ok: false, reason: 'Device memory low' };
        }

        return { ok: true };
    }

    private checkNetwork() {
        const conn = navigator.connection;
        if (conn) {
            // Type can be 'cellular', or effectiveType might be '3g'/'4g'
            // 'cellular' is the most direct check if available
            this.isMobileData = conn.type === 'cellular';
        }
    }

    public updateSettings(newSettings: Partial<typeof this.settings>) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('download_settings', JSON.stringify(this.settings));

        // React to immediate changes
        if (this.settings.autoPauseOnMobile && this.isMobileData) {
            this.pauseAllDownloads();
        }
    }

    private async pauseAllDownloads() {
        const db = await this.getDB();
        const active = await db.getAll('chapters');
        const downloading = active.filter(d => d.status === DownloadStatus.Downloading || d.status === DownloadStatus.FetchingMeta);

        for (const job of downloading) {
            job.status = DownloadStatus.Paused;
            job.error = "Paused (Mobile Data)"; // Optional info
            await db.put('chapters', job);
            this.activeDownloads.delete(job.id);
        }
        this.notifyListeners();
    }

    private async getDB() {
        if (!this.dbPromise) throw new Error('IndexedDB not supported');
        return this.dbPromise;
    }

    // --- Public API ---

    async queueDownload(data: {
        id: string; // chapter composite ID
        mangaId: string;
        chapterId: string; // real chapter ID
        sourceId: string;
        mangaTitle: string;
        chapterTitle: string;
        cover: string;
    }) {
        const db = await this.getDB();

        const tx = db.transaction(['manga', 'chapters'], 'readwrite');
        const mangaStore = tx.objectStore('manga');
        const chapterStore = tx.objectStore('chapters');

        // 1. Upsert Manga Metadata
        await mangaStore.put({
            id: data.mangaId,
            title: data.mangaTitle,
            cover: data.cover,
            sourceId: data.sourceId,
            updatedAt: Date.now()
        });

        // 2. Check if chapter exists
        const existing = await chapterStore.get(data.id);
        if (existing && existing.status === DownloadStatus.Completed) {
            await tx.done;
            return;
        }

        const newChapter: ChapterMetadata = {
            id: data.id,
            mangaId: data.mangaId,
            chapterId: data.chapterId, // store the raw ID for queries
            title: data.chapterTitle,
            status: DownloadStatus.Pending,
            totalImages: 0,
            downloadedImages: 0,
            addedAt: Date.now(),
            lastUpdated: Date.now(),
            sourceId: data.sourceId // useful for retries
        };

        await chapterStore.put(newChapter);
        await tx.done;

        this.notifyListeners();
        this.processQueue();
    }

    async pauseDownload(id: string) {
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);
        if (chapter && chapter.status !== DownloadStatus.Completed) {
            chapter.status = DownloadStatus.Paused;
            await db.put('chapters', chapter);
            this.activeDownloads.delete(id);
            this.notifyListeners();
        }
    }

    async resumeDownload(id: string) {
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);
        if (chapter && chapter.status === DownloadStatus.Paused) {
            chapter.status = DownloadStatus.Pending;
            await db.put('chapters', chapter);
            this.notifyListeners();
            this.processQueue();
        }
    }

    /**
     * Queue multiple chapters for download (bulk download)
     * 
     * SAFEGUARDS:
     * 1. Size estimation before starting
     * 2. Memory pressure monitoring
     * 3. Storage quota check
     * 4. Sequential processing (one chapter at a time)
     * 5. Auto-pause on mobile data
     * 
     * @param chapters - Array of chapter data to download
     * @param options - Bulk download options
     * @returns Estimation data for user confirmation
     */
    async queueBulkDownload(
        chapters: Array<{
            id: string;
            mangaId: string;
            chapterId: string;
            sourceId: string;
            mangaTitle: string;
            chapterTitle: string;
            cover: string;
            estimatedPages?: number;
        }>,
        options: {
            skipConfirmation?: boolean;
            onProgress?: (completed: number, total: number, currentChapter: string) => void;
        } = {}
    ): Promise<{ queued: number; skipped: number; estimatedSizeMB: number }> {
        const db = await this.getDB();

        // 1. Pre-flight checks
        const storageEstimate = await this.getStorageEstimate();
        if (storageEstimate && storageEstimate.usage / storageEstimate.quota > 0.9) {
            throw new Error('Storage is over 90% full. Please free up space before bulk downloading.');
        }

        // 2. Filter out already downloaded chapters
        const toQueue: typeof chapters = [];
        let skipped = 0;

        for (const chapter of chapters) {
            const existing = await db.get('chapters', chapter.id);
            if (existing?.status === DownloadStatus.Completed) {
                skipped++;
            } else {
                toQueue.push(chapter);
            }
        }

        // 3. Estimate total size
        const AVG_PAGES_PER_CHAPTER = 25;
        const AVG_PAGE_SIZE_KB = 150;
        const totalPages = toQueue.reduce((sum, ch) => sum + (ch.estimatedPages || AVG_PAGES_PER_CHAPTER), 0);
        const estimatedSizeMB = (totalPages * AVG_PAGE_SIZE_KB) / 1024;

        // 4. Queue each chapter
        for (let i = 0; i < toQueue.length; i++) {
            const chapter = toQueue[i];

            // Check memory pressure before each queue
            if (await this.isMemoryPressure()) {
                console.warn('[BulkDownload] Memory pressure detected, pausing queue');
                await this.pauseAllDownloads();
                throw new Error(`Memory pressure detected after queuing ${i} chapters. Downloads paused.`);
            }

            await this.queueDownload({
                id: chapter.id,
                mangaId: chapter.mangaId,
                chapterId: chapter.chapterId,
                sourceId: chapter.sourceId,
                mangaTitle: chapter.mangaTitle,
                chapterTitle: chapter.chapterTitle,
                cover: chapter.cover
            });

            if (options.onProgress) {
                options.onProgress(i + 1, toQueue.length, chapter.chapterTitle);
            }
        }

        return {
            queued: toQueue.length,
            skipped,
            estimatedSizeMB: Math.round(estimatedSizeMB * 10) / 10
        };
    }

    /**
     * Queue all chapters of a manga for download
     */
    async downloadEntireManga(
        mangaId: string,
        mangaTitle: string,
        cover: string,
        sourceId: string,
        chapters: Array<{ id: string; title: string; estimatedPages?: number }>,
        options: {
            onProgress?: (completed: number, total: number, currentChapter: string) => void;
        } = {}
    ): Promise<{ queued: number; skipped: number; estimatedSizeMB: number }> {
        const chapterData = chapters.map(ch => ({
            id: `${mangaId}_${ch.id}`,
            mangaId,
            chapterId: ch.id,
            sourceId,
            mangaTitle,
            chapterTitle: ch.title,
            cover,
            estimatedPages: ch.estimatedPages
        }));

        return this.queueBulkDownload(chapterData, options);
    }

    /**
     * Check if browser is under memory pressure
     */
    private async isMemoryPressure(): Promise<boolean> {
        // Method 1: Check performance.memory (Chrome only)
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
                return true;
            }
        }

        // Method 2: Check storage quota usage
        const estimate = await this.getStorageEstimate();
        if (estimate && estimate.usage / estimate.quota > 0.95) {
            return true;
        }

        return false;
    }

    /**
     * Get bulk download status summary
     */
    async getBulkDownloadStatus(): Promise<{
        pending: number;
        downloading: number;
        completed: number;
        failed: number;
        paused: number;
        totalProgress: number;
    }> {
        const downloads = await this.getAllDownloads();

        const counts = {
            pending: 0,
            downloading: 0,
            completed: 0,
            failed: 0,
            paused: 0
        };

        let totalPages = 0;
        let downloadedPages = 0;

        for (const dl of downloads) {
            counts[dl.status as keyof typeof counts]++;
            totalPages += dl.totalImages || 0;
            downloadedPages += dl.downloadedImages || 0;
        }

        return {
            ...counts,
            totalProgress: totalPages > 0 ? Math.round((downloadedPages / totalPages) * 100) : 0
        };
    }

    async deleteDownload(id: string) { // This ID is the composite ID (mangaId_chapterId)
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);

        if (chapter) {
            const tx = db.transaction(['chapters', 'pages'], 'readwrite');

            // 1. Delete Chapter Metadata
            await tx.objectStore('chapters').delete(id);

            // 2. Delete Pages
            const targetChapterCompositeId = id;

            let cursor = await tx.objectStore('pages').index('by_chapterId').openKeyCursor(IDBKeyRange.only(targetChapterCompositeId));

            while (cursor) {
                await tx.objectStore('pages').delete(cursor.primaryKey);
                cursor = await cursor.continue();
            }

            await tx.done;
            this.activeDownloads.delete(id);
            this.notifyListeners();
        }
    }

    // Join Manga + Chapter to create the UI View Model
    async getDownload(id: string): Promise<ChapterDownload | undefined> {
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);
        if (!chapter) return undefined;

        const manga = await db.get('manga', chapter.mangaId);
        if (!manga) return undefined;

        return {
            ...chapter,
            mangaTitle: manga.title,
            cover: manga.cover,
            progress: chapter.totalImages > 0 ? Math.round((chapter.downloadedImages / chapter.totalImages) * 100) : 0
        };
    }

    async getAllDownloads(): Promise<ChapterDownload[]> {
        const db = await this.getDB();
        const chapters = await db.getAll('chapters');
        const mangaList = await db.getAll('manga');

        // Create lookup for performance O(1)
        const mangaMap = new Map(mangaList.map(m => [m.id, m]));

        return chapters.map(c => {
            const m = mangaMap.get(c.mangaId);
            return {
                ...c,
                mangaTitle: m ? m.title : 'Unknown Manga',
                cover: m ? m.cover : '',
                progress: c.totalImages > 0 ? Math.round((c.downloadedImages / c.totalImages) * 100) : 0
            };
        }).sort((a, b) => b.addedAt - a.addedAt);
    }

    async getChapterImage(downloadId: string, pageIndex: number): Promise<Blob | undefined> {
        const db = await this.getDB();
        const page = await db.get('pages', [downloadId, pageIndex]);
        return page?.blob;
    }

    subscribe(listener: (downloads: ChapterDownload[]) => void) {
        this.listeners.push(listener);
        this.getAllDownloads().then(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // --- Internal Logic ---

    private async notifyListeners() {
        const all = await this.getAllDownloads();
        this.listeners.forEach(l => l(all));
    }

    private async processQueue() {
        if (this.activeDownloads.size > 0) return;

        const db = await this.getDB();
        const all = await db.getAll('chapters');
        const pending = all.find(d => d.status === DownloadStatus.Pending || d.status === DownloadStatus.FetchingMeta || d.status === DownloadStatus.Downloading);

        if (!pending) return;

        this.activeDownloads.add(pending.id);

        try {
            // Check Quota
            if (this.settings.warnStorageQuota && navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate.quota && estimate.usage) {
                    const usagePercent = estimate.usage / estimate.quota;
                    // Warn at 90%? Pause?
                    // Let's being conservative and pause/error if > 95%
                    if (usagePercent > 0.95) {
                        throw new Error("Storage Full (95% Quota Reached)");
                    }
                }
            }

            await this.executeDownload(pending);
        } catch (error: any) {
            console.error('Download failed', error);
            const fresh = await db.get('chapters', pending.id);
            if (fresh) {
                fresh.status = DownloadStatus.Failed;
                fresh.error = error.message;
                await db.put('chapters', fresh);
                this.notifyListeners();
            }
        } finally {
            this.activeDownloads.delete(pending.id);
            this.processQueue();
        }
    }

    /**
     * Execute chapter download with enhanced retry strategy
     * 
     * RETRY STRATEGY:
     * 1. Per-page retry: 3 attempts with exponential backoff (1s, 2s, 4s)
     * 2. Source failover: If page fails 3x, switch to alternate source
     * 3. Source reliability: Track failing sources to deprioritize them
     * 4. Seamless continuation: Resume from last successful page
     */
    private async executeDownload(job: ChapterMetadata): Promise<void> {
        const db = await this.getDB();

        // Track failing sources for this session
        const failedSources = new Set<string>();

        // 1. Fetch Metadata if needed
        if (job.totalImages === 0) {
            job.status = DownloadStatus.FetchingMeta;
            await db.put('chapters', job);
            this.notifyListeners();

            try {
                const images = await getChapterImagesAction(job.chapterId, job.sourceId);
                if (!images || images.length === 0) throw new Error('No images found');

                job.totalImages = images.length;
                job.status = DownloadStatus.Downloading;
                job.imageUrls = images;
                await db.put('chapters', job);

            } catch (e: unknown) {
                // Mark source as failed for metadata fetch
                failedSources.add(job.sourceId);
                this.markSourceFailed(job.sourceId);

                // Try alternate source for metadata
                const manga = await db.get('manga', job.mangaId);
                if (manga) {
                    const alt = await this.findAlternateSource(manga.title, job.title, failedSources);
                    if (alt) {
                        console.log(`[DownloadManager] Switching to ${alt.sourceId} for metadata`);
                        job.sourceId = alt.sourceId;
                        job.chapterId = alt.chapterId;
                        job.imageUrls = alt.imageUrls;
                        job.totalImages = alt.imageUrls.length;
                        job.status = DownloadStatus.Downloading;
                        await db.put('chapters', job);
                    } else {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }
            this.notifyListeners();
        }

        // Reload job to get URLs
        const freshJob = await db.get('chapters', job.id);
        if (!freshJob || !freshJob.imageUrls) throw new Error('Download meta lost');

        freshJob.status = DownloadStatus.Downloading;
        await db.put('chapters', freshJob);

        // 2. Download Images with enhanced retry
        const urls = freshJob.imageUrls;
        const MAX_PAGE_RETRIES = 3;
        const MAX_SOURCE_SWITCHES = 2;
        let sourceSwitchCount = 0;

        for (let i = 0; i < urls.length; i++) {
            // Check if page already exists
            const existingPage = await db.get('pages', [freshJob.id, i]);
            if (existingPage && existingPage.blob) continue;

            // Check pause status
            const current = await db.get('chapters', freshJob.id);
            if (current && current.status === DownloadStatus.Paused) return;

            let pageSuccess = false;
            let lastError: Error | null = null;

            // Per-page retry loop with exponential backoff
            for (let attempt = 0; attempt < MAX_PAGE_RETRIES && !pageSuccess; attempt++) {
                try {
                    // Exponential backoff: 0ms, 1000ms, 2000ms
                    if (attempt > 0) {
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        console.log(`[DownloadManager] Retry ${attempt}/${MAX_PAGE_RETRIES} for page ${i + 1}, waiting ${delay}ms`);
                        await new Promise(r => setTimeout(r, delay));
                    }

                    const blob = await this.fetchImage(urls[i]);

                    await db.put('pages', {
                        chapterId: freshJob.id,
                        pageIndex: i,
                        blob,
                        url: urls[i],
                        mimeType: blob.type
                    });

                    freshJob.downloadedImages = (await db.getAllKeys('pages', IDBKeyRange.bound([freshJob.id, 0], [freshJob.id, Infinity]))).length;
                    await db.put('chapters', freshJob);
                    this.notifyListeners();

                    pageSuccess = true;

                    // Track success for source reliability
                    this.markSourceSuccess(freshJob.sourceId);

                } catch (e: any) {
                    lastError = e;
                    console.warn(`[DownloadManager] Page ${i + 1} attempt ${attempt + 1} failed:`, e.message);
                }
            }

            // If page still failed after retries, try source switch
            if (!pageSuccess && sourceSwitchCount < MAX_SOURCE_SWITCHES) {
                console.log(`[DownloadManager] Page ${i + 1} failed after ${MAX_PAGE_RETRIES} retries, attempting source switch...`);

                // Mark current source as failed
                failedSources.add(freshJob.sourceId);
                this.markSourceFailed(freshJob.sourceId);

                const manga = await db.get('manga', freshJob.mangaId);
                if (manga) {
                    try {
                        const alt = await this.findAlternateSource(manga.title, freshJob.title, failedSources);

                        if (alt) {
                            console.log(`[DownloadManager] Healed! Switching to ${alt.sourceId}`);
                            sourceSwitchCount++;

                            // Update job with new source
                            freshJob.sourceId = alt.sourceId;
                            freshJob.imageUrls = alt.imageUrls;
                            freshJob.retryCount = (freshJob.retryCount || 0) + 1;

                            await db.put('chapters', freshJob);

                            // Restart download with new URLs (recursive call)
                            return this.executeDownload(freshJob);
                        }
                    } catch (healError) {
                        console.error('[DownloadManager] Source switch failed:', healError);
                    }
                }

                // If we couldn't switch sources, throw the last error
                throw lastError || new Error(`Page ${i + 1} failed after all retries`);
            }

            if (!pageSuccess) {
                throw lastError || new Error(`Page ${i + 1} failed`);
            }
        }

        // 3. Completion Check
        const finalCount = (await db.getAllKeys('pages', IDBKeyRange.bound([freshJob.id, 0], [freshJob.id, Infinity]))).length;
        if (finalCount === freshJob.totalImages) {
            freshJob.status = DownloadStatus.Completed;
            freshJob.downloadedImages = finalCount;
            delete freshJob.imageUrls; // Clean up
            await db.put('chapters', freshJob);
            this.notifyListeners();
        }
    }

    /**
     * Find alternate source for a chapter, excluding failed sources
     */
    private async findAlternateSource(
        mangaTitle: string,
        chapterTitle: string,
        excludeSources: Set<string>
    ): Promise<{ sourceId: string; chapterId: string; imageUrls: string[] } | null> {
        try {
            const result = await findAlternativeChapterAction(
                mangaTitle,
                chapterTitle,
                Array.from(excludeSources).join(',') // Pass all failed sources
            );
            return result;
        } catch (e) {
            console.error('[DownloadManager] findAlternateSource error:', e);
            return null;
        }
    }

    /**
     * Track source failure for reliability scoring
     */
    private markSourceFailed(sourceId: string) {
        try {
            const key = `source_reliability_${sourceId}`;
            const data = JSON.parse(localStorage.getItem(key) || '{"success":0,"failure":0}');
            data.failure++;
            data.lastFailed = Date.now();
            localStorage.setItem(key, JSON.stringify(data));
        } catch { }
    }

    /**
     * Track source success for reliability scoring
     */
    private markSourceSuccess(sourceId: string) {
        try {
            const key = `source_reliability_${sourceId}`;
            const data = JSON.parse(localStorage.getItem(key) || '{"success":0,"failure":0}');
            data.success++;
            data.lastSuccess = Date.now();
            localStorage.setItem(key, JSON.stringify(data));
        } catch { }
    }

    /**
     * Get source reliability score (higher = more reliable)
     */
    getSourceReliability(sourceId: string): number {
        try {
            const key = `source_reliability_${sourceId}`;
            const data = JSON.parse(localStorage.getItem(key) || '{"success":0,"failure":0}');
            if (data.success + data.failure === 0) return 0.5; // Unknown
            return data.success / (data.success + data.failure);
        } catch {
            return 0.5;
        }
    }

    private async fetchImage(url: string): Promise<Blob> {
        let fetchUrl = url;

        // Quality Handling
        // If we were using an image resizing proxy like wsrv.nl, we could append params.
        // Assuming we are proxied or can append params safely:
        // wsrv.nl supports ?q= and ?w=

        if (this.settings.imageQuality !== 'high') {
            // Heuristic: If it's a proxy url, modify query. If direct, try appending.
            // Given our previous use of `getProxyUrl` (helper), we assume raw URLs here.
            // If we route via `wsrv.nl` explicitly:
            const isProxied = url.includes('wsrv.nl');
            if (isProxied) {
                // Replace existing params? Or Append? 
                // Simple implementation:
                const quality = this.settings.imageQuality === 'medium' ? 60 : 30;
                fetchUrl = `${url}&q=${quality}`;
            }
        }

        // Fetch with timeout
        const response = await this.fetchWithTimeout(fetchUrl, {
            mode: 'cors',
            referrerPolicy: 'no-referrer'
        }, 30000); // 30 second timeout per image

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();

        // Validate blob
        if (!this.validateBlob(blob)) {
            throw new Error('Invalid or corrupted image data');
        }

        return blob;
    }

    /**
     * Fetch with timeout to handle hung connections
     */
    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeoutMs: number
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        } catch (e: any) {
            if (e.name === 'AbortError') {
                throw new Error(`Timeout after ${timeoutMs / 1000}s`);
            }
            throw e;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Validate downloaded blob to detect corruption
     */
    private validateBlob(blob: Blob): boolean {
        // Check minimum size (empty or nearly empty = corrupted)
        if (blob.size < 100) {
            console.warn('[DownloadManager] Blob too small:', blob.size);
            return false;
        }

        // Check MIME type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(blob.type) && blob.type !== '') {
            console.warn('[DownloadManager] Invalid MIME type:', blob.type);
            return false;
        }

        // Check for reasonable max size (50MB per image is suspicious)
        if (blob.size > 50 * 1024 * 1024) {
            console.warn('[DownloadManager] Blob suspiciously large:', blob.size);
            return false;
        }

        return true;
    }

    /**
     * Check if connection is slow (2G/3G)
     */
    isSlowConnection(): boolean {
        if (navigator.connection) {
            const conn = navigator.connection as NetworkInformation;
            // effectiveType can be 'slow-2g', '2g', '3g', '4g'
            if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
                return true;
            }
            // saveData mode is user preference for reduced data
            if (conn.saveData) {
                return true;
            }
        }
        return false;
    }

    /**
     * Verify download integrity after completion
     */
    async verifyDownloadIntegrity(id: string): Promise<{ valid: boolean; missing: number[]; corrupted: number[] }> {
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);

        if (!chapter) {
            return { valid: false, missing: [], corrupted: [] };
        }

        const missing: number[] = [];
        const corrupted: number[] = [];

        for (let i = 0; i < chapter.totalImages; i++) {
            const page = await db.get('pages', [id, i]);

            if (!page || !page.blob) {
                missing.push(i);
            } else if (!this.validateBlob(page.blob)) {
                corrupted.push(i);
            }
        }

        return {
            valid: missing.length === 0 && corrupted.length === 0,
            missing,
            corrupted
        };
    }

    /**
     * Repair a download by re-fetching missing/corrupted pages
     */
    async repairDownload(id: string): Promise<void> {
        const integrity = await this.verifyDownloadIntegrity(id);

        if (integrity.valid) {
            console.log('[DownloadManager] Download is already valid');
            return;
        }

        const db = await this.getDB();
        const chapter = await db.get('chapters', id);

        if (!chapter || !chapter.imageUrls) {
            throw new Error('Cannot repair: chapter metadata missing');
        }

        const pagesToRepair = [...new Set([...integrity.missing, ...integrity.corrupted])];
        console.log(`[DownloadManager] Repairing ${pagesToRepair.length} pages`);

        for (const pageIndex of pagesToRepair) {
            try {
                const blob = await this.fetchImage(chapter.imageUrls[pageIndex]);
                await db.put('pages', {
                    chapterId: id,
                    pageIndex,
                    blob,
                    url: chapter.imageUrls[pageIndex],
                    mimeType: blob.type
                });
            } catch (e) {
                console.error(`[DownloadManager] Failed to repair page ${pageIndex}:`, e);
            }
        }

        // Update download count
        const finalCount = (await db.getAllKeys('pages', IDBKeyRange.bound([id, 0], [id, Infinity]))).length;
        chapter.downloadedImages = finalCount;

        if (finalCount === chapter.totalImages) {
            chapter.status = DownloadStatus.Completed;
        }

        await db.put('chapters', chapter);
        this.notifyListeners();
    }
    /**
     * Export chapter as ZIP or CBZ with memory-safe batching
     * 
     * @param id - Chapter composite ID (mangaId_chapterId)
     * @param options - Export options
     * @returns Blob containing the archive
     * 
     * Performance Optimizations:
     * 1. Sequential page loading (memory safe)
     * 2. Streaming compression
     * 3. Proper file ordering (001.jpg, 002.jpg)
     * 4. CBZ ComicInfo.xml for reader compatibility
     * 
     * Limits:
     * - ~500 pages max recommended (browser memory)
     * - ~1GB max file size (blob limit varies by browser)
     */
    async exportChapter(
        id: string,
        options: {
            format?: 'zip' | 'cbz';
            onProgress?: (progress: number) => void;
        } = {}
    ): Promise<Blob> {
        const { format = 'cbz', onProgress } = options;
        const db = await this.getDB();
        const chapter = await db.get('chapters', id);

        if (!chapter || chapter.status !== DownloadStatus.Completed) {
            throw new Error('Chapter not ready for export');
        }

        const manga = await db.get('manga', chapter.mangaId);
        if (!manga) throw new Error('Manga metadata missing');

        // Dynamic import for code-splitting
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Sanitize names for filesystem safety
        // Remove: < > : " / \ | ? * and control characters
        const sanitize = (str: string) => str
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100); // Limit length

        const safeMangaTitle = sanitize(manga.title);
        const safeChapterTitle = sanitize(chapter.title);

        // Create folder structure: Manga/Chapter/
        const folder = zip.folder(safeMangaTitle)?.folder(safeChapterTitle);
        if (!folder) throw new Error('Failed to create zip structure');

        // Add ComicInfo.xml for CBZ format (reader metadata)
        if (format === 'cbz') {
            const comicInfo = this.generateComicInfoXml({
                title: chapter.title,
                series: manga.title,
                pageCount: chapter.totalImages
            });
            folder.file('ComicInfo.xml', comicInfo);
        }

        // Memory-safe sequential page loading
        // Batch size could be increased for faster processing but uses more RAM
        const BATCH_SIZE = 10; // Process 10 pages at a time
        const totalPages = chapter.totalImages;

        for (let batchStart = 0; batchStart < totalPages; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalPages);

            // Load batch of pages in parallel (safe batch size)
            const batchPromises = [];
            for (let i = batchStart; i < batchEnd; i++) {
                batchPromises.push(db.get('pages', [id, i]));
            }

            const pages = await Promise.all(batchPromises);

            // Add pages to zip
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const pageIndex = batchStart + i;

                if (page?.blob) {
                    // Proper ordering: 001.jpg, 002.jpg, ... 999.jpg
                    const ext = page.mimeType === 'image/png' ? 'png'
                        : page.mimeType === 'image/webp' ? 'webp'
                            : 'jpg';
                    const filename = `${(pageIndex + 1).toString().padStart(3, '0')}.${ext}`;
                    folder.file(filename, page.blob);
                }
            }

            // Report progress
            if (onProgress) {
                onProgress(Math.round((batchEnd / totalPages) * 100));
            }

            // Allow GC to clean up between batches
            await new Promise(r => setTimeout(r, 0));
        }

        // Generate final archive with streaming compression
        return await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }, // Balance speed/size
            streamFiles: true // Memory efficient for large files
        }, (metadata) => {
            // JSZip progress callback during compression
            if (onProgress && metadata.percent) {
                // Map 0-100 to second half of progress (50-100)
                onProgress(50 + Math.round(metadata.percent / 2));
            }
        });
    }

    /**
     * Generate ComicInfo.xml for CBZ format
     * Follows ComicRack specification for maximum reader compatibility
     */
    private generateComicInfoXml(info: {
        title: string;
        series: string;
        pageCount: number;
        number?: string;
        volume?: string;
        summary?: string;
    }): string {
        const escapeXml = (str: string) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        return `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
           xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <Title>${escapeXml(info.title)}</Title>
    <Series>${escapeXml(info.series)}</Series>
    ${info.number ? `<Number>${escapeXml(info.number)}</Number>` : ''}
    ${info.volume ? `<Volume>${escapeXml(info.volume)}</Volume>` : ''}
    <PageCount>${info.pageCount}</PageCount>
    ${info.summary ? `<Summary>${escapeXml(info.summary)}</Summary>` : ''}
    <Manga>Yes</Manga>
</ComicInfo>`;
    }
    async getStorageEstimate(): Promise<{ usage: number; quota: number } | undefined> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return undefined;
    }

    async clearAllDownloads() {
        const db = await this.getDB();
        const tx = db.transaction(['manga', 'chapters', 'pages'], 'readwrite');

        await tx.objectStore('manga').clear();
        await tx.objectStore('chapters').clear();
        await tx.objectStore('pages').clear();

        await tx.done;
        this.activeDownloads.clear();
        this.notifyListeners();
    }
}

export const DownloadManager = new DownloadManagerService();
