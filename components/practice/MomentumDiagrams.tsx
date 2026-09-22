/**
 * Original momentum collision diagrams, drawn as SVG — not reproduced from
 * any textbook or exam paper. Each shows a BEFORE and AFTER panel with
 * trolleys, mass labels, and velocity arrows; the unknown is marked in red.
 * Referenced from problems.question_image_url as an internal key
 * (e.g. "diagram:momentum-stick-1") rather than an external file URL, so
 * these render live in React with zero separate asset hosting.
 */

const INK = '#1b2a41';
const MUTE = '#4a5a72';
const BRASS = '#b8823d';
const TEAL = '#2e7d6b';
const RED = '#b34a3c';

interface TrolleyProps {
  x: number;
  y: number;
  width: number;
  mass: string;
  arrow: { label: string; dir: 1 | -1 | 0; color: string; unknown?: boolean } | null;
  fill?: string;
}

function Trolley({ x, y, width, mass, arrow, fill = '#ffffff' }: TrolleyProps) {
  const h = 34;
  const cx = x + width / 2;
  return (
    <g>
      {/* body */}
      <rect x={x} y={y} width={width} height={h} rx={5} fill={fill} stroke={INK} strokeWidth={1.8} />
      {/* wheels */}
      <circle cx={x + width * 0.24} cy={y + h + 7} r={6} fill={INK} />
      <circle cx={x + width * 0.76} cy={y + h + 7} r={6} fill={INK} />
      <text x={cx} y={y + h / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK} fontFamily="Georgia, serif">
        {mass}
      </text>
      {/* velocity arrow above */}
      {arrow && arrow.dir !== 0 && (
        <g>
          <line
            x1={arrow.dir === 1 ? cx - 22 : cx + 22}
            y1={y - 16}
            x2={arrow.dir === 1 ? cx + 22 : cx - 22}
            y2={y - 16}
            stroke={arrow.unknown ? RED : arrow.color}
            strokeWidth={2.2}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={cx}
            y={y - 24}
            textAnchor="middle"
            fontSize={12.5}
            fontWeight={700}
            fill={arrow.unknown ? RED : arrow.color}
            fontFamily="Georgia, serif"
            fontStyle="italic"
          >
            {arrow.label}
          </text>
        </g>
      )}
      {arrow && arrow.dir === 0 && (
        <text
          x={cx}
          y={y - 20}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill={MUTE}
          fontFamily="Georgia, serif"
        >
          at rest
        </text>
      )}
    </g>
  );
}

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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto" style={{ background: '#faf7f0', borderRadius: 8, border: '1px solid #e4ddcc' }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={BRASS} />
        </marker>
      </defs>
      {/* ground lines for both panels */}
      <line x1={20} y1={height - 34} x2={width / 2 - 12} y2={height - 34} stroke={MUTE} strokeWidth={1.5} />
      <line x1={width / 2 + 12} y1={height - 34} x2={width - 20} y2={height - 34} stroke={MUTE} strokeWidth={1.5} />
      {/* divider */}
      <line x1={width / 2} y1={16} x2={width / 2} y2={height - 16} stroke="#d8cfb6" strokeWidth={1.2} strokeDasharray="4 4" />
      <text x={width / 4} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill={MUTE} fontFamily="ui-monospace, monospace" letterSpacing={1}>
        BEFORE
      </text>
      <text x={(3 * width) / 4} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill={MUTE} fontFamily="ui-monospace, monospace" letterSpacing={1}>
        AFTER
      </text>
      {children}
      {note && (
        <text x={width / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={MUTE} fontFamily="ui-monospace, monospace">
          {note}
        </text>
      )}
    </svg>
  );
}

const SERIF = 'Georgia, serif';

