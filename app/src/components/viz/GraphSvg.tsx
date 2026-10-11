import type { GraphStep } from '../../content/graphs';
import './GraphSvg.css';

export interface GraphSvgProps {
  n: number;
  edges: [number, number][];
  positions: [number, number][];
  step: GraphStep;
  directed?: boolean;
}

const R = 16;

function posAt(i: number, n: number, positions: [number, number][]): [number, number] {
  const p = positions[i];
  if (p) return p;
  const cx = 200;
  const cy = 150;
  const r = 110;
  const a = n > 0 ? (2 * Math.PI * i) / n - Math.PI / 2 : 0;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function nodeClass(i: number, step: GraphStep): string {
  if (step.current === i) return 'gnode gnode-current';
  if (step.frontier.includes(i)) return 'gnode gnode-frontier';
  if (step.visited_order.includes(i)) return 'gnode gnode-visited';
  return 'gnode gnode-default';
}

export default function GraphSvg({ n, edges, positions, step, directed }: GraphSvgProps) {
  const size = Math.max(0, Math.floor(n));
  const cur = step.current;
  const ariaLabel =
    `Graph with ${size} nodes` +
    (cur === null || cur === undefined ? ', no current node' : `, current node ${cur}`) +
    `, visited ${step.visited_order.length}, frontier ${step.frontier.length}`;
  const showArrow = directed === true;

  return (
    <div className="graphsvg-wrap">
      <svg className="graphsvg" viewBox="0 0 400 300" role="img" aria-label={ariaLabel}>
        {showArrow && (
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="graph-arrow-head" />
            </marker>
          </defs>
        )}
        {edges.map((e, k) => {
          const a = posAt(e[0], size, positions);
          const b = posAt(e[1], size, positions);
          if (e[0] < 0 || e[0] >= size || e[1] < 0 || e[1] >= size) return null;
          let x2 = b[0];
          let y2 = b[1];
          if (showArrow) {
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const len = Math.hypot(dx, dy) || 1;
            const off = R + 2;
            x2 = b[0] - (dx / len) * off;
            y2 = b[1] - (dy / len) * off;
          }
          return (
            <line
              key={k}
              x1={a[0]}
              y1={a[1]}
              x2={x2}
              y2={y2}
              className="gedge"
              markerEnd={showArrow ? 'url(#graph-arrow)' : undefined}
            />
          );
        })}
        {Array.from({ length: size }, (_, i) => {
          const p = posAt(i, size, positions);
          const d = step.dist[i];
          const isCurrent = cur === i;
          return (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={R} className={nodeClass(i, step)}>
                <title>{`node ${i}${d !== null && d !== undefined ? ` dist=${d}` : ''}`}</title>
              </circle>
              <text
                x={p[0]}
                y={p[1] + 4}
                textAnchor="middle"
                className={isCurrent ? 'glabel glabel-current' : 'glabel'}
              >
                {i}
              </text>
              {d !== null && d !== undefined && (
                <text x={p[0]} y={p[1] + R + 12} textAnchor="middle" className="gdist">
                  {`d=${d}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="graph-legend">
        <span>
          <i className="dot dot-current" />
          Current
        </span>
        <span>
          <i className="dot dot-frontier" />
          Frontier
        </span>
        <span>
          <i className="dot dot-visited" />
          Visited
        </span>
        <span>
          <i className="dot dot-default" />
          Unvisited
        </span>
      </div>
    </div>
  );
}
