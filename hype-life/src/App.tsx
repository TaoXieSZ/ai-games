import { useEffect, useState } from 'react';
import { CONTENT } from './content/events';
import { ENDINGS } from './content/endings';
import { sfx } from './sfx/sfx';
import { useGameStore } from './store/gameStore';
import { EndingScreen } from './ui/EndingScreen';
import { EventCard } from './ui/EventCard';
import { flyGuard } from './ui/flyGuard';
import { StatBar } from './ui/StatBar';
import { TitleScreen } from './ui/TitleScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const state = useGameStore((s) => s.state);
  const chooseIndex = useGameStore((s) => s.chooseIndex);
  const [muted, setMuted] = useState(sfx.muted);

  const endingId = state?.endingId ?? null;
  useEffect(() => {
    if (!endingId) return;
    if (ENDINGS[endingId]?.isWin) sfx.win();
    else sfx.lose();
  }, [endingId]);

  // 键盘快捷键：1/2/3 或 ←/↑/→ 选择选项
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'game' || !state?.currentEventId || flyGuard.locked) return;
      const map: Record<string, number> = {
        '1': 0,
        '2': 1,
        '3': 2,
        ArrowLeft: 0,
        ArrowUp: 1,
        ArrowRight: 2,
      };
      const idx = map[e.key];
      if (idx === undefined) return;
      const ev = CONTENT.events[state.currentEventId];
      if (idx >= ev.choices.length) return;
      e.preventDefault();
      chooseIndex(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, state, chooseIndex]);

  if (screen === 'title' || !state) {
    return <TitleScreen />;
  }

  if (state.endingId || !state.currentEventId) {
    return <EndingScreen state={state} />;
  }

  const event = CONTENT.events[state.currentEventId];
  const played = state.mainIndex;

  return (
    <div className="game-shell">
      <header className="game-top">
        <div className="game-topbar">
          <div className="game-logo">热搜人生</div>
          <button
            className="icon-btn"
            aria-label={muted ? '开启音效' : '静音'}
            title={muted ? '开启音效' : '静音'}
            onClick={() => setMuted(sfx.toggle())}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
        <StatBar state={state} />
      </header>
      <main className="game-main">
        <EventCard
          key={event.id}
          event={event}
          toast={state.toast}
          act={event.act}
          progress={`${played}/${CONTENT.mainline.length}`}
          onChoose={chooseIndex}
        />
      </main>
      <footer className="game-foot">每个选择都算数 · 属性到 0 或 100 就杀青</footer>
    </div>
  );
}
