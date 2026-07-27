import type { TokenRow, TradeRow, HolderRow } from "@/lib/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTokens(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<TokenRow[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const res = await fetch(`/api/tokens?${q.toString()}`, { cache: "no-store" });
  const { tokens } = await json<{ tokens: TokenRow[] }>(res);
  return tokens;
}

export async function fetchToken(address: string): Promise<TokenRow | null> {
  const res = await fetch(`/api/tokens/${address}`, { cache: "no-store" });
  const { token } = await json<{ token: TokenRow | null }>(res);
  return token;
}

export async function fetchTradesAndHolders(
  token: string,
  limit = 30
): Promise<{ trades: TradeRow[]; holders: HolderRow[] }> {
  const res = await fetch(
    `/api/trades?token=${token}&limit=${limit}`,
    { cache: "no-store" }
  );
  return json<{ trades: TradeRow[]; holders: HolderRow[] }>(res);
}

export async function recordTrade(payload: Record<string, unknown>) {
  const res = await fetch("/api/trades", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json<{ ok: boolean }>(res);
}

export async function scrapePrmpted(url: string) {
  const res = await fetch("/api/prmpted", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return json<{ post: import("@/lib/types").PrmptedPost; cached: boolean }>(res);
}

export async function createTokenRow(payload: Record<string, unknown>) {
  const res = await fetch("/api/tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json<{ token: TokenRow }>(res);
}
