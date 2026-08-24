import Link from "next/link";
import { CairnScene } from "@/components/landing/CairnScene";
import { LandingBrowseForm } from "@/components/landing/LandingBrowseForm";

/**
 * The landing page, ported from the Claude Design source ("Cairn Landing.dc.html").
 *
 * Layering, bottom to top: the WebGL terrain, a vertical veil that flattens the top
 * and bottom of the render so chrome sits on quiet ground, the night sky, a soft
 * bloom behind the wordmark, the surveyor's annotations, and finally the content
 * column. Only the content column is in the accessibility tree; everything under it
 * is decoration.
 *
 * Copy note: the design's placeholder strip claimed "Written in Rust for raw speed",
 * which is not this project. The four cards below say true things about Cairn
 * instead; every other string is the design's.
 */

const REPO_URL = "https://github.com/u7k4rs6/Cairn";
const DOCS_URL = `${REPO_URL}/tree/master/docs`;
const QUICKSTART_URL = `${REPO_URL}#the-fastest-way-to-check-that-claim`;
const DEMO_REPO = "/acme/demo";

/** Fixed star field over the header band, positioned as percentages of the stage. */
const STARS = [
  { left: "19%", top: "11%", size: 2, opacity: 0.55 },
  { left: "29%", top: "22%", size: 1, opacity: 0.5 },
  { left: "38%", top: "8%", size: 2, opacity: 0.45, accent: true },
  { left: "48%", top: "19%", size: 1, opacity: 0.4 },
  { left: "57%", top: "9%", size: 1, opacity: 0.5 },
  { left: "66%", top: "25%", size: 2, opacity: 0.4 },
  { left: "74%", top: "6%", size: 1, opacity: 0.45, accent: true },
  { left: "86%", top: "27%", size: 1, opacity: 0.35 },
  { left: "9%", top: "26%", size: 1, opacity: 0.4 },
  { left: "92%", top: "16%", size: 2, opacity: 0.3 },
];

const FEATURES = [
  { key: "Git compatible", body: "Clone and push with the git you already have." },
  { key: "Secure by default", body: "Your data stays on your infrastructure." },
  { key: "Content-addressable", body: "A real object store and commit DAG, not a database in disguise." },
  { key: "Extensible", body: "REST API, org teams, and per-repository access control." },
];

export default function LandingPage() {
  return (
    <div className="lp-page">
      <CairnScene accent="#afc9a5" density={3.0} />

      <div className="lp-veil" aria-hidden="true" />

      <div className="lp-sky" aria-hidden="true">
        <div className="lp-moon" />
        {STARS.map((s, i) => (
          <div
            key={i}
            className="lp-star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              ...(s.accent ? { background: "var(--lp-accent)" } : null),
            }}
          />
        ))}
      </div>

      <div className="lp-bloom" aria-hidden="true" />

      <div className="lp-annots" aria-hidden="true">
        <div className="lp-annot lp-annot-1">
          <div className="lp-note">
            <div className="lp-note-key">self-hosted</div>
            <div className="lp-note-body">
              You own your code.
              <br />
              Always.
            </div>
          </div>
          <div className="lp-leader" />
        </div>

        <div className="lp-annot lp-annot--right lp-annot-2">
          <div className="lp-leader" />
          <div className="lp-note">
            <div className="lp-note-key">open source</div>
            <div className="lp-note-body">
              Transparent by design.
              <br />
              Built for everyone.
            </div>
          </div>
        </div>

        <div className="lp-annot lp-annot--brass lp-annot-3">
          <div className="lp-note">
            <div className="lp-note-key">you push</div>
            <div className="lp-note-cmd">git push origin main</div>
          </div>
          <div className="lp-leader" />
        </div>

        <div className="lp-annot lp-annot--right lp-annot--brass lp-annot-4">
          <div className="lp-leader" />
          <div className="lp-note">
            <div className="lp-note-key">you control</div>
            <div className="lp-note-body">
              No lock-in. No cloud.
              <br />
              Just your rules.
            </div>
          </div>
        </div>
      </div>

      <div className="lp-content">
        <header className="lp-header">
          <Link href="/" className="lp-brand">
            {/* Four stacked slabs narrowing upward: the wordmark cairn, in the
                landing palette rather than the product mark's `currentColor`. */}
            <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden="true">
              <rect x="6" y="1" width="5" height="2.6" rx="1.3" fill="#afc9a5" />
              <rect x="4" y="5.6" width="9" height="2.8" rx="1.4" fill="#c6d0ae" />
              <rect x="2" y="10.4" width="13" height="3.1" rx="1.55" fill="#97a180" />
              <rect x="0.5" y="15.5" width="16" height="3.3" rx="1.65" fill="#6e7657" />
            </svg>
            <span className="lp-brand-word">cairn</span>
          </Link>

          <nav className="lp-nav" aria-label="Primary">
            <a href="#features">features</a>
            <a href={DOCS_URL}>docs</a>
            <Link href={DEMO_REPO}>explore</Link>
          </nav>

          <div className="lp-actions">
            <a href={QUICKSTART_URL} className="lp-icon-link" title="Clone from the command line">
              <span className="sr-only">Clone from the command line</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <path d="M3 5.5 5.6 8 3 10.5" />
                <path d="M7.6 11h5" />
              </svg>
            </a>
            <Link href="/login" className="lp-signin">
              Sign in
            </Link>
            <Link href="/signup" className="lp-cta">
              Get started
            </Link>
          </div>
        </header>

        <main id="main" className="lp-main">
          <div className="lp-diamond" aria-hidden="true" />
          <h1 className="lp-title">cairn</h1>
          <p className="lp-deck">
            A self-hosted Git host built on a real content-addressable version-control engine.
          </p>
          <p className="lp-kicker">Fast, secure, and yours.</p>

          <LandingBrowseForm />

          <div className="lp-hint">
            Example:{" "}
            <Link href={DEMO_REPO} className="lp-mono">
              acme/demo
            </Link>
          </div>
        </main>

        <section id="features" className="lp-strip" aria-label="What Cairn is">
          {FEATURES.map((f) => (
            <div key={f.key} className="lp-strip-item">
              <div className="lp-strip-key">{f.key}</div>
              <div className="lp-strip-body">{f.body}</div>
            </div>
          ))}
        </section>

        <footer className="lp-footer">
          <div>cairn &middot; self-hosted &middot; java 21</div>
          <div className="lp-footer-links">
            <a href={REPO_URL}>source</a>
            <a href={DOCS_URL}>docs</a>
            <Link href={DEMO_REPO}>demo</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
