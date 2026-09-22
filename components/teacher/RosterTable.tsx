'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { RosterRow } from '@/lib/practice/analytics';

type SortKey = 'name' | 'topics_practiced' | 'total_attempted' | 'accuracy' | 'last_active_at';

interface Props {
  rows: RosterRow[];
  strugglingBelow: number;
  inactiveDays: number;
}

function fullName(row: RosterRow): string {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return name || row.email;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function relativeDay(iso: string | null): string {
  const days = daysSince(iso);
  if (days === null) return 'never';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function RosterTable({ rows, strugglingBelow, inactiveDays }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('last_active_at');
  const [ascending, setAscending] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = fullName(a).localeCompare(fullName(b));
      } else if (sortKey === 'last_active_at') {
        comparison = new Date(a.last_active_at ?? 0).getTime() - new Date(b.last_active_at ?? 0).getTime();
      } else if (sortKey === 'accuracy') {
        // Students with no attempts sort last either way rather than
        // masquerading as 0% accuracy.
        const left = a.accuracy ?? -1;
        const right = b.accuracy ?? -1;
        comparison = left - right;
      } else {
        comparison = a[sortKey] - b[sortKey];
      }
      return ascending ? comparison : -comparison;
    });
    return copy;
  }, [rows, sortKey, ascending]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setAscending(!ascending);
    } else {
      setSortKey(key);
      setAscending(key === 'name');
    }
  };

  const arrow = (key: SortKey) => (key === sortKey ? (ascending ? ' ↑' : ' ↓') : '');

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl px-6 py-10 text-center">
        <p className="text-sm text-gray-500">No students in your classes yet.</p>
        <Link href="/teacher/dashboard" className="text-sm font-semibold text-blue-700 hover:underline mt-2 inline-block">
          Create a class and share the join code
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <SortHeader label="Student" onClick={() => toggle('name')} suffix={arrow('name')} />
            <SortHeader label="Topics" onClick={() => toggle('topics_practiced')} suffix={arrow('topics_practiced')} align="right" />
            <SortHeader label="Attempted" onClick={() => toggle('total_attempted')} suffix={arrow('total_attempted')} align="right" />
            <SortHeader label="Accuracy" onClick={() => toggle('accuracy')} suffix={arrow('accuracy')} align="right" />
            <SortHeader label="Last active" onClick={() => toggle('last_active_at')} suffix={arrow('last_active_at')} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const days = daysSince(row.last_active_at);
            const struggling = row.accuracy !== null && row.accuracy < strugglingBelow && row.total_attempted > 0;
            const inactive = days === null || days >= inactiveDays;
            return (
              <tr
                key={row.student_id}
                className={`border-b border-gray-100 last:border-0 ${
                  struggling ? 'bg-red-50/60' : inactive ? 'bg-amber-50/50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/teacher/analytics/${row.student_id}`}
                    className="font-semibold text-gray-900 hover:text-blue-700"
                  >
                    {fullName(row)}
                  </Link>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {struggling && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                        Below {Math.round(strugglingBelow * 100)}%
                      </span>
                    )}
                    {inactive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        {days === null ? 'No practice yet' : `Quiet ${days} days`}
                      </span>
                    )}
                    {row.topics_mastered > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                        {row.topics_mastered} mastered
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.topics_practiced}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                  {row.total_correct}/{row.total_attempted}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                  {row.accuracy === null ? '—' : `${Math.round(row.accuracy * 100)}%`}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{relativeDay(row.last_active_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  onClick,
  suffix,
  align = 'left',
}: {
  label: string;
  onClick: () => void;
  suffix: string;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${align === 'right' ? 'text-right' : ''}`}>
      <button onClick={onClick} className="uppercase tracking-wide hover:text-gray-900">
        {label}
        {suffix}
      </button>
    </th>
  );
}
