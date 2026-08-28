import { useState } from 'react';
import type { GameEvent } from '../engine/types';
import { SPRITES } from '../content/sprites';
import { PixelSprite } from './PixelSprite';

interface Props {
  event: GameEvent;
  toast: string | null;
  act: number;
  progress: string;
  onChoose: (i: number) => void;
}

export function EventCard({ event, toast, act, progress, onChoose }: Props) {
  const [picked, setPicked] = useState(false);

  return (
    <section className="card panel pop-in" key={event.id}>
      <div className="card-badges">
        <span className="badge badge-year">{event.year}</span>
        <span className="badge">{event.scene}</span>
        <span className="badge badge-act">
          第{act}幕 · {progress}
        </span>
      </div>
      {toast && <div className="toast">“{toast}”</div>}
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
            onClick={() => {
              if (picked) return;
              setPicked(true);
              onChoose(i);
            }}
          >
            {c.text}
          </button>
        ))}
      </div>
    </section>
  );
}
