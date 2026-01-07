import * as cheerio from 'cheerio';

interface ValidationResult {
    isValid: boolean;
    score: number;
    reason?: string;
}

/**
 * Validates the DOM structure of a potential manga page.
 * Detects "Fake Ad Pages" masquerading as content.
 */
export function validateDom($: cheerio.CheerioAPI, containerSelector?: string): ValidationResult {
    let score = 100;

    // 1. Text Density Check
    // A manga page should have low text density relative to its structure, 
    // especially in the reading area.
    const bodyText = $('body').text().trim().length;
    const bodyHtml = $('body').html()?.length || 1;
    const textDensity = bodyText / bodyHtml;

    // If text density is suspiciously high (e.g. > 50% of bytes are text), it might be a blog/article/ad page
    // Normal manga pages are mostly HTML tags + scripts + images, very little visible text.
    if (textDensity > 0.45) {
        score -= 40;
    }

    // 2. Outbound Link Density in Content Area
    // If a specific container is provided, check it. Otherwise check body.
    const scope = containerSelector ? $(containerSelector) : $('body');
    const links = scope.find('a[href^="http"]');
    const images = scope.find('img');

    // Safety check: specific container might not exist
    if (containerSelector && scope.length === 0) {
        // If the expected container is missing, that's a huge red flag
        return { isValid: false, score: 0, reason: 'Missing Content Container' };
    }

    if (images.length === 0) {
        score -= 50; // Heavily penalize no images
    }

    if (links.length > 20 && links.length > images.length * 2) {
        score -= 30; // More links than images is suspicious for a reader
    }

    // 3. Keyword Heuristics
    const pageText = $('body').text().toLowerCase();
    const badKeywords = ['read for free here', 'dating', 'singles', 'casino', 'betting'];
    const hits = badKeywords.filter(w => pageText.includes(w)).length;
    score -= (hits * 10);

    return {
        isValid: score > 50,
        score,
        reason: score <= 50 ? 'Low Layout Score' : undefined
    };
}

/**
 * Validates the final set of extracted images.
 */
export function validateImageSet(images: string[]): ValidationResult {
    let score = 100;

    // 1. Empty Check
    if (images.length === 0) {
        return { isValid: false, score: 0, reason: 'Empty Image Set' };
    }

    // 2. Count Check
    // A chapter usually has at least 3-4 images. 1 image is suspicious (unless One-shot or art).
    if (images.length < 3) {
        score -= 30;
    }

    // 3. Repetition Check
    // If > 50% of images are identical URLs, it's likely a broken scraper or ad loop.
    const unique = new Set(images);
    const uniqueRatio = unique.size / images.length;
    if (uniqueRatio < 0.5) {
        score -= 50;
    }

    // 4. URL Quality (Deep Check)
    // If many images have "pixel" or "icon" in name, penalize
    const lowQualityCount = images.filter(url =>
        url.includes('thumb') || url.includes('avatar') || url.includes('icon')
    ).length;

    if (lowQualityCount > images.length / 2) {
        score -= 40;
    }

    return {
        isValid: score > 60,
        score,
        reason: score <= 60 ? 'Low Image Quality' : undefined
    };
}
