import { MangaDexSource } from './sources/mangadex';
import { MangakakalotSource } from './sources/mangakakalot';
import { MangaSource, Manga, MangaDetails } from './types';

export type { MangaSource, Manga, MangaDetails };


// Registry of available sources
const sources: Record<string, MangaSource> = {
    [MangaDexSource.id]: MangaDexSource,
    [MangakakalotSource.id]: MangakakalotSource,
};

export const ScraperEngine = {
    async search(query: string): Promise<Manga[]> {
        // Run searches in parallel
        const promises = Object.values(sources).map(source => source.search(query));
        const results = await Promise.all(promises);

        // Flatten and merge results
        // TODO: Implement "Best Match" logic (e.g., fuzzy matching titles to group them)
        // For now, just return all mixed results
        return results.flat();
    },

    async getMangaDetails(mangaId: string, sourceId?: string): Promise<MangaDetails | null> {
        // If sourceId is provided, use that specific source
        if (sourceId && sources[sourceId]) {
            return sources[sourceId].getMangaDetails(mangaId);
        }

        // If no sourceId, we can't really guess which source the ID belongs to 
        // unless the ID format is distinct or we try all (bad idea for details).
        // BUT, our "Manga" object from search includes "sourceId".
        // So the frontend SHOULD pass the sourceId.

        // Fallback: Try MangaDex as default if no source provided (legacy support)
        return sources['mangadex'].getMangaDetails(mangaId);
    },

    async getChapterImages(chapterId: string, sourceId?: string): Promise<string[]> {
        if (sourceId && sources[sourceId]) {
            return sources[sourceId].getChapterImages(chapterId);
        }

        // Handling for legacy calls that might not pass sourceId
        // If chapterId is a URL (Mangakakalot), try Mangakakalot
        if (chapterId.startsWith('http')) {
            return sources['mangakakalot'].getChapterImages(chapterId);
        }

        return sources['mangadex'].getChapterImages(chapterId);
    }
};

// Re-export MangaDex as a direct export for backward compatibility relative to the new Engine usage
// But the old file was `MangaDex` object. 
// We should probably export a `MangaDex` object that proxies to the source to avoid breaking existing imports too much,
// OR update the imports in the app.
export const MangaDex = {
    search: (q: string) => sources['mangadex'].search(q),
    getMangaDetails: (id: string) => sources['mangadex'].getMangaDetails(id),
    getChapterImages: (id: string) => sources['mangadex'].getChapterImages(id),
};
