'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
};

export function UserRoleActions({
  userId,
  role,
  status,
  activeSessions,
}: {
  userId: string;
  role: string;
  status: string;
  activeSessions: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = async (patch: { role?: string; status?: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        router.refresh();
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const revokeAllSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/revoke-sessions`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5"
      >
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[role]}`}>{role}</span>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[status]}`}>
          {status}
        </span>
        <span className="text-gray-300 text-xs">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Role</div>
            {['student', 'teacher', 'admin'].map((r) => (
              <button
                key={r}
                disabled={loading || r === role}
                onClick={() => update({ role: r })}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-default capitalize"
              >
                {r} {r === role && '✓'}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1.5" />
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Status</div>
            {['active', 'inactive', 'suspended'].map((s) => (
              <button
                key={s}
                disabled={loading || s === status}
                onClick={() => update({ status: s })}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-default capitalize"
              >
                {s} {s === status && '✓'}
              </button>
            ))}
            <div className="border-t border-gray-100 my-1.5" />
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Sessions ({activeSessions} active)
            </div>
            <button
              disabled={loading || activeSessions === 0}
              onClick={revokeAllSessions}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:cursor-default"
            >
              Sign out all devices
            </button>
          </div>
        </>
      )}
    </div>
  );
}
