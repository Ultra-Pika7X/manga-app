"use server";

import { ScraperEngine } from "@/lib/scraper";

export async function getChapterImagesAction(chapterId: string, sourceId?: string): Promise<string[]> {
    try {
        return await ScraperEngine.getChapterImages(chapterId, sourceId);
    } catch (e) {
        console.error("Server Action 'getChapterImages' failed:", e);
        return [];
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
    currentSourceId: string
): Promise<{ sourceId: string; mangaId: string; chapterId: string; imageUrls: string[] } | null> {
    try {
        console.log(`[Auto-Heal] Searching for '${mangaTitle}' on other sources...`);
        const results = await ScraperEngine.search(mangaTitle);

        // Filter out current source and sort by relevance
        const candidates = results
            .filter(m => m.sourceId !== currentSourceId)
            .filter(m => m.title.toLowerCase().includes(mangaTitle.toLowerCase())); // Loose check

        // Try top 3 candidates
        for (const candidate of candidates.slice(0, 3)) {
            try {
                console.log(`[Auto-Heal] Checking candidate: ${candidate.title} (${candidate.sourceId})`);
                const details = await ScraperEngine.getMangaDetails(candidate.id, candidate.sourceId);

                if (!details || !details.chapters) continue;

                // Find matching chapter: Fuzzy match on title or number
                const targetNum = chapterTitle.match(/(\d+(\.\d+)?)/)?.[0];

                const match = details.chapters.find(ch => {
                    const chNum = ch.title.match(/(\d+(\.\d+)?)/)?.[0];
                    return chNum && targetNum && chNum === targetNum;
                });

                if (match) {
                    console.log(`[Auto-Heal] Found match on ${candidate.sourceId}: ${match.title}`);
                    const images = await ScraperEngine.getChapterImages(match.id, candidate.sourceId);

                    if (images.length > 0) {
                        return {
                            sourceId: candidate.sourceId,
                            mangaId: candidate.id,
                            chapterId: match.id,
                            imageUrls: images
                        };
                    }
                }
            } catch (innerE) {
                console.warn(`[Auto-Heal] Failed checking candidate ${candidate.sourceId}`, innerE);
            }
        }

        return null;
    } catch (e) {
        console.error("Server Action 'findAlternativeChapter' failed:", e);
        return null;
    }
}
