"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';

interface Manga {
    id: string;
    title: string;
    cover: string;
    description?: string;
    sourceId?: string;
}

interface BannerCarouselProps {
    mangaList: Manga[];
}

export default function BannerCarousel({ mangaList }: BannerCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mangaList.length);
        }, 15000); // 15 seconds

        return () => clearInterval(timer);
    }, [mangaList.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % mangaList.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + mangaList.length) % mangaList.length);
    };

    if (!mangaList || mangaList.length === 0) return null;

    const currentManga = mangaList[currentIndex];

    return (
        <div className="relative w-full h-[600px] overflow-hidden group">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentManga.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                >
                    {/* Background Image with Blur */}
                    <div className="absolute inset-0">
                        <Image
                            src={getProxyUrl(currentManga.cover)}
                            alt={currentManga.title}
                            fill
                            className="object-cover blur-[20px] scale-110 opacity-50"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/40 to-transparent" />
                    </div>

                    {/* Content Container */}
                    <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center">
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-8 w-full">

                            {/* Cover Art */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="hidden md:block flex-shrink-0 w-[280px] h-[400px] relative rounded-xl overflow-hidden shadow-2xl shadow-purple-900/20 border border-white/10"
                            >
                                <Image
                                    src={getProxyUrl(currentManga.cover)}
                                    alt={currentManga.title}
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>

                            {/* Text Info */}
                            <div className="flex-1 space-y-4 mb-12 md:mb-0">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center space-x-2 text-yellow-400 font-medium"
                                >
                                    <Star className="w-5 h-5 fill-yellow-400" />
                                    <span>In Popular</span>
                                </motion.div>

                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-4xl md:text-6xl font-black text-white leading-tight line-clamp-2"
                                >
                                    {currentManga.title}
                                </motion.h1>

                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-gray-300 text-lg line-clamp-3 max-w-2xl"
                                >
                                    {currentManga.description || "Join the adventure in this amazing series. Read the latest chapters now."}
                                </motion.p>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="pt-4 flex items-center gap-4"
                                >
                                    <Link
                                        href={`/manga/${currentManga.id}?sourceId=${currentManga.sourceId}`}
                                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30"
                                    >
                                        Read Now
                                    </Link>
                                    <button className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-full transition-all">
                                        Details
                                    </button>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-white/20 backdrop-blur-sm text-white transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronLeft className="w-8 h-8" />
            </button>

            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-white/20 backdrop-blur-sm text-white transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronRight className="w-8 h-8" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                {mangaList.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-purple-500' : 'bg-white/50 hover:bg-white'
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
