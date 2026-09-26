'use client';

/**
 * Message everyone who matches a filter (plan, class, course enrollment,
 * join date, subscription ending…). Shows a live count while you choose,
 * then a confirm step with a personalised preview before anything is sent.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudienceOptions } from '@/lib/messaging/audience';
import type { EmailProvider } from '@/lib/messaging/config';
import type { RecipientFilters } from '@/lib/messaging/filters';
import { fillPlaceholders, placeholderValues } from '@/lib/messaging/placeholders';
import { looksBlank } from '@/lib/messaging/text';
import type { DraftDTO, TemplateDTO } from '@/lib/messaging/types';
import type { EmailProblem, SendSummary } from '@/lib/messaging/sendSummary';
import { api } from './api';
import { MailIcon } from './MailIcons';
import { Modal } from './Modal';
import { TierBadge } from './RecipientPicker';
import { RichTextEditor } from './RichTextEditor';
import { SaveAsTemplate, TemplatePicker } from './TemplatePicker';
import { SaveIndicator, useAutosave } from './useAutosave';

type Filters = RecipientFilters;

const DEFAULT_FILTERS: Filters = {
  roles: ['student'],
  tiers: [],
  sectionIds: [],
  statuses: ['active'],
  enrollment: 'any',
  courseId: null,
  joinedWithinDays: null,
  subscriptionEndsWithinDays: null,
  emailOptedInOnly: false,
};

interface Preview {
  count: number;
  emailable: number;
  label: string;
  sample: { id: string; name: string; email: string; tierName: string }[];
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
        {hint && <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

const select = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

export function BulkSendModal({
  open,
  onClose,
  draft,
  templates,
  onTemplatesChange,
  audience,
  emailProvider,
  onSent,
  onDraftsChanged,
}: {
  open: boolean;
  onClose: () => void;
  draft?: DraftDTO | null;
  templates: TemplateDTO[];
  onTemplatesChange: (t: TemplateDTO[]) => void;
  audience: AudienceOptions;
  emailProvider: EmailProvider | null;
  onSent: (s: SendSummary) => void;
  onDraftsChanged: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const draftId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    draftId.current = draft?.id ?? null;
    setFilters({ ...DEFAULT_FILTERS, ...((draft?.filters as Partial<Filters>) ?? {}) });
    setSubject(draft?.subject ?? '');
    setBody(draft?.body ?? '');
    setStep('edit');
    setError(null);
  }, [open, draft]);

  // Live recipient count.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const res = await api<Preview>('/api/messages/bulk-send', { method: 'POST', json: { filters, preview: true } });
        if (!cancelled) setPreview(res);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filters, open]);

  const hasContent = subject.trim() !== '' || !looksBlank(body);
  const saveState = useAutosave(
    { filters, subject, body },
    useCallback(
      async (v: { filters: Filters; subject: string; body: string }) => {
        const res = await api<{ id: string }>('/api/messages/drafts', { method: 'POST', json: { id: draftId.current, kind: 'bulk', ...v } });
        if (!draftId.current) onDraftsChanged();
        draftId.current = res.id;
      },
      [onDraftsChanged]
    ),
    { enabled: open && hasContent && !sending }
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const applyTemplate = (t: TemplateDTO) => {
    if (!looksBlank(body) && !window.confirm('Replace what you have written with this template?')) return;
    setSubject(t.subject);
    setBody(t.body);
  };

  const review = () => {
    setError(null);
    if (!subject.trim()) return setError('Add a subject.');
    if (looksBlank(body)) return setError('Write a message first.');
    if (!preview?.count) return setError('No one matches these filters yet.');
    setStep('confirm');
  };

  const send = async () => {
    if (!preview) return;
    setSending(true);
    setError(null);
    try {
      const res = await api<{ sent: number; emailed: number; problems: EmailProblem[] }>('/api/messages/bulk-send', {
        method: 'POST',
        json: { filters, subject, body, draftId: draftId.current, expectedCount: preview.count },
      });
      draftId.current = null;
      onDraftsChanged();
      onSent({ recipients: res.sent, emailed: res.emailed, problems: res.problems ?? [] });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setStep('edit');
    } finally {
      setSending(false);
    }
  };

  const enrollmentValue = filters.courseId ? `course:${filters.courseId}` : filters.enrollment;
  const sample = preview?.sample[0];
  const sampleValues = sample
    ? placeholderValues({ firstName: sample.name.split(' ')[0] ?? '', lastName: sample.name.split(' ').slice(1).join(' '), email: sample.email, tierName: sample.tierName, sectionName: null }, window.location.origin)
    : null;

  const countLine = preview ? (
    <span>
      <strong className="text-gray-900">{preview.count}</strong> {preview.count === 1 ? 'person' : 'people'}
      {emailProvider ? (
        <>
          {' '}
          · <strong className="text-gray-900">{preview.emailable}</strong> by email
        </>
      ) : (
        ' · on-site only (no email service yet)'
      )}
    </span>
  ) : (
    'Counting…'
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={step === 'edit' ? 'Bulk message' : 'Check and send'}
      subtitle={step === 'edit' ? 'Everyone who matches gets their own personalised copy.' : preview?.label}
      footer={
        step === 'edit' ? (
          <div className="flex flex-wrap items-center gap-3">
            <SaveIndicator state={saveState} />
            <SaveAsTemplate subject={subject} body={body} onSaved={(t) => onTemplatesChange([...templates, t])} />
            <div className="ml-auto flex items-center gap-2">
              <span className={`text-sm text-gray-500 ${previewing ? 'opacity-60' : ''}`}>{countLine}</span>
              <button type="button" onClick={review} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                Review
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setStep('edit')} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Back to editing
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <MailIcon name="send" />
              {sending ? 'Sending…' : `Send to ${preview?.count ?? 0} ${preview?.count === 1 ? 'person' : 'people'}`}
            </button>
          </div>
        )
      }
    >
      {step === 'edit' ? (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <section aria-label="Who gets it" className="space-y-4 lg:border-r lg:border-gray-200 lg:pr-6">
            <Field label="Send to">
              <div className="flex flex-wrap gap-1.5">
                <Chip on={filters.roles.includes('student')} onClick={() => filters.roles.length > 1 || !filters.roles.includes('student') ? set('roles', toggle(filters.roles, 'student')) : undefined}>
                  Students
                </Chip>
                <Chip on={filters.roles.includes('teacher')} onClick={() => filters.roles.length > 1 || !filters.roles.includes('teacher') ? set('roles', toggle(filters.roles, 'teacher')) : undefined}>
                  Teachers
                </Chip>
              </div>
            </Field>
            <Field label="Plan" hint="none = every plan">
              <div className="flex flex-wrap gap-1.5">
                {['Free', 'Plus', 'Pro'].map((name, tier) => (
                  <Chip key={name} on={filters.tiers.includes(tier)} onClick={() => set('tiers', toggle(filters.tiers, tier))}>
                    {name}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Class" hint="none = every class">
              <div className="flex flex-wrap gap-1.5">
                {audience.sections.map((s) => (
                  <Chip key={s.id} on={filters.sectionIds.includes(s.id)} onClick={() => set('sectionIds', toggle(filters.sectionIds, s.id))}>
                    {s.name}
                  </Chip>
                ))}
                <Chip on={filters.sectionIds.includes('none')} onClick={() => set('sectionIds', toggle(filters.sectionIds, 'none'))}>
                  Not in a class
                </Chip>
              </div>
            </Field>
            <Field label="Course enrollment">
              <select
                className={select}
                value={enrollmentValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith('course:')) setFilters((f) => ({ ...f, enrollment: 'enrolled', courseId: v.slice(7) }));
                  else setFilters((f) => ({ ...f, enrollment: v as Filters['enrollment'], courseId: null }));
                }}
              >
                <option value="any">Anyone</option>
                <option value="enrolled">Enrolled in any course</option>
                <option value="not_enrolled">Not enrolled in a course</option>
                {audience.courses.map((c) => (
                  <option key={c.id} value={`course:${c.id}`}>
                    Enrolled in {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Field label="Joined">
                <select className={select} value={filters.joinedWithinDays ?? ''} onChange={(e) => set('joinedWithinDays', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any time</option>
                  <option value="7">In the last 7 days</option>
                  <option value="30">In the last 30 days</option>
                  <option value="90">In the last 90 days</option>
                </select>
              </Field>
              <Field label="Subscription">
                <select className={select} value={filters.subscriptionEndsWithinDays ?? ''} onChange={(e) => set('subscriptionEndsWithinDays', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any</option>
                  <option value="7">Ends within 7 days</option>
                  <option value="14">Ends within 14 days</option>
                  <option value="30">Ends within 30 days</option>
                </select>
              </Field>
            </div>
            <Field label="Account status">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['active', 'Active'],
                    ['inactive', 'Pending'],
                    ['suspended', 'Suspended'],
                  ] as const
                ).map(([v, label]) => (
                  <Chip key={v} on={filters.statuses.includes(v)} onClick={() => set('statuses', toggle(filters.statuses, v))}>
                    {label}
                  </Chip>
                ))}
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={filters.emailOptedInOnly} onChange={(e) => set('emailOptedInOnly', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Only people who accept emails
            </label>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600" aria-live="polite">
              <p className={previewing ? 'opacity-60' : ''}>{countLine}</p>
              {preview && preview.sample.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {preview.sample.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate" title={s.email}>
                        {s.name || s.email}
                      </span>
                      <TierBadge tier={s.tierName} />
                    </li>
                  ))}
                  {preview.count > preview.sample.length && <li className="text-xs text-gray-400">and {preview.count - preview.sample.length} more</li>}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="Message" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor="bulk-subject" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Subject
                </label>
                <input
                  id="bulk-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Your exam plan for this week, {{first_name}}"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
              <TemplatePicker templates={templates} onApply={applyTemplate} onTemplatesChange={onTemplatesChange} />
            </div>
            <RichTextEditor value={body} onChange={setBody} placeholders minHeight={280} maxHeight={480} />
            <p className="text-xs text-gray-500">
              Use <em>Insert field</em> to personalise: <code className="rounded bg-gray-100 px-1">{'{{first_name}}'}</code> becomes each person&apos;s name.
            </p>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Recipients" value={preview?.count ?? 0} />
            <Stat label="Also by email" value={emailProvider ? preview?.emailable ?? 0 : 0} note={emailProvider ? undefined : 'No email service configured'} />
            <Stat label="On-site only" value={(preview?.count ?? 0) - (emailProvider ? preview?.emailable ?? 0 : 0)} />
          </div>
          {sample && sampleValues && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Preview for {sample.name || sample.email}</p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-900">{fillPlaceholders(subject, sampleValues, { html: false })}</p>
                <div className="message-body text-[15px] leading-relaxed text-gray-900" dangerouslySetInnerHTML={{ __html: fillPlaceholders(body, sampleValues, { html: true }) }} />
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}
