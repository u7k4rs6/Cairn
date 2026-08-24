"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseOwnerRepoPath } from "@/lib/repoPath";

/**
 * The hero's "owner/repo" box. Same contract as the product's `BrowseForm` - parse,
 * then push a relative path so the navigation never depends on the host/port the
 * server happens to be bound to - but wearing the landing page's own styling rather
 * than the product's `ui/Input` + `ui/Button` pair, which are themed for the light
 * "survey sheet" surface and would be illegible here.
 */
export function LandingBrowseForm() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const path = parseOwnerRepoPath(value);
    if (path) {
      router.push(`/${path}`);
    }
  }

  return (
    <form onSubmit={submit} className="lp-form">
      <input
        type="text"
        className="lp-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="owner/repo"
        aria-label="Repository path"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
      />
      <button type="submit" className="lp-submit">
        Browse
      </button>
    </form>
  );
}
