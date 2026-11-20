// 소리는 전부 Web Audio 합성이다. 녹음 파일은 없다.
import { SFX, type SfxSpec } from './tables.ts';

let ctx: AudioContext | null = null;
let master: GainNode;
let muffle: BiquadFilterNode; // 슈트를 쓰면 세상이 먹먹해진다
let sfxBus: GainNode;
let ambBus: GainNode;
let noiseBuf: AudioBuffer;
let muted = false;
let silent = false; // 빨리 감기 중에는 소리를 내지 않는다

type Amb = { gain: GainNode; stop: () => void };
let amb: Amb | null = null;
let ambName = '';

// 필터를 '열어 둔' 주파수. 기기의 샘플레이트가 낮으면 그 절반을 넘지 않게 한다.
const openHz = (): number => Math.min(18000, (ctx ? ctx.sampleRate : 44100) / 2 - 200);

export function audioInit(): void {
  if (ctx) { void ctx.resume(); return; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = openHz();
  sfxBus = ctx.createGain();
  ambBus = ctx.createGain();
  sfxBus.connect(muffle); ambBus.connect(muffle);
  muffle.connect(master); master.connect(ctx.destination);
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { // 살짝 분홍빛 노이즈
    const w = Math.random() * 2 - 1;
    last = 0.97 * last + 0.03 * w;
    d[i] = w * 0.6 + last * 6;
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}
export function isMuted(): boolean { return muted; }
export function setSilent(s: boolean): void { silent = s; }

export function setMuffle(on: boolean): void {
  if (!ctx) return;
  muffle.frequency.setTargetAtTime(on ? 900 : openHz(), ctx.currentTime, 0.25);
}

function noise(dest: AudioNode, t: number, dur: number): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  return s;
}
function env(t: number, a: number, peak: number, dur: number, dest: AudioNode = sfxBus): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(dest);
  return g;
}
function filt(type: BiquadFilterType, f: number, q = 0.7): BiquadFilterNode {
  const b = ctx!.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  return b;
}
function osc(type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
  const o = ctx!.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t);
  o.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
const num = (v: SfxSpec[string], d: number): number => (typeof v === 'number' ? v : d);

function thud(t: number, f: number, dur: number, n: number, vol: number, crack = 0): void {
  const g = env(t, 0.004, vol, dur);
  const o = osc('sine', f * 2.2, t, dur, g);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur * 0.5);
  if (n > 0) {
    const lp = filt('lowpass', crack ? 3200 : 900);
    lp.connect(env(t, 0.003, vol * n * 0.5, dur * (crack ? 0.9 : 0.4)));
    noise(lp, t, dur);
  }
}

export function sfx(name: string): void {
  const sp = SFX[name];
  if (!ctx || !sp || silent) return;
  const t = ctx.currentTime + 0.02;
  const vol = num(sp.vol, 0.2);
  switch (sp.k) {
    case 'seq': {
      const notes = sp.notes as number[];
      const dur = num(sp.dur, 0.08), gap = num(sp.gap, 0.12);
      notes.forEach((f, i) => {
        const g = env(t + i * gap, 0.004, vol, dur + 0.02);
        osc((sp.wave as OscillatorType) || 'square', f, t + i * gap, dur, g);
      });
      break;
    }
    case 'buzz': {
      for (let i = 0; i < num(sp.n, 2); i++) {
        const g = env(t + i * 0.55, 0.01, vol, 0.4);
        const lp = filt('lowpass', 400); lp.connect(g);
        const o = osc('square', 155, t + i * 0.55, 0.4, lp);
        const am = ctx.createGain(); am.gain.value = 30;
        osc('sine', 33, t + i * 0.55, 0.4, am); am.connect(o.frequency);
      }
      break;
    }
    case 'click': {
      for (let i = 0; i < num(sp.n, 1); i++) {
        const hp = filt('highpass', sp.bright ? 2400 : 900);
        hp.connect(env(t + i * 0.09, 0.001, vol, 0.04));
        noise(hp, t + i * 0.09, 0.05);
      }
      break;
    }
    case 'thud': thud(t, num(sp.f, 70), num(sp.dur, 0.4), num(sp.noise, 0.4), vol, num(sp.crack, 0)); break;
    case 'creak': {
      const dur = num(sp.dur, 0.7), f = num(sp.f, 200);
      const bp = filt('bandpass', f * 3, 9);
      bp.connect(env(t, dur * 0.3, vol, dur));
      const o = osc('sawtooth', f, t, dur, bp);
      o.frequency.linearRampToValueAtTime(f * (sp.swing ? 1.5 : 1.25), t + dur * 0.5);
      o.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
      break;
    }
    case 'steps': {
      let at = t;
      const n = num(sp.n, 5), from = num(sp.from, 0.3), to = num(sp.to, 0.3);
      for (let i = 0; i < n; i++) {
        const v = from + ((to - from) * i) / Math.max(1, n - 1);
        if (sp.soft) {
          const lp = filt('lowpass', 500); lp.connect(env(at, 0.01, v, 0.14)); noise(lp, at, 0.15);
        } else thud(at, 85, 0.13, 0.5, v);
        at += num(sp.gap, 0.5) + (Math.random() * 2 - 1) * num(sp.jitter, 0);
      }
      break;
    }
    case 'wash': {
      const dur = num(sp.dur, 3);
      const lp = filt('lowpass', num(sp.lp, 4000)), hp = filt('highpass', num(sp.hp, 300));
      lp.connect(hp); hp.connect(env(t, num(sp.attack, 0.5), vol, dur));
      noise(lp, t, dur);
      break;
    }
    case 'tear': {
      const dur = num(sp.dur, 0.8);
      const bp = filt('bandpass', 1200, 1.5);
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
      bp.connect(env(t, 0.02, vol, dur));
      noise(bp, t, dur);
      break;
    }
    case 'breath': {
      const rate = num(sp.rate, 1.5);
      for (let i = 0; i < num(sp.n, 3); i++) {
        for (const [off, f] of [[0, sp.low ? 300 : 900], [rate * 0.45, sp.low ? 220 : 600]] as const) {
          const bp = filt('bandpass', f, 1.2);
          const at = t + i * rate + off;
          bp.connect(env(at, rate * 0.18, vol, rate * 0.42));
          noise(bp, at, rate * 0.45);
        }
      }
      break;
    }
    case 'tone': {
      const dur = num(sp.dur, 3);
      osc((sp.wave as OscillatorType) || 'sine', num(sp.f, 440), t, dur, env(t, 0.4, vol, dur));
      if (sp.duck) { // 이명이 울리면 다른 소리가 물러난다
        ambBus.gain.cancelScheduledValues(t);
        ambBus.gain.setTargetAtTime(0.15, t, 0.1);
        ambBus.gain.setTargetAtTime(1, t + dur * 0.7, 0.8);
      }
      break;
    }
    case 'flicker': {
      for (let i = 0; i < num(sp.n, 4); i++) {
        const at = t + i * 0.13 + Math.random() * 0.08;
        osc('sawtooth', 120, at, 0.05, env(at, 0.002, vol, 0.06));
      }
      break;
    }
    case 'cicada': {
      const dur = num(sp.dur, 5);
      const g = env(t, 1.2, vol, dur);
      const bp = filt('bandpass', 4300, 6); bp.connect(g);
      const o = osc('sawtooth', 4300, t, dur, bp);
      const am = ctx.createGain(); am.gain.value = 900;
      osc('square', 46, t, dur, am); am.connect(o.frequency);
      break;
    }
  }
}

