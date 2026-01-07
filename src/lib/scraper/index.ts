import { MangaDexSource } from './sources/mangadex';
import { MangakakalotSource } from './sources/mangakakalot';
import { MangaBuddySource } from './sources/mangabuddy';
import { WeebDexSource } from './sources/weebdex';
import { MangaParkSource } from './sources/mangapark';
import { MangaSource, Manga, MangaDetails } from './types';

export type { MangaSource, Manga, MangaDetails };


// Registry of available sources
const sources: Record<string, MangaSource> = {
    [MangaDexSource.id]: MangaDexSource,
    [MangakakalotSource.id]: MangakakalotSource,
    [MangaBuddySource.id]: MangaBuddySource,
    [WeebDexSource.id]: WeebDexSource,
    [MangaParkSource.id]: MangaParkSource,
};

// Helper to calculate similarity score
const calculateScore = (manga: Manga, query: string): number => {
    let score = 0;
    const q = query.toLowerCase().trim();
    const t = manga.title.toLowerCase().trim();

    if (t === q) score += 10;
    else if (t.includes(q)) score += 5;

    if (manga.cover && manga.cover.startsWith('http')) score += 2;

    // Source reliability bonus
    if (manga.sourceId === 'mangadex') score += 3;
    if (manga.sourceId === 'mangabuddy') score += 1;

    return score;
};

export const ScraperEngine = {
    async search(query: string, sourceId?: string): Promise<Manga[]> {
        // If a specific source is requested
        if (sourceId && sources[sourceId]) {
            return sources[sourceId].search(query);
        }

        // Run searches in parallel
        // We prioritize faster/reliable sources first in the Promise.all check if we wanted fail-fast, 
        // but here we wait for all settled to get maximum results.
        const promises = Object.values(sources).map(source =>
            source.search(query).catch(e => {
                console.warn(`[Scraper] ${source.name} search failed:`, e.message);
                return [] as Manga[];
            })
        );

        const results = await Promise.all(promises);
        return results.flat();
    },

    async findBestManga(query: string): Promise<Manga | null> {
        const results = await this.search(query);
        if (results.length === 0) return null;

        // Sort by score
        results.sort((a, b) => calculateScore(b, query) - calculateScore(a, query));

        return results[0];
    },

    async getMangaDetails(mangaId: string, sourceId?: string): Promise<MangaDetails | null> {
        // 1. Try specific source if provided
        if (sourceId && sources[sourceId]) {
            const data = await sources[sourceId].getMangaDetails(mangaId);
            if (data) return data;
        }

        // 2. Fallback: If no source provided OR specific source failed, 
        // we might need to "search" for this manga ID or title to find it elsewhere.
        // However, ID collisions are possible across sources, so just using ID is risky.
        // But if we assume the ID is unique enough or we just try default sources:

        // Try MangaBuddy as primary fallback (usually reliable for various content)
        if (sources['mangabuddy']) {
            const data = await sources['mangabuddy'].getMangaDetails(mangaId);
            if (data) return data;
        }

        // Try MangaDex
        if (sources['mangadex']) {
            const data = await sources['mangadex'].getMangaDetails(mangaId);
            if (data) return data;
        }

        return null;
    },

    async getChapterImages(chapterId: string, sourceId?: string): Promise<string[]> {
        if (sourceId && sources[sourceId]) {
            const images = await sources[sourceId].getChapterImages(chapterId);
            if (images.length > 0) return images;
        }

        // HEURISTIC FALLBACKS if sourceId missing or failed
        // Try to guess source from ID structure
        if (chapterId.startsWith('http')) {
            if (chapterId.includes('mangakakalot') || chapterId.includes('manganato')) {
                return sources['mangakakalot'].getChapterImages(chapterId);
            }
            if (chapterId.includes('mangabuddy')) {
                return sources['mangabuddy'].getChapterImages(chapterId);
            }
        }

        // Fallback chain
        const fallbackSources = ['mangabuddy', 'mangadex', 'mangakakalot'];
        for (const src of fallbackSources) {
            if (sources[src] && src !== sourceId) {
                const images = await sources[src].getChapterImages(chapterId);
                if (images.length > 0) return images;
            }
        }

        return [];
    }
};

export const MangaDex = {
    search: (q: string) => sources['mangadex'].search(q),
    getMangaDetails: (id: string) => sources['mangadex'].getMangaDetails(id),
    getChapterImages: (id: string) => sources['mangadex'].getChapterImages(id),
};
