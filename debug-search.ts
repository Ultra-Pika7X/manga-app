
import { ScraperEngine } from './src/lib/scraper/index';

async function test() {
    // Pick a very common title that should exist everywhere
    const title = "One Piece";
    const sources = ['mangasee', 'mangafire', 'mangadex', 'mangabuddy'];

    console.log(`--- Debugging Source Search for title: "${title}" ---`);

    for (const sourceId of sources) {
        console.log(`\nTesting source: ${sourceId}`);
        try {
            const start = Date.now();
            const results = await ScraperEngine.search(title, sourceId);
            const duration = Date.now() - start;

            console.log(`Status: ${results.length > 0 ? 'SUCCESS' : 'EMPTY_RESULTS'}`);
            console.log(`Time: ${duration}ms`);
            console.log(`Found: ${results.length} items`);

            if (results.length > 0) {
                console.log(`Top result: [${results[0].id}] ${results[0].title}`);
                // Verify ID format
                console.log(`Result ID sample: ${results[0].id}`);
            }
        } catch (e: any) {
            console.error(`ERROR on ${sourceId}:`, e.message);
        }
    }
}

test();
