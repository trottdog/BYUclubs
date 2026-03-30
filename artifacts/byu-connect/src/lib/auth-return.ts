/** Routes that send guests to /auth; navigating "back" to these without a session loops back to login. */
function isAuthGateReturnPath(path: string): boolean {
  const p = path.split("?")[0] || "/";
  if (p === "/events/new") return true;
  if (p === "/profile" || p.startsWith("/profile/")) return true;
  if (p === "/super-admin" || p.startsWith("/super-admin/")) return true;
  return false;
}

/**
 * Destination for the auth screen Back control: same as return URL when safe,
 * otherwise home (avoids /events/new ↔ /auth loops for logged-out users).
 */
export function getAuthPageBackPath(search: string): string {
  const dest = getSafeReturnPath(search);
  if (isAuthGateReturnPath(dest)) return "/";
  return dest;
}

/** Safe in-app path for post-login / back-from-auth navigation (blocks open redirects and /auth loops). */
export function getSafeReturnPath(search: string): string {
  const params = new URLSearchParams(search);
  const raw = params.get("return") ?? params.get("next");
  if (!raw) return "/";
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/";
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
  const pathOnly = decoded.split("?")[0] ?? "/";
  if (pathOnly === "/auth" || pathOnly.startsWith("/auth/")) return "/";
  return pathOnly || "/";
}

export function authHrefWithReturn(currentPath: string): string {
  if (currentPath === "/auth") return "/auth";
  return `/auth?return=${encodeURIComponent(currentPath)}`;
}
