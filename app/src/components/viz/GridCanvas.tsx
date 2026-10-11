import { useEffect, useRef } from 'react';
import './GridCanvas.css';

export interface GridCanvasProps {
  rows: number;
  cols: number;
  walls: Set<string> | boolean[][];
  path: [number, number][];
  visited: [number, number][];
  start: [number, number];
  goal: [number, number];
}

const CELL = 24;

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function isWall(walls: Set<string> | boolean[][], r: number, c: number): boolean {
  if (walls instanceof Set) return walls.has(`${r},${c}`);
  const row = walls[r];
  return row !== undefined && row[c] === true;
}

export default function GridCanvas({ rows, cols, walls, path, visited, start, goal }: GridCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  const ariaLabel = `Grid ${r} by ${c}, visited ${visited.length}, path length ${path.length}`;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = c * CELL * dpr;
    canvas.height = r * CELL * dpr;
    canvas.style.width = `${c * CELL}px`;
    canvas.style.height = `${r * CELL}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const surface = cssVar('--surface', '#ffffff');
    const surface2 = cssVar('--surface-2', '#f6f7f9');
    const border = cssVar('--border', '#e2e5ea');
    const accent = cssVar('--accent', '#2563eb');
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, c * CELL, r * CELL);
    const pathSet = new Set(path.map(([pr, pc]) => `${pr},${pc}`));
    const visSet = new Set(visited.map(([vr, vc]) => `${vr},${vc}`));
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        const x = col * CELL;
        const y = row * CELL;
        const key = `${row},${col}`;
        const isS = start[0] === row && start[1] === col;
        const isG = goal[0] === row && goal[1] === col;
        if (isWall(walls, row, col)) ctx.fillStyle = surface2;
        else if (isS) ctx.fillStyle = '#16a34a';
        else if (isG) ctx.fillStyle = '#dc2626';
        else if (pathSet.has(key)) ctx.fillStyle = accent;
        else if (visSet.has(key)) ctx.fillStyle = accent;
        else ctx.fillStyle = surface;
        if (!isS && !isG && !isWall(walls, row, col) && visSet.has(key) && !pathSet.has(key)) {
          ctx.globalAlpha = 0.25;
          ctx.fillRect(x, y, CELL, CELL);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillRect(x, y, CELL, CELL);
        }
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }, [r, c, walls, path, visited, start, goal]);

  return (
    <div className="gridcanvas-wrap">
      <canvas ref={ref} role="img" aria-label={ariaLabel} className="gridcanvas" />
      <div className="gridcanvas-legend" aria-label="Legend">
        <span className="gc-item"><i className="gc-sw gc-wall" />wall</span>
        <span className="gc-item"><i className="gc-sw gc-visited" />visited</span>
        <span className="gc-item"><i className="gc-sw gc-path" />path</span>
        <span className="gc-item"><i className="gc-sw gc-start" />start</span>
        <span className="gc-item"><i className="gc-sw gc-goal" />goal</span>
      </div>
    </div>
  );
}
