import { WeebDexSource } from './sources/weebdex';
import * as fs from 'fs';

const LOG_FILE = 'test_log.txt';

function log(message: string, data?: any) {
    const msg = message + (data ? '\n' + JSON.stringify(data, null, 2) : '') + '\n';
    console.log(message);
    if (data) console.log(data);
    fs.appendFileSync(LOG_FILE, msg);
}

async function testWeebDex() {
    fs.writeFileSync(LOG_FILE, '--- Testing WeebDex Source with Puppeteer ---\n');
    log('Starting test...');

    try {
        // 1. Search
        log('\n1. Searching for "One Piece"...');
        const results = await WeebDexSource.search('One Piece');
        log(`Found ${results.length} results.`);
        if (results.length > 0) {
            log('First result:', results[0]);

            // 2. Details
            const firstId = results[0].id;
            log(`\n2. Fetching details for ID: ${firstId}...`);
            const details = await WeebDexSource.getMangaDetails(firstId);

            if (details) {
                log('Manga Details:', {
                    title: details.manga.title,
                    chaptersCount: details.chapters.length,
                    firstChapter: details.chapters[0]
                });

                // 3. Chapter Images
                if (details.chapters.length > 0) {
                    const chapterId = details.chapters[0].id;
                    log(`\n3. Fetching images for Chapter: ${chapterId}...`);
                    const images = await WeebDexSource.getChapterImages(chapterId);
                    log(`Found ${images.length} images.`);
                    if (images.length > 0) {
                        log('First image:', images[0]);
                    }
                } else {
                    log('No chapters found to test images.');
                }
            } else {
                log('Failed to fetch details.');
            }
        } else {
            log('No search results found.');
        }
    } catch (e: any) {
        log('ERROR:', e.message);
        log('STACK:', e.stack);
    }
}

testWeebDex().catch(e => log('FATAL:', e));