function Figure({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md mx-auto" style={{ background: '#faf7f0', borderRadius: 8, border: '1px solid #e4ddcc' }}>
      <defs>
        <marker id="dim-end" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={MUTE} />
        </marker>
        <marker id="dim-start" markerWidth="8" markerHeight="8" refX="0" refY="3" orient="auto">
          <path d="M6,0 L0,3 L6,6 Z" fill={MUTE} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

function Charge({ x, y, sign, r = 16 }: { x: number; y: number; sign: '+' | '−'; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={sign === '+' ? '#f3d9d4' : '#d6e6f2'} stroke={INK} strokeWidth={1.6} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={INK} fontFamily={SERIF}>
        {sign}
      </text>
    </g>
  );
}

function Label({ x, y, children, size = 12, color = INK, bold = false }: { x: number; y: number; children: string; size?: number; color?: string; bold?: boolean }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={bold ? 700 : 400} fill={color} fontFamily={SERIF}>
      {children}
    </text>
  );
}

/** A two-headed measurement arrow with its value written above the middle. */
function Dimension({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x1 + 2} y1={y} x2={x2 - 2} y2={y} stroke={MUTE} strokeWidth={1.2} markerStart="url(#dim-start)" markerEnd="url(#dim-end)" />
      <line x1={x1} y1={y - 6} x2={x1} y2={y + 6} stroke={MUTE} strokeWidth={1} />
      <line x1={x2} y1={y - 6} x2={x2} y2={y + 6} stroke={MUTE} strokeWidth={1} />
      <Label x={(x1 + x2) / 2} y={y - 7} size={12} color={MUTE} bold>
        {label}
      </Label>
    </g>
  );
}

