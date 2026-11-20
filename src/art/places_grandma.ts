// 4장: 할머니 집 마당. 열여섯 살 7월. 이 게임에서 유일하게 색이 있는 장면이다.
// "고추가 빨갛다. 고추 잎은 초록이다. 하늘이 파랗다. 슬레이트 지붕이 녹슬어서 주황이다."
// 빛은 왼쪽 위(여름 오후)에서 온다. 그림자는 오른쪽 아래로 짧다. 낮과 밤을 가르지 않는다: 이 장면은 늘 그 여름 오후다.
// 색은 past.ts 의 grandmaScene() 과 같은 집으로 읽히게 맞췄다.
import { Pix, mix, rnd } from './pix.ts';
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { MAPS } from '../maps.ts';

// ── 색 ──
const SKY = ['#3d7cc6', '#4887ce', '#5594d6', '#64a1dc', '#78b0e2', '#90c0e8'];
const RUST = { L: '#d88c50', M: '#bd6c37', D: '#96502a', DD: '#6c3418' }; // 녹슨 슬레이트
const DIRT = { B: '#d8b986', L: '#e3c897', D: '#cbaa78', DD: '#b39064', LL: '#eedaae' }; // 다져진 황토
const GRASS = ['#9ccc62', '#6aa844', '#4a8a36', '#2f652a'];
const LEAF = ['#5fae48', '#43903a', '#2f722e', '#1f5424'];   // 고추 잎
const RED = { L: '#f2603e', M: '#d6321c', D: '#9a1e12' };    // 고추
const STONE = ['#b7ad99', '#a59b86', '#c2b8a2', '#998f7b', '#ada48e'];
const ONGGI = { L: '#8e5434', M: '#6e3c22', D: '#45230f', DD: '#2b1508', HI: '#c8977a' };
const WOOD = { L: '#d39f66', M: '#b88450', D: '#9a6a3c', DD: '#6e4626', G: '#7a4e2a' };
const SHADOW = '#6a4a2c';

/** 돌담의 앞면: 크고 작은 돌을 진흙으로 쌓았다. 빛은 왼쪽 위라서 돌마다 위·왼쪽 가장자리가 밝다. */
function stones(L: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  L.rect(x0, y0, w, h, '#8f7a5c');
  for (let y = y0, row = 0; y < y0 + h; row++) {
    const rh = 5 + Math.floor(rnd(row, 1, seed) * 3);
    for (let x = x0 - Math.floor(rnd(row, 2, seed) * 7), k = 0; x < x0 + w; k++) {
      const sw = 6 + Math.floor(rnd(row, k, seed + 3) * 7);
      const base = STONE[Math.floor(rnd(k, row, seed + 5) * STONE.length)];
      const hi = mix(base, '#fff6e0', 0.28), lo = mix(base, '#2a2014', 0.3);
      for (let j = 0; j < rh - 1; j++) for (let i = 0; i < sw - 1; i++) {
        if ((i === 0 || i === sw - 2) && (j === 0 || j === rh - 2)) continue; // 모서리를 둥글게
        const px = x + 1 + i, py = y + j;
        if (px < x0 || px >= x0 + w || py < y0 || py >= y0 + h) continue;
        let col = j === 0 || i === 0 ? hi : j === rh - 2 || i === sw - 2 ? lo : base;
        if (col === base && rnd(px, py, seed + 7) > 0.9) col = mix(base, '#000000', 0.08);
        L.set(px, py, col);
      }
      x += sw;
    }
    y += rh;
  }
  for (let x = x0; x < x0 + w; x++) if (rnd(x, y0, seed + 9) > 0.8) L.set(x, y0 + h - 1 - Math.floor(rnd(x, 1, seed + 9) * 2), GRASS[2]); // 담 밑의 풀
}
/** 담 위에 얹은 기와: 위에서 비스듬히 본 한 줄. 수키와 골이 세로로 서고, 앞끝이 둥근 막새. */
function giwaCap(L: Pix, x0: number, x1: number, y: number, seed: number): void {
  for (let x = x0; x < x1; x++) {
    const k = (x - x0) % 6;
    L.set(x, y, '#5b6064'); L.set(x, y + 1, '#8f9598');               // 용마루 같은 꼭대기 줄
    for (let j = 2; j < 7; j++) L.set(x, y + j, k === 0 ? '#9aa0a2' : k === 1 ? '#80878a' : k === 4 ? '#4c5256' : '#666c70');
    L.set(x, y + 7, k < 4 ? '#3e4347' : '#565c60');                   // 막새의 둥근 끝
    if (k > 0 && k < 4) L.set(x, y + 8, '#3e4347');
    if (rnd(x, y, seed) > 0.9) L.set(x, y + 3 + Math.floor(rnd(x, 2, seed) * 3), '#5f7a40'); // 기와 틈 이끼
  }
  for (let x = x0; x < x1; x++) L.set(x, y + 9, '#4a3a28', 0.55); // 기와 밑 그늘
}
/** 세로로 달리는 담(양옆)의 윗면. 위에서 내려다본 기와: 가운데 마루가 밝고, 기와 끝이 비늘처럼 겹친다. */
function sideCap(p: Pix, x0: number, w: number, y0: number, y1: number): void {
  const mid = x0 + (w >> 1);
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) % 6;
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.abs(x - mid), left = x < mid;
      let col = left ? '#7a8084' : '#62686c';
      if (dx === 0) col = k === 0 ? '#9aa0a2' : '#8a9092';
      else if (k === 5 - Math.min(3, dx >> 1)) col = '#4c5256';                 // 기와 끝의 그늘 (가장자리로 갈수록 처진다)
      else if (k === 4 - Math.min(3, dx >> 1) && left) col = '#8e9497';
      if (x === x0) col = '#565c60'; else if (x === x0 + w - 1) col = '#3e4347';
      p.set(x, y, col);
    }
  }
}
/** 부드러운 값 잡음 (0..1). s 는 얼룩 크기. */
function vnoise(x: number, y: number, s: number, seed: number): number {
  const gx = Math.floor(x / s), gy = Math.floor(y / s), u0 = x / s - gx, v0 = y / s - gy;
  const u = u0 * u0 * (3 - 2 * u0), v = v0 * v0 * (3 - 2 * v0);
  const a = rnd(gx, gy, seed), b = rnd(gx + 1, gy, seed), c = rnd(gx, gy + 1, seed), d = rnd(gx + 1, gy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** 다져진 마당 흙. 넓은 얼룩 두 겹(경계만 살짝 디더)과 알갱이. */
function dirt(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), big = vnoise(x, y * 1.5, 20, seed + 2) * 0.7 + vnoise(x, y, 6, seed + 3) * 0.3;
    const d = ((x + y) & 1) ? 0.015 : -0.015;
    let col = big + d > 0.64 ? DIRT.D : big + d < 0.36 ? DIRT.L : DIRT.B;
    if (n > 0.975) col = DIRT.DD; else if (n < 0.02) col = DIRT.LL;
    p.set(x, y, col);
  }
  for (let i = 0; i < Math.floor(w * h / 900); i++) { // 자갈
    const x = x0 + Math.floor(rnd(i, 1, seed + 3) * w), y = y0 + Math.floor(rnd(i, 2, seed + 3) * h);
    const c = rnd(i, 3, seed + 3) > 0.5 ? '#c9c1ad' : '#b0a690';
    p.set(x, y, mix(c, '#ffffff', 0.25)); p.set(x + 1, y, c); p.set(x + 1, y + 1, '#8a6c48'); p.set(x + 2, y + 1, '#a8885e', 0.6);
  }
}
/** 풀 한 포기. 짧은 그림자를 오른쪽 아래에 둔다. */
function tuft(p: Pix, x: number, y: number, seed: number, n = 5): void {
  p.hl(x - 1, y + 1, n + 1, SHADOW, 0.3);
  for (let i = 0; i < n; i++) {
    const bx = x - (n >> 1) + i, hgt = 2 + Math.floor(rnd(i, seed, 41) * (n > 4 ? 4 : 3)), lean = rnd(seed, i, 42) > 0.5 ? 1 : -1;
    for (let k = 0; k < hgt; k++) p.set(bx + (k === hgt - 1 && hgt > 2 ? lean : 0), y - k, k === hgt - 1 ? GRASS[0] : k === 0 ? GRASS[3] : i % 2 ? GRASS[1] : GRASS[2]);
  }
}
/** 고추 한 줄(이랑). 잎 덤불 사이로 빨간 고추가 늘어지고, 지주대가 박혀 있다. s 는 멀수록 작다. */
function gochuRow(p: Pix, x0: number, x1: number, by: number, hgt: number, seed: number): void {
  for (let x = x0; x < x1; x++) p.set(x, by + 1, '#a5825a'); // 고랑
  for (let x = x0; x < x1; x++) {
    const tp = by - hgt + Math.round(rnd(x >> 1, seed, 51) * 2 + Math.sin(x * 0.7 + seed) * 0.8);
    for (let y = tp; y <= by; y++) {
      const t = (y - tp) / Math.max(1, by - tp), n = rnd(x, y, seed + 52);
      let col = t < 0.25 ? (n > 0.4 ? LEAF[0] : LEAF[1]) : t > 0.8 ? LEAF[3] : n > 0.72 ? LEAF[0] : n > 0.3 ? LEAF[1] : LEAF[2];
      if (y === tp && n > 0.6) continue;
      p.set(x, y, col);
    }
    if (rnd(x, seed, 53) > 0.78) { // 고추: 위가 초록 꼭지, 아래로 빨갛게
      const py = tp + 1 + Math.floor(rnd(x, seed, 54) * Math.max(1, hgt - 3)), len = hgt > 6 ? 3 : 2;
      p.set(x, py - 1, LEAF[2]); p.set(x, py, RED.L);
      for (let k = 1; k < len; k++) p.set(x, py + k, k === len - 1 ? RED.D : RED.M);
    }
  }
  for (let x = x0 + 3 + Math.floor(rnd(seed, 0, 55) * 5); x < x1; x += 9) p.vl(x, by - hgt - 2, hgt + 2, '#9a8462'); // 지주대
  for (let x = x0 + 3 + Math.floor(rnd(seed, 0, 55) * 5); x < x1; x += 9) p.set(x, by - hgt - 2, '#c8b48c');
}
/** 옹기 항아리. (cx, by) 는 바닥 가운데. 어깨가 넓고 입이 좁다. 유약이 번들거린다. */
function jar(p: Pix, cx: number, by: number, h: number, rx: number, seed: number): void {
  p.ell(cx + 3, by, rx + 1, 2.2, SHADOW, 0.35);
  const ty = by - h;
  for (let y = ty; y < by; y++) {
    const t = (y - ty) / h;
    const w = rx * (t < 0.12 ? 0.62 : t < 0.35 ? 0.62 + (t - 0.12) / 0.23 * 0.38 : 1 - Math.pow((t - 0.35) / 0.65, 2) * 0.3);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const k = (x - cx) / w;
      let col = k < -0.55 ? ONGGI.L : k > 0.6 ? ONGGI.D : ONGGI.M;
      if (k > 0.88) col = ONGGI.DD;
      if (t > 0.18 && t < 0.62 && k > -0.42 && k < -0.25) col = ONGGI.HI;         // 유약 빛줄기
      if (Math.abs(t - 0.32) < 0.04 && k < 0.5) col = mix(col, '#d0a080', 0.3);    // 어깨의 띠
      if (y === by - 1) col = ONGGI.DD;
      if (rnd(x, y, seed) > 0.97) col = mix(col, '#c8a070', 0.3);                    // 유약 얼룩
      p.set(x, y, col);
    }
  }
  // 뚜껑: 얕은 옹기 뚜껑, 위가 밝다
  const lw = rx * 0.72;
  p.ell(cx, ty, lw, 2.2, ONGGI.M); p.ell(cx - 1, ty - 1, lw - 1.5, 1.6, ONGGI.L); p.hl(Math.round(cx - lw + 2), ty - 2, Math.max(2, Math.round(lw)), mix(ONGGI.L, '#ffffff', 0.25));
  p.rect(cx - 1, ty - 3, 3, 2, ONGGI.D); p.set(cx - 1, ty - 3, ONGGI.HI); // 꼭지
}
/** 흰 뭉게구름 한 조각. 밑이 평평하고 오른쪽 아래가 푸르스름하다. */
function cloud(p: Pix, cx: number, cy: number, blobs: number[][]): void {
  const L = new Pix(p.w, p.h);
  for (const [dx, dy, rx, ry] of blobs) L.ell(cx + dx, cy + dy, rx, ry, '#ffffff');
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    if (!L.alpha(x, y)) continue;
    if (y > cy + 5) continue; // 밑이 납작하다
    const up = !L.alpha(x, y - 2) || !L.alpha(x - 2, y - 1);
    const dn = y >= cy + 3 || !L.alpha(x + 2, y + 1) || !L.alpha(x, y + 2);
    p.set(x, y, up && !dn ? '#ffffff' : dn ? (y >= cy + 4 ? '#b4cde4' : '#d4e3f0') : '#f2f7fb');
  }
}

