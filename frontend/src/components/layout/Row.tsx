import type { Post } from '@/types/api';
import { MovieCard } from '@/components/media/MovieCard';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface Props {
    title: string;
    movies: Post[];
}

export const Row = ({ title, movies }: Props) => {
    const rowRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === 'left'
                ? scrollLeft - clientWidth / 2
                : scrollLeft + clientWidth / 2;

            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };



    if (movies.length === 0) return null;

    const rowVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    };

    const headerVariants: Variants = {
        initial: { x: 0, opacity: 0.8 },
        hover: { x: 10, opacity: 1, color: "#E50914", transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1, margin: "0px 0px -50px 0px" }}
            variants={rowVariants}
            className="py-6 space-y-4 group/row group relative overflow-visible"
        >
            <motion.div
                className="inline-block relative cursor-pointer group/header ml-4 md:ml-12 mb-2"
                initial="initial"
                whileHover="hover"
            >
                <div className="flex items-center gap-4">
                    {/* Red Accent Bar */}
                    <div className="h-8 w-1.5 bg-[#E50914] rounded-full shadow-[0_0_15px_rgba(229,9,20,0.8)]" />

                    <motion.h2
                        variants={headerVariants}
                        className="text-2xl md:text-3xl font-black tracking-tight text-white/90 drop-shadow-2xl group-hover/header:text-white transition-colors"
                    >
                        {title}
                    </motion.h2>
                    <ChevronRight className="h-6 w-6 text-red-600 opacity-0 group-hover/header:opacity-100 group-hover/header:translate-x-2 transition-all duration-300" />
                </div>
            </motion.div>

            <div className="relative group/row-content">
                {/* Left Scroll Button */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 z-40 h-full w-12 md:w-16 opacity-0 group-hover/row:opacity-100 transition-all duration-300 bg-gradient-to-r from-black via-black/50 to-transparent flex items-center justify-center backdrop-blur-[2px] cursor-pointer hover:via-black/70"
                >
                    <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                        <ChevronLeft className="h-10 w-10 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </motion.div>
                </button>

                <div
                    ref={rowRef}
                    className="flex items-center gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-4 md:px-12 py-6 -my-6"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {movies.map((movie, idx) => (
                        <motion.div
                            key={`${movie.link}-${idx}`}
                            variants={cardVariants}
                            className="flex-none w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px]"
                        >
                            <MovieCard post={movie} />
                        </motion.div>
                    ))}
                </div>

                {/* Right Scroll Button */}
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 z-40 h-full w-12 md:w-16 opacity-0 group-hover/row:opacity-100 transition-all duration-300 bg-gradient-to-l from-black via-black/50 to-transparent flex items-center justify-center backdrop-blur-[2px] cursor-pointer hover:via-black/70"
                >
                    <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                        <ChevronRight className="h-10 w-10 text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" />
                    </motion.div>
                </button>
            </div>
        </motion.div>
    );
};
