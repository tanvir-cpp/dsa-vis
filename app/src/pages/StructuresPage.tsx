import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BST_VALUES,
  STRUCT_CONTENT,
  UNION_N,
  UNION_PAIRS,
  bstSteps,
  unionSteps,
} from '../content/strings';
import type { BstStep, UnionStep } from '../content/strings';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

// BST / Union-Find traces reuse the shared engine hook (length-only); the
// casts below mirror GraphPage and are safe (usePlayback only reads length).

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

type Tab = 'bst' | 'unionfind';

interface MiniBarProps {
  playing: boolean;
  index: number;
  total: number;
  speed: number;
  onToggle: () => void;
  onStepFwd: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onScrub: (i: number) => void;
  onSpeed: (m: number) => void;
}

function MiniBar(props: MiniBarProps) {
  const { playing, index, total, speed } = props;
  const last = Math.max(total - 1, 0);
  return (
    <div role="toolbar" aria-label="Playback controls" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
      <button type="button" onClick={props.onToggle} aria-pressed={playing} title={playing ? 'Pause' : 'Play'}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={props.onStepBack} disabled={index <= 0} title="Step back">
        ◀
      </button>
      <button type="button" onClick={props.onStepFwd} disabled={total === 0 || index >= last} title="Step forward">
        ▶
      </button>
      <button type="button" onClick={props.onReset} disabled={total === 0} title="Reset to step 0">
        Reset
      </button>
      <label style={{ fontSize: 13 }}>
        Speed{' '}
        <select value={speed} onChange={(e) => props.onSpeed(Number(e.target.value))} aria-label="Playback speed">
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </label>
      <span style={{ fontSize: 13, fontFamily: 'var(--mono)' }} aria-hidden="true">
        {total > 0 ? `${index + 1}/${total}` : '0/0'}
      </span>
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={total > 0 ? index : 0}
        onChange={(e) => props.onScrub(Number(e.target.value))}
        aria-label={`Scrub steps (0 to ${last})`}
        disabled={total === 0}
        style={{ flex: 1, minWidth: 120 }}
      />
    </div>
  );
}

function CodeList({ lines, activeLine }: { lines: string[]; activeLine: number | undefined }) {
  return (
    <ol style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--mono)', fontSize: 13 }}>
      {lines.map((line, i) => {
        const active = activeLine !== undefined && activeLine === i + 1;
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
  );
}

function ComplexityTable({ meta }: { meta: typeof STRUCT_CONTENT.bst }) {
  return (
    <div>
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
      {meta.checks.map((c, i) => (
        <details key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', marginTop: 6, background: 'var(--surface)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 14 }}>{c.q}</summary>
          <p style={{ margin: '6px 0 2px', fontSize: 14, color: 'var(--muted)' }}>{c.a}</p>
        </details>
      ))}
    </div>
  );
}

const cardStyle: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '12px 14px',
  background: 'var(--surface)',
};

function BstPanel() {
  const meta = STRUCT_CONTENT.bst;
  const [input, setInput] = useState(BST_VALUES.join(', '));
  const [speedMult, setSpeedMult] = useState(1);

  const values = useMemo(
    () =>
      input
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((v) => Number.isFinite(v))
        .slice(0, 12),
    [input],
  );

  const steps: BstStep[] = useMemo(() => bstSteps(values), [values]);
  const pb = usePlayback(steps as unknown as AlgoStep[]);

  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const cur: BstStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const max = cur && cur.state.length > 0 ? Math.max(...cur.state) : 1;
  const ariaLabel =
    cur && cur.state.length > 0
      ? `Sorted keys ${cur.state.join(', ')}${cur.highlight !== null ? `, highlight index ${cur.highlight}` : ''}`
      : 'Empty tree';

  return (
    <div>
      <label style={{ fontSize: 13 }}>
        Insert sequence (comma-separated, max 12){' '}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Insert sequence"
          style={{ fontFamily: 'var(--mono)', fontSize: 13, padding: '4px 8px', minWidth: 220 }}
        />
      </label>

      {cur && (
        <div
          role="img"
          aria-label={ariaLabel}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 120,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 8,
            background: 'var(--surface)',
            marginTop: 10,
          }}
        >
          {cur.state.length === 0 && (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Empty tree.</span>
          )}
          {cur.state.map((v, i) => {
            const hot = i === cur.highlight;
            return (
              <div
                key={i}
                title={`${v}`}
                style={{
                  flex: 1,
                  minWidth: 18,
                  height: `${Math.max(4, (v / max) * 100)}%`,
                  background: hot ? 'var(--accent)' : 'var(--surface-2)',
                  border: hot ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 4,
                  color: hot ? 'var(--accent-ink)' : 'inherit',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                }}
              >
                {v}
              </div>
            );
          })}
        </div>
      )}

      <MiniBar
        playing={pb.playing}
        index={pb.index}
        total={steps.length}
        speed={speedMult}
        onToggle={pb.toggle}
        onStepFwd={pb.stepFwd}
        onStepBack={pb.stepBack}
        onReset={pb.reset}
        onScrub={(i) => pb.setIndex(i)}
        onSpeed={handleSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
        <section style={cardStyle} aria-label="Step inspector">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Step</h2>
          {cur ? (
            <div style={{ fontSize: 14 }}>
              <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                {pb.index + 1}/{steps.length} · line {cur.line}
              </p>
              <p style={{ margin: 0 }}>{cur.note}</p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No steps.</p>
          )}
        </section>
        <section style={cardStyle} aria-label="Pseudocode">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Code · Pseudo</h2>
          <CodeList lines={meta.pseudocode} activeLine={cur?.line} />
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontFamily: 'var(--mono)' }}>Python</summary>
            <ol style={{ margin: '6px 0 0', paddingLeft: 22, fontFamily: 'var(--mono)', fontSize: 13 }}>
              {meta.python.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </details>
        </section>
        <section style={cardStyle} aria-label="Complexity">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Complexity</h2>
          <ComplexityTable meta={meta} />
        </section>
      </div>
    </div>
  );
}

