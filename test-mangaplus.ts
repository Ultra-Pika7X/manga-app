
import { MangaPlusSource } from './src/lib/scraper/sources/mangaplus';
import * as fs from 'fs';

const LOG_FILE = 'test_mangaplus_log.txt';

function log(message: string, data?: any) {
    const msg = message + (data ? '\n' + JSON.stringify(data, null, 2) : '') + '\n';
    console.log(message);
    if (data) console.dir(data, { depth: null });
    fs.appendFileSync(LOG_FILE, msg);
}

async function testMangaPlus() {
    fs.writeFileSync(LOG_FILE, '--- Testing MangaPlus Source ---\n');
    log('Starting MangaPlus scraper test...');

    try {
        // 1. Search for "One Piece"
        log('\n1. Searching for "One Piece"...');
        const results = await MangaPlusSource.search('One Piece');
        log(`Found ${results.length} results.`);

        if (results.length === 0) {
            log('CRITICAL ERROR: No search results found.');
            return;
        }

        const targetManga = results[0];
        log('Target Manga:', targetManga);

        // 2. Fetch Details
        log(`\n2. Fetching details for ID: ${targetManga.id}...`);
        const details = await MangaPlusSource.getMangaDetails(targetManga.id);

        if (!details) {
            log('CRITICAL ERROR: Failed to fetch details.');
            return;
        }

        log('Manga Details:', {
            title: details.manga.title,
            chaptersCount: details.chapters.length,
            firstChapter: details.chapters[0]
        });

        if (details.chapters.length === 0) {
            log('CRITICAL ERROR: No chapters found.');
            return;
        }

        // 3. Fetch Images for First Chapter
        const firstChapter = details.chapters[0];
        log(`\n3. Fetching images for Chapter: ${firstChapter.title} (ID: ${firstChapter.id})...`);

        // Use a timeout to prevent hanging indefinitely
        const imagesPromise = MangaPlusSource.getChapterImages(firstChapter.id);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000));

        const images: string[] = await Promise.race([imagesPromise, timeoutPromise]) as string[];

        log(`Found ${images.length} images.`);

        if (images.length === 0) {
            log('CRITICAL ERROR: No images found.');
            return;
        }

        // 4. Validate Images
        log('\n4. Validating images...');
        const validImages = images.filter(img => img.startsWith('data:image') || img.startsWith('http'));
        log(`Valid images format: ${validImages.length}/${images.length}`);

        if (validImages.length > 0) {
            log('First image sample (truncated):', validImages[0].substring(0, 50) + '...');
        } else {
            log('CRITICAL ERROR: Images returned are not in expected format (data URI or HTTP URL).');
        }

        log('\nMangaPlus Scraper Test Completed Successfully.');

    } catch (e: any) {
        log('FATAL ERROR:', e.message);
        if (e.stack) log('Stack:', e.stack);
    }
}

testMangaPlus();
