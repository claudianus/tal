// 소리는 전부 Web Audio 합성이다. 녹음 파일은 없다.
// 노트북·휴대폰 스피커는 150Hz 아래를 거의 못 낸다. 그래서 저음은 늘 그 위의 배음과 몸통(걸러 낸 잡음)을 함께 낸다.
import { SFX, type SfxSpec } from './tables.ts';

let ctx: AudioContext | null = null;
let master: GainNode;
let muffle: BiquadFilterNode; // 슈트를 쓰면 세상이 먹먹해진다
let sfxBus: GainNode;
let bodyBus: GainNode; // 내 몸에서 나는 소리 (숨·심장·옷·손·발): 탈을 써도 먹먹해지지 않는다. 탈 안에서는 오히려 그것만 크다.
let makeup: GainNode; // 소리 크기 단계는 여기서 (리미터 앞)
let ambBus: GainNode;
let revSend: GainNode; // 공간의 울림 (방은 짧게, 복도·계단·역은 길게)
let tenseG: GainNode | null = null; // 긴장: 들킬 것 같을수록 바닥에서 올라오는 낮은 울림
let tenseF: BiquadFilterNode | null = null;
let noiseBuf: AudioBuffer;
let muted = false;
let silent = false; // 빨리 감기 중에는 소리를 내지 않는다
let LOUD = 1; // 일시정지 메뉴의 '소리' 단계
const AMB = 0.25; // 배경음 전체 크기 (tools/loud.mjs 로 잰다: 스피커 대역에서 방은 -27dB 언저리)
// 장면마다 한 번 더: 조용한 곳은 조용하게, 비와 지하철은 크게
const TRIM: Record<string, number> = { still: 1.3, night: 1.2, day: 1.4, rain_in: 1.4, rain_out: 1.0, subway: 1.2, station: 1.3, crowd: 2.5, store: 2.2, party: 2.3, grandma: 2.5, funeral: 1.4, er: 1.3 };

type Amb = { gain: GainNode; stop: () => void };
let amb: Amb | null = null;
let ambName = '';
let ambGen = 0;

// 필터를 '열어 둔' 주파수. 기기의 샘플레이트가 낮으면 그 절반을 넘지 않게 한다.
const openHz = (): number => Math.min(18000, (ctx ? ctx.sampleRate : 44100) / 2 - 200);
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

function impulse(sec: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx!.sampleRate * sec);
  const b = ctx!.createBuffer(2, len, ctx!.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      lp = lp * 0.55 + w * 0.45; // 벽에 먹힌 고음
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return b;
}

export function audioInit(): void {
  if (ctx) { void ctx.resume(); return; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  const comp = ctx.createDynamicsCompressor(); // 큰 소리는 눌러 주고, 작은 소리는 그만큼 끌어올릴 수 있게
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
  makeup = ctx.createGain(); makeup.gain.value = 1.5 * LOUD;
  const limit = ctx.createDynamicsCompressor(); // 마지막 벽: 문이 부서져도 찢어지지 않게
  limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.12;
  muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = openHz();
  sfxBus = ctx.createGain();
  ambBus = ctx.createGain(); ambBus.gain.value = AMB;
  revSend = ctx.createGain(); revSend.gain.value = 0.12;
  const conv = ctx.createConvolver(); conv.buffer = impulse(1.9, 3.2);
  bodyBus = ctx.createGain(); bodyBus.connect(comp); const bodyRev = ctx.createGain(); bodyRev.gain.value = 0.06; bodyBus.connect(bodyRev); bodyRev.connect(conv);
  sfxBus.connect(muffle); ambBus.connect(muffle);
  sfxBus.connect(revSend); revSend.connect(conv); conv.connect(muffle);
  muffle.connect(comp); comp.connect(makeup); makeup.connect(limit); limit.connect(master); master.connect(ctx.destination);
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { // 살짝 분홍빛 노이즈
    const w = Math.random() * 2 - 1;
    last = 0.97 * last + 0.03 * w;
    d[i] = w * 0.6 + last * 6;
  }
  // 긴장 울림: 늘 돌고 있고, 크기만 바뀐다
  tenseG = ctx.createGain(); tenseG.gain.value = 0; tenseG.connect(muffle);
  tenseF = filt('lowpass', 260, 2); tenseF.connect(tenseG);
  for (const [f, ty] of [[55, 'sawtooth'], [58.3, 'sawtooth'], [82.4, 'triangle'], [116.5, 'sawtooth']] as const) {
    const g = ctx.createGain(); g.gain.value = ty === 'triangle' ? 0.25 : 0.18; g.connect(tenseF);
    const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.connect(g); o.start();
  }
  const ng = ctx.createGain(); ng.gain.value = 0.25; ng.connect(tenseF);
  loopNoise(ng);
  if (ambName) { const n = ambName; ambName = ''; ambient(n); }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
}
export function isMuted(): boolean { return muted; }
export function setVolume(v: number): void {
  LOUD = Math.max(0, v); muted = v <= 0;
  if (ctx) { master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05); makeup.gain.setTargetAtTime(1.5 * LOUD, ctx.currentTime, 0.05); }
}
export function setSilent(s: boolean): void { silent = s; }

export function setMuffle(on: boolean): void {
  if (!ctx) return;
  muffle.frequency.setTargetAtTime(on ? 900 : openHz(), ctx.currentTime, 0.25);
}

