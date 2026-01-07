"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AlertTriangle, Download, HardDrive, RefreshCw, X, CheckCircle, Info, WifiOff } from 'lucide-react';
import { DownloadManager, DownloadStatus } from '@/lib/downloadManager';

// Types
interface Notification {
    id: string;
    type: 'warning' | 'error' | 'success' | 'info';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
    dismissible?: boolean;
    duration?: number;
}

interface ConfirmDialogConfig {
    title: string;
    message: string;
    details?: string[];
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
}

interface DownloadSafetyContextType {
    // Notifications
    showNotification: (notification: Omit<Notification, 'id'>) => void;
    dismissNotification: (id: string) => void;

    // Confirmations
    showConfirm: (config: ConfirmDialogConfig) => void;

    // Checks
    checkStorageBeforeDownload: (estimatedSizeMB: number) => Promise<boolean>;
    showBrowserLimitations: () => void;
    promptResume: (pendingCount: number) => void;
}

const DownloadSafetyContext = createContext<DownloadSafetyContextType | null>(null);

export function useDownloadSafety() {
    const context = useContext(DownloadSafetyContext);
    if (!context) throw new Error('useDownloadSafety must be used within DownloadSafetyProvider');
    return context;
}

// Browser limitation info
const BROWSER_LIMITS = {
    storage: {
        chrome: 'Up to 60% of disk space',
        firefox: 'Up to 50% of disk space (max 2GB)',
        safari: 'Limited to ~1GB, may be cleared after 7 days of inactivity',
        edge: 'Similar to Chrome, up to 60% of disk space'
    },
    notes: [
        'Downloads are stored in browser storage, not your file system',
        'Clearing browser data will delete all offline chapters',
        'Private/Incognito mode has very limited storage',
        'Some browsers may reduce quota when disk is low'
    ]
};

