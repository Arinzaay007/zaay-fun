import type { PrmptedPost, MediaItem } from "@/lib/types";
import { PromptedAdapter, normalizePrmptedUrl } from "./adapter";
import { OgScraperAdapter } from "./og-scraper";

/**
 * prmpted.com is a client-rendered React SPA: every URL serves the same static
 * HTML shell with site-wide default OG tags, so meta-tag scraping can never see
 * per-post data. The SPA loads each post from a *public* Supabase backend
 * (anon key + RLS — the same read path the prmpted frontend itself uses).
 *
 * This adapter talks to that public REST API directly to get the real post:
 * title, prompt, images, videos, and the author's username. It falls back to
 * the OG scraper if the id can't be resolved or the request fails.
 *
 * The URL + anon key below are prmpted.com's own public values (extracted from
 * their client bundle); override via env if they ever rotate.
 */
const PRMPTED_SUPABASE_URL =
  process.env.PRMPTED_SUPABASE_URL ??
  "https://hgzkeaicuxvqsiacqnul.supabase.co";
const PRMPTED_SUPABASE_ANON_KEY =
  process.env.PRMPTED_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnemtlYWljdXh2cXNpYWNxbnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzQ3NDcsImV4cCI6MjA4NDcxMDc0N30.V2VQe0YAfqmVJZ5V2il22b6SGtFnAi7yJDbSSUjJZ4M";

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extract a post identifier from a prmpted.com URL.
 * Handles:
 *   /post/<uuid>           → { type: "id",   value: "<uuid>" }
 *   /<username>/post/<slug> → { type: "slug", value: "<slug>" }
 */
function postRefFromUrl(
  url: string
): { type: "id" | "slug"; value: string } | null {
  const uuidMatch = url.match(UUID_RE);
  if (uuidMatch) return { type: "id", value: uuidMatch[0] };

  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    // /<username>/post/<slug>  or  /post/<slug>
    const postIdx = parts.indexOf("post");
    if (postIdx !== -1 && parts[postIdx + 1]) {
      return { type: "slug", value: parts[postIdx + 1] };
    }
  } catch {
    // ignore
  }
  return null;
}

type PrmptedProfile = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  avatar_emoji?: string | null;
};

type PrmptedApiPost = {
  id: string;
  title: string | null;
  prompt: string | null;
  images: string[] | null;
  videos: Array<{ url?: string } | string> | null;
  profiles: PrmptedProfile | null;
};

function toMedia(post: PrmptedApiPost): MediaItem[] {
  const media: MediaItem[] = [];
  for (const img of post.images ?? []) {
    if (typeof img === "string" && img) media.push({ type: "image", url: img });
  }
  for (const vid of post.videos ?? []) {
    const url = typeof vid === "string" ? vid : vid?.url;
    if (typeof url === "string" && url) media.push({ type: "video", url });
  }
  return media;
}

export class SupabaseRestAdapter implements PromptedAdapter {
  private fallback = new OgScraperAdapter();

  async getPost(rawUrl: string): Promise<PrmptedPost> {
    const url = normalizePrmptedUrl(rawUrl);
    const ref = postRefFromUrl(url);

    // No post ref in the URL (e.g. a profile or the homepage) — let the OG
    // scraper do its best.
    if (!ref) return this.fallback.getPost(url);

    try {
      const filter =
        ref.type === "id"
          ? `id=eq.${ref.value}`
          : `slug=eq.${encodeURIComponent(ref.value)}`;
      const endpoint =
        `${PRMPTED_SUPABASE_URL}/rest/v1/posts` +
        `?${filter}` +
        `&select=id,title,prompt,images,videos,profiles:user_id(username,display_name,avatar_url,avatar_emoji)` +
        `&limit=1`;

      const res = await fetch(endpoint, {
        headers: {
          apikey: PRMPTED_SUPABASE_ANON_KEY,
          authorization: `Bearer ${PRMPTED_SUPABASE_ANON_KEY}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return this.fallback.getPost(url);
      const rows = (await res.json()) as PrmptedApiPost[];
      const post = Array.isArray(rows) ? rows[0] : null;
      if (!post) return this.fallback.getPost(url);

      const profile = post.profiles ?? {};
      const username = profile.username?.replace(/^@+/, "") ?? null;
      const author = profile.display_name || username || null;
      const media = toMedia(post);

      return {
        url,
        username,
        author,
        title: post.title ?? "prmpted.com post",
        // The prompt is the meat of a prmpted post; fall back to the title.
        content: post.prompt ?? post.title ?? null,
        media,
        source: "api",
      };
    } catch {
      // network/timeout/parse — degrade to scraping
      return this.fallback.getPost(url);
    }
  }
}