/** 공간: 'out' 은 거의 울리지 않고, 'room' 은 짧게, 'hall' (복도·계단·역·병원)은 길게 울린다. */
export function setSpace(kind: 'out' | 'room' | 'hall'): void {
  if (!ctx) return;
  revSend.gain.setTargetAtTime(kind === 'hall' ? 0.42 : kind === 'room' ? 0.14 : 0.05, ctx.currentTime, 0.3);
}

/** 0..1. 들킬 것 같을수록, 숨이 막힐수록 바닥이 운다. 0 이면 사라진다. */
export function setTension(v: number): void {
  if (!ctx || !tenseG || !tenseF) return;
  const x = silent ? 0 : Math.max(0, Math.min(1, v));
  const t = ctx.currentTime;
  tenseG.gain.setTargetAtTime(x * x * 0.22, t, 0.18);
  tenseF.frequency.setTargetAtTime(180 + x * 520, t, 0.25);
}

function noise(dest: AudioNode, t: number, dur: number): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  return s;
}
function pan(p: number, dest: AudioNode): AudioNode {
  if (!p || !ctx!.createStereoPanner) return dest;
  const sp = ctx!.createStereoPanner(); sp.pan.value = Math.max(-1, Math.min(1, p)); sp.connect(dest);
  return sp;
}
function env(t: number, a: number, peak: number, dur: number, dest: AudioNode = sfxBus): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
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
/** 잡음 한 토막: 걸러서, 봉투를 씌워서 */
function burst(t: number, type: BiquadFilterType, f: number, q: number, a: number, vol: number, dur: number, dest: AudioNode = sfxBus): BiquadFilterNode {
  const b = filt(type, f, q);
  if (type === 'lowpass') { const hp = filt('highpass', 90); b.connect(hp); hp.connect(env(t, a, vol, dur, dest)); } // 아무 데서도 안 들리는 초저음은 덜어 낸다 (스피커가 내지 못하고 자리만 차지한다)
  else b.connect(env(t, a, vol, dur, dest));
  noise(b, t, dur);
  return b;
}
const num = (v: SfxSpec[string], d: number): number => (typeof v === 'number' ? v : d);

/** 쿵. 낮은 사인에 스피커가 낼 수 있는 배음과 잡음 몸통을 붙인다. */
function thud(t: number, f: number, dur: number, n: number, vol: number, crack = 0, dest: AudioNode = sfxBus): void {
  const g = env(t, 0.004, vol, dur, dest);
  const o = osc('sine', f * 2.2, t, dur, g);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur * 0.5);
  const g2 = env(t, 0.003, vol * 0.45, dur * 0.45, dest); // 노트북에서도 들리는 몸통
  const o2 = osc('triangle', f * 3.1, t, dur, g2);
  o2.frequency.exponentialRampToValueAtTime(f * 1.4, t + dur * 0.4);
  burst(t, 'lowpass', crack ? 3200 : 420 + f * 2, 0.8, 0.003, vol * Math.max(0.25, n) * 0.6, dur * (crack ? 0.9 : 0.35), dest);
}
/** 심장: 쿵-쿵. 두 번째가 조금 작고 높다. */
function heart(t: number, vol: number, dest: AudioNode = sfxBus): void {
  for (const [off, k, f] of [[0, 1, 50], [0.2, 0.62, 58]] as const) {
    const at = t + off;
    const g = env(at, 0.006, vol * k * 0.8, 0.16, dest);
    const o = osc('sine', f * 1.6, at, 0.16, g); o.frequency.exponentialRampToValueAtTime(f, at + 0.08);
    burst(at, 'lowpass', 380, 1, 0.004, vol * k * 1.2, 0.1, dest); // 노트북에서 들리는 '쿵'은 이쪽이다
    const g2 = env(at, 0.004, vol * k * 0.4, 0.07, dest);
    osc('triangle', f * 4, at, 0.07, g2);
  }
}

export type Surface = 'floor' | 'floor2' | 'concrete' | 'asphalt' | 'sand' | 'mat' | 'step' | 'wet' | 'soft';
/** 발 한 번. 바닥마다 다르다. pan: -1(왼쪽)..1(오른쪽) */
export function step(surf: string, vol = 0.22, p = 0, own = false): void {
  if (!ctx || silent || vol < 0.004) return;
  const t = ctx.currentTime + 0.01;
  const out = pan(p, own ? bodyBus : sfxBus);
  const v = vol * rnd(0.85, 1.1), k = rnd(0.92, 1.08);
  const heel = (f: number, lp: number, nv: number): void => {
    const g = env(t, 0.003, v * 0.7, 0.09, out);
    const o = osc('sine', f * 1.5 * k, t, 0.09, g); o.frequency.exponentialRampToValueAtTime(f * k, t + 0.05);
    burst(t, 'lowpass', lp * k, 0.9, 0.002, v * nv, 0.07, out);
  };
  switch (surf) {
    case 'floor': heel(95, 900, 0.9); burst(t + 0.015, 'bandpass', 2600 * k, 1.5, 0.001, v * 0.22, 0.03, out); break; // 장판: 탁, 끝에 살짝 찍
    case 'floor2': heel(110, 1600, 0.8); burst(t + 0.01, 'highpass', 3200, 0.7, 0.001, v * 0.3, 0.03, out); break; // 마루·타일
    case 'step': case 'concrete': heel(120, 2200, 0.8); burst(t, 'bandpass', 3400 * k, 1.2, 0.001, v * 0.45, 0.025, out); burst(t + 0.05, 'bandpass', 2800 * k, 2, 0.001, v * 0.12, 0.03, out); break; // 딱, 뒤꿈치 다음 앞꿈치
    case 'asphalt': heel(100, 1400, 0.6); for (let i = 0; i < 3; i++) burst(t + i * 0.018, 'bandpass', rnd(1800, 3200), 1.4, 0.001, v * 0.25, 0.025, out); break; // 자갈 섞인 사각
    case 'sand': for (let i = 0; i < 6; i++) burst(t + i * 0.022 + rnd(0, 0.01), 'bandpass', rnd(2400, 4200), 2, 0.002, v * 0.3, 0.03, out); heel(80, 500, 0.4); break; // 사박사박
    case 'mat': heel(85, 450, 0.7); break;
    case 'wet': heel(100, 1100, 0.6); { const b = burst(t + 0.01, 'bandpass', 1400, 1.2, 0.01, v * 0.55, 0.14, out); b.frequency.setValueAtTime(1100, t); b.frequency.exponentialRampToValueAtTime(4200, t + 0.12); } break; // 철벅
    default: heel(75, 380, 0.6); // soft: 털 발바닥
  }
}

