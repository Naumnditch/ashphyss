'use client';

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

const DIAGRAMS: Record<string, React.ReactNode> = {
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

/**
 * Whether a question's `diagram:` key actually resolves to a figure. Callers
 * that must not fail silently — the printable worksheet, for one — use this
 * to say so rather than render nothing where a figure was promised.
 */
export function hasDiagram(diagramKey: string): boolean {
  return Boolean(DIAGRAMS[diagramKey.replace(/^diagram:/, '')]);
}

export function MomentumDiagram({ diagramKey }: { diagramKey: string }) {
  const key = diagramKey.replace(/^diagram:/, '');
  const svg = DIAGRAMS[key];
  if (!svg) return null;
  return <div className="mb-5">{svg}</div>;
}
