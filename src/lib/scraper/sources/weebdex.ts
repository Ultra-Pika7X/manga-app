import puppeteer from 'puppeteer';
import { MangaSource, Manga, MangaDetails, Chapter } from '../types';

const BASE_URL = 'https://weebdex.org';

const getBrowser = async () => {
    return await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
};

export const WeebDexSource: MangaSource = {
    id: 'weebdex',
    name: 'WeebDex',

    async search(query: string): Promise<Manga[]> {
        const browser = await getBrowser();
        try {
            const page = await browser.newPage();
            // Use the correct search URL pattern
            await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });

            const results = await page.evaluate((baseUrl) => {
                const items: Manga[] = [];
                // Selectors based on generic observation, may need refinement
                // Selecting containers that look like Grid Items
                // Adjust selectors based on inspection of rendered page
                const elements = document.querySelectorAll('.grid > div, a[href^="/title/"]');

                elements.forEach((el) => {
                    const anchor = el.tagName === 'A' ? el as HTMLAnchorElement : el.querySelector('a');
                    const img = el.querySelector('img');
                    const titleEl = el.querySelector('h3, h2, .title, span.font-bold'); // Guessing title classes

                    if (anchor && img) {
                        const href = anchor.getAttribute('href');
                        const id = href ? href.split('/').slice(-2).join('/') : ''; // /title/UUID/SLUG -> UUID/SLUG or just UUID? 
                        // Let's assume ID is the full relative path part after /title/ for now to be safe

                        const title = titleEl ? titleEl.textContent?.trim() : '';
                        let cover = img.getAttribute('src') || '';

                        // Fix relative URLs
                        if (cover && !cover.startsWith('http')) {
                            cover = cover.startsWith('//') ? `https:${cover}` : `${baseUrl}${cover}`;
                        }

                        if (id && title) {
                            items.push({
                                id: href?.replace('/title/', '') || '',
                                title: title || 'Unknown',
                                cover,
                                sourceId: 'weebdex',
                                status: 'Unknown'
                            });
                        }
                    }
                });
                return items;
            }, BASE_URL);

            return results;
        } catch (error: any) {
            console.error(`[WeebDex] Search error for "${query}":`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    },

    async getMangaDetails(id: string): Promise<MangaDetails | null> {
        const browser = await getBrowser();
        try {
            const page = await browser.newPage();
            await page.goto(`${BASE_URL}/title/${id}`, { waitUntil: 'networkidle2' });

            // Wait for key elements to render
            try {
                await page.waitForSelector('h1', { timeout: 5000 });
            } catch (e) {
                // Continue if timeout, might be loaded anyway
            }

            const data = await page.evaluate((baseUrl) => {
                const title = document.querySelector('h1')?.textContent?.trim() || '';
                const cover = document.querySelector('img.cover, div[class*="poster"] img, img[alt="' + title + '"]')?.getAttribute('src') || '';
                const description = document.querySelector('.description, div[class*="description"]')?.textContent?.trim() || '';
                const author = document.querySelector('.author, div[class*="author"]')?.textContent?.trim() || '';
                const status = document.querySelector('.status, div[class*="status"]')?.textContent?.trim() || '';

                // Chapters
                const chapterElements = document.querySelectorAll('a[href*="/chapter/"]');
                const chapters: any[] = [];

                chapterElements.forEach((el) => {
                    const href = el.getAttribute('href');
                    const text = el.textContent?.trim() || '';
                    if (href) {
                        const chapterMatch = text.match(/Chapter\s+([\d.]+)/i);
                        const chapterNum = chapterMatch ? chapterMatch[1] : '0';

                        chapters.push({
                            id: href,
                            title: text,
                            chapter: chapterNum,
                            sourceId: 'weebdex'
                        });
                    }
                });

                return {
                    manga: {
                        id: '', // Filled outside
                        title,
                        cover: cover.startsWith('http') ? cover : (cover.startsWith('//') ? `https:${cover}` : `${baseUrl}${cover}`),
                        description,
                        author,
                        status,
                        sourceId: 'weebdex'
                    },
                    chapters
                };
            }, BASE_URL);

            if (!data.manga.title) return null;

            data.manga.id = id;

            return data;
        } catch (error: any) {
            console.error(`[WeebDex] Details error for ${id}:`, error.message);
            return null;
        } finally {
            await browser.close();
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        const browser = await getBrowser();
        try {
            const url = chapterId.startsWith('http') ? chapterId : `${BASE_URL}${chapterId}`;
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2' });

            const images = await page.evaluate(() => {
                const imgs = document.querySelectorAll('img.chapter-image, div[class*="reader"] img');
                return Array.from(imgs).map(img => img.getAttribute('src') || '').filter(src => src);
            });

            return images;
        } catch (error: any) {
            console.error(`[WeebDex] Images error for ${chapterId}:`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    }
};
