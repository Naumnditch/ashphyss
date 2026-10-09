import { describe, expect, it } from 'vitest';
import { toSvgMarkup } from '@/lib/practice/worksheetPdf';
import { KINEMATICS_DIAGRAMS } from '@/components/practice/KinematicsDiagrams';
import { KINEMATICS_DIAGRAM_DATA } from '@/components/practice/kinematicsDiagramData';

describe('every kinematics diagram renders to finite, well-formed markup', () => {
  const entries = Object.entries(KINEMATICS_DIAGRAMS);

  it('has a non-null React node for every registered key', () => {
    const missing = entries.filter(([, node]) => !node).map(([key]) => key);
    expect(missing).toEqual([]);
  });

  it.each(entries)('%s renders without NaN/Infinity/undefined leaking into its markup', (key, node) => {
    const svg = toSvgMarkup(node);
    expect(svg.length, key).toBeGreaterThan(0);
    expect(svg, key).not.toMatch(/NaN|Infinity|undefined/);
  });

  // DataTable diagrams (kind: 'table') render as an HTML <table>, not an <svg> —
  // they have no viewBox by design, and the worksheet PDF's SVG renderer skips
  // them (shows its usual "figure not available" placeholder there), while the
  // live practice page renders the table normally. Every svg-based kind should
  // still carry a sane, positive viewBox.
  const svgEntries = entries.filter(([key]) => KINEMATICS_DIAGRAM_DATA[key.replace(/^diagram:/, '')]?.kind !== 'table');
  it.each(svgEntries)('%s has a positive SVG viewBox', (key, node) => {
    const svg = toSvgMarkup(node);
    const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(box, `${key}: no viewBox found`).not.toBeNull();
    expect(Number(box![1]), key).toBeGreaterThan(0);
    expect(Number(box![2]), key).toBeGreaterThan(0);
  });
});
