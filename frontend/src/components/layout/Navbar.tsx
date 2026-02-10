import Link from 'next/link';
import { Search, Menu, X, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { searchContent } from '@/services/apiClient';
import type { Post } from '@/types/api';
import { cleanTitle } from '@/utils/textUtils';

export const Navbar = () => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [suggestions, setSuggestions] = useState<Post[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search for suggestions
    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            setIsLoadingSuggestions(true);

            // Clear previous timer
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Set new timer
            debounceTimer.current = setTimeout(async () => {
                try {
                    const results = await searchContent(searchQuery);
                    setSuggestions(results.slice(0, 6)); // Limit to 6 suggestions
                    setShowSuggestions(true);
                } catch (error) {
                    console.error('Failed to fetch suggestions:', error);
                    setSuggestions([]);
                } finally {
                    setIsLoadingSuggestions(false);
                }
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [searchQuery]);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                // Navigate to selected suggestion
                const id = encodeURIComponent(suggestions[selectedIndex].link);
                router.push(`/title/${id}`);
                setShowSuggestions(false);
                setSearchQuery('');
                setIsSearchOpen(false);
            } else if (searchQuery.trim()) {
                // Navigate to search results page
                router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                setShowSuggestions(false);
                setIsScrolled(true);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    const handleSuggestionClick = (post: Post) => {
        const id = encodeURIComponent(post.link);
        router.push(`/title/${id}`);
        setShowSuggestions(false);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setSelectedIndex(-1);
    };

    const navLinks = ['Home', 'Series', 'Movies'];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-center py-4 transition-all duration-500`}>
            {/* Main Floating Navbar Container */}
            <div className={`
                flex items-center justify-between px-6 
                h-[68px] 
                transition-all duration-500
                ${isScrolled
                    ? 'w-[95%] max-w-6xl bg-black/80 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl shadow-black/50'
                    : 'w-full bg-gradient-to-b from-black/80 to-transparent'
                }
            `}>

                {/* Left Section: Logo & Mobile Menu */}
                <div className="flex items-center gap-4 lg:gap-8">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </motion.button>

                    <Link href="/home" className="flex items-center gap-2 group relative z-10 select-none">
                        <span className="text-red-600 font-extrabold text-3xl tracking-tighter drop-shadow-lg">BBHC</span>
                        <span className="text-red-600 font-extrabold text-3xl tracking-tighter drop-shadow-lg">THEATRE</span>
                    </Link>
                </div>

                {/* Center Section: Navigation Links (Desktop) */}
                <div className="hidden lg:flex items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/5">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        >
                            <Search className="h-5 w-5" />
                        </button>

                        {navLinks.map((item) => (
                            <Link
                                key={item}
                                href={`/${item === 'Home' ? 'home' : item.toLowerCase()}`}
                                className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right Section: Profile & Search (Mobile) / Search Input */}
                <div className="flex items-center gap-4">
                    {/* Expanded Search Input Overlay */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-full max-w-xl z-50 px-4"
                            >
                                <div ref={searchRef} className="relative w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                        onKeyDown={handleSearch}
                                        placeholder="Search titles, genres..."
                                        className="w-full bg-[#1a1a1a] text-white pl-12 pr-12 py-3.5 rounded-full border border-white/10 focus:border-white/30 focus:outline-none shadow-2xl"
                                    />
                                    <button
                                        onClick={() => setIsSearchOpen(false)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>

                                    {/* Search Suggestions */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                                            {suggestions.map((post) => (
                                                <button
                                                    key={post.link}
                                                    onClick={() => handleSuggestionClick(post)}
                                                    className="w-full flex items-center gap-4 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                                                >
                                                    <img src={post.image} alt="" className="w-10 h-14 object-cover rounded bg-zinc-800" />
                                                    <div>
                                                        <p className="text-sm font-medium text-white line-clamp-1">{cleanTitle(post.title)}</p>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Title</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* User Profile */}
                    <div className="flex items-center gap-4">

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-transparent hover:border-white transition-all shadow-lg relative group bg-white"
                        >
                            <div className="absolute inset-0 bg-white opacity-20 group-hover:opacity-0 transition-opacity"></div>
                            <img src="/development.png" alt="User" className="w-full h-full object-cover" />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="lg:hidden absolute top-[80px] left-4 right-4 bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-40"
                    >
                        <div className="p-4 flex flex-col gap-2">
                            {navLinks.map((item, idx) => (
                                <Link
                                    key={item}
                                    href={`/${item === 'Home' ? 'home' : item.toLowerCase()}`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-3 text-lg font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all flex items-center justify-between group"
                                >
                                    {item}
                                    <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

