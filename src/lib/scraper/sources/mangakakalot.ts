import axios from 'axios';
import * as cheerio from 'cheerio';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://mangakakalot.com';

export const MangakakalotSource: MangaSource = {
    id: 'mangakakalot',
    name: 'Mangakakalot',

    async search(query: string): Promise<Manga[]> {
        try {
            const formattedQuery = query.toLowerCase().replace(/ /g, '_');
            const url = `${BASE_URL}/search/story/${formattedQuery}`; // Mangakakalot search URL pattern

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const results: Manga[] = [];

            $('.story_item').each((_, element) => {
                const titleElement = $(element).find('.story_name a');
                const imgElement = $(element).find('img');
                const link = titleElement.attr('href');
                const title = titleElement.text().trim();
                const cover = imgElement.attr('src') || '';

                // Extract ID from URL (e.g., https://mangakakalot.com/manga/kx925235 -> kx925235)
                // Sometimes it is read-[id] or manga-[id]
                // Example: https://mangakakalot.com/read-ox34567 or https://manganato.com/manga-ox34567
                const id = link ? link.split('/').pop() || '' : '';

                if (id && title) {
                    results.push({
                        id,
                        title,
                        cover,
                        sourceId: 'mangakakalot',
                        status: 'Unknown' // Not easily available on search list
                    });
                }
            });

            return results;
        } catch (error: any) {
            console.error(`[Mangakakalot] Search error for "${query}":`, error.message);
            return [];
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        try {
            // Mangakakalot IDs in URLs can be tricky.
            // If the ID starts with 'read-', it might need 'https://mangakakalot.com/'
            // If it starts with 'manga-', it might be 'https://manganato.com/' or similar.
            // We will assume the ID passed INCLUDES the necessary prefix or we reconstruct it.
            // But search returns the full ID like 'read-ox34567'.

            // Let's try constructing the URL. 
            // Often: https://mangakakalot.com/manga/[id] or https://mangakakalot.com/[id]
            // Safe bet: if ID contains 'http', use it? No, keep it clean.
            // Let's try standard Mangakakalot URL.

            let url = `${BASE_URL}/${id}`;
            // Handle redirect or manganato
            if (id.startsWith('manga-')) {
                // heuristic: manganato often uses manga-[id]
                url = `https://chapmanganato.to/${id}`;
            } else if (id.startsWith('read-')) {
                url = `${BASE_URL}/${id}`;
            } else {
                // Try default
                url = `${BASE_URL}/manga/${id}`;
            }

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const title = $('.manga-info-text li h1').text().trim() || $('.story-info-right h1').text().trim();
            const cover = $('.manga-info-pic img').attr('src') || $('.info-image img').attr('src') || '';
            const description = $('#noidungm').text().trim() || $('.panel-story-info-description').text().trim();

            // Authors
            const author = $('.manga-info-text li:contains("Author")').text().replace('Author(s) :', '').trim()
                || $('.table-label:contains("Author")').next().text().trim();

            // Status
            const status = $('.manga-info-text li:contains("Status")').text().replace('Status :', '').trim()
                || $('.table-label:contains("Status")').next().text().trim();

            const manga: Manga = {
                id,
                title,
                cover,
                description,
                author,
                status,
                sourceId: 'mangakakalot'
            };

            const chapters: Chapter[] = [];
            $('.row-content-chapter li').each((_, element) => {
                const a = $(element).find('a');
                const title = a.text().trim();
                const href = a.attr('href');
                const chapterId = href || ''; // Use full URL as ID for Mangakakalot
                const time = $(element).find('.chapter-time').text().trim();

                if (chapterId) {
                    chapters.push({
                        id: chapterId,
                        title,
                        // parse chapter number from title?
                        chapter: title.match(/Chapter\s+([\d.]+)/)?.[1] || '',
                        publishAt: time,
                        sourceId: 'mangakakalot'
                    });
                }
            });
            // If .row-content-chapter not found, try .chapter-list (manganato style)
            if (chapters.length === 0) {
                $('.chapter-list li').each((_, element) => {
                    const a = $(element).find('a');
                    const title = a.text().trim();
                    const href = a.attr('href');
                    const chapterId = href || '';

                    if (chapterId) {
                        chapters.push({
                            id: chapterId,
                            title,
                            chapter: title.match(/Chapter\s+([\d.]+)/)?.[1] || '',
                            sourceId: 'mangakakalot'
                        });
                    }
                });
            }

            return { manga, chapters };

        } catch (error: any) {
            console.error(`[Mangakakalot] Details error for ${id}:`, error.message);
            return null;
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        try {
            // chapterId IS the URL now
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}/${chapterId}`;

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            const images: string[] = [];

            $('.container-chapter-reader img').each((_, element) => {
                const src = $(element).attr('src');
                if (src) images.push(src);
            });

            // Try fallback selector
            if (images.length === 0) {
                $('#vungdoc img').each((_, element) => {
                    const src = $(element).attr('src');
                    if (src) images.push(src);
                });
            }

            return images;

        } catch (error: any) {
            console.error(`[Mangakakalot] Images error for ${chapterId}:`, error.message);
            return [];
        }
    }
};
