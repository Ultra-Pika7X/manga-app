"use server";

import { ScraperEngine, Manga } from "@/lib/scraper";
import { resolveMapping, saveManualMapping, MangaMapping, TitleData, saveLastWorkingSource } from "@/lib/mapping";
import { browseManga, convertAniListToManga } from '@/lib/anilist';

export async function getChapterImagesAction(chapterId: string, sourceId?: string): Promise<string[]> {
    try {
        return await ScraperEngine.getChapterImages(chapterId, sourceId);
    } catch (e) {
        console.error("Server Action 'getChapterImages' failed:", e);
        return [];
    }
}

export async function getChapterImagesAutoAction(
    anilistId: string,
    mangaTitle: string,
    chapterTitle: string,
    preferredSourceId?: string
) {
    try {
        const result = await ScraperEngine.getChapterImagesAuto(mangaTitle, chapterTitle, preferredSourceId);

        if (result && result.images.length > 0) {
            // SUCCESS! Silently cache this source for this AniList ID
            if (result.sourceId !== preferredSourceId) {
                console.log(`[Action] Auto-cache new working source ${result.sourceId} for ${anilistId}`);
                await saveLastWorkingSource(anilistId, result.sourceId);
            }
            return result;
        }
        return null;
    } catch (e) {
        console.error("Server Action 'getChapterImagesAuto' failed:", e);
        return null;
    }
}

/**
 * ULTIMATE MODE: Race ALL sources in parallel for maximum reliability.
 */
export async function getChapterImagesUltimateAction(
    anilistId: string,
    mangaTitle: string,
    chapterNumber: string
) {
    try {
        const result = await ScraperEngine.getChapterImagesUltimate(mangaTitle, chapterNumber);

        if (result && result.images.length > 0) {
            console.log(`[Action] ULTIMATE success on ${result.sourceId} for ${anilistId}`);
            await saveLastWorkingSource(anilistId, result.sourceId);
            return result;
        }
        return null;
    } catch (e) {
        console.error("Server Action 'getChapterImagesUltimate' failed:", e);
        return null;
    }
}

export async function getMangaDetailsAction(mangaId: string, sourceId?: string) {
    try {
        return await ScraperEngine.getMangaDetails(mangaId, sourceId);
    } catch (e) {
        console.error("Server Action 'getMangaDetails' failed:", e);
        return null;
    }
}

export async function findAlternativeChapterAction(
    mangaTitle: string,
    chapterTitle: string,
    currentSourceId: string // Note: This can now be a comma-separated list of failed sources
): Promise<{ sourceId: string; mangaId: string; chapterId: string; imageUrls: string[] } | null> {
    try {
        const excluded = currentSourceId.includes(',')
            ? currentSourceId.split(',').map(s => s.trim())
            : [currentSourceId];

        console.log(`[Auto-Heal] Unified fallback search for '${mangaTitle}' (Excluding: ${excluded.join(', ')})...`);
        const result = await ScraperEngine.getChapterImagesAuto(mangaTitle, chapterTitle, undefined, excluded);

        if (result) {
            return {
                sourceId: result.sourceId,
                mangaId: result.mangaId,
                chapterId: result.chapterId,
                imageUrls: result.images
            };
        }
        return null;
    } catch (e) {
        console.error("Server Action 'findAlternativeChapter' failed:", e);
        return null;
    }
}

export async function resolveMappingAction(anilistId: string, titleData: TitleData): Promise<MangaMapping | null> {
    try {
        return await resolveMapping(anilistId, titleData);
    } catch (e) {
        console.error("Action 'resolveMapping' failed:", e);
        return null;
    }
}

export async function saveManualMappingAction(
    anilistId: string,
    mapping: Omit<MangaMapping, 'updatedAt' | 'isManual'>
): Promise<boolean> {
    try {
        return await saveManualMapping(anilistId, mapping);
    } catch (e) {
        console.error("Action 'saveManualMapping' failed:", e);
        return false;
    }
}

export async function saveLastWorkingSourceAction(anilistId: string, sourceId: string) {
    try {
        return await saveLastWorkingSource(anilistId, sourceId);
    } catch (e) {
        console.error("Action 'saveLastWorkingSource' failed:", e);
        return false;
    }
}

export async function searchMangaAction(query: string, sourceId?: string): Promise<Manga[]> {
    try {
        return await ScraperEngine.search(query, sourceId);
    } catch (e) {
        console.error("Action 'searchManga' failed:", e);
        return [];
    }
}

export async function getVerifiedUpdates() {
    const { media } = await browseManga({
        sort: ['UPDATED_AT_DESC'],
        status: 'RELEASING',
        perPage: 20
    });

    const seenIds = new Set<string>();
    const validUpdates = [];

    for (const item of media) {
        if (!item.id || !item.title || seenIds.has(item.id.toString())) continue;

        seenIds.add(item.id.toString());
        validUpdates.push(convertAniListToManga(item));

        if (validUpdates.length >= 10) break;
    }

    return validUpdates;
}
