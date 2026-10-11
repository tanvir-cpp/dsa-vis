import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePlayback } from '../engine/playback';
import { DP_ALGOS, coinSteps, knapsackSteps, lcsSteps, lisSteps } from '../content/dp';
import type { DpAlgoMeta, DpStep } from '../content/dp';
import DPTable from '../components/viz/DPTable';

// Playback comes from the shared engine hook (single source of truth).
// DpStep traces only need steps.length, so the engine type is satisfied
// via a cast without importing extra modules.

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['knapsack', 'lcs', 'lis', 'coin'];

type DpId = 'knapsack' | 'lcs' | 'lis' | 'coin';

type CodeLang = 'pseudo' | 'python' | 'cpp';

export default function DPPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'knapsack').toLowerCase();
  const resolvedId: DpId = (DP_ALGOS as Record<string, DpAlgoMeta>)[rawId] ? (rawId as DpId) : 'knapsack';
  const meta: DpAlgoMeta = DP_ALGOS[resolvedId];

  const [size, setSize] = useState(5);
  const [amount, setAmount] = useState(8);
  const [speedMult, setSpeedMult] = useState(1);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const steps: DpStep[] = useMemo(() => {
    switch (resolvedId) {
      case 'lcs':
        return lcsSteps(size);
      case 'lis':
        return lisSteps(size);
      case 'coin':
        return coinSteps(amount);
      case 'knapsack':
      default:
        return knapsackSteps(size);
    }
  }, [resolvedId, size, amount]);

  const pb = usePlayback(steps as unknown as Parameters<typeof usePlayback>[0]);

  // Reset playback when the trace identity changes (size / amount / algo).
  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, size, amount]);

  const cur: DpStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const last = Math.max(steps.length - 1, 0);
  const atStart = pb.index <= 0;
  const atEnd = steps.length <= 0 || pb.index >= last;

  const codeLines: string[] =
    lang === 'python' ? meta.python : lang === 'cpp' ? meta.cpp : meta.pseudocode;

  const paramLabel =
    resolvedId === 'coin'
      ? `amount=${amount}, coins=[1,3,4]`
      : resolvedId === 'knapsack'
        ? `n=${size}, cap=6`
        : `n=${size}`;

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        {'DP'}
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        {paramLabel}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing knapsack)` : ''}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        {resolvedId === 'coin' ? (
          <label style={{ fontSize: 14 }}>
            amount={amount}{' '}
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label="Amount (1 to 20)"
            />
          </label>
        ) : (
          <label style={{ fontSize: 14 }}>
            size={size}{' '}
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Input size (1 to 8)"
            />
          </label>
        )}
      </div>

      {cur && <DPTable table={cur.table} cell={cur.cell} />}

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
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'var(--surface)' }}
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
                table={cur.table.length}×{cur.table.length > 0 ? cur.table[0].length : 0}
                {cur.cell ? ` cell=[${cur.cell[0]},${cur.cell[1]}]` : ' cell=—'}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No steps.</p>
          )}
        </section>

        <section
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'var(--surface)' }}
          aria-label="Pseudocode"
        >
          <h2 style={{ margin: '0 0 6px', fontSize: 15 }}>
            Code{lang === 'python' ? ' · Python' : lang === 'cpp' ? ' · C++' : ' · Pseudo'}
          </h2>
          <div role="tablist" aria-label="Code language" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(
              [
                { id: 'pseudo', label: 'Pseudo' },
                { id: 'python', label: 'Python' },
                { id: 'cpp', label: 'C++' },
              ] as { id: CodeLang; label: string }[]
            ).map((t) => {
              const selected = lang === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setLang(t.id)}
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
          <ol
            className={lang === 'python' ? 'lang-python' : lang === 'cpp' ? 'lang-cpp' : 'lang-pseudo'}
            data-lang={lang}
            style={{ margin: 0, paddingLeft: 22, fontFamily: 'var(--mono)', fontSize: 13 }}
          >
            {codeLines.map((line, i) => {
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
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', background: 'var(--surface)' }}
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
          <details key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', marginBottom: 6, background: 'var(--surface)' }}>
            <summary style={{ cursor: 'pointer', fontSize: 14 }}>{c.q}</summary>
            <p style={{ margin: '6px 0 2px', fontSize: 14, color: 'var(--muted)' }}>{c.a}</p>
          </details>
        ))}
      </section>

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All DP algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/dp/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
