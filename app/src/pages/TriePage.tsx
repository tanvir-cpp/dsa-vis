import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import TrieSvg from '../components/viz/TrieSvg';
import { TRIE_ALGOS, trieInsertSteps, trieSearchSteps } from '../content/trie';
import type { TrieStep } from '../content/trie';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS = ['insert', 'search'];

type TrieId = 'insert' | 'search';
type CodeLang = 'pseudo' | 'python' | 'cpp';

const DEMO_WORDS = ['app', 'apple', 'ape', 'bat', 'bar'];
const DEFAULT_QUERY = 'apple';

export default function TriePage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'insert').toLowerCase();
  const resolvedId: TrieId = rawId === 'search' ? 'search' : 'insert';
  const meta = TRIE_ALGOS[resolvedId];

  const [wordCount, setWordCount] = useState(5);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [speedMult, setSpeedMult] = useState(1);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const effCount = Math.max(1, Math.min(DEMO_WORDS.length, Math.floor(wordCount)));
  const words = useMemo(() => DEMO_WORDS.slice(0, effCount), [effCount]);

  const steps: TrieStep[] = useMemo(() => {
    if (resolvedId === 'search') return trieSearchSteps(DEMO_WORDS, query);
    return trieInsertSteps(words);
  }, [resolvedId, words, query]);

  const pb = usePlayback(steps as unknown as AlgoStep[]);

  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, effCount, query]);

  const cur: TrieStep | undefined =
    steps.length > 0 ? steps[Math.min(Math.max(pb.index, 0), steps.length - 1)] : undefined;

  const handleSpeed = (m: number) => {
    setSpeedMult(m);
    pb.setSpeed(SPEED_TO_MS[m] ?? 400);
  };

  const last = Math.max(steps.length - 1, 0);
  const atStart = pb.index <= 0;
  const atEnd = steps.length <= 0 || pb.index >= last;

  const visited: number[] = useMemo(() => {
    if (!cur) return [];
    return cur.nodes.filter((n) => n.terminal && n.id !== cur.highlight).map((n) => n.id);
  }, [cur]);

  const terminals = cur ? cur.nodes.filter((n) => n.terminal).length : 0;

  const codeLines: string[] =
    lang === 'python' ? meta.python : lang === 'cpp' ? meta.cpp : meta.pseudocode;

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        {'Tries'}
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        {resolvedId === 'search'
          ? `built=[${DEMO_WORDS.join(',')}], query="${query}"`
          : `words=[${words.join(',')}]`}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing insert)` : ''}
      </p>

      {resolvedId === 'insert' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }} role="group" aria-label="Words to insert">
            {DEMO_WORDS.map((w, i) => {
              const active = i < effCount;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWordCount(i + 1)}
                  aria-pressed={active}
                  title={`Build first ${i + 1} word${i === 0 ? '' : 's'}`}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '0 10px',
                    lineHeight: '22px',
                    marginRight: 4,
                    cursor: 'pointer',
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    borderColor: active ? 'var(--accent)' : undefined,
                    color: active ? 'var(--accent-ink)' : undefined,
                  }}
                >
                  {w}
                </button>
              );
            })}
          </span>
          <label style={{ fontSize: 14 }}>
            words={effCount}{' '}
            <input
              type="range"
              min={1}
              max={DEMO_WORDS.length}
              step={1}
              value={effCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              aria-label={`Words to insert (1 to ${DEMO_WORDS.length})`}
            />
          </label>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
          <label style={{ fontSize: 14 }}>
            Query{' '}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
              placeholder={DEFAULT_QUERY}
              style={{ fontFamily: 'var(--mono)', fontSize: 13, padding: '2px 8px' }}
            />
          </label>
          <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
            built trie: [{DEMO_WORDS.join(',')}]
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}
      >
        {cur && <TrieSvg nodes={cur.nodes} highlight={cur.highlight} visited={visited} />}
        {cur && (
          <aside
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              padding: '12px 14px',
              fontSize: 14,
            }}
            aria-label="Trie state"
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>State</h2>
            <p style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span
                style={{ color: 'var(--muted)', fontSize: 13, minWidth: 64, flexShrink: 0 }}
              >
                Prefix
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                {cur.prefix === '' ? '—' : cur.prefix}
              </span>
            </p>
            <p style={{ margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span
                style={{ color: 'var(--muted)', fontSize: 13, minWidth: 64, flexShrink: 0 }}
              >
                Current
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                {cur.highlight === null ? '—' : cur.highlight}
              </span>
            </p>
            <p style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span
                style={{ color: 'var(--muted)', fontSize: 13, minWidth: 64, flexShrink: 0 }}
              >
                Terminals
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{terminals}</span>
            </p>
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
                prefix={cur.prefix === '' ? '—' : cur.prefix}
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

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All trie algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/trie/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
