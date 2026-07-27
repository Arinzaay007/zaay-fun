"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Rocket, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TestnetBadge } from "./TestnetBadge";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/launch", label: "Launch" },
  { href: "/claim", label: "Claim" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-gold to-blush text-background shadow-lg shadow-primary/30">
              <Rocket className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              zaay<span className="text-gradient-gold">.fun</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  pathname === item.href && "text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <TestnetBadge className="hidden sm:inline-flex" />
          <div className="hidden sm:block">
            <ConnectButton
              showBalance={false}
              accountStatus="address"
              chainStatus="icon"
            />
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground",
                  pathname === item.href && "bg-muted/50 text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between">
            <TestnetBadge />
            <ConnectButton showBalance={false} accountStatus="address" />
          </div>
        </div>
      )}
    </header>
  );
}
