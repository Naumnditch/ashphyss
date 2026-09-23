import { describe, it, expect } from 'vitest';
import { conicalPendulum, horizontalCircle, verticalCircle, verticalTensionAt } from '../circularMotion';
import { coulombForce, fieldAt, length, netForce, traceFieldLines, type PointCharge } from '../coulomb';
import { sci, signed } from '../format';

// Expected values are the answers stored for the 3.7 and 17.4 practice questions.
const close = (actual: number, expected: number, rel = 0.005) => expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(rel);

describe('horizontal circle', () => {
  it('race car: r = 50 m, one lap in 9.0 s', () => {
    const c = horizontalCircle(1, 50, 9);
    close(c.v, 34.91);
    close(c.a, 24.37);
  });

  it('0.75 kg at 1.1 m, 12 rev/min → tension 1.303 N', () => {
    const c = horizontalCircle(0.75, 1.1, 60 / 12);
    close(c.force, 1.303);
    close(c.rpm, 12);
  });
});

describe('vertical circle', () => {
  it('0.50 kg on 0.90 m, 1.8 s per turn → 10.38 N at the bottom', () => {
    close(verticalCircle(0.5, 0.9, (2 * Math.PI * 0.9) / 1.8).tensionBottom, 10.38);
  });

  it('2.1 kg on 1.2 m, 1.5 s per turn → 23.64 N at the top', () => {
    close(verticalCircle(2.1, 1.2, (2 * Math.PI * 1.2) / 1.5).tensionTop, 23.64);
  });

  it('bucket: 4.0 kg, r = 1.5 m, 5.0 m/s at the bottom → 105.9 N', () => {
    close(verticalCircle(4, 1.5, 5).tensionBottom, 105.87);
  });

  it('minimum speed over a 7.5 m loop is √(gr) = 8.573 m/s', () => {
    close(verticalCircle(1, 7.5, 1).minSpeed, 8.573);
  });

  it('tension round the circle matches the top and bottom values', () => {
    const c = verticalCircle(2, 1.2, 4);
    close(verticalTensionAt(2, 1.2, 4, 0), c.tensionBottom);
    close(verticalTensionAt(2, 1.2, 4, Math.PI), c.tensionTop);
  });

  it('goes slack at the top below the minimum speed', () => {
    expect(verticalCircle(1, 1, 2).tensionTop).toBeLessThan(0);
    expect(verticalCircle(1, 1, 4).tensionTop).toBeGreaterThan(0);
  });
});

describe('conical pendulum', () => {
  it('0.50 kg, 1.5 m string at 35° → tension 5.982 N', () => {
    close(conicalPendulum(0.5, 1.5, 35).tension, 5.982);
  });

  it('0.90 m string at 25° → speed 1.318 m/s', () => {
    close(conicalPendulum(1, 0.9, 25).v, 1.318);
  });

  it('toy plane: r = 0.80 m at 28° → period 2.462 s', () => {
    const L = 0.8 / Math.sin((28 * Math.PI) / 180);
    const c = conicalPendulum(0.25, L, 28);
    close(c.r, 0.8);
    close(c.period, 2.462);
    close(c.centripetal, 1.303);
  });

  it('the period also equals 2πr / v', () => {
    const c = conicalPendulum(1, 1.2, 40);
    close(c.period, (2 * Math.PI * c.r) / c.v);
  });
});

