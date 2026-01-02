import Link from 'next/link';
import { Manga } from '@/lib/scraper';

import { getProxyUrl } from '@/lib/utils';

interface MangaCardProps {
    manga: Manga;
}

export default function MangaCard({ manga }: MangaCardProps) {
    return (
        <Link href={`/manga/${manga.id}?sourceId=${manga.sourceId || 'mangadex'}`} className="group relative block aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 hover:shadow-2xl hover:z-10 bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={getProxyUrl(manga.cover)}
                alt={manga.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

            <div className="absolute bottom-0 left-0 p-4 w-full">
                <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                    {manga.title}
                </h3>
                {manga.status && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase font-bold bg-white/20 text-white rounded">
                        {manga.status}
                    </span>
                )}
            </div>
        </Link>
    );
}
