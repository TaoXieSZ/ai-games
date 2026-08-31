// 离线渲染 8-bit 音效为 wav（小游戏无 WebAudio，用 InnerAudioContext 播放文件）。
// 音符序列与 src/../hype-life/src/sfx/sfx.ts 保持一致。
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 22050;

function synth(notes, type = 'square', vol = 0.28) {
  const total = notes.reduce((s, [, d]) => s + Math.round(d * SR), 0);
  const out = new Float32Array(total);
  let i = 0;
  for (const [freq, dur] of notes) {
    const n = Math.round(dur * SR);
    let phase = 0;
    for (let j = 0; j < n; j++, i++) {
      const t = j / n;
      phase += freq / SR;
      const cyc = phase % 1;
      let v;
      if (type === 'square') v = cyc < 0.5 ? 1 : -1;
      else v = cyc * 2 - 1; // sawtooth
      const env = Math.pow(1 - t, 1.4); // 衰减包络
      out[i] = v * vol * env;
    }
  }
  return out;
}

function toWav(samples) {
  const dataLen = samples.length * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

const SFX = {
  choose: { notes: [[440, 0.06]], type: 'square' },
  up: { notes: [[523, 0.06], [784, 0.09]], type: 'square' },
  down: { notes: [[330, 0.07], [220, 0.1]], type: 'square' },
  win: { notes: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.2]], type: 'square' },
  lose: { notes: [[392, 0.12], [311, 0.12], [233, 0.22]], type: 'sawtooth' },
};

mkdirSync('assets/sfx', { recursive: true });
for (const [name, { notes, type }] of Object.entries(SFX)) {
  const wav = toWav(synth(notes, type));
  writeFileSync(`assets/sfx/${name}.wav`, wav);
  console.log(`${name}.wav`, wav.length, 'bytes');
}
