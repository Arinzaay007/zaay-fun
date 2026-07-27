"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TokenCard } from "@/components/TokenCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { fetchTokens } from "@/lib/api";
import type { TokenRow } from "@/lib/types";
import { Rocket } from "lucide-react";

export function RecentLaunches({ limit = 8 }: { limit?: number }) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens({ limit })
      .then(setTokens)
      .catch((e) => setError(e.message));
  }, [limit]);

  if (error) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load launches. {error}
      </Card>
    );
  }

  if (!tokens) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/60">
          <Rocket className="h-6 w-6 text-gold" />
        </div>
        <p className="font-medium">No tokens launched yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Be the first — paste a prmpted.com post URL and launch a token on it.
        </p>
        <Link
          href="/launch"
          className="mt-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Launch the first token
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tokens.map((t) => (
        <TokenCard key={t.address} token={t} />
      ))}
    </div>
  );
}
