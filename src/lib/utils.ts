
export const getProxyUrl = (url: string) => {
    if (!url) return '';
    // If it's already a proxied URL or local, return as is
    if (url.startsWith('/')) return url;

    // Use our image proxy API to bypass hotlinking protection
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};
