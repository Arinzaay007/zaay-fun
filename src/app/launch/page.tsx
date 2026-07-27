"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { decodeEventLog } from "viem";
import { toast } from "sonner";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Rocket, Loader2, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TestnetBadge } from "@/components/TestnetBadge";
import { PromptedEmbed } from "@/components/PromptedEmbed";
import { scrapePrmpted, createTokenRow } from "@/lib/api";
import { usernameHash } from "@/lib/bondingCurve";
import { factoryAbi } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES, contractsConfigured } from "@/lib/contracts/addresses";
import type { PrmptedPost } from "@/lib/types";
import { explorerTx } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";

export default function LaunchPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [post, setPost] = useState<PrmptedPost | null>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [image, setImage] = useState("");
  const [deploying, setDeploying] = useState(false);

  async function handleScrape() {
    if (!url.trim()) return;
    setScraping(true);
    setPost(null);
    try {
      const { post } = await scrapePrmpted(url);
      setPost(post);
      // sensible defaults
      if (post.title) setName(post.title.slice(0, 32));
      const sym = (post.title || post.username || "PRMPT")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 5)
        .toUpperCase();
      setSymbol(sym || "PRMPT");
      if (post.media?.[0]?.url) setImage(post.media[0].url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that post");
    } finally {
      setScraping(false);
    }
  }

  async function handleLaunch() {
    if (!post) return;
    if (!name || !symbol) {
      toast.error("Name and symbol are required");
      return;
    }
    if (!contractsConfigured()) {
      toast.error(
        "Contracts aren't deployed yet. Run the deploy script and set the factory address."
      );
      return;
    }
    const creatorUsername = post.username || post.author || "unknown";

    setDeploying(true);
    try {
      const metadataURI = JSON.stringify({
        image,
        prmpted_url: post.url,
        username: creatorUsername,
      }).slice(0, 512);

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.factory as `0x${string}`,
        abi: factoryAbi,
        functionName: "createToken",
        args: [name, symbol, metadataURI, usernameHash(creatorUsername)],
      });
      toast.success(
        <span>
          Deploying —{" "}
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

      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      // find TokenCreated -> new token address
      let tokenAddress: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (parsed.eventName === "TokenCreated") {
            tokenAddress = (parsed.args as { token: string }).token;
            break;
          }
        } catch {
          /* not our event */
        }
      }
      if (!tokenAddress) throw new Error("Couldn't find deployed token address");

      await createTokenRow({
        address: tokenAddress,
        name,
        symbol,
        image_url: image || null,
        creator_username: creatorUsername,
        prmpted_url: post.url,
        post_author: post.author,
        post_title: post.title,
        post_content: post.content,
        post_media: post.media,
        tx_hash: hash,
      });

      toast.success("Token launched! 🚀");
      router.push(`/token/${tokenAddress}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message.split("\n")[0] : "Launch failed"
      );
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          Launch a token <TestnetBadge />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a prmpted.com post URL. Trading fees flow to the original poster.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1: URL + config */}
        <div className="space-y-4">
          <Card className="p-5">
            <label className="mb-2 block text-sm font-medium">
              1. prmpted.com post URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="https://prmpted.com/@alice/…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                />
              </div>
              <Button onClick={handleScrape} disabled={scraping || !url.trim()}>
                {scraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Fetch
              </Button>
            </div>
          </Card>

          {post && (
            <Card className="space-y-4 p-5">
              <label className="block text-sm font-medium">
                2. Token details
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Satoshi Coin"
                    maxLength={32}
                  />
                </Field>
                <Field label="Symbol">
                  <Input
                    value={symbol}
                    onChange={(e) =>
                      setSymbol(e.target.value.toUpperCase().slice(0, 8))
                    }
                    placeholder="SATO"
                    maxLength={8}
                  />
                </Field>
              </div>
              <Field label="Image URL (optional)">
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://…"
                />
              </Field>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Creator:{" "}
                <span className="font-medium text-foreground">
                  @{post.username || post.author || "unknown"}
                </span>{" "}
                — fees will be{" "}
                <span className="text-gold">
                  held in escrow until they claim
                </span>
                .
              </div>

              {isConnected ? (
                <Button
                  onClick={handleLaunch}
                  disabled={deploying}
                  className="w-full"
                  size="lg"
                >
                  {deploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Deploying…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" /> Launch token
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Preview */}
        <div>
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            Preview
          </label>
          {post ? (
            <PromptedEmbed post={post} />
          ) : (
            <Card className="grid h-64 place-items-center border-dashed text-sm text-muted-foreground">
              Fetch a post to preview it here.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
