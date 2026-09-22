'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { DailyPoint } from '@/lib/admin/overview';

// Validated categorical slots 1 and 2 (dataviz reference palette, light surface).
const SERIES_1 = '#2a78d6';
const SERIES_2 = '#eb6834';
const GRID = '#e1e0d9';
const MUTED = '#898781';
const SURFACE = '#ffffff';

const axisTick = { fontSize: 11, fill: MUTED };

function shortDate(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-xs">
      <p className="font-semibold text-gray-900 mb-1">{typeof label === 'string' && /^\d{4}-/.test(label) ? shortDate(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="flex items-center gap-2 text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-gray-900 tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Every 7th day is labelled; the tooltip carries the rest. */
function dayTicks(data: DailyPoint[]) {
  return data.filter((_, i) => (data.length - 1 - i) % 7 === 0).map((d) => d.day);
}

export function DailyActiveUsersChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" ticks={dayTicks(data)} tickFormatter={shortDate} tick={axisTick} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Bar dataKey="activeUsers" name="Active users" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PracticeResultsChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" ticks={dayTicks(data)} tickFormatter={shortDate} tick={axisTick} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: '#52514e' }}>{value}</span>} />
        {/* The surface-coloured stroke is the 2px gap between stacked segments. */}
        <Bar dataKey="correct" name="Correct" stackId="a" fill={SERIES_1} stroke={SURFACE} strokeWidth={2} maxBarSize={24} />
        <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill={SERIES_2} stroke={SURFACE} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityMixChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 34 + 8}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: '#52514e' }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
        <Bar dataKey="count" name="Events" fill={SERIES_1} radius={[0, 4, 4, 0]} barSize={16} minPointSize={2}>
          <LabelList dataKey="count" position="right" style={{ fontSize: 12, fill: '#0b0b0b', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