// Figures for "17.4 Coulomb's law". They show only what the question text
// states — no force arrows — so a figure never gives the answer away.
const COULOMB_DIAGRAMS: Record<string, React.ReactNode> = {
  'coulomb-two-spheres-unequal': (
    <Figure width={460} height={150}>
      <line x1={40} y1={104} x2={420} y2={104} stroke={MUTE} strokeWidth={1.5} />
      <Label x={230} y={126} size={10.5} color={MUTE}>
        frictionless horizontal surface
      </Label>
      <circle cx={140} cy={86} r={18} fill="#f3d9d4" stroke={INK} strokeWidth={1.6} />
      <circle cx={320} cy={86} r={18} fill="#f3d9d4" stroke={INK} strokeWidth={1.6} />
      <Label x={140} y={92} size={15} bold>
        +
      </Label>
      <Label x={320} y={92} size={15} bold>
        +
      </Label>
      <Label x={140} y={40} bold>
        q₁
      </Label>
      <Label x={140} y={56} size={11.5}>
        +3.0 × 10⁻⁶ C
      </Label>
      <Label x={320} y={40} bold>
        q₂
      </Label>
      <Label x={320} y={56} size={11.5}>
        +6.0 × 10⁻⁶ C
      </Label>
    </Figure>
  ),
  'coulomb-two-positive-equal': (
    <Figure width={460} height={140}>
      <Dimension x1={120} x2={340} y={34} label="0.50 m" />
      <line x1={120} y1={48} x2={120} y2={62} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <line x1={340} y1={48} x2={340} y2={62} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <Charge x={120} y={80} sign="+" />
      <Charge x={340} y={80} sign="+" />
      <Label x={120} y={122} size={11.5}>
        6.0 × 10⁻⁶ C
      </Label>
      <Label x={340} y={122} size={11.5}>
        6.0 × 10⁻⁶ C
      </Label>
    </Figure>
  ),
  'coulomb-pith-balls': (
    <Figure width={460} height={200}>
      {/* support */}
      <line x1={160} y1={22} x2={300} y2={22} stroke={INK} strokeWidth={3} />
      {[170, 190, 210, 230, 250, 270, 290].map((x) => (
        <line key={x} x1={x} y1={22} x2={x - 8} y2={12} stroke={INK} strokeWidth={1} />
      ))}
      {/* vertical reference and the 30° angle */}
      <line x1={230} y1={22} x2={230} y2={140} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <path d="M230,62 A40,40 0 0,1 210,56.6" fill="none" stroke={MUTE} strokeWidth={1.2} />
      <Label x={214} y={82} size={12} color={MUTE} bold>
        30°
      </Label>
      {/* thread and suspended ball: 120 long at 30° → (−60, +104) */}
      <line x1={230} y1={22} x2={170} y2={126} stroke={INK} strokeWidth={1.4} />
      <circle cx={170} cy={126} r={9} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      {/* second ball on an insulating rod */}
      <circle cx={260} cy={126} r={9} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      <line x1={269} y1={126} x2={400} y2={126} stroke={BRASS} strokeWidth={4} strokeLinecap="round" />
      <Label x={352} y={116} size={10.5} color={MUTE}>
        insulating rod
      </Label>
      <Dimension x1={170} x2={260} y={160} label="3.0 cm" />
      <Label x={120} y={130} size={11.5}>
        1.0 g
      </Label>
    </Figure>
  ),
  'coulomb-three-inline': (
    <Figure width={480} height={150}>
      <line x1={24} y1={80} x2={456} y2={80} stroke={MUTE} strokeWidth={1.2} markerEnd="url(#dim-end)" />
      <Label x={452} y={100} size={11} color={MUTE}>
        x
      </Label>
      <Dimension x1={80} x2={280} y={34} label="0.20 m" />
      <Dimension x1={280} x2={430} y={34} label="0.15 m" />
      <Charge x={80} y={80} sign="−" />
      <Charge x={280} y={80} sign="+" />
      <Charge x={430} y={80} sign="−" />
      <Label x={80} y={118} bold>
        q₂
      </Label>
      <Label x={80} y={134} size={11}>
        −4.0 × 10⁻⁶ C
      </Label>
      <Label x={280} y={118} bold>
        q₁
      </Label>
      <Label x={280} y={134} size={11}>
        +6.0 × 10⁻⁶ C
      </Label>
      <Label x={430} y={118} bold>
        q₃
      </Label>
      <Label x={430} y={134} size={11}>
        −7.0 × 10⁻⁶ C
      </Label>
    </Figure>
  ),
  'coulomb-right-angle': (
    <Figure width={460} height={230}>
      <line x1={120} y1={180} x2={120} y2={50} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={120} y1={180} x2={300} y2={180} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <path d="M120,156 L144,156 L144,180" fill="none" stroke={MUTE} strokeWidth={1.2} />
      <Label x={96} y={119} size={12} color={MUTE} bold>
        3.0 m
      </Label>
      <Label x={210} y={206} size={12} color={MUTE} bold>
        3.0 m
      </Label>
      <Charge x={120} y={180} sign="+" />
      <Charge x={120} y={40} sign="−" />
      <Charge x={300} y={180} sign="+" />
      <Label x={62} y={186} bold>
        q₁
      </Label>
      <Label x={66} y={204} size={10.5}>
        +4.5 × 10⁻⁵ C
      </Label>
      <Label x={196} y={36} bold>
        q₂
      </Label>
      <Label x={196} y={52} size={10.5}>
        −1.2 × 10⁻⁵ C
      </Label>
      <Label x={380} y={176} bold>
        q₃
      </Label>
      <Label x={380} y={192} size={10.5}>
        +1.8 × 10⁻⁵ C
      </Label>
    </Figure>
  ),
};

