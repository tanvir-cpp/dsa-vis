import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StringMatch from '../components/viz/StringMatch';
import {
  DEMO_PAT,
  DEMO_TEXT,
  STR_ALGOS,
  demoText,
  kmpPrefix,
  kmpSteps,
  naiveSteps,
} from '../content/strings';
import type { StrStep } from '../content/strings';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

// StrStep traces reuse the shared engine hook (length-only); the cast below
// mirrors GraphPage and is safe because usePlayback only reads steps.length.

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['kmp', 'naive'];

type CodeLang = 'pseudo' | 'python' | 'cpp';

const TEXT_SOURCES: Record<string, { label: string; make: (size: number) => string }> = {
  demo: { label: `Demo "${DEMO_TEXT}"`, make: demoText },
  alla: { label: 'All A (worst case)', make: (size) => 'A'.repeat(size) },
  abab: { label: 'AB repeat', make: (size) => 'AB'.repeat(Math.ceil(size / 2)).slice(0, size) },
};

export default function StringPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'kmp').toLowerCase();
  const resolvedId = STR_ALGOS[rawId as 'kmp' | 'naive'] ? rawId : 'kmp';
  const meta = STR_ALGOS[resolvedId as 'kmp' | 'naive'] ?? STR_ALGOS.kmp;

  const [size, setSize] = useState(DEMO_TEXT.length);
  const [source, setSource] = useState('demo');
  const [pattern, setPattern] = useState(DEMO_PAT);
  const [speedMult, setSpeedMult] = useState(1);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const text = useMemo(() => {
    const make = TEXT_SOURCES[source]?.make ?? TEXT_SOURCES.demo.make;
    return make(size);
  }, [source, size]);

  const effPat = pattern.slice(0, 32);

  const steps: StrStep[] = useMemo(() => {
    if (effPat.length === 0) {
      return [{ ti: null, pi: null, line: 1, note: 'Enter a pattern to start matching' }];
    }
    return resolvedId === 'naive' ? naiveSteps(text, effPat) : kmpSteps(text, effPat);
  }, [resolvedId, text, effPat]);

  const lps = useMemo(() => kmpPrefix(effPat), [effPat]);

  const pb = usePlayback(steps as unknown as AlgoStep[]);

  // Reset playback when the trace identity changes (algo / text / pattern).
  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, text, effPat]);

  const cur: StrStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const last = Math.max(steps.length - 1, 0);
  const codeLines: string[] =
    lang === 'python' ? meta.python : lang === 'cpp' ? meta.cpp : meta.pseudocode;

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        Strings
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        n={text.length}, m={effPat.length}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing kmp)` : ''}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <label style={{ fontSize: 13 }}>
          Pattern{' '}
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value.toUpperCase().slice(0, 32))}
            aria-label="Pattern"
            placeholder={DEMO_PAT}
            style={{ fontFamily: 'var(--mono)', fontSize: 13, padding: '4px 8px' }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Text{' '}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            aria-label="Text preset"
            style={{ fontSize: 13, padding: '4px 8px' }}
          >
            {Object.entries(TEXT_SOURCES).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cur && <StringMatch text={text} pattern={effPat} ti={cur.ti} pi={cur.pi} lps={lps} />}

      <div role="toolbar" aria-label="Playback controls" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <button type="button" onClick={pb.toggle} aria-pressed={pb.playing} title={pb.playing ? 'Pause' : 'Play'}>
          {pb.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={pb.stepBack} disabled={pb.index <= 0} title="Step back">
          ◀
        </button>
        <button type="button" onClick={pb.stepFwd} disabled={steps.length === 0 || pb.index >= last} title="Step forward">
          ▶
        </button>
        <button type="button" onClick={pb.reset} disabled={steps.length === 0} title="Reset to step 0">
          Reset
        </button>
        <label style={{ fontSize: 13 }}>
          n={size}{' '}
          <input
            type="range"
            min={5}
            max={DEMO_TEXT.length}
            step={1}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label={`Text size (5 to ${DEMO_TEXT.length})`}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Speed{' '}
          <select value={speedMult} onChange={(e) => handleSpeed(Number(e.target.value))} aria-label="Playback speed">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>
        <span style={{ fontSize: 13, fontFamily: 'var(--mono)' }} aria-hidden="true">
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
          style={{ flex: 1, minWidth: 120 }}
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
                ti={cur.ti === null ? '–' : cur.ti} pi={cur.pi === null ? '–' : cur.pi}
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

      <section style={{ marginTop: 12 }} aria-label="LPS strip">
        <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>
          LPS{resolvedId === 'naive' ? ' (reference — naive does not use LPS)' : ''}
        </h2>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 13 }}>
          {effPat.split('').map((ch, i) => (
            <span
              key={i}
              title={`pat[${i}]='${ch}' lps=${lps[i] ?? 0}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surface)',
                padding: '2px 8px',
              }}
            >
              {ch}:{lps[i] ?? 0}
            </span>
          ))}
          {effPat.length === 0 && <span style={{ color: 'var(--muted)' }}>No pattern.</span>}
        </div>
      </section>

      <section style={{ marginTop: 12 }} aria-label="Self-check">
        <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>Self-check</h2>
        {meta.checks.map((c, i) => (
          <details key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', marginBottom: 6, background: 'var(--surface)' }}>
            <summary style={{ cursor: 'pointer', fontSize: 14 }}>{c.q}</summary>
            <p style={{ margin: '6px 0 2px', fontSize: 14, color: 'var(--muted)' }}>{c.a}</p>
          </details>
        ))}
      </section>

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All string algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/string/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