/** 자잘한 알갱이 잡음 (천·종이): 봉투를 짧게 여러 번 */
function grains(t: number, dur: number, f: number, q: number, vol: number, rate: number, dest: AudioNode = sfxBus): void {
  for (let at = t; at < t + dur; at += rnd(0.4, 1.4) / rate) {
    const e = 1 - (at - t) / dur;
    burst(at, 'bandpass', f * rnd(0.7, 1.4), q, 0.003, vol * rnd(0.4, 1) * (0.4 + e * 0.6), rnd(0.02, 0.06), dest);
  }
}

export function sfx(name: string, opt: { vol?: number; pan?: number } = {}): void {
  const sp = SFX[name];
  if (!ctx || !sp || silent) return;
  const t = ctx.currentTime + 0.02;
  const vol = num(sp.vol, 0.2) * (opt.vol ?? 1);
  const out = pan(opt.pan || 0, sp.body ? bodyBus : sfxBus);
  switch (sp.k) {
    case 'seq': {
      const notes = sp.notes as number[];
      const dur = num(sp.dur, 0.08), gap = num(sp.gap, 0.12);
      notes.forEach((f, i) => {
        const g = env(t + i * gap, 0.004, vol, dur + 0.02, out);
        osc((sp.wave as OscillatorType) || 'square', f, t + i * gap, dur, g);
      });
      break;
    }
    case 'buzz': { // 휴대폰 진동: 책상을 타고 드르륵
      for (let i = 0; i < num(sp.n, 2); i++) {
        const at = t + i * 0.55;
        const g = env(at, 0.01, vol, 0.4, out);
        const lp = filt('lowpass', 900); lp.connect(g);
        const o = osc('square', 155, at, 0.4, lp);
        const am = ctx.createGain(); am.gain.value = 30;
        osc('sine', 33, at, 0.4, am); am.connect(o.frequency);
        const rg = ctx.createGain(); rg.gain.value = 0; rg.connect(out); // 덜덜거림
        const b = filt('bandpass', 2400, 3); b.connect(rg); noise(b, at, 0.4);
        const lfo = ctx.createGain(); lfo.gain.value = vol * 0.25; osc('square', 31, at, 0.4, lfo); lfo.connect(rg.gain);
        rg.gain.setValueAtTime(0, at + 0.4);
      }
      break;
    }
    case 'click': {
      for (let i = 0; i < num(sp.n, 1); i++) {
        const at = t + i * 0.09;
        burst(at, 'highpass', sp.bright ? 2400 : 900, 0.7, 0.001, vol, 0.04, out);
        burst(at, 'bandpass', sp.bright ? 1400 : 600, 2, 0.001, vol * 0.5, 0.05, out); // 플라스틱 몸통
      }
      break;
    }
    case 'thud': thud(t, num(sp.f, 70), num(sp.dur, 0.4), num(sp.noise, 0.4), vol, num(sp.crack, 0), out); break;
    case 'heart': heart(t, vol, out); break;
    case 'creak': {
      const dur = num(sp.dur, 0.7), f = num(sp.f, 200);
      const bp = filt('bandpass', f * 3, 9);
      bp.connect(env(t, dur * 0.3, vol, dur, out));
      const o = osc('sawtooth', f, t, dur, bp);
      o.frequency.linearRampToValueAtTime(f * (sp.swing ? 1.5 : 1.25), t + dur * 0.5);
      o.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
      const bp2 = filt('bandpass', f * 6, 14); bp2.connect(env(t, dur * 0.35, vol * 0.4, dur, out)); // 경첩의 쇳소리
      const o2 = osc('sawtooth', f * 1.01, t, dur, bp2); o2.frequency.linearRampToValueAtTime(f * 1.3, t + dur * 0.6);
      break;
    }
    case 'steps': {
      let at = 0;
      const n = num(sp.n, 5), from = num(sp.from, 0.3), to = num(sp.to, 0.3);
      const surf = sp.soft ? 'soft' : (sp.surf as string) || 'floor';
      for (let i = 0; i < n; i++) {
        const v = from + ((to - from) * i) / Math.max(1, n - 1);
        setTimeout(() => step(surf, v * 0.8, opt.pan || 0), at * 1000);
        at += num(sp.gap, 0.5) + (Math.random() * 2 - 1) * num(sp.jitter, 0);
      }
      break;
    }
    case 'wash': {
      const dur = num(sp.dur, 3);
      const lp = filt('lowpass', num(sp.lp, 4000)), hp = filt('highpass', num(sp.hp, 300));
      lp.connect(hp); hp.connect(env(t, num(sp.attack, 0.5), vol, dur, out));
      noise(lp, t, dur);
      break;
    }
    case 'tear': {
      const dur = num(sp.dur, 0.8);
      const bp = filt('bandpass', 1200, 1.5);
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
      bp.connect(env(t, 0.02, vol, dur, out));
      noise(bp, t, dur);
      grains(t, dur, 2600, 3, vol * 0.7, 40, out); // 올이 하나씩 끊긴다
      break;
    }
    case 'breath': {
      const rate = num(sp.rate, 1.5);
      for (let i = 0; i < num(sp.n, 3); i++) {
        for (const [off, f] of [[0, sp.low ? 300 : 900], [rate * 0.45, sp.low ? 220 : 600]] as const) {
          const bp = filt('bandpass', f, 1.2);
          const at = t + i * rate + off;
          bp.connect(env(at, rate * 0.18, vol, rate * 0.42, out));
          noise(bp, at, rate * 0.45);
        }
      }
      break;
    }
    case 'gasp': { // 헉: 짧게 들이쉰다
      const b = burst(t, 'bandpass', 900, 1.6, 0.06, vol, 0.32, out);
      b.frequency.setValueAtTime(700, t); b.frequency.exponentialRampToValueAtTime(1900, t + 0.25);
      break;
    }
    case 'exhale': { // 후: 길게 내쉰다
      const dur = num(sp.dur, 1.2);
      const b = burst(t, 'bandpass', 1100, 1.1, dur * 0.2, vol, dur, out);
      b.frequency.setValueAtTime(1300, t); b.frequency.exponentialRampToValueAtTime(450, t + dur);
      break;
    }
    case 'tone': {
      const dur = num(sp.dur, 3);
      osc((sp.wave as OscillatorType) || 'sine', num(sp.f, 440), t, dur, env(t, 0.4, vol, dur, out));
      if (sp.duck) { // 이명이 울리면 다른 소리가 물러난다
        ambBus.gain.cancelScheduledValues(t);
        ambBus.gain.setTargetAtTime(AMB * 0.15, t, 0.1);
        ambBus.gain.setTargetAtTime(AMB, t + dur * 0.7, 0.8);
      }
      break;
    }
    case 'flicker': {
      for (let i = 0; i < num(sp.n, 4); i++) {
        const at = t + i * 0.13 + Math.random() * 0.08;
        osc('sawtooth', 120, at, 0.05, env(at, 0.002, vol, 0.06, out));
        burst(at, 'highpass', 4000, 0.7, 0.001, vol * 0.5, 0.03, out);
      }
      break;
    }
    case 'cicada': {
      const dur = num(sp.dur, 5);
      const g = env(t, 1.2, vol, dur, out);
      const bp = filt('bandpass', 4300, 6); bp.connect(g);
      const o = osc('sawtooth', 4300, t, dur, bp);
      const am = ctx.createGain(); am.gain.value = 900;
      osc('square', 46, t, dur, am); am.connect(o.frequency);
      break;
    }
    case 'rustle': grains(t, num(sp.dur, 0.4), sp.bright ? 3600 : 2200, 0.9, vol, num(sp.rate, 60), out); break; // 천이 스친다
    case 'zip': { // 지퍼: 이가 하나씩 물린다
      const dur = num(sp.dur, 0.5);
      let at = t, gap = 0.024;
      while (at < t + dur) {
        burst(at, 'bandpass', (sp.up ? 2600 : 3400) + (at - t) / dur * (sp.up ? 1600 : -900), 3, 0.001, vol * rnd(0.6, 1), 0.012, out);
        at += gap * rnd(0.8, 1.2); gap = Math.max(0.01, gap * 0.985);
      }
      break;
    }
    case 'paper': { // 종이 한 장: 스륵, 바스락
      const b = burst(t, 'bandpass', 2000, 0.8, 0.04, vol, 0.28, out);
      b.frequency.setValueAtTime(1400, t); b.frequency.exponentialRampToValueAtTime(5200, t + 0.22);
      grains(t + 0.05, 0.25, 4200, 2, vol * 0.7, 50, out);
      break;
    }
    case 'rattle': { // 플라스틱 통 속 알약
      const n = num(sp.n, 9);
      for (let i = 0; i < n; i++) {
        const at = t + rnd(0, num(sp.dur, 0.35));
        osc('sine', rnd(2800, 5200), at, 0.015, env(at, 0.001, vol * rnd(0.4, 1), 0.02, out));
        burst(at, 'highpass', 3000, 0.7, 0.001, vol * 0.3, 0.012, out);
      }
      break;
    }
    case 'swish': { // 휙: 손가락이 화면을 쓸어 넘긴다
      const dur = num(sp.dur, 0.22);
      const b = burst(t, 'bandpass', 1200, 1.4, dur * 0.4, vol, dur, out);
      b.frequency.setValueAtTime(sp.up ? 700 : 3200, t); b.frequency.exponentialRampToValueAtTime(sp.up ? 3600 : 700, t + dur);
      break;
    }
    case 'key': { // 자판: 딸깍 + 받침
      burst(t, 'bandpass', rnd(3000, 4200), 2.5, 0.001, vol, 0.02, out);
      burst(t + 0.008, 'lowpass', 700, 1.2, 0.002, vol * 0.6, 0.04, out);
      break;
    }
    case 'tick': { // 화면을 톡: 짧고 높은 점 하나
      const f = num(sp.f, 2200) * rnd(0.96, 1.04);
      osc('sine', f, t, 0.03, env(t, 0.001, vol, 0.035, out));
      burst(t, 'highpass', 5000, 0.7, 0.001, vol * 0.35, 0.012, out);
      break;
    }
    case 'pop': { // 툭: 실밥이 끊기고, 단추가 빠진다
      const f = num(sp.f, 900) * rnd(0.9, 1.1);
      const o = osc('sine', f * 1.8, t, 0.06, env(t, 0.001, vol, 0.06, out)); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.05);
      burst(t, 'bandpass', 2400, 1.5, 0.001, vol * 0.7, 0.025, out);
      break;
    }
    case 'knock': { // 손등으로 똑똑
      for (let i = 0; i < num(sp.n, 2); i++) {
        const at = t + i * num(sp.gap, 0.22);
        const o = osc('sine', 260, at, 0.08, env(at, 0.001, vol, 0.09, out)); o.frequency.exponentialRampToValueAtTime(170, at + 0.06);
        burst(at, 'bandpass', 900, 1.6, 0.001, vol * 0.9, 0.06, out);
        burst(at, 'highpass', 2600, 0.7, 0.001, vol * 0.3, 0.015, out);
      }
      break;
    }
    case 'strain': { // 천이 당겨지며 우는 소리
      const dur = num(sp.dur, 0.6);
      const bp = filt('bandpass', 700, 6); bp.connect(env(t, dur * 0.4, vol, dur, out));
      const o = osc('sawtooth', 90, t, dur, bp); o.frequency.linearRampToValueAtTime(140, t + dur);
      grains(t, dur, 1800, 2, vol * 0.5, 30, out);
      break;
    }
    case 'glass': { // 병이 쨍
      for (const f of [2637, 3520, 4186, 5274]) osc('sine', f * rnd(0.98, 1.02), t, 0.6, env(t, 0.001, vol * rnd(0.3, 0.7), rnd(0.3, 0.6), out));
      burst(t, 'highpass', 3500, 0.8, 0.001, vol, 0.15, out);
      if (sp.shatter) for (let i = 0; i < 14; i++) { const at = t + rnd(0.02, 0.5); osc('sine', rnd(3000, 7000), at, 0.04, env(at, 0.001, vol * rnd(0.15, 0.5), 0.05, out)); }
      break;
    }
    case 'sting': { // 등골: 겹친 음이 부풀었다가 찢긴다
      const dur = num(sp.dur, 2);
      for (const f of [110, 116.5, 155.6, 233, 246.9]) {
        const lp = filt('lowpass', 1800, 1); lp.connect(env(t, dur * 0.12, vol * 0.3, dur, out));
        osc('sawtooth', f * rnd(0.995, 1.005), t, dur, lp);
      }
      burst(t, 'highpass', 2000, 0.7, 0.01, vol * 0.4, dur * 0.4, out);
      break;
    }
    case 'dtmf': { // 전화 자판: 두 음이 한꺼번에 (낮은 줄 음 + 높은 칸 음)
      const dur = num(sp.dur, 0.12);
      for (const f of [num(sp.lo, 697), num(sp.hi, 1209)]) osc('sine', f, t, dur, env(t, 0.004, vol, dur + 0.02, out));
      break;
    }
  }
}

