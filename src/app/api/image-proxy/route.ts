
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL', { status: 400 });
    }

    try {
        // Parse the URL to determine the referer
        // For Mangakakalot / Manganato, we need specific referers
        let referer = 'https://mangakakalot.com';
        if (url.includes('chapmanganato.to')) {
            referer = 'https://chapmanganato.to';
        } else if (url.includes('mangakakalot.com')) {
            referer = 'https://mangakakalot.com';
        }

        const response = await fetch(url, {
            headers: {
                'Referer': referer,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                // Some servers check for Accept header
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });

        if (!response.ok) {
            console.error(`Proxy failed for ${url}: ${response.status} ${response.statusText}`);
            return new NextResponse('Failed to fetch image', { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=2592000'); // Cache for 30 days

        return new NextResponse(buffer, {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
