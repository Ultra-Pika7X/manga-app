"use client";

import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { User, Mail, LogOut, Settings, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <main className="min-h-screen bg-cloudy flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-cloudy pb-20">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 pt-32">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Cover/Header */}
                    <div className="h-40 bg-gradient-to-r from-purple-600 to-pink-600 relative">
                        <div className="absolute -bottom-16 left-8">
                            <div className="w-32 h-32 rounded-3xl bg-[#1a1a2e] p-1 shadow-2xl">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover rounded-[22px]" />
                                ) : (
                                    <div className="w-full h-full bg-purple-600 flex items-center justify-center rounded-[22px]">
                                        <User className="w-16 h-16 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-8 pb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-extrabold text-white mb-2">
                                    {user.displayName || 'Manga Enthusiast'}
                                </h1>
                                <div className="flex items-center text-gray-400">
                                    <Mail className="w-4 h-4 mr-2" />
                                    <span>{user.email}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => logout()}
                                className="flex items-center justify-center space-x-2 px-6 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-bold rounded-xl border border-red-600/20 transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-white font-bold mb-4 flex items-center">
                                    <Settings className="w-5 h-5 mr-2 text-purple-400" />
                                    Account Settings
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">Manage your account preferences and sync settings.</p>
                                <button disabled className="w-full py-2 bg-white/5 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed border border-white/5 transition-colors">
                                    Edit Profile (Soon)
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-white font-bold mb-4 flex items-center">
                                    <ShieldCheck className="w-5 h-5 mr-2 text-blue-400" />
                                    Security
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">Keep your account secure with updated passwords.</p>
                                <button disabled className="w-full py-2 bg-white/5 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed border border-white/5 transition-colors">
                                    Change Password (Soon)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
