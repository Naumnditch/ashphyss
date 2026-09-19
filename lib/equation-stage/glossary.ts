/**
 * Glossary content for the equation rearranger's "ⓘ" popup — one entry
 * per variable symbol, reusing the name/unit already on each equation's
 * VarInfo (never re-typed here) and adding a short IGCSE-appropriate
 * description plus the unit's long-form name.
 *
 * SCOPE NOTE: a bare symbol is not always the same physical quantity in
 * every equation it appears in — most obviously V₁/V₂ (primary/secondary
 * voltage in the transformer equation, but initial/final VOLUME in
 * Boyle's Law) and F (plain force, gravitational force, electrostatic
 * force). Looking the description up by symbol alone would silently show
 * the wrong meaning on whichever equation didn't "win" the lookup. So
 * this keys descriptions by (equationId, symbol) where meanings actually
 * collide, falling back to one shared per-symbol description everywhere
 * they don't (most symbols) — never a single global symbol -> text map.
 */

export interface GlossaryEntry {
  symbol: string;
  name: string;
  unit: string;
  unitName: string;
  description: string;
}

const UNIT_NAMES: Record<string, string> = {
  'N': 'newtons',
  'kg': 'kilograms',
  'm': 'metres',
  'm/s': 'metres per second',
  'm/s²': 'metres per second squared',
  'A': 'amps',
  'Ω': 'ohms',
  'V': 'volts',
  's': 'seconds',
  'W': 'watts',
  'J': 'joules',
  'kg/m³': 'kilograms per cubic metre',
  'Pa': 'pascals',
  'N/kg': 'newtons per kilogram',
  'F': 'farads',
  'C': 'coulombs',
  'm²': 'square metres',
  'm³': 'cubic metres',
  'turns': 'turns (no unit)',
};

// Default description per bare symbol — used everywhere that symbol's
// meaning doesn't collide with another equation's use of it.
const SYMBOL_DESCRIPTIONS: Record<string, string> = {
  F: 'A push or pull on an object, measured in newtons.',
  m: 'How much matter an object contains — its mass, measured in kilograms. Mass does not change with location, unlike weight.',
  M: 'A mass involved in the interaction, measured in kilograms.',
  a: 'How quickly velocity changes, measured in metres per second squared. A larger force or a smaller mass both increase it.',
  'ρ': 'Mass packed into a given volume — density, measured in kilograms per cubic metre.',
  V: 'The energy given to each unit of charge that flows — voltage (potential difference), measured in volts.',
  I: 'The rate of flow of electric charge — current, measured in amps.',
  R: 'How strongly a component opposes the flow of current — resistance, measured in ohms.',
  P: 'The rate of doing work or transferring energy — power, measured in watts.',
  E: 'The capacity to do work — energy, measured in joules.',
  t: 'How long something takes, measured in seconds.',
  p: 'Force spread over an area — pressure, measured in pascals. Deeper in a liquid, more of it presses down from above.',
  g: 'The gravitational force per unit mass at a location — gravitational field strength, measured in newtons per kilogram (numerically the same as free-fall acceleration in m/s²).',
  h: 'A vertical distance — depth below a surface, or height fallen — measured in metres.',
  v: 'How fast something is moving, measured in metres per second.',
  u: 'The speed or velocity an object starts with, before any acceleration is applied, measured in metres per second.',
  'q₁': 'The electric charge on the first object, measured in coulombs. Like charges repel; unlike charges attract.',
  'q₂': 'The electric charge on the second object, measured in coulombs.',
  r: 'The distance between the centres of the two interacting objects, measured in metres. Both gravity and the electric force fall off with the square of this distance.',
  'Eₖ': 'The energy an object has because it is moving — kinetic energy, measured in joules. It grows with the SQUARE of speed, not speed itself.',
  C: 'How much charge a capacitor can store per volt across it — capacitance, measured in farads.',
  Q: 'The electric charge stored, measured in coulombs.',
  L: 'The length of the pendulum string, measured in metres, from the pivot to the centre of the bob.',
  T: 'The time for one complete swing of the pendulum, measured in seconds.',
  A: 'The area of a capacitor plate that faces the other plate, measured in square metres.',
  d: 'The gap between the two capacitor plates, measured in metres.',
  'V₁': 'A voltage on one side of a transformer, measured in volts.',
  'V₂': 'A voltage on the other side of a transformer, measured in volts.',
  'N₁': 'The number of turns of wire in the primary (input) coil of a transformer.',
  'N₂': 'The number of turns of wire in the secondary (output) coil of a transformer.',
  'p₁': 'The pressure of the gas before the change, measured in pascals.',
  'p₂': 'The pressure of the gas after the change, measured in pascals.',
};

// Overrides for the (equationId, symbol) pairs above where the shared
// default would be misleading for that specific equation.
const EQUATION_OVERRIDES: Record<string, Record<string, string>> = {
  gravitation: {
    F: 'The attractive force between two masses due to gravity, measured in newtons.',
  },
  coulomb: {
    F: 'The attractive or repulsive force between two charges, measured in newtons.',
  },
  rhomv: {
    V: 'The amount of space an object takes up — volume, measured in cubic metres. Not to be confused with voltage, which uses the same letter in the electrical equations.',
  },
  transformer: {
    'V₁': 'The voltage across the primary (input) coil of the transformer, measured in volts.',
    'V₂': 'The voltage across the secondary (output) coil of the transformer, measured in volts.',
  },
  boyles: {
    'V₁': 'The volume the gas occupies before the change, measured in cubic metres. Not to be confused with voltage, which uses the same letter in the transformer equation.',
    'V₂': 'The volume the gas occupies after the change, measured in cubic metres.',
  },
};

export function getGlossaryEntry(equationId: string, symbol: string, name: string, unit: string): GlossaryEntry {
  const description =
    EQUATION_OVERRIDES[equationId]?.[symbol] ?? SYMBOL_DESCRIPTIONS[symbol] ?? `${name}, measured in ${unit || 'no unit'}.`;
  return {
    symbol,
    name,
    unit,
    unitName: UNIT_NAMES[unit] ?? unit,
    description,
  };
}
