'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DeviceRow {
  id: string;
  deviceId: string;
  deviceLabel: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export function DevicesList({ sessions, currentDeviceId }: { sessions: DeviceRow[]; currentDeviceId: string | null }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signOut = async (sessionId: string) => {
    setRevoking(sessionId);
    setError(null);
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not sign out that device');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setRevoking(null);
    }
  };

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-400">No active sessions.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {sessions.map((s) => {
          const isThisDevice = currentDeviceId !== null && s.deviceId === currentDeviceId;
          return (
            <div key={s.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-gray-900 text-[14.5px] flex items-center gap-2">
                  {s.deviceLabel || 'Unknown device'}
                  {isThisDevice && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      This device
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Last active {new Date(s.lastSeenAt).toLocaleString()} · Signed in {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => signOut(s.id)}
                disabled={revoking !== null}
                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 flex-shrink-0"
              >
                {revoking === s.id ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
