// 배경 그림. 전부 코드로 그린다. 지금은 자리 표시용이라 빛과 실루엣만 있다.
// 규칙(기획서 11장): 사람은 얼굴이 없는 실루엣이다. 얼굴이 있는 건 고양이뿐이다.
import type { SceneSpec } from './tables.ts';
import { ALBUM_NOTE, bearPhoto, groupPhoto, videoFace, mirrorScene, slideScene, storeScene, videoPlayground, yearbook } from './art/cuts.ts';
import { canvasOf } from './sprites.ts';
import { catHeadAlone } from './art/chars.ts';
import { erScene, funeralScene, grandmaPhoto, grandmaScene } from './art/past.ts';
import type { Pix } from './art/pix.ts';

export type SceneState = {
  spec: SceneSpec;
  suit: boolean;      // 머리를 쓰고 있는가
  gaze: number;       // 0~100. 높으면 사람들 위에 눈이 박힌다
  eyes: boolean;      // 아버지의 눈 (3장)
  cat: boolean;       // 거울 속 고양이
  monitor: boolean;   // 모니터가 켜져 있는가
  droopy: boolean;    // 삼색이의 눈매 (플레이어가 골랐다)
};

type C = CanvasRenderingContext2D;
let W = 0, H = 0;

function rnd(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function glow(c: C, x: number, y: number, r: number, col: string, a: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col.replace('A', String(a)));
  g.addColorStop(1, col.replace('A', '0'));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function vgrad(c: C, top: string, bot: string, y0 = 0, y1 = H): void {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, y0, W, y1 - y0);
}
function person(c: C, x: number, base: number, h: number, col = '#07090b', ears = false): void {
  c.fillStyle = col;
  const w = h * 0.3;
  c.beginPath(); c.arc(x, base - h * 0.88, h * 0.11, 0, 7); c.fill();
  c.beginPath();
  c.moveTo(x - w * 0.5, base); c.lineTo(x - w * 0.55, base - h * 0.62);
  c.quadraticCurveTo(x, base - h * 0.82, x + w * 0.55, base - h * 0.62);
  c.lineTo(x + w * 0.5, base); c.closePath(); c.fill();
  if (ears) {
    const r = h * 0.11, y = base - h * 0.88;
    c.beginPath(); c.moveTo(x - r, y - r * 0.3); c.lineTo(x - r * 0.9, y - r * 1.7); c.lineTo(x - r * 0.1, y - r * 0.9); c.fill();
    c.beginPath(); c.moveTo(x + r, y - r * 0.3); c.lineTo(x + r * 0.9, y - r * 1.7); c.lineTo(x + r * 0.1, y - r * 0.9); c.fill();
  }
}
function eyeIcon(c: C, x: number, y: number, s: number, a: number): void {
  c.save(); c.globalAlpha = a; c.strokeStyle = '#c8ccd0'; c.fillStyle = '#c8ccd0'; c.lineWidth = Math.max(1, s * 0.12);
  c.beginPath(); c.moveTo(x - s, y); c.quadraticCurveTo(x, y - s * 0.8, x + s, y); c.quadraticCurveTo(x, y + s * 0.8, x - s, y); c.stroke();
  c.beginPath(); c.arc(x, y, s * 0.3, 0, 7); c.fill(); c.restore();
}
function blocks(c: C, seed: number, base: number, lit: number, day: boolean): void {
  const r = rnd(seed);
  for (let i = 0; i < 5; i++) {
    const x = W * (i * 0.21 - 0.03 + r() * 0.03), w = W * (0.15 + r() * 0.04), h = H * (0.34 + r() * 0.22);
    c.fillStyle = day ? '#5d666a' : '#0a0d11';
    c.fillRect(x, base - h, w, h);
    const cols = 7, rows = Math.floor(h / (H * 0.035));
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      const on = r() < lit;
      if (!on && !day) continue;
      c.fillStyle = day ? 'rgba(40,46,50,0.55)' : r() < 0.25 ? 'rgba(140,170,200,0.5)' : 'rgba(214,170,96,0.55)';
      c.fillRect(x + w * (0.08 + a * 0.125), base - h + H * (0.02 + b * 0.035), w * 0.07, H * 0.014);
    }
  }
}
function rain(c: C, t: number, a: number): void {
  c.strokeStyle = `rgba(170,185,200,${a})`; c.lineWidth = 1; c.beginPath();
  const r = rnd(7);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = ((r() * H + t * (600 + r() * 300)) % (H * 1.1)) - H * 0.05;
    c.moveTo(x, y); c.lineTo(x - 3, y + 14);
  }
  c.stroke();
}