function UnionPanel() {
  const meta = STRUCT_CONTENT.unionfind;
  const [n, setN] = useState(UNION_N);
  const [speedMult, setSpeedMult] = useState(1);

  const pairs = useMemo<[number, number][]>(
    () => UNION_PAIRS.filter(([a, b]) => a < n && b < n),
    [n],
  );

  const steps: UnionStep[] = useMemo(() => unionSteps(n, pairs), [n, pairs]);
  const pb = usePlayback(steps as unknown as AlgoStep[]);

  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, pairs]);

  const cur: UnionStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const ariaLabel =
    cur
      ? `Parent array ${cur.parent.map((p, i) => `${i} to ${p}`).join(', ')}${cur.highlight !== null ? `, highlight index ${cur.highlight}` : ''}`
      : 'No steps';

  return (
    <div>
      <label style={{ fontSize: 13 }}>
        n={n}{' '}
        <input
          type="range"
          min={2}
          max={10}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-label="Element count (2 to 10)"
        />
      </label>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        pairs: {pairs.length > 0 ? pairs.map(([a, b]) => `(${a},${b})`).join(' ') : 'none in range'}
      </p>

      {cur && (
        <div role="img" aria-label={ariaLabel} style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cur.parent.map((p, i) => {
              const hot = i === cur.highlight;
              return (
                <span
                  key={i}
                  title={`element ${i}, parent ${p}`}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: hot ? 'var(--surface-2)' : 'transparent',
                    outline: hot ? '2px solid var(--accent)' : 'none',
                  }}
                >
                  {i}→{p}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <MiniBar
        playing={pb.playing}
        index={pb.index}
        total={steps.length}
        speed={speedMult}
        onToggle={pb.toggle}
        onStepFwd={pb.stepFwd}
        onStepBack={pb.stepBack}
        onReset={pb.reset}
        onScrub={(i) => pb.setIndex(i)}
        onSpeed={handleSpeed}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
        <section style={cardStyle} aria-label="Step inspector">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Step</h2>
          {cur ? (
            <div style={{ fontSize: 14 }}>
              <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: 13 }}>
                {pb.index + 1}/{steps.length} · line {cur.line}
              </p>
              <p style={{ margin: 0 }}>{cur.note}</p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No steps.</p>
          )}
        </section>
        <section style={cardStyle} aria-label="Pseudocode">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Code · Pseudo</h2>
          <CodeList lines={meta.pseudocode} activeLine={cur?.line} />
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontFamily: 'var(--mono)' }}>Python</summary>
            <ol style={{ margin: '6px 0 0', paddingLeft: 22, fontFamily: 'var(--mono)', fontSize: 13 }}>
              {meta.python.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </details>
        </section>
        <section style={cardStyle} aria-label="Complexity">
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>Complexity</h2>
          <ComplexityTable meta={meta} />
        </section>
      </div>
    </div>
  );
}

export default function StructuresPage() {
  const [params] = useSearchParams();
  const q = (params.get('tab') ?? '').toLowerCase();
  const initialTab: Tab = q === 'unionfind' || q === 'union-find' || q === 'uf' ? 'unionfind' : 'bst';
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        Structures
      </p>
      <h1 style={{ margin: '0 0 4px' }}>Data Structures</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        BST sorted-insert trace and Union-Find parent-array trace (?tab=bst|unionfind)
      </p>

      <div role="tablist" aria-label="Structure" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(
          [
            { id: 'bst', label: 'BST' },
            { id: 'unionfind', label: 'Union-Find' },
          ] as { id: Tab; label: string }[]
        ).map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              style={{
                fontSize: 13,
                fontFamily: 'var(--mono)',
                padding: '2px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: selected ? 'var(--surface-2)' : 'transparent',
                border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: 'inherit',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'bst' ? <BstPanel /> : <UnionPanel />}
    </div>
  );
}
