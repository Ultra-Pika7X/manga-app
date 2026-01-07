"use client";

import { useUpdateChecker } from '@/hooks/useUpdateChecker';

// Invisible component to run the update checker hook globally
export default function AutoDownloader() {
    useUpdateChecker();
    return null;
}
