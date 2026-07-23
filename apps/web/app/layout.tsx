import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth/auth-context";
import { ToastProvider } from "../components/Toast";
import { AppShell } from "../components/AppShell";

// Per DESIGN.md §3: Instrument Serif (display/serif, wordmark always
// italic) + Schibsted Grotesk (UI sans). Loaded locally via next/font
// instead of the source doc's <link> tags (same families, self-hosted —
// no runtime request to fonts.googleapis.com).
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-schibsted-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sousbot-web-production.up.railway.app"),
  title: "Sousbot — AI recipes from a photo of your fridge",
  description:
    "Snap your fridge and get AI recipes with real macros, a weekly meal plan, and an auto-written shopping list — in seconds. 10 free recipes a month, no card.",
  keywords: [
    "AI recipe generator",
    "fridge photo recipes",
    "what to cook",
    "meal planner app",
    "macro tracking recipes",
    "ingredient recognition",
    "AI meal planning",
    "shopping list app",
  ],
  openGraph: {
    type: "website",
    title: "Sousbot — AI recipes from a photo of your fridge",
    description:
      "Snap your fridge. Get recipes you can actually cook, with macros, a meal plan, and a shopping list that writes itself.",
    siteName: "Sousbot",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sousbot — What's for dinner, solved.",
    description:
      "AI recipes with real macros from a photo of your fridge. 10 free a month, no card.",
  },
};

export const viewport: Viewport = {
  themeColor: "#101314",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${schibstedGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
