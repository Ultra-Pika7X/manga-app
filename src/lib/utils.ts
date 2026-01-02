
export const getProxyUrl = (url: string) => {
    if (!url) return '';
    // If it's already a proxied URL or local, return as is
    if (url.startsWith('/')) return url;

    // Bypass proxy and use direct URL with no-referrer policy on client
    return url;
};
