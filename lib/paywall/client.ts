/**
 * Soft paywall trigger logic (Part 4) — pure browser-storage bookkeeping,
 * no server imports, so it's safe to pull into any client component.
 *
 * sessionStorage counts locked-content attempts for THIS tab session (not
 * tied to being logged in — an anonymous visitor accumulates attempts the
 * same as a signed-in free student). localStorage holds a 24h cooldown so
 * dismissing the popup doesn't bring it right back on the next click.
 */

const ATTEMPT_KEY = 'ashphys_locked_attempts';
const COOLDOWN_KEY = 'ashphys_paywall_cooldown_until';
const ATTEMPT_THRESHOLD = 3;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const PAYWALL_TRIGGER_EVENT = 'ashphys:paywall-trigger';

export function isPaywallInCooldown(): boolean {
  try {
    const until = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function startPaywallCooldown(): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
  } catch {
    // localStorage unavailable (private window, blocked storage) — the
    // popup just won't remember the dismissal; not worth failing over.
  }
}

/** Call whenever a visitor hits locked content. Fires the trigger event on exactly the 3rd attempt. */
export function recordLockedContentAttempt(): void {
  try {
    if (isPaywallInCooldown()) return;
    const count = (parseInt(sessionStorage.getItem(ATTEMPT_KEY) || '0', 10) || 0) + 1;
    sessionStorage.setItem(ATTEMPT_KEY, String(count));
    if (count === ATTEMPT_THRESHOLD) {
      window.dispatchEvent(new Event(PAYWALL_TRIGGER_EVENT));
    }
  } catch {
    // sessionStorage unavailable — just skip the nudge, don't break the page.
  }
}
