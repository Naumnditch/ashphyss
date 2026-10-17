/**
 * The mailbox's "To:" search: which people match what the admin typed.
 *
 * Every word typed must appear somewhere in the person's first name, last
 * name or email (any order, any part of a word), so "mostafa abdel" finds
 * "Abdelrahman Mostafa" and stray spaces saved in a name don't matter.
 * An empty search matches everyone. Admins are never recipients.
 */

/** Most people one search returns; the UI says so when there are more. */
export const SEARCH_MAX = 500;
const MAX_TOKENS = 8;

export function searchTokens(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

/** `%token%` for ILIKE, with the LIKE wildcards in the token escaped. */
export function likePattern(token: string): string {
  return `%${token.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const HAYSTACK = `concat_ws(' ', btrim(u.first_name), btrim(u.last_name), u.email)`;

/** WHERE clause (on users u) and its parameters, numbered from `start`. */
export function buildSubscriberSearch(q: string, start = 1): { where: string; params: string[] } {
  const params = searchTokens(q).map(likePattern);
  const clauses = [`u.role <> 'admin'`, ...params.map((_, i) => `${HAYSTACK} ILIKE $${start + i}`)];
  return { where: clauses.join(' AND '), params };
}

/** A usable page size from the `limit` query parameter; anything missing or invalid means "as many as allowed". */
export function searchLimit(raw: string | null): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(SEARCH_MAX, n) : SEARCH_MAX;
}