// ── 배경음: 장면이 바뀌면 천천히 갈아탄다 ──
function loopNoise(dest: AudioNode): AudioBufferSourceNode {
  const s = ctx!.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(dest); s.start();
  return s;
}
function hum(f: number, v: number, dest: AudioNode, type: OscillatorType = 'sine'): OscillatorNode {
  const g = ctx!.createGain(); g.gain.value = v; g.connect(dest);
  const o = ctx!.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start();
  return o;
}
function nz(lpF: number, hpF: number, v: number, dest: AudioNode): AudioBufferSourceNode {
  const g = ctx!.createGain(); g.gain.value = v; g.connect(dest);
  const hp = filt('highpass', hpF); hp.connect(g);
  const lp = filt('lowpass', lpF); lp.connect(hp);
  return loopNoise(lp);
}

export function ambient(name: string): void {
  if (!ctx || name === ambName) return;
  ambName = name;
  const t = ctx.currentTime;
  if (amb) {
    const old = amb;
    old.gain.gain.setTargetAtTime(0, t, 0.5);
    setTimeout(old.stop, 2500);
  }
  const g = ctx.createGain(); g.gain.value = 0; g.connect(ambBus);
  const src: (AudioScheduledSourceNode)[] = [];
  switch (name) {
    case 'room': src.push(hum(58, 0.035, g), hum(116, 0.012, g), nz(500, 60, 0.012, g)); break;
    case 'still': src.push(hum(100, 0.01, g), nz(300, 60, 0.008, g)); break;
    case 'night': src.push(nz(700, 120, 0.02, g), nz(6000, 3800, 0.006, g), hum(52, 0.012, g)); break;
    case 'day': src.push(nz(1500, 200, 0.025, g), nz(300, 40, 0.03, g)); break;
    case 'rain_in': src.push(nz(3000, 700, 0.03, g), hum(58, 0.02, g)); break;
    case 'rain_out': src.push(nz(7000, 500, 0.085, g), nz(400, 60, 0.03, g)); break;
    case 'subway': src.push(nz(260, 40, 0.16, g), nz(2400, 900, 0.012, g), hum(88, 0.02, g, 'triangle')); break;
    case 'crowd': src.push(nz(1600, 300, 0.07, g), nz(350, 80, 0.05, g)); break;
    case 'store': src.push(hum(120, 0.02, g, 'triangle'), hum(240, 0.006, g), nz(4000, 1500, 0.008, g)); break;
    case 'party': src.push(nz(1200, 300, 0.03, g), hum(196, 0.012, g), hum(247, 0.008, g), hum(294, 0.006, g)); break;
  }
  g.gain.setTargetAtTime(1, t, 0.8);
  amb = { gain: g, stop: () => { src.forEach((s) => { try { s.stop(); } catch { /* 이미 멈춤 */ } }); g.disconnect(); } };
}

export function blip(kind: 'in' | 'out' | 'type' | 'lock'): void {
  if (!ctx || silent) return;
  const t = ctx.currentTime + 0.01;
  if (kind === 'in') osc('sine', 880, t, 0.09, env(t, 0.005, 0.05, 0.12));
  else if (kind === 'out') osc('sine', 620, t, 0.07, env(t, 0.005, 0.035, 0.1));
  else if (kind === 'lock') thud(t, 120, 0.09, 0.3, 0.25);
  else { const hp = filt('highpass', 3000); hp.connect(env(t, 0.001, 0.02, 0.02)); noise(hp, t, 0.03); }
}
