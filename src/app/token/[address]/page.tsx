"use client";

import { use, useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { CheckCircle2, Lock, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TestnetBadge } from "@/components/TestnetBadge";
import { BuySellPanel } from "@/components/BuySellPanel";
import { BondingChart } from "@/components/BondingChart";
import { PromptedEmbed } from "@/components/PromptedEmbed";
import { TradeList } from "@/components/TradeList";
import { HolderList } from "@/components/HolderList";
import { tokenAbi, escrowAbi } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { usernameHash, curveSeries } from "@/lib/bondingCurve";
import { fetchToken, fetchTradesAndHolders } from "@/lib/api";
import { formatMon, formatCompact, shortAddress } from "@/lib/utils";
import { explorerAddress } from "@/lib/chains";
import Link from "next/link";
import type { TokenRow, TradeRow, HolderRow } from "@/lib/types";

export default function TokenPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const tokenAddress = address as `0x${string}`;

  const [meta, setMeta] = useState<TokenRow | null | undefined>(undefined);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [holders, setHolders] = useState<HolderRow[]>([]);

  const loadDb = useCallback(() => {
    fetchToken(address).then(setMeta).catch(() => setMeta(null));
    fetchTradesAndHolders(address)
      .then(({ trades, holders }) => {
        setTrades(trades);
        setHolders(holders);
      })
      .catch(() => {});
  }, [address]);

  useEffect(() => {
    loadDb();
  }, [loadDb]);

  // ---- on-chain reads ----
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "name",
  });
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "symbol",
  });
  const { data: supply, refetch: refetchSupply } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "totalSupply",
  });
  const { data: price, refetch: refetchPrice } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "currentPrice",
  });
  const { data: mcap, refetch: refetchMcap } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "marketCap",
  });

  const creatorUsername = meta?.creator_username;
  const uHash = creatorUsername ? usernameHash(creatorUsername) : undefined;

  const { data: escrowWallet } = useReadContract({
    address: CONTRACT_ADDRESSES.escrow as `0x${string}`,
    abi: escrowAbi,
    functionName: "walletFor",
    args: uHash ? [uHash] : undefined,
    query: { enabled: Boolean(uHash) },
  });
  const { data: pendingFees } = useReadContract({
    address: CONTRACT_ADDRESSES.escrow as `0x${string}`,
    abi: escrowAbi,
    functionName: "pending",
    args: uHash ? [uHash] : undefined,
    query: { enabled: Boolean(uHash) },
  });

  const zero = "0x0000000000000000000000000000000000000000";
  const claimed = Boolean(
    (escrowWallet && escrowWallet !== zero) || meta?.creator_wallet
  );

  const refreshChain = useCallback(() => {
    refetchSupply();
    refetchPrice();
    refetchMcap();
    loadDb();
  }, [refetchSupply, refetchPrice, refetchMcap, loadDb]);

  const displayName = (name as string) || meta?.name || "Token";
  const displaySymbol = (symbol as string) || meta?.symbol || "—";

  // price chart from trades if present, otherwise the theoretical curve
  const chartData =
    trades.length > 1
      ? [...trades]
          .reverse()
          .map((t, i) => ({ label: i + 1, price: t.price ?? 0 }))
      : curveSeries((supply as bigint) ?? 0n).map((p) => ({
          label: formatCompact(p.supply),
          price: p.price,
        }));

  if (meta === undefined) {
    return (
      <div className="container max-w-6xl py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                meta?.image_url ||
                meta?.post_media?.[0]?.url ||
                "/token-placeholder.svg"
              }
              alt={displayName}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/token-placeholder.svg";
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <span className="text-sm text-muted-foreground">
                ${displaySymbol}
              </span>
              <TestnetBadge />
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {creatorUsername && (
                <Link
                  href={`/profile/${creatorUsername}`}
                  className="hover:text-foreground"
                >
                  by @{creatorUsername}
                </Link>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tokenAddress);
                  toast.success("Address copied");
                }}
                className="inline-flex items-center gap-1 font-mono text-xs hover:text-foreground"
              >
                {shortAddress(tokenAddress)} <Copy className="h-3 w-3" />
              </button>
              <a
                href={explorerAddress(tokenAddress)}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <Stat
            label="Price"
            value={`${price ? formatMon(formatEther(price as bigint), 6) : "—"} MON`}
          />
          <Stat
            label="Market cap"
            value={`${mcap ? formatCompact(formatEther(mcap as bigint)) : "—"} MON`}
          />
          <Stat
            label="Supply"
            value={supply ? formatCompact(formatEther(supply as bigint)) : "—"}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: chart + tabs */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {trades.length > 1 ? "Price history" : "Bonding curve"}
              </h2>
              <span className="text-xs text-muted-foreground">
                {trades.length > 1
                  ? "Recent trade prices"
                  : "Price rises as supply grows"}
              </span>
            </div>
            <BondingChart data={chartData} />
          </Card>

          {/* Creator fee status */}
          <FeeStatus
            claimed={claimed}
            username={creatorUsername}
            wallet={
              (escrowWallet && escrowWallet !== zero
                ? (escrowWallet as string)
                : meta?.creator_wallet) ?? null
            }
            pending={pendingFees ? formatEther(pendingFees as bigint) : "0"}
          />

          {/* Original post */}
          {meta && (
            <div>
              <h2 className="mb-2 font-semibold">Original prmpted.com post</h2>
              <PromptedEmbed post={meta} />
            </div>
          )}

          {/* Trades + holders */}
          <Card className="p-5">
            <Tabs defaultValue="trades">
              <TabsList>
                <TabsTrigger value="trades">
                  Trades ({trades.length})
                </TabsTrigger>
                <TabsTrigger value="holders">
                  Holders ({holders.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="trades">
                <TradeList trades={trades} />
              </TabsContent>
              <TabsContent value="holders">
                <HolderList
                  holders={holders}
                  totalSupply={
                    supply ? Number(formatEther(supply as bigint)) : undefined
                  }
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right: buy/sell */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <BuySellPanel
            tokenAddress={tokenAddress}
            symbol={displaySymbol}
            onTraded={refreshChain}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-2 text-center">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function FeeStatus({
  claimed,
  username,
  wallet,
  pending,
}: {
  claimed: boolean;
  username?: string;
  wallet: string | null;
  pending: string;
}) {
  return (
    <Card
      className={`p-5 ${
        claimed ? "border-success/30" : "border-secondary/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            claimed ? "bg-success/15" : "bg-secondary/15"
          }`}
        >
          {claimed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Lock className="h-5 w-5 text-secondary" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Creator fees</h3>
            {claimed ? (
              <Badge variant="success">Claimed</Badge>
            ) : (
              <Badge variant="secondary">Held in escrow</Badge>
            )}
          </div>
          {claimed ? (
            <p className="mt-1 text-sm text-muted-foreground">
              4% of every trade goes directly to{" "}
              {wallet ? (
                <span className="font-mono">{shortAddress(wallet)}</span>
              ) : (
                "the creator"
              )}
              .
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              @{username} hasn&apos;t claimed yet.{" "}
              <span className="font-medium text-foreground">
                {formatMon(pending)} MON
              </span>{" "}
              is locked in escrow for them.{" "}
              <Link href="/claim" className="text-gold hover:underline">
                Is this you? Claim it →
              </Link>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
