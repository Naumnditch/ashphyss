'use client';

/** Write a new message to one or more chosen people. Autosaves as a draft. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DraftDTO, TemplateDTO } from '@/lib/messaging/types';
import { looksBlank } from '@/lib/messaging/text';
import { api } from './api';
import { MailIcon } from './MailIcons';
import { Modal } from './Modal';
import { RecipientPicker, type Recipient } from './RecipientPicker';
import { RichTextEditor } from './RichTextEditor';
import { SaveAsTemplate, TemplatePicker } from './TemplatePicker';
import { SaveIndicator, useAutosave } from './useAutosave';

export interface SendSummary {
  recipients: number;
  emailed: number;
  firstSubscriberId?: string;
}

export function ComposeModal({
  open,
  onClose,
  draft,
  recipients: initialRecipients,
  templates,
  onTemplatesChange,
  onSent,
  onDraftsChanged,
}: {
  open: boolean;
  onClose: () => void;
  draft?: DraftDTO | null;
  recipients?: Recipient[];
  templates: TemplateDTO[];
  onTemplatesChange: (t: TemplateDTO[]) => void;
  onSent: (s: SendSummary) => void;
  onDraftsChanged: () => void;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const draftId = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    draftId.current = draft?.id ?? null;
    setRecipients(draft ? draft.recipients.map((r) => ({ ...r, name: r.name || r.email })) : initialRecipients ?? []);
    setSubject(draft?.subject ?? '');
    setBody(draft?.body ?? '');
    setError(null);
  }, [open, draft, initialRecipients]);

  const hasContent = recipients.length > 0 || subject.trim() !== '' || !looksBlank(body);
  const saveState = useAutosave(
    { recipientIds: recipients.map((r) => r.id), subject, body },
    useCallback(
      async (v: { recipientIds: string[]; subject: string; body: string }) => {
        const res = await api<{ id: string }>('/api/messages/drafts', { method: 'POST', json: { id: draftId.current, kind: 'compose', ...v } });
        if (!draftId.current) onDraftsChanged();
        draftId.current = res.id;
      },
      [onDraftsChanged]
    ),
    { enabled: open && hasContent && !sending }
  );

  const applyTemplate = (t: TemplateDTO) => {
    if (!looksBlank(body) && !window.confirm('Replace what you have written with this template?')) return;
    setSubject(t.subject);
    setBody(t.body);
  };

  const send = async () => {
    setError(null);
    if (!recipients.length) return setError('Add at least one recipient.');
    if (!subject.trim()) return setError('Add a subject.');
    if (looksBlank(body)) return setError('Write a message first.');
    setSending(true);
    try {
      const res = await api<{ emailed: number; messages: { subscriberId: string }[] }>('/api/messages/send', {
        method: 'POST',
        json: { recipientIds: recipients.map((r) => r.id), subject, body, draftId: draftId.current },
      });
      draftId.current = null;
      onDraftsChanged();
      onSent({ recipients: res.messages.length, emailed: res.emailed, firstSubscriberId: res.messages[0]?.subscriberId });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const discard = async () => {
    if (draftId.current) {
      if (!window.confirm('Discard this draft?')) return;
      await api(`/api/messages/drafts/${draftId.current}`, { method: 'DELETE' }).catch(() => {});
      draftId.current = null;
      onDraftsChanged();
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New message"
      subtitle="Delivered to their AshPhys inbox, and by email if they accept emails."
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator state={saveState} />
          <SaveAsTemplate subject={subject} body={body} onSaved={(t) => onTemplatesChange([...templates, t])} />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={discard} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              {draftId.current ? 'Discard' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <MailIcon name="send" />
              {sending ? 'Sending…' : recipients.length > 1 ? `Send to ${recipients.length}` : 'Send'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">To</label>
          <RecipientPicker value={recipients} onChange={setRecipients} />
          {recipients.length > 1 && <p className="mt-1 text-xs text-gray-500">Each person gets their own copy in their own conversation.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="compose-subject" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Subject
            </label>
            <input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={300}
              placeholder="What is this about?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <TemplatePicker templates={templates} onApply={applyTemplate} onTemplatesChange={onTemplatesChange} />
        </div>
        <RichTextEditor value={body} onChange={setBody} placeholders onSubmit={send} minHeight={220} />
        <p className="text-xs text-gray-500">
          Fields like <code className="rounded bg-gray-100 px-1">{'{{first_name}}'}</code> are filled in for each person. Ctrl+Enter sends.
        </p>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
