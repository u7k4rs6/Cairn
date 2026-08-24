"use client";

import { useEffect, useRef } from "react";
import type { CairnScene as CairnSceneEngine, CairnSceneOptions } from "./cairnScene";

/**
 * Mount point for the landing page's WebGL backdrop.
 *
 * Everything here is lifecycle: the scene itself is a plain class in `cairnScene.ts`
 * with no React in it. three.js arrives through a dynamic `import()` so it lands in
 * its own chunk instead of the first-load bundle, and so the page renders (and is
 * fully readable) before a single byte of it is fetched. The whole element is
 * decorative, hence `aria-hidden` - nothing below it depends on the canvas existing,
 * and a browser without WebGL just gets the flat background the design falls back to.
 */
export function CairnScene({ accent = "#afc9a5", density = 3.0 }: CairnSceneOptions) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CairnSceneEngine | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Read the preference at the moment the engine is constructed rather than at
    // render time, so a mid-session change is honoured by the listener below.
    const motionOf = () => (reduceMotion.matches ? "still" : "breathing");
    const onMotionChange = () => engineRef.current?.setMotion(motionOf());
    reduceMotion.addEventListener("change", onMotionChange);

    let cancelled = false;
    import("./cairnScene")
      .then(({ CairnScene: Engine }) => {
        if (cancelled || !hostRef.current) return;
        engineRef.current = new Engine(hostRef.current, { accent, density, motion: motionOf() });
      })
      .catch(() => {
        // No WebGL, or the chunk failed to load. The page is complete without it.
      });

    return () => {
      cancelled = true;
      reduceMotion.removeEventListener("change", onMotionChange);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [accent, density]);

  return <div ref={hostRef} className="lp-scene" aria-hidden="true" />;
}
