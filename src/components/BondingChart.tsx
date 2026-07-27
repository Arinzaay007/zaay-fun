"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type ChartPoint = { label: string | number; price: number };

/**
 * Bonding-curve / price chart. Pass either the theoretical curve series
 * (supply -> price) or a time series of trade prices.
 */
export function BondingChart({
  data,
  xKey = "label",
  height = 260,
}: {
  data: ChartPoint[];
  xKey?: string;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground"
        style={{ height }}
      >
        No price data yet — be the first to trade.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(48 96% 62%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(48 96% 62%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(240 5% 18%)"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "hsl(240 5% 55%)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v) => Number(v).toPrecision(3)}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(240 6% 8%)",
            border: "1px solid hsl(240 5% 18%)",
            borderRadius: 12,
            color: "hsl(0 0% 98%)",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(240 5% 60%)" }}
          formatter={(v: number) => [`${Number(v).toPrecision(4)} MON`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="hsl(48 96% 62%)"
          strokeWidth={2}
          fill="url(#priceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
