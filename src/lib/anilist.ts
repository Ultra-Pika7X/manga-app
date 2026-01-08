// Use local proxy on client to avoid CORS, direct on server
const IS_CLIENT = typeof window !== 'undefined';
export const ANILIST_API_URL = IS_CLIENT ? '/api/anilist' : 'https://graphql.anilist.co';

// TODO: Replace with your Client ID from https://anilist.co/settings/developer
// User will provide this.
export const CLIENT_ID = '24967'; // Default placeholder or user provided? I'll use a placeholder.
// Actually, I can leave it as a variable string to be replaced.
// For now, I'll use a placeholder and instruct the user.

export interface AniListMedia {
    id: number;
    title: {
        romaji: string;
        english: string;
        native: string;
    };
    coverImage: {
        large: string;
        extraLarge?: string;
    };
    description?: string;
    siteUrl: string;
    status?: string;
    genres?: string[];
    averageScore?: number;
    meanScore?: number;
    popularity?: number;
    trending?: number;
    updatedAt?: number;
    chapters?: number;
    volumes?: number;
    isAdult?: boolean;
    format?: string;
}

export interface Recommendation {
    id: number;
    media: AniListMedia;
    mediaRecommendation: AniListMedia;
}

export interface BrowseOptions {
    sort?: string[];
    genres?: string[];
    status?: string;
    search?: string;
    page?: number;
    perPage?: number;
    season?: string;
    seasonYear?: number;
    isAdult?: boolean;
}

export interface PageInfo {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
}

export interface BrowseResult {
    pageInfo: PageInfo;
    media: AniListMedia[];
}

export interface AniListUser {
    id: number;
    name: string;
    avatar: {
        large: string;
    };
}

/**
 * Perform a fuzzy search for manga on AniList, returning multiple candidates.
 */
export async function searchManga(query: string, token?: string): Promise<AniListMedia[]> {
    const searchQuery = `
    query ($search: String) {
      Page (perPage: 10) {
        media (search: $search, type: MANGA) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          description
          siteUrl
          status
        }
      }
    }
    `;

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: searchQuery,
                variables: { search: query }
            })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('AniList Search Error:', data.errors);
            return [];
        }

        return data.data?.Page?.media || [];
    } catch (e) {
        console.error('AniList Request Failed:', e);
        return [];
    }
}

/**
 * Fetch detailed information for a single AniList media item by its ID.
 */
export async function getMediaById(id: number | string): Promise<AniListMedia | null> {
    const query = `
    query ($id: Int) {
      Media (id: $id, type: MANGA) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          extraLarge
        }
        description
        siteUrl
        status
        genres
        averageScore
        popularity
        chapters
        volumes
      }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            next: { revalidate: 86400 }, // Cache media details for 24h
            body: JSON.stringify({
                query,
                variables: { id: typeof id === 'string' ? parseInt(id) : id }
            })
        });

        const data = await response.json();
        if (data.errors) return null;
        return data.data?.Media || null;
    } catch (e) {
        console.error('AniList getMediaById Failed:', e);
        return null;
    }
}

/**
 * Universal browse method for AniList Manga.
 * Supports sorting, filtering, and pagination.
 */
export async function browseManga(options: BrowseOptions): Promise<BrowseResult> {
    const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $genres: [String], $status: MediaStatus, $search: String, $season: MediaSeason, $seasonYear: Int, $isAdult: Boolean) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          perPage
          currentPage
          lastPage
          hasNextPage
        }
        media(
          type: MANGA,
          sort: $sort,
          genre_in: $genres,
          status: $status,
          search: $search,
          season: $season,
          seasonYear: $seasonYear,
          isAdult: $isAdult
        ) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          description
          status
          genres
          averageScore
          popularity
          popularity
          trending
          updatedAt
        }
      }
    }
    `;

    const variables = {
        page: options.page || 1,
        perPage: options.perPage || 20,
        sort: options.sort || ['TRENDING_DESC', 'POPULARITY_DESC'],
        genres: options.genres,
        status: options.status,
        search: options.search,
        season: options.season,
        seasonYear: options.seasonYear,
        isAdult: options.isAdult ?? false
    };

    try {
        // Higher revalidation for trending/popular (1h), lower for filtered searches (10m)
        const revalidate = (options.sort?.includes('TRENDING_DESC') || options.sort?.includes('POPULARITY_DESC')) && !options.search
            ? 3600
            : 600;

        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            next: { revalidate },
            body: JSON.stringify({ query, variables })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('AniList Browse Error:', data.errors);
            return { pageInfo: { total: 0, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] };
        }

        return data.data?.Page || { pageInfo: { total: 0, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] };
    } catch (e) {
        console.error('AniList Browse Failed:', e);
        return { pageInfo: { total: 0, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [] };
    }
}

