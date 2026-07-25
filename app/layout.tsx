import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import AppShell from "./components/AppShell";
import { ThemeProvider } from "./lib/theme/theme-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description = "Self-hosted bar inventory tracker — count stock, generate shopping lists, and keep every account isolated on your own Supabase backend.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Bar Inventory",
  description,
  openGraph: {
    title: "Bar Inventory",
    description,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bar Inventory",
    description,
  },
};

// Runs before paint, before React hydrates, so there's no flash of the
// wrong theme on load. Mirrors the logic in theme-context.tsx.
const themeInitScript = `(function(){try{var p=localStorage.getItem("theme-preference")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;

}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-gray-100 dark:bg-zinc-950" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
