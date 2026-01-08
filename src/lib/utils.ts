
export const getProxyUrl = (url: string) => {
    if (!url) return '';
    // If it's already a proxied URL or local, return as is
    if (url.startsWith('/')) return url;

    // Bypass proxy and use direct URL with no-referrer policy on client
    return url;
};

// Utility for merging classNames (inspired by shadcn/clsx)
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
