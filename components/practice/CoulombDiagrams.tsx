'use client';

/**
 * Original Coulomb's law diagrams, drawn as SVG — not reproduced from any
 * textbook or worksheet. Same approach as MomentumDiagrams.tsx: referenced
 * from problems.question_image_url as an internal key (e.g.
 * "diagram:coulomb-three-inline") rather than an external file URL, so they
 * render live in React with no separate asset hosting.
 *
 * Convention: positive charges are warm (brass), negative cool (teal), and
 * separations are dimensioned with thin double-arrowed rules. The diagrams
 * deliberately show only the SETUP — charges, signs and distances — never
 * the force arrows, because these questions ask the student to work the
 * forces out.
 */

const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const TEAL = '#2e7d6b';

const SERIF = 'Georgia, serif';
const MONO = 'ui-monospace, monospace';

function Frame({
  width = 460,
  height = 190,
  children,
  note,
}: {
  width?: number;
  height?: number;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-md mx-auto"
      style={{ background: '#faf7f0', borderRadius: 8, border: '1px solid #e4ddcc' }}
    >
      <defs>
        <marker id="cl-dim-end" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={MUTE} />
        </marker>
        <marker id="cl-dim-start" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={MUTE} />
        </marker>
      </defs>
      {children}
      {note && (
        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize={10} fill={MUTE} fontFamily={MONO}>
          {note}
        </text>
      )}
    </svg>
  );
}

/**
 * A charged sphere. `name` (q₁, q₂ …) sits above it and `label` (the charge
 * value) below, unless `stackAbove` puts both above — used when the sphere
 * rests on a surface or sits at the top of the frame.
 */
