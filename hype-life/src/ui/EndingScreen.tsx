import { ENDINGS, FLAG_LABELS } from '../content/endings';
import { STAT_KEYS } from '../engine/engine';
import type { GameState, StatKey } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import { SPRITES } from '../content/sprites';
import { PixelSprite } from './PixelSprite';

const META: Record<StatKey, { label: string; color: string }> = {
  hype: { label: '热度', color: 'var(--c-hype)' },
  trust: { label: '信用', color: 'var(--c-trust)' },
  cash: { label: '资金', color: 'var(--c-cash)' },
  risk: { label: '风险', color: 'var(--c-risk)' },
};

const ENDING_SPRITE: Record<string, keyof typeof SPRITES> = {
  flowgod: 'bell',
  ipo: 'bell',
  writer: 'student',
  art: 'rich',
  lecture: 'rich',
  nobody: 'student',
  nextweek: 'panic',
  blocked: 'panic',
  broke: 'panic',
  forgotten: 'student',
  enemy: 'melon',
  stomach: 'melon',
};

export function EndingScreen({ state }: { state: GameState }) {
  const restart = useGameStore((s) => s.restart);
  const toTitle = useGameStore((s) => s.toTitle);
  const ending = ENDINGS[state.endingId ?? 'forgotten'] ?? ENDINGS.forgotten;
  const scenes = state.flags.map((f) => FLAG_LABELS[f]).filter(Boolean);

  return (
    <div className="ending-screen">
      <section className={`panel ending-card pop-in ${ending.isWin ? 'win' : ''}`}>
        <div className="ending-sub">{ending.subtitle}</div>
        <h1 className="ending-title">{ending.title}</h1>
        <div className="ending-figure">
          <PixelSprite matrix={SPRITES[ENDING_SPRITE[ending.id] ?? 'smug']} scale={7} />
        </div>
        <p className="ending-text">{ending.text}</p>
        {scenes.length > 0 && (
          <div className="ending-scenes">
            <div className="ending-scenes-title">本局名场面（{scenes.length}）</div>
            <ul>
              {scenes.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="ending-stats">
          {STAT_KEYS.map((k) => (
            <span className="ending-stat" key={k} style={{ color: META[k].color }}>
              {META[k].label} {state.stats[k]}
            </span>
          ))}
        </div>
        <div className="ending-actions">
          <button className="btn primary" onClick={restart}>
            再活一次
          </button>
          <button className="btn choice" onClick={toTitle}>
            回到标题
          </button>
        </div>
        <p className="disclaimer">本游戏纯属虚构讽刺作品，人物与事件均为艺术加工。</p>
      </section>
    </div>
  );
}
