"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenCard } from "@/components/TokenCard";
import { TestnetBadge } from "@/components/TestnetBadge";
import { fetchTokens } from "@/lib/api";
import { shortAddress } from "@/lib/utils";
import { explorerAddress } from "@/lib/chains";
import type { TokenRow } from "@/lib/types";

type Claim = {
  username: string;
  wallet: string | null;
  status: "pending" | "verified";
  release_tx_hash: string | null;
} | null;

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const uname = decodeURIComponent(username).replace(/^@+/, "");

  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [claim, setClaim] = useState<Claim | undefined>(undefined);

  useEffect(() => {
    fetchTokens({ search: uname, limit: 100 })
      .then((all) =>
        setTokens(
          all.filter(
            (t) => t.creator_username.toLowerCase() === uname.toLowerCase()
          )
        )
      )
      .catch(() => setTokens([]));

    fetch(`/api/claim?username=${encodeURIComponent(uname)}`)
      .then((r) => r.json())
      .then((d) => setClaim(d.claim))
      .catch(() => setClaim(null));
  }, [uname]);

  const claimed = claim?.status === "verified" && Boolean(claim?.wallet);

  return (
    <div className="container max-w-5xl py-10">
      <Card className="mb-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-secondary/40 to-accent/40">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">@{uname}</h1>
                <TestnetBadge />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                prmpted.com creator
              </p>
            </div>
          </div>

          <div>
            {claim === undefined ? (
              <Skeleton className="h-16 w-48" />
            ) : claimed ? (
              <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" /> Claimed
                  </Badge>
                </div>
                <a
                  href={explorerAddress(claim!.wallet!)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  {shortAddress(claim!.wallet, 6)}
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-right">
                <Badge variant="secondary">
                  <Lock className="h-3 w-3" /> Unclaimed
                </Badge>
                <Link
                  href="/claim"
                  className="mt-1 block text-xs text-gold hover:underline"
                >
                  Is this you? Claim →
                </Link>
              </div>
            )}
          </div>
        </div>
      </Card>

      <h2 className="mb-4 text-lg font-semibold">
        Tokens {tokens ? `(${tokens.length})` : ""}
      </h2>

      {!tokens && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {tokens && tokens.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No tokens have been launched on @{uname}&apos;s posts yet.
        </Card>
      )}

      {tokens && tokens.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => (
            <TokenCard key={t.address} token={t} />
          ))}
        </div>
      )}
    </div>
  );
}
