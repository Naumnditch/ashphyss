/**
 * Template placeholders ({{first_name}} …), filled in per recipient when a
 * message is sent. Values are HTML-escaped when filling an HTML body.
 */

import { escapeHtml } from './text';

export const PLACEHOLDERS = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'full_name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'tier', label: 'Plan (Free/Plus/Pro)' },
  { key: 'section', label: 'Class / section' },
  { key: 'site_url', label: 'Site address' },
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]['key'];
export type PlaceholderValues = Record<PlaceholderKey, string>;

export function fillPlaceholders(source: string, values: PlaceholderValues, opts: { html: boolean }): string {
  return source.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const v = values[key as PlaceholderKey];
    // site_url goes into href attributes; it is ours, never user input.
    return opts.html && key !== 'site_url' ? escapeHtml(v) : v;
  });
}

export function placeholderValues(
  r: { firstName: string; lastName: string; email: string; tierName: string; sectionName: string | null },
  siteUrl: string
): PlaceholderValues {
  const first = r.firstName?.trim() || 'there';
  return {
    first_name: first,
    last_name: r.lastName?.trim() ?? '',
    full_name: [r.firstName, r.lastName].filter(Boolean).join(' ').trim() || first,
    email: r.email,
    tier: r.tierName,
    section: r.sectionName ?? 'your class',
    site_url: siteUrl,
  };
}
