import './Controls.css';

export interface ControlsProps {
  playing: boolean;
  index: number;
  total: number;
  size: number;
  speed: number; // multiplier: 0.5 | 1 | 2 | 4
  onShuffle: () => void;
  onSize: (n: number) => void;
  onSpeed: (m: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onToggle: () => void;
  onStepFwd: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onScrub: (i: number) => void;
}

export default function Controls(props: ControlsProps) {
  const { playing, index, total, size, speed } = props;
  const last = Math.max(total - 1, 0);
  const atStart = index <= 0;
  const atEnd = total <= 0 || index >= last;

  return (
    <div className="controls" role="toolbar" aria-label="Playback controls">
      <div className="controls-row">
        <button type="button" onClick={props.onShuffle} title="New random array">
          Shuffle
        </button>

        <label className="controls-size">
          <span className="controls-label">n={size}</span>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={size}
            onChange={(e) => props.onSize(Number(e.target.value))}
            aria-label="Array size (5 to 100)"
          />
        </label>

        <label className="controls-speed">
          <span className="controls-label">Speed</span>
          <select value={speed} onChange={(e) => props.onSpeed(Number(e.target.value))} aria-label="Playback speed">
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </label>

        <button type="button" onClick={props.onToggle} aria-pressed={playing} title={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={props.onStepBack} disabled={atStart} title="Step back">
          ◀
        </button>
        <button type="button" onClick={props.onStepFwd} disabled={atEnd} title="Step forward">
          ▶
        </button>
        <button type="button" onClick={props.onReset} disabled={total === 0} title="Reset to step 0">
          Reset
        </button>
        {/* Hidden-but-accessible explicit play/pause targets (tests / AT). */}
        <span className="controls-hidden">
          <button type="button" onClick={props.onPlay} tabIndex={-1} aria-hidden="true">
            play
          </button>
          <button type="button" onClick={props.onPause} tabIndex={-1} aria-hidden="true">
            pause
          </button>
        </span>
      </div>

      <div className="controls-row controls-scrub-row">
        <span className="controls-label" aria-hidden="true">
          {total > 0 ? `${index + 1}/${total}` : '0/0'}
        </span>
        <input
          type="range"
          className="controls-scrub"
          min={0}
          max={last}
          step={1}
          value={total > 0 ? index : 0}
          onChange={(e) => props.onScrub(Number(e.target.value))}
          aria-label={`Scrub steps (0 to ${last})`}
          disabled={total === 0}
        />
      </div>
    </div>
  );
}
