import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import AutoDownloader from '@/components/AutoDownloader';
import GlobalDownloadManager from '@/components/GlobalDownloadManager';
import { DownloadSafetyProvider } from '@/components/DownloadSafetyProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MangaCloud",
  description: "Your personal manga cloud reader",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MangaCloud",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport = {
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <AuthGuard>
            <DownloadSafetyProvider>
              <AutoDownloader />
              <GlobalDownloadManager />
              {children}
            </DownloadSafetyProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
