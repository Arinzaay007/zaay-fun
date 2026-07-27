import type { PrmptedPost, MediaItem } from "@/lib/types";
import {
  PromptedAdapter,
  normalizePrmptedUrl,
  usernameFromUrl,
} from "./adapter";

/** Grab the content of a <meta> tag by property/name, first match wins. */
function meta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // property="og:title" content="..."  (either attr order)
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    );
    const m = html.match(re) ?? html.match(re2);
    if (m && m[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : null;
}

/** Try to pull author + media from JSON-LD blocks if present. */
function fromJsonLd(html: string): Partial<PrmptedPost> {
  const out: Partial<PrmptedPost> = {};
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return out;
  for (const b of blocks) {
    const jsonText = b.replace(/<[^>]+>/g, "");
    try {
      const data = JSON.parse(jsonText);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const author = node.author?.name ?? node.author;
        if (typeof author === "string" && !out.author) out.author = author;
        if (node.headline && !out.title) out.title = String(node.headline);
        if (node.articleBody && !out.content)
          out.content = String(node.articleBody);
        const img = node.image?.url ?? node.image;
        if (img && !out.media) {
          const url = Array.isArray(img) ? img[0] : img;
          if (typeof url === "string")
            out.media = [{ type: "image", url }];
        }
      }
    } catch {
      /* ignore malformed json-ld */
    }
  }
  return out;
}

/**
 * Default prmpted.com adapter: fetch the page server-side and parse OG/meta
 * tags + JSON-LD. Fragile by nature (no API), so it degrades gracefully and
 * always returns *something* usable, deriving the username from the URL path.
 */
export class OgScraperAdapter implements PromptedAdapter {
  async getPost(rawUrl: string): Promise<PrmptedPost> {
    const url = normalizePrmptedUrl(rawUrl);
    const urlUsername = usernameFromUrl(url);

    let html = "";
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; zaay.fun/1.0; +https://zaay.fun)",
          accept: "text/html",
        },
        // don't hang forever on a slow page
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) html = await res.text();
    } catch {
      // network/timeout — fall back to URL-derived data below
    }

    const ld = fromJsonLd(html);

    const title =
      meta(html, ["og:title", "twitter:title"]) ??
      ld.title ??
      titleTag(html);

    const content =
      meta(html, ["og:description", "twitter:description", "description"]) ??
      ld.content ??
      null;

    const image =
      meta(html, ["og:image", "twitter:image", "twitter:image:src"]) ??
      (ld.media && ld.media[0]?.url) ??
      null;

    const author =
      meta(html, [
        "article:author",
        "author",
        "og:site_name",
        "twitter:creator",
      ]) ??
      ld.author ??
      urlUsername;

    const media: MediaItem[] = image ? [{ type: "image", url: image }] : [];

    const username =
      urlUsername ??
      (author ? author.replace(/^@+/, "") : null);

    return {
      url,
      username: username ? username.replace(/^@+/, "") : null,
      author: author ?? username,
      title: title ?? "prmpted.com post",
      content,
      media,
      source: "og",
    };
  }
}

let _adapter: PromptedAdapter | null = null;

/** Singleton accessor. Swap the implementation here to use a real API later. */
export function getPrmptedAdapter(): PromptedAdapter {
  if (!_adapter) {
    // Lazy require avoids a circular import (SupabaseRestAdapter wraps
    // OgScraperAdapter as its fallback).
    const {
      SupabaseRestAdapter,
    } = require("./supabase-rest") as typeof import("./supabase-rest");
    _adapter = new SupabaseRestAdapter();
  }
  return _adapter;
}
