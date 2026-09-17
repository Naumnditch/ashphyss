/** Tiny DOM element builder — no jQuery-style globals, just a typed helper. */
type Attrs = Record<string, string | number | boolean | undefined>;

export function mk<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  if (text !== undefined) el.textContent = text;
  return el;
}
