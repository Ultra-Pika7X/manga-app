import { ScraperEngine } from './src/lib/scraper';
import * as fs from 'fs';

async function test() {
    let log = "--- TEST START ---\n";
    const logIt = (msg: string) => { console.log(msg); log += msg + "\n"; };

    logIt("Searching for 'chainsaw man' using Scraper Engine...");
    try {
        const results = await ScraperEngine.search("chainsaw man");
        logIt(`Found ${results.length} total results.`);

        // Group by source to verify
        const mangadexResults = results.filter(r => r.sourceId === 'mangadex');
        const mangakakalotResults = results.filter(r => r.sourceId === 'mangakakalot');

        logIt(`MangaDex results: ${mangadexResults.length}`);
        logIt(`Mangakakalot results: ${mangakakalotResults.length}`);

        // Test MangaDex flow
        if (mangadexResults.length > 0) {
            logIt("\n--- Testing MangaDex Flow ---");
            const first = mangadexResults[0];
            logIt(`Selected: ${first.title} (ID: ${first.id})`);

            const details = await ScraperEngine.getMangaDetails(first.id, 'mangadex');
            if (details) {
                logIt(`Chapters found: ${details.chapters.length}`);
                const chapter = details.chapters.find((ch: any) => !ch.externalUrl);
                if (chapter) {
                    logIt(`Testing chapter: ${chapter.title} (ID: ${chapter.id})`);
                    const images = await ScraperEngine.getChapterImages(chapter.id, 'mangadex');
                    logIt(`Images found: ${images.length}`);
                }
            }
        }

        // Test Mangakakalot flow
        if (mangakakalotResults.length > 0) {
            logIt("\n--- Testing Mangakakalot Flow ---");
            const first = mangakakalotResults[0];
            logIt(`Selected: ${first.title} (ID: ${first.id})`);

            const details = await ScraperEngine.getMangaDetails(first.id, 'mangakakalot');
            if (details) {
                logIt(`Chapters found: ${details.chapters.length}`);
                // Take one of the first few chapters (often latest, so try last for first chapter?)
                // Mangakakalot often lists latest first.
                const chapter = details.chapters[Math.min(5, details.chapters.length - 1)];
                if (chapter) {
                    logIt(`Testing chapter: ${chapter.title} (ID: ${chapter.id})`);
                    const images = await ScraperEngine.getChapterImages(chapter.id, 'mangakakalot');
                    logIt(`Images found: ${images.length}`);
                    if (images.length > 0) logIt(`Sample Image: ${images[0]}`);
                }
            } else {
                logIt("Failed to get details for Mangakakalot item.");
            }
        }

    } catch (e) {
        logIt(`Error: ${e}`);
        if ((e as any).stack) logIt((e as any).stack);
    }
    logIt("--- TEST END ---");
    fs.writeFileSync('test-results.txt', log);
}

test();
