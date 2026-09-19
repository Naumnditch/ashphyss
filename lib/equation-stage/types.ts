/**
 * Generic positioned-token tree for the equation stage — variable/number/
 * operator/unit leaf kinds, plus 'bracket' and 'fractionBar' for the
 * structural pieces a fraction/root/power builds out of (see the adapter
 * in EquationRearrangerSimulator.tsx, which walks the algebra engine's
 * existing Factor/Side tree and emits exactly these). Nothing in this
 * folder knows about that algebra engine — it only ever sees Stage/
 * StageToken, which keeps it reusable for a future step-by-step sim with
 * a completely different content model.
 */
export type StageTokenKind = 'variable' | 'number' | 'operator' | 'equals' | 'bracket' | 'fractionBar' | 'unit';

export interface StageToken {
  /** Stable identity across renders — this is what render() diffs on. */
  key: string;
  text: string;
  /** Layout-space position, token CENTER (bars use it as their midpoint too). */
  x: number;
  y: number;
  kind: StageTokenKind;
  /** Persistent highlight for the variable currently being solved for. */
  isTarget?: boolean;
  /** If set, clicking this token solves for this symbol (unchanged existing behavior). */
  clickableVariable?: string;
  /** If set, this token gets the small "ⓘ" glossary glyph — a SEPARATE click target from clickableVariable. */
  glossarySymbol?: string;
}

export interface Stage {
  tokens: StageToken[];
  width: number;
  height: number;
}
