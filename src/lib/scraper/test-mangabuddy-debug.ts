import { MangaBuddySource } from './sources/mangabuddy';

async function test() {
    console.log('--- Testing MangaBuddy Images ---');
    const query = 'One Piece';
    // Or a specific ID if known, but search is safer to get a valid current ID
    const results = await MangaBuddySource.search(query);

    if (results.length === 0) {
        console.error('No results found for search.');
        return;
    }

    const manga = results[0];
    console.log(`Found manga: ${manga.title} (${manga.id})`);

    const details = await MangaBuddySource.getMangaDetails(manga.id);
    if (!details || details.chapters.length === 0) {
        console.error('No details or chapters found.');
        return;
    }

    const chapter = details.chapters[0];
    console.log(`Testing Chapter: ${chapter.title} (ID: ${chapter.id})`);

    const images = await MangaBuddySource.getChapterImages(chapter.id);
    console.log(`Found ${images.length} images.`);

    if (images.length > 0) {
        console.log('First 3 images:');
        images.slice(0, 3).forEach(img => console.log(img));
    }

    if (images.length === 1) {
        console.log('ISSUE REPRODUCED: Only 1 image found.');
    } else {
        console.log('Seems okay? verify count.');
    }
}

test().catch(console.error);
