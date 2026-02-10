import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonHero() {
    return (
        <div className="relative flex flex-col space-y-2 py-16 md:space-y-4 lg:h-[65vh] lg:justify-end lg:pb-12">
            <div className="absolute top-0 left-0 -z-10 h-[95vh] w-full">
                <Skeleton className="h-full w-full rounded-none" />
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
            </div>

            <div className="px-4 lg:px-12 space-y-4">
                <Skeleton className="h-4 w-20 md:w-32 rounded-full bg-red-600/20" /> {/* "Trending" badge style */}

                <Skeleton className="h-12 w-3/4 md:w-1/2 lg:w-1/3" /> {/* Title */}

                <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full md:w-2/3 lg:w-1/2" />
                    <Skeleton className="h-4 w-5/6 md:w-1/2 lg:w-1/3" />
                    <Skeleton className="h-4 w-4/6 md:w-1/3 lg:w-1/4" />
                </div>

                <div className="flex items-center space-x-3 pt-4">
                    <Skeleton className="h-10 w-28 md:w-32 rounded-md" />
                    <Skeleton className="h-10 w-28 md:w-32 rounded-md" />
                </div>
            </div>
        </div>
    );
}
