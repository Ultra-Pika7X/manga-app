"use client";

import Link from 'next/link';
import { Search, Library, User } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
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
                    <form onSubmit={handleSearch} className={`flex items-center bg-white/10 rounded-full px-4 py-1 transition-all ${isOpen ? 'w-64' : 'w-10 overflow-hidden'}`}>
                        <button type="button" onClick={() => setIsOpen(!isOpen)} className="mr-2">
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
                        <div className="relative group">
                            <Link href="/profile" className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <User className="w-5 h-5 text-purple-400" />
                                )}
                            </Link>
                            <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b border-white/10">
                                    <p className="text-white text-sm font-bold truncate">{user.displayName || 'User'}</p>
                                    <p className="text-gray-400 text-xs truncate">{user.email}</p>
                                </div>
                                <Link href="/profile" className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                                    View Profile
                                </Link>
                                <button onClick={() => logout()} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors border-t border-white/5">
                                    Logout
                                </button>
                            </div>
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
