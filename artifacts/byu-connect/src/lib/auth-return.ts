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
