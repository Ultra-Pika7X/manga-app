"use client";

import { useHistory } from '@/hooks/useHistory';
import { useDownload } from '@/hooks/useDownload';
import { useAniList } from '@/hooks/useAniList';
import { useEffect, useState } from 'react';
import { BookOpen, FileDigit, HardDrive, Zap } from 'lucide-react';

export default function UserStats() {
    const { history } = useHistory();
    const { getStorageEstimate } = useDownload();
    const { token } = useAniList();

    const [storage, setStorage] = useState<{ used: string, percent: number }>({ used: '0 MB', percent: 0 });
    const [counts, setCounts] = useState({ manga: 0, chapters: 0 });

    useEffect(() => {
        // Calculate History Stats
        const uniqueManga = new Set(history.map(h => h.mangaId)).size;
        setCounts({
            manga: uniqueManga,
            chapters: history.length
        });

        // Calculate Storage
        getStorageEstimate().then(est => {
            if (est) {
                const usedMB = (est.usage / (1024 * 1024)).toFixed(0);
                const percent = Math.min(100, Math.round((est.usage / est.quota) * 100));
                setStorage({ used: `${usedMB} MB`, percent });
            }
        });
    }, [history]);

    const stats = [
        {
            label: "Manga Read",
            value: counts.manga,
            icon: BookOpen,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
            border: "border-blue-400/20"
        },
        {
            label: "Chapters",
            value: counts.chapters,
            icon: FileDigit,
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/20"
        },
        {
            label: "Storage Used",
            value: storage.used,
            sub: `${storage.percent}% of quota`,
            icon: HardDrive,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
            border: "border-orange-400/20"
        },
        {
            label: "AniList Sync",
            value: token ? "Active" : "Inactive",
            icon: Zap,
            color: token ? "text-green-400" : "text-gray-400",
            bg: token ? "bg-green-400/10" : "bg-gray-400/10",
            border: token ? "border-green-400/20" : "border-gray-400/20"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${stat.border} ${stat.bg} backdrop-blur-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-black text-white ml-1">
                        {stat.value}
                    </div>
                    {stat.sub && (
                        <div className="text-[10px] text-gray-500 font-medium ml-1 mt-1">
                            {stat.sub}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
