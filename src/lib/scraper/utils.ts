/**
 * Utility to filter out fake ad pages and deceptive images from manga chapters.
 */

const SUSPICIOUS_DOMAINS = [
    'ad-server.com',
    'click-me.net',
    'promo-banners.com',
    'fake-manga.xyz',
    'affiliate-tracking.io'
];

const CREDITS_PATTERNS = [
    /join.*discord/i,
    /translated.*by/i,
    /donat.*to/i,
    /visit.*our.*site/i,
    /click.*to.*read.*more/i
];

/**
 * Filter an array of image URLs to remove suspicious ones.
 */
export function filterChapterImages(images: string[]): string[] {
    return images.filter(url => {
        if (!url) return false;

        // 1. Domain Check
        const isAdDomain = SUSPICIOUS_DOMAINS.some(domain => url.toLowerCase().includes(domain));
        if (isAdDomain) return false;

        // 2. Placeholder/Tracker Check
        if (url.includes('pixel') || url.includes('tracking') || url.includes('1x1')) return false;

        return true;
    });
}

/**
 * Heuristically detect if a chapter entry might be a fake "Ad" or "Special" result 
 * that isn't actual story content.
 */
/**
 * Heuristically detect if a chapter entry might be a fake "Ad" or "Special" result 
 * that isn't actual story content.
 */
export function isFakeChapter(title: string): boolean {
    const fakeIndicators = [
        'special offer',
        'free coins',
        'read here for free',
        'updated promo',
        'discord join'
    ];

    const lowerTitle = title.toLowerCase();
    return fakeIndicators.some(indicator => lowerTitle.includes(indicator));
}

// --- SANITIZATION LAYER ---

/**
 * Detects if a page is a trap/redirect page (Meta refresh, window.location).
 */
export function isRedirectPage(html: string): boolean {
    const lower = html.toLowerCase();
    // 1. Meta Refresh
    if (lower.includes('<meta http-equiv="refresh"')) return true;
    // 2. Aggressive JS Redirects (simple heuristic)
    if (lower.includes('window.location.replace') || lower.includes('window.location.href =')) {
        // Only reject if it looks like an immediate redirect script without much content
        if (html.length < 2000) return true;
    }
    return false;
}

/**
 * Normalizes relative URLs and ensures secure protocols.
 * Returns null if invalid or blacklist.
 */
export function sanitizeUrl(url: string | undefined, baseUrl: string): string | null {
    if (!url) return null;
    let clean = url.trim();

    // 1. Strip whitespace/garbage
    clean = clean.replace(/[\n\t\r]/g, '');

    // 2. Handle Protocol-relative //
    if (clean.startsWith('//')) {
        clean = `https:${clean}`;
    }

    // 3. Handle Root-relative /
    if (clean.startsWith('/')) {
        // Remove trailing slash from base if present
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        clean = `${base}${clean}`;
    }

    // 4. Handle completely relative "foo.jpg" (rare but possible)
    if (!clean.startsWith('http')) {
        const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        clean = `${base}${clean}`;
    }

    // 5. Final Validations
    if (!clean.startsWith('http')) return null;

    // 6. Blacklist Check (Ad domains, etc.)
    const SUSPICIOUS = [
        'ad-server', 'tracker', 'pixel', 'banner', 'analytics'
    ];
    if (SUSPICIOUS.some(s => clean.includes(s))) return null;

    return clean;
}

// --- PROTECTION SYSTEM ---
// --- PROTECTION SYSTEM ---

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

const REFERERS = [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://search.yahoo.com/'
];

