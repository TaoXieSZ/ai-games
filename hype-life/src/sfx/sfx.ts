// 8-bit 风音效：WebAudio 方波即时合成，零外部素材、零依赖。

let ctx: AudioContext | null = null;
const MUTE_KEY = 'hype-life-muted';

let muted =
  typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 依序播放一串 [频率, 时长] 音符 */
function blip(
  notes: Array<[number, number]>,
  type: OscillatorType = 'square',
  vol = 0.04,
) {
  const a = ac();
  if (!a) return;
  let t = a.currentTime;
  for (const [freq, dur] of notes) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  }
}

export const sfx = {
  get muted() {
    return muted;
  },
  toggle(): boolean {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // 存不了就本次会话生效
    }
    return muted;
  },
  choose() {
    blip([[440, 0.06]]);
  },
  up() {
    blip([
      [523, 0.06],
      [784, 0.09],
    ]);
  },
  down() {
    blip([
      [330, 0.07],
      [220, 0.1],
    ]);
  },
  win() {
    blip([
      [523, 0.09],
      [659, 0.09],
      [784, 0.09],
      [1047, 0.2],
    ]);
  },
  lose() {
    blip(
      [
        [392, 0.12],
        [311, 0.12],
        [233, 0.22],
      ],
      'sawtooth',
      0.05,
    );
  },
};
