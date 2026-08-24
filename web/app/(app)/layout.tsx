import Link from "next/link";
import { SessionStatus } from "@/components/SessionStatus";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CairnMark } from "@/components/CairnMark";
import { GotoSearchBox } from "@/components/GotoSearchBox";

/**
 * Chrome for every product route: skip link, top bar, and the `#main` landmark.
 * The marketing landing page lives in the sibling `(landing)` group and renders
 * none of this. Route groups carry no URL segment, so paths are unchanged.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-route focus:text-on-route focus:px-3 focus:py-1.5 focus:rounded"
      >
        Skip to content
      </a>
      <header className="border-b border-hairline px-4 py-2 flex items-center gap-4 bg-surface">
        <Link href="/" className="flex items-center gap-2 shrink-0 text-ink hover:text-route transition-colors">
          <CairnMark size={22} />
          <span className="font-display font-bold text-lg tracking-tight">cairn</span>
        </Link>
        <GotoSearchBox />
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <SessionStatus />
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
