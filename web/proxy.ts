import { NextResponse, type NextRequest } from "next/server";
import { internalApiUrl } from "@/lib/apiBase";

/**
 * Forwards same-origin `/api/*` calls to the private Cairn API.
 *
 * This exists instead of a `rewrites()` entry in `next.config.ts` because
 * `rewrites()` is evaluated during `next build` and its destination is frozen into
 * `routes-manifest.json`. `INTERNAL_API_URL` is a *runtime* variable everywhere
 * this app is deployed - `docker-compose.yml` sets it as a container environment
 * variable, Railway sets it as a service variable - so at build time it is absent
 * and the manifest bakes the `http://localhost:8080` fallback. The result is an app
 * whose server-rendered pages work (they read the environment at request time) while
 * every browser-initiated call - sign in, sign up, sign out, session status, and
 * every client island that writes - returns 500 against a port nothing is listening
 * on. Proxy runs per request in the Node.js runtime, so it reads the real value.
 *
 * Why proxy the calls at all rather than let the browser reach the API directly:
 * `cairn_session` is `HttpOnly` and `SameSite=Lax` with no `Domain`, so it is only
 * delivered reliably as a first-party cookie on this app's own origin. See
 * `lib/apiBase.ts`.
 *
 * The matcher claims the whole `/api/*` namespace, so this app cannot also serve its
 * own Route Handlers there - Proxy runs ahead of app routes. That is intentional:
 * `/api` belongs to the Cairn API, and anything this app needs to expose itself
 * should live under a different prefix.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(pathname + search, internalApiUrl()));
}

export const config = {
  matcher: "/api/:path*",
};
