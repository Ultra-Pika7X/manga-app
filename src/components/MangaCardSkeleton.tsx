export default function MangaCardSkeleton() {
    return (
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 animate-pulse border border-white/5">
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2 bg-gradient-to-t from-black/60 to-transparent">
                <div className="h-5 bg-white/20 rounded w-3/4" />
                <div className="h-3 bg-white/20 rounded w-1/4" />
            </div>
        </div>
    );
}