// 삼색이. 화면에서 유일하게 얼굴이 있다. 한쪽 귀가 처져 있다.
/** 화면 구석이나 먼 곳의 삼색이: 맵에서 걷는 그 머리를 정수 배로 키워서 찍는다. s 는 예전 벡터 고양이의 반지름. */
export function drawCat(c: C, x: number, y: number, s: number, droopy: boolean, alpha = 1): void {
  const pix = catHeadAlone(false, droopy);
  const n = Math.max(1, Math.round((s * 1.9) / pix.w));
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false;
  c.drawImage(canvasOf(pix), Math.round(x - (pix.w * n) / 2), Math.round(y - (pix.h * n) * 0.55), pix.w * n, pix.h * n);
  c.restore();
}
/** 도트 그림을 화면에 꽉 차게 (넘치는 쪽은 잘라서) 깔끔하게 키운다 */
function cover(c: C, pix: Pix, w: number, h: number, ay = 0.5): void {
  const k = Math.max(w / pix.w, h / pix.h);
  c.imageSmoothingEnabled = false;
  c.drawImage(canvasOf(pix), Math.round((w - pix.w * k) / 2), Math.round((h - pix.h * k) * ay), Math.ceil(pix.w * k), Math.ceil(pix.h * k));
}

const MOOD: Record<string, [string, string, number]> = { // 위, 아래, 밝기
  night: ['#0b0f15', '#0d1014', 0.5], dark: ['#050607', '#07080a', 0.2], day: ['#3c4446', '#2b3133', 0.8],
  bright: ['#586064', '#3b4244', 1], rain: ['#252b30', '#1b2024', 0.6], dusk: ['#2a2424', '#17171a', 0.6],
  open: ['#0c0f14', '#0d1014', 0.5], warm: ['#3a2a1e', '#241a14', 1], door: ['#111315', '#0c0d0f', 0.5],
  dim: ['#17171a', '#101012', 0.4],
  color: ['#6fa3d6', '#d9c27a', 1], white: ['#c9d2cf', '#9aa6a3', 1],
};

