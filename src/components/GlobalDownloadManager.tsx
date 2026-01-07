"use client";

import React, { useState, useEffect } from 'react';
import { useDownload } from '@/hooks/useDownload';
import { ChevronDown, ChevronUp, X, Download, Pause, Play } from 'lucide-react';

export default function GlobalDownloadManager() {
    const { downloads, activeDownloads } = useDownload();
    const [isExpanded, setIsExpanded] = useState(false);

    // Only show if there are active downloads or queued items
    const hasActiveTasks = activeDownloads.length > 0;

    if (!hasActiveTasks && !isExpanded) return null;

    // Mobile-first responsive classes
    const containerClasses = `
        fixed bottom-0 right-0 z-50 
        w-full md:w-96 
        bg-gray-900 border-t md:border border-gray-800 
        shadow-2xl transition-all duration-300
        ${isExpanded ? 'h-64' : 'h-12'}
        md:m-4 md:rounded-xl
    `;

    return (
        <div className={containerClasses}>
            {/* Header / Minimized View */}
            <div
                className="h-12 flex items-center justify-between px-4 cursor-pointer hover:bg-white/5"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        w-2 h-2 rounded-full 
                        ${hasActiveTasks ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}
                    `} />
                    <span className="text-sm font-medium text-white">
                        {hasActiveTasks
                            ? `Downloading (${activeDownloads.length})`
                            : 'Downloads Completed'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Tiny Progress Bar for Minimized State */}
                    {!isExpanded && hasActiveTasks && (
                        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${activeDownloads[0]?.progress || 0}%` }}
                            />
                        </div>
                    )}

                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="h-52 overflow-y-auto p-4 space-y-3">
                    {activeDownloads.map((task: any) => (
                        <div key={task.id} className="bg-white/5 p-3 rounded-lg">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs truncate max-w-[70%]">{task.chapterTitle}</span>
                                <span className="text-xs text-gray-400">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full mb-2">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                                    style={{ width: `${task.progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>{task.downloadedImages} / {task.totalImages} pages</span>
                                <span>{task.status}</span>
                            </div>
                        </div>
                    ))}

                    {/* Queued items would go here */}
                </div>
            )}
        </div>
    );
}
