
import puppeteer from 'puppeteer';

async function test() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        console.log('Navigating to MangaPlus updates...');
        await page.goto('https://mangaplus.shueisha.co.jp/updates', { waitUntil: 'networkidle0' });

        // Wait for content to load
        // MangaPlus uses specific class names or structure. Let's dump the HTML structure or look for common selectors.
        // Inspecting MangaPlus source reveals they use a lot of dynamic classes.
        // Let's try to find any link to a title.

        await page.waitForSelector('a[href^="/titles/"]', { timeout: 10000 });

        const updates = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href^="/titles/"]'));
            return links.slice(0, 5).map(link => ({
                title: link.textContent?.trim(),
                href: link.getAttribute('href')
            }));
        });

        console.log('Latest Updates:', updates);

        if (updates.length > 0 && updates[0].href) {
            const mangaUrl = `https://mangaplus.shueisha.co.jp${updates[0].href}`;
            console.log(`Navigating to manga details: ${mangaUrl}`);
            await page.goto(mangaUrl, { waitUntil: 'networkidle0' });

            // Wait for chapter list
            await page.waitForSelector('a[href^="/viewer/"]', { timeout: 10000 });

            const chapters = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href^="/viewer/"]'));
                return links.slice(0, 3).map(link => ({
                    text: link.textContent?.trim(),
                    href: link.getAttribute('href')
                }));
            });

            console.log('Chapters found:', chapters);

            if (chapters.length > 0 && chapters[0].href) {
                const viewerUrl = `https://mangaplus.shueisha.co.jp${chapters[0].href}`;
                console.log(`Navigating to viewer: ${viewerUrl}`);
                await page.goto(viewerUrl, { waitUntil: 'networkidle0' });

                // Wait for images
                // MangaPlus viewer usually loads images in a specific container.
                await page.waitForSelector('img', { timeout: 10000 });

                const images = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('img')).map(img => img.src);
                });

                console.log('Images found:', images.length);
                console.log('First 3 image URLs:', images.slice(0, 3));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

test();
