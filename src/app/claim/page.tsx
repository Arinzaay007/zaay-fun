"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestnetBadge } from "@/components/TestnetBadge";
import { explorerTx } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";

type Step = "enter" | "verify" | "done";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>("enter");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [releaseTx, setReleaseTx] = useState<string | null>(null);
  const [onChain, setOnChain] = useState(false);

  async function requestCode() {
    const u = username.trim().replace(/^@+/, "");
    if (!u) return toast.error("Enter your prmpted.com username");
    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", username: u }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCode(data.code);
      setInstructions(data.instructions);
      setStep("verify");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!address) return toast.error("Connect your wallet first");
    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          username: username.trim().replace(/^@+/, ""),
          wallet: address,
          code: inputCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReleaseTx(data.releaseTx ?? null);
      setOnChain(Boolean(data.onChain));
      setStep("done");
      toast.success("Username claimed!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-lg py-12">
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/15">
            <ShieldCheck className="h-6 w-6 text-secondary" />
          </div>
        </div>
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold">
          Claim your username <TestnetBadge />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verify your prmpted.com account, link a wallet, and release all
          creator fees held in escrow.
        </p>
      </div>

      <Stepper step={step} />

      {step === "enter" && (
        <Card className="mt-6 space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              prmpted.com username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                className="pl-8"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && requestCode()}
              />
            </div>
          </div>
          <Button onClick={requestCode} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Get verification code <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </Card>
      )}

      {step === "verify" && (
        <Card className="mt-6 space-y-4 p-6">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{instructions}</p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-background/60 px-4 py-3">
              <code className="text-lg font-bold tracking-wider text-gold">
                {code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success("Code copied");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Confirm the code you posted
            </label>
            <Input
              placeholder="ZAAY-XXXXXX"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            />
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Connect the wallet that should receive the fees.
              </p>
              <ConnectButton />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted-foreground">
                Fees release to{" "}
                <span className="font-mono">{shortAddress(address)}</span>
              </p>
              <Button
                onClick={verify}
                disabled={loading || !inputCode}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & release fees"
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {step === "done" && (
        <Card className="mt-6 space-y-3 p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h2 className="text-lg font-semibold">
            @{username.replace(/^@+/, "")} is yours 🎉
          </h2>
          <div className="flex justify-center">
            <Badge variant="success">Verified</Badge>
          </div>
          {onChain && releaseTx ? (
            <p className="text-sm text-muted-foreground">
              Escrowed fees released on-chain —{" "}
              <a
                className="text-gold underline"
                href={explorerTx(releaseTx)}
                target="_blank"
                rel="noreferrer"
              >
                view tx
              </a>
              . Future fees now go straight to your wallet.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your wallet is linked. On-chain release runs when a claimer signer
              is configured; any pending escrow will be sent to you.
            </p>
          )}
          <Button
            asChild
            variant="outline"
            className="mt-2 w-full"
          >
            <a href={`/profile/${username.replace(/^@+/, "")}`}>
              View your profile
            </a>
          </Button>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = [
    { key: "enter", label: "Username" },
    { key: "verify", label: "Verify" },
    { key: "done", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i <= idx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs ${
              i <= idx ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="h-px w-6 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