// ── 배경음: 장면이 바뀌면 천천히 갈아탄다 ──
function loopNoise(dest: AudioNode): AudioBufferSourceNode {
  const s = ctx!.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(dest); s.start(0, Math.random() * 1.5);
  return s;
}
function hum(f: number, v: number, dest: AudioNode, type: OscillatorType = 'sine', lp = 0): OscillatorNode {
  const g = ctx!.createGain(); g.gain.value = v; g.connect(dest);
  let to: AudioNode = g;
  if (lp) { const b = filt('lowpass', lp, 1); b.connect(g); to = b; }
  const o = ctx!.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start();
  return o;
}
/** 끝없이 도는 잡음 한 겹. sway 를 주면 크기가 천천히 일렁인다 (바람·차 소리). */
function nz(lpF: number, hpF: number, v: number, dest: AudioNode, sway = 0, rate = 0.08): AudioScheduledSourceNode[] {
  const g = ctx!.createGain(); g.gain.value = v; g.connect(dest);
  const hp = filt('highpass', hpF); hp.connect(g);
  const lp = filt('lowpass', lpF); lp.connect(hp);
  const out: AudioScheduledSourceNode[] = [loopNoise(lp)];
  if (sway) {
    const lg = ctx!.createGain(); lg.gain.value = v * sway; lg.connect(g.gain);
    const o = ctx!.createOscillator(); o.frequency.value = rate * rnd(0.7, 1.3); o.connect(lg); o.start(); out.push(o);
  }
  return out;
}
/** 웅성거림: 말소리 대역 몇 개가 제각각 빨리 일렁인다. 무슨 말인지는 들리지 않는다. */
function babble(v: number, dest: AudioNode): AudioScheduledSourceNode[] {
  const out: AudioScheduledSourceNode[] = [];
  for (const [f, q] of [[320, 2.5], [620, 3], [1150, 3], [2300, 2.5]]) {
    const g = ctx!.createGain(); g.gain.value = v * 0.5; g.connect(dest);
    const b = filt('bandpass', f, q); b.connect(g);
    out.push(loopNoise(b));
    for (const r of [rnd(2.5, 4.5), rnd(5, 8)]) {
      const lg = ctx!.createGain(); lg.gain.value = v * 0.3; lg.connect(g.gain);
      const o = ctx!.createOscillator(); o.frequency.value = r; o.connect(lg); o.start(); out.push(o);
    }
  }
  return out;
}

