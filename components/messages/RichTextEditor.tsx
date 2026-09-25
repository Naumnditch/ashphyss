'use client';

/**
 * A small rich text editor for messages: bold, italic, underline, lists,
 * links and quotes, plus optional {{placeholder}} insertion. Emits HTML;
 * the server sanitizes it before storing or emailing. Paste comes in as
 * plain text so Word/Docs styling doesn't leak into emails.
 */

import { useEffect, useRef, useState } from 'react';
import { PLACEHOLDERS } from '@/lib/messaging/placeholders';
import { escapeHtml } from '@/lib/messaging/text';
import { MailIcon, type MailIconName } from './MailIcons';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Show the "Insert field" menu for per-recipient placeholders. */
  placeholders?: boolean;
  /** Ctrl/⌘+Enter. */
  onSubmit?: () => void;
  minHeight?: number;
  maxHeight?: number;
  ariaLabel?: string;
  compact?: boolean;
}

const TOOLS: { cmd: string; icon: MailIconName; label: string; arg?: string }[] = [
  { cmd: 'bold', icon: 'bold', label: 'Bold (Ctrl+B)' },
  { cmd: 'italic', icon: 'italic', label: 'Italic (Ctrl+I)' },
  { cmd: 'underline', icon: 'underline', label: 'Underline (Ctrl+U)' },
  { cmd: 'insertUnorderedList', icon: 'bullets', label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: 'numbers', label: 'Numbered list' },
  { cmd: 'formatBlock', icon: 'quote', label: 'Quote', arg: 'blockquote' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message…',
  placeholders = false,
  onSubmit,
  minHeight = 160,
  maxHeight = 420,
  ariaLabel = 'Message',
  compact = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Only write into the DOM when the value changed from outside (a template, a loaded draft).
  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastHtml.current) return;
    el.innerHTML = value;
    lastHtml.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    // An emptied editor leaves a stray <br>; treat it as empty so the placeholder shows.
    if (el.innerHTML === '<br>' || el.innerHTML === '<p><br></p>' || el.innerHTML === '<div><br></div>') el.innerHTML = '';
    lastHtml.current = el.innerHTML;
    onChange(el.innerHTML);
  };

  const refreshActive = () => {
    const next: Record<string, boolean> = {};
    for (const t of TOOLS) {
      if (t.cmd === 'formatBlock') continue;
      try {
        next[t.cmd] = document.queryCommandState(t.cmd);
      } catch {
        next[t.cmd] = false;
      }
    }
    setActive(next);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const run = (cmd: string, arg?: string) => {
    restoreSelection();
    if (cmd === 'formatBlock') {
      const inQuote = document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote';
      document.execCommand('formatBlock', false, inQuote ? 'p' : 'blockquote');
    } else {
      document.execCommand(cmd, false, arg);
    }
    emit();
    refreshActive();
    saveSelection();
  };

  const insertLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    if (!/^(https?:\/\/|mailto:|\{\{site_url\}\})\S+/.test(url)) return;
    restoreSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) document.execCommand('createLink', false, url);
    else document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>&nbsp;`);
    emit();
  };

  const insertField = (key: string) => {
    setFieldsOpen(false);
    restoreSelection();
    document.execCommand('insertText', false, `{{${key}}}`);
    emit();
    saveSelection();
  };

  const btn = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors';

  return (
    <div className="rounded-lg border border-gray-300 bg-white focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 transition-shadow">
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-1.5 py-1" onMouseDown={saveSelection}>
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.label}
            aria-label={t.label}
            aria-pressed={Boolean(active[t.cmd])}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(t.cmd, t.arg)}
            className={`${btn} ${active[t.cmd] ? 'bg-gray-900 text-white hover:bg-gray-800 hover:text-white' : ''}`}
          >
            <MailIcon name={t.icon} />
          </button>
        ))}
        <button
          type="button"
          title="Add link"
          aria-label="Add link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            saveSelection();
            setLinkOpen((o) => !o);
            setFieldsOpen(false);
          }}
          className={`${btn} ${linkOpen ? 'bg-gray-100 text-gray-900' : ''}`}
        >
          <MailIcon name="link" />
        </button>
        <button type="button" title="Clear formatting" aria-label="Clear formatting" onMouseDown={(e) => e.preventDefault()} onClick={() => run('removeFormat')} className={btn}>
          <MailIcon name="clear" />
        </button>
        {placeholders && (
          <div className="relative ml-auto">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                saveSelection();
                setFieldsOpen((o) => !o);
                setLinkOpen(false);
              }}
              aria-expanded={fieldsOpen}
              className="inline-flex items-center gap-1 h-8 rounded-md px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {'{ }'} Insert field
              <MailIcon name="chevronDown" className="w-3.5 h-3.5" />
            </button>
            {fieldsOpen && (
              <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertField(p.key)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="text-gray-800">{p.label}</span>
                    <code className="text-[11px] text-gray-400">{`{{${p.key}}}`}</code>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                insertLink();
              }
              if (e.key === 'Escape') setLinkOpen(false);
            }}
            aria-label="Link address"
            className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
          />
          <button type="button" onClick={insertLink} className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
            Add link
          </button>
        </div>
      )}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onKeyUp={() => {
          refreshActive();
          saveSelection();
        }}
        onMouseUp={() => {
          refreshActive();
          saveSelection();
        }}
        onBlur={saveSelection}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        style={{ minHeight, maxHeight }}
        className={`rich-editor message-body overflow-y-auto ${compact ? 'px-3 py-2' : 'px-4 py-3'} text-[15px] leading-relaxed text-gray-900 focus:outline-none`}
      />
    </div>
  );
}