/**
 * Fetch available genres from AniList.
 */
export async function getGenres(): Promise<string[]> {
    const query = `query { GenreCollection }`;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            next: { revalidate: 86400 }, // Cache genres for 24h
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        return data.data?.GenreCollection || [];
    } catch (e) {
        return [];
    }
}

/**
 * Utility to convert AniList Media to our standard Manga format.
 */
import { Manga } from './scraper/types';

export function convertAniListToManga(media: AniListMedia): Manga {
    return {
        id: media.id.toString(),
        title: media.title.english || media.title.romaji || media.title.native,
        cover: media.coverImage.extraLarge || media.coverImage.large,
        description: media.description?.replace(/<[^>]*>?/gm, '') || '', // Strip HTML
        status: media.status,
        sourceId: 'anilist' // Marker for late-binding source mapping
    };
}

/**
 * Update reading progress for a media item.
 */
export async function updateProgress(mediaId: number, progress: number, token: string) {
    const mutation = `
    mutation ($mediaId: Int, $progress: Int) {
        SaveMediaListEntry (mediaId: $mediaId, progress: $progress, status: CURRENT) {
            id
            progress
            status
        }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: mutation,
                variables: { mediaId, progress }
            })
        });

        const data = await response.json();
        if (data.errors) {
            console.error('AniList Update Error:', data.errors);
            return false;
        }
        return true;
    } catch (e) {
        console.error('AniList Update Failed:', e);
        return false;
    }
}

/**
 * Get current authenticated user viewer.
 */
export async function getViewer(token: string): Promise<AniListUser | null> {
    const query = `
    query {
        Viewer {
            id
            name
            avatar {
                large
            }
        }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }

        const data = await response.json();
        if (data.errors) return null;
        return data.data.Viewer;
    } catch (e: any) {
        if (e.message === 'UNAUTHORIZED') throw e;
        console.error('AniList getViewer Failed:', e);
        // Return null for other errors (network etc) but do not throw
        // ACTUALLY: we want to throw so context knows it failed.
        // But if we return null, context thinks "invalid".
        // Let's THROW for everything, and handle in Context.
        throw e;
    }
}

/**
 * Get user's manga list from AniList.
 */
export async function getUserList(userId: number, token: string): Promise<any[]> {
    const query = `
    query ($userId: Int) {
        MediaListCollection(userId: $userId, type: MANGA) {
            lists {
                entries {
                    id
                    progress
                    status
                    media {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        coverImage {
                            large
                        }
                        chapters
                        status
                    }
                }
            }
        }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { userId }
            })
        });

        const data = await response.json();
        if (data.errors) {
            console.error('AniList getUserList Error:', data.errors);
            return [];
        }

        // Flatten all entries from all lists
        const lists = data.data?.MediaListCollection?.lists || [];
        const allEntries: any[] = [];
        lists.forEach((list: any) => {
            allEntries.push(...(list.entries || []));
        });

        return allEntries;
    } catch (e) {
        console.error('AniList getUserList Failed:', e);
        return [];
    }
}



/**
 * Fetch personalized recommendations for a user.
 * Note: AniList API has a Recommendation connection on Page, but it's often general.
 * For user specific, we might rely on the "Recommendation" query if available, or just general Recs.
 * Actually, Page -> recommendations(sort: [RATING_DESC, ID_DESC]) gives general recommendations.
 * For "Recommended for You", without sophisticated ML, we can use general high-rated recommendations
 * or if logged in, filter by user's fav genres (client side logic).
 * Let's implement a general getRecommendations first.
 */
export async function getRecommendations(page: number = 1, perPage: number = 20): Promise<AniListMedia[]> {
    const query = `
    query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
            recommendations(sort: [RATING_DESC, ID_DESC]) {
                mediaRecommendation {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage {
                        large
                        extraLarge
                    }
                    averageScore
                    popularity
                    status
                    description
                    chapters
                }
            }
        }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 },
            body: JSON.stringify({
                query,
                variables: { page, perPage }
            })
        });

        const data = await response.json();
        const recs = data.data?.Page?.recommendations || [];
        return recs.map((r: any) => r.mediaRecommendation).filter((m: any) => m);
    } catch (e) {
        console.error('AniList Recommendations Failed:', e);
        return [];
    }
}
