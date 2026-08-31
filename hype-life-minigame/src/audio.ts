// 音效：离线渲染好的 wav 文件 + InnerAudioContext 播放（替代 WebAudio）。
import { getStorage, setStorage } from './platform';

declare const wx: any;

const MUTE_KEY = 'hype-life-muted';

let muted = getStorage(MUTE_KEY) === '1';

type Kind = 'choose' | 'up' | 'down' | 'win' | 'lose';

const FILES: Record<Kind, string> = {
  choose: 'assets/sfx/choose.wav',
  up: 'assets/sfx/up.wav',
  down: 'assets/sfx/down.wav',
  win: 'assets/sfx/win.wav',
  lose: 'assets/sfx/lose.wav',
};

const pool: Partial<Record<Kind, any>> = {};

function player(kind: Kind) {
  if (!pool[kind]) {
    const c = wx.createInnerAudioContext();
    c.src = FILES[kind];
    pool[kind] = c;
  }
  return pool[kind];
}

export const sfx = {
  get muted() {
    return muted;
  },
  toggle(): boolean {
    muted = !muted;
    setStorage(MUTE_KEY, muted ? '1' : '0');
    return muted;
  },
  play(kind: Kind) {
    if (muted) return;
    try {
      const p = player(kind);
      p.stop();
      p.seek(0);
      p.play();
    } catch {
      // 音频失败不影响游戏
    }
  },
};
