import type { Metadata } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (redesign spec, section 4): downloaded at build time
// and served from this origin, not fetched from Google at runtime. next/font also
// computes a size-matched fallback so swapping in the real face causes no layout
// shift, on top of the explicit `display: "swap"` below.
const overpass = Overpass({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-overpass",
  display: "swap",
});
const overpassMono = Overpass_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-overpass-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cairn",
  description: "Self-hosted Git hosting and collaboration",
};

// Applies a stored theme override before first paint, so a returning visitor with
// an explicit choice never sees a flash of the other theme (ThemeToggle writes
// this same key/attribute; globals.css's [data-theme] selectors read it).
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("cairn-theme");
    if (stored === "light" || stored === "night") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

/**
 * Document shell only. The two route groups underneath it own their own chrome:
 * `(app)` renders the signed-in top bar around every product route, `(landing)`
 * renders the full-bleed marketing hero with its own header. Splitting them this
 * way keeps the landing page from having to hide a top bar it never wanted.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${overpass.variable} ${overpassMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
