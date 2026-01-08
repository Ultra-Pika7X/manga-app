"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getProxyUrl } from '@/lib/utils';
import { Loader, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterPageProps {
    src: string;
    index: number;
    containerClass?: string;
    imageClass?: string;
    onLoad?: () => void;
    onVisible?: (index: number) => void;
    containerMaxWidth?: string;
    imageWidth?: string;
}

const IMAGE_STATUS = {
    LOADING: 'loading',
    RETRYING: 'retrying',
    LOADED: 'loaded',
    ERROR: 'error',
} as const;

type ImageStatus = typeof IMAGE_STATUS[keyof typeof IMAGE_STATUS];

/**
 * ChapterPage component - Adapted from Seanime
 * 
 * Handles individual page rendering with:
 * - Loading spinner
 * - Automatic retry on error (up to 3 times)
 * - Manual retry button
 * - Visibility detection for progress tracking
 */
export function ChapterPage({
    src,
    index,
    containerClass = '',
    imageClass = '',
    onLoad,
    onVisible,
    containerMaxWidth,
    imageWidth,
}: ChapterPageProps) {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<ImageStatus>(IMAGE_STATUS.LOADING);
    const retriesRef = useRef(0);

    const isLoading = status === IMAGE_STATUS.LOADING || status === IMAGE_STATUS.RETRYING;
    const hasError = status === IMAGE_STATUS.ERROR;
    const isLoaded = status === IMAGE_STATUS.LOADED;

    // Retry logic
    const retry = useCallback(() => {
        retriesRef.current = 0;
        setStatus(IMAGE_STATUS.LOADING);
        if (imgRef.current) {
            const currentSrc = imgRef.current.src;
            imgRef.current.src = '';
            setTimeout(() => {
                if (imgRef.current) {
                    imgRef.current.src = currentSrc;
                }
            }, 100);
        }
    }, []);

    // Image event handlers
    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        // Check if already loaded from cache
        if (img.complete && img.naturalWidth > 0) {
            setStatus(IMAGE_STATUS.LOADED);
            onLoad?.();
            return;
        }

        const handleLoad = () => {
            setStatus(IMAGE_STATUS.LOADED);
            onLoad?.();
        };

        const handleError = () => {
            if (retriesRef.current >= 3) {
                setStatus(IMAGE_STATUS.ERROR);
                return;
            }

            setStatus(IMAGE_STATUS.RETRYING);
            retriesRef.current++;

            setTimeout(() => {
                if (img) {
                    const currentSrc = img.src;
                    img.src = '';
                    img.src = currentSrc;
                }
            }, 1000 * retriesRef.current); // Exponential backoff
        };

        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);

        return () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
        };
    }, [src, onLoad]);

    // Visibility detection for vertical scroll mode
    useEffect(() => {
        if (!containerRef.current || !onVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onVisible(index);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [index, onVisible]);

    const resolvedSrc = src.startsWith('blob:') ? src : getProxyUrl(src);

    return (
        <div
            ref={containerRef}
            id={`page-${index}`}
            className={cn(
                'relative min-h-[200px] focus-visible:outline-none',
                containerClass
            )}
            style={{ maxWidth: containerMaxWidth }}
            tabIndex={-1}
        >
            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/20">
                    <Loader className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            )}

            {/* Error State with Retry */}
            {hasError && (
                <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center bg-black/50">
                    <p className="text-gray-400 mb-4">Failed to load page {index + 1}</p>
                    <button
                        onClick={retry}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                    >
                        <RotateCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            )}

            {/* Image */}
            <img
                ref={imgRef}
                src={resolvedSrc}
                alt={`Page ${index + 1}`}
                className={cn(
                    'select-none focus-visible:outline-none',
                    hasError && 'opacity-30',
                    imageClass
                )}
                style={{ width: imageWidth }}
                loading="lazy"
                decoding="async"
                tabIndex={-1}
            />
        </div>
    );
}
