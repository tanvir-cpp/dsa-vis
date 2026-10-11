import './DPTable.css';

export interface DPTableProps {
  table: number[][];
  cell: [number, number] | null;
}

function cellClass(value: number, isCurrent: boolean): string {
  if (isCurrent) return 'dp-cell is-current';
  return value === 0 ? 'dp-cell is-empty' : 'dp-cell is-filled';
}

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return '∞';
  return String(v);
}

export default function DPTable({ table, cell }: DPTableProps) {
  const rows = table.length;
  const cols = rows > 0 ? table[0].length : 0;

  if (rows === 0 || cols === 0) {
    return (
      <div className="dp-wrap">
        <p className="dp-empty">Empty table.</p>
      </div>
    );
  }

  const ariaLabel =
    `DP table with ${rows} rows and ${cols} columns` +
    (cell !== null ? `, current cell row ${cell[0]} column ${cell[1]}` : ', no current cell');

  return (
    <div className="dp-wrap">
      <table className="dp-table" role="img" aria-label={ariaLabel}>
        <tbody>
          {table.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => (
                <td
                  key={c}
                  className={cellClass(v, cell !== null && cell[0] === r && cell[1] === c)}
                  title={`row ${r}, col ${c}: ${formatValue(v)}`}
                >
                  {formatValue(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
