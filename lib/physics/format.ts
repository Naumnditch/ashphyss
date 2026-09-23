const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/**
 * A number to `sig` significant figures, switching to standard form
 * (2.25 × 10⁻³) when it is very large or very small. Uses a real minus sign.
 */
export function sci(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  if (x < 0) return `−${sci(-x, sig)}`;
  const e = Math.floor(Math.log10(x));
  if (e >= -2 && e < 4) {
    // Whole numbers are rounded to `sig` figures too: 1303 → 1300.
    if (e >= sig - 1) return String(Number(x.toPrecision(sig)));
    return x.toFixed(sig - 1 - e);
  }
  let m = x / 10 ** e;
  let exp = e;
  if (Number(m.toFixed(sig - 1)) >= 10) {
    m /= 10;
    exp += 1;
  }
  const power = String(exp)
    .split('')
    .map((c) => SUPERSCRIPT[c])
    .join('');
  return `${m.toFixed(sig - 1)} × 10${power}`;
}

/** Signed, for charges: +2.0, −3.5. */
export function signed(x: number, dp = 1): string {
  if (x === 0) return '0';
  return `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(dp)}`;
}
