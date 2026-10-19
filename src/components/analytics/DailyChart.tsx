"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RTooltip,
  Cell,
} from "recharts";

export interface DailyDatum {
  label: string;
  date: string;
  count: number;
}

/**
 * Isolated so recharts (~100kB) is code-split into its own chunk and loaded
 * only when the analytics page renders — not in any route's first-load JS.
 */
export default function DailyChart({ data }: { data: DailyDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--text-soft)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <RTooltip
          cursor={{ fill: "rgba(118,185,0,0.08)" }}
          contentStyle={{
            background: "var(--surface-solid)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--text)" }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((d) => (
            <Cell
              key={d.date}
              fill={d.count > 0 ? "url(#fluxBar)" : "rgba(161,161,170,0.12)"}
            />
          ))}
        </Bar>
        <defs>
          <linearGradient id="fluxBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#76b900" />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