export function DownloadSafetyProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
    const [showLimitsModal, setShowLimitsModal] = useState(false);

    // Check for interrupted downloads on mount
    useEffect(() => {
        const checkInterruptedDownloads = async () => {
            try {
                const downloads = await DownloadManager.getAllDownloads();
                const interrupted = downloads.filter(
                    d => d.status === DownloadStatus.Downloading ||
                        d.status === DownloadStatus.FetchingMeta ||
                        d.status === DownloadStatus.Pending
                );

                if (interrupted.length > 0) {
                    // Wait a moment to not overwhelm user on page load
                    setTimeout(() => {
                        promptResume(interrupted.length);
                    }, 2000);
                }
            } catch (e) {
                console.error('Failed to check interrupted downloads:', e);
            }
        };

        checkInterruptedDownloads();
    }, []);

    // Auto-dismiss notifications
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        notifications.forEach(n => {
            if (n.duration && n.duration > 0) {
                const timer = setTimeout(() => {
                    dismissNotification(n.id);
                }, n.duration);
                timers.push(timer);
            }
        });

        return () => timers.forEach(clearTimeout);
    }, [notifications]);

    const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setNotifications(prev => [...prev.slice(-4), { ...notification, id }]); // Keep max 5
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showConfirm = useCallback((config: ConfirmDialogConfig) => {
        setConfirmDialog(config);
    }, []);

    const checkStorageBeforeDownload = useCallback(async (estimatedSizeMB: number): Promise<boolean> => {
        try {
            const estimate = await DownloadManager.getStorageEstimate();

            if (!estimate) {
                // Can't check, proceed with warning
                showNotification({
                    type: 'info',
                    title: 'Storage Check Unavailable',
                    message: 'Unable to verify available storage. Proceed with caution.',
                    duration: 5000
                });
                return true;
            }

            const usedMB = estimate.usage / (1024 * 1024);
            const quotaMB = estimate.quota / (1024 * 1024);
            const availableMB = quotaMB - usedMB;
            const usagePercent = Math.round((estimate.usage / estimate.quota) * 100);

            // Critical: Over 90% used
            if (usagePercent > 90) {
                return new Promise((resolve) => {
                    showConfirm({
                        title: 'Storage Almost Full',
                        message: `Your browser storage is ${usagePercent}% full. This download may fail.`,
                        details: [
                            `Available: ~${Math.round(availableMB)} MB`,
                            `Requested: ~${estimatedSizeMB} MB`,
                            'Consider deleting some offline chapters first'
                        ],
                        variant: 'danger',
                        confirmLabel: 'Download Anyway',
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false)
                    });
                });
            }

            // Warning: Would use more than 80% after download
            const afterUsage = ((estimate.usage + estimatedSizeMB * 1024 * 1024) / estimate.quota) * 100;
            if (afterUsage > 80 && estimatedSizeMB > 50) {
                return new Promise((resolve) => {
                    showConfirm({
                        title: 'Large Download',
                        message: `This download (~${estimatedSizeMB} MB) will use significant storage.`,
                        details: [
                            `Current usage: ${usagePercent}%`,
                            `After download: ~${Math.round(afterUsage)}%`,
                            'Downloads are stored in your browser, not your files'
                        ],
                        variant: 'warning',
                        confirmLabel: 'Continue Download',
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false)
                    });
                });
            }

            return true;
        } catch (e) {
            console.error('Storage check failed:', e);
            return true; // Proceed on error
        }
    }, [showConfirm, showNotification]);

    const showBrowserLimitations = useCallback(() => {
        setShowLimitsModal(true);
    }, []);

    const promptResume = useCallback((pendingCount: number) => {
        showNotification({
            type: 'info',
            title: 'Interrupted Downloads',
            message: `${pendingCount} download${pendingCount > 1 ? 's' : ''} can be resumed.`,
            action: {
                label: 'Resume All',
                onClick: async () => {
                    const downloads = await DownloadManager.getAllDownloads();
                    for (const d of downloads) {
                        if (d.status === DownloadStatus.Paused || d.status === DownloadStatus.Pending) {
                            await DownloadManager.resumeDownload(d.id);
                        }
                    }
                    showNotification({
                        type: 'success',
                        title: 'Downloads Resumed',
                        message: `${pendingCount} download${pendingCount > 1 ? 's' : ''} restarted.`,
                        duration: 3000
                    });
                }
            },
            dismissible: true
        });
    }, [showNotification]);

    const handleConfirmClose = () => {
        confirmDialog?.onCancel?.();
        setConfirmDialog(null);
    };

    const handleConfirmAction = () => {
        confirmDialog?.onConfirm();
        setConfirmDialog(null);
    };

    return (
        <DownloadSafetyContext.Provider value={{
            showNotification,
            dismissNotification,
            showConfirm,
            checkStorageBeforeDownload,
            showBrowserLimitations,
            promptResume
        }}>
            {children}

            {/* Notification Stack */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-5 duration-300 ${notification.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                notification.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                                    notification.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                        'bg-blue-500/10 border-blue-500/30'
                            }`}
                    >
                        <div className="flex gap-3">
                            <div className={`flex-shrink-0 ${notification.type === 'warning' ? 'text-yellow-400' :
                                    notification.type === 'error' ? 'text-red-400' :
                                        notification.type === 'success' ? 'text-green-400' :
                                            'text-blue-400'
                                }`}>
                                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                {notification.type === 'error' && <X className="w-5 h-5" />}
                                {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                {notification.type === 'info' && <Info className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">{notification.message}</p>
                                {notification.action && (
                                    <button
                                        onClick={notification.action.onClick}
                                        className="mt-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition"
                                    >
                                        {notification.action.label} →
                                    </button>
                                )}
                            </div>
                            {notification.dismissible !== false && (
                                <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="text-gray-500 hover:text-white transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`px-6 py-4 border-b border-white/10 flex items-center gap-3 ${confirmDialog.variant === 'danger' ? 'bg-red-500/10' :
                                confirmDialog.variant === 'warning' ? 'bg-yellow-500/10' :
                                    'bg-blue-500/10'
                            }`}>
                            <div className={`p-2 rounded-lg ${confirmDialog.variant === 'danger' ? 'bg-red-500/20 text-red-400' :
                                    confirmDialog.variant === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-blue-500/20 text-blue-400'
                                }`}>
                                {confirmDialog.variant === 'danger' ? <AlertTriangle className="w-5 h-5" /> :
                                    confirmDialog.variant === 'warning' ? <HardDrive className="w-5 h-5" /> :
                                        <Info className="w-5 h-5" />}
                            </div>
                            <h2 className="text-lg font-bold text-white">{confirmDialog.title}</h2>
                        </div>

                        <div className="px-6 py-4">
                            <p className="text-gray-300">{confirmDialog.message}</p>

                            {confirmDialog.details && confirmDialog.details.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                    {confirmDialog.details.map((detail, i) => (
                                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                            <span className="text-gray-600">•</span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                            <button
                                onClick={handleConfirmClose}
                                className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition font-medium"
                            >
                                {confirmDialog.cancelLabel || 'Cancel'}
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className={`flex-1 px-4 py-2.5 rounded-xl transition font-medium ${confirmDialog.variant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                    }`}
                            >
                                {confirmDialog.confirmLabel || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Browser Limitations Modal */}
            {showLimitsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                    <HardDrive className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Browser Storage Limits</h2>
                            </div>
                            <button onClick={() => setShowLimitsModal(false)} className="text-gray-400 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-2">Storage by Browser</h3>
                                <div className="space-y-2">
                                    {Object.entries(BROWSER_LIMITS.storage).map(([browser, limit]) => (
                                        <div key={browser} className="flex justify-between text-sm">
                                            <span className="text-gray-400 capitalize">{browser}</span>
                                            <span className="text-gray-300">{limit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-sm font-semibold text-white mb-2">Important Notes</h3>
                                <ul className="space-y-2">
                                    {BROWSER_LIMITS.notes.map((note, i) => (
                                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-white/10">
                            <button
                                onClick={() => setShowLimitsModal(false)}
                                className="w-full px-4 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition font-medium"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DownloadSafetyContext.Provider>
    );
}
