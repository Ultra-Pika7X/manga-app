
import { MangaPlusSource } from '@/lib/scraper/sources/mangaplus';

export default async function MangaPlusDebugPage() {
    console.log('--- Startup MangaPlus Debug ---');

    let logs: string[] = [];
    const log = (msg: string, data?: any) => {
        const line = msg + (data ? ' ' + JSON.stringify(data) : '');
        console.log(line);
        logs.push(line);
    };

    try {
        log('1. Searching for "One Piece"...');
        const results = await MangaPlusSource.search('One Piece');
        log(`Found ${results.length} results.`);

        let details = null;
        let images: string[] = [];

        if (results.length > 0) {
            const targetManga = results[0];
            log('Target Manga:', targetManga);

            log(`2. Fetching details for ID: ${targetManga.id}...`);
            details = await MangaPlusSource.getMangaDetails(targetManga.id);

            if (details) {
                log('Manga Details:', {
                    title: details.manga.title,
                    chaptersCount: details.chapters.length,
                    firstChapter: details.chapters[0]
                });

                if (details.chapters.length > 0) {
                    const firstChapter = details.chapters[0];
                    log(`3. Fetching images for Chapter: ${firstChapter.title} (ID: ${firstChapter.id})...`);
                    images = await MangaPlusSource.getChapterImages(firstChapter.id);
                    log(`Found ${images.length} images.`);

                    if (images.length > 0) {
                        const validImages = images.filter(img => img.startsWith('data:image') || img.startsWith('http'));
                        log(`Valid images format: ${validImages.length}/${images.length}`);
                        if (validImages.length > 0) {
                            log('First image sample:', validImages[0].substring(0, 50) + '...');
                        }
                    }
                }
            } else {
                log('Failed to fetch details.');
            }
        } else {
            log('No search results found.');
        }

        return (
            <div className="p-10 font-mono text-sm whitespace-pre-wrap bg-gray-900 text-green-400">
                <h1 className="text-xl font-bold mb-4">MangaPlus Debug Report</h1>
                {logs.join('\n')}

                {/* Visual Check */}
                {images.length > 0 && (
                    <div className="mt-8 border-t border-gray-700 pt-4">
                        <h2 className="text-lg font-bold mb-2">First Image Preview</h2>
                        <img src={images[0]} alt="First Page" className="max-w-md border border-gray-600" />
                    </div>
                )}
            </div>
        );

    } catch (e: any) {
        log('FATAL ERROR:', e.message);
        if (e.stack) log('Stack:', e.stack);
        return (
            <div className="p-10 font-mono text-sm whitespace-pre-wrap bg-red-900 text-white">
                <h1 className="text-xl font-bold mb-4">MangaPlus Debug Failed</h1>
                {logs.join('\n')}
            </div>
        );
    }
}
