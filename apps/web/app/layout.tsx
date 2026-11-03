import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ChainSightline — Follow the evidence", description: "Evidence-first blockchain investigations with clear timelines, explainable signals and honest uncertainty." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-theme="dark"><body>{children}</body></html>; }
