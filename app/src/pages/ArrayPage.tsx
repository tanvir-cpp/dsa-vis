import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArrayBars from '../components/viz/ArrayBars';
import Controls from '../components/viz/Controls';
import { ARRAY_ALGOS, stepsForArray, arrayParam } from '../content/arrays';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

// Playback comes from the shared engine hook (single source of truth).

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['twosum', 'sliding', 'prefix', 'kadane', 'rotate', 'dedup'];

type ArrayId = 'twosum' | 'sliding' | 'prefix' | 'kadane' | 'rotate' | 'dedup';

type CodeLang = 'pseudo' | 'python' | 'cpp';

export default function ArrayPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'twosum').toLowerCase();
  const resolvedId: ArrayId = rawId in ARRAY_ALGOS ? (rawId as ArrayId) : 'twosum';
  const meta = ARRAY_ALGOS[resolvedId];

  const [size, setSize] = useState(12);
  const [seed, setSeed] = useState(42);
  const [speedMult, setSpeedMult] = useState(1);
  const [paramOverride, setParamOverride] = useState<number | null>(null);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const defaultParam = useMemo(() => arrayParam(resolvedId, size, seed), [resolvedId, size, seed]);
  const effParam: number | undefined = paramOverride ?? defaultParam ?? undefined;

  // Clear a user-edited param when the trace identity changes (size / seed / algo).
  useEffect(() => {
    setParamOverride(null);
  }, [resolvedId, size, seed]);

  const steps: AlgoStep[] = useMemo(
    () => stepsForArray(resolvedId, size, seed, effParam),
    [resolvedId, size, seed, effParam],
  );

  const pb = usePlayback(steps);

  // Reset playback when the trace identity changes (size / seed / algo / param).
  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, size, seed, effParam]);

  const cur: AlgoStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const isK = resolvedId === 'sliding' || resolvedId === 'rotate';
  const kShown = isK ? Math.max(1, Math.min(Math.max(1, size), Math.floor(effParam ?? 3))) : null;

  const codeLines: string[] =
    lang === 'python'
      ? ((meta as any).python ?? meta.pseudocode)
      : lang === 'cpp'
        ? ((meta as any).cpp ?? meta.pseudocode)
        : meta.pseudocode;

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        Arrays
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        n={size}, seed={seed}
        {resolvedId === 'twosum' && effParam !== undefined ? `, target=${effParam}` : ''}
        {isK && kShown !== null ? `, k=${kShown}` : ''}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing twosum)` : ''}
      </p>

      {resolvedId === 'twosum' && (
        <div style={{ margin: '0 0 12px', fontSize: 14 }}>
          <label>
            target={' '}
            <input
              type="number"
              value={effParam ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  setParamOverride(null);
                } else {
                  const num = Number(v);
                  setParamOverride(Number.isFinite(num) ? Math.floor(num) : null);
                }
              }}
              aria-label="Two-sum target"
              style={{ fontFamily: 'var(--mono)', width: 100 }}
            />
          </label>
        </div>
      )}

      {isK && kShown !== null && (
        <div style={{ margin: '0 0 12px', fontSize: 14 }}>
          <label>
            <span style={{ fontFamily: 'var(--mono)' }}>k={kShown}</span>{' '}
            <input
              type="range"
              min={1}
              max={Math.max(1, size)}
              step={1}
              value={kShown}
              onChange={(e) => setParamOverride(Number(e.target.value))}
              aria-label="Window size k (1 to n)"
            />
          </label>
        </div>
      )}

      {cur && (
        <ArrayBars values={cur.array} compare={cur.compare} swap={cur.swap} sorted_from={cur.sorted_from} />
      )}

      <div style={{ marginTop: 10 }}>
        <Controls
          playing={pb.playing}
          index={pb.index}
          total={steps.length}
          size={size}
          speed={speedMult}
          onShuffle={() => setSeed(Math.floor(Math.random() * 1000000))}
          onSize={(n) => setSize(n)}
          onSpeed={handleSpeed}
          onPlay={pb.play}
          onPause={pb.pause}
          onToggle={pb.toggle}
          onStepFwd={pb.stepFwd}
          onStepBack={pb.stepBack}
          onReset={pb.reset}
          onScrub={(i) => pb.setIndex(i)}
        />
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
                comparisons={cur.comparisons} swaps={cur.swaps}
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

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/arrays/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
