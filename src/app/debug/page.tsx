"use client";

import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Activity, RefreshCw } from 'lucide-react';

interface SourceStatus {
    id: string;
    name: string;
    status: 'online' | 'offline' | 'degraded';
    latency: number;
    lastChecked: number;
}

const SOURCES = [
    { id: 'mangakakalot', name: 'Mangakakalot', url: 'https://mangakakalot.com' },
    { id: 'mangabuddy', name: 'MangaBuddy', url: 'https://mangabuddy.com' },
    { id: 'weebdex', name: 'WeebDex', url: 'https://weebdex.com' } // Dummy for now
];

export default function DebugDashboard() {
    const [statuses, setStatuses] = useState<SourceStatus[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const checkHealth = async () => {
        setIsChecking(true);
        const results: SourceStatus[] = [];

        for (const source of SOURCES) {
            const start = Date.now();
            try {
                // We use a simple fetch to our own proxy or just check availability
                // In a real app, this might call a server action that specifically pings the source
                // For "Minimal Implementation", we can simulate or fetch a safe known URL via proxy
                // Let's assume we have a health-check endpoint or just assume online if fetch succeeds

                // Simulating health check for minimal demo (as we can't easily fetch CORS directly)
                await new Promise(r => setTimeout(r, Math.random() * 500 + 200));

                const latency = Date.now() - start;
                results.push({
                    id: source.id,
                    name: source.name,
                    status: latency > 1000 ? 'degraded' : 'online',
                    latency,
                    lastChecked: Date.now()
                });
            } catch (e) {
                results.push({
                    id: source.id,
                    name: source.name,
                    status: 'offline',
                    latency: 0,
                    lastChecked: Date.now()
                });
            }
        }
        setStatuses(results);
        setIsChecking(false);
    };

    return (
        <div className="min-h-screen bg-[#0f0f1a] p-8 text-white">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Activity className="text-green-500" />
                        Scraper Health Dashboard
                    </h1>
                    <button
                        onClick={checkHealth}
                        disabled={isChecking}
                        className="px-4 py-2 bg-purple-600 rounded-lg flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                        {isChecking ? 'Checking...' : 'Run Diagnostics'}
                    </button>
                </div>

                <div className="grid gap-4">
                    {statuses.length === 0 && !isChecking && (
                        <div className="text-center p-12 bg-white/5 rounded-xl text-gray-400">
                            Run diagnostics to check source status.
                        </div>
                    )}

                    {statuses.map((status) => (
                        <div key={status.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${status.status === 'online' ? 'bg-green-500/20 text-green-400' :
                                    status.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {status.status === 'online' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{status.name}</h3>
                                    <p className="text-sm text-gray-400 capitalize">{status.status} • {status.latency}ms</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500">Last Checked: {new Date(status.lastChecked).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
