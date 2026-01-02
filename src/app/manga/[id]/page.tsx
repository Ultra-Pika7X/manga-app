import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ScraperEngine } from '@/lib/scraper';
import { Calendar, BookOpen, User as UserIcon, ExternalLink } from 'lucide-react';
import { getProxyUrl } from '@/lib/utils';

interface PageProps {
    params: {
        id: string;
    };
    searchParams: {
        sourceId?: string;
    };
}

export default async function MangaDetails({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { sourceId } = await searchParams;

    const data = await ScraperEngine.getMangaDetails(id, sourceId);

    if (!data) {
        return (
            <main className="min-h-screen bg-cloudy flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p>Manga not found or error fetching details from {sourceId || 'default source'}.</p>
                </div>
            </main>
        );
    }

    const { manga, chapters } = data;

    return (
        <main className="min-h-screen bg-cloudy text-gray-100 pb-20">
            <Navbar />

            {/* Backdrop / Header */}
            <div className="relative h-[50vh] w-full overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center blur-md opacity-50 scale-105"
                    style={{ backgroundImage: `url(${getProxyUrl(manga.cover)})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-64 relative z-10">
                <div className="flex flex-col md:flex-row gap-12">
                    {/* Cover Image */}
                    <div className="flex-shrink-0 w-64 md:w-80 mx-auto md:mx-0">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                            <img src={getProxyUrl(manga.cover)} alt={manga.title} className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-end pb-4 pt-4 md:pt-0">
                        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-white drop-shadow-lg leading-tight">
                            {manga.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300 mb-8">
                            {manga.status && (
                                <span className="bg-purple-600/80 px-3 py-1 rounded-full text-white font-semibold uppercase tracking-wide text-xs">
                                    {manga.status}
                                </span>
                            )}
                            <div className="flex items-center">
                                <UserIcon className="w-4 h-4 mr-2 text-purple-400" />
                                <span>{manga.author || 'Unknown Author'}</span>
                            </div>
                            <div className="flex items-center">
                                <BookOpen className="w-4 h-4 mr-2 text-purple-400" />
                                <span>{chapters.length} Chapters</span>
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-lg max-w-4xl glass p-6 rounded-xl">
                            {manga.description}
                        </p>
                    </div>
                </div>

                {/* Chapters List */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                        <span className="w-1 h-6 bg-purple-500 rounded-full mr-3" />
                        Chapters
                    </h2>

                    <div className="glass rounded-xl overflow-hidden divide-y divide-white/10">
                        {chapters.length > 0 ? (
                            chapters.map((chapter) => (
                                <div key={chapter.id} className="p-4 hover:bg-white/5 transition-colors group flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                                            {chapter.title}
                                        </h4>
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                            {chapter.volume && <span>Vol. {chapter.volume}</span>}
                                            {chapter.publishAt && (
                                                <span className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(chapter.publishAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {chapter.externalUrl ? (
                                        <a
                                            href={chapter.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                                        >
                                            Read External <ExternalLink className="w-3 h-3 ml-2" />
                                        </a>
                                    ) : (
                                        <Link
                                            href={`/read/${chapter.id}?sourceId=${chapter.sourceId || sourceId}`}
                                            className="px-6 py-2 bg-white/10 text-white hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Read
                                        </Link>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No chapters found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
