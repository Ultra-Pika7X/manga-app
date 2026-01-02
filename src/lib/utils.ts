
export const getProxyUrl = (url: string) => {
    if (!url) return '';
    // If it's already a proxied URL or local, return as is
    if (url.startsWith('/')) return url;

    // Use internal API proxy which handles Referer headers correctly for Mangakakalot
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};
