import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArrayBars from '../components/viz/ArrayBars';
import Controls from '../components/viz/Controls';
import { ALGOS, stepsForAlgo, searchTarget } from '../content/algorithms';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

// Playback comes from the shared engine hook (single source of truth).

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['bubble', 'selection', 'insertion', 'merge', 'quick', 'linear', 'binary'];

type CodeLang = 'pseudo' | 'python' | 'cpp';

export default function SortingPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'bubble').toLowerCase();
  const resolvedId = ALGOS[rawId] ? rawId : 'bubble';
  const meta = ALGOS[resolvedId] ?? ALGOS.bubble;

  const [size, setSize] = useState(24);
  const [seed, setSeed] = useState(42);
  const [speedMult, setSpeedMult] = useState(1);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const steps: AlgoStep[] = useMemo(() => stepsForAlgo(resolvedId, size, seed), [resolvedId, size, seed]);
  const target = useMemo(() => searchTarget(resolvedId, size, seed), [resolvedId, size, seed]);

  const pb = usePlayback(steps);

  // Reset playback when the trace identity changes (size / seed / algo).
  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, size, seed]);

  const cur: AlgoStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const isSearch = resolvedId === 'linear' || resolvedId === 'binary';

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
        {isSearch ? 'Searching' : 'Sorting'}
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        n={size}, seed={seed}
        {isSearch && target !== null ? `, target=${target}` : ''}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing bubble)` : ''}
      </p>

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
            <Link to={k === 'linear' || k === 'binary' ? `/search/${k}` : `/sort/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
