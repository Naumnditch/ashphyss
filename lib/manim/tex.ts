/**
 * TeX typesetting for the Manim-style stage. MathJax lays the TeX out and
 * draws it as SVG glyph outlines (Computer Modern, as in a Manim render);
 * we walk that SVG tree and return every glyph with its outline and its
 * position, plus the \class{…} name of its nearest tagged ancestor. Those
 * class names are how a glyph is matched to the same glyph in the next
 * equation (Manim's TransformMatchingTex does the same with substrings).
 *
 * No DOM is needed (MathJax's lite adaptor), so this also runs in tests.
 */

import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js';

/** An affine map [a, b, c, d, e, f]: (x, y) → (a x + c y + e, b x + d y + f). */
export type Mat = [number, number, number, number, number, number];

export interface GlyphSpec {
  /** The nearest \class name on an ancestor, or null for untagged glyphs. */
  cls: string | null;
  /** The character drawn ('▬' for rules: fraction bars, radical overlines). */
  char: string;
  /** Outline in font units (1000 per em), for character glyphs. */
  d?: string;
  /** Rule rectangle in font units, for bars. */
  rect?: { x: number; y: number; w: number; h: number };
  /** Font units → layout units (1000 per em). y points up; the baseline is y = 0. */
  m: Mat;
}

export interface TexEngine {
  /** Every visible glyph of a formula. Throws on a TeX error. */
  layout(tex: string, display?: boolean): GlyphSpec[];
  /** The formula as an SVG string (for small inline previews). */
  toSvg(tex: string, display?: boolean): string;
}

const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function multiply(p: Mat, q: Mat): Mat {
  return [
    p[0] * q[0] + p[2] * q[1],
    p[1] * q[0] + p[3] * q[1],
    p[0] * q[2] + p[2] * q[3],
    p[1] * q[2] + p[3] * q[3],
    p[0] * q[4] + p[2] * q[5] + p[4],
    p[1] * q[4] + p[3] * q[5] + p[5],
  ];
}

/** Parses an SVG transform list (translate, scale, matrix, rotate). */
export function parseTransform(attr: string | null | undefined): Mat {
  if (!attr) return IDENTITY;
  let m: Mat = IDENTITY;
  const re = /(\w+)\s*\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(attr))) {
    const args = match[2].trim().split(/[\s,]+/).map(Number);
    let t: Mat = IDENTITY;
    switch (match[1]) {
      case 'translate':
        t = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
        break;
      case 'scale':
        t = [args[0], 0, 0, args[1] ?? args[0], 0, 0];
        break;
      case 'matrix':
        t = args.slice(0, 6) as Mat;
        break;
      case 'rotate': {
        const r = ((args[0] ?? 0) * Math.PI) / 180;
        t = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
        break;
      }
    }
    m = multiply(m, t);
  }
  return m;
}

let enginePromise: Promise<TexEngine> | null = null;

/** Loads MathJax once (it is a large module, so only pages that typeset pay for it). */
export function loadTexEngine(): Promise<TexEngine> {
  enginePromise ??= (async () => {
    const [{ mathjax }, { TeX }, { SVG }, { liteAdaptor }, { RegisterHTMLHandler }] = await Promise.all([
      import('mathjax-full/js/mathjax.js'),
      import('mathjax-full/js/input/tex.js'),
      import('mathjax-full/js/output/svg.js'),
      import('mathjax-full/js/adaptors/liteAdaptor.js'),
      import('mathjax-full/js/handlers/html.js'),
    ]);
    // Registering the TeX packages we use: base, AMS, and html for \class.
    await Promise.all([
      import('mathjax-full/js/input/tex/base/BaseConfiguration.js'),
      import('mathjax-full/js/input/tex/ams/AmsConfiguration.js'),
      import('mathjax-full/js/input/tex/html/HtmlConfiguration.js'),
    ]);
    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    const doc = mathjax.document('', {
      InputJax: new TeX({ packages: ['base', 'ams', 'html'] }),
      // fontCache 'none' puts every glyph's outline inline rather than behind <use>.
      OutputJax: new SVG({ fontCache: 'none' }),
    });

    const convert = (tex: string, display: boolean) => doc.convert(tex, { display }) as LiteElement;

    const layout = (tex: string, display = true): GlyphSpec[] => {
      const root = convert(tex, display);
      const glyphs: GlyphSpec[] = [];
      let error: string | null = null;
      const walk = (node: LiteElement, m: Mat, cls: string | null, depth: number) => {
        const kind = adaptor.kind(node);
        if (kind === '#text' || kind === '#comment') return;
        if (adaptor.getAttribute(node, 'data-mml-node') === 'merror') error = adaptor.textContent(node) || 'TeX error';
        const transform = adaptor.getAttribute(node, 'transform');
        // The outermost group flips SVG's y-down into TeX's y-up; we stay in y-up.
        const local = depth === 1 && transform === 'scale(1,-1)' ? IDENTITY : parseTransform(transform);
        const here = multiply(m, local);
        const own = (adaptor.getAttribute(node, 'class') || '').trim().split(/\s+/)[0];
        const tag = own && kind === 'g' ? own : cls;
        if (kind === 'path') {
          const d = adaptor.getAttribute(node, 'd');
          const code = adaptor.getAttribute(node, 'data-c');
          if (d) glyphs.push({ cls: tag, char: code ? String.fromCodePoint(parseInt(code, 16)) : '?', d, m: here });
          return;
        }
        if (kind === 'text') {
          // MathJax falls back to a font's <text> for characters its TeX fonts lack; we can only draw outlines.
          error = `no TeX glyph for "${adaptor.textContent(node)}"`;
          return;
        }
        if (kind === 'rect') {
          const num = (a: string) => Number(adaptor.getAttribute(node, a) || 0);
          const w = num('width');
          const h = num('height');
          if (w > 0 && h > 0) glyphs.push({ cls: tag, char: '▬', rect: { x: num('x'), y: num('y'), w, h }, m: here });
          return;
        }
        for (const child of adaptor.childNodes(node) as LiteElement[]) walk(child, here, tag, depth + 1);
      };
      const svg = (adaptor.childNodes(root) as LiteElement[]).find((n) => adaptor.kind(n) === 'svg');
      if (!svg) throw new Error(`MathJax produced no SVG for ${tex}`);
      for (const child of adaptor.childNodes(svg) as LiteElement[]) walk(child, IDENTITY, null, 1);
      if (error) throw new Error(`TeX error in ${tex}: ${error}`);
      return glyphs;
    };

    const toSvg = (tex: string, display = false) => adaptor.innerHTML(convert(tex, display));

    return { layout, toSvg };
  })();
  return enginePromise;
}
