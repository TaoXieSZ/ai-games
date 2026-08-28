import { useEffect, useRef, useState } from 'react';
import type { GameEvent, Stats } from '../engine/types';
import { SPRITES } from '../content/sprites';
import { reactionsFor } from '../content/reactions';
import { flyGuard } from './flyGuard';
import { PixelSprite } from './PixelSprite';

interface Props {
  event: GameEvent;
  toast: string | null;
  act: number;
  progress: string;
  undoLeft: number;
  canUndo: boolean;
  lastEffects: Partial<Stats> | null;
  onChoose: (i: number) => void;
  onUndo: () => void;
}

type FlyDir = 'left' | 'up' | 'right';

export function EventCard({
  event,
  toast,
  act,
  progress,
  undoLeft,
  canUndo,
  lastEffects,
  onChoose,
  onUndo,
}: Props) {
  const [picked, setPicked] = useState(false);
  const [fly, setFly] = useState<FlyDir | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const pick = (i: number) => {
    if (picked || flyGuard.locked) return;
    setPicked(true);
    flyGuard.lock();
    // 第一个选项往左甩，最后一个往右甩，中间的往上飞
    const dir: FlyDir =
      i === 0 ? 'left' : i === event.choices.length - 1 ? 'right' : 'up';
    setFly(dir);
    timer.current = window.setTimeout(() => onChoose(i), 230);
  };

  const reactions = reactionsFor(lastEffects);

  return (
    <section
      className={`card panel ${fly ? `fly fly-${fly}` : 'pop-in'}`}
      key={event.id}
    >
      <div className="card-badges">
        <span className="badge badge-year">{event.year}</span>
        <span className="badge">{event.scene}</span>
        <span className="badge badge-act">
          第{act}幕 · {progress}
        </span>
      </div>
      {toast && <div className="toast">“{toast}”</div>}
      {reactions.length > 0 && (
        <div className="reactions">
          {reactions.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      )}
      <h2 className="card-title">{event.title}</h2>
      <div className="card-figure">
        <PixelSprite matrix={SPRITES[event.sprite]} scale={6} />
      </div>
      <p className="card-text">{event.text}</p>
      <div className="card-choices">
        {event.choices.map((c, i) => (
          <button
            key={i}
            className="btn choice"
            disabled={picked}
            onClick={() => pick(i)}
          >
            {c.text}
          </button>
        ))}
      </div>
      <button
        className="btn undo"
        disabled={picked || !canUndo}
        title="回到上一题，换一种选法"
        onClick={() => {
          if (picked || !canUndo) return;
          onUndo();
        }}
      >
        ↩ 时光机（剩 {undoLeft} 次）
      </button>
    </section>
  );
}
