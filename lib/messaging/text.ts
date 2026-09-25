/** Browser-safe text helpers (no HTML parser), shared by the mailbox UI and the server. */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** One line for inbox lists. */
export function previewOf(text: string, max = 140): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** True when editor HTML has no words in it (an empty paragraph, a lone <br>). */
export function looksBlank(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|\s/g, '') === '';
}

export function initials(first: string, last: string, email = ''): string {
  const s = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  return s || email.slice(0, 2).toUpperCase() || '?';
}
