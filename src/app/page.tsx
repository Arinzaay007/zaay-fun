import Link from "next/link";
import { Rocket, Coins, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TestnetBadge } from "@/components/TestnetBadge";
import { RecentLaunches } from "./RecentLaunches";

export default function HomePage() {
  return (
    <div className="container py-10 sm:py-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 px-6 py-14 text-center sm:px-12 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex justify-center">
            <TestnetBadge />
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Launch a token on any{" "}
            <span className="text-gradient-gold">prmpted.com</span> post
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            A pump-style bonding-curve launchpad for the prmpted community.
            Every trade sends a <span className="text-gold">4% creator fee</span>{" "}
            to the original poster — held safely in escrow until they claim.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/launch">
                <Rocket className="h-4 w-4" /> Launch a token
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">
                Explore launches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Feature cards */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Feature
          icon={<Coins className="h-5 w-5 text-gold" />}
          title="Bonding-curve trading"
          body="Price rises as more people buy. Instant liquidity, no order book — just a curve."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5 text-secondary" />}
          title="Creator fees + escrow"
          body="4% of every trade goes to the original poster. Unclaimed? It's locked to their username on-chain."
        />
        <Feature
          icon={<TrendingUp className="h-5 w-5 text-accent" />}
          title="Claim & get paid"
          body="Posters verify their prmpted username, link a wallet, and all accrued fees are released."
        />
      </section>

      {/* Recent launches */}
      <section className="mt-14">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent launches</h2>
          <Link
            href="/explore"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        <RecentLaunches />
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted/60">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}
