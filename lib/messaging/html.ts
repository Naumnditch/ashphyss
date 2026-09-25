/**
 * Message bodies are stored as HTML. Anything an admin writes in the rich
 * text editor is cut down to a small allowlist before it is stored or
 * emailed; anything a student writes is plain text, escaped and turned into
 * paragraphs. Plain-text copies feed search, previews and the text/plain
 * part of emails.
 */

import sanitizeHtml from 'sanitize-html';
import { escapeHtml } from './text';

export { escapeHtml, previewOf } from './text';

const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'h3', 'h4', 'span', 'hr'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Template links are written as {{site_url}}/…, which only becomes absolute once filled in.
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
};

export function sanitizeMessageHtml(html: string): string {
  return sanitizeHtml(html, ALLOWED).trim();
}

/** Plain text (a student's reply) as safe HTML paragraphs, with bare links made clickable. */
export function textToHtml(text: string): string {
  const paragraphs = text.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/);
  return paragraphs
    .filter((p) => p.trim())
    .map((p) => {
      const linked = escapeHtml(p).replace(
        /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g,
        (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
      return `<p>${linked.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function htmlToText(html: string): string {
  return html
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '').trim();
      return !href || label === href ? label || href : `${label} (${href})`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|blockquote|ul|ol)>/gi, '\n\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** True when an editor's HTML has no words in it (an empty paragraph, a lone <br>). */
export function isBlankHtml(html: string): boolean {
  return htmlToText(html).trim() === '';
}
