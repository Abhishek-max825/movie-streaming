import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonRow() {
    return (
        <div className="py-8 space-y-4">
            {/* Title */}
            <div className="px-4 lg:px-10">
                <Skeleton className="h-6 w-48" />
            </div>

            {/* Row of Cards */}
            <div className="flex items-center gap-3 overflow-hidden px-4 lg:px-10">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex-none w-[160px] md:w-[200px] lg:w-[240px] aspect-[2/3]">
                        <Skeleton className="h-full w-full rounded-sm md:rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
