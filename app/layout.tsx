import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const heading = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Daivik Awasthi | Software Engineer | Problem Solver",
  description:
    "I build full-stack apps, backend services and AI features. Previously SWE intern at Goldman Sachs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${heading.variable}`}
    >
      <body className="font-sans antialiased bg-bg text-fg">
        <Providers>
          <Nav />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