const DIAGRAMS: Record<string, React.ReactNode> = {
  ...COULOMB_DIAGRAMS,
  'momentum-stick-1': (
    <Frame>
      <Trolley x={40} y={70} width={70} mass="2 kg" arrow={{ label: '6 m/s', dir: 1, color: TEAL }} />
      <Trolley x={140} y={70} width={70} mass="2 kg" arrow={{ label: '', dir: 0, color: TEAL }} />
      <Trolley x={270} y={70} width={150} mass="2 kg + 2 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
    </Frame>
  ),
  'momentum-stick-2': (
    <Frame>
      <Trolley x={40} y={70} width={70} mass="3 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
      <Trolley x={140} y={70} width={70} mass="1 kg" arrow={{ label: '', dir: 0, color: TEAL }} />
      <Trolley x={270} y={70} width={150} mass="3 kg + 1 kg" arrow={{ label: '4.5 m/s', dir: 1, color: TEAL }} />
    </Frame>
  ),
  'momentum-explosion-1': (
    <Frame>
      <Trolley x={140} y={70} width={90} mass="6 kg" arrow={{ label: '', dir: 0, color: TEAL }} />
      <Trolley x={260} y={70} width={60} mass="2 kg" arrow={{ label: '9 m/s', dir: -1, color: TEAL }} />
      <Trolley x={360} y={70} width={70} mass="4 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
    </Frame>
  ),
  'momentum-separate-1': (
    <Frame>
      <Trolley x={40} y={70} width={80} mass="4 kg" arrow={{ label: '8 m/s', dir: 1, color: TEAL }} />
      <Trolley x={150} y={70} width={60} mass="2 kg" arrow={{ label: '', dir: 0, color: TEAL }} />
      <Trolley x={250} y={70} width={80} mass="4 kg" arrow={{ label: '2 m/s', dir: 1, color: TEAL }} />
      <Trolley x={360} y={70} width={60} mass="2 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
    </Frame>
  ),
  'momentum-headon-1': (
    <Frame note="taking rightward as positive">
      <Trolley x={30} y={64} width={70} mass="5 kg" arrow={{ label: '4 m/s', dir: 1, color: TEAL }} />
      <Trolley x={140} y={64} width={60} mass="3 kg" arrow={{ label: '6 m/s', dir: -1, color: TEAL }} />
      <Trolley x={270} y={64} width={160} mass="5 kg + 3 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
    </Frame>
  ),
  'momentum-recoil-1': (
    <Frame width={460} height={170}>
      <Trolley x={70} y={64} width={110} mass="gun, 4 kg" arrow={{ label: '', dir: 0, color: TEAL }} />
      <Trolley x={260} y={70} width={40} mass="" arrow={{ label: '300 m/s', dir: 1, color: TEAL }} fill="#f6efdc" />
      <Trolley x={330} y={64} width={110} mass="gun, 4 kg" arrow={{ label: '?', dir: -1, color: BRASS, unknown: true }} />
    </Frame>
  ),
  'momentum-wall-1': (
    <Frame note="taking rightward as positive">
      <Trolley x={40} y={64} width={60} mass="0.5 kg" arrow={{ label: '8 m/s', dir: 1, color: TEAL }} />
      <line x1={175} y1={20} x2={175} y2={150} stroke={INK} strokeWidth={5} />
      <Trolley x={280} y={64} width={60} mass="0.5 kg" arrow={{ label: '6 m/s', dir: -1, color: TEAL }} />
      <line x1={175} y1={20} x2={175} y2={150} stroke={INK} strokeWidth={5} />
    </Frame>
  ),
  'momentum-oblique-1': (
    <Frame note="taking rightward as positive">
      <Trolley x={30} y={64} width={60} mass="2 kg" arrow={{ label: '5 m/s', dir: 1, color: TEAL }} />
      <Trolley x={140} y={64} width={80} mass="4 kg" arrow={{ label: '2 m/s', dir: -1, color: TEAL }} />
      <Trolley x={260} y={64} width={60} mass="2 kg" arrow={{ label: '1 m/s', dir: -1, color: TEAL }} />
      <Trolley x={370} y={64} width={80} mass="4 kg" arrow={{ label: '?', dir: 1, color: BRASS, unknown: true }} />
    </Frame>
  ),
};

export function getDiagram(diagramKey: string): React.ReactNode | null {
  return DIAGRAMS[diagramKey.replace(/^diagram:/, '')] ?? null;
}

export function hasDiagram(diagramKey: string): boolean {
  return getDiagram(diagramKey) !== null;
}

export function MomentumDiagram({ diagramKey }: { diagramKey: string }) {
  const svg = getDiagram(diagramKey);
  if (!svg) return null;
  return <div className="mb-5">{svg}</div>;
}
