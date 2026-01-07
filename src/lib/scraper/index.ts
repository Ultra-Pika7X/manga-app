import { MangakakalotSource } from './sources/mangakakalot';
import { MangaBuddySource } from './sources/mangabuddy';
import { WeebDexSource } from './sources/weebdex';
import { MangaDexSource } from './sources/mangadex';
import { ComickSource } from './sources/comick';
import { MangaReaderSource } from './sources/mangareader';
import { MangaHereSource } from './sources/mangahere';
import { ReadMangaSource } from './sources/readmanga';
import { MangaSource, Manga, MangaDetails } from './types';
import { validateImageSet } from './validator';
import { compareTitles } from '../similarity';

export type { MangaSource, Manga, MangaDetails };

// Source health tracking (in-memory for current session)
const sourceHealth: Record<string, { success: number; failure: number; lastFail: number }> = {};

function trackSourceResult(sourceId: string, success: boolean) {
    if (!sourceHealth[sourceId]) sourceHealth[sourceId] = { success: 0, failure: 0, lastFail: 0 };
    if (success) sourceHealth[sourceId].success++;
    else {
        sourceHealth[sourceId].failure++;
        sourceHealth[sourceId].lastFail = Date.now();
    }
}

function getSourcePriority(sourceId: string): number {
    const h = sourceHealth[sourceId];
    if (!h || (h.success + h.failure) === 0) return 50; // Unknown
    // Penalize recently failed sources
    const recencyPenalty = (Date.now() - h.lastFail < 60000) ? 20 : 0;
    return Math.round((h.success / (h.success + h.failure)) * 100) - recencyPenalty;
}


const sources: Record<string, MangaSource> = {
    [MangakakalotSource.id]: MangakakalotSource,
    [MangaBuddySource.id]: MangaBuddySource,
    [WeebDexSource.id]: WeebDexSource,
    [MangaDexSource.id]: MangaDexSource,
    [ComickSource.id]: ComickSource,
    [MangaReaderSource.id]: MangaReaderSource,
    [MangaHereSource.id]: MangaHereSource,
    [ReadMangaSource.id]: ReadMangaSource,
};

