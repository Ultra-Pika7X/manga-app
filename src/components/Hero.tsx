import Link from 'next/link';
import { Play, Info } from 'lucide-react';
import { Manga } from '@/lib/scraper';
import { getProxyUrl } from '@/lib/utils';

interface HeroProps {
    manga: Manga;
}

export default function Hero({ manga }: HeroProps) {
    return (
        <div className="relative h-[70vh] w-full overflow-hidden">
            {/* Backdrop Image - In a real app, use a high-res banner if available, falling back to cover */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${getProxyUrl(manga.cover)})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 z-10 flex flex-col items-start space-y-4 max-w-4xl">
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    Featured
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-lg">
                    {manga.title}
                </h1>
                <p className="text-gray-300 text-sm md:text-base line-clamp-3 max-w-2xl drop-shadow-md">
                    {manga.description}
                </p>

                <div className="flex items-center space-x-4 pt-4">
                    <Link
                        href={`/manga/${manga.id}`}
                        className="flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
                    >
                        <Play className="w-5 h-5 mr-2 fill-current" />
                        Read Now
                    </Link>
                    <button className="flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-lg transition-all">
                        <Info className="w-5 h-5 mr-2" />
                        More Info
                    </button>
                </div>
            </div>
        </div>
    );
}
