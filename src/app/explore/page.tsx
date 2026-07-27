"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { TokenCard } from "@/components/TokenCard";
import { TestnetBadge } from "@/components/TestnetBadge";
import { fetchTokens } from "@/lib/api";
import type { TokenRow } from "@/lib/types";

export default function ExplorePage() {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    setTokens(null);
    setError(null);
    fetchTokens({ search: q, limit: 100 })
      .then(setTokens)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div className="container py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            Explore <TestnetBadge />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every token launched on a prmpted.com post.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, symbol, creator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      {!tokens && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {tokens && tokens.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No tokens found{search ? ` for “${search}”` : ""}.
        </Card>
      )}

      {tokens && tokens.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tokens.map((t) => (
            <TokenCard key={t.address} token={t} />
          ))}
        </div>
      )}
    </div>
  );
}
