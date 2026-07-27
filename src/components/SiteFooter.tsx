import Link from "next/link";
import { TestnetBadge } from "./TestnetBadge";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">
            zaay<span className="text-gradient-gold">.fun</span>
          </span>
          <TestnetBadge />
        </div>
        <p className="text-center text-xs sm:text-right">
          A pump-style launchpad for the{" "}
          <span className="text-foreground">prmpted.com</span> community. For
          testing only — tokens have no real value.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/launch" className="hover:text-foreground">
            Launch
          </Link>
        </div>
      </div>
    </footer>
  );
}
