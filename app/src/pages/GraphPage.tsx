import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GraphSvg from '../components/viz/GraphSvg';
import {
  DEMO_GRAPHS,
  GRAPH_ALGOS,
  bfsSteps,
  dfsSteps,
  dijkstraSteps,
  topoSteps,
} from '../content/graphs';
import type { GraphStep } from '../content/graphs';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['bfs', 'dfs', 'dijkstra', 'topo'];

export default function GraphPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'bfs').toLowerCase();
  const resolvedId = GRAPH_ALGOS[rawId] ? rawId : 'bfs';
  const meta = GRAPH_ALGOS[resolvedId] ?? GRAPH_ALGOS['bfs'];

  const [demoKey, setDemoKey] = useState('line5');
  const [start, setStart] = useState(0);
  const [speedMult, setSpeedMult] = useState(1);

  const demo = DEMO_GRAPHS[demoKey] ?? DEMO_GRAPHS['line5'];
  const n = demo.n;
  const effStart = n > 0 ? Math.min(Math.max(start, 0), n - 1) : 0;
  const isTopo = resolvedId === 'topo';

  const steps: GraphStep[] = useMemo(() => {
    if (resolvedId === 'dfs') return dfsSteps(demo.n, demo.edges, effStart);
    if (resolvedId === 'dijkstra') {
      const w: [number, number, number][] =
        demo.weighted ?? demo.edges.map((e): [number, number, number] => [e[0], e[1], 1]);
      return dijkstraSteps(demo.n, w, effStart);
    }
    if (resolvedId === 'topo') return topoSteps(demo.n, demo.edges);
    return bfsSteps(demo.n, demo.edges, effStart);
  }, [resolvedId, demo, effStart]);

  const pb = usePlayback(steps as unknown as AlgoStep[]);

  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, demoKey, effStart]);

  const cur: GraphStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const last = Math.max(steps.length - 1, 0);
  const atStart = pb.index <= 0;
  const atEnd = steps.length <= 0 || pb.index >= last;

  const frontierLabel =
    resolvedId === 'dfs'
      ? 'Stack'
      : resolvedId === 'dijkstra'
        ? 'Unsettled'
        : resolvedId === 'topo'
          ? 'Ready'
          : 'Queue';
  const showDist = cur !== undefined && cur.dist.some((d) => d !== null && d !== undefined);

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        {'Graphs'}
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        demo={demoKey} ({demo.label}), start={effStart}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing bfs)` : ''}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <label style={{ fontSize: 14 }}>
          Demo graph{' '}
          <select
            value={demoKey}
            onChange={(e) => setDemoKey(e.target.value)}
            aria-label="Demo graph"
          >
            {Object.entries(DEMO_GRAPHS).map(([k, g]) => (
              <option key={k} value={k}>
                {k} — {g.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 14, color: isTopo ? 'var(--muted)' : 'inherit' }}>
          start={effStart}{' '}
          <input
            type="range"
            min={0}
            max={Math.max(n - 1, 0)}
            step={1}
            value={effStart}
            onChange={(e) => setStart(Number(e.target.value))}
            aria-label={`Start node (0 to ${Math.max(n - 1, 0)})`}
            disabled={isTopo || n <= 0}
            title={isTopo ? 'Topo sort ignores start node' : 'Start node'}
          />
        </label>
      </div>

      <div className="graph-stage">
        {cur && (
          <GraphSvg
            n={demo.n}
            edges={demo.edges}
            positions={demo.positions}
            step={cur}
            directed={isTopo}
          />
        )}
        {cur && (
          <aside className="graph-state" aria-label="Traversal state">
            <h2>State</h2>
            <p className="gs-row">
              <span className="gs-label">{frontierLabel}</span>
              <span className="chips">
                {cur.frontier.length > 0 ? (
                  cur.frontier.map((f) => (
                    <span key={f} className={f === cur.current ? 'chip chip-cur' : 'chip'}>
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="gs-empty">—</span>
                )}
              </span>
            </p>
            <p className="gs-row">
              <span className="gs-label">Visited</span>
              <span className="chips">
                {cur.visited_order.length > 0 ? (
                  cur.visited_order.map((v) => (
                    <span key={v} className={v === cur.current ? 'chip chip-cur' : 'chip'}>
                      {v}
                    </span>
                  ))
                ) : (
                  <span className="gs-empty">—</span>
                )}
              </span>
            </p>
            {showDist && (
              <p className="gs-row">
                <span className="gs-label">Dist</span>
                <span className="chips">
                  {cur.dist.map((d, i) =>
                    d === null || d === undefined ? null : (
                      <span key={i} className="chip">
                        {i}:{d}
                      </span>
                    ),
                  )}
                </span>
              </p>
            )}
          </aside>
        )}
      </div>

      <div style={{ marginTop: 10 }} role="toolbar" aria-label="Playback controls">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={pb.toggle} aria-pressed={pb.playing}>
            {pb.playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={pb.stepBack} disabled={atStart} title="Step back">
            ◀
          </button>
          <button type="button" onClick={pb.stepFwd} disabled={atEnd} title="Step forward">
            ▶
          </button>
          <button type="button" onClick={pb.reset} disabled={steps.length === 0} title="Reset">
            Reset
          </button>
          <label style={{ fontSize: 14 }}>
            Speed{' '}
            <select
              value={speedMult}
              onChange={(e) => handleSpeed(Number(e.target.value))}
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }} aria-hidden="true">
            {steps.length > 0 ? `${pb.index + 1}/${steps.length}` : '0/0'}
          </span>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={steps.length > 0 ? pb.index : 0}
            onChange={(e) => pb.setIndex(Number(e.target.value))}
            aria-label={`Scrub steps (0 to ${last})`}
            disabled={steps.length === 0}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 12,
        }}
      >
        <section
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            background: 'var(--surface)',
          }}
          aria-label="Step inspector"
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Step</h2>
          {cur ? (
            <div style={{ fontSize: 14 }}>
              <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                {pb.index + 1}/{steps.length} · line {cur.line}
              </p>
              <p style={{ margin: '0 0 8px' }}>{cur.note}</p>
              <p style={{ margin: 0, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                order=[{cur.visited_order.join(',')}] frontier=[{cur.frontier.join(',')}]
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No steps.</p>
          )}
        </section>

        <section
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            background: 'var(--surface)',
          }}
          aria-label="Pseudocode"
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Code</h2>
          <ol style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--mono)', fontSize: 13 }}>
            {meta.pseudocode.map((line, i) => {
              const active = cur !== undefined && cur.line === i + 1;
              return (
                <li
                  key={i}
                  style={{
                    background: active ? 'var(--surface-2)' : 'transparent',
                    outline: active ? '2px solid var(--accent)' : 'none',
                    borderRadius: 4,
                    padding: '1px 4px',
                  }}
                >
                  {line}
                </li>
              );
            })}
          </ol>
        </section>

        <section
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            background: 'var(--surface)',
          }}
          aria-label="Complexity"
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Complexity</h2>
          <table style={{ fontSize: 14, borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted)' }}>Best</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{meta.complexity.best}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)' }}>Average</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{meta.complexity.avg}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)' }}>Worst</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{meta.complexity.worst}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)' }}>Space</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{meta.complexity.space}</td>
              </tr>
            </tbody>
          </table>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
            {meta.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      </div>

      <section style={{ marginTop: 12 }} aria-label="Self-check">
        <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>Self-check</h2>
        {meta.checks.map((c, i) => (
          <details
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '6px 10px',
              marginBottom: 6,
              background: 'var(--surface)',
            }}
          >
            <summary style={{ cursor: 'pointer', fontSize: 14 }}>{c.q}</summary>
            <p style={{ margin: '6px 0 2px', fontSize: 14, color: 'var(--muted)' }}>{c.a}</p>
          </details>
        ))}
      </section>

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All graph algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/graph/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
