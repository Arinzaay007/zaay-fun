import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { isAddress } from "viem";

export const runtime = "nodejs";

/**
 * GET  /api/trades?token=0x..&limit=      -> recent trades + holders for a token
 * POST /api/trades  { token_address, trader, side, mon_amount, token_amount, price, ... , new_balance }
 *      Records a trade and upserts the trader's holder balance.
 */
export async function GET(req: NextRequest) {
  const supa = getServerSupabase() ?? getAdminSupabase();
  if (!supa) return NextResponse.json({ trades: [], holders: [] });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);
  if (!token)
    return NextResponse.json({ error: "token required" }, { status: 400 });

  const [{ data: trades }, { data: holders }] = await Promise.all([
    supa
      .from("trades")
      .select("*")
      .eq("token_address", token)
      .order("created_at", { ascending: false })
      .limit(limit),
    supa
      .from("holders")
      .select("*")
      .eq("token_address", token)
      .gt("balance", 0)
      .order("balance", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({ trades: trades ?? [], holders: holders ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin)
    return NextResponse.json(
      { error: "Server database not configured." },
      { status: 503 }
    );

  const b = await req.json();
  const token_address = String(b.token_address ?? "").toLowerCase();
  const trader = String(b.trader ?? "").toLowerCase();
  if (!isAddress(token_address) || !isAddress(trader))
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  if (b.side !== "buy" && b.side !== "sell")
    return NextResponse.json({ error: "bad side" }, { status: 400 });

  const { error: tErr } = await admin.from("trades").insert({
    token_address,
    trader,
    side: b.side,
    mon_amount: Number(b.mon_amount ?? 0),
    token_amount: Number(b.token_amount ?? 0),
    price: b.price != null ? Number(b.price) : null,
    creator_fee: b.creator_fee != null ? Number(b.creator_fee) : null,
    platform_fee: b.platform_fee != null ? Number(b.platform_fee) : null,
    tx_hash: b.tx_hash ?? null,
  });
  if (tErr)
    return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Upsert holder balance if the client reported the trader's new balance.
  if (b.new_balance != null) {
    await admin.from("holders").upsert(
      {
        token_address,
        wallet: trader,
        balance: Number(b.new_balance),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token_address,wallet" }
    );
  }

  return NextResponse.json({ ok: true });
}
