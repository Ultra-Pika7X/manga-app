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
import axios, { AxiosRequestConfig } from 'axios';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const REFERERS = [
    'https://google.com/',
    'https://bing.com/',
    'https://duckduckgo.com/',
    'https://twitter.com/'
];

// Simple in-memory cache (Soft Caching) to avoid slamming server
// Map<URL, { data: any, timestamp: number }>
const REQUEST_CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Enhanced fetch with Anti-Ban protections:
 * 1. Header Rotation (User-Agent)
 * 2. Randomized Delays (Human Mimicry)
 * 3. Soft Caching (Reduce Requests)
 * 4. Request Throttling (Implied by wait)
 */
export async function fetchPage(url: string, options: AxiosRequestConfig = {}): Promise<any> {
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

    // 2. Randomized Delay (Throttling / Human Mimicry)
    // Wait between 500ms and 1500ms
    const delay = Math.floor(Math.random() * 1000) + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 3. Header Rotation
    const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const randomReferer = REFERERS[Math.floor(Math.random() * REFERERS.length)];

    try {
        const response = await axios.get(url, {
            ...options,
            headers: {
                'User-Agent': randomAgent,
                'Referer': randomReferer, // Sometimes overridden by source specific referer
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                ...options.headers // Allow override
            },
            timeout: 15000 // Extended timeout
        });

        // 4. Update Cache (Only successful responses)
        if (response.status === 200) {
            // Validate Content (Redirect detection)
            if (typeof response.data === 'string' && isRedirectPage(response.data)) {
                console.warn(`[Suspicious] Redirect trap detected for ${url}`);
                // Don't cache, don't return valid data (or empty string/throw?)
                // Throwing allows scrapers to catch and handle or fail gracefully
                throw new Error('Redirect trap detected');
            }

            // Prune cache if too big to avoid memory leaks
            if (REQUEST_CACHE.size > 100) {
                const firstKey = REQUEST_CACHE.keys().next().value;
                if (firstKey) REQUEST_CACHE.delete(firstKey);
            }

            REQUEST_CACHE.set(url, {
                data: response.data,
                timestamp: Date.now()
            });
        }

        return response.data;
    } catch (error: any) {
        // Log failure
        logScraperError(url, error.message, 'fetchPage');
        throw error;
    }
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
