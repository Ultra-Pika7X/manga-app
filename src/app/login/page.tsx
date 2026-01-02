"use client";

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await signInWithEmail(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6 text-white relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
            </div>

            <Link href="/" className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20">
                <ArrowLeft className="w-6 h-6" />
            </Link>

            <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400">Sign in to sync your library.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || isSubmitting}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="relative py-4 mb-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#1a1a2e] px-2 text-gray-500 font-medium">Or continue with</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={signInWithGoogle}
                        disabled={loading || isSubmitting}
                        className="w-full flex items-center justify-center space-x-3 bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <User className="w-5 h-5" />
                        <span>Continue with Google</span>
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Sign up
                    </Link>
                </div>
            </div>
        </main>
    );
}
