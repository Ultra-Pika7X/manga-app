/**
 * File Saver Utility
 * 
 * Implements system-level file saving using the File System Access API
 * with graceful fallback for unsupported browsers.
 * 
 * Browser Support:
 * - Chrome 86+, Edge 86+: Full File System Access API
 * - Firefox, Safari, older browsers: Fallback to download link
 * 
 * Security Notes:
 * - File System Access API requires user gesture (click)
 * - Only writes to user-selected location (sandboxed)
 * - No arbitrary file system access possible
 * - HTTPS required for API availability
 */

// Type definitions for File System Access API
interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string | WriteParams): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
}

interface WriteParams {
    type: 'write' | 'seek' | 'truncate';
    data?: BufferSource | Blob | string;
    position?: number;
    size?: number;
}

interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
}

// Extend Window interface
declare global {
    interface Window {
        showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    }
}

export interface SaveOptions {
    /** Suggested filename */
    filename: string;
    /** MIME type */
    mimeType?: string;
    /** File extension (without dot) */
    extension?: string;
    /** Description for file picker */
    description?: string;
    /** Progress callback for large files (only with File System Access API) */
    onProgress?: (written: number, total: number) => void;
}

/**
 * Check if File System Access API is available
 */
export function isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' &&
        'showSaveFilePicker' in window &&
        typeof window.showSaveFilePicker === 'function';
}

/**
 * Save a Blob to the user's file system
 * 
 * Uses File System Access API when available (Chrome/Edge 86+)
 * Falls back to traditional download link for other browsers
 * 
 * @param blob - The data to save
 * @param options - Save options including filename
 * @returns Promise that resolves when save is complete
 * 
 * @example
 * ```typescript
 * const zipBlob = await DownloadManager.exportChapter(id);
 * await saveFile(zipBlob, {
 *     filename: 'One Piece - Chapter 1100.cbz',
 *     mimeType: 'application/x-cbz',
 *     extension: 'cbz',
 *     description: 'Comic Book Archive'
 * });
 * ```
 */
export async function saveFile(blob: Blob, options: SaveOptions): Promise<boolean> {
    const { filename, mimeType, extension, description, onProgress } = options;

    // Try modern File System Access API first
    if (isFileSystemAccessSupported()) {
        try {
            return await saveWithFileSystemAccess(blob, {
                filename,
                mimeType: mimeType || blob.type || 'application/octet-stream',
                extension: extension || filename.split('.').pop() || 'bin',
                description: description || 'File',
                onProgress
            });
        } catch (error: any) {
            // User cancelled the dialog - this is normal
            if (error.name === 'AbortError') {
                console.log('[FileSaver] User cancelled save dialog');
                return false;
            }

            // API available but failed - fallback
            console.warn('[FileSaver] File System Access failed, using fallback:', error);
        }
    }

    // Fallback: Traditional download link
    return saveWithDownloadLink(blob, filename);
}

/**
 * Save using File System Access API (Modern browsers)
 * 
 * Advantages:
 * - User can choose save location
 * - Streaming support for large files
 * - Progress tracking possible
 * - Native OS file picker
 */
async function saveWithFileSystemAccess(
    blob: Blob,
    options: Required<Omit<SaveOptions, 'onProgress'>> & Pick<SaveOptions, 'onProgress'>
): Promise<boolean> {
    const { filename, mimeType, extension, description, onProgress } = options;

    // Build accept types for file picker
    const acceptTypes: Record<string, string[]> = {};
    acceptTypes[mimeType] = [`.${extension}`];

    // Show native file picker
    const handle = await window.showSaveFilePicker!({
        suggestedName: filename,
        types: [{
            description: description || `${extension.toUpperCase()} File`,
            accept: acceptTypes
        }]
    });

    // Create writable stream
    const writable = await handle.createWritable();

    try {
        if (onProgress && blob.size > 1024 * 1024) {
            // For large files (>1MB), write in chunks with progress
            await writeWithProgress(writable, blob, onProgress);
        } else {
            // Small files: write directly
            await writable.write(blob);
        }

        return true;
    } finally {
        // Always close the stream
        await writable.close();
    }
}

/**
 * Write blob in chunks with progress reporting
 * 
 * Handles large files (100MB+) without memory issues
 */
async function writeWithProgress(
    writable: FileSystemWritableFileStream,
    blob: Blob,
    onProgress: (written: number, total: number) => void
): Promise<void> {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const total = blob.size;
    let written = 0;

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        const chunk = blob.slice(offset, Math.min(offset + CHUNK_SIZE, total));
        await writable.write(chunk);

        written += chunk.size;
        onProgress(written, total);

        // Yield to prevent UI blocking
        await new Promise(r => setTimeout(r, 0));
    }
}

/**
 * Fallback: Save using download link (Legacy browsers)
 * 
 * Works on all browsers but:
 * - User cannot choose location (uses Downloads folder)
 * - No progress tracking
 * - May have size limits on very old browsers
 */
function saveWithDownloadLink(blob: Blob, filename: string): boolean {
    try {
        // Create object URL
        const url = URL.createObjectURL(blob);

        // Create temporary download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        // Append, click, remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up object URL after a delay
        // (some browsers need time to start the download)
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        return true;
    } catch (error) {
        console.error('[FileSaver] Download link fallback failed:', error);
        return false;
    }
}

/**
 * Helper: Get file type configuration for common formats
 */
export function getFileTypeConfig(format: 'zip' | 'cbz' | 'cbr' | 'pdf' | 'jpg' | 'png') {
    const configs: Record<string, { mimeType: string; extension: string; description: string }> = {
        zip: { mimeType: 'application/zip', extension: 'zip', description: 'ZIP Archive' },
        cbz: { mimeType: 'application/x-cbz', extension: 'cbz', description: 'Comic Book Archive (ZIP)' },
        cbr: { mimeType: 'application/x-cbr', extension: 'cbr', description: 'Comic Book Archive (RAR)' },
        pdf: { mimeType: 'application/pdf', extension: 'pdf', description: 'PDF Document' },
        jpg: { mimeType: 'image/jpeg', extension: 'jpg', description: 'JPEG Image' },
        png: { mimeType: 'image/png', extension: 'png', description: 'PNG Image' }
    };

    return configs[format] || configs.zip;
}

/**
 * High-level: Export and save chapter in one call
 */
export async function exportAndSaveChapter(
    downloadManager: { exportChapter: (id: string, options?: { format?: 'zip' | 'cbz'; onProgress?: (p: number) => void }) => Promise<Blob> },
    chapterId: string,
    options: {
        format?: 'zip' | 'cbz';
        mangaTitle: string;
        chapterTitle: string;
        onExportProgress?: (percent: number) => void;
        onSaveProgress?: (written: number, total: number) => void;
    }
): Promise<boolean> {
    const { format = 'cbz', mangaTitle, chapterTitle, onExportProgress, onSaveProgress } = options;

    // Generate archive
    const blob = await downloadManager.exportChapter(chapterId, {
        format,
        onProgress: onExportProgress
    });

    // Build filename
    const safeTitle = mangaTitle.replace(/[<>:"/\\|?*]/g, '_');
    const safeChapter = chapterTitle.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeTitle} - ${safeChapter}.${format}`;

    // Get type config
    const typeConfig = getFileTypeConfig(format);

    // Save to disk
    return saveFile(blob, {
        filename,
        ...typeConfig,
        onProgress: onSaveProgress
    });
}