function room(c: C, s: SceneState, t: number): void {
  const m = s.spec.mood, [, , br] = MOOD[m];
  const flick = m === 'night' ? (Math.sin(t * 31) * Math.sin(t * 7.3) > 0.93 ? 0.55 : 1) : 1;
  const fy = H * 0.74;
  // 창과 커튼 틈
  const slit = m === 'bright' ? 'rgba(226,228,214,A)' : m === 'day' ? 'rgba(170,178,172,A)' : m === 'rain' ? 'rgba(120,134,146,A)' : m === 'dusk' ? 'rgba(196,132,84,A)' : 'rgba(46,62,88,A)';
  c.fillStyle = '#0a0b0d'; c.fillRect(W * 0.06, H * 0.18, W * 0.2, H * 0.4);
  c.fillStyle = slit.replace('A', String(m === 'dark' ? 0.25 : 0.9)); c.fillRect(W * 0.157, H * 0.18, W * 0.006, H * 0.4);
  if (br > 0.55) { // 틈으로 들어온 빛이 바닥에 눕는다
    c.fillStyle = slit.replace('A', '0.13'); c.beginPath();
    c.moveTo(W * 0.157, H * 0.58); c.lineTo(W * 0.163, H * 0.58); c.lineTo(W * 0.5, H); c.lineTo(W * 0.4, H); c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, fy, W, H - fy);
  // 책상과 모니터
  c.fillStyle = '#090a0c'; c.fillRect(W * 0.34, H * 0.6, W * 0.24, H * 0.14);
  if (s.monitor && m !== 'dark') {
    glow(c, W * 0.46, H * 0.5, W * 0.26, 'rgba(96,132,190,A)', 0.2 * flick);
    c.fillStyle = `rgba(128,160,214,${0.75 * flick})`; c.fillRect(W * 0.41, H * 0.44, W * 0.1, H * 0.13);
  } else { c.fillStyle = '#0d0f12'; c.fillRect(W * 0.41, H * 0.44, W * 0.1, H * 0.13); }
  // 쌓인 것들
  const r = rnd(11); c.fillStyle = '#131518';
  for (let i = 0; i < 26; i++) {
    const x = W * (0.3 + r() * 0.36), w = W * (0.008 + r() * 0.012), h = H * (0.015 + r() * 0.04);
    c.fillRect(x, fy - h + r() * H * 0.1, w, h);
  }
  // 이불
  c.fillStyle = '#0e1013'; c.beginPath(); c.ellipse(W * 0.2, H * 0.84, W * 0.16, H * 0.05, 0, 0, 7); c.fill();
  // 방문. 발로 차인 자국이 있다.
  const dx = W * 0.74, dw = W * 0.12, dy = H * 0.22, dh = fy - dy;
  if (m === 'open') {
    c.fillStyle = '#000'; c.fillRect(dx, dy, dw, dh);
    glow(c, dx + dw * 0.5, dy + dh * 0.5, W * 0.3, 'rgba(210,190,150,A)', 0.16);
    c.fillStyle = '#15171a'; c.beginPath(); c.moveTo(dx + dw, dy); c.lineTo(dx + dw * 1.45, dy + dh * 0.05); c.lineTo(dx + dw * 1.45, fy + H * 0.03); c.lineTo(dx + dw, fy); c.fill();
  } else {
    c.fillStyle = '#121417'; c.fillRect(dx, dy, dw, dh);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(dx + dw * 0.45, dy + dh * 0.72, dw * 0.2, dh * 0.07, 0.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(200,180,140,0.16)'; c.fillRect(dx, fy - 2, dw, 2);
  }
  if (m === 'night') { c.fillStyle = `rgba(190,205,200,${0.035 * flick})`; c.fillRect(0, 0, W, H); }
  if (m === 'rain') rain(c, t, 0.05);
  if (s.eyes) { // 아버지. 실루엣에 처음으로 눈이 생긴다.
    person(c, dx + dw * 0.5, fy + H * 0.06, H * 0.56, '#000');
    c.fillStyle = 'rgba(190,40,34,0.9)';
    c.beginPath(); c.ellipse(dx + dw * 0.39, fy + H * 0.06 - H * 0.5, W * 0.006, H * 0.006, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(dx + dw * 0.61, fy + H * 0.06 - H * 0.5, W * 0.006, H * 0.006, 0, 0, 7); c.fill();
  }
}

function draw(c: C, s: SceneState, t: number): void {
  const { f, mood } = s.spec;
  const [top, bot] = MOOD[mood] || MOOD.night;
  vgrad(c, top, bot);
  const day = mood === 'day' || mood === 'bright';
  const gz = Math.max(0, (s.gaze - 25) / 75);
  const crowd = (n: number, base: number, h: number, seed: number): void => {
    const r = rnd(seed);
    for (let i = 0; i < n; i++) {
      const x = W * (0.04 + r() * 0.92), hh = h * (0.8 + r() * 0.4), b = base + r() * H * 0.08;
      person(c, x, b, hh, day ? '#14181a' : '#07090b');
      if (gz > 0 && !s.suit && r() < gz) eyeIcon(c, x, b - hh * 0.88, hh * 0.09, 0.35 + gz * 0.5);
    }
  };
  switch (f) {
    case 'black': c.fillStyle = '#000'; c.fillRect(0, 0, W, H); break;
    case 'room': room(c, s, t); break;
    case 'door': {
      c.fillStyle = '#101214'; c.fillRect(W * 0.3, H * 0.04, W * 0.4, H * 0.84);
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.ellipse(W * 0.47, H * 0.64, W * 0.07, H * 0.06, 0.2, 0, 7); c.fill();
      c.fillStyle = 'rgba(214,190,140,0.5)'; c.fillRect(W * 0.3, H * 0.88, W * 0.4, H * 0.012);
      c.fillStyle = '#000'; c.fillRect(W * 0.42, H * 0.88, W * 0.05, H * 0.012); c.fillRect(W * 0.52, H * 0.88, W * 0.05, H * 0.012);
      glow(c, W * 0.5, H * 0.95, W * 0.3, 'rgba(214,190,140,A)', 0.1);
      break;
    }
    case 'mirror': { // 옷장 문 안쪽의 거울 (밤), 파티룸 화장실의 거울 (밝음)
      cover(c, mirrorScene({ cat: s.cat || s.suit, bright: mood === 'bright', droopy: s.droopy, morning: mood === 'day' }), W, H, 0.25);
      break;
    }
    case 'corridor': {
      // 복도식 아파트. 한쪽은 문, 한쪽은 난간.
      c.fillStyle = day ? '#4a5254' : '#0e1114';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(W * 0.52, H * 0.38); c.lineTo(W * 0.52, H * 0.62); c.lineTo(0, H); c.fill();
      for (let i = 0; i < 6; i++) {
        const p = i / 6, x = W * 0.03 + W * 0.47 * (1 - Math.pow(1 - p, 1.8)), sc = 1 - p * 0.8;
        c.fillStyle = day ? '#2f3537' : '#07090b';
        c.fillRect(x, H * 0.5 - H * 0.3 * sc, W * 0.045 * sc, H * 0.62 * sc);
        if (!day) glow(c, x + W * 0.03 * sc, H * 0.5 - H * 0.4 * sc, W * 0.13 * sc, 'rgba(200,214,205,A)', 0.14 * (Math.sin(t * 9 + i * 2) > 0.96 ? 0.3 : 1));
      }
      c.fillStyle = day ? '#3a4143' : '#0a0c0f'; c.beginPath(); c.moveTo(W, H * 0.66); c.lineTo(W * 0.52, H * 0.55); c.lineTo(W * 0.52, H * 0.62); c.lineTo(W, H); c.fill();
      if (!day) blocks(c, 3, H * 0.56, 0.05, false);
      break;
    }
    case 'stairs': {
      c.fillStyle = day ? '#2b3032' : '#090b0d';
      for (let i = 0; i < 9; i++) c.fillRect(W * (0.2 + i * 0.06), H * (0.82 - i * 0.07), W * 0.7, H * 0.08);
      glow(c, W * 0.2, H * 0.2, W * 0.22, day ? 'rgba(200,205,200,A)' : 'rgba(70,170,110,A)', day ? 0.25 : 0.22);
      break;
    }
    case 'playground':
    case 'complex':
    case 'recycle': {
      blocks(c, f === 'complex' ? 5 : 9, H * 0.66, f === 'recycle' ? 0.03 : 0.08, false);
      c.fillStyle = '#0a0c0e'; c.fillRect(0, H * 0.66, W, H * 0.34);
      const lx = f === 'recycle' ? W * 0.14 : W * 0.3;
      glow(c, lx, H * 0.36, W * 0.34, 'rgba(226,150,64,A)', f === 'recycle' ? 0.12 : 0.26);
      c.fillStyle = 'rgba(226,150,64,0.12)'; c.beginPath(); c.ellipse(lx, H * 0.78, W * 0.2, H * 0.07, 0, 0, 7); c.fill();
      c.fillStyle = '#050607'; c.fillRect(lx - 2, H * 0.36, 4, H * 0.42);
      if (f === 'playground') {
        c.strokeStyle = '#050607'; c.lineWidth = Math.max(3, W * 0.004); c.beginPath();
        c.moveTo(W * 0.5, H * 0.8); c.lineTo(W * 0.55, H * 0.5); c.lineTo(W * 0.75, H * 0.5); c.lineTo(W * 0.8, H * 0.8); c.stroke();
        c.lineWidth = 1.5;
        for (const [x, sw] of [[0.6, Math.sin(t * 0.9) * 0.006], [0.7, 0]] as const) {
          c.beginPath(); c.moveTo(W * (x - 0.012), H * 0.5); c.lineTo(W * (x - 0.012 + sw), H * 0.72);
          c.moveTo(W * (x + 0.012), H * 0.5); c.lineTo(W * (x + 0.012 + sw), H * 0.72); c.stroke();
          c.fillStyle = '#050607'; c.fillRect(W * (x - 0.016 + sw), H * 0.72, W * 0.032, H * 0.008);
        }
        if (s.suit) drawCat(c, W * 0.7, H * 0.6, H * 0.055, s.droopy, 0.95);
      } else if (f === 'recycle') {
        c.fillStyle = '#060809';
        for (let i = 0; i < 4; i++) c.fillRect(W * (0.46 + i * 0.1), H * 0.56, W * 0.08, H * 0.2);
      }
      break;
    }
    case 'slide': { // 미끄럼틀 밑. 그림 위로 비가 계속 내린다.
      cover(c, slideScene(s.droopy), W, H, 0.4);
      rain(c, t, 0.16);
      break;
    }
    case 'subway': {
      c.fillStyle = '#20262a'; c.fillRect(0, H * 0.16, W, H * 0.3);
      for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(8,10,12,${0.9})`; c.fillRect(W * (0.03 + i * 0.2), H * 0.2, W * 0.15, H * 0.22); }
      c.fillStyle = 'rgba(214,220,214,0.22)'; c.fillRect(0, H * 0.1, W, H * 0.02);
      crowd(11, H * 0.86, H * 0.5, 21);
      break;
    }
    case 'crowd': crowd(34, H * 0.9, H * 0.52, 33); break;
    case 'gate': {
      for (let i = 0; i < 6; i++) { c.fillStyle = '#12161a'; c.fillRect(W * (0.1 + i * 0.14), H * 0.56, W * 0.05, H * 0.24); c.fillStyle = 'rgba(90,190,120,0.5)'; c.fillRect(W * (0.115 + i * 0.14), H * 0.57, W * 0.02, H * 0.012); }
      crowd(12, H * 0.92, H * 0.46, 41);
      break;
    }
    case 'platform': {
      c.fillStyle = 'rgba(214,220,214,0.18)'; c.fillRect(0, H * 0.14, W, H * 0.02);
      c.fillStyle = '#0c0f12'; c.fillRect(0, H * 0.76, W, H * 0.24);
      c.fillStyle = 'rgba(210,190,90,0.35)'; c.fillRect(0, H * 0.76, W, H * 0.012);
      c.fillStyle = '#101418'; c.fillRect(W * 0.36, H * 0.62, W * 0.28, H * 0.03);
      person(c, W * 0.5, H * 0.66, H * 0.3, '#07090b');
      break;
    }
    case 'street': {
      const r = rnd(51);
      for (let i = 0; i < 7; i++) {
        const x = W * (i * 0.15 - 0.02), h = H * (0.3 + r() * 0.3);
        c.fillStyle = day ? '#2c3336' : '#0b0d10'; c.fillRect(x, H * 0.7 - h, W * 0.13, h);
        if (!day) { const col = ['rgba(214,96,96,A)', 'rgba(96,170,214,A)', 'rgba(214,180,96,A)'][i % 3]; glow(c, x + W * 0.06, H * 0.6, W * 0.07, col, 0.3); }
      }
      c.fillStyle = day ? '#23282a' : '#090b0d'; c.fillRect(0, H * 0.7, W, H * 0.3);
      if (!day) { rain(c, t, 0.09); for (let i = 0; i < 7; i++) glow(c, W * (i * 0.15 + 0.04), H * 0.8, W * 0.06, ['rgba(214,96,96,A)', 'rgba(96,170,214,A)', 'rgba(214,180,96,A)'][i % 3], 0.1); }
      crowd(day ? 9 : 5, H * 0.94, H * 0.4, 61);
      break;
    }
    case 'party': {
      if (mood === 'warm') {
        for (let i = 0; i < 12; i++) glow(c, W * (0.06 + i * 0.08), H * (0.14 + Math.sin(i * 1.3) * 0.02), W * 0.07, 'rgba(240,190,110,A)', 0.36 + Math.sin(t * 1.4 + i) * 0.04);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, H * 0.78, W, H * 0.22);
        const r = rnd(71);
        for (let i = 0; i < 7; i++) person(c, W * (0.12 + i * 0.125), H * (0.86 + r() * 0.05), H * (0.34 + r() * 0.1), '#1a120c', r() < 0.6);
      } else {
        c.fillStyle = '#17191c'; c.fillRect(W * 0.4, H * 0.14, W * 0.2, H * 0.7);
        if (mood === 'door') glow(c, W * 0.5, H * 0.84, W * 0.22, 'rgba(240,190,110,A)', 0.2);
      }
      break;
    }
    case 'living': {
      if (mood === 'rain') { c.fillStyle = 'rgba(140,152,160,0.5)'; c.fillRect(W * 0.6, H * 0.16, W * 0.28, H * 0.36); rain(c, t, 0.05); }
      else glow(c, W * 0.74, H * 0.56, W * 0.3, 'rgba(110,140,190,A)', 0.2 + Math.sin(t * 5.3) * 0.05);
      c.fillStyle = '#08090b'; c.fillRect(W * 0.1, H * 0.62, W * 0.34, H * 0.16); c.fillRect(W * 0.68, H * 0.5, W * 0.14, H * 0.14);
      const r = rnd(81); for (let i = 0; i < 6; i++) c.fillRect(W * (0.46 + r() * 0.16), H * 0.74, W * 0.008, H * 0.05);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, H * 0.78, W, H * 0.22);
      break;
    }
    case 'store': {
      cover(c, storeScene(s.suit, s.droopy), W, H, 0.4);
      break;
    }
    case 'campus': {
      if (mood === 'bright') { for (let i = 0; i < 4; i++) { c.fillStyle = '#394144'; c.fillRect(W * (0.08 + i * 0.23), H * 0.66, W * 0.17, H * 0.02); } crowd(10, H * 0.7, H * 0.3, 91); }
      else { c.fillStyle = '#1d2325'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(W * (0.14 + i * 0.25), H * 0.34, W * 0.09, 0, 7); c.fill(); c.fillRect(W * (0.135 + i * 0.25), H * 0.34, W * 0.01, H * 0.4); } c.fillRect(W * 0.38, H * 0.72, W * 0.24, H * 0.02); }
      break;
    }
    case 'grandma': cover(c, grandmaScene(), W, H, 0.55); break; // 4장 회상. 이 게임에서 유일하게 색이 있는 장면
    case 'funeral': cover(c, funeralScene(), W, H, 0.6); break;    // 입구를 막아선 검은 등
    case 'er': cover(c, erScene(), W, H, 0.4); break;              // 누워서 본 천장
    case 'dorm': {
      c.fillStyle = '#0a0b0d'; c.fillRect(W * 0.1, H * 0.34, W * 0.5, H * 0.04); c.fillRect(W * 0.1, H * 0.68, W * 0.5, H * 0.04);
      glow(c, W * 0.36, H * 0.6, W * 0.16, 'rgba(170,190,220,A)', 0.22);
      break;
    }
  }
  if (s.suit && f !== 'mirror' && f !== 'playground' && f !== 'store' && f !== 'slide') drawCat(c, W * 0.9, H * 0.86, H * 0.05, s.droopy, 0.9);
}

export class SceneView {
  private c: C;
  state: SceneState;
  private prev: HTMLCanvasElement;
  private fadeAt = -1e9; // 장면이 바뀐 시각 (ms)
  private t0 = performance.now();
  private canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, state: SceneState) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d')!;
    this.state = state;
    this.prev = document.createElement('canvas');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    let last = 0;
    const loop = (now: number): void => {
      if (now - last > 50) { last = now; this.frame((now - this.t0) / 1000); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const d = Math.min(1.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(320, Math.round(r.width * d));
    this.canvas.height = Math.max(180, Math.round(r.height * d));
    this.prev.width = this.canvas.width; this.prev.height = this.canvas.height;
  }
  /** 장면이 바뀔 때 부른다. 이전 화면에서 천천히 넘어간다. */
  cut(): void {
    const pc = this.prev.getContext('2d')!;
    pc.globalAlpha = 1; pc.drawImage(this.canvas, 0, 0);
    this.fadeAt = performance.now();
  }
  private frame(t: number): void {
    W = this.canvas.width; H = this.canvas.height; frameDroopy = this.state.droopy;
    const c = this.c;
    c.globalAlpha = 1;
    draw(c, this.state, t);
    const k = (performance.now() - this.fadeAt) / 900; // 화면이 가려져 있어도 시간으로 넘어간다
    if (k < 1) { c.globalAlpha = 1 - k; c.drawImage(this.prev, 0, 0); c.globalAlpha = 1; }
  }
}

// 글 사이에 끼는 사진·영상·종이. 전부 자리 표시용 그림이다.
/** 사진·영상 속 삼색이의 눈매: 플레이어가 고른 것. SceneView 가 장면을 그릴 때마다 맞춘다. */
let frameDroopy = false;
export function drawFrame(cv: HTMLCanvasElement, art: string): void {
  const droopy = frameDroopy;
  const c = cv.getContext('2d')!;
  const w = (W = cv.width), h = (H = cv.height);
  c.fillStyle = '#14171a'; c.fillRect(0, 0, w, h);
  switch (art) {
    case 'bear': cover(c, bearPhoto(), w, h); break; // 어린이날 복지관: 불곰과 아이 넷
    case 'group': cover(c, groupPhoto(droopy), w, h); break;
    case 'album':
    case 'portrait': {
      cover(c, yearbook(art === 'album'), w, h);
      if (art === 'album') { // 볼펜 글씨
        const k = w / 240;
        c.save(); c.translate(ALBUM_NOTE.x * k, ALBUM_NOTE.y * k); c.rotate(-0.06);
        c.fillStyle = '#2a3f9a'; c.font = `${Math.round(11 * k)}px "Nanum Pen Script", "Gaegu", cursive`; c.textAlign = 'center';
        c.fillText('임대 고양이', 0, 0); c.restore();
      }
      break;
    }
    case 'video':
    case 'video_face':
    case 'thumbnail': {
      cover(c, art === 'video' ? videoPlayground(droopy) : videoFace(droopy), w, h);
      const k = w / 240;
      if (art === 'thumbnail') { // 옆얼굴에 빨간 동그라미, 고양이 머리에 빨간 화살표, 노란 글씨
        c.save(); c.strokeStyle = '#ff2a2a'; c.lineWidth = 3 * k;
        c.beginPath(); c.ellipse(124 * k, 48 * k, 30 * k, 34 * k, 0, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(222 * k, 62 * k); c.lineTo(194 * k, 86 * k); c.stroke();
        c.fillStyle = '#ff2a2a'; c.beginPath(); c.moveTo(188 * k, 92 * k); c.lineTo(190 * k, 78 * k); c.lineTo(201 * k, 88 * k); c.fill();
        c.font = `900 ${Math.round(20 * k)}px sans-serif`; c.textAlign = 'left'; c.lineJoin = 'round';
        c.lineWidth = 5 * k; c.strokeStyle = '#000'; c.fillStyle = '#ffe14a';
        c.strokeText('충격 정체', 10 * k, 126 * k); c.fillText('충격 정체', 10 * k, 126 * k);
        c.restore();
      } else { // 재생 표시
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(w * 0.47, h * 0.4); c.lineTo(w * 0.47, h * 0.6); c.lineTo(w * 0.55, h * 0.5); c.fill();
      }
      break;
    }
    case 'grandma': cover(c, grandmaPhoto(), w, h); break; // 바랜 컬러 사진. 사람에게는 얼굴을 그리지 않는다.
    case 'capture': {
      c.fillStyle = '#9fb0bd'; c.fillRect(0, 0, w, h);
      const r = rnd(13);
      for (let i = 0; i < 6; i++) { c.fillStyle = '#f2f2ee'; c.fillRect(w * 0.14, h * (0.08 + i * 0.15), w * (0.3 + r() * 0.4), h * 0.09); c.fillStyle = '#6f8090'; c.beginPath(); c.arc(w * 0.07, h * (0.12 + i * 0.15), h * 0.04, 0, 7); c.fill(); }
      break;
    }
    case 'tally': {
      c.fillStyle = '#1a1512'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(200,190,170,0.5)'; c.lineWidth = 1.5;
      const r = rnd(17);
      for (let i = 0; i < 46; i++) { const x = w * (0.08 + (i % 16) * 0.055), y = h * (0.18 + Math.floor(i / 16) * 0.27); c.beginPath(); c.moveTo(x + r() * 3, y); c.lineTo(x + r() * 4 - 2, y + h * 0.16); c.stroke(); }
      break;
    }
    case 'paper':
    case 'card': {
      c.fillStyle = '#101214'; c.fillRect(0, 0, w, h);
      c.save(); c.translate(w * 0.5, h * 0.5); c.rotate(-0.04);
      const pw = art === 'card' ? w * 0.5 : w * 0.42, ph = art === 'card' ? h * 0.56 : h * 0.84;
      c.fillStyle = art === 'card' ? '#b9c0c4' : '#d6d2c6'; c.fillRect(-pw / 2, -ph / 2, pw, ph);
      c.fillStyle = 'rgba(40,44,48,0.5)';
      for (let i = 0; i < (art === 'card' ? 3 : 8); i++) c.fillRect(-pw * 0.38, -ph * 0.36 + i * ph * 0.1, pw * (0.4 + ((i * 37) % 30) / 100), ph * 0.025);
      c.restore();
      break;
    }
  }
}
