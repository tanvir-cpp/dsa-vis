import './ChainSvg.css';

export interface ChainSvgProps {
  values: number[];
  highlight: number | null;
  headMark: boolean;
  tailMark: boolean;
  labelHead?: string;
  labelTail?: string;
}

const BOX_W = 44;
const BOX_H = 36;
const PITCH = 64;
const PAD_X = 10;
const BOX_Y = 34;
const VIEW_H = 100;

export default function ChainSvg({
  values,
  highlight,
  headMark,
  tailMark,
  labelHead = 'HEAD',
  labelTail = 'TAIL',
}: ChainSvgProps) {
  const n = values.length;

  if (n === 0) {
    return (
      <div className="chainsvg-wrap">
        <p className="chainsvg-empty">Empty.</p>
      </div>
    );
  }

  const w = n * PITCH + 20;
  const midY = BOX_Y + BOX_H / 2;
  const hlText =
    highlight == null ? 'no highlight' : `highlighted node ${highlight}`;
  const ariaLabel =
    `Chain of ${n} nodes, values [${values.join(', ')}], ${hlText}`;
  const sameSpot = headMark && tailMark && n === 1;
  const headX = PAD_X + BOX_W / 2;
  const tailX = PAD_X + (n - 1) * PITCH + BOX_W / 2;

  return (
    <div className="chainsvg-wrap">
      <svg
        className="chainsvg"
        width={w}
        height={VIEW_H}
        viewBox={`0 0 ${w} ${VIEW_H}`}
        role="img"
        aria-label={ariaLabel}
      >
        {values.slice(0, n - 1).map((_, i) => {
          const x1 = PAD_X + i * PITCH + BOX_W + 2;
          const x2 = PAD_X + (i + 1) * PITCH - 2;
          return (
            <g key={`a${i}`}>
              <line x1={x1} y1={midY} x2={x2 - 7} y2={midY} className="carrow" />
              <polygon
                points={`${x2 - 7},${midY - 4} ${x2},${midY} ${x2 - 7},${midY + 4}`}
                className="carrow-head"
              />
            </g>
          );
        })}
        {values.map((v, i) => {
          const x = PAD_X + i * PITCH;
          const hl = highlight === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={BOX_Y}
                width={BOX_W}
                height={BOX_H}
                rx={4}
                className={hl ? 'cnode cnode-hl' : 'cnode cnode-default'}
              >
                <title>{`node ${i} val=${v}`}</title>
              </rect>
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + 23}
                textAnchor="middle"
                className={hl ? 'cval cval-hl' : 'cval'}
              >
                {v}
              </text>
              <text
                x={x + BOX_W / 2}
                y={BOX_Y + BOX_H + 15}
                textAnchor="middle"
                className="cindex"
              >
                {i}
              </text>
            </g>
          );
        })}
        {sameSpot ? (
          <text x={headX} y={14} textAnchor="middle" className="cmark">
            {`${labelHead}/${labelTail}↑`}
          </text>
        ) : (
          <>
            {headMark && (
              <text x={headX} y={14} textAnchor="middle" className="cmark">
                {`${labelHead}↑`}
              </text>
            )}
            {tailMark && (
              <text x={tailX} y={14} textAnchor="middle" className="cmark">
                {`${labelTail}↑`}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
