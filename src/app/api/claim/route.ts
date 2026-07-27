import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/server";
import { isAddress, createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "@/lib/chains";
import { escrowAbi } from "@/lib/contracts/abis";
import { CONTRACT_ADDRESSES, contractsConfigured } from "@/lib/contracts/addresses";
import { usernameHash } from "@/lib/bondingCurve";

export const runtime = "nodejs";

function cleanUsername(u: unknown): string {
  return String(u ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

/** Generate a short human-friendly verification code. */
function genCode(): string {
  // 6-char base32-ish; deterministic RNG not needed here (server route).
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ZAAY-${out}`;
}

/**
 * POST /api/claim
 *   { action: "request", username }
 *     -> creates/updates a pending claim with a verification code the user must
 *        post from their prmpted.com account (mirrors the prior code-verification
 *        flow). Returns the code + posting instructions.
 *
 *   { action: "verify", username, wallet, code }
 *     -> validates the code, links the wallet, and releases escrowed creator
 *        fees on-chain via FeeEscrow.claimFor (backend signer).
 */
export async function POST(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin)
    return NextResponse.json(
      { error: "Server database not configured." },
      { status: 503 }
    );

  const body = await req.json();
  const action = body.action;
  const username = cleanUsername(body.username);
  if (!username)
    return NextResponse.json({ error: "username required" }, { status: 400 });

  // ---- request a verification code -------------------------------------
  if (action === "request") {
    const code = genCode();
    const { error } = await admin.from("username_claims").upsert(
      {
        username,
        verification_code: code,
        status: "pending",
        code_sent_to: `prmpted.com/@${username}`,
      },
      { onConflict: "username" }
    );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      code,
      instructions: `Post the code "${code}" from your prmpted.com account @${username} (in a post or your bio), then come back and verify.`,
    });
  }

  // ---- verify + release fees -------------------------------------------
  if (action === "verify") {
    const wallet = String(body.wallet ?? "");
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!isAddress(wallet))
      return NextResponse.json({ error: "invalid wallet" }, { status: 400 });

    const { data: claim } = await admin
      .from("username_claims")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (!claim || !claim.verification_code)
      return NextResponse.json(
        { error: "No pending claim. Request a code first." },
        { status: 400 }
      );
    if (claim.verification_code.toUpperCase() !== code)
      return NextResponse.json(
        { error: "Verification code doesn't match." },
        { status: 400 }
      );

    // Release escrowed fees on-chain.
    let releaseTx: string | null = null;
    const signerKey = process.env.ESCROW_CLAIMER_PRIVATE_KEY;
    const escrowAddr = CONTRACT_ADDRESSES.escrow;

    if (signerKey && contractsConfigured()) {
      try {
        const account = privateKeyToAccount(
          signerKey.startsWith("0x")
            ? (signerKey as `0x${string}`)
            : (`0x${signerKey}` as `0x${string}`)
        );
        const walletClient = createWalletClient({
          account,
          chain: monadTestnet,
          transport: http(),
        });
        const publicClient = createPublicClient({
          chain: monadTestnet,
          transport: http(),
        });
        const hash = await walletClient.writeContract({
          address: escrowAddr as `0x${string}`,
          abi: escrowAbi,
          functionName: "claimFor",
          args: [usernameHash(username), wallet as `0x${string}`],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        releaseTx = hash;
      } catch (e) {
        return NextResponse.json(
          {
            error:
              "Verified, but on-chain fee release failed: " +
              (e instanceof Error ? e.message : "unknown error") +
              ". A claimer signer must be configured.",
          },
          { status: 500 }
        );
      }
    }

    // Persist verified state + link wallet on token rows.
    await admin
      .from("username_claims")
      .update({
        wallet: wallet.toLowerCase(),
        status: "verified",
        verified_at: new Date().toISOString(),
        release_tx_hash: releaseTx,
      })
      .eq("username", username);

    await admin
      .from("tokens")
      .update({ creator_wallet: wallet.toLowerCase() })
      .eq("creator_username", username);

    return NextResponse.json({
      ok: true,
      releaseTx,
      onChain: Boolean(releaseTx),
    });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

/** GET /api/claim?username= -> claim status (no code leaked). */
export async function GET(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ claim: null });
  const username = cleanUsername(new URL(req.url).searchParams.get("username"));
  if (!username)
    return NextResponse.json({ error: "username required" }, { status: 400 });

  const { data } = await admin
    .from("username_claims")
    .select("username, wallet, status, release_tx_hash, verified_at")
    .eq("username", username)
    .maybeSingle();

  return NextResponse.json({ claim: data ?? null });
}
