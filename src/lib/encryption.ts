/**
 * Simple Token Encryption Utility using Web Crypto API.
 * Uses the user's Firebase UID as a seed to derive a key.
 */

async function deriveKey(uid: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const password = encoder.encode(uid);
    const salt = encoder.encode('manga-app-salt-v1'); // Consistency is key for decryption

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        password,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encryptToken(uid: string, token: string) {
    const key = await deriveKey(uid);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedToken = encoder.encode(token);

    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedToken
    );

    return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
        iv: btoa(String.fromCharCode(...iv))
    };
}

export async function decryptToken(uid: string, encrypted: string, iv: string) {
    try {
        const key = await deriveKey(uid);
        const encryptedData = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
        const ivData = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));

        const decryptedContent = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivData },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedContent);
    } catch (e) {
        console.error('[Encryption] Decryption failed:', e);
        return null;
    }
}
