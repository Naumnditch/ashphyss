/**
 * Pure TRY->USD formatting, split out from lib/settings (which imports the
 * pg-backed `query()` helper) so client components — like the pricing
 * toggle, which recomputes this on every period switch — can import it
 * without pulling a Node-only DB driver into the browser bundle.
 */
export function tryToUsd(amountTry: number, rate: number): string {
  const usd = amountTry / rate;
  if (usd <= 0) return '0';
  return usd >= 100 ? usd.toFixed(0) : usd.toFixed(usd < 10 ? 2 : 1);
}
