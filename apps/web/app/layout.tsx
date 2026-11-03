import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });
const boot = "try{var d=document.documentElement,t=localStorage.getItem('chainsightline-theme');if(t==='dark'||t==='light')d.dataset.theme=t;if(sessionStorage.getItem('chainsightline-intro'))d.dataset.intro='seen';else sessionStorage.setItem('chainsightline-intro','1')}catch(e){}";
export const metadata: Metadata = { title: "ChainSightline: follow the line", description: "Evidence-first blockchain investigations laid out one stop at a time. Preview with invented data." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light" className={sans.variable + " " + serif.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: boot }} /></head><body>{children}</body></html>;
}
