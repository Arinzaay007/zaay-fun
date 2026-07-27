import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TokenRow } from "@/lib/types";
import { formatCompact, timeAgo } from "@/lib/utils";
import { CheckCircle2, Lock } from "lucide-react";

export function TokenCard({
  token,
  marketCap,
}: {
  token: TokenRow;
  marketCap?: number;
}) {
  const claimed = Boolean(token.creator_wallet);
  return (
    <Link href={`/token/${token.address}`}>
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
        <div className="flex gap-3 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                token.image_url ||
                token.post_media?.[0]?.url ||
                "/token-placeholder.svg"
              }
              alt={token.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/token-placeholder.svg";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{token.name}</h3>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                ${token.symbol}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              by @{token.creator_username}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {claimed ? (
                <Badge variant="success" className="text-[10px]">
                  <CheckCircle2 className="h-3 w-3" /> Claimed
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  <Lock className="h-3 w-3" /> Fees in escrow
                </Badge>
              )}
              {marketCap != null && (
                <span className="text-[11px] text-muted-foreground">
                  MC {formatCompact(marketCap)} MON
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="truncate">{token.post_title || "prmpted post"}</span>
          <span className="shrink-0">{timeAgo(token.created_at)}</span>
        </div>
      </Card>
    </Link>
  );
}
