import { describe, it, expect } from 'vitest';
import { toCsv, percent, seconds } from '../csv';

interface Row {
  name: string;
  score: number | null;
}

const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Score', value: (r: Row) => r.score },
];

/** Drops the leading byte-order mark so assertions read cleanly. */
function body(csv: string): string {
  return csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
}

describe('toCsv', () => {
  it('writes a header and one line per row', () => {
    const csv = body(toCsv([{ name: 'Ada', score: 9 }], columns));
    expect(csv).toBe('Name,Score\r\nAda,9\r\n');
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    const rows: Row[] = [
      { name: 'Two charges, 2.0 m apart', score: 1 },
      { name: 'She said "no"', score: 2 },
      { name: 'line one\nline two', score: 3 },
    ];
    const csv = body(toCsv(rows, columns));
    expect(csv).toContain('"Two charges, 2.0 m apart",1');
    expect(csv).toContain('"She said ""no""",2');
    expect(csv).toContain('"line one\nline two",3');
  });

  it('writes an empty cell for null and undefined', () => {
    expect(body(toCsv([{ name: 'Ada', score: null }], columns))).toBe('Name,Score\r\nAda,\r\n');
  });

  it('defuses cells a spreadsheet would run as a formula', () => {
    const csv = body(toCsv([{ name: '=SUM(A1:A9)', score: 1 }], columns));
    expect(csv).toContain("'=SUM(A1:A9)");
    expect(csv).not.toMatch(/\n=SUM/);
  });

  it('keeps physics characters intact', () => {
    const csv = body(toCsv([{ name: '1.8 × 10¹⁰ N', score: 1 }], columns));
    expect(csv).toContain('1.8 × 10¹⁰ N');
  });

  it('starts with a byte-order mark so Excel reads it as UTF-8', () => {
    expect(toCsv([], columns).charCodeAt(0)).toBe(0xfeff);
  });

  it('handles an empty result set', () => {
    expect(body(toCsv([] as Row[], columns))).toBe('Name,Score\r\n');
  });
});

describe('percent and seconds', () => {
  it('formats accuracy as a percentage', () => {
    expect(percent(0.7778)).toBe('77.8');
    expect(percent(1)).toBe('100.0');
    expect(percent(null)).toBe('');
  });

  it('rounds milliseconds to seconds', () => {
    expect(seconds(1500)).toBe('2');
    expect(seconds(400)).toBe('0');
    expect(seconds(null)).toBe('');
  });
});
