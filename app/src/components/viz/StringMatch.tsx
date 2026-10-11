import type { ReactElement } from 'react';
import './StringMatch.css';

export interface StringMatchProps {
  text: string;
  pattern: string;
  ti: number | null;
  pi: number | null;
  lps: number[];
}

function spacerRow(count: number, keyPrefix: string): ReactElement[] {
  const out: ReactElement[] = [];
  for (let k = 0; k < count; k++) {
    out.push(
      <span key={`${keyPrefix}-${k}`} className="sm-cell sm-spacer" aria-hidden="true">
        ·
      </span>,
    );
  }
  return out;
}

export default function StringMatch({ text, pattern, ti, pi, lps }: StringMatchProps) {
  const align = (ti ?? 0) - (pi ?? 0);
  const patLead = Math.max(0, align);
  const textLead = Math.max(0, -align);
  const m = pattern.length;

  const inText = ti !== null && ti >= 0 && ti < text.length;
  const inPat = pi !== null && pi >= 0 && pi < m;
  const curMatch = inText && inPat && text[ti as number] === pattern[pi as number];

  const tiLabel = ti === null ? 'none' : String(ti);
  const piLabel = pi === null ? 'none' : String(pi);
  const ariaLabel = `String match: text "${text}", pattern "${pattern}", text index ${tiLabel}, pattern index ${piLabel}`;

  return (
    <div className="strmatch">
      <div className="strmatch-scroll" role="img" aria-label={ariaLabel}>
        <div className="strmatch-row" aria-hidden="true">
          <span className="strmatch-tag">T</span>
          {spacerRow(textLead, 'tl')}
          {text.split('').map((ch, i) => {
            const k = i - align;
            const matched = pi !== null && k >= 0 && k < pi;
            const current = i === ti;
            const mismatch = current && inPat && !curMatch;
            const cls = `sm-cell${matched ? ' sm-match' : ''}${current ? ' sm-current' : ''}${mismatch ? ' sm-mismatch' : ''}`;
            return (
              <span key={`t-${i}`} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>
        <div className="strmatch-row" aria-hidden="true">
          <span className="strmatch-tag">P</span>
          {spacerRow(patLead, 'pl')}
          {pattern.split('').map((ch, k) => {
            const matched = pi !== null && k < pi;
            const current = k === pi;
            const mismatch = current && inText && !curMatch;
            const cls = `sm-cell${matched ? ' sm-match' : ''}${current ? ' sm-current' : ''}${mismatch ? ' sm-mismatch' : ''}`;
            return (
              <span key={`p-${k}`} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>
        <div className="strmatch-row" aria-hidden="true">
          <span className="strmatch-tag">L</span>
          {spacerRow(patLead, 'll')}
          {pattern.split('').map((_ch, k) => (
            <span key={`l-${k}`} className="sm-cell sm-cell-sm">
              {lps[k] ?? ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
