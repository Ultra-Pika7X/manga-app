
import { NextResponse } from 'next/server';

const ANILIST_API_URL = 'https://graphql.anilist.co';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const authHeader = request.headers.get('Authorization');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('AniList Proxy Error:', error);
        return NextResponse.json({ errors: [{ message: error.message }] }, { status: 500 });
    }
}
