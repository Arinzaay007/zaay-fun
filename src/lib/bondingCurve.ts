import { keccak256, toBytes } from "viem";

export const BPS = 10_000n;

/** Canonical username hash — MUST match FeeEscrow.hashUsername (lowercase, no @). */
export function usernameHash(username: string): `0x${string}` {
  const clean = username.trim().replace(/^@+/, "").toLowerCase();
  return keccak256(toBytes(clean));
}

/** Default curve params (mirror TokenFactory defaults). All in wei. */
export const DEFAULT_BASE_PRICE = 1_000_000_000_000n; // 1e12
export const DEFAULT_SLOPE = 1_000_000n; // 1e6

const ONE = 1_000_000_000_000_000_000n; // 1e18

function priceAt(supply: bigint, basePrice: bigint, slope: bigint): bigint {
  return basePrice + (slope * supply) / ONE;
}

function sqrtBig(x: bigint): bigint {
  if (x < 0n) throw new Error("sqrt of negative");
  if (x === 0n) return 0n;
  let z = (x + 1n) / 2n;
  let y = x;
  while (z < y) {
    y = z;
    z = (x / z + z) / 2n;
  }
  return y;
}

/**
 * Client-side mirror of BondingCurveToken.quoteBuy — estimate tokens out for a
 * gross MON input. Used for instant UI quotes; the contract is the source of truth.
 */
export function quoteBuy(
  monIn: bigint,
  supply: bigint,
  {
    basePrice = DEFAULT_BASE_PRICE,
    slope = DEFAULT_SLOPE,
    creatorFeeBps = 400n,
    platformFeeBps = 100n,
  }: {
    basePrice?: bigint;
    slope?: bigint;
    creatorFeeBps?: bigint;
    platformFeeBps?: bigint;
  } = {}
): { tokenOut: bigint; monForCurve: bigint } {
  const totalFeeBps = creatorFeeBps + platformFeeBps;
  const monForCurve = (monIn * (BPS - totalFeeBps)) / BPS;
  const p0 = priceAt(supply, basePrice, slope);

  let tokenOut: bigint;
  if (slope === 0n) {
    tokenOut = (monForCurve * ONE) / p0;
  } else {
    const D = p0 * p0 + 2n * slope * monForCurve;
    const sqrtD = sqrtBig(D);
    tokenOut = sqrtD <= p0 ? 0n : ((sqrtD - p0) * ONE) / slope;
  }
  return { tokenOut, monForCurve };
}

/** Client-side mirror of quoteSell — MON out (net of fees) for tokens sold. */
export function quoteSell(
  tokenIn: bigint,
  supply: bigint,
  {
    basePrice = DEFAULT_BASE_PRICE,
    slope = DEFAULT_SLOPE,
    creatorFeeBps = 400n,
    platformFeeBps = 100n,
  }: {
    basePrice?: bigint;
    slope?: bigint;
    creatorFeeBps?: bigint;
    platformFeeBps?: bigint;
  } = {}
): { monOut: bigint; grossRefund: bigint } {
  if (tokenIn > supply) tokenIn = supply;
  const p0 = priceAt(supply - tokenIn, basePrice, slope);
  const p1 = priceAt(supply, basePrice, slope);
  const grossRefund = ((p0 + p1) * tokenIn) / (2n * ONE);
  const totalFeeBps = creatorFeeBps + platformFeeBps;
  const monOut = (grossRefund * (BPS - totalFeeBps)) / BPS;
  return { monOut, grossRefund };
}

/** Build a small series of (supply, price) points for the curve chart. */
export function curveSeries(
  currentSupply: bigint,
  points = 40,
  { basePrice = DEFAULT_BASE_PRICE, slope = DEFAULT_SLOPE } = {}
): { supply: number; price: number }[] {
  const maxSupply =
    currentSupply > 0n ? currentSupply * 2n : 1_000_000n * ONE;
  const step = maxSupply / BigInt(points);
  const out: { supply: number; price: number }[] = [];
  for (let i = 0; i <= points; i++) {
    const s = step * BigInt(i);
    const p = priceAt(s, basePrice, slope);
    out.push({
      supply: Number(s / ONE),
      price: Number(p) / 1e18,
    });
  }
  return out;
}

/** Apply a slippage tolerance (in %) to a min-out amount. */
export function applySlippage(amount: bigint, slippagePct: number): bigint {
  const bps = BigInt(Math.round(slippagePct * 100));
  return (amount * (BPS - bps)) / BPS;
}
