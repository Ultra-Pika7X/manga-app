
export const getProxyUrl = (url: string) => {
    if (!url) return '';
    // If it's already a proxied URL or local, return as is
    if (url.startsWith('/')) return url;

    // Use wsrv.nl as an image proxy
    // It handles hotlink protection and SSL
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};
