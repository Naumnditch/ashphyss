'use client';

import { useState } from 'react';

export function UnsubscribeForm({ token, email, initiallySubscribed }: { token: string; email: string; initiallySubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initiallySubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const submit = async (action: 'unsubscribe' | 'resubscribe') => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong');
      setSubscribed(data.subscribed);
      setChanged(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 text-gray-600">
      {subscribed ? (
        <>
          <p>
            <strong className="text-gray-900">{email}</strong> gets an email whenever the AshPhys team sends you a message.
          </p>
          {changed && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">You&apos;re subscribed again.</p>}
          <button type="button" disabled={busy} onClick={() => submit('unsubscribe')} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {busy ? 'Saving…' : 'Unsubscribe from AshPhys emails'}
          </button>
        </>
      ) : (
        <>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <strong className="text-gray-900">{email}</strong> is unsubscribed. We won&apos;t email you messages any more; they&apos;ll still be waiting in your{' '}
            <a href="/dashboard/messages" className="text-blue-700 underline">
              AshPhys inbox
            </a>
            .
          </p>
          <button type="button" disabled={busy} onClick={() => submit('resubscribe')} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
            {busy ? 'Saving…' : 'Changed your mind? Subscribe again'}
          </button>
        </>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
