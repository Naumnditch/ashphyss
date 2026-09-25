'use client';

/** Template menu (apply / delete) and an inline "save as template" form. */

import { useEffect, useRef, useState } from 'react';
import type { TemplateDTO } from '@/lib/messaging/types';
import { api } from './api';
import { MailIcon } from './MailIcons';

const CATEGORY_LABEL: Record<string, string> = {
  onboarding: 'Getting started',
  enrollment: 'Enrollment',
  reminder: 'Reminders',
  billing: 'Billing',
  requests: 'Requests',
  general: 'Saved by you',
};

export function TemplatePicker({
  templates,
  onApply,
  onTemplatesChange,
}: {
  templates: TemplateDTO[];
  onApply: (t: TemplateDTO) => void;
  onTemplatesChange: (t: TemplateDTO[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const groups = templates.reduce<Record<string, TemplateDTO[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const remove = async (t: TemplateDTO) => {
    if (!window.confirm(`Delete the template “${t.name}”?`)) return;
    await api(`/api/messages/templates/${t.id}`, { method: 'DELETE' });
    onTemplatesChange(templates.filter((x) => x.id !== t.id));
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <MailIcon name="template" /> Templates
        <MailIcon name="chevronDown" className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-80 w-[min(22rem,calc(100vw-3rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {templates.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No templates yet.</p>}
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat} className="py-1">
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{CATEGORY_LABEL[cat] ?? cat}</p>
              {items.map((t) => (
                <div key={t.id} className="group flex items-center hover:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(t);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 px-3 py-1.5 text-left"
                  >
                    <span className="block truncate text-sm font-medium text-gray-900">{t.name}</span>
                    <span className="block truncate text-xs text-gray-500">{t.subject}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(t)}
                    aria-label={`Delete template ${t.name}`}
                    className="mr-2 rounded p-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <MailIcon name="trash" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SaveAsTemplate({
  subject,
  body,
  onSaved,
}: {
  subject: string;
  body: string;
  onSaved: (t: TemplateDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { template } = await api<{ template: TemplateDTO }>('/api/messages/templates', { method: 'POST', json: { name, subject, body } });
      onSaved(template);
      setOpen(false);
      setName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline">
        Save as template
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Template name"
        aria-label="Template name"
        className="w-44 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
      />
      <button type="button" disabled={saving || !name.trim()} onClick={save} className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40">
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-800">
        Cancel
      </button>
      {error && <span className="w-full text-xs text-red-600">{error}</span>}
    </div>
  );
}
