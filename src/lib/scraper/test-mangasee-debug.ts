import { MangaSeeSource } from './sources/mangasee';
import { fetchPage } from './utils';

async function test() {
    console.log('--- Testing MangaSee Source with new fetchPage ---');

    // 1. Test Search
    const query = 'One Piece';
    console.log(`\nSearching for "${query}"...`);
    try {
        const results = await MangaSeeSource.search(query);
        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log('First result:', results[0]);

            // 2. Test Details
            const firstId = results[0].id; // Likely 'One-Piece'
            console.log(`\nGetting Details for ${firstId}...`);
            const details = await MangaSeeSource.getMangaDetails(firstId);
            if (details) {
                console.log(`Title: ${details.manga.title}`);
                console.log(`Chapters: ${details.chapters.length}`);

                // 3. Test Chapter Images
                if (details.chapters.length > 0) {
                    const ch = details.chapters[0]; // Latest or first? Array is usually reversed or latest first
                    // MangaSee returns reversed (latest first) usually in my expectation? 
                    // Let's just pick one.
                    console.log(`\nGetting Images for ${ch.id} (${ch.title})...`);
                    const images = await MangaSeeSource.getChapterImages(ch.id);
                    console.log(`Found ${images.length} images.`);
                    console.log('First image:', images[0]);
                }
            } else {
                console.error('Failed to get details');
            }
        } else {
            console.warn('No results found. Cloudflare might still be blocking?');
        }
    } catch (e: any) {
        console.error('Test Failed:', e);
    }
}

test();
