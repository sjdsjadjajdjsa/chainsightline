import type { Metadata } from "next";
import { DM_Sans, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const headingFont = Manrope({ subsets: ["latin"], variable: "--font-heading" });
const editorialFont = Source_Serif_4({ subsets: ["latin"], variable: "--font-editorial", style: ["normal", "italic"] });
export const metadata: Metadata = { title: "ChainSightline — Follow the evidence", description: "Evidence-first blockchain investigations with clear timelines, explainable signals and honest uncertainty." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-theme="dark"><body className={`${bodyFont.variable} ${headingFont.variable} ${editorialFont.variable}`}>{children}</body></html>; }
