import Link from 'next/link';
import MangaCard from './MangaCard';
import { Manga } from '@/lib/scraper/types';

interface MangaRowProps {
    title: string;
    mangaList: Manga[];
    viewAllLink?: string;
    color?: string; // e.g. "purple", "blue", "green"
}

export default function MangaRow({ title, mangaList, viewAllLink, color = "purple" }: MangaRowProps) {
    if (!mangaList || mangaList.length === 0) return null;

    const colorClasses: Record<string, string> = {
        purple: "bg-purple-500 text-purple-300",
        blue: "bg-blue-500 text-blue-300",
        green: "bg-green-500 text-green-300",
        orange: "bg-orange-500 text-orange-300",
        pink: "bg-pink-500 text-pink-300",
        red: "bg-red-500 text-red-300",
    };

    const accentColor = colorClasses[color] || colorClasses.purple;
    const [bgClass, textClass] = accentColor.split(" "); // simple splitting

    return (
        <section className="mt-12 mb-8">
            <div className="max-w-7xl mx-auto px-6 mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white relative pl-4">
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${bgClass}`} />
                    {title}
                </h2>
                {viewAllLink && (
                    <Link href={viewAllLink} className={`text-sm ${textClass} hover:text-white transition-colors`}>
                        View All
                    </Link>
                )}
            </div>

            <div className="flex overflow-x-auto pb-6 px-6 gap-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                {mangaList.map((manga) => (
                    <div key={manga.id} className="min-w-[160px] md:min-w-[200px] snap-start">
                        <MangaCard manga={manga} />
                    </div>
                ))}
            </div>
        </section>
    );
}
