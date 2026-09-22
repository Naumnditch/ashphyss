/**
 * Question figures, drawn as SVG — originals, not reproduced from any
 * textbook or exam paper. Momentum collisions (BEFORE/AFTER trolleys),
 * Coulomb's law charge layouts, circular motion and gravitation.
 * Referenced from problems.question_image_url as an internal key
 * (e.g. "diagram:momentum-stick-1") rather than an external file URL, so
 * they render live in React and in the worksheet PDF with no asset hosting.
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
        <marker id="vec-end" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={TEAL} />
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

interface PlacedCharge {
  name: string;
  value: string;
  sign: '+' | '−';
}

/** Three charges on the two legs of a right angle, the corner charge bottom-left. */
function RightAngleCharges({ corner, right, up, across, rise }: { corner: PlacedCharge; right: PlacedCharge; up: PlacedCharge; across: string; rise: string }) {
  return (
    <Figure width={460} height={230}>
      <line x1={130} y1={180} x2={130} y2={52} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={130} y1={180} x2={318} y2={180} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <path d="M130,156 L154,156 L154,180" fill="none" stroke={MUTE} strokeWidth={1.2} />
      <Label x={104} y={120} size={12} color={MUTE} bold>
        {rise}
      </Label>
      <Label x={226} y={204} size={12} color={MUTE} bold>
        {across}
      </Label>
      <Charge x={130} y={180} sign={corner.sign} />
      <Charge x={130} y={40} sign={up.sign} />
      <Charge x={330} y={180} sign={right.sign} />
      <Label x={70} y={180} bold>
        {corner.name}
      </Label>
      <Label x={70} y={196} size={10.5}>
        {corner.value}
      </Label>
      <Label x={210} y={36} bold>
        {up.name}
      </Label>
      <Label x={210} y={52} size={10.5}>
        {up.value}
      </Label>
      <Label x={404} y={176} bold>
        {right.name}
      </Label>
      <Label x={404} y={192} size={10.5}>
        {right.value}
      </Label>
    </Figure>
  );
}

