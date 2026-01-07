import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';
import { fetchPage, filterChapterImages, isFakeChapter, sanitizeUrl } from '../utils';

const BASE_URL = 'https://mangapark.to';

export const WeebDexSource: MangaSource = {
    id: 'weebdex',
    name: 'MangaPark',

    async search(query: string): Promise<Manga[]> {
        try {
            // New Search URL: /search?q=query
            const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            // MangaPark V5 Selectors
            // We search for links starting with /title/
            $('a[href^="/title/"]').each((_, element) => {
                const link = $(element).attr('href');
                const title = $(element).text().trim();
                const parent = $(element).closest('.group, .item'); // approximate container
                const cover = parent.find('img').attr('src') || parent.find('img').attr('data-src') || '';

                if (link && title && link.split('/').length > 2) {
                    const fullId = link; // Use full path /title/ID

                    // Dedupe
                    if (!results.some(r => r.title === title) && !results.some(r => r.id === fullId)) {
                        results.push({
                            id: fullId,
                            title,
                            cover: sanitizeUrl(cover, BASE_URL) || '',
                            sourceId: 'weebdex',
                            status: 'Unknown'
                        });
                    }
                }
            });

            return results;
        } catch (error: any) {
            console.error('[MangaPark] Search error:', error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            // id is likely /title/...
            const url = id.startsWith('http') ? id : `${BASE_URL}${id.startsWith('/') ? '' : '/'}${id}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const title = $('h3 a, h3').first().text().trim() || $('title').text().replace(' - Share Any Manga on MangaPark', '').trim();
            const cover = $('img[alt="cover"], .attr-cover img').attr('src') || '';
            const description = $('.limit-height, .summary').text().trim();
            const author = $('.attr-item:contains("Author") a').text().trim() || 'Unknown';
            const status = $('.attr-item:contains("Status")').text().replace('Status:', '').trim() || 'Unknown';

            const chapters: Chapter[] = [];
            // Chapter list generic links
            $('a[href*="/chapter"]').each((_, element) => {
                const href = $(element).attr('href');
                const titleText = $(element).text().trim();

                // Clean up title
                const title = titleText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                if (href && !isFakeChapter(title)) {
                    // Check if it's a "History" or "last read" link (ignore)
                    if (href.includes('history')) return;

                    // Determine publish time (often in a sibling span)
                    const time = $(element).siblings('span, i').text().trim() || 'Unknown';

                    chapters.push({
                        id: href,
                        title,
                        chapter: title.match(/Chapter\s+([\d.]+)/i)?.[1] || title.match(/ch\.([\d.]+)/i)?.[1] || '',
                        publishAt: time,
                        sourceId: 'weebdex'
                    });
                }
            });

            // Deduplicate chapters based on ID
            const uniqueChapters = Array.from(new Map(chapters.map(c => [c.id, c])).values());

            return {
                manga: {
                    id,
                    title,
                    cover: sanitizeUrl(cover, BASE_URL) || '',
                    description,
                    author,
                    status,
                    sourceId: 'weebdex'
                },
                chapters: uniqueChapters
            };
        } catch (error: any) {
            console.error('[MangaPark] Details error:', error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId.startsWith('/') ? '' : '/'}${chapterId}`;
            const data = await fetchPage(url);
            const $ = cheerio.load(data);

            const images: string[] = [];
            const seen = new Set<string>();

            // Strategy 1: Regex Scan for Image URLs in Scripts
            // MangaPark often embeds images in JSON or encoded strings in scripts.
            // We look for patterns like https://... .jpg
            const scripts = $('script').map((i, el) => $(el).html()).get();
            for (const script of scripts) {
                if (!script) continue;

                // Look for arrays of strings or just raw URLs
                // Regex to find https://...jpg/png/webp
                // Note: MangaPark images often come from distinct CDNs
                const matches = script.matchAll(/(https?:\/\/[^"'\s]+\.(?:jpg|png|webp|jpeg))/gi);
                for (const match of matches) {
                    const src = match[1];
                    // Filter useless assets
                    if (src.includes('avatar') || src.includes('logo') || src.includes('icon') || src.includes('thumb')) continue;

                    const clean = sanitizeUrl(src, BASE_URL);
                    if (clean && !seen.has(clean)) {
                        // Double check it looks like a comic page (often has digits or 'comic' in path)
                        // Heuristic: keep it loose for now as failure fallback is handled elsewhere
                        images.push(clean);
                        seen.add(clean);
                    }
                }
            }

            // Strategy 2: DOM fallback (if they switch to server rendering)
            if (images.length === 0) {
                $('img').each((_, el) => {
                    const src = $(el).attr('src') || $(el).attr('data-src');
                    const clean = sanitizeUrl(src, BASE_URL);
                    if (clean && !seen.has(clean)) {
                        if (!clean.includes('avatar') && !clean.includes('logo') && !clean.includes('icon')) {
                            images.push(clean);
                            seen.add(clean);
                        }
                    }
                });
            }

            return filterChapterImages(images);
        } catch (error: any) {
            console.error('[MangaPark] Images error:', error.message);
            return [];
        }
    }
};
