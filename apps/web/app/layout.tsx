import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const headingFont = Manrope({ subsets: ["latin"], variable: "--font-heading" });
export const metadata: Metadata = { title: "ChainSightline — Follow the evidence", description: "Evidence-first blockchain investigations with clear timelines, explainable signals and honest uncertainty." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-theme="dark"><body className={`${bodyFont.variable} ${headingFont.variable}`}>{children}</body></html>; }
