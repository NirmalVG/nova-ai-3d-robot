import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova AI — 3D Robot Companion",
  description:
    "Meet your AI in 3D. A fully articulated, intelligent humanoid robot that lives in your browser — talk, gesture, and build a relationship. Powered by Weblyr AI.",
  keywords: [
    "AI companion",
    "3D robot",
    "humanoid",
    "browser AI",
    "voice chat",
    "Three.js",
    "WebGL",
  ],
  authors: [{ name: "Nirmal V G" }],
  openGraph: {
    title: "Nova AI — 3D Robot Companion",
    description:
      "A fully interactive 3D humanoid robot that lives in your browser — talk, gesture, build a relationship.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="min-h-full flex flex-col bg-neutral-950 text-white overflow-hidden">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-neutral-950 focus:rounded-lg focus:font-medium"
        >
          Skip to content
        </a>
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
