import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChainSvg from '../components/viz/ChainSvg';
import {
  LINKED_ALGOS,
  LINKED_POOL,
  listSteps,
  queueSteps,
  stackSteps,
} from '../content/linked';
import type { ChainStep, LinkedId, ListOp } from '../content/linked';
import { usePlayback } from '../engine/playback';
import type { AlgoStep } from '../engine/types';

const SPEED_TO_MS: Record<number, number> = {
  0.5: 800,
  1: 400,
  2: 200,
  4: 100,
};

const KNOWN_IDS: LinkedId[] = ['list', 'stack', 'queue'];

const LIST_OPS: ListOp[] = ['traverse', 'pushHead', 'pushTail', 'insertAt', 'deleteAt'];

type CodeLang = 'pseudo' | 'python' | 'cpp';

function resolveId(raw: string): LinkedId {
  if (raw === 'stack' || raw === 'queue' || raw === 'list') return raw;
  return 'list';
}

export default function LinkedPage() {
  const { id } = useParams<{ id: string }>();
  const rawId = (id ?? 'list').toLowerCase();
  const resolvedId = resolveId(rawId);
  const meta = LINKED_ALGOS[resolvedId];

  const [size, setSize] = useState(4);
  const [op, setOp] = useState<ListOp>('traverse');
  const [arg, setArg] = useState(2);
  const [speedMult, setSpeedMult] = useState(1);
  const [lang, setLang] = useState<CodeLang>(() => {
    const v = localStorage.getItem('dsa-code-lang') as CodeLang | null;
    return v === 'pseudo' || v === 'python' || v === 'cpp' ? v : 'pseudo';
  });

  useEffect(() => {
    localStorage.setItem('dsa-code-lang', lang);
  }, [lang]);

  const values = useMemo(
    () => LINKED_POOL.slice(0, Math.min(Math.max(size, 2), 6)),
    [size],
  );
  const needsArg = resolvedId === 'list' && (op === 'insertAt' || op === 'deleteAt');
  const argMax = op === 'insertAt' ? values.length : Math.max(values.length - 1, 0);
  const effArg = values.length === 0 ? 0 : Math.min(Math.max(arg, 0), argMax);

  const steps: ChainStep[] = useMemo(() => {
    if (resolvedId === 'stack') return stackSteps(values);
    if (resolvedId === 'queue') return queueSteps(values);
    return listSteps(op, values, effArg);
  }, [resolvedId, op, values, effArg]);

  const pb = usePlayback(steps as unknown as AlgoStep[]);

  useEffect(() => {
    pb.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId, op, values, effArg]);

  const cur: ChainStep | undefined =
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

  const labelHead = resolvedId === 'stack' ? 'TOP' : resolvedId === 'queue' ? 'FRONT' : 'HEAD';
  const labelTail = resolvedId === 'queue' ? 'REAR' : resolvedId === 'stack' ? '—' : 'TAIL';
  const showHead = cur?.headMark ?? false;
  const showTail = resolvedId !== 'stack' && (cur?.tailMark ?? false);

  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>
        <Link to="/">Home</Link>
        {' / '}
        {'Linked'}
        {' / '}
        {meta.title}
      </p>
      <h1 style={{ margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        n={values.length} [{values.join(',')}]
        {resolvedId === 'list' ? `, op=${op}${needsArg ? `, i=${effArg}` : ''}` : ''}
        {rawId !== resolvedId ? ` (unknown id "${rawId}" — showing list)` : ''}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        {resolvedId === 'list' && (
          <label style={{ fontSize: 14 }}>
            Operation{' '}
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as ListOp)}
              aria-label="List operation"
            >
              {LIST_OPS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        )}
        {needsArg && (
          <label style={{ fontSize: 14 }}>
            i={effArg}{' '}
            <input
              type="range"
              min={0}
              max={argMax}
              step={1}
              value={effArg}
              onChange={(e) => setArg(Number(e.target.value))}
              aria-label={`Position index (0 to ${argMax})`}
            />
          </label>
        )}
        <label style={{ fontSize: 14 }}>
          n={values.length}{' '}
          <input
            type="range"
            min={2}
            max={6}
            step={1}
            value={values.length}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="List size (2 to 6)"
          />
        </label>
      </div>

      {cur && (
        <ChainSvg
          values={cur.values}
          highlight={cur.highlight}
          headMark={showHead}
          tailMark={showTail}
          labelHead={labelHead}
          labelTail={labelTail}
        />
      )}

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
                values=[{cur.values.join(',')}]
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
          aria-label="Code"
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

      <nav style={{ marginTop: 12, fontSize: 13 }} aria-label="All linked algorithms">
        {KNOWN_IDS.map((k) => (
          <span key={k} style={{ marginRight: 10 }}>
            <Link to={`/linked/${k}`}>{k}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
