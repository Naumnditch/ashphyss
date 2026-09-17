'use client';

import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  pricePaidTry: string;
  status: 'pending' | 'paid' | 'scheduled' | 'completed' | 'cancelled';
  studentNote: string | null;
  adminNote: string | null;
  scheduledAt: string | null;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  addonName: string;
}

const STATUS_STYLE: Record<Booking['status'], string> = {
  pending: 'bg-gray-100 text-gray-500',
  paid: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

function Editor({ booking, onSaved }: { booking: Booking; onSaved: (b: Booking) => void }) {
  const [status, setStatus] = useState(booking.status);
  const [scheduledAt, setScheduledAt] = useState(booking.scheduledAt ? booking.scheduledAt.slice(0, 16) : '');
  const [adminNote, setAdminNote] = useState(booking.adminNote || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/tutoring-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking.id,
          status,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          adminNote: adminNote || undefined,
        }),
      });
      onSaved({ ...booking, status, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, adminNote: adminNote || null });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as Booking['status'])} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs">
          {(['pending', 'paid', 'scheduled', 'completed', 'cancelled'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Scheduled for</label>
        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">Note</label>
        <input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      <div className="sm:col-span-3">
        <button onClick={save} disabled={saving} className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function TutoringBookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/tutoring-bookings');
    const data = await res.json();
    if (data.success) setBookings(data.bookings);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const record = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/tutoring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), addonSlug: 'tutoring-1on1' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ ok: false, text: data.error || 'Could not record booking' });
      } else {
        setMsg({ ok: true, text: `Booking recorded for ${email}` });
        setEmail('');
        await load();
      }
    } catch {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Record a Booking Manually</h2>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Student email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={record} disabled={busy || !email.trim()} className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50">
            {busy ? 'Saving…' : 'Record 1-on-1 tutoring booking'}
          </button>
        </div>
        {msg && <p className={`text-sm mt-2 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">All Bookings</h2>
      {bookings.length === 0 ? (
        <p className="text-sm text-gray-400">No bookings yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {bookings.map((b) => (
            <div key={b.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <span className="text-[13px] font-medium text-gray-900">{b.studentName || b.studentEmail} — {b.addonName}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status]}`}>{b.status}</span>
              </div>
              <div className="text-xs text-gray-400">
                {b.studentEmail} · {parseFloat(b.pricePaidTry).toFixed(0)} TRY · {new Date(b.createdAt).toLocaleDateString()}
                {b.scheduledAt && ` · scheduled ${new Date(b.scheduledAt).toLocaleString()}`}
              </div>
              {b.adminNote && <p className="text-xs text-gray-400 mt-1">Note: {b.adminNote}</p>}
              <Editor booking={b} onSaved={(updated) => setBookings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
