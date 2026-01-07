"use client";

import { resolveMappingAction } from '@/app/actions';
import { getMediaById } from '@/lib/anilist';
import { ScraperEngine } from '@/lib/scraper';
import { saveFile, getFileTypeConfig } from '@/lib/fileSaver';

export interface ExternalDownloadOptions {
    format?: 'zip' | 'cbz';
    onProgress?: (progress: number, status: string) => void;
}

export class ExternalDownloader {
    /**
     * Downloads a chapter directly to the system as a ZIP/CBZ archive
     * using ONLY the AniList Manga ID.
     */
    static async downloadChapter(
        anilistId: string,
        chapterId: string,
        chapterTitle: string,
        options: ExternalDownloadOptions = {}
    ): Promise<boolean> {
        const { format = 'cbz', onProgress } = options;

        try {
            // 1. Fetch AniList Metadata
            onProgress?.(5, "Fetching AniList metadata...");
            const media = await getMediaById(parseInt(anilistId));
            if (!media) throw new Error("Manga not found on AniList.");

            const mangaTitle = media.title.english || media.title.romaji || "Manga";

            // 2. Resolve Source via Mapping
            onProgress?.(10, "Resolving source mapping...");
            // Use an object for title resolution as expected by resolveMappingAction
            const mapping = await resolveMappingAction(anilistId, {
                english: media.title.english || '',
                romaji: media.title.romaji || '',
                native: media.title.native || ''
            });

            if (!mapping || !mapping.mangaId) {
                throw new Error("Could not resolve a mapping for this manga.");
            }

            // 3. Fetch Chapter Images
            onProgress?.(20, "Fetching image URLs...");
            const images = await ScraperEngine.getChapterImages(mapping.sourceId, chapterId);

            if (!images || images.length === 0) {
                throw new Error("No images found for this chapter.");
            }

            // 4. Download and Zip on-the-fly
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const folder = zip.folder(this.sanitize(mangaTitle))?.folder(this.sanitize(chapterTitle));

            if (!folder) throw new Error("Failed to create archive structure.");

            const total = images.length;
            for (let i = 0; i < total; i++) {
                const stepProgress = 20 + Math.round((i / total) * 60);
                onProgress?.(stepProgress, `Downloading page ${i + 1}/${total}...`);

                const response = await fetch(images[i]);
                const blob = await response.blob();

                const ext = blob.type.split('/')[1] || 'jpg';
                const filename = `${(i + 1).toString().padStart(3, '0')}.${ext}`;
                folder.file(filename, blob);
            }

            // 5. Generate and Save
            onProgress?.(90, "Generating archive...");
            const archiveBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const fileName = `${this.sanitize(mangaTitle)} - ${this.sanitize(chapterTitle)}.${format}`;
            const typeConfig = getFileTypeConfig(format);

            onProgress?.(100, "Saving to system...");
            return await saveFile(archiveBlob, {
                filename: fileName,
                ...typeConfig
            });

        } catch (error: any) {
            console.error("[ExternalDownloader] Failed:", error);
            throw error;
        }
    }

    private static sanitize(str: string): string {
        return str
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
    }
}
