import type { Metadata } from "next";
import { Anybody, Archivo, Cormorant_Infant, IBM_Plex_Mono } from "next/font/google";
import "./landing.css";

/*
  The landing page runs its own type system, separate from the product's Overpass
  pair: a serif for the wordmark, a geometric sans for the deck, a neutral sans for
  UI, and a mono for every structural datum. Self-hosted through next/font for the
  same reason the product faces are (no runtime request to Google, no layout shift).
*/
const cormorant = Cormorant_Infant({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--lp-font-serif",
  display: "swap",
});
const anybody = Anybody({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--lp-font-deck",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--lp-font-ui",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--lp-font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cairn - a self-hosted Git host with a real VCS engine",
  description:
    "A self-hosted Git host built on a real content-addressable version-control engine. Fast, secure, and yours.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`lp-root ${cormorant.variable} ${anybody.variable} ${archivo.variable} ${plexMono.variable}`}
    >
      {children}
    </div>
  );
}
