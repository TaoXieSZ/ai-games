import { STAT_ICONS } from '../content/sprites';
import { STAT_KEYS } from '../engine/engine';
import type { GameState, StatKey } from '../engine/types';
import { PixelSprite } from './PixelSprite';

const META: Record<StatKey, { label: string; color: string }> = {
  hype: { label: '热度', color: 'var(--c-hype)' },
  trust: { label: '信用', color: 'var(--c-trust)' },
  cash: { label: '资金', color: 'var(--c-cash)' },
  risk: { label: '风险', color: 'var(--c-risk)' },
};

export function StatBar({ state }: { state: GameState }) {
  return (
    <div className="statbar">
      {STAT_KEYS.map((k) => {
        const delta = state.lastEffects?.[k];
        return (
          <div className="stat" key={k}>
            <PixelSprite matrix={STAT_ICONS[k]} scale={2} />
            <div className="stat-body">
              <div className="stat-head">
                <span className="stat-label">{META[k].label}</span>
                {delta !== undefined && delta !== 0 && (
                  <span className={`stat-delta ${delta > 0 ? 'up' : 'down'}`}>
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
              </div>
              <div className="stat-track">
                <div
                  className="stat-fill"
                  style={{
                    width: `${state.stats[k]}%`,
                    background: META[k].color,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
