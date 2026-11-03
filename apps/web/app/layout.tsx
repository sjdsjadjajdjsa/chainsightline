import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });
const boot = "try{var d=document.documentElement,t=localStorage.getItem('chainsightline-theme');if(t==='dark'||t==='light')d.dataset.theme=t;if(!/[?&]intro(=|&|$)/.test(location.search)&&sessionStorage.getItem('chainsightline-intro'))d.dataset.intro='seen';else sessionStorage.setItem('chainsightline-intro','1')}catch(e){}";
export const metadata: Metadata = { title: "ChainSightline: follow the line", description: "Paste an Ethereum transaction or address and follow what moved, one stop at a time, with the uncertainty kept in view." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light" className={sans.variable + " " + serif.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: boot }} /></head><body>{children}</body></html>;
}
