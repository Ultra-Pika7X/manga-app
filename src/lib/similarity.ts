/**
 * Calculates the Sørensen–Dice coefficient between two strings.
 * Used for title similarity matching.
 * Range: 0.0 (no match) to 1.0 (exact match).
 */
export function compareTitles(a: string, b: string): number {
    if (!a || !b) return 0;

    const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanA === cleanB) return 1;
    if (cleanA.length < 2 || cleanB.length < 2) return 0;

    const bigramsA = new Set<string>();
    for (let i = 0; i < cleanA.length - 1; i++) {
        bigramsA.add(cleanA.substring(i, i + 2));
    }

    const bigramsB = new Set<string>();
    for (let i = 0; i < cleanB.length - 1; i++) {
        bigramsB.add(cleanB.substring(i, i + 2));
    }

    let intersection = 0;
    bigramsA.forEach(bg => {
        if (bigramsB.has(bg)) intersection++;
    });

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Finds the best match from a list of candidates based heavily on title similarity.
 */
export function findBestMatch<T extends { title: { romaji: string; english: string; native: string } }>(
    query: string,
    candidates: T[],
    threshold = 0.6
): T | null {
    let bestMatch: T | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
        const scores = [
            compareTitles(query, candidate.title.romaji),
            compareTitles(query, candidate.title.english || ''),
            compareTitles(query, candidate.title.native || '')
        ];

        const maxScore = Math.max(...scores);

        if (maxScore > bestScore && maxScore >= threshold) {
            bestScore = maxScore;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}
