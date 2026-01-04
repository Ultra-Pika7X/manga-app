"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Paths that are accessible without login
    const publicPaths = ['/login', '/signup'];

    useEffect(() => {
        if (!loading && !user && !publicPaths.includes(pathname)) {
            router.push('/login');
        }
        // Redirect logged-in users away from login/signup pages
        if (!loading && user && publicPaths.includes(pathname)) {
            router.push('/');
        }
    }, [user, loading, pathname, router]);

    // Show nothing while checking auth or hydrating, unless it's a public page which we might want to show immediately
    // ensuring we don't flash protected content
    if (!isClient || loading) {
        return (
            <main className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </main>
        );
    }

    // If not authenticated and trying to access protected route, show nothing (will redirect)
    // or if purely strictly enforcing: render nothing until redirect happens
    if (!user && !publicPaths.includes(pathname)) {
        return null;
    }

    return <>{children}</>;
}
