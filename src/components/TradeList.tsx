import type { TradeRow } from "@/lib/types";
import { shortAddress, formatMon, timeAgo } from "@/lib/utils";
import { explorerTx } from "@/lib/chains";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function TradeList({ trades }: { trades: TradeRow[] }) {
  if (!trades || trades.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No trades yet.
      </p>
    );
  }
  return (
    <div className="scrollbar-thin max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card/95 text-left text-xs text-muted-foreground backdrop-blur">
          <tr>
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">MON</th>
            <th className="py-2 font-medium">Tokens</th>
            <th className="py-2 font-medium">Trader</th>
            <th className="py-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const buy = t.side === "buy";
            return (
              <tr key={t.id} className="border-t border-border/40">
                <td className="py-2">
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      buy ? "text-success" : "text-destructive"
                    }`}
                  >
                    {buy ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {buy ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className="py-2">{formatMon(t.mon_amount)}</td>
                <td className="py-2">{formatMon(t.token_amount, 2)}</td>
                <td className="py-2 font-mono text-xs text-muted-foreground">
                  {t.tx_hash ? (
                    <a
                      href={explorerTx(t.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      {shortAddress(t.trader)}
                    </a>
                  ) : (
                    shortAddress(t.trader)
                  )}
                </td>
                <td className="py-2 text-right text-xs text-muted-foreground">
                  {timeAgo(t.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