describe("Coulomb's law", () => {
  it('+2.0 C and −4.0 C at 2.0 m → 1.8 × 10¹⁰ N', () => {
    close(coulombForce(2, -4, 2), 1.8e10);
  });

  it('right angle (17.4 Q40) → net 0.974 N on q₁', () => {
    const q1: PointCharge = { q: 4.5e-5, p: [0, 0, 0] };
    const r = netForce(q1, [{ q: -1.2e-5, p: [0, 3, 0] }, { q: 1.8e-5, p: [3, 0, 0] }]);
    close(r.magnitude, 0.974, 0.01);
    // Up (attracted to q₂) and left (repelled by q₃).
    expect(r.net[0]).toBeLessThan(0);
    expect(r.net[1]).toBeGreaterThan(0);
  });

  it('in a line (17.4 Q39) → net 11.4 N on q₁, towards q₃', () => {
    const q1: PointCharge = { q: 6e-6, p: [0, 0, 0] };
    const r = netForce(q1, [{ q: -4e-6, p: [-0.2, 0, 0] }, { q: -7e-6, p: [0.15, 0, 0] }]);
    close(r.magnitude, 11.4);
    expect(r.net[0]).toBeGreaterThan(0);
  });

  it('equilateral triangle (17.4 Q46) → 0.381 N, 19.1° below the base line', () => {
    const qc: PointCharge = { q: 2e-6, p: [0.25, (0.5 * Math.sqrt(3)) / 2, 0] };
    const r = netForce(qc, [{ q: 4e-6, p: [0, 0, 0] }, { q: -6e-6, p: [0.5, 0, 0] }]);
    close(r.magnitude, 0.381);
    close(r.angleDeg, -19.1, 0.01);
  });

  it('the forces on two charges are equal and opposite', () => {
    const a: PointCharge = { q: 3e-6, p: [0, 0, 0] };
    const b: PointCharge = { q: -5e-6, p: [0.4, 0.1, 0] };
    const fa = netForce(a, [b]).net;
    const fb = netForce(b, [a]).net;
    fa.forEach((v, i) => expect(v).toBeCloseTo(-fb[i], 9));
  });
});

describe('field lines', () => {
  const dipole: PointCharge[] = [
    { q: 1e-6, p: [-0.5, 0, 0] },
    { q: -1e-6, p: [0.5, 0, 0] },
  ];

  it('leave the positive charge and point along the field', () => {
    const lines = traceFieldLines(dipole, { planar: true, linesPerCharge: 12 });
    expect(lines).toHaveLength(12);
    for (const line of lines) {
      expect(length([line[0][0] + 0.5, line[0][1], line[0][2]])).toBeCloseTo(0.06, 5);
      const e = fieldAt(line[0], dipole);
      const step = [line[1][0] - line[0][0], line[1][1] - line[0][1], line[1][2] - line[0][2]];
      expect(e[0] * step[0] + e[1] * step[1] + e[2] * step[2]).toBeGreaterThan(0);
    }
  });

  it('mostly end on the negative charge of a dipole', () => {
    const lines = traceFieldLines(dipole, { planar: true, linesPerCharge: 12 });
    const ended = lines.filter((l) => length([l[l.length - 1][0] - 0.5, l[l.length - 1][1], 0]) < 0.08);
    expect(ended.length).toBeGreaterThanOrEqual(8);
  });

  it('start on negative charges and run backwards when there are no positives', () => {
    const lines = traceFieldLines([{ q: -2e-6, p: [0, 0, 0] }], { planar: true, linesPerCharge: 6 });
    expect(lines).toHaveLength(6);
    const last = lines[0][lines[0].length - 1];
    expect(length(last)).toBeGreaterThan(1);
  });

  it('give a bigger charge proportionally more lines', () => {
    const lines = traceFieldLines(
      [{ q: 2e-6, p: [-0.5, 0, 0] }, { q: 1e-6, p: [0.5, 0, 0] }],
      { planar: true, linesPerCharge: 16 }
    );
    expect(lines).toHaveLength(16 + 8);
  });
});

describe('sci', () => {
  it('uses ordinary decimals for everyday sizes', () => {
    expect(sci(0.25)).toBe('0.250');
    expect(sci(5.982)).toBe('5.98');
    expect(sci(1303)).toBe('1300');
  });

  it('switches to standard form for very large and very small numbers', () => {
    expect(sci(2.25e-3)).toBe('2.25 × 10⁻³');
    expect(sci(1.8e10)).toBe('1.80 × 10¹⁰');
    expect(sci(9.9999e5)).toBe('1.00 × 10⁶');
  });

  it('writes negatives with a real minus sign', () => {
    expect(sci(-0.0889)).toBe('−0.0889');
    expect(signed(-3)).toBe('−3.0');
    expect(signed(2, 2)).toBe('+2.00');
  });
});
