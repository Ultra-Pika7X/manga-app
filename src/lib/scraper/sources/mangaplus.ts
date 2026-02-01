import { Manga, MangaDetails, MangaSource } from '../types';
import puppeteer from 'puppeteer';

export const MangaPlusSource: MangaSource = {
    id: "mangaplus",
    name: "MangaPlus",

    async getUpdates(): Promise<Manga[]> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto(`https://mangaplus.shueisha.co.jp/updates`, { waitUntil: 'networkidle0' });

            await page.waitForSelector('a[href^="/titles/"]', { timeout: 10000 });

            const updates = await page.evaluate(() => {
                const results: any[] = [];
                // Updates page structure
                document.querySelectorAll('a[href^="/titles/"]').forEach((link) => {
                    const container = link.closest('div'); // Adjust as needed
                    const title = container?.querySelector('.title-text')?.textContent || link.textContent; // adjust selector
                    const img = container?.querySelector('img')?.src;

                    if (link && title) {
                        const href = link.getAttribute('href');
                        const id = href?.split('/').pop();
                        if (id) {
                            results.push({
                                id,
                                title: title?.trim(),
                                cover: img || '',
                                sourceId: 'mangaplus',
                                status: 'Ongoing'
                            });
                        }
                    }
                });
                return results.slice(0, 20); // Limit to 20
            });
            return updates;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            await browser.close();
        }
    },

    async search(query: string): Promise<Manga[]> {
        // Search functionality on MangaPlus is usually via search bar which results in client-side filtering or a search page.
        // For now, we'll try to use Puppeteer to search.
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto(`https://mangaplus.shueisha.co.jp/search_result?keyword=${encodeURIComponent(query)}`, { waitUntil: 'networkidle0' });

            // Wait for results
            await page.waitForSelector('.Title', { timeout: 10000 }); // Assuming .Title is used

            const mangas = await page.evaluate(() => {
                const results: any[] = [];
                // This selector needs to be verified.
                document.querySelectorAll('.Title').forEach((el) => {
                    const link = el.querySelector('a');
                    const title = el.querySelector('.Title-text')?.textContent;
                    const img = el.querySelector('img')?.src;

                    if (link && title) {
                        const href = link.getAttribute('href');
                        const id = href?.split('/').pop();
                        if (id) {
                            results.push({
                                id,
                                title: title.trim(),
                                cover: img || '',
                                sourceId: 'mangaplus'
                            });
                        }
                    }
                });
                return results;
            });
            return mangas;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            await browser.close();
        }
    },

    async getMangaDetails(mangaId: string): Promise<MangaDetails | null> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto(`https://mangaplus.shueisha.co.jp/titles/${mangaId}`, { waitUntil: 'networkidle0' });

            // Wait for title
            await page.waitForSelector('h1', { timeout: 10000 });

            const details = await page.evaluate(async (mangaId) => {
                const title = document.querySelector('h1')?.textContent || '';

                let cover = document.querySelector('.TitleDetail-cover img')?.getAttribute('src') || '';
                if (cover.startsWith('blob:')) {
                    try {
                        const response = await fetch(cover);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        const base64Promise = new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result);
                        });
                        reader.readAsDataURL(blob);
                        cover = await base64Promise as string;
                    } catch (e) {
                        console.error('Failed to convert cover blob:', e);
                    }
                }

                const description = document.querySelector('.TitleDetail-overview-content')?.textContent || '';
                const author = document.querySelector('.TitleDetail-author')?.textContent || '';

                const chapters: any[] = [];
                document.querySelectorAll('a[href*="/viewer/"]').forEach((link) => {
                    const titleElement = link.closest('div')?.querySelector('p'); // Heuristic
                    const title = titleElement?.textContent || link.textContent;
                    const date = "Unknown";

                    if (link && title) {
                        const href = link.getAttribute('href');
                        const id = href?.split('/').pop();
                        if (id) {
                            chapters.push({
                                id,
                                title: title?.trim(),
                                publishAt: date,
                                sourceId: 'mangaplus'
                            });
                        }
                    }
                });

                return {
                    manga: {
                        id: mangaId,
                        title: title.trim(),
                        cover,
                        description: description.trim(),
                        author: author.trim(),
                        sourceId: 'mangaplus'
                    },
                    chapters
                };
            }, mangaId);

            return details;
        } catch (e) {
            console.error(e);
            return null;
        } finally {
            await browser.close();
        }
    },

    async getChapterImages(chapterId: string): Promise<string[]> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        try {
            await page.goto(`https://mangaplus.shueisha.co.jp/viewer/${chapterId}`, { waitUntil: 'networkidle0' });

            // Wait for images
            await page.waitForSelector('img', { timeout: 10000 });

            const images = await page.evaluate(async () => {
                const imgElements = Array.from(document.querySelectorAll('img'));
                const results = [];

                for (const img of imgElements) {
                    const src = img.src;
                    if (src.startsWith('blob:')) {
                        try {
                            const response = await fetch(src);
                            const blob = await response.blob();
                            const reader = new FileReader();
                            const base64Promise = new Promise((resolve) => {
                                reader.onloadend = () => resolve(reader.result);
                            });
                            reader.readAsDataURL(blob);
                            const base64 = await base64Promise;
                            if (typeof base64 === 'string') {
                                results.push(base64);
                            }
                        } catch (e) {
                            console.error('Failed to convert blob:', e);
                        }
                    } else if (src.includes('mangaplus')) {
                        results.push(src);
                    }
                }
                return results;
            });

            return images;

            // Note: MangaPlus uses blobs created from canvas/scrambled images.
            // We might not get the original URL easily.
            // If they are blobs, we need to extract the data or take screenshot? No, users want to read or download.
            // If blobs, we can try to fetch the image data as base64.

            return images;
        } catch (e) {
            console.error(e);
            return [];
        } finally {
            await browser.close();
        }
    }
};
