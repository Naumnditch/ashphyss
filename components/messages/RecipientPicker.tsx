'use client';

/** "To:" field: search subscribers by name or email and collect them as chips. */

import { useEffect, useRef, useState } from 'react';
import type { SubscriberDTO } from '@/lib/messaging/types';
import { initials } from '@/lib/messaging/text';
import { api } from './api';
import { MailIcon } from './MailIcons';

export interface Recipient {
  id: string;
  name: string;
  email: string;
  tierName?: string;
}

export function toRecipient(s: Pick<SubscriberDTO, 'id' | 'firstName' | 'lastName' | 'email' | 'tierName'>): Recipient {
  return { id: s.id, name: `${s.firstName} ${s.lastName}`.trim() || s.email, email: s.email, tierName: s.tierName };
}

export function RecipientPicker({ value, onChange, max = 100 }: { value: Recipient[]; onChange: (r: Recipient[]) => void; max?: number }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SubscriberDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<{ subscribers: SubscriberDTO[] }>(`/api/subscribers/search?q=${encodeURIComponent(q)}&limit=10`);
        if (!cancelled) {
          setResults(data.subscribers);
          setHighlight(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const chosen = new Set(value.map((r) => r.id));
  const options = results.filter((r) => !chosen.has(r.id));

  const add = (s: SubscriberDTO) => {
    if (value.length >= max) return;
    onChange([...value, toRecipient(s)]);
    setQ('');
    input.current?.focus();
  };

  return (
    <div ref={box} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900"
        onClick={() => input.current?.focus()}
      >
        {value.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-1 pr-1.5 text-sm text-gray-800" title={r.email}>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-900 text-[9px] font-semibold text-white">
              {initials(r.name.split(' ')[0] ?? '', r.name.split(' ')[1] ?? '', r.email)}
            </span>
            {r.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x.id !== r.id));
              }}
              aria-label={`Remove ${r.name}`}
              className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <MailIcon name="close" className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter' && options[highlight]) {
              e.preventDefault();
              add(options[highlight]);
            } else if (e.key === 'Backspace' && !q && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={value.length ? 'Add another…' : 'Search students by name or email'}
          aria-label="Recipients"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
        />
      </div>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && !options.length ? (
            <p className="px-3 py-2 text-sm text-gray-500">Searching…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">{q ? `No one matches “${q}”` : 'No more people to add'}</p>
          ) : (
            options.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => add(s)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === highlight ? 'bg-gray-50' : ''}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">{initials(s.firstName, s.lastName, s.email)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {`${s.firstName} ${s.lastName}`.trim() || s.email}
                    {s.role === 'teacher' && <span className="ml-1.5 text-xs font-normal text-gray-500">Teacher</span>}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {s.email}
                    {s.sectionName ? ` · ${s.sectionName}` : ''}
                  </span>
                </span>
                <TierBadge tier={s.tierName} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const cls = tier === 'Pro' ? 'bg-amber-100 text-amber-800' : tier === 'Plus' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600';
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{tier}</span>;
}
