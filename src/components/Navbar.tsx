"use client";

import Link from 'next/link';
import { Search, Library, User, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user, logout } = useAuth();
    const router = useRouter();
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [source, setSource] = useState('all');

    // Available sources
    const sources = [
        { id: 'all', name: 'All Sources' },
        { id: 'mangadex', name: 'MangaDex' },
        { id: 'mangabuddy', name: 'MangaBuddy' },
        { id: 'mangapark', name: 'MangaPark' },
        { id: 'weebdex', name: 'WeebDex' },
        { id: 'mangakakalot', name: 'Mangakakalot' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            const params = new URLSearchParams();
            params.set('q', searchQuery);
            if (source !== 'all') {
                params.set('sourceId', source);
            }
            router.push(`/search?${params.toString()}`);
        }
    };

    return (
        <nav className="fixed top-0 w-full z-50 px-6 py-4 glass bg-opacity-30">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    MangaCloud
                </Link>

                <div className="hidden md:flex items-center space-x-8">
                    <Link href="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
                    <Link href="/latest" className="text-gray-300 hover:text-white transition-colors">Latest</Link>
                    <Link href="/popular" className="text-gray-300 hover:text-white transition-colors">Popular</Link>
                </div>

                <div className="flex items-center space-x-4">
                    <form onSubmit={handleSearch} className={`flex items-center bg-white/10 rounded-full px-2 py-1 transition-all ${isOpen ? 'w-full md:w-96' : 'w-10 overflow-hidden'}`}>
                        {isOpen && (
                            <select
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                className="bg-transparent border-none text-xs text-gray-300 focus:outline-none mr-2 max-w-[100px] cursor-pointer"
                            >
                                {sources.map(s => (
                                    <option key={s.id} value={s.id} className="bg-[#1a1a2e] text-gray-300">{s.name}</option>
                                ))}
                            </select>
                        )}
                        <button type="button" onClick={() => setIsOpen(!isOpen)} className="p-2">
                            <Search className="w-5 h-5 text-gray-300" />
                        </button>
                        <input
                            type="text"
                            placeholder="Search manga..."
                            className={`bg-transparent border-none focus:outline-none text-white text-sm w-full ${!isOpen && 'pointer-events-none'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onBlur={() => !searchQuery && setIsOpen(false)}
                        />
                    </form>

                    <Link href="/library" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Library className="w-5 h-5 text-gray-300" />
                    </Link>

                    {user ? (
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={`p-1.5 rounded-xl transition-all flex items-center border ${isUserMenuOpen ? 'bg-white/10 border-white/20' : 'hover:bg-white/10 border-transparent'}`}
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-7 h-7 rounded-lg shadow-lg" />
                                ) : (
                                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-white/10 bg-white/5">
                                        <p className="text-white text-sm font-bold truncate">{user.displayName || 'Manga Enthusiast'}</p>
                                        <p className="text-gray-400 text-xs truncate mt-0.5">{user.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <Link
                                            href="/profile"
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                <User className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <span>Profile & Settings</span>
                                        </Link>
                                    </div>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsUserMenuOpen(false);
                                        }}
                                        className="w-full flex items-center space-x-3 px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-full transition-all">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
