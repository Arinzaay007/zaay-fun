"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { tokenAbi } from "@/lib/contracts/abis";
import { applySlippage } from "@/lib/bondingCurve";
import { formatMon, shortAddress } from "@/lib/utils";
import { explorerTx } from "@/lib/chains";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const QUICK_MON = ["0.1", "0.5", "1", "5"];

export function BuySellPanel({
  tokenAddress,
  symbol,
  onTraded,
}: {
  tokenAddress: `0x${string}`;
  symbol: string;
  onTraded?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage] = useState(3); // %

  const { data: balance } = useBalance({ address });
  const { data: tokenBal, refetch: refetchTokenBal } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  // Live on-chain quote
  const parsedAmount = safeParse(amount);
  const { data: buyQuote } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "quoteBuy",
    args: parsedAmount ? [parsedAmount] : undefined,
    query: { enabled: tab === "buy" && Boolean(parsedAmount) },
  });
  const { data: sellQuote } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: "quoteSell",
    args: parsedAmount ? [parsedAmount] : undefined,
    query: { enabled: tab === "sell" && Boolean(parsedAmount) },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const busy = isPending || isConfirming;

  async function handleTrade() {
    if (!parsedAmount || parsedAmount === 0n) {
      toast.error("Enter an amount");
      return;
    }
    try {
      let hash: `0x${string}`;
      if (tab === "buy") {
        const tokenOut = (buyQuote as [bigint, bigint] | undefined)?.[0] ?? 0n;
        const minOut = applySlippage(tokenOut, slippage);
        hash = await writeContractAsync({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "buy",
          args: [minOut],
          value: parsedAmount,
        });
      } else {
        const monOut = (sellQuote as [bigint, bigint] | undefined)?.[0] ?? 0n;
        const minOut = applySlippage(monOut, slippage);
        hash = await writeContractAsync({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: "sell",
          args: [parsedAmount, minOut],
        });
      }
      setTxHash(hash);
      toast.success(
        <span>
          {tab === "buy" ? "Buy" : "Sell"} submitted —{" "}
          <a
            className="underline"
            href={explorerTx(hash)}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddress(hash)}
          </a>
        </span>
      );
      setAmount("");
      // give the chain a moment, then refresh views
      setTimeout(() => {
        refetchTokenBal();
        onTraded?.();
      }, 2500);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message.split("\n")[0] : "Transaction failed";
      toast.error(msg);
    }
  }

  const estOut =
    tab === "buy"
      ? (buyQuote as [bigint, bigint] | undefined)?.[0]
      : (sellQuote as [bigint, bigint] | undefined)?.[0];

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-xl">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "buy" | "sell")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="buy"
            className="data-[state=active]:!bg-success/20 data-[state=active]:!text-success"
          >
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="data-[state=active]:!bg-destructive/20 data-[state=active]:!text-destructive"
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-3">
          <QuickButtons onPick={setAmount} suffix="MON" values={QUICK_MON} />
          <AmountField
            value={amount}
            onChange={setAmount}
            suffix="MON"
            balance={balance ? formatEther(balance.value) : undefined}
          />
        </TabsContent>

        <TabsContent value="sell" className="space-y-3">
          <div className="flex gap-2">
            {["25", "50", "75", "100"].map((p) => (
              <button
                key={p}
                onClick={() => {
                  if (tokenBal)
                    setAmount(
                      formatEther(
                        ((tokenBal as bigint) * BigInt(p)) / 100n
                      )
                    );
                }}
                className="flex-1 rounded-lg border border-border py-1.5 text-xs hover:bg-muted/60"
              >
                {p}%
              </button>
            ))}
          </div>
          <AmountField
            value={amount}
            onChange={setAmount}
            suffix={symbol}
            balance={tokenBal ? formatEther(tokenBal as bigint) : undefined}
          />
        </TabsContent>
      </Tabs>

      {parsedAmount && estOut != null && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          ≈ {formatMon(formatEther(estOut), 4)}{" "}
          {tab === "buy" ? symbol : "MON"} · slippage {slippage}%
        </p>
      )}

      <div className="mt-4">
        {isConnected ? (
          <Button
            onClick={handleTrade}
            disabled={busy}
            variant={tab === "buy" ? "success" : "destructive"}
            className="w-full"
            size="lg"
          >
            {busy
              ? "Confirming…"
              : tab === "buy"
                ? `Buy ${symbol}`
                : `Sell ${symbol}`}
          </Button>
        ) : (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        4% creator fee · 1% platform fee · Testnet MON only
      </p>
    </div>
  );
}

function safeParse(v: string): bigint | null {
  try {
    if (!v || Number(v) <= 0) return null;
    return parseEther(v as `${number}`);
  } catch {
    return null;
  }
}

function QuickButtons({
  values,
  onPick,
  suffix,
}: {
  values: string[];
  onPick: (v: string) => void;
  suffix: string;
}) {
  return (
    <div className="flex gap-2">
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onPick(v)}
          className="flex-1 rounded-lg border border-border py-1.5 text-xs hover:bg-muted/60"
        >
          {v} {suffix}
        </button>
      ))}
    </div>
  );
}

function AmountField({
  value,
  onChange,
  suffix,
  balance,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  balance?: string;
}) {
  return (
    <div>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-16 text-lg"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          {suffix}
        </span>
      </div>
      {balance && (
        <button
          onClick={() => onChange(balance)}
          className="mt-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          Balance: {formatMon(balance, 4)} {suffix} · Max
        </button>
      )}
    </div>
  );
}