function Charge({
  cx,
  cy,
  r = 17,
  sign,
  name,
  label,
  stackAbove = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  sign: '+' | '-';
  name?: string;
  label?: string;
  stackAbove?: boolean;
}) {
  const color = sign === '+' ? BRASS : TEAL;
  const nameY = stackAbove ? cy - r - 26 : cy - r - 9;
  const labelY = stackAbove ? cy - r - 9 : cy + r + 17;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke={color} strokeWidth={2.2} />
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize={21} fontWeight={700} fill={color} fontFamily={SERIF}>
        {sign === '+' ? '+' : '−'}
      </text>
      {name && (
        <text
          x={cx}
          y={nameY}
          textAnchor="middle"
          fontSize={12.5}
          fontWeight={700}
          fill={INK}
          fontFamily={SERIF}
          fontStyle="italic"
        >
          {name}
        </text>
      )}
      {label && (
        <text x={cx} y={labelY} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily={SERIF}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Horizontal dimension rule, arrowheads both ends, label centred above it. */
function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={MUTE}
        strokeWidth={1.2}
        markerStart="url(#cl-dim-start)"
        markerEnd="url(#cl-dim-end)"
      />
      <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fontSize={11} fill={MUTE} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

/** Vertical dimension rule, label to its left. */
function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  return (
    <g>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={MUTE}
        strokeWidth={1.2}
        markerStart="url(#cl-dim-start)"
        markerEnd="url(#cl-dim-end)"
      />
      <text x={x - 7} y={(y1 + y2) / 2 + 4} textAnchor="end" fontSize={11} fill={MUTE} fontFamily={MONO}>
        {label}
      </text>
    </g>
  );
}

/** Hatched boundary — a table top or a ceiling. */
function Hatching({
  x1,
  x2,
  y,
  below = true,
}: {
  x1: number;
  x2: number;
  y: number;
  below?: boolean;
}) {
  const ticks = [];
  for (let x = x1 + 10; x < x2; x += 14) {
    ticks.push(
      <line
        key={x}
        x1={x}
        y1={y}
        x2={x - 8}
        y2={below ? y + 8 : y - 8}
        stroke={MUTE}
        strokeWidth={1}
      />
    );
  }
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={2} />
      {ticks}
    </g>
  );
}

const DIAGRAMS: Record<string, React.ReactNode> = {
  /** Q33 — two unequal positive spheres at rest on a frictionless surface. */
  'coulomb-two-spheres-unequal': (
    <Frame width={460} height={208} note="frictionless horizontal surface">
      <Hatching x1={30} x2={430} y={140} />
      <Charge cx={130} cy={118} r={19} sign="+" name="q₁" label="3.0 × 10⁻⁶ C" stackAbove />
      <Charge cx={330} cy={118} r={19} sign="+" name="q₂" label="6.0 × 10⁻⁶ C" stackAbove />
      <DimH x1={130} x2={330} y={178} label="r" />
    </Frame>
  ),

  /** Q34 — two equal positive charges 0.50 m apart. */
  'coulomb-two-positive-equal': (
    <Frame width={460} height={175}>
      <Charge cx={140} cy={72} r={19} sign="+" name="q₁" label="6.0 × 10⁻⁶ C" />
      <Charge cx={320} cy={72} r={19} sign="+" name="q₂" label="6.0 × 10⁻⁶ C" />
      <DimH x1={140} x2={320} y={146} label="0.50 m" />
    </Frame>
  ),

  /** Q38 — a suspended pith ball deflected by a second, equally charged ball. */
  'coulomb-pith-balls': (
    <Frame width={460} height={235} note="both balls carry the same charge q">
      <Hatching x1={150} x2={350} y={26} below={false} />
      {/* vertical reference, then the thread at 30° to it */}
      <line x1={250} y1={26} x2={250} y2={185} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={250} y1={26} x2={320} y2={147} stroke={INK} strokeWidth={1.6} />
      <path d="M 250 86 A 60 60 0 0 1 280 78" fill="none" stroke={MUTE} strokeWidth={1.2} />
      <text x={274} y={102} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={MUTE} fontFamily={MONO}>
        30°
      </text>
      <Charge cx={320} cy={147} r={14} sign="+" name="q" label="1.0 g" />
      <Charge cx={410} cy={147} r={14} sign="+" name="q" label="1.0 g" />
      <DimH x1={320} x2={410} y={205} label="r = 3.0 cm" />
    </Frame>
  ),

  /** Q39 — three charges in a line along the x-axis. */
  'coulomb-three-inline': (
    <Frame width={460} height={180} note="not to scale">
      <line x1={25} y1={84} x2={432} y2={84} stroke={MUTE} strokeWidth={1} strokeDasharray="5 5" />
      <text x={438} y={88} fontSize={12} fill={MUTE} fontFamily={SERIF} fontStyle="italic">
        x
      </text>
      <Charge cx={80} cy={84} sign="-" name="q₂" label="4.0 × 10⁻⁶ C" />
      <Charge cx={260} cy={84} sign="+" name="q₁" label="6.0 × 10⁻⁶ C" />
      <Charge cx={395} cy={84} sign="-" name="q₃" label="7.0 × 10⁻⁶ C" />
      <DimH x1={80} x2={260} y={34} label="0.20 m" />
      <DimH x1={260} x2={395} y={34} label="0.15 m" />
    </Frame>
  ),

  /** Q40 — three charges at the corners of a right angle. */
  'coulomb-right-angle': (
    <Frame width={460} height={288} note="q₂ is directly above q₁; q₃ directly to its right">
      <line x1={150} y1={198} x2={150} y2={46} stroke={MUTE} strokeWidth={1} strokeDasharray="5 5" />
      <line x1={150} y1={198} x2={368} y2={198} stroke={MUTE} strokeWidth={1} strokeDasharray="5 5" />
      <Charge cx={150} cy={66} sign="-" name="q₂" label="1.2 × 10⁻⁵ C" stackAbove />
      <Charge cx={150} cy={198} sign="+" name="q₁" label="4.5 × 10⁻⁵ C" />
      <Charge cx={340} cy={198} sign="+" name="q₃" label="1.8 × 10⁻⁵ C" />
      <DimV x={112} y1={85} y2={179} label="3.0 m" />
      <DimH x1={150} x2={340} y={256} label="3.0 m" />
    </Frame>
  ),
};

export function CoulombDiagram({ diagramKey }: { diagramKey: string }) {
  const key = diagramKey.replace(/^diagram:/, '');
  const svg = DIAGRAMS[key];
  if (!svg) return null;
  return <div className="mb-5">{svg}</div>;
}

export const COULOMB_DIAGRAM_KEYS = Object.keys(DIAGRAMS);
