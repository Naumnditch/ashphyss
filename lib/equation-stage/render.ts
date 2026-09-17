import { mk } from './mk';
import type { Stage, StageToken } from './types';
import './equation-stage.css';

const DEFAULT_DURATION_MS = 550;
const BAR_WIDTH = 52;

export interface RenderCallbacks {
  onVariableClick?: (symbol: string) => void;
  onGlossaryClick?: (symbol: string, anchorEl: HTMLElement) => void;
}

export interface RenderOptions extends RenderCallbacks {
  /** Token keys currently mid-cancel — struck through, then removed on the next non-cancelling render. */
  cancelKeys?: Set<string>;
  /** false = snap instantly (Back navigation, no replay); true = FLIP/enter/exit animate. */
  animate: boolean;
  durationMs?: number;
}

/**
 * Diffs the DOM under `container` against `stage` by token key and
 * updates it in place: matching keys FLIP-move (measure old position,
 * apply the inverse transform, then transition it away), new keys
 * enter (fade+scale in), keys no longer present exit (fade+scale out,
 * then removed), and any key in `cancelKeys` gets a strike-through
 * overlay. Call it repeatedly as `stage`/`cancelKeys` change — same
 * idea as the reference's single render() entry point, not a multi-
 * phase API: the caller sequences operate/cancel/settle by calling
 * this three times (see EquationRearrangerSimulator's playMove()).
 */
export function renderStage(container: HTMLElement, stage: Stage, opts: RenderOptions) {
  const duration = opts.durationMs ?? DEFAULT_DURATION_MS;
  const prevRects = new Map<string, DOMRect>();
  const existing = Array.from(container.querySelectorAll<HTMLElement>('[data-key]'));
  existing.forEach((el) => prevRects.set(el.dataset.key!, el.getBoundingClientRect()));

  container.style.width = `${stage.width}px`;
  container.style.height = `${stage.height}px`;

  const seenKeys = new Set<string>();

  stage.tokens.forEach((tok) => {
    seenKeys.add(tok.key);
    let el = container.querySelector<HTMLElement>(`[data-key="${CSS.escape(tok.key)}"]`);
    const isNew = !el;
    if (!el) {
      el = buildTokenElement(tok, opts);
      container.appendChild(el);
    } else {
      updateTokenElement(el, tok, opts);
    }

    el.style.left = `${tok.x}px`;
    el.style.top = `${tok.y}px`;

    if (isNew) {
      if (opts.animate) playEnter(el, duration);
      else {
        el.style.transition = 'none';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.opacity = '1';
      }
    } else if (opts.animate) {
      const prev = prevRects.get(tok.key);
      if (prev) playFlipMove(el, prev, duration);
      else {
        el.style.transition = 'none';
        el.style.transform = 'translate(-50%, -50%)';
      }
    } else {
      el.style.transition = 'none';
      el.style.transform = 'translate(-50%, -50%)';
    }

    setStrike(el, !!opts.cancelKeys?.has(tok.key), opts.animate);
  });

  existing.forEach((el) => {
    const key = el.dataset.key!;
    if (seenKeys.has(key)) return;
    if (opts.animate) playExit(el, duration);
    else el.remove();
  });
}

function playEnter(el: HTMLElement, duration: number) {
  el.style.transition = 'none';
  el.style.opacity = '0';
  el.style.transform = 'translate(-50%, -50%) scale(0.4)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%)';
    });
  });
}

function playFlipMove(el: HTMLElement, prevRect: DOMRect, duration: number) {
  // Position (left/top) was already updated by the caller — read the new
  // rect now, diff against the pre-update rect, and play the inverse.
  el.style.transition = 'none';
  el.style.transform = 'translate(-50%, -50%)';
  const nextRect = el.getBoundingClientRect();
  const dx = prevRect.left - nextRect.left;
  const dy = prevRect.top - nextRect.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  el.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms cubic-bezier(.26,.86,.44,.985)`;
      el.style.transform = 'translate(-50%, -50%)';
    });
  });
}

function playExit(el: HTMLElement, duration: number) {
  el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
  el.style.opacity = '0';
  el.style.transform = 'translate(-50%, -50%) scale(0.4)';
  window.setTimeout(() => el.remove(), duration);
}

function setStrike(el: HTMLElement, on: boolean, animate: boolean) {
  let strike = el.querySelector<HTMLElement>('.eq-strike');
  if (!strike) {
    strike = mk('span', { class: 'eq-strike' });
    el.appendChild(strike);
  }
  if (animate) {
    // let the "on" flag apply on the next frame so a fresh strike still transitions in
    requestAnimationFrame(() => strike!.classList.toggle('eq-strike-on', on));
  } else {
    strike.style.transition = 'none';
    strike.classList.toggle('eq-strike-on', on);
  }
}

function buildTokenElement(tok: StageToken, opts: RenderOptions): HTMLElement {
  const isButton = !!tok.clickableVariable;
  const el = mk(isButton ? 'button' : 'span', {
    class: 'eq-token',
    'data-key': tok.key,
    type: isButton ? 'button' : undefined,
  });
  if (tok.kind === 'fractionBar') el.style.width = `${BAR_WIDTH}px`;
  const label = mk('span', { class: 'eq-token-label' }, tok.text);
  el.appendChild(label);
  applyTokenState(el, tok, opts);
  return el;
}

function updateTokenElement(el: HTMLElement, tok: StageToken, opts: RenderOptions) {
  const label = el.querySelector<HTMLElement>('.eq-token-label');
  if (label && label.textContent !== tok.text) label.textContent = tok.text;
  applyTokenState(el, tok, opts);
}

function applyTokenState(el: HTMLElement, tok: StageToken, opts: RenderOptions) {
  el.dataset.kind = tok.kind;
  el.dataset.target = tok.isTarget ? 'true' : 'false';
  el.dataset.clickable = tok.clickableVariable ? 'true' : 'false';
  el.onclick = tok.clickableVariable ? () => opts.onVariableClick?.(tok.clickableVariable!) : null;

  let glyph = el.querySelector<HTMLElement>('.eq-gloss-glyph');
  if (tok.glossarySymbol) {
    if (!glyph) {
      glyph = mk('span', { class: 'eq-gloss-glyph' }, 'i');
      el.appendChild(glyph);
    }
    const symbol = tok.glossarySymbol;
    glyph.onclick = (e) => {
      e.stopPropagation();
      opts.onGlossaryClick?.(symbol, glyph!);
    };
  } else if (glyph) {
    glyph.remove();
  }
}
