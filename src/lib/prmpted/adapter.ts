import type { PrmptedPost } from "@/lib/types";

/**
 * Adapter interface for fetching a prmpted.com post from a URL.
 *
 * prmpted.com has no documented public API, so the default implementation
 * ({@link OgScraperAdapter}) reads Open Graph / meta tags server-side. When a
 * real API becomes available, implement this interface and swap it in
 * {@link getPrmptedAdapter} — nothing else in the app needs to change.
 */
export interface PromptedAdapter {
  getPost(url: string): Promise<PrmptedPost>;
}

/** Validate + normalize a prmpted.com URL. Throws on anything else. */
export function normalizePrmptedUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("URL must start with http(s).");
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "prmpted.com" && !host.endsWith(".prmpted.com")) {
    throw new Error("Please paste a prmpted.com post URL.");
  }
  // strip tracking params
  u.hash = "";
  u.search = "";
  return u.toString();
}

/**
 * Best-effort username extraction from a prmpted.com URL path.
 * Handles shapes like /@alice/... , /u/alice/... , /alice/post/123
 */
export function usernameFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    let first = decodeURIComponent(parts[0]);
    if (first.startsWith("@")) return first.slice(1);
    if ((first === "u" || first === "user" || first === "p") && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    // fall back to first segment if it isn't an obvious route word
    const routeWords = new Set(["post", "posts", "prompt", "prompts", "explore"]);
    if (!routeWords.has(first.toLowerCase())) return first;
    return null;
  } catch {
    return null;
  }
}
