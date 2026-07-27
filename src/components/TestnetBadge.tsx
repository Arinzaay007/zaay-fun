import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Testnet badge — shown in the header and on token pages so users always
 * know they're on Monad Testnet and no real funds are involved.
 */
export function TestnetBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold",
        className
      )}
      title="This app runs on Monad Testnet. Tokens have no real value."
    >
      <FlaskConical className="h-3.5 w-3.5" />
      Testnet
    </span>
  );
}
