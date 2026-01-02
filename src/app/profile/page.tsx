"use client";

import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, LogOut, Settings, ShieldCheck, Check, Save } from 'lucide-react';
import { updateProfile } from 'firebase/auth';

export default function ProfilePage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        if (user) {
            setDisplayName(user.displayName || '');
        }
    }, [user, loading, router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsUpdating(true);
        setMessage({ text: '', type: '' });

        try {
            await updateProfile(user, {
                displayName: displayName
            });
            setMessage({ text: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error: any) {
            setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

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
                                        <UserIcon className="w-16 h-16 text-white" />
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

                        {message.text && (
                            <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                }`}>
                                <Check className="w-4 h-4 mr-2" />
                                {message.text}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                    <Settings className="w-5 h-5 mr-3 text-purple-400" />
                                    Account Settings
                                </h3>

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div>
                                        <label className="block text-gray-400 text-sm font-medium mb-2">Display Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm font-medium mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={user.email || ''}
                                            disabled
                                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-2 ml-1 italic">Email cannot be changed currently.</p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {isUpdating ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                <span>Save Changes</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                                    <ShieldCheck className="w-5 h-5 mr-3 text-blue-400" />
                                    Security
                                </h3>
                                <div className="space-y-4 flex-1">
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <p className="text-sm text-blue-300 leading-relaxed font-medium">
                                            Manage your password and security settings to keep your library safe.
                                        </p>
                                    </div>
                                    <button disabled className="w-full py-3 bg-white/5 text-gray-500 rounded-xl text-sm font-bold cursor-not-allowed border border-white/10 transition-colors mt-auto">
                                        Change Password (Soon)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
