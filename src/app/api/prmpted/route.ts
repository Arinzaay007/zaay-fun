import { NextRequest, NextResponse } from "next/server";
import { SupabaseRestAdapter } from "@/lib/prmpted/supabase-rest";
import { normalizePrmptedUrl } from "@/lib/prmpted/adapter";
import { getAdminSupabase } from "@/lib/supabase/server";
import type { PrmptedPost } from "@/lib/types";

export const runtime = "nodejs";

const adapter = new SupabaseRestAdapter();

/**
 * POST /api/prmpted  { url }
 * Extracts (and caches) a prmpted.com post's author/title/content/media.
 * Cache is skipped when the cached entry came from the OG scraper (source="og")
 * so stale generic data is always refreshed via the real Supabase API.
 */
export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = normalizePrmptedUrl(String(body.url ?? ""));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid URL" },
      { status: 400 }
    );
  }

  const admin = getAdminSupabase();

  // Serve from cache only if fresh AND from the real API (not the OG fallback).
  if (admin) {
    const { data } = await admin
      .from("prmpted_posts")
      .select("*")
      .eq("url", url)
      .maybeSingle();
    if (data && data.source !== "og") {
      const ageMs = Date.now() - new Date(data.fetched_at).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        return NextResponse.json({ post: data as PrmptedPost, cached: true });
      }
    }
  }

  let post: PrmptedPost;
  try {
    post = await adapter.getPost(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch post" },
      { status: 502 }
    );
  }

  // Cache result (best-effort).
  if (admin) {
    await admin.from("prmpted_posts").upsert(
      {
        url: post.url,
        username: post.username,
        author: post.author,
        title: post.title,
        content: post.content,
        media: post.media,
        source: post.source,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "url" }
    );
  }

  return NextResponse.json({ post, cached: false });
}
