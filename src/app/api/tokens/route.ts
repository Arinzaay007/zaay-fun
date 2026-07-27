import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";
import { isAddress } from "viem";

export const runtime = "nodejs";

/**
 * GET  /api/tokens?sort=new|mcap&search=&limit=&offset=
 * POST /api/tokens  { address, name, symbol, image_url, creator_username, prmpted_url, post_* , launcher_wallet, tx_hash }
 */
export async function GET(req: NextRequest) {
  const supa = getServerSupabase() ?? getAdminSupabase();
  if (!supa) return NextResponse.json({ tokens: [] });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  let q = supa.from("tokens").select("*");
  if (search) {
    q = q.or(
      `name.ilike.%${search}%,symbol.ilike.%${search}%,creator_username.ilike.%${search}%`
    );
  }
  q = q.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = getAdminSupabase();
  if (!admin)
    return NextResponse.json(
      { error: "Server database not configured." },
      { status: 503 }
    );

  const body = await req.json();
  const address = String(body.address ?? "").toLowerCase();
  if (!isAddress(address))
    return NextResponse.json(
      { error: "Invalid token address" },
      { status: 400 }
    );
  if (!body.name || !body.symbol || !body.creator_username || !body.prmpted_url)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const row = {
    address,
    name: String(body.name),
    symbol: String(body.symbol),
    image_url: body.image_url ?? null,
    creator_username: String(body.creator_username).replace(/^@+/, ""),
    creator_wallet: body.creator_wallet ?? null,
    prmpted_url: String(body.prmpted_url),
    post_author: body.post_author ?? null,
    post_title: body.post_title ?? null,
    post_content: body.post_content ?? null,
    post_media: body.post_media ?? [],
    launcher_wallet: body.launcher_wallet ?? null,
    tx_hash: body.tx_hash ?? null,
  };

  const { data, error } = await admin
    .from("tokens")
    .upsert(row, { onConflict: "address" })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data });
}