// 배경 속 사건: 장면 이름별로, [소리, 최소 간격, 최대 간격]
type Ev = [(g: AudioNode) => void, number, number];
function at0(): number { return ctx!.currentTime + 0.05; }
const EV = {
  car: (v: number) => (g: AudioNode): void => { // 멀리서 차가 지나간다
    const t = at0(), dur = rnd(3, 5.5);
    const b = filt('bandpass', 400, 1.2); const e = env(t, dur * 0.5, v, dur, pan(rnd(-0.8, 0.8), g)); b.connect(e);
    b.frequency.setValueAtTime(260, t); b.frequency.linearRampToValueAtTime(rnd(700, 1100), t + dur * 0.5); b.frequency.linearRampToValueAtTime(300, t + dur);
    noise(b, t, dur);
  },
  creak: (v: number) => (g: AudioNode): void => { // 집이 혼자 삐걱인다
    const t = at0(), f = rnd(140, 260), dur = rnd(0.3, 0.7);
    const bp = filt('bandpass', f * 3, 8); bp.connect(env(t, dur * 0.4, v, dur, pan(rnd(-0.7, 0.7), g)));
    const o = osc('sawtooth', f, t, dur, bp); o.frequency.linearRampToValueAtTime(f * rnd(0.8, 1.3), t + dur);
  },
  tick: (v: number) => (g: AudioNode): void => { const t = at0(); burst(t, 'bandpass', rnd(1800, 3200), 3, 0.001, v, 0.03, pan(rnd(-0.8, 0.8), g)); },
  upstairs: (v: number) => (g: AudioNode): void => { // 윗집 발소리 (멀고, 둔하다)
    const t = at0(), n = Math.floor(rnd(3, 7)), gap = rnd(0.45, 0.65);
    for (let i = 0; i < n; i++) { const at = t + i * gap; burst(at, 'lowpass', 220, 1.2, 0.01, v, 0.12, g); osc('sine', 70, at, 0.1, env(at, 0.005, v * 0.6, 0.1, g)); }
  },
  doorFar: (v: number) => (g: AudioNode): void => { const t = at0(); thud(t, 60, 0.5, 0.3, v, 0, pan(rnd(-0.6, 0.6), g)); },
  cricket: (v: number) => (g: AudioNode): void => { // 찌르르
    const t = at0(), f = rnd(4200, 4800), d = pan(rnd(-1, 1), g), n = Math.floor(rnd(2, 5));
    for (let i = 0; i < n; i++) { const at = t + i * 0.055; osc('sine', f, at, 0.03, env(at, 0.004, v * rnd(0.5, 1), 0.035, d)); }
  },
  bird: (v: number) => (g: AudioNode): void => { // 짹
    const t = at0(), d = pan(rnd(-1, 1), g), n = Math.floor(rnd(1, 4)), base = rnd(2600, 3800);
    for (let i = 0; i < n; i++) { const at = t + i * rnd(0.09, 0.16); const o = osc('sine', base, at, 0.07, env(at, 0.004, v, 0.07, d)); o.frequency.exponentialRampToValueAtTime(base * rnd(1.2, 1.6), at + 0.05); }
  },
  drip: (v: number) => (g: AudioNode): void => { // 툭 (물방울)
    const t = at0(), f = rnd(900, 2200);
    const o = osc('sine', f, t, 0.05, env(t, 0.001, v * rnd(0.4, 1), 0.05, pan(rnd(-1, 1), g))); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.04);
  },
  thunder: (v: number) => (g: AudioNode): void => { const t = at0(), dur = rnd(3, 5); burst(t, 'lowpass', 220, 0.8, rnd(0.2, 0.8), v, dur, g); burst(t + 0.1, 'lowpass', 600, 0.8, 0.3, v * 0.3, dur * 0.6, g); },
  clack: (v: number) => (g: AudioNode): void => { // 덜컹-덜컹 (선로 이음매)
    const t = at0();
    for (const off of [0, 0.11]) { burst(t + off, 'lowpass', 700, 1, 0.003, v, 0.12, g); osc('sine', 110, t + off, 0.1, env(t + off, 0.003, v * 0.5, 0.1, g)); }
  },
  squeal: (v: number) => (g: AudioNode): void => { // 바퀴가 선로에 끽
    const t = at0(), dur = rnd(1, 2.2);
    const o = osc('sine', rnd(2600, 3400), t, dur, env(t, 0.3, v, dur, g)); const vib = ctx!.createGain(); vib.gain.value = 40; osc('sine', 7, t, dur, vib); vib.connect(o.frequency);
  },
  beep: (v: number, f = 2600, n = 1) => (g: AudioNode): void => { const t = at0(); for (let i = 0; i < n; i++) osc('sine', f, t + i * 0.16, 0.08, env(t + i * 0.16, 0.003, v, 0.09, g)); },
  clink: (v: number) => (g: AudioNode): void => { const t = at0(), d = pan(rnd(-0.7, 0.7), g); for (const f of [3100, 4150]) osc('sine', f * rnd(0.97, 1.03), t, 0.3, env(t, 0.001, v, 0.3, d)); },
  laugh: (v: number) => (g: AudioNode): void => { // 저쪽에서 왁 웃는다 (말은 없다)
    const t = at0(), n = Math.floor(rnd(3, 6)), d = pan(rnd(-0.8, 0.8), g);
    for (let i = 0; i < n; i++) burst(t + i * rnd(0.14, 0.2), 'bandpass', rnd(700, 1100), 3, 0.02, v * (1 - i / n * 0.5), 0.12, d);
  },
  chime: (v: number) => (g: AudioNode): void => { // 풍경
    const t = at0(), d = pan(rnd(-0.5, 0.5), g);
    const NOTES = [1760, 2217, 2637, 2960];
    for (let i = 0, n = Math.floor(rnd(2, 5)); i < n; i++) { const at = t + i * rnd(0.12, 0.3); osc('sine', NOTES[Math.floor(rnd(0, NOTES.length))], at, 1.6, env(at, 0.002, v * rnd(0.5, 1), 1.6, d)); }
  },
  announce: (v: number) => (g: AudioNode): void => { const t = at0(); [784, 988, 1175, 1568].forEach((f, i) => osc('sine', f, t + i * 0.26, 0.3, env(t + i * 0.26, 0.004, v, 0.32, g))); },
  passby: (v: number) => (g: AudioNode): void => { // 누가 옆으로 지나간다
    const n = Math.floor(rnd(3, 6)), p0 = rnd(-1, 1), surf = ['floor2', 'concrete'][Math.floor(rnd(0, 2))];
    for (let i = 0; i < n; i++) setTimeout(() => { if (g === amb?.gain) step(surf, v * 0.6 * Math.sin(((i + 1) / (n + 1)) * Math.PI), p0 * (1 - (2 * i) / n)); }, i * rnd(450, 560));
  },
};

