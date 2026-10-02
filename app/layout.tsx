import type { Metadata, Viewport } from "next";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export const metadata: Metadata = {
  title: {
    default: "NOIDA.FIT — Discover Fitness Communities & Events in Noida",
    template: "%s | NOIDA.FIT",
  },
  description:
    "The city-first fitness discovery and community platform for Noida & Greater Noida. Find running clubs, group workouts, cycling rides, and fitness events happening near you.",
  keywords: [
    "fitness in Noida",
    "running clubs Noida",
    "fitness communities Noida",
    "fitness events Noida",
    "running groups Noida",
    "sports activities Noida",
    "cycling groups Noida",
    "group workouts Noida",
    "Noida fitness",
    "Greater Noida fitness",
  ],
  authors: [{ name: "NOIDA.FIT" }],
  creator: "NOIDA.FIT",
  publisher: "NOIDA.FIT",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://noida.fit"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://noida.fit",
    siteName: "NOIDA.FIT",
    title: "NOIDA.FIT — Discover Fitness Communities & Events in Noida",
    description:
      "Find running clubs, group workouts, cycling rides, and fitness events in Noida & Greater Noida.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NOIDA.FIT — The Heartbeat of Noida Fitness",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOIDA.FIT — Discover Fitness Communities & Events in Noida",
    description:
      "Find running clubs, group workouts, cycling rides, and fitness events in Noida & Greater Noida.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
