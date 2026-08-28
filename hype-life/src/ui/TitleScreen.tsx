import { SPRITES } from '../content/sprites';
import { peekSave, useGameStore } from '../store/gameStore';
import { PixelSprite } from './PixelSprite';

export function TitleScreen() {
  const startNew = useGameStore((s) => s.startNew);
  const continueGame = useGameStore((s) => s.continueGame);
  const hasSave = peekSave() !== null;

  return (
    <div className="title-screen">
      <div className="title-figure pop-in">
        <PixelSprite matrix={SPRITES.smug} scale={8} />
      </div>
      <h1 className="title-main">热搜人生</h1>
      <div className="title-sub">HYPE LIFE · 流量炼金术士模拟器</div>
      <p className="title-tag">
        从三本线到纳斯达克。你有四条命：热度、信用、资金、风险——任何一条归零，人生杀青。
      </p>
      <div className="title-actions">
        {hasSave && (
          <button className="btn primary" onClick={continueGame}>
            继续上辈子
          </button>
        )}
        <button className="btn choice" onClick={startNew}>
          {hasSave ? '重新投胎' : '开始人生'}
        </button>
      </div>
      <p className="disclaimer">
        本游戏纯属虚构讽刺作品，人物与事件均为艺术加工，请勿对号入座。
      </p>
    </div>
  );
}