// Helper to calculate similarity score
const calculateScore = (manga: Manga, query: string): number => {
    let score = 0;
    const q = query.toLowerCase().trim();
    const t = manga.title.toLowerCase().trim();

    // Exact match
    if (t === q) score += 100;
    // Starts with query
    else if (t.startsWith(q)) score += 50;
    // Includes query
    else if (t.includes(q)) score += 20;

    // Word match bonus
    const queryWords = q.split(/\s+/).filter(w => w.length > 2);
    const titleWords = t.split(/\s+/);
    const matchingWords = queryWords.filter(word => titleWords.includes(word));
    score += matchingWords.length * 10;

    // Alternate Title check
    if (manga.altTitles) {
        const alt = manga.altTitles.toLowerCase();
        if (alt.includes(q)) score += 30;
        const altWords = alt.split(/[,;|]/).map(w => w.trim());
        if (altWords.some(w => w.includes(q))) score += 20;
    }

    // Quality signals
    if (manga.cover && manga.cover.startsWith('http')) score += 5;
    if (manga.status && manga.status !== 'Unknown') score += 5;

    // Heuristic: If source returned this, it's likely relevant even if title looks different
    score += 15;

    // Source reliability (Seanime-inspired prioritization)
    if (manga.sourceId === 'mangadex') score += 20;
    if (manga.sourceId === 'comick') score += 18;
    if (manga.sourceId === 'mangareader') score += 15;
    if (manga.sourceId === 'mangabuddy') score += 10;
    if (manga.sourceId === 'mangahere') score += 8;
    if (manga.sourceId === 'readmanga') score += 7;
    if (manga.sourceId === 'mangakakalot') score += 5;

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

    /**
     * POWER SEARCH: Searches ALL sources in parallel and returns the best match using fuzzy scoring.
     */
    async powerSearch(query: string): Promise<Manga | null> {
        const allSources = Object.values(sources);

        // Race all sources simultaneously
        const searchPromises = allSources.map(source =>
            source.search(query)
                .then(results => results.map(r => ({ ...r, sourceId: source.id })))
                .catch(() => [] as Manga[])
        );

        const allResults = (await Promise.all(searchPromises)).flat();
        if (allResults.length === 0) return null;

        // Fuzzy score all results
        let bestMatch: Manga | null = null;
        let bestScore = 0;

        for (const manga of allResults) {
            const fuzzyScore = compareTitles(query, manga.title);
            const healthBonus = getSourcePriority(manga.sourceId) / 100;
            const combinedScore = fuzzyScore * 0.8 + healthBonus * 0.2;

            if (combinedScore > bestScore) {
                bestScore = combinedScore;
                bestMatch = manga;
            }
        }

        return bestMatch;
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

        return null;
    },


    async getChapterImages(chapterId: string, sourceId?: string): Promise<string[]> {
        // 1. Try specific source
        if (sourceId && sources[sourceId]) {
            try {
                const images = await sources[sourceId].getChapterImages(chapterId);
                const validation = validateImageSet(images);
                if (validation.isValid) return images;
            } catch (e) {
                console.warn(`[Scraper] Source ${sourceId} failed for ${chapterId}:`, e.message);
            }
        }

        // 2. Heuristic ID matching (if chapterId is a URL)
        if (chapterId.startsWith('http')) {
            for (const source of Object.values(sources)) {
                if (chapterId.includes(source.id) || (source.id === 'mangakakalot' && chapterId.includes('manganato'))) {
                    try {
                        const images = await source.getChapterImages(chapterId);
                        if (validateImageSet(images).isValid) return images;
                    } catch (e) { }
                }
            }
        }

        return [];
    },

    /**
     * Tries multiple sources to find the requested chapter images.
     * Use this for "Silent Fallback".
     */
    async getChapterImagesAuto(
        mangaTitle: string,
        chapterTitle: string,
        preferredSourceId?: string,
        excludedSourceIds: string[] = [], // New: support for explicit exclusions
        mangaIdMap?: Record<string, string> // sourceId -> mangaId mapping
    ): Promise<{ sourceId: string; mangaId: string; chapterId: string; images: string[] } | null> {

        // Priority order for sources
        const priorityOrder = [
            'mangadex',
            'comick',
            'mangareader',
            'mangabuddy',
            'mangahere',
            'readmanga',
            'mangakakalot',
            'weebdex'
        ];

        // 1. Move preferred source to front
        // 2. Filter out excluded sources
        let checkOrder = preferredSourceId
            ? [preferredSourceId, ...priorityOrder.filter(id => id !== preferredSourceId)]
            : priorityOrder;

        if (excludedSourceIds.length > 0) {
            checkOrder = checkOrder.filter(id => !excludedSourceIds.includes(id));
        }

        console.log(`[Fallback] Tiered search for "${mangaTitle}" Ch "${chapterTitle}" across order: ${checkOrder.join(' -> ')}`);

        for (const sourceId of checkOrder) {
            const source = sources[sourceId];
            if (!source) continue;

            try {
                let currentMangaId = mangaIdMap?.[sourceId];

                // If we don't have a mangaId for this source, we must search for it
                if (!currentMangaId) {
                    const searchResults = await source.search(mangaTitle);
                    if (searchResults.length === 0) continue;

                    // Take the best match from this source
                    // (Simplification: take the one that contains the title)
                    const match = searchResults.find(m =>
                        m.title.toLowerCase().includes(mangaTitle.toLowerCase()) ||
                        mangaTitle.toLowerCase().includes(m.title.toLowerCase())
                    ) || searchResults[0];
                    currentMangaId = match.id;
                }

                if (!currentMangaId) continue;

                // 1. Get Details to find the chapter
                const details = await source.getMangaDetails(currentMangaId);
                if (!details || !details.chapters) continue;

                // 2. Find matching chapter by number
                const targetNumMatch = chapterTitle.match(/(\d+(\.\d+)?)/);
                if (!targetNumMatch) continue;
                const targetNum = targetNumMatch[0];

                const chapterMatch = details.chapters.find(ch => {
                    const chNum = ch.title.match(/(\d+(\.\d+)?)/)?.[0];
                    return chNum === targetNum;
                });

                if (!chapterMatch) continue;

                // 3. Get Images
                const images = await source.getChapterImages(chapterMatch.id);
                const validation = validateImageSet(images);

                if (validation.isValid) {
                    trackSourceResult(sourceId, true);
                    console.log(`[Fallback] SUCCESS on ${sourceId} (Chapter: ${chapterMatch.title})`);
                    return {
                        sourceId,
                        mangaId: currentMangaId,
                        chapterId: chapterMatch.id,
                        images
                    };
                } else {
                    trackSourceResult(sourceId, false);
                }
            } catch (e: any) {
                trackSourceResult(sourceId, false);
                console.warn(`[Fallback] Tier ${sourceId} failed:`, e.message);
            }
        }

        return null;
    },

    /**
     * ULTIMATE: Race ALL sources in parallel for maximum speed and reliability.
     * Uses fuzzy chapter matching and validates all results.
     */
    async getChapterImagesUltimate(
        mangaTitle: string,
        chapterNumber: string
    ): Promise<{ sourceId: string; mangaId: string; chapterId: string; images: string[] } | null> {
        const allSources = Object.values(sources);

        console.log(`[ULTIMATE] Racing ${allSources.length} sources for "${mangaTitle}" Ch ${chapterNumber}`);

        // Create a promise for each source that does full search -> details -> images
        const racePromises = allSources.map(async (source): Promise<{ sourceId: string; mangaId: string; chapterId: string; images: string[] } | null> => {
            try {
                // 1. Search
                const searchResults = await source.search(mangaTitle);
                if (searchResults.length === 0) return null;

                // 2. Find best match using fuzzy scoring
                let bestMatch = searchResults[0];
                let bestScore = 0;
                for (const result of searchResults) {
                    const score = compareTitles(mangaTitle, result.title);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = result;
                    }
                }

                // Require minimum similarity
                if (bestScore < 0.5) return null;

                // 3. Get details
                const details = await source.getMangaDetails(bestMatch.id);
                if (!details || !details.chapters || details.chapters.length === 0) return null;

                // 4. Find chapter by number (fuzzy)
                const targetNum = parseFloat(chapterNumber);
                let chapterMatch = details.chapters.find(ch => {
                    const match = ch.title.match(/(\d+(\.\d+)?)/);
                    if (!match) return false;
                    return parseFloat(match[0]) === targetNum;
                });

                // Fallback: try contains match
                if (!chapterMatch) {
                    chapterMatch = details.chapters.find(ch =>
                        ch.title.includes(chapterNumber) || ch.title.includes(`Ch. ${chapterNumber}`)
                    );
                }

                if (!chapterMatch) return null;

                // 5. Get images
                const images = await source.getChapterImages(chapterMatch.id);
                const validation = validateImageSet(images);

                if (validation.isValid) {
                    trackSourceResult(source.id, true);
                    return {
                        sourceId: source.id,
                        mangaId: bestMatch.id,
                        chapterId: chapterMatch.id,
                        images
                    };
                } else {
                    trackSourceResult(source.id, false);
                    return null;
                }
            } catch (e) {
                trackSourceResult(source.id, false);
                return null;
            }
        });

        // Race all promises - first valid result wins
        const results = await Promise.allSettled(racePromises);

        // Sort by source priority (health-based)
        const validResults = results
            .filter((r): r is PromiseFulfilledResult<NonNullable<Awaited<typeof racePromises[0]>>> =>
                r.status === 'fulfilled' && r.value !== null
            )
            .map(r => r.value)
            .sort((a, b) => getSourcePriority(b.sourceId) - getSourcePriority(a.sourceId));

        if (validResults.length > 0) {
            console.log(`[ULTIMATE] SUCCESS! ${validResults.length} sources responded, using ${validResults[0].sourceId}`);
            return validResults[0];
        }

        console.warn(`[ULTIMATE] All ${allSources.length} sources failed for "${mangaTitle}" Ch ${chapterNumber}`);
        return null;
    }
};
