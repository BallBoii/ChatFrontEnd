import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { SocketProvider } from "@/context/SocketContext";
import { EventNotifications } from "@/components/chat/EventNotifications";

export const metadata: Metadata = {
  title: "GhostRooms",
  description: "Session-only chat. No accounts, no history.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
    ],
    apple: '/icon-192.svg',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SocketProvider>
          {children}
          <EventNotifications />
        </SocketProvider>
      </body>
    </html>
  );
}
