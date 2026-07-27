import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate an EVM address to 0x1234…abcd */
export function shortAddress(addr?: string | null, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

/** Compact number formatting: 12.3K, 4.5M */
export function formatCompact(n: number | string, digits = 2): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: digits,
  }).format(num);
}

/** Format MON amounts with sensible precision */
export function formatMon(n: number | string, digits = 4): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "0";
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function timeAgo(iso: string | number | Date): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
