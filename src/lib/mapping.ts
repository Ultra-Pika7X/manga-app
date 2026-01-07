import { ScraperEngine, Manga } from './scraper';
import { compareTitles } from './similarity';
import { db, isFirebaseConfigured } from './firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

export interface MangaMapping {
    sourceId: string;
    mangaId: string;
    sourceName: string;
    matchedTitle: string;
    isManual?: boolean;
    lastWorkingSourceId?: string; // Cache the source that actually returned images
    updatedAt: number;
}

export interface TitleData {
    english?: string;
    romaji?: string;
    native?: string;
}

/**
 * Resolves an AniList ID to a scraper source mapping.
 * Checks Firestore first, then falls back to auto-matching.
 */
export async function resolveMapping(
    anilistId: string,
    titleData: TitleData
): Promise<MangaMapping | null> {
    const docId = `anilist_${anilistId}`;

    // 1. Check Persistence (Firestore)
    if (isFirebaseConfigured && db) {
        try {
            const docRef = doc(db, 'mappings', docId);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                return snapshot.data() as MangaMapping;
            }
        } catch (e) {
            console.warn(`[Mapping] Firestore lookup failed for ${anilistId}:`, e);
        }
    }

    // 2. Auto-Match Strategy
    console.log(`[Mapping] Attempting auto-match for ${anilistId} (${titleData.english || titleData.romaji})...`);

    // Search using the best available title
    const searchTitle = titleData.english || titleData.romaji || titleData.native;
    if (!searchTitle) return null;

    const results = await ScraperEngine.search(searchTitle);
    if (results.length === 0) return null;

    let bestMatch: Manga | null = null;
    let bestScore = 0;

    for (const result of results) {
        // Calculate score against all known titles
        const scores = [
            titleData.romaji ? compareTitles(result.title, titleData.romaji) : 0,
            titleData.english ? compareTitles(result.title, titleData.english) : 0,
            titleData.native ? compareTitles(result.title, titleData.native) : 0
        ];

        let maxScore = Math.max(...scores);

        // Source weight bonuses
        if (result.sourceId === 'mangabuddy') maxScore += 0.02;

        if (maxScore > bestScore && maxScore > 0.65) {
            bestScore = maxScore;
            bestMatch = result;
        }
    }

    if (bestMatch) {
        const mapping: MangaMapping = {
            sourceId: bestMatch.sourceId,
            mangaId: bestMatch.id,
            sourceName: bestMatch.sourceId.charAt(0).toUpperCase() + bestMatch.sourceId.slice(1),
            matchedTitle: bestMatch.title,
            updatedAt: Date.now()
        };

        // Save for future use
        if (isFirebaseConfigured && db) {
            try {
                const docRef = doc(db, 'mappings', docId);
                await setDoc(docRef, { ...mapping, isManual: false });
            } catch (e) {
                console.error(`[Mapping] Failed to save mapping for ${anilistId}:`, e);
            }
        }

        return mapping;
    }

    return null;
}

/**
 * Manually update a mapping (overrides auto-match).
 */
export async function saveManualMapping(
    anilistId: string,
    mapping: Omit<MangaMapping, 'updatedAt' | 'isManual'>
): Promise<boolean> {
    if (!isFirebaseConfigured || !db) return false;

    try {
        const docRef = doc(db, 'mappings', `anilist_${anilistId}`);
        await setDoc(docRef, {
            ...mapping,
            isManual: true,
            updatedAt: Date.now()
        });
        return true;
    } catch (e) {
        console.error(`[Mapping] Failed to save manual mapping:`, e);
        return false;
    }
}

/**
 * Updates only the last working source without changing the main mapping.
 */
export async function saveLastWorkingSource(
    anilistId: string,
    sourceId: string
): Promise<boolean> {
    if (!isFirebaseConfigured || !db) return false;

    try {
        const docId = `anilist_${anilistId}`;
        const docRef = doc(db, 'mappings', docId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            await setDoc(docRef, {
                ...snapshot.data(),
                lastWorkingSourceId: sourceId,
                updatedAt: Date.now()
            });
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[Mapping] Failed to save last working source:`, e);
        return false;
    }
}
