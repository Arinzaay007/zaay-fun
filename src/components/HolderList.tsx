import type { HolderRow } from "@/lib/types";
import { shortAddress, formatCompact } from "@/lib/utils";
import { explorerAddress } from "@/lib/chains";

export function HolderList({
  holders,
  totalSupply,
}: {
  holders: HolderRow[];
  totalSupply?: number;
}) {
  if (!holders || holders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No holders yet.
      </p>
    );
  }
  return (
    <div className="scrollbar-thin max-h-96 space-y-1 overflow-y-auto">
      {holders.map((h, i) => {
        const pct =
          totalSupply && totalSupply > 0
            ? (h.balance / totalSupply) * 100
            : null;
        return (
          <div
            key={h.wallet}
            className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">
                {i + 1}
              </span>
              <a
                href={explorerAddress(h.wallet)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm hover:text-primary"
              >
                {shortAddress(h.wallet, 5)}
              </a>
            </div>
            <div className="text-right">
              <div className="text-sm">{formatCompact(h.balance)}</div>
              {pct != null && (
                <div className="text-[11px] text-muted-foreground">
                  {pct.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