// Figures for the practice sets built from the owner's circular motion,
// gravitation and Coulomb worksheets. Like the sources, they label the
// quantities (r, v, θ, M, m) rather than showing any answer.
const WORKSHEET_DIAGRAMS: Record<string, React.ReactNode> = {
  'circular-horizontal': (
    <Figure width={460} height={200}>
      <Label x={60} y={24} size={10.5} color={MUTE}>
        view from above
      </Label>
      <circle cx={230} cy={100} r={72} fill="none" stroke={MUTE} strokeWidth={1.3} strokeDasharray="5 4" />
      <circle cx={230} cy={100} r={3} fill={INK} />
      <line x1={230} y1={100} x2={302} y2={100} stroke={INK} strokeWidth={1.6} />
      <Label x={264} y={93} bold>
        r
      </Label>
      <circle cx={302} cy={100} r={10} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      <line x1={302} y1={88} x2={302} y2={40} stroke={TEAL} strokeWidth={2.2} markerEnd="url(#vec-end)" />
      <Label x={316} y={52} color={TEAL} bold>
        v
      </Label>
    </Figure>
  ),
  'circular-vertical-bottom': (
    <Figure width={460} height={220}>
      <circle cx={230} cy={100} r={78} fill="none" stroke={MUTE} strokeWidth={1.3} strokeDasharray="5 4" />
      <circle cx={230} cy={100} r={3} fill={INK} />
      <line x1={230} y1={100} x2={230} y2={178} stroke={INK} strokeWidth={1.6} />
      <Label x={218} y={145} bold>
        r
      </Label>
      <circle cx={230} cy={178} r={11} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      <line x1={243} y1={178} x2={300} y2={178} stroke={TEAL} strokeWidth={2.2} markerEnd="url(#vec-end)" />
      <Label x={296} y={170} color={TEAL} bold>
        v
      </Label>
      <Label x={70} y={24} size={10.5} color={MUTE}>
        vertical circle
      </Label>
    </Figure>
  ),
  'circular-vertical-top': (
    <Figure width={460} height={220}>
      <circle cx={230} cy={120} r={78} fill="none" stroke={MUTE} strokeWidth={1.3} strokeDasharray="5 4" />
      <circle cx={230} cy={120} r={3} fill={INK} />
      <line x1={230} y1={120} x2={230} y2={42} stroke={INK} strokeWidth={1.6} />
      <Label x={218} y={86} bold>
        r
      </Label>
      <circle cx={230} cy={42} r={11} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      <line x1={217} y1={42} x2={160} y2={42} stroke={TEAL} strokeWidth={2.2} markerEnd="url(#vec-end)" />
      <Label x={166} y={34} color={TEAL} bold>
        v
      </Label>
      <Label x={70} y={24} size={10.5} color={MUTE}>
        vertical circle
      </Label>
    </Figure>
  ),
  'circular-conical': (
    <Figure width={460} height={210}>
      <line x1={180} y1={20} x2={280} y2={20} stroke={INK} strokeWidth={3} />
      {[190, 210, 230, 250, 270].map((x) => (
        <line key={x} x1={x} y1={20} x2={x - 8} y2={10} stroke={INK} strokeWidth={1} />
      ))}
      <line x1={230} y1={20} x2={230} y2={185} stroke={MUTE} strokeWidth={1} strokeDasharray="4 4" />
      <ellipse cx={230} cy={150} rx={80} ry={18} fill="none" stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={230} y1={150} x2={310} y2={150} stroke={MUTE} strokeWidth={1.2} />
      <Label x={262} y={144} size={12} color={MUTE} bold>
        r
      </Label>
      <line x1={230} y1={20} x2={310} y2={150} stroke={INK} strokeWidth={1.6} />
      <Label x={284} y={80} bold>
        L
      </Label>
      <path d="M230,52 A32,32 0 0,0 246.8,47.3" fill="none" stroke={MUTE} strokeWidth={1.2} />
      <Label x={243} y={70} size={12} color={MUTE} bold>
        θ
      </Label>
      <circle cx={310} cy={150} r={10} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
    </Figure>
  ),
  'gravity-two-bodies': (
    <Figure width={460} height={150}>
      <Dimension x1={110} x2={360} y={30} label="r" />
      <line x1={110} y1={44} x2={110} y2={60} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <line x1={360} y1={44} x2={360} y2={78} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <circle cx={110} cy={96} r={34} fill="#e5e7eb" stroke={INK} strokeWidth={1.6} />
      <circle cx={360} cy={96} r={16} fill="#e5e7eb" stroke={INK} strokeWidth={1.6} />
      <Label x={110} y={102} size={15} bold>
        M
      </Label>
      <Label x={360} y={138} size={14} bold>
        m
      </Label>
    </Figure>
  ),
  'gravity-orbit': (
    <Figure width={460} height={230}>
      <circle cx={230} cy={115} r={92} fill="none" stroke={BRASS} strokeWidth={1.4} strokeDasharray="6 5" />
      <circle cx={230} cy={115} r={44} fill="#dbe7f0" stroke={INK} strokeWidth={1.6} />
      <Label x={222} y={146} size={12} bold>
        M
      </Label>
      <line x1={230} y1={115} x2={299} y2={56} stroke={INK} strokeWidth={1.4} />
      <Label x={276} y={98} bold>
        r
      </Label>
      <circle cx={300} cy={55} r={8} fill="#f3d9d4" stroke={INK} strokeWidth={1.5} />
      <Label x={356} y={40} size={10.5} color={MUTE}>
        orbiting body, m
      </Label>
      <Label x={230} y={222} size={10.5} color={MUTE}>
        circular orbit, radius r measured from the centre
      </Label>
    </Figure>
  ),
  'coulomb-two-charges': (
    <Figure width={460} height={130}>
      <Dimension x1={120} x2={340} y={30} label="r" />
      <line x1={120} y1={44} x2={120} y2={62} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <line x1={340} y1={44} x2={340} y2={62} stroke={MUTE} strokeWidth={1} strokeDasharray="2 3" />
      <circle cx={120} cy={82} r={18} fill="#f4f1ea" stroke={INK} strokeWidth={1.6} />
      <circle cx={340} cy={82} r={18} fill="#f4f1ea" stroke={INK} strokeWidth={1.6} />
      <Label x={120} y={87} bold>
        q₁
      </Label>
      <Label x={340} y={87} bold>
        q₂
      </Label>
    </Figure>
  ),
  'coulomb-l-shape-origin': (
    <RightAngleCharges
      corner={{ name: 'q₁', value: '+2.0 × 10⁻⁶ C', sign: '+' }}
      right={{ name: 'q₂', value: '−3.0 × 10⁻⁶ C', sign: '−' }}
      up={{ name: 'q₃', value: '+1.0 × 10⁻⁶ C', sign: '+' }}
      across="0.40 m"
      rise="0.30 m"
    />
  ),
  'coulomb-l-shape-millicoulomb': (
    <RightAngleCharges
      corner={{ name: 'qA', value: '+5.0 mC', sign: '+' }}
      right={{ name: 'qB', value: '−8.0 mC', sign: '−' }}
      up={{ name: 'qC', value: '+1.0 mC', sign: '+' }}
      across="3.0 m"
      rise="4.0 m"
    />
  ),
  'coulomb-l-shape-nanocoulomb': (
    <RightAngleCharges
      corner={{ name: 'qa', value: '−4.0 × 10⁻⁹ C', sign: '−' }}
      right={{ name: 'qb', value: '+5.0 × 10⁻⁹ C', sign: '+' }}
      up={{ name: 'qc', value: '+2.0 × 10⁻⁹ C', sign: '+' }}
      across="0.20 m"
      rise="0.10 m"
    />
  ),
  'coulomb-l-shape-unit': (
    <RightAngleCharges
      corner={{ name: 'qx', value: '+10 nC', sign: '+' }}
      right={{ name: 'qy', value: '+5.0 nC', sign: '+' }}
      up={{ name: 'qz', value: '−10 nC', sign: '−' }}
      across="1.0 m"
      rise="1.0 m"
    />
  ),
  'coulomb-equilateral': (
    <Figure width={460} height={240}>
      <line x1={130} y1={205} x2={330} y2={205} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={130} y1={205} x2={230} y2={32} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={330} y1={205} x2={230} y2={32} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <Label x={230} y={228} size={12} color={MUTE} bold>
        0.50 m
      </Label>
      <Label x={152} y={116} size={12} color={MUTE} bold>
        0.50 m
      </Label>
      <Label x={308} y={116} size={12} color={MUTE} bold>
        0.50 m
      </Label>
      <Charge x={130} y={205} sign="+" />
      <Charge x={330} y={205} sign="−" />
      <Charge x={230} y={32} sign="+" />
      <Label x={72} y={202} bold>
        qA
      </Label>
      <Label x={72} y={218} size={10.5}>
        +4.0 µC
      </Label>
      <Label x={390} y={202} bold>
        qB
      </Label>
      <Label x={390} y={218} size={10.5}>
        −6.0 µC
      </Label>
      <Label x={290} y={30} bold>
        qC
      </Label>
      <Label x={290} y={46} size={10.5}>
        +2.0 µC
      </Label>
    </Figure>
  ),
  'coulomb-triangle-scalene': (
    <Figure width={460} height={220}>
      {/* 300 px per metre: q1 (0,0) → (200,180), q2 (0.30,0) → (290,180), q3 (−0.25,0.433) → (125,50) */}
      <line x1={40} y1={180} x2={440} y2={180} stroke={MUTE} strokeWidth={1.1} markerEnd="url(#dim-end)" />
      <Label x={436} y={198} size={11} color={MUTE}>
        x
      </Label>
      <line x1={200} y1={180} x2={125} y2={50} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <line x1={290} y1={180} x2={125} y2={50} stroke={MUTE} strokeWidth={1.2} strokeDasharray="5 4" />
      <Label x={245} y={172} size={12} color={MUTE} bold>
        0.30 m
      </Label>
      <Label x={138} y={122} size={12} color={MUTE} bold>
        0.50 m
      </Label>
      <Label x={236} y={104} size={12} color={MUTE} bold>
        0.70 m
      </Label>
      <Charge x={200} y={180} sign="+" />
      <Charge x={290} y={180} sign="−" />
      <Charge x={125} y={50} sign="+" />
      <Label x={196} y={212} bold>
        q₁ +8.0 nC
      </Label>
      <Label x={318} y={212} bold>
        q₂ −5.0 nC
      </Label>
      <Label x={60} y={40} bold>
        q₃
      </Label>
      <Label x={60} y={56} size={10.5}>
        +6.0 nC
      </Label>
    </Figure>
  ),
};

const DIAGRAMS: Record<string, React.ReactNode> = {
  ...COULOMB_DIAGRAMS,
  ...WORKSHEET_DIAGRAMS,
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
