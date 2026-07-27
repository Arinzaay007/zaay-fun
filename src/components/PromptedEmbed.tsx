import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PrmptedPost, MediaItem, TokenRow } from "@/lib/types";

type PostLike = Pick<
  TokenRow,
  "prmpted_url" | "post_author" | "post_title" | "post_content" | "post_media"
> & { creator_username?: string };

/** Renders the original prmpted.com post, embedded on the token page. */
export function PromptedEmbed({
  post,
}: {
  post: PrmptedPost | PostLike;
}) {
  const url = "prmpted_url" in post ? post.prmpted_url : post.url;
  const author =
    "post_author" in post ? post.post_author : post.author;
  const title = "post_title" in post ? post.post_title : post.title;
  const content =
    "post_content" in post ? post.post_content : post.content;
  const media: MediaItem[] =
    ("post_media" in post ? post.post_media : post.media) ?? [];
  const username =
    "creator_username" in post
      ? post.creator_username
      : "username" in post
        ? post.username
        : undefined;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-secondary/25 text-xs font-bold text-secondary">
            P
          </span>
          <span className="text-sm font-medium">
            {author || (username ? `@${username}` : "prmpted.com")}
          </span>
          <Badge variant="outline" className="text-[10px]">
            prmpted.com
          </Badge>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-3 p-4">
        {title && <h4 className="font-semibold leading-snug">{title}</h4>}
        {content && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {content}
          </p>
        )}
        {media.length > 0 && media[0]?.url && (
          <div className="overflow-hidden rounded-xl border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media[0].url}
              alt={title || "post media"}
              className="max-h-80 w-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