// Simple in-memory cache (Soft Caching) to avoid slamming server
// Map<URL, { data: string, timestamp: number }>
const REQUEST_CACHE = new Map<string, { data: string, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced fetch with Anti-Ban protections & Puppeteer Fallback:
 * 1. Native Fetch with Header Rotation
 * 2. Fallback to Puppeteer for Cloudflare/JS Challenges
 * 3. Caching and Throttling
 */
export async function fetchPage(url: string, options: RequestInit = {}): Promise<string> {
    // 1. Check Cache
    const cached = REQUEST_CACHE.get(url);
    if (cached) {
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[Cache] Hit for ${url}`);
            return cached.data;
        } else {
            REQUEST_CACHE.delete(url); // Expired
        }
    }

    // 2. Randomized Delay
    const delay = Math.floor(Math.random() * 800) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 3. Header Rotation
    const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const randomReferer = REFERERS[Math.floor(Math.random() * REFERERS.length)];

    const headers = {
        'User-Agent': randomAgent,
        'Referer': randomReferer,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
    };

    // Timeout for standard fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for fetch

    try {
        console.log(`[Fetch] Attempting enhanced fetch: ${url}`);
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check for Cloudflare 403/503 or successful 200
        if (!response.ok && response.status !== 403 && response.status !== 503) {
            throw new Error(`Fetch failed with status: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();

        // 4. Validate Content (Redirect trap & Cloudflare check & 403/503 content)
        const isCloudflare = response.status === 403 || response.status === 503 ||
            text.includes('Just a moment...') ||
            text.includes('Checking your browser') ||
            (isRedirectPage(text) && !url.includes('google')); // Basic check

        if (isCloudflare) {
            console.warn(`[Protection] Cloudflare/Protection detected for ${url}. Switching to Puppeteer...`);
            return await fetchWithPuppeteer(url, randomAgent);
        }

        // 5. Update Cache
        cacheResponse(url, text);
        return text;

    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError' || error.message.includes('fetch failed')) {
            console.warn(`[Fetch] Failed (${error.message}). Retrying with Puppeteer...`);
            try {
                return await fetchWithPuppeteer(url, randomAgent);
            } catch (pError: any) {
                logScraperError(url, pError.message, 'fetchPage+Puppeteer');
                throw error;
            }
        }

        logScraperError(url, error.message, 'fetchPage');
        throw error;
    }
}

async function fetchWithPuppeteer(url: string, userAgent: string): Promise<string> {
    const puppeteerGen = await getPuppeteer();
    if (!puppeteerGen || !puppeteerGen.default) {
        throw new Error("Puppeteer not available");
    }
    const puppeteer = puppeteerGen.default;

    // Launch lighter browser
    const browser = await puppeteer.launch({
        headless: true, // "new" is default in newer versions, but boolean is widely supported
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
        defaultViewport: { width: 1280, height: 720 }
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        // Block heavy resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Navigate with generous timeout
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for Cloudflare to pass (if any)
        try {
            await page.waitForSelector('body', { timeout: 15000 });
            // If we see "Just a moment", wait more?
            // Usually domcontentloaded is enough for the challenge script to start runnning
            // We might need to wait for a specific element that indicates success or just wait existing
            await new Promise(r => setTimeout(r, 3000)); // 3s grace period for JS redirects
        } catch (e) { }

        const content = await page.content();

        // Double check we bypassed
        if (content.includes('Just a moment...') || content.includes('Checking your browser')) {
            throw new Error('Puppeteer failed to bypass Cloudflare');
        }

        cacheResponse(url, content);
        return content;
    } finally {
        await browser.close();
    }
}

function cacheResponse(url: string, data: string) {
    if (REQUEST_CACHE.size > 100) {
        const firstKey = REQUEST_CACHE.keys().next().value;
        if (firstKey) REQUEST_CACHE.delete(firstKey);
    }
    REQUEST_CACHE.set(url, { data, timestamp: Date.now() });
}

// --- LOGGING SYSTEM ---
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function logScraperError(url: string, error: string, context: string, sourceId: string = 'unknown') {
    // Minimal persistent logging
    if (db) {
        try {
            await addDoc(collection(db, 'scraper_errors'), {
                sourceId,
                url,
                error,
                context,
                timestamp: Date.now(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
            });
        } catch (e) {
            // Fail silently to not impact user experience
        }
    }
}
