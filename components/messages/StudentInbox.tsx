'use client';

/** A student's conversation with the AshPhys team: read, reply, and choose whether to get emails. */

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { MessageDTO } from '@/lib/messaging/types';
import { formatDayHeading, sameDay } from '@/lib/messaging/time';
import { api } from './api';
import { MailIcon } from './MailIcons';
import { MessageItem } from './MessageItem';
import { announceMessagesChanged } from './useUnreadCount';

export function StudentInbox({ firstName, initialEmailNotifications }: { firstName: string; initialEmailNotifications: boolean }) {
  const [messages, setMessages] = useState<MessageDTO[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState(initialEmailNotifications);
  const [now, setNow] = useState(() => Date.now());
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await api<{ messages: MessageDTO[]; hasMore: boolean }>('/api/messages/inbox?markRead=1&limit=50');
      setMessages((prev) => {
        if (prev && prev.length > res.messages.length) {
          const ids = new Set(res.messages.map((m) => m.id));
          return [...prev.filter((m) => !ids.has(m.id) && m.createdAt < (res.messages[0]?.createdAt ?? '')), ...res.messages];
        }
        return res.messages;
      });
      if (firstLoad.current) {
        firstLoad.current = false;
        setHasMore(res.hasMore);
      }
      setNow(Date.now());
      announceMessagesChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const hashHandled = useRef(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !messages) return;
    // Opened from an email's "View in AshPhys" link: show that message.
    if (!hashHandled.current && messages.length) {
      hashHandled.current = true;
      const target = window.location.hash.startsWith('#m-') ? document.getElementById(window.location.hash.slice(1)) : null;
      if (target) {
        stick.current = false;
        el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top - 16;
        const bubble = target.querySelector('.rounded-2xl') ?? target;
        bubble.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
        setTimeout(() => bubble.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2'), 2500);
        return;
      }
    }
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    if (!messages?.length) return;
    const el = scroller.current;
    const before = el?.scrollHeight ?? 0;
    const res = await api<{ messages: MessageDTO[]; hasMore: boolean }>(`/api/messages/inbox?before=${messages[0].id}&limit=50`);
    stick.current = false;
    setMessages((m) => [...res.messages, ...(m ?? [])]);
    setHasMore(res.hasMore);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before;
    });
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const res = await api<{ message: MessageDTO }>('/api/messages/send', { method: 'POST', json: { body } });
      setText('');
      stick.current = true;
      setMessages((m) => [...(m ?? []), res.message]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const toggleEmails = async () => {
    const next = !emails;
    setEmails(next);
    try {
      await api('/api/messages/preferences', { method: 'PUT', json: { emailNotifications: next } });
    } catch {
      setEmails(!next);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Your conversation with the AshPhys team. Ask anything; we usually reply within a day.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <button
            type="button"
            role="switch"
            aria-checked={emails}
            onClick={toggleEmails}
            className={`relative h-5 w-9 rounded-full transition-colors ${emails ? 'bg-gray-900' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${emails ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          Also email me new messages
        </label>
      </div>

      <div className="flex h-[calc(100vh-15rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/60 px-3 py-4 sm:px-6"
        >
          {hasMore && (
            <div className="text-center">
              <button type="button" onClick={loadOlder} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Load earlier messages
              </button>
            </div>
          )}
          {messages === null ? (
            <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-gray-400 shadow-sm">
                <MailIcon name="mail" className="h-7 w-7" />
              </span>
              <p className="mt-3 font-semibold text-gray-900">No messages yet</p>
              <p className="mt-1 text-sm text-gray-500">Hi {firstName || 'there'}! Send us a question below and we&apos;ll reply here.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <Fragment key={m.id}>
                {(i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt)) && (
                  <div className="flex items-center gap-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    {formatDayHeading(m.createdAt, now)}
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>
                )}
                <MessageItem message={m} viewer="subscriber" now={now} />
              </Fragment>
            ))
          )}
        </div>
        <form
          className="border-t border-gray-200 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={10000}
              placeholder="Write a message…"
              aria-label="Message"
              className="min-h-[44px] flex-1 resize-y rounded-lg border border-gray-300 px-3 py-2 text-[15px] focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
            >
              <MailIcon name="send" />
              <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