export function ambient(name: string): void {
  if (name === ambName && amb) return;
  ambName = name;
  if (!ctx) return;
  const t = ctx.currentTime;
  if (amb) {
    const old = amb;
    old.gain.gain.setTargetAtTime(0, t, 0.5);
    setTimeout(old.stop, 2500);
  }
  const gen = ++ambGen;
  const g = ctx.createGain(); g.gain.value = 0; g.connect(ambBus);
  const src: AudioScheduledSourceNode[] = [];
  const add = (...s: (AudioScheduledSourceNode | AudioScheduledSourceNode[])[]): void => { for (const x of s) Array.isArray(x) ? src.push(...x) : src.push(x); };
  let evs: Ev[] = [];
  switch (name) {
    case 'room': // 컴퓨터 팬과 냉장고가 벽 너머에서 운다. 밖에서 가끔 차가 지나간다.
      add(hum(58, 0.05, g, 'sawtooth', 380), hum(120, 0.008, g, 'triangle'), nz(1300, 160, 0.13, g, 0.25, 0.05), nz(9000, 4500, 0.012, g));
      evs = [[EV.car(0.09), 14, 38], [EV.creak(0.05), 16, 40], [EV.tick(0.05), 8, 22], [EV.upstairs(0.11), 35, 80], [EV.doorFar(0.12), 50, 110]];
      break;
    case 'still': // 아무 소리도 없는 곳의 소리
      add(hum(100, 0.012, g, 'sawtooth', 300), nz(900, 140, 0.07, g, 0.2, 0.04));
      evs = [[EV.tick(0.04), 14, 40], [EV.creak(0.035), 30, 70], [EV.doorFar(0.07), 45, 100]];
      break;
    case 'night': // 바람, 풀벌레, 먼 도로
      add(nz(800, 180, 0.13, g, 0.6, 0.06), nz(420, 60, 0.07, g, 0.3, 0.03), nz(6000, 3800, 0.008, g));
      evs = [[EV.cricket(0.035), 0.5, 2.2], [EV.cricket(0.02), 0.8, 3], [EV.car(0.11), 12, 32]];
      break;
    case 'day': // 큰길이 가깝다
      add(nz(700, 80, 0.16, g, 0.35, 0.07), nz(2600, 600, 0.04, g, 0.3, 0.1));
      evs = [[EV.bird(0.04), 2.5, 9], [EV.car(0.16), 5, 13], [EV.passby(0.12), 9, 22]];
      break;
    case 'rain_in': // 창에 비가 붙는다
      add(nz(5200, 900, 0.15, g, 0.15, 0.1), nz(650, 120, 0.07, g, 0.2, 0.05), hum(58, 0.03, g, 'sawtooth', 300));
      evs = [[EV.drip(0.04), 0.15, 0.9], [EV.thunder(0.22), 45, 120], [EV.car(0.07), 20, 50]];
      break;
    case 'rain_out': // 비 한가운데
      add(nz(8000, 500, 0.32, g, 0.12, 0.13), nz(520, 60, 0.12, g, 0.25, 0.06));
      evs = [[EV.drip(0.06), 0.05, 0.3], [EV.drip(0.04), 0.05, 0.25], [EV.thunder(0.3), 35, 90]];
      break;
    case 'subway': // 달리는 칸 안
      add(nz(280, 40, 0.42, g, 0.25, 0.2), nz(3200, 1000, 0.05, g, 0.3, 0.3), hum(88, 0.05, g, 'triangle'), hum(176, 0.02, g, 'triangle'));
      evs = [[EV.clack(0.2), 0.9, 1.4], [EV.squeal(0.02), 12, 28]];
      break;
    case 'station': // 승강장: 넓고, 멀리서 열차가 운다
      add(nz(1300, 140, 0.1, g, 0.25, 0.05), nz(300, 40, 0.1, g, 0.3, 0.04), babble(0.035, g));
      evs = [[EV.announce(0.04), 35, 70], [EV.passby(0.14), 6, 16], [EV.squeal(0.012), 25, 55]];
      break;
    case 'crowd': // 사람들 사이
      add(babble(0.11, g), nz(300, 60, 0.07, g, 0.2, 0.05));
      evs = [[EV.passby(0.16), 2, 6], [EV.laugh(0.04), 10, 25], [EV.clink(0.025), 8, 20]];
      break;
    case 'store': // 형광등과 냉장 진열대
      add(hum(120, 0.03, g, 'triangle'), hum(120, 0.012, g, 'sawtooth', 2600), nz(320, 60, 0.08, g, 0.1, 0.03), hum(58, 0.03, g, 'sawtooth', 300), nz(9000, 5000, 0.01, g));
      evs = [[EV.beep(0.035), 12, 28], [EV.tick(0.04), 10, 25]];
      break;
    case 'party': { // 문 하나 건너 음악, 이쪽은 웅성웅성
      add(babble(0.07, g));
      const lp = filt('lowpass', 650, 1); lp.connect(g);
      const chords = [[196, 247, 294], [175, 220, 262], [165, 208, 247], [175, 220, 262]];
      const pad = [0, 1, 2].map((i) => { const o = hum(chords[0][i], 0.03, lp, 'triangle'); add(o); return o; });
      const bar = 2.0;
      let t0 = ctx.currentTime + 0.1, n = 0;
      const beat = (): void => { // 쿵·쿵 (bpm 120), 화음은 마디마다 바뀐다. 박자는 소리 시계에 맞춰 미리 놓는다 (타이머는 밀린다)
        if (gen !== ambGen || !ctx) return;
        if (t0 < ctx.currentTime) t0 = ctx.currentTime + 0.05; // 탭이 잠들었다 깼다
        if (!silent) for (let i = 0; i < 4; i++) { const at = t0 + i * 0.5; const o = osc('sine', 110, at, 0.15, env(at, 0.003, 0.14, 0.15, lp)); o.frequency.exponentialRampToValueAtTime(48, at + 0.12); }
        const c = chords[n++ % chords.length];
        pad.forEach((o, i) => o.frequency.setTargetAtTime(c[i], t0, 0.08));
        t0 += bar;
        setTimeout(beat, Math.max(50, (t0 - ctx.currentTime - 0.4) * 1000));
      };
      beat();
      evs = [[EV.laugh(0.05), 6, 16], [EV.clink(0.035), 4, 11]];
      break;
    }
    case 'grandma': // 여름, 할머니 집: 매미, 새, 처마 끝 풍경
      add(nz(5200, 3400, 0.02, g, 0.5, 0.15), nz(900, 200, 0.05, g, 0.4, 0.05));
      evs = [[EV.bird(0.05), 1.5, 6], [EV.chime(0.025), 8, 20]];
      break;
    case 'funeral': // 밤의 장례식장 앞: 풀벌레와 안에서 새어 나오는 낮은 말소리
      add(nz(700, 160, 0.09, g, 0.4, 0.05), babble(0.025, g));
      evs = [[EV.cricket(0.03), 0.7, 2.5], [EV.car(0.07), 20, 45], [EV.passby(0.1), 15, 35]];
      break;
    case 'er': // 응급실 천장: 공조기, 기계 소리, 먼 발소리
      add(nz(1500, 200, 0.1, g, 0.1, 0.03), hum(120, 0.015, g, 'sawtooth', 2000));
      evs = [[EV.beep(0.035, 1000, 1), 0.95, 1.05], [EV.passby(0.12), 7, 18], [EV.beep(0.03, 1800, 3), 15, 40]];
      break;
  }
  g.gain.setTargetAtTime(TRIM[name] || 1, t, 0.8);
  for (const [fn, lo, hi] of evs) {
    const tick = (): void => {
      if (gen !== ambGen || !ctx) return;
      if (!silent && ctx.state === 'running') fn(g);
      setTimeout(tick, rnd(lo, hi) * 1000);
    };
    setTimeout(tick, rnd(lo * 0.3, hi * 0.6) * 1000);
  }
  amb = { gain: g, stop: () => { src.forEach((s) => { try { s.stop(); } catch { /* 이미 멈춤 */ } }); g.disconnect(); } };
}

