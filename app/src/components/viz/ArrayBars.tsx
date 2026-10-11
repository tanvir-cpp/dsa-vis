import './ArrayBars.css';

export interface ArrayBarsProps {
  values: number[];
  compare: [number, number] | null;
  swap: [number, number] | null;
  sorted_from: number | null;
}

function barClass(i: number, compare: [number, number] | null, swap: [number, number] | null, sortedFrom: number | null): string {
  if (swap && (i === swap[0] || i === swap[1])) return 'bar bar-swap';
  if (compare && (i === compare[0] || i === compare[1])) return 'bar bar-compare';
  if (sortedFrom !== null && sortedFrom !== undefined && i >= sortedFrom) return 'bar bar-sorted';
  return 'bar bar-default';
}

export default function ArrayBars({ values, compare, swap, sorted_from }: ArrayBarsProps) {
  const n = values.length;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const W = 1000;
  const H = 280;
  const PAD = 8;
  const showLabels = n > 0 && n <= 30;
  const labelH = showLabels ? 30 : 0;
  const chartH = H - labelH - PAD;
  const barW = n > 0 ? W / n : W;

  const compareTxt = compare ? `, comparing ${compare[0]} and ${compare[1]}` : '';
  const swapTxt = swap ? `, swapped ${swap[0]} and ${swap[1]}` : '';
  const ariaLabel = `Array of ${n} values${compareTxt}${swapTxt}`;

  if (n === 0) {
    return (
      <div className="arraybars-wrap">
        <svg className="arraybars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Empty array" />
        <p className="arraybars-empty">Empty array.</p>
      </div>
    );
  }

  return (
    <div className="arraybars-wrap">
      <svg className="arraybars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {values.map((v, i) => {
          const h = max > 0 ? Math.max(2, (v / max) * chartH) : 2;
          const x = i * barW;
          const y = chartH - h + PAD / 2;
          const w = Math.max(barW - 2, 1);
          return (
            <g key={i}>
              <rect x={x + 1} y={y} width={w} height={h} rx={2} className={barClass(i, compare, swap, sorted_from)}>
                <title>{`index ${i}: ${v}`}</title>
              </rect>
              {showLabels && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="bar-label">
                  {i}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
