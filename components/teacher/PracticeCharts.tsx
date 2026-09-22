'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const NAVY = '#1b2a41';
const OCHRE = '#b8823d';
const GRID = '#eee6d3';
const AXIS_TEXT = '#4a5a72';
const BORDER = '#e4ddcc';

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}` };
const labelStyle = { color: NAVY, fontWeight: 600 };
const axisTick = { fontSize: 11, fill: AXIS_TEXT };

const asPercent = (value: number) => `${Math.round(value * 100)}%`;

export interface AccuracyPoint {
  day: string;
  attempted: number;
  accuracy: number;
}

/** Accuracy over time. */
export function AccuracyOverTime({ data }: { data: AccuracyPoint[] }) {
  if (data.length === 0) return <EmptyChart label="No practice yet" />;

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: BORDER }} tickLine={false} />
        <YAxis domain={[0, 1]} tickFormatter={asPercent} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          formatter={(value: number, name: string) =>
            name === 'Accuracy' ? asPercent(value) : String(value)
          }
        />
        <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface TopicAccuracyPoint {
  topic_name: string;
  accuracy: number;
  attempted: number;
}

/** Per-topic accuracy. */
export function TopicAccuracy({ data }: { data: TopicAccuracyPoint[] }) {
  if (data.length === 0) return <EmptyChart label="No topics practised yet" />;

  const formatted = data.map((d) => ({
    ...d,
    label: d.topic_name.length > 26 ? `${d.topic_name.slice(0, 25)}…` : d.topic_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, formatted.length * 38)}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" domain={[0, 1]} tickFormatter={asPercent} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={180} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          formatter={(value: number) => asPercent(value)}
        />
        <Bar dataKey="accuracy" name="Accuracy" fill={NAVY} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface MasteryPoint {
  topic_name: string;
  mastered: number;
  practising: number;
}

/** How the class is spread across mastered vs still practising, per topic. */
export function MasteryDistribution({ data }: { data: MasteryPoint[] }) {
  if (data.length === 0) return <EmptyChart label="No mastery data yet" />;

  const formatted = data.map((d) => ({
    ...d,
    label: d.topic_name.length > 26 ? `${d.topic_name.slice(0, 25)}…` : d.topic_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, formatted.length * 38)}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={180} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="mastered" name="Mastered" stackId="students" fill={NAVY} radius={[0, 0, 0, 0]} />
        <Bar dataKey="practising" name="Still practising" stackId="students" fill={OCHRE} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
      {label}
    </div>
  );
}
