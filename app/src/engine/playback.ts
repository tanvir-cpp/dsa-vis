import { useCallback, useEffect, useRef, useState } from 'react';
import type { AlgoStep } from './types';

/** Clamp a step index into [0, total - 1]; returns 0 when total <= 0. */
export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index > total - 1) return total - 1;
  return index;
}

export interface PlaybackControls {
  index: number;
  setIndex: (i: number) => void;
  playing: boolean;
  speedMs: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stepFwd: () => void;
  stepBack: () => void;
  reset: () => void;
  setSpeed: (ms: number) => void;
}

export function usePlayback(steps: AlgoStep[], initialSpeedMs = 400): PlaybackControls {
  const [index, setIndexState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const timer = useRef<number | null>(null);

  const setIndex = useCallback(
    (i: number) => {
      setIndexState(clampIndex(i, steps.length));
    },
    [steps.length],
  );

  const play = useCallback(() => {
    if (steps.length === 0) return;
    setPlaying(true);
  }, [steps.length]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  const stepFwd = useCallback(() => {
    setPlaying(false);
    setIndexState((i) => clampIndex(i + 1, steps.length));
  }, [steps.length]);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setIndexState((i) => clampIndex(i - 1, steps.length));
  }, [steps.length]);

  const reset = useCallback(() => {
    setPlaying(false);
    setIndexState(0);
  }, []);

  const setSpeed = useCallback((ms: number) => {
    setSpeedMs(ms > 0 ? ms : 1);
  }, []);

  // Clamp index when step list changes length.
  useEffect(() => {
    setIndexState((i) => clampIndex(i, steps.length));
  }, [steps.length]);

  // Advance on interval while playing; stop at last step.
  useEffect(() => {
    if (!playing) return;
    if (steps.length === 0) {
      setPlaying(false);
      return;
    }
    timer.current = window.setInterval(() => {
      setIndexState((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, speedMs);
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [playing, speedMs, steps.length]);

  return { index, setIndex, playing, speedMs, play, pause, toggle, stepFwd, stepBack, reset, setSpeed };
}