export function grandma(_s: PlaceState): Place {
  const m = MAPS.grandma, top = m.top || 72, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T;
  const GY = iy(1);               // 마당 흙이 시작되는 줄 (집 앞, 수돗가 밑동)
  const HX0 = 10, HX1 = 228;      // 집 앞면 (1~13열과 처마)

  // ═══ 하늘: 띠로 나눈 파랑. 띠 사이만 살짝 섞는다. ═══
  for (let y = 0; y < 64; y++) for (let x = 0; x < W; x++) {
    const v = (y / 64) * (SKY.length - 1); let b = Math.floor(v);
    if (v - b > 0.78 && ((x + y) & 1)) b++;
    p.set(x, y, SKY[Math.min(SKY.length - 1, b)]);
  }
  cloud(p, 292, 14, [[0, 0, 11, 7], [12, 2, 9, 6], [-11, 3, 8, 5], [5, -5, 8, 6], [22, 4, 6, 4], [-20, 5, 5, 3]]);
  cloud(p, 196, 7, [[0, 0, 6, 3.5], [7, 1, 5, 3], [-6, 2, 4, 2.5]]);
  // 먼 산 두 겹: 여름 산은 짙다
  for (let x = 0; x < W; x++) {
    const a = 24 + Math.round(Math.sin(x * 0.028 + 1) * 5 + Math.sin(x * 0.09) * 2);
    for (let y = a; y < 64; y++) p.set(x, y, y === a ? '#9cbcb0' : '#86aa9c');
    const b = 34 + Math.round(Math.sin(x * 0.05 + 3) * 4 + Math.sin(x * 0.17) * 1.5);
    for (let y = b; y < 64; y++) { const n = rnd(x >> 1, y >> 1, 3); p.set(x, y, y === b ? '#7aa860' : n > 0.8 ? '#4a7e3e' : n > 0.35 ? '#5a904a' : '#669c52'); }
  }
  // 전깃줄 하나가 하늘을 건너간다
  for (let x = 0; x < W; x++) p.set(x, Math.round(5 + Math.pow((x - 210) / 210, 2) * -4 + 4), '#30343c', 0.75);

  // ═══ 담 너머 고추밭 (오른쪽 위): 이랑이 멀수록 작다 ═══
  for (let y = 42; y < 80; y++) for (let x = 228; x < W; x++) p.set(x, y, rnd(x, y, 5) > 0.85 ? '#a5825a' : '#b8946a');
  gochuRow(p, 228, W, 45, 3, 1); gochuRow(p, 228, W, 50, 4, 2); gochuRow(p, 228, W, 56, 5, 3); gochuRow(p, 228, W, 63, 7, 4); gochuRow(p, 228, W, 72, 9, 5);

  // ═══ 마당 흙 ═══
  dirt(p, 0, GY, W, H - GY, 1);
  // 늘 밟는 길: 대문에서 마루로, 마루에서 수돗가로. 흙이 반들하게 밝다.
  for (let y = GY; y < iy(9); y++) for (let x = 16; x < W - 16; x++) {
    const onPath = Math.abs(x - (96 + (y - iy(9)) * -0.12)) < 12 || (y > iy(2) - 4 && y < iy(3) + 2 && x > 96 && x < 280);
    if (onPath && rnd(x, y, 47) > 0.55) p.set(x, y, DIRT.L, 0.6);
  }
  // ═══ 감나무 (왼쪽 위, 지붕 뒤): 반들거리는 잎, 아직 파란 감 ═══
  {
    const G = ['#86c058', '#5a9e40', '#3e7e34', '#285a28'];
    for (let y = -4; y < 40; y++) for (let x = -10; x < 48; x++) {
      let d = 9;
      for (let k = 0; k < 6; k++) {
        const ox = 16 + Math.cos(k * 1.13 + 0.4) * 16, oy = 14 + Math.sin(k * 1.13 + 0.4) * 9, rr = 12 + rnd(k, 1, 61) * 4;
        d = Math.min(d, Math.hypot(x - ox, (y - oy) * 1.15) / rr);
      }
      if (d > 1) continue;
      const lit = (16 - x) * 0.03 + (10 - y) * 0.05 + (rnd(x, y, 62) - 0.5) * 0.5 + (1 - d) * 0.35;
      p.set(x, y, d > 0.88 ? G[3] : lit > 0.45 ? G[0] : lit > 0 ? G[1] : lit > -0.45 ? G[2] : G[3]);
    }
    for (const [x, y] of [[8, 18], [26, 10], [32, 24], [14, 30]] as const) { p.ell(x, y, 1.6, 1.6, '#a8c060'); p.set(x - 1, y - 1, '#d8e890'); p.set(x, y - 2, '#3a5a28'); }
  }

  // ═══ 집: 녹슨 슬레이트 지붕 ═══
  const RY0 = 16, RY1 = 46;
  for (let y = RY0; y < RY1; y++) for (let x = HX0 - 4; x < HX1 + 6; x++) {
    const c = (x + 400) % 4, course = Math.floor((y - RY0) / 10), cy = (y - RY0) % 10;
    let col = c === 0 ? RUST.L : c === 2 ? RUST.D : RUST.M;
    const sheet = rnd((x + course * 7) >> 4, course, 31);                    // 장마다 녹이 슨 정도가 다르다
    if (sheet > 0.84) col = mix(col, '#a09888', 0.3);                        // 녹이 덜 슨 회색 슬레이트
    else if (sheet < 0.14) col = mix(col, RUST.DD, 0.15);
    if (rnd(x, course, 32) > 0.86 && cy > 2) col = mix(col, RUST.DD, 0.3);  // 빗물 따라 흐른 녹
    if (rnd(x >> 1, y, 33) > 0.97) col = mix(col, '#e0a060', 0.3);
    if (cy === 9) col = c === 2 ? RUST.DD : mix(col, RUST.DD, 0.55);         // 장과 장이 겹친 이음매
    if (cy === 0 && course > 0) col = mix(col, '#f0b070', 0.25);
    if (y > RY1 - 5 && rnd(x, y, 34) > 0.93) col = '#5e6a34';                // 처마 끝의 이끼
    p.set(x, y, col);
  }
  for (let x = HX0 - 4; x < HX1 + 6; x++) { // 용마루: 둥근 마룻장
    p.set(x, RY0 - 4, '#8a4422'); p.set(x, RY0 - 3, '#d6905a'); p.set(x, RY0 - 2, '#b8683a'); p.set(x, RY0 - 1, '#7a3a1c');
    if (x % 22 === 0) { p.vl(x, RY0 - 4, 4, '#6a3418'); }
  }
  for (let x = HX0 - 4; x < HX1 + 6; x++) { // 처마 끝: 골이 물결로 끝난다
    const c = (x + 400) % 4;
    p.set(x, RY1, c === 0 || c === 1 ? RUST.M : '#3a2414'); p.set(x, RY1 + 1, c === 0 ? RUST.D : '#2a1a10');
    p.set(x, RY1 + 2, '#4a3020'); // 처마널
  }
  p.vl(HX0 - 4, RY0 - 3, RY1 - RY0 + 5, '#6a3a20'); p.vl(HX1 + 5, RY0 - 3, RY1 - RY0 + 5, '#4a2614'); // 박공 끝

  // ═══ 벽: 흰 회벽, 처마 그늘 ═══
  const WY0 = RY1 + 3, WY1 = 86;
  for (let y = WY0; y < WY1; y++) for (let x = HX0; x < HX1; x++) {
    const n = rnd(x, y, 35), m = rnd(x >> 2, y >> 2, 36);
    let col = m > 0.85 ? '#e2d6ba' : n > 0.95 ? '#d8ccae' : '#ece2c8';
    if (y > WY1 - 6) col = mix(col, '#b8a07a', (y - WY1 + 6) / 10);          // 빗물에 튄 흙
    if (y < WY0 + 6) col = mix(col, '#8a7458', 0.42 - (y - WY0) * 0.05);    // 처마 그늘
    p.set(x, y, col);
  }
  for (let i = 0; i < 5; i++) { // 회벽의 실금
    let x = 30 + Math.floor(rnd(i, 1, 37) * 180), y = WY0 + 8 + Math.floor(rnd(i, 2, 37) * 20);
    for (let k = 0; k < 7; k++) { p.set(x, y, '#c4b494', 0.8); x += rnd(i, k, 38) > 0.5 ? 1 : 0; y++; }
  }
  // 창 하나 (왼쪽): 창호지 격자창
  {
    const x0 = 26, y0 = 55, w = 32, h = 18;
    p.rect(x0 - 2, y0 - 2, w + 4, h + 4, '#6a4428'); p.hl(x0 - 2, y0 - 2, w + 4, '#8a6038');
    p.rect(x0, y0, w, h, '#f2ead4');
    for (let x = x0 + 3; x < x0 + w; x += 4) p.vl(x, y0, h, '#a8875c');
    for (let y = y0 + 4; y < y0 + h; y += 5) p.hl(x0, y, w, '#a8875c');
    p.vl(x0 + 15, y0, h, '#6a4428'); p.vl(x0 + 16, y0, h, '#4e321c');
    p.rect(x0 + 1, y0 + 1, 5, 3, '#fbf6e8'); // 새로 바른 한 칸
    p.hl(x0 - 3, y0 + h + 2, w + 6, '#8a6038'); p.hl(x0 - 3, y0 + h + 3, w + 6, '#4e321c', 0.6);
  }
  // 창 둘 (가운데): 알루미늄 미닫이, 초록 방충망을 반쯤 닫았다. 안은 어둑하다.
  {
    const x0 = 116, y0 = 55, w = 34, h = 18;
    p.rect(x0 - 2, y0 - 2, w + 4, h + 4, '#b8bcb8'); p.hl(x0 - 2, y0 - 2, w + 4, '#e0e4e0'); p.vl(x0 + w + 1, y0 - 2, h + 4, '#8a8e8a');
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      let col = mix('#2e3a3e', '#46545a', (y - y0) / h);
      const d = (x - x0) - (y - y0);
      if (d > 2 && d < 5) col = mix(col, '#a8c8e0', 0.45);                   // 하늘이 비친다
      if (x >= x0 + 17 && ((x + y) % 2 === 0)) col = mix(col, '#6a8a62', 0.6); // 방충망
      p.set(x, y, col);
    }
    p.rect(x0 + 6, y0 + 9, 6, 9, '#3a3430'); p.hl(x0 + 6, y0 + 9, 6, '#5a4c40'); // 방 안 장롱 모서리
    p.vl(x0 + 16, y0, h, '#9a9e9a'); p.vl(x0 + 17, y0, h, '#d0d4d0');
    p.hl(x0 - 2, y0 + h + 2, w + 4, '#9a9e9a');
  }
  // 달력: 칠월. 빨간 머리띠와 큰 7.
  {
    const x0 = 94, y0 = 52;
    p.rect(x0, y0, 13, 17, '#f6f2e8'); p.rect(x0, y0, 13, 4, '#d0402c'); p.vl(x0 + 13, y0 + 1, 17, '#a89e88', 0.6); p.hl(x0 + 1, y0 + 17, 13, '#a89e88', 0.6);
    text(p, x0 + 5, y0 + 5, '7', '#2a2a30');
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) p.set(x0 + 1 + c * 2, y0 + 11 + r * 2, c === 0 ? '#d0402c' : '#7a7a80');
    p.set(x0 + 6, y0 - 1, '#5a5a5a');
  }
  // 밀짚모자: 기둥 못에 걸었다
  {
    const cx = 76, cy = 63;
    p.line(cx + 1, 54, cx - 2, cy - 4, '#8a7a60'); p.set(cx + 1, 54, '#4a4a4a');
    p.ell(cx, cy, 7.5, 3, '#c8a052'); p.ell(cx - 0.5, cy - 0.5, 6.5, 2.2, '#e6c474');
    p.ell(cx, cy - 2.5, 4, 2.6, '#dab460'); p.hl(cx - 4, cy - 1, 9, '#b83a26'); p.hl(cx - 3, cy - 4, 4, '#f2d890');
    p.hl(cx - 7, cy + 3, 14, '#9a7a3a', 0.5);
  }
  // 방 문 (10~12열): 창호지 미닫이 두 짝. 오른쪽 짝이 조금 열려 방 안 그늘이 보인다.
  const DX0 = 161, DX1 = 207, DY0 = 50;
  p.rect(DX0 - 2, DY0 - 2, DX1 - DX0 + 4, WY1 - DY0 + 2, '#5e3c22'); p.hl(DX0 - 2, DY0 - 2, DX1 - DX0 + 4, '#7e5634');
  p.rect(DX1 - 6, DY0, 5, WY1 - DY0, '#241a14'); p.rect(DX1 - 6, DY0 + 4, 5, 14, '#2e2620');
  for (const [x0, w] of [[DX0, 23], [DX0 + 21, 20]] as const) {
    p.rect(x0, DY0, w, WY1 - DY0, '#7a5232'); p.vl(x0, DY0, WY1 - DY0, '#9a6e44'); p.vl(x0 + w - 1, DY0, WY1 - DY0, '#4e321c');
    p.rect(x0 + 2, DY0 + 2, w - 4, 26, '#f4eedc');
    for (let x = x0 + 5; x < x0 + w - 2; x += 4) p.vl(x, DY0 + 2, 26, '#a8875c');
    for (const y of [DY0 + 9, DY0 + 18]) p.hl(x0 + 2, y, w - 4, '#a8875c');
    p.rect(x0 + 2, DY0 + 29, w - 4, 6, '#8e6440'); p.hl(x0 + 2, DY0 + 29, w - 4, '#a8794c'); // 궁판
    p.hl(x0 + 2, DY0 + 2, w - 4, '#d8ceb4');
  }
  p.dots(`${DX0 + 26},${DY0 + 13} ${DX0 + 27},${DY0 + 12} ${DX0 + 28},${DY0 + 13} ${DX0 + 27},${DY0 + 14}`, '#e0607a'); // 문고리 옆 창호지에 넣은 봉숭아 꽃잎
  p.set(DX0 + 27, DY0 + 15, '#6aa04a'); p.set(DX0 + 27, DY0 + 13, '#f4c0c8');
  p.rect(DX0 + 22, DY0 + 21, 2, 3, '#3a2a1c'); p.set(DX0 + 22, DY0 + 21, '#c8a058'); // 문고리
  // 13열 벽: 소쿠리를 걸었다
  p.ell(217, 62, 4.5, 4.5, '#c49a5a'); p.ell(217, 62, 3, 3, '#a87c40'); for (let a = 0; a < 6; a++) p.set(217 + Math.round(Math.cos(a) * 3.5), 62 + Math.round(Math.sin(a) * 3.5), '#e0bc78');
  p.set(217, 56, '#4a4a4a'); p.hl(214, 67, 7, '#9a8460', 0.5);
  // 기둥: 벽에 박힌 나무 기둥
  for (const x of [HX0, 84, 155, 208, HX1 - 4]) {
    p.rect(x, WY0 - 1, 4, WY1 - WY0 + 1, '#7e5634'); p.vl(x, WY0 - 1, WY1 - WY0 + 1, '#a0744a'); p.vl(x + 3, WY0 - 1, WY1 - WY0 + 1, '#56381f');
    for (let y = WY0 + 3; y < WY1; y += 7) if (rnd(x, y, 39) > 0.5) p.set(x + 1 + (y & 1), y, '#6a4628');
  }

  // ═══ 툇마루: 길게 깐 널, 앞귀틀, 밑의 어둠 ═══
  const MY0 = WY1, MY1 = 99, MX1 = 226; // 마루 오른쪽 끝: 14열은 걷는 칸이라 넘지 않는다
  for (let y = MY0; y < MY1; y++) {
    const plank = Math.floor((y - MY0) / 3.25), py = (y - MY0) % 3.25;
    for (let x = HX0 - 2; x < MX1; x++) {
      const n = rnd(x, y, 40);
      let col = plank % 2 ? WOOD.M : mix(WOOD.M, WOOD.L, 0.2);
      if (py < 1) col = WOOD.G;                                                 // 널 사이 틈
      else if (n > 0.93) col = WOOD.D; else if (n < 0.05) col = WOOD.L;
      if ((x + plank * 37) % 53 === 0) col = WOOD.G;                            // 널 이음
      if (y < MY0 + 4) col = mix(col, '#5a3a20', 0.32 - (y - MY0) * 0.07);      // 처마 그늘이 마루 안쪽에 진다
      p.set(x, y, col);
    }
  }
  p.hl(HX0 - 2, MY1 - 1, MX1 - HX0 + 2, WOOD.L);                                // 닳아서 반들한 앞 모서리
  for (let x = HX0 + 20; x < HX1 - 10; x += 3) if (rnd(x, 1, 43) > 0.6) p.set(x, MY1 - 2, mix(WOOD.L, '#ffffff', 0.2));
  p.rect(HX0 - 2, MY1, MX1 - HX0 + 2, 3, '#83552f'); p.hl(HX0 - 2, MY1 + 2, MX1 - HX0 + 2, '#5c3a1e'); p.vl(MX1 - 1, MY0, MY1 - MY0 + 3, '#6e4626'); // 앞귀틀
  for (let x = HX0 - 2; x < MX1; x++) { p.set(x, MY1 + 3, '#2e2014'); p.set(x, MY1 + 4, '#3a2a1a'); p.set(x, MY1 + 5, '#4e3a26', 0.7); }
  // 8~9열 마루 밑: 고양이가 드나드는 깊은 어둠. 귀틀이 거기만 높이 들려 있다.
  for (let x = 129; x < 147; x++) for (let y = MY1 + 1; y < MY1 + 6; y++) p.set(x, y, y < MY1 + 3 ? '#140c08' : '#1e140c');
  p.rect(129, MY1, 18, 1, '#5c3a1e');
  for (const x of [HX0, 84, 155, 208, HX1 - 4]) { p.rect(x - 1, MY1 + 2, 6, 4, '#a8a294'); p.hl(x - 1, MY1 + 2, 6, '#c8c2b4'); p.set(x + 4, MY1 + 5, '#6a6458'); } // 주춧돌

  // 마루 위 살림: 선풍기, 고추 말리는 채반, 할머니 방석과 노란 주전자
  { // 선풍기 (1~2열): 크림색 몸, 파란 날개
    const cx = 29, by = 96;
    p.ell(cx, by, 6, 2, '#e4ded0'); p.hl(cx - 5, by + 1, 11, '#a8a090'); p.ell(cx + 2, by + 2, 6, 1.5, SHADOW, 0.3);
    p.rect(cx - 1, 79, 3, by - 79, '#ddd6c6'); p.vl(cx - 1, 79, by - 79, '#f4f0e6'); p.vl(cx + 1, 79, by - 79, '#a8a090');
    p.ell(cx, 73, 7.5, 7.5, '#c4ccd2'); p.ell(cx, 73, 6.5, 6.5, '#e8f0f4');
    for (const a of [0.3, 2.4, 4.5]) for (let r = 1; r < 6; r++) { p.set(Math.round(cx + Math.cos(a) * r), Math.round(73 + Math.sin(a) * r), '#5a9ad0'); p.set(Math.round(cx + Math.cos(a + 0.4) * r), Math.round(73 + Math.sin(a + 0.4) * r), '#8cc0e8'); }
    p.ell(cx, 73, 1.6, 1.6, '#2e6aa8'); p.set(cx - 1, 72, '#a8d0f0');
    for (let a = 0; a < 6.28; a += 0.5) p.set(Math.round(cx + Math.cos(a) * 7), Math.round(73 + Math.sin(a) * 7), '#9aa4ac');
    p.set(cx - 4, 69, '#ffffff');
  }
  { // 채반: 대나무 채반에 늘어놓은 빨간 고추
    const cx = 56, cy = 92;
    p.ell(cx + 2, cy + 3, 14, 3, SHADOW, 0.3);
    p.ell(cx, cy, 14, 5, '#a8823e'); p.ell(cx, cy - 0.5, 12.5, 4, '#d4b070');
    for (let x = cx - 12; x <= cx + 12; x += 2) for (let y = cy - 4; y <= cy + 3; y++) if (p.alpha(x, y) && rnd(x, y, 44) > 0.6) p.set(x, y, '#c09a58');
    for (let i = 0; i < 22; i++) {
      const x = cx - 10 + Math.floor(rnd(i, 1, 45) * 20), y = cy - 3 + Math.floor(rnd(i, 2, 45) * 6), dx = rnd(i, 3, 45) > 0.5 ? 1 : -1;
      p.set(x, y, RED.L); p.set(x + dx, y, RED.M); p.set(x + dx * 2, y, RED.D); p.set(x - dx, y, '#4a8a38');
    }
  }
  { // 할머니 자리 (6열): 바랜 남색 방석 한 장. 앉아 닳은 자리.
    const x0 = 96, y0 = 88;
    p.rect(x0 + 1, y0 + 1, 17, 8, SHADOW, 0.3);
    p.rect(x0, y0, 16, 8, '#4f6aa0'); p.hl(x0, y0, 16, '#7088b8'); p.vl(x0, y0, 8, '#6a82b4'); p.hl(x0, y0 + 7, 16, '#36487a'); p.vl(x0 + 15, y0, 8, '#3a4e82');
    for (const [x, y] of [[4, 3], [10, 2], [7, 5], [12, 5]] as const) { p.set(x0 + x, y0 + y, '#e8d880'); p.set(x0 + x + 1, y0 + y, '#e09098'); }
    p.set(x0, y0, '#36487a'); p.set(x0 + 15, y0 + 7, '#2a3a66');
  }
  { // 노란 양은 주전자와 사기 대접 하나
    const cx = 122, by = 96;
    p.ell(cx + 2, by + 1, 6, 1.6, SHADOW, 0.35);
    p.ell(cx, by - 4, 5, 4.2, '#d8a838'); p.ell(cx - 1.5, by - 5, 2.5, 2.4, '#f4d478'); p.set(cx - 2, by - 6, '#fff4c0');
    p.hl(cx - 4, by - 1, 9, '#a87a20'); p.rect(cx - 2, by - 10, 5, 2, '#c49830'); p.set(cx, by - 11, '#8a6a1a');
    p.line(cx + 5, by - 5, cx + 8, by - 8, '#c49830'); p.set(cx + 8, by - 9, '#d8a838');
    for (let a = 3.3; a < 6.1; a += 0.25) p.set(Math.round(cx + Math.cos(a) * 5), Math.round(by - 8 + Math.sin(a) * 4), '#8a6a1a'); // 손잡이
    p.ell(cx + 11, by - 1, 3, 1.4, '#e8e8e0'); p.hl(cx + 9, by - 1, 5, '#f8f8f4'); p.hl(cx + 9, by, 5, '#a8b0b0'); p.set(cx + 11, by - 2, '#6a9ac8');
  }

  // 처마·마루 밑에서 떨어진 짧은 그늘: 마루 앞 흙이 조금 어둡다
  for (let x = HX0 - 2; x < MX1 + 2; x++) for (let y = MY1 + 6; y < MY1 + 9; y++) if (rnd(x, y, 46) < 1 - (y - MY1 - 6) / 3) p.set(x, y, SHADOW, 0.28);
  // 섬돌 (10~12열 문 앞): 긴 화강석, 고무신 한 켤레와 낡은 운동화 한 켤레
  {
    const x0 = 166, y0 = 101, w = 38;
    p.rect(x0 + 3, y0 + 3, w, 7, SHADOW, 0.35);
    p.rect(x0, y0, w, 6, '#bab6aa'); p.hl(x0 + 1, y0, w - 2, '#d6d2c6'); p.vl(x0, y0 + 1, 5, '#ccc8bc');
    p.rect(x0, y0 + 6, w, 3, '#8c887e'); p.hl(x0, y0 + 8, w, '#6e6a62');
    for (let i = 0; i < 18; i++) p.set(x0 + 1 + Math.floor(rnd(i, 1, 48) * (w - 2)), y0 + 1 + Math.floor(rnd(i, 2, 48) * 5), rnd(i, 3, 48) > 0.5 ? '#a4a094' : '#e2dfd4');
    for (const sx of [x0 + 4, x0 + 9]) { p.rect(sx, y0 + 1, 4, 3, '#eeece6'); p.hl(sx, y0 + 3, 4, '#a8aaa8'); p.set(sx + 1, y0 + 1, '#5a5e64'); p.set(sx + 2, y0 + 1, '#5a5e64'); } // 흰 고무신
    for (const sx of [x0 + 22, x0 + 28]) { p.rect(sx, y0, 5, 4, '#e6e8ec'); p.hl(sx, y0 + 3, 5, '#7a7e86'); p.rect(sx + 1, y0, 3, 2, '#3a4a6a'); p.set(sx + 4, y0 + 1, '#4a78c0'); p.set(sx, y0, '#c8ccd2'); } // 운동화, 끈 하나가 풀렸다
    p.line(x0 + 33, y0 + 3, x0 + 36, y0 + 6, '#e6e8ec');
  }

  // ═══ 담 너머와 뒷담 (14~21열 위) ═══
  const BW0 = 228, BWT = 70;
  giwaCap(p, BW0, W, BWT, 3);
  stones(p, BW0, BWT + 9, W - BW0, GY - BWT - 9, 11);
  // 뒷담에 올라탄 호박 넝쿨: 큰 잎, 노란 꽃 하나, 파란 애호박
  {
    const vx = 250;
    for (let i = 0; i < 9; i++) {
      const lx = vx - 20 + Math.floor(rnd(i, 1, 63) * 34), ly = BWT + 2 + Math.floor(rnd(i, 2, 63) * 12), r = 3 + rnd(i, 3, 63) * 2;
      p.ell(lx, ly, r, r * 0.8, '#3e8a34'); p.ell(lx - 1, ly - 1, r * 0.6, r * 0.5, '#6ab048'); p.set(Math.round(lx + r * 0.6), Math.round(ly + r * 0.5), '#245a22');
    }
    p.line(vx - 22, BWT + 10, vx + 14, BWT + 4, '#4a8a30');
    p.ell(vx - 4, BWT + 6, 2.5, 2, '#f4c430'); p.set(vx - 4, BWT + 6, '#e08a10'); p.set(vx - 5, BWT + 5, '#fff0a0');
    p.ell(vx + 8, BWT + 15, 3.5, 2.5, '#7aa848'); p.ell(vx + 7, BWT + 14, 1.8, 1.2, '#a8d070'); p.set(vx + 11, BWT + 15, '#3a6a28');
  }
  p.hl(BW0, GY, W - BW0, '#5a4630', 0.5); for (let x = BW0; x < W; x++) if (rnd(x, 1, 49) > 0.5) p.set(x, GY + 1, SHADOW, 0.3); // 뒷담 그늘
  for (const [x, s] of [[232, 1], [246, 2], [296, 3], [342, 4]] as const) tuft(p, x, GY + 2, s, 6);

  // 빨랫줄: 집 모서리에서 오른쪽 담 기둥까지. 바지랑대가 가운데를 받친다. 흰 런닝, 분홍 수건, 꽃무늬 몸빼, 양말.
  {
    const ax = HX1 + 4, ay = 50, bx = W - 6, by = 54, sag = (x: number): number => Math.round(ay + (by - ay) * (x - ax) / (bx - ax) + Math.sin(Math.PI * (x - ax) / (bx - ax)) * 3);
    p.rect(bx - 1, by - 2, 3, GY - by + 2, '#7a5a38'); p.vl(bx - 1, by - 2, GY - by + 2, '#9a7a50'); // 담 위에 세운 말뚝
    for (let x = ax; x <= bx; x++) p.set(x, sag(x), '#e8e4dc');
    p.line(258, GY + 2, 287, sag(287) - 3, '#a88a50'); p.line(259, GY + 2, 288, sag(288) - 3, '#d0b878'); // 바지랑대: 수돗가 옆에 비스듬히 세웠다
    p.dots(`${286},${sag(287) - 4} ${289},${sag(287) - 4}`, '#a88a50');
    const hang = (x0: number, w: number, h: number, c: string, shade: string, pat?: (x: number, y: number) => string | null): void => {
      for (let x = x0; x < x0 + w; x++) {
        const y0 = sag(x) + 1, hh = h - (x === x0 || x === x0 + w - 1 ? 1 : 0);
        for (let y = y0; y < y0 + hh; y++) {
          let col = x > x0 + w - 3 ? shade : c;
          const q = pat?.(x - x0, y - y0); if (q) col = q;
          if (y === y0 + hh - 1) col = mix(col, '#000000', 0.12);
          p.set(x, y, col);
        }
        p.set(x + 2, sag(x) + 1 + hh, '#000000', 0.08);
      }
      p.set(x0 + 1, sag(x0 + 1), '#c8382a'); p.set(x0 + w - 2, sag(x0 + w - 2), '#3a8ad0'); // 빨래집게
    };
    hang(236, 10, 13, '#f8f8f4', '#d4d8dc', (x, y) => (y < 3 && x > 2 && x < 7 ? null : y < 1 ? '#e8ece8' : null));    // 런닝
    hang(252, 9, 14, '#f0a0b0', '#cc7a8c', (_x, y) => (y === 11 ? '#fff0f0' : null));                                   // 수건
    hang(266, 14, 12, '#6a5aa0', '#4c3e80', (x, y) => ((x * 5 + y * 3) % 7 === 0 ? '#f0d070' : (x * 3 + y * 7) % 11 === 0 ? '#e88aa8' : null)); // 몸빼
    hang(298, 3, 6, '#e8e4dc', '#bcb8b0'); hang(303, 3, 6, '#e8e4dc', '#bcb8b0');                                       // 양말
  }

  // ═══ 수돗가 (16~17열): 수도꼭지, 시멘트 개수대, 빨간 고무 대야, 바가지 ═══
  {
    const x0 = 256, x1 = 280, ty = 84;
    // 수돗가 시멘트 바닥: 네모나게 친 판, 모서리가 닳았다. 늘 젖어 있어 군데군데 짙다.
    const sx0 = 246, sx1 = 297, sy0 = ty + 6, sy1 = iy(2) + 6;
    p.rect(sx0 + 2, sy1, sx1 - sx0, 2, SHADOW, 0.35);
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      if ((x === sx0 || x === sx1 - 1) && (y === sy0 || y === sy1 - 1)) continue;
      const wet = vnoise(x, y, 6, 50) > 0.55;
      let col = wet ? '#9a9890' : rnd(x, y, 50) > 0.9 ? '#a8a69c' : '#bcbab0';
      if (y === sy0 || x === sx0) col = '#d0cec4';
      if (y === sy1 - 1 || x === sx1 - 1) col = '#86847a';
      p.set(x, y, col);
    }
    for (let y = sy1 - 7; y < sy1 - 2; y++) for (let x = 262; x < 280; x++) if (Math.hypot((x - 271) / 9, (y - sy1 + 4.5) / 2.6) < 1) p.set(x, y, y < sy1 - 5 ? '#9cc8e0' : '#78a8c8');
    p.hl(266, sy1 - 6, 5, '#e0f4fc'); // 고인 물에 비친 하늘
    for (let y = sy1; y < iy(3) + 2; y++) if (rnd(1, y, 51) > 0.2) { const x = 276 + Math.round(Math.sin(y * 0.45) * 2); p.set(x, y, '#a07e54', 0.7); p.set(x + 1, y, '#8cb4cc', 0.5); } // 흙으로 흘러간 물길
    // 수도관과 꼭지
    p.rect(264, 66, 3, ty - 64, '#7a8a96'); p.vl(264, 66, ty - 64, '#a8b8c4'); p.vl(266, 66, ty - 64, '#4e5a64');
    p.rect(262, 66, 9, 3, '#8a9aa6'); p.hl(262, 66, 9, '#c4d0d8'); p.rect(269, 68, 2, 4, '#6a7a86');
    p.rect(263, 63, 5, 2, '#b8323a'); p.vl(265, 61, 4, '#b8323a'); p.set(265, 61, '#e85a60'); // 빨간 손잡이
    p.vl(270, 72, 12, '#c8e8f8', 0.8); p.vl(270, 74, 8, '#ffffff', 0.5); // 가늘게 흐르는 물
    // 시멘트 개수대: 네모난 통, 안에 물이 고였다
    p.rect(x0 + 4, ty + 4, x1 - x0, 14, SHADOW, 0.35);
    p.rect(x0, ty, x1 - x0, 8, '#c4c2b8'); p.hl(x0, ty, x1 - x0, '#dedcd2'); p.vl(x0, ty, 8, '#d4d2c8');
    p.rect(x0 + 3, ty + 2, x1 - x0 - 6, 5, '#5e8ca8'); p.hl(x0 + 3, ty + 2, x1 - x0 - 6, '#4a6e86'); p.hl(x0 + 6, ty + 4, 8, '#a8d4ec'); p.set(x0 + 18, ty + 5, '#d8f0fa');
    p.rect(x0, ty + 8, x1 - x0, 9, '#a6a49a'); p.hl(x0, ty + 8, x1 - x0, '#8a887e'); p.vl(x1 - 1, ty + 8, 9, '#7c7a70'); p.hl(x0, ty + 16, x1 - x0, '#6e6c64');
    for (let i = 0; i < 12; i++) p.set(x0 + 1 + Math.floor(rnd(i, 1, 52) * (x1 - x0 - 2)), ty + 9 + Math.floor(rnd(i, 2, 52) * 7), rnd(i, 3, 52) > 0.5 ? '#949288' : '#b8b6ac');
    for (let x = x0 + 2; x < x1 - 2; x++) if (rnd(x, 3, 53) > 0.6) p.set(x, ty + 16, '#4a7a3a'); // 개수대 밑 이끼
    // 빨간 고무 대야: 물이 찰랑, 바가지가 떠 있다
    const bx = 279, byy = 98;
    p.ell(bx + 2, byy + 3, 8, 3, SHADOW, 0.35);
    p.ell(bx, byy, 8.5, 4.5, '#a82a20'); p.ell(bx, byy - 1, 8, 4, '#d43c2a'); p.ell(bx, byy - 1, 6.8, 3, '#e85a40');
    p.ell(bx, byy - 0.5, 6, 2.4, '#5a9ac0'); p.hl(bx - 4, byy - 2, 4, '#a8d8f0');
    p.ell(bx + 2, byy - 1, 3, 1.6, '#d4b878'); p.ell(bx + 1.5, byy - 1.5, 2, 1, '#f0dca0'); p.line(bx + 5, byy - 1, bx + 7, byy - 2, '#a8884a'); // 바가지
    p.hl(bx - 7, byy + 3, 15, '#8a2018');
  }
  // ═══ 장독대 (19~20열): 돌로 쌓은 단 위에 크고 작은 항아리 ═══
  {
    const x0 = 303, x1 = 337, ty = 88;
    p.rect(x0 + 3, ty + 4, x1 - x0, 12, SHADOW, 0.3);
    for (let y = ty; y < ty + 6; y++) for (let x = x0; x < x1; x++) p.set(x, y, y === ty ? '#d0cabc' : rnd(x, y, 54) > 0.85 ? '#a8a294' : '#bcb6a8');
    stones(p, x0, ty + 6, x1 - x0, 9, 12);
    p.hl(x0, ty + 6, x1 - x0, '#8e8676');
    jar(p, 321, ty + 3, 25, 10, 1);   // 큰 독 (뒤)
    jar(p, 311, ty + 6, 15, 6, 2);    // 중간 항아리
    jar(p, 330, ty + 6, 12, 5.5, 3);  // 작은 단지
  }

  // ═══ 양옆 담 (0열, 21열): 윗면을 내려다본다. 왼쪽 담은 마당에 짧은 그늘을 던진다. ═══
  for (let y = 64; y < H; y++) for (let x = 0; x < 3; x++) p.set(x, y, rnd(x, y, 56) > 0.4 ? GRASS[2] : GRASS[3]);
  sideCap(p, 2, 12, 64, H);
  for (let y = GY; y < iy(9); y++) { p.set(14, y, '#4a3a28', 0.5); p.set(15, y, SHADOW, 0.35); if (rnd(1, y, 57) > 0.5) p.set(16, y, SHADOW, 0.2); }
  sideCap(p, W - 14, 10, BWT, H);
  for (let y = BWT; y < H; y++) for (let x = W - 4; x < W; x++) { // 오른쪽 담 너머: 고추밭 이랑 끝
    const n = rnd(x, y, 58);
    p.set(x, y, n > 0.7 ? LEAF[0] : n > 0.3 ? LEAF[1] : LEAF[2]);
    if (rnd(x >> 1, y >> 2, 59) > 0.82 && (y & 3) < 2) p.set(x, y, (y & 3) === 0 ? RED.L : RED.M);
  }
  for (let y = GY; y < iy(9); y += 9) p.hl(W - 15, y + 4, 1, '#3e4347');

  // ═══ 마당의 풀 ═══
  for (let i = 0; i < 26; i++) { // 담 밑을 따라
    const side = i % 3, t = rnd(i, 1, 60);
    if (side === 0) tuft(p, 18 + Math.floor(rnd(i, 2, 60) * 4), GY + 8 + Math.floor(t * 110), i, 4 + (i & 1) * 2);
    else if (side === 1) tuft(p, W - 20 - Math.floor(rnd(i, 2, 60) * 6), GY + 20 + Math.floor(t * 98), i, 4 + (i & 1) * 2);
    else tuft(p, 20 + Math.floor(t * (W - 40)), iy(9) - 4 - Math.floor(rnd(i, 3, 60) * 4), i, 5);
  }
  for (const [x, y, n] of [[150, 128, 4], [196, 196, 5], [262, 150, 4], [70, 186, 3], [300, 186, 5], [120, 168, 3], [318, 132, 4], [176, 140, 3]] as const) tuft(p, x, y, x + y, n);
  // 질경이 두어 포기
  for (const [x, y] of [[236, 196], [44, 112]] as const) { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-1, 1], [1, 1]] as const) p.ell(x + dx, y + dy, 1.6, 1, '#4f8f3c'); p.set(x - 2, y - 1, '#7ab050'); p.set(x + 2, y + 1, '#2f652a'); }

  // ═══ 화단 (2~3열, 4~5줄): 돌로 두른 흙, 뒤에 봉숭아, 앞에 채송화 ═══
  const FX0 = 2 * T - 2, FX1 = 4 * T + 2, FY0 = iy(4) - 2, FY1 = iy(6) - 2;
  p.rect(FX0 + 3, FY0 + 3, FX1 - FX0, FY1 - FY0, SHADOW, 0.3);
  for (let y = FY0; y < FY1; y++) for (let x = FX0; x < FX1; x++) p.set(x, y, rnd(x, y, 64) > 0.8 ? '#6e4c30' : rnd(x, y, 65) > 0.5 ? '#80583a' : '#8a6242');
  const border = (x: number, y: number, s: number): void => { p.ell(x, y, 2.6, 2, '#a8a08e'); p.set(x - 1, y - 1, '#d4ccba'); p.set(x + 1, y + 1, '#6e6656'); p.set(x + 2, y + 2, SHADOW, 0.4); void s; };
  for (let x = FX0; x <= FX1; x += 5) { border(x, FY0, x); border(x, FY1, x + 1); }
  for (let y = FY0 + 5; y < FY1; y += 5) { border(FX0, y, y); border(FX1, y, y + 1); }
  // 채송화: 낮게 깔린 다육 잎과 알록달록한 꽃 (앞쪽, 바닥 그림)
  for (let i = 0; i < 70; i++) {
    const x = FX0 + 3 + Math.floor(rnd(i, 1, 66) * (FX1 - FX0 - 6)), y = FY0 + 14 + Math.floor(rnd(i, 2, 66) * (FY1 - FY0 - 17));
    p.set(x, y, rnd(i, 3, 66) > 0.5 ? '#7ab84a' : '#5a9a3a'); p.set(x + 1, y, '#8ccc58');
  }
  const SC = ['#f0388a', '#f8c830', '#f8803a', '#ffffff', '#e83050', '#c850d0'];
  for (let i = 0; i < 16; i++) {
    const x = FX0 + 4 + Math.floor(rnd(i, 1, 67) * (FX1 - FX0 - 8)), y = FY0 + 15 + Math.floor(rnd(i, 2, 67) * (FY1 - FY0 - 19)), c = SC[i % SC.length];
    p.dots(`${x},${y - 1} ${x - 1},${y} ${x + 1},${y} ${x},${y + 1}`, c); p.set(x, y, '#f8e070'); p.set(x + 1, y + 1, mix(c, '#000000', 0.3));
  }

  // ═══ 아래 담 바깥: 대문 앞 흙길 (9줄 5~6열) ═══
  const WT = iy(9);                         // 아래 담 기와의 꼭대기 줄
  for (let y = iy(9); y < H; y++) for (let x = 5 * T; x < 7 * T; x++) p.set(x, y, rnd(x, y, 68) > 0.9 ? DIRT.D : rnd(x, y, 69) > 0.5 ? DIRT.L : DIRT.LL);
  for (let y = iy(9); y < H; y++) { p.set(5 * T + 6, y, DIRT.DD, 0.5); p.set(7 * T - 7, y, DIRT.DD, 0.5); } // 경운기 바퀴 자국
  p.hl(5 * T, iy(9), 2 * T, '#a68660', 0.6); // 대문 문턱

  // ═══ 앞에 서는 것들 ═══
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void, foot: number): void => { const L = new Pix(W, H); draw(L); props.push(cut(L, top, foot)); };
  // 봉숭아: 화단 뒤쪽에 키 크게 선다. 줄기마다 잎겨드랑이에 분홍·빨강·흰 꽃이 조롱조롱.
  prop((L) => {
    const BC = [['#f6609c', '#c8346e'], ['#ec3448', '#a81e30'], ['#fff0f6', '#dcb4c8'], ['#f88abc', '#cc5c92']];
    for (let i = 0; i < 7; i++) {
      const sx = FX0 + 4 + i * 4 + Math.floor(rnd(i, 1, 70) * 2), sb = FY0 + 10 + (i % 2) * 3, sh = 15 + Math.floor(rnd(i, 2, 70) * 7);
      L.hl(sx, sb + 1, 3, SHADOW, 0.3);
      L.vl(sx, sb - sh, sh + 1, '#6a9a40'); L.vl(sx + 1, sb - sh + 3, sh - 3, '#4a7a30', 0.6);
      for (let k = 2; k < sh; k += 2) { // 어긋나게 달린 길쭉한 잎, 끝이 아래로 처진다
        const dir = (k / 2 + i) % 2 ? 1 : -1, ly = sb - k;
        L.set(sx + dir, ly, '#3e8a34'); L.set(sx + dir * 2, ly - 1, '#5aaa44'); L.set(sx + dir * 3, ly - 1, '#78c050'); L.set(sx + dir * 4, ly, '#4a9a3a');
        L.set(sx + dir * 2, ly, '#2f6a2a');
        if (k > 4 && rnd(i, k, 71) > 0.3) { // 꽃
          const c = BC[(i * 3 + k) % BC.length], fx = sx - dir;
          L.set(fx, ly, c[0]); L.set(fx - dir, ly, c[0]); L.set(fx, ly + 1, c[1]); L.set(fx - dir, ly - 1, mix(c[0], '#ffffff', 0.4));
        }
      }
      L.ell(sx, sb - sh, 2.2, 1.6, '#78c050'); L.set(sx - 1, sb - sh - 1, '#a0d870');
    }
  }, 4 * T);
  // 평상 (13~15열, 5~6줄): 나무 평상. 방석 하나, 부채 하나.
  prop((L) => {
    const x0 = 13 * T - 1, x1 = 16 * T + 1, y0 = iy(5) - 6, y1 = iy(7) - 14, legs = 7;
    L.rect(x0 + 5, y1 + 3, x1 - x0, legs + 1, SHADOW, 0.35);           // 오른쪽 아래로 진 그늘
    for (const lx of [x0 + 2, x1 - 5]) { L.rect(lx, y1 + 3, 3, legs, '#5e3e22'); L.vl(lx, y1 + 3, legs, '#7e5634'); } // 다리
    L.rect(x0 + 2, y1 + 3, x1 - x0 - 4, 2, '#4a3018', 0.8);             // 밑의 어둠
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {     // 널: 앞뒤로 길게 깔았고 사이가 조금 뜬다
      const k = (x - x0) % 7, n = rnd(x, y, 72);
      let col = k === 6 ? '#7a5030' : k === 0 ? '#e2b47a' : n > 0.92 ? '#b88650' : n < 0.06 ? '#e8bc84' : '#d4a46a';
      if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1) col = y === y0 || x === x0 ? '#e8bc84' : '#9a6a3c'; // 테두리 귀틀
      L.set(x, y, col);
    }
    L.rect(x0, y1, x1 - x0, 3, '#a8743e'); L.hl(x0, y1, x1 - x0, '#c48c52'); L.hl(x0, y1 + 2, x1 - x0, '#6e4626'); // 앞 귀틀
    L.vl(x1 - 1, y0, y1 - y0 + 3, '#7a5030');
    // 방석: 바랜 빨강, 흰 꽃무늬
    const cx0 = x0 + 4, cy0 = y0 + 6;
    L.rect(cx0 + 1, cy0 + 1, 15, 12, SHADOW, 0.35);
    L.rect(cx0, cy0, 14, 11, '#c84a52'); L.hl(cx0, cy0, 14, '#e07078'); L.vl(cx0, cy0, 11, '#d86068'); L.hl(cx0, cy0 + 10, 14, '#9a2e38'); L.vl(cx0 + 13, cy0, 11, '#a8343e');
    for (const [x, y] of [[3, 3], [9, 2], [6, 6], [11, 7], [3, 8]] as const) { L.dots(`${cx0 + x},${cy0 + y - 1} ${cx0 + x - 1},${cy0 + y} ${cx0 + x + 1},${cy0 + y} ${cx0 + x},${cy0 + y + 1}`, '#f4e4d8'); L.set(cx0 + x, cy0 + y, '#f0c040'); }
    L.set(cx0 + 7, cy0 + 5, '#9a2e38'); // 가운데 누빈 자리
    // 부채: 둥근 태극선, 대나무 자루가 오른쪽 아래로 나왔다
    const fx = x1 - 13, fy = y0 + 11;
    L.ell(fx + 2, fy + 2, 6, 5, '#7a5a3a', 0.3);
    L.ell(fx, fy, 6, 5, '#c8b890'); L.ell(fx, fy, 5, 4, '#f4ecd6');
    for (let y = fy - 4; y <= fy + 4; y++) for (let x = fx - 5; x <= fx + 5; x++) {
      const dx = (x - fx) / 4.6, dy = (y - fy) / 3.8;
      if (dx * dx + dy * dy > 1) continue;
      const s2 = dy + Math.sin(dx * 2.6) * 0.45;                                    // 태극의 물결 경계
      L.set(x, y, s2 < -0.05 ? '#d63a2c' : '#2e5fb4');
      if (dx * dx + dy * dy > 0.62 && dy < 0 && dx < 0) L.set(x, y, s2 < -0.05 ? '#ea6a50' : '#4a7ad0');
    }
    L.set(fx - 3, fy - 2, '#f8a080');
    L.line(fx + 5, fy + 3, fx + 9, fy + 7, '#9a7438'); L.line(fx + 5, fy + 4, fx + 8, fy + 7, '#c8a060'); L.set(fx + 9, fy + 8, '#7a5428');
  }, 5 * T);
  // 철대문 두 짝: 낡은 하늘색 칠 위에 녹. 안쪽으로 열어 담 안쪽에 기대 놓았다.
  prop((L) => {
    const leaf = (hx: number, dir: number): void => {
      const w = 22, hgt = 26;
      for (let i = 0; i <= w; i++) {
        const x = hx + dir * i, by = WT - 1 - Math.round(i * 0.3), ty = by - hgt;
        const edge = i === 0 || i === w;
        if (edge || i % 3 === 0) for (let y = ty; y <= by; y++) {
          let col = edge ? '#4a7a86' : '#6aa0aa';
          if (rnd(x, y, 73) > 0.8 || (y > by - 5 && rnd(x, y, 74) > 0.45)) col = rnd(x, y, 75) > 0.5 ? '#a85a30' : '#8a4a2a'; // 녹
          L.set(x, y, col);
        }
        for (const yy of [ty, ty + 1, by - 9, by]) L.set(x, yy, yy === ty ? '#9ccad2' : '#4a7a86');
        if (i % 3 === 0 && !edge) L.set(x, ty - 1, '#6aa0aa'); // 창살 끝 뾰족
      }
    };
    leaf(5 * T - 1, -1); leaf(7 * T, 1);
  }, 8 * T + 8);
  // 아래 담 (9줄): 돌담 위 기와. 윗면이 낮아서 고양이가 앉는다. 5~6열은 열린 대문, 양옆에 시멘트 문기둥.
  prop((L) => {
    for (const [x0, x1] of [[0, 5 * T - 4], [7 * T + 4, W]] as const) {
      stones(L, x0, WT + 9, x1 - x0, H - WT - 9, 13);
      giwaCap(L, x0, x1, WT, 7);
    }
    for (const gx of [5 * T - 5, 7 * T - 2]) { // 문기둥
      const y0 = WT - 10;
      L.rect(gx, y0, 7, H - y0, '#b0aca0'); L.vl(gx, y0, H - y0, '#d0ccc0'); L.vl(gx + 6, y0, H - y0, '#7e7a70'); L.hl(gx, y0, 7, '#e0dcd0');
      L.rect(gx - 1, y0 - 2, 9, 2, '#8a867c'); L.hl(gx - 1, y0 - 2, 9, '#c4c0b4');
      for (let y = y0 + 4; y < H; y += 6) if (rnd(gx, y, 76) > 0.5) L.set(gx + 2 + (y % 3), y, '#948f84');
      for (const hy of [y0 + 6, y0 + 22]) L.rect(gx + (gx < 6 * T ? 6 : -1), hy, 2, 3, '#4a4440'); // 경첩
    }
    for (let x = 0; x < W; x++) if (rnd(x, 9, 77) > 0.86 && (x < 5 * T - 6 || x > 7 * T + 6)) L.vl(x, WT - 1 - Math.floor(rnd(x, 1, 77) * 2), 2, GRASS[1]); // 기와 틈에 난 풀
  }, 9 * T);
  return { base: p, props };
}
