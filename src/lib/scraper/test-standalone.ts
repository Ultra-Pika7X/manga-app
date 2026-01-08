
import puppeteer from 'puppeteer';

// Mock values
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

async function fetchWithPuppeteer(url: string) {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENTS[0]);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit
        await new Promise(r => setTimeout(r, 3000));

        const content = await page.content();
        return content;
    } finally {
        await browser.close();
    }
}

async function test() {
    const url = 'https://mangasee123.com/search/?name=One%20Piece';
    console.log(`Testing URL: ${url}`);

    // 1. Try Native Fetch
    try {
        console.log('Attempting native fetch...');
        const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENTS[0] }
        });
        const text = await res.text();

        if (text.includes('Just a moment') || text.includes('Checking your browser') || res.status === 403) {
            console.log('Native fetch BLOCKED or challenged.');
            // Fallback
            console.log('Falling back to Puppeteer...');
            const pContent = await fetchWithPuppeteer(url);
            if (pContent.includes('One Piece')) {
                console.log('Puppeteer SUCCESS! Found "One Piece" in content.');
            } else {
                console.log('Puppeteer finished but content suspect.');
                console.log('Snippet:', pContent.substring(0, 200));
            }
        } else {
            console.log('Native fetch SUCCESS!');
            if (text.includes('One Piece')) {
                console.log('Content verified (contains "One Piece").');
            } else {
                console.log('Content suspect (no "One Piece").');
            }
        }

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

test();