export function blip(kind: 'in' | 'out' | 'type' | 'lock' | 'pick' | 'move'): void {
  if (!ctx || silent) return;
  const t = ctx.currentTime + 0.01;
  if (kind === 'in') { osc('sine', 880, t, 0.09, env(t, 0.005, 0.09, 0.12)); osc('sine', 1320, t + 0.05, 0.07, env(t + 0.05, 0.004, 0.05, 0.1)); }
  else if (kind === 'out') { osc('sine', 660, t, 0.07, env(t, 0.005, 0.07, 0.1)); burst(t, 'highpass', 4000, 0.7, 0.001, 0.03, 0.02); }
  else if (kind === 'lock') { thud(t, 120, 0.09, 0.3, 0.3); burst(t, 'bandpass', 500, 3, 0.002, 0.15, 0.08); }
  else if (kind === 'pick') { osc('triangle', 520, t, 0.07, env(t, 0.003, 0.08, 0.1)); burst(t, 'bandpass', 2400, 2, 0.001, 0.05, 0.02); }
  else if (kind === 'move') burst(t, 'bandpass', 3200, 2.5, 0.001, 0.03, 0.015);
  else burst(t, 'bandpass', rnd(2800, 3800), 2, 0.001, 0.045, 0.02);
}

/** 검사용 (tools/loud.mjs): 마지막 출력에 귀를 댄다 */
export function audioProbe(): AnalyserNode | null {
  if (!ctx) return null;
  const an = ctx.createAnalyser(); an.fftSize = 4096; an.smoothingTimeConstant = 0;
  master.connect(an);
  return an;
}
