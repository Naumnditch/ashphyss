/**
 * CSV serialisation for the analytics exports. Pure and unit tested — a
 * spreadsheet that silently mangles a question containing a comma or a quote
 * is worse than no export at all.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Strip the characters a spreadsheet would treat as the start of a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  // A byte-order mark, so Excel opens accented names and the × in a
  // question as UTF-8 rather than mojibake. Built from its code point
  // because the character itself is invisible in source.
  const bom = String.fromCharCode(0xfeff);
  return bom + [header, ...body].join('\r\n') + '\r\n';
}

/** Formats a 0–1 accuracy as a percentage for a spreadsheet cell. */
export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '';
  return (value * 100).toFixed(digits);
}

/** Milliseconds to a whole number of seconds. */
export function seconds(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';
  return String(Math.round(ms / 1000));
}
