import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/tokens/:address — single token metadata row. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const supa = getServerSupabase() ?? getAdminSupabase();
  if (!supa) return NextResponse.json({ token: null });

  const { data, error } = await supa
    .from("tokens")
    .select("*")
    .eq("address", address.toLowerCase())
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token: data });
}
