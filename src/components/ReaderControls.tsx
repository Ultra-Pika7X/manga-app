"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Maximize, Minimize, Download, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from '@/hooks/useHistory';

interface ReaderControlsProps {
    images: string[];
    chapterId: string;
    mangaId: string;
    mangaTitle: string;
    chapterTitle: string;
    cover: string;
}

export default function ReaderControls({
    images,
    chapterId,
    mangaId,
    mangaTitle,
    chapterTitle,
    cover
}: ReaderControlsProps) {
    const { addToHistory } = useHistory();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        addToHistory({
            id: chapterId,
            mangaId,
            mangaTitle,
            chapterTitle,
            cover
        });
    }, [chapterId, mangaId]);
    const [showControls, setShowControls] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light' | 'cloudy'>('dark');
    const containerRef = useRef<HTMLDivElement>(null);
    let controlsTimeout: NodeJS.Timeout;

    // Handle fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-hide controls
    const resetControlsTimeout = () => {
        setShowControls(true);
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => setShowControls(false), 3000);
    };

    useEffect(() => {
        window.addEventListener('mousemove', resetControlsTimeout);
        window.addEventListener('touchstart', resetControlsTimeout);
        resetControlsTimeout(); // Initial start
        return () => {
            window.removeEventListener('mousemove', resetControlsTimeout);
            window.removeEventListener('touchstart', resetControlsTimeout);
            clearTimeout(controlsTimeout);
        };
    }, []);

    // Theme styles
    const getBgColor = () => {
        switch (theme) {
            case 'light': return 'bg-gray-100';
            case 'cloudy': return 'bg-[#1a1a2e]'; // Matches global cloudy
            case 'dark': default: return 'bg-black';
        }
    };

    // Download handler (Client-side zip generation mockup)
    const handleDownload = async () => {
        // Real implementation requires JSZip or similar.
        // For now, we will just open a new tab with the first image as a placeholder or alert.
        alert(`Downloading ${images.length} pages... (This would generate a ZIP file in full implementation)`);
        // We could fetch blobs and zip them here.
    };

    return (
        <div
            ref={containerRef}
            className={`min-h-screen relative transition-colors duration-300 ${getBgColor()}`}
        >
            {/* Top Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 w-full p-4 z-50 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center"
                    >
                        <Link href="/" className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>

                        <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-md rounded-full px-6 py-2 border border-white/10">
                            <span className="text-white text-sm font-medium pr-4 border-r border-white/20">
                                Chapter {chapterId.slice(0, 8)}...
                            </span>

                            {/* Theme Toggles */}
                            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full ${theme === 'light' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                                <Sun className="w-4 h-4" />
                            </button>
                            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full ${theme === 'dark' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                                <Moon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setTheme('cloudy')} className={`p-1.5 rounded-full ${theme === 'cloudy' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                                <Monitor className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleDownload}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                                title="Download Chapter"
                            >
                                <Download className="w-6 h-6" />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                            >
                                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <div className={`max-w-4xl mx-auto shadow-2xl min-h-screen ${isFullscreen ? '' : 'py-20'}`}>
                {images.map((src, index) => (
                    <div key={index} className="relative w-full">
                        <img
                            src={src}
                            alt={`Page ${index + 1}`}
                            className="w-full h-auto block"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>

            {/* Bottom Bar / Progress (could go here) */}
            <AnimatePresence>
                {showControls && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="bg-black/80 px-4 py-2 rounded-full text-white text-xs backdrop-blur-md border border-white/10"
                        >
                            <p>Tap or move mouse to show controls</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
