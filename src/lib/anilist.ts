export const ANILIST_API_URL = 'https://graphql.anilist.co';

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
    };
    siteUrl: string;
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
export async function searchManga(query: string, token: string): Promise<AniListMedia[]> {
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
          }
          siteUrl
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
        const data = await response.json();
        if (data.errors) return null;
        return data.data.Viewer;
    } catch (e) {
        return null;
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

