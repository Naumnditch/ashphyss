'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface ActivityPoint {
  day: string;
  active_users: number;
  logins: number;
}

export function AnalyticsChart({ data }: { data: ActivityPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="activeUsersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1b2a41" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#1b2a41" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="loginsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#b8823d" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#b8823d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee6d3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#4a5a72' }} axisLine={{ stroke: '#e4ddcc' }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#4a5a72' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4ddcc' }}
          labelStyle={{ color: '#1b2a41', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="active_users" name="Active users" stroke="#1b2a41" fill="url(#activeUsersFill)" strokeWidth={2} />
        <Area type="monotone" dataKey="logins" name="Logins" stroke="#b8823d" fill="url(#loginsFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
