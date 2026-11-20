// 2장 지하철역: 환승 통로(concourse)와 승강장(platform). places.ts 의 맵들과 같은 방식으로 한 장씩 그린다.
// 벽 띠 → 바닥 → 막힌 칸의 물건 → 사람 앞에 서는 것(기둥, 개찰구, 앞벽, 난간)을 cut() 으로 떼기.
// 낮이지만 지하라서 빛은 전부 형광등과 광고판이다. 색은 불이 켜진 상태로 칠한다.
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';

const SLAB = '#25262e', SLAB_L = '#383a45';
const tx = (c: number): number => c * T;

// ── 공용 조각 ──
/** 간판 글씨: 읽히지 않는 한글 모양 (5×5, k 배). */
function glyph(p: Pix, x: number, y: number, n: number, col: string, seed: number, k = 1, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 7 * k, r = (j: number): number => rnd(i, j, seed);
    const px = (u: number, v: number): void => p.rect(gx + u * k, y + v * k, k, k, col, a);
    const fin = r(3) > 0.5, ch = fin ? 3 : 5;
    if (r(0) > 0.35) for (let u = 0; u < 3; u++) px(u, 0);
    if (r(1) > 0.3) for (let v = 0; v < ch; v++) px(0, v);
    if (r(5) > 0.5) for (let u = 0; u < 3; u++) px(u, ch - 1);
    else if (r(6) > 0.5) px(1, Math.floor(ch / 2));
    for (let v = 0; v < ch; v++) px(4, v);
    if (r(2) > 0.4) px(3, Math.floor(ch / 2));
    if (fin) { for (let u = 0; u < 5; u++) px(u, 4); if (r(7) > 0.5) px(0, 3); }
  }
}
/** 글자 없는 작은 글줄 (영문 역 이름, 안내문 본문) */
function dashes(p: Pix, x: number, y: number, w: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < w; i++) if (rnd(Math.floor(i / 3), y, seed) > 0.25 && (i % 3 !== 2 || rnd(i, y, seed + 1) > 0.5)) p.set(x + i, y, col, a);
}
/** 화살표 (7×5): r l u d */
const ARW = ['...##..', '....##.', '#######', '....##.', '...##..'];
function arrow(p: Pix, x: number, y: number, dir: 'r' | 'l' | 'u' | 'd', col: string, k = 1): void {
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) if (ARW[j][i] === '#') {
    const [u, v] = dir === 'r' ? [i, j] : dir === 'l' ? [6 - i, j] : dir === 'd' ? [j, i] : [j, 6 - i];
    p.rect(x + u * k, y + v * k, k, k, col);
  }
}
/** 노선 번호 동그라미 */
function lineBadge(p: Pix, cx: number, cy: number, r: number, col: string, num: string, inv = false): void {
  p.ell(cx, cy, r, r, inv ? '#ffffff' : col);
  if (!inv) p.ell(cx, cy, r - 1.4, r - 1.4, '#ffffff');
  text(p, cx - 1, cy - 2, num, col);
}
/** 벽 타일 */
function tiles(p: Pix, x0: number, y0: number, w: number, h: number, base: string, grout: string, tw: number, th: number, seed: number, off = 0): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / th), lx = (x - x0 + (row % 2) * off) % tw, ly = (y - y0) % th;
    const ti = Math.floor((x - x0 + (row % 2) * off) / tw);
    let c = base;
    const v = rnd(ti, row, seed);
    if (v > 0.9) c = mix(base, '#000000', 0.035); else if (v < 0.08) c = mix(base, '#ffffff', 0.25);
    if (lx === 0 || ly === 0) c = grout;
    else if (ly === 1 || lx === 1) c = mix(c, '#ffffff', 0.35); // 유약의 윗가장자리
    p.set(x, y, c);
  }
}
/** 화강석 바닥: 16px 판, 칸과 줄을 맞춘다 */
function granite(p: Pix, x0: number, y0: number, w: number, h: number, top: number, a: string, b: string, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const gx = x >> 4, gy = (y - top) >> 4, lx = x & 15, ly = (y - top) & 15;
    const base = (gx + gy) % 2 ? a : b;
    const n = rnd(x, y, seed);
    let c = n > 0.93 ? mix(base, '#000000', 0.16) : n > 0.85 ? mix(base, '#000000', 0.07) : n < 0.05 ? mix(base, '#ffffff', 0.2) : base;
    if (rnd(gx, gy, seed + 1) > 0.85) c = mix(c, '#c8b8a0', 0.08);
    if (lx === 0 || ly === 0) c = mix(base, '#000000', 0.24);
    else if (ly === 1) c = mix(c, '#ffffff', 0.1);
    p.set(x, y, c);
  }
}
/** 점자 블록. line: 결 방향 ('h' 가로, 'v' 세로), dot: 점형 */
function tactile(p: Pix, x0: number, y0: number, w: number, h: number, kind: 'h' | 'v' | 'dot'): void {
  const Y = '#e8bc2c', YL = '#fbe27a', YD = '#b48a1c', G = '#8e6c18';
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = (x - x0) % 8, ly = (y - y0) % 8;
    let c = Y;
    if (lx === 0 || ly === 0) c = G;
    else if (kind === 'h') { if (ly === 2 || ly === 5) c = YL; else if (ly === 3 || ly === 6) c = YD; if (lx === 1 || lx === 7) c = Y; }
    else if (kind === 'v') { if (lx === 2 || lx === 5) c = YL; else if (lx === 3 || lx === 6) c = YD; if (ly === 1 || ly === 7) c = Y; }
    else { const bx = lx % 3, by = ly % 3; if (lx > 0 && ly > 0 && lx < 7 && ly < 7) { if (bx === 2 && by === 2) c = YL; else if ((bx === 0 && by === 0) && lx > 1 && ly > 1) c = YD; } }
    if (rnd(x, y, 77) > 0.94) c = mix(c, '#6a5a3a', 0.25); // 밟힌 때
    p.set(x, y, c);
  }
}
/** 천장 띠와 형광등 */
function ceiling(p: Pix, W: number, lamps: number[]): void {
  p.rect(0, 0, W, 8, '#3e4145'); p.hl(0, 0, W, '#2a2c2f'); p.hl(0, 7, W, '#25272a');
  for (let x = 0; x < W; x += 24) p.vl(x, 1, 6, '#36393c'); // 천장 판 이음매
  for (const lx of lamps) {
    p.rect(lx - 1, 1, 30, 6, '#26282b');
    p.rect(lx, 2, 28, 4, '#eef4f1'); p.hl(lx, 2, 28, '#ffffff'); p.hl(lx, 5, 28, '#bfcac6');
    for (let x = lx + 4; x < lx + 28; x += 5) p.set(x, 4, '#d8e2de');
  }
}
/** 스테인리스 테 */
function steelFrame(p: Pix, x: number, y: number, w: number, h: number): void {
  p.rect(x - 2, y - 2, w + 4, h + 4, '#8e979b');
  p.hl(x - 2, y - 2, w + 4, '#d6dcde'); p.vl(x - 2, y - 2, h + 4, '#b9c0c3'); p.hl(x - 2, y + h + 1, w + 4, '#5a6266'); p.vl(x + w + 1, y - 2, h + 4, '#6c7579');
  p.hl(x - 1, y - 1, w + 2, '#6c7579'); p.vl(x - 1, y - 1, h + 2, '#7a8387');
}
/** 광고판 (안에서 빛나는 상자). 사람 얼굴은 없다. */
function adBox(p: Pix, x: number, y: number, w: number, h: number, kind: string, seed: number): void {
  steelFrame(p, x, y, w, h);
  const cx = x + Math.floor(w / 2);
  if (kind === 'cosme') { // 화장품: 분홍 바탕, 유리병과 크림 통
    for (let j = 0; j < h; j++) p.hl(x, y + j, w, mix('#fbe8ec', '#f2b8c8', j / h));
    for (let i = 0; i < 18; i++) p.set(x + Math.floor(rnd(i, 1, seed) * w), y + Math.floor(rnd(i, 2, seed) * h * 0.6), '#ffffff', 0.8);
    glyph(p, x + 4, y + 4, 3, '#b0385a', seed); dashes(p, x + 4, y + 11, 18, '#c87890', seed);
    const bx = cx + 2, by = y + h - 24;
    p.rect(bx, by + 6, 9, 16, '#f6d4dc'); p.vl(bx, by + 6, 16, '#ffffff'); p.vl(bx + 8, by + 6, 16, '#d498a8'); p.rect(bx + 2, by + 12, 5, 5, '#e88aa4');
    p.rect(bx + 2, by + 1, 5, 5, '#d4a84a'); p.hl(bx + 2, by + 1, 5, '#f2d488'); p.vl(bx + 6, by + 1, 5, '#a07a2a');
    p.rect(bx - 12, by + 15, 11, 7, '#f8f0f2'); p.rect(bx - 12, by + 13, 11, 3, '#d4a84a'); p.hl(bx - 12, by + 13, 11, '#f2d488'); p.hl(bx - 12, by + 21, 11, '#d0a4b0');
    p.ell(bx + 4, by + 24, 8, 1, '#d898ac', 0.6);
  } else if (kind === 'phone') { // 휴대전화: 남색 바탕, 화면만 빛난다
    for (let j = 0; j < h; j++) p.hl(x, y + j, w, mix('#121a34', '#2c3a72', j / h));
    for (let i = 0; i < 4; i++) p.ell(x + 6 + i * 9, y + h - 6, 7, 3, '#3c4c8c', 0.35);
    const px = cx - 6, py = y + 10, pw = 13, ph = Math.min(26, h - 16);
    p.rect(px - 1, py - 1, pw + 2, ph + 2, '#0a0c14'); p.rect(px, py, pw, ph, '#1a1c28');
    for (let j = 1; j < ph - 1; j++) for (let i = 1; i < pw - 1; i++) p.set(px + i, py + j, mix(mix('#7a5af0', '#3ad8e8', i / pw), '#ff7ac8', (j / ph) * 0.5));
    p.hl(px + 5, py + 1, 3, '#0a0c14'); p.line(px + 2, py + ph - 3, px + pw - 3, py + 3, '#ffffff', 0.25);
    glyph(p, x + 3, y + 3, 2, '#ffffff', seed); dashes(p, x + w - 15, y + 5, 12, '#8a9ad8', seed);
    dashes(p, x + 4, y + h - 5, w - 8, '#a8b4e8', seed + 3, 0.8);
  } else if (kind === 'travel') { // 여행: 하늘과 바다, 섬 하나
    const hz = y + Math.floor(h * 0.58);
    for (let j = y; j < y + h; j++) p.hl(x, j, w, j < hz ? mix('#6cc0ee', '#d8f0fa', (j - y) / (hz - y)) : mix('#2a9ad0', '#1a5a9a', (j - hz) / (y + h - hz)));
    for (let j = hz + 1; j < y + h; j += 2) for (let i = 0; i < w; i += 5) p.hl(x + i + (j % 4), j, 2, '#7ad0f0', 0.6);
    p.ell(x + w - 9, y + 9, 4, 4, '#fff6c8'); p.ell(x + w - 9, y + 9, 3, 3, '#ffffff');
    p.ell(x + 12, hz, 11, 5, '#3a8a4a'); p.rect(x + 1, hz, 23, 5, '#3a8a4a'); p.ell(x + 10, hz - 2, 6, 3, '#5aaa5a'); p.hl(x + 2, hz + 4, 22, '#f2e2b0');
    p.ell(cx + 6, y + 14, 6, 2, '#ffffff', 0.9); p.ell(cx + 2, y + 13, 3, 2, '#ffffff', 0.9);
    glyph(p, x + 3, y + 3, 2, '#ffffff', seed); glyph(p, x + 4, y + 4, 2, '#1a4a7a', seed, 1, 0.35);
    p.rect(x + w - 16, y + h - 7, 13, 4, '#ffffff'); dashes(p, x + w - 15, y + h - 5, 11, '#1a5a9a', seed);
  } else if (kind === 'drink') { // 음료: 노란 바탕, 빨간 캔, 튀는 물방울
    for (let j = 0; j < h; j++) p.hl(x, y + j, w, mix('#ffe46a', '#f8b830', j / h));
    for (let i = 0; i < 9; i++) { const r = 2 + rnd(i, 1, seed) * 6; p.ell(x + 6 + rnd(i, 2, seed) * (w - 12), y + h * 0.35 + rnd(i, 3, seed) * h * 0.5, r, r, '#fff4b8', 0.6); }
    const ch = Math.min(22, h - 10), bx = cx + 1, by = y + h - ch - 3;
    p.rect(bx, by, 10, ch, '#d42a2a'); p.vl(bx + 1, by, ch, '#f05a4a'); p.vl(bx + 8, by, ch, '#9a1a1a');
    p.ell(bx + 5, by + ch + 1, 7, 1, '#c88a1a', 0.6); p.rect(bx, by - 2, 10, 2, '#c8ccd0'); p.hl(bx, by - 2, 10, '#eef0f2');
    p.rect(bx + 2, by + Math.floor(ch / 3), 6, 5, '#ffffff'); p.set(bx + 4, by + Math.floor(ch / 3) + 2, '#d42a2a'); p.set(bx + 5, by + Math.floor(ch / 3) + 3, '#d42a2a');
    for (const [dx, dy] of [[-5, 4], [12, 2], [13, 9], [-6, 12]] as const) { p.set(bx + dx, by + dy, '#ffffff'); p.set(bx + dx, by + dy + 1, '#9ad8f0'); }
    glyph(p, x + 3, y + 3, 3, '#c8281e', seed); dashes(p, x + 3, y + 10, 16, '#a0601a', seed);
  } else { // 학원: 흰 바탕, 큰 빨간 글씨, 파란 띠
    p.rect(x, y, w, h, '#f6f6f2');
    p.rect(x, y + h - 9, w, 9, '#2a4aa8'); dashes(p, x + 3, y + h - 5, w - 6, '#d0dcf8', seed);
    glyph(p, x + 3, y + 4, 3, '#d42a2a', seed, 2); glyph(p, x + 3, y + 17, 4, '#1a1c24', seed + 1);
    for (let i = 0; i < 3; i++) dashes(p, x + 3, y + 25 + i * 3, w - 14 - i * 4, '#7a7e88', seed + 5 + i);
    p.rect(x + w - 9, y + 25, 6, 6, '#f2c230'); text(p, x + w - 8, y + 25, '1', '#1a1c24');
  }
  for (let j = 0; j < h; j++) { const g = x + 3 + Math.floor((h - j) * 0.6); p.hl(g, y + j, 3, '#ffffff', 0.13); } // 유리에 비친 형광등
}
/** 앞벽(맨 아래 '#' 줄)과 옆벽 */
function slab(p: Pix, x: number, y0: number, y1: number, rightLit: boolean): void { p.rect(x, y0, 6, y1 - y0, SLAB); p.vl(rightLit ? x + 5 : x, y0, y1 - y0, SLAB_L); }

// ═══════════════════ 환승 통로 ═══════════════════
// 왼쪽: 발매기 두 대와 노선도. 6열이 개찰구. 오른쪽으로 긴 통로, 기둥이 두 줄, 끝(27열)이 승강장으로 내려가는 계단.
export function concourse(s: PlaceState): Place {
  const m = MAPS.concourse, top = m.top || 56, cols = m.grid[0].length, W = cols * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), WB = top + T, ry = (r: number): number => top + r * T;
  const xEnd = tx(27); // 계단이 시작되는 자리
  p.rect(0, 0, W, H, '#000000');
  // ── 벽: 천장 띠, 스테인리스 테, 흰 타일, 녹색 줄, 베이지 타일, 화강석 걸레받이 ──
  ceiling(p, W, [34, 114, 194, 274, 354, 434]);
  const S1 = 46, S2 = 50, BB = WB - 5;
  p.rect(0, 8, W, 4, '#a9b0b3'); p.hl(0, 8, W, '#d0d6d8'); p.hl(0, 11, W, '#6e7578');
  tiles(p, 0, 12, W, S1 - 12, '#e8e4d8', '#cbc6b8', 8, 8, 201);
  p.rect(0, S1, W, S2 - S1, '#2f9a4a'); p.hl(0, S1, W, '#5cc074'); p.hl(0, S2 - 1, W, '#1f6e34');
  tiles(p, 0, S2, W, BB - S2, '#d8d1bf', '#bcb4a0', 8, 8, 202, 4);
  p.rect(0, BB, W, 5, '#55585a'); p.hl(0, BB, W, '#7f8385'); p.hl(0, WB - 1, W, '#3a3c3e');
  for (let x = 0; x < W; x++) if (rnd(x, 9, 203) > 0.9) p.vl(x, BB - 3 - Math.floor(rnd(x, 8, 203) * 5), 3, '#a89e88', 0.35); // 걸레질 물때
  for (let i = 0; i < 5; i++) { const x = 30 + Math.floor(rnd(i, 1, 204) * 380), y = 14 + Math.floor(rnd(i, 2, 204) * 28); p.line(x, y, x + 3, y + 5, '#b4ae9e', 0.7); } // 금 간 타일
  // ── 1~2열: 요금표와 교통카드 발매기 두 대 ──
  {
    const x = 19, y = 17, w = 26, h = 24;
    p.rect(x - 1, y - 1, w + 2, h + 2, '#7a8387'); p.rect(x, y, w, h, '#f6f5ef');
    p.rect(x, y, w, 5, '#2a62b0'); glyph(p, x + 2, y, 3, '#ffffff', 211);
    for (let r = 0; r < 5; r++) { p.hl(x + 1, y + 7 + r * 3, w - 2, '#d8dade'); dashes(p, x + 2, y + 8 + r * 3, 9, '#5a5e66', 212 + r); p.hl(x + 16, y + 8 + r * 3, 7, '#2a62b0', 0.7); }
    p.vl(x + 13, y + 6, h - 7, '#d8dade');
  }
  const machine = (x0: number, seed: number, scr: string): void => {
    const w = 14, yb = ry(2) - 2, y0 = yb - 34;
    p.rect(x0, y0 - 4, w, 4, '#99a2a7'); p.hl(x0, y0 - 4, w, '#c3cbcf'); p.vl(x0 + w - 1, y0 - 4, 4, '#7a8388');
    p.rect(x0, y0, w, 7, '#2a62b0'); p.hl(x0, y0, w, '#4a86d0'); glyph(p, x0 + 1, y0 + 1, 2, '#ffffff', seed);
    p.rect(x0, y0 + 7, w, yb - y0 - 7, '#c7cdd0'); p.vl(x0, y0 + 7, yb - y0 - 7, '#e2e7e9'); p.vl(x0 + w - 1, y0 + 7, yb - y0 - 7, '#8a9397'); p.vl(x0 + w - 2, y0 + 7, yb - y0 - 7, '#aeb6ba');
    // 화면: 살짝 안으로 들어간 터치 화면
    p.rect(x0 + 2, y0 + 9, 10, 10, '#2e353a'); p.hl(x0 + 2, y0 + 18, 10, '#5a6266');
    for (let j = 0; j < 8; j++) p.hl(x0 + 3, y0 + 10 + j, 8, mix(scr, '#1e4e8e', j / 9));
    p.hl(x0 + 3, y0 + 10, 8, '#1e4e8e'); p.rect(x0 + 4, y0 + 12, 6, 2, '#eef8ff'); p.rect(x0 + 4, y0 + 15, 3, 2, '#ffd34a'); p.rect(x0 + 8, y0 + 15, 2, 2, '#ffffff');
    p.set(x0 + 10, y0 + 11, '#ffffff', 0.6);
    // 선반, 카드 대는 곳, 지폐·동전 넣는 곳, 카드 나오는 곳
    p.rect(x0 + 1, y0 + 20, w - 2, 2, '#9aa3a8'); p.hl(x0 + 1, y0 + 20, w - 2, '#dfe4e6');
    p.rect(x0 + 2, y0 + 23, 4, 3, '#1e262c'); p.set(x0 + 3, y0 + 24, '#58e0a0'); p.set(x0 + 4, y0 + 24, '#3aa8e8');
    p.hl(x0 + 8, y0 + 23, 4, '#1e2326'); p.set(x0 + 12, y0 + 23, '#ff9a3a'); p.hl(x0 + 8, y0 + 24, 4, '#e6eaec');
    p.vl(x0 + 9, y0 + 26, 2, '#1e2326'); p.set(x0 + 11, y0 + 26, '#58e07a');
    p.rect(x0 + 3, y0 + 28, 8, 4, '#2a2f33'); p.hl(x0 + 3, y0 + 28, 8, '#14171a'); p.hl(x0 + 3, y0 + 31, 8, '#6a7276');
    p.rect(x0, yb - 2, w, 2, '#5c6468');
    p.hl(x0 - 1, yb, w + 2, '#2a2c2e', 0.6); p.dither(x0, yb + 1, w + 1, 2, '#2a2c2e', 0, 0.35);
  };
  // ── 3~5열: 노선도. 아래에 도움 요청 버튼. ──
  {
    const x = 52, y = 15, w = 40, h = 27;
    steelFrame(p, x, y, w, h); p.rect(x, y, w, h, '#f7f6f0');
    p.rect(x, y, w, 4, '#3a3e48'); dashes(p, x + 2, y + 1, 14, '#ffffff', 221); dashes(p, x + 2, y + 2, 10, '#c8ccd4', 222);
    const cx = x + 21, cy = y + 16;
    for (let a = 0; a < 64; a++) { const t = (a / 64) * Math.PI * 2; p.set(Math.round(cx + Math.cos(t) * 11), Math.round(cy + Math.sin(t) * 6), '#2fa84f'); p.set(Math.round(cx + Math.cos(t) * 11), Math.round(cy + 1 + Math.sin(t) * 6), '#2fa84f'); }
    p.line(x + 1, cy - 3, x + w - 2, cy - 1, '#2a52be'); p.line(x + 1, cy - 2, x + w - 2, cy, '#2a52be');            // 1호선
    p.line(x + 8, y + 5, x + 28, y + h - 1, '#ef7c1c');                                                              // 3호선
    p.line(x + 30, y + 5, x + 16, y + h - 1, '#00a2d1');                                                             // 4호선
    p.line(x + 1, y + h - 5, x + w - 2, y + 8, '#996cac');                                                           // 5호선
    p.line(x + 3, y + 6, x + 3, y + h - 2, '#747f00'); p.line(x + 3, y + 6, x + 12, y + 6, '#747f00');              // 7호선
    for (const [dx, dy] of [[-11, 0], [11, 0], [0, -6], [0, 7], [-8, -4], [8, 5], [-7, 5], [7, -4]] as const) { p.set(cx + dx, cy + dy, '#ffffff'); p.set(cx + dx, cy + dy - 1, '#3a3e48'); }
    p.ell(cx - 10, cy - 1, 1.5, 1.5, '#e8322c'); p.set(cx - 10, cy - 1, '#ffffff'); // 현위치
    // 도움 요청 버튼 상자
    p.rect(x + w - 7, y + h + 6, 8, 11, '#f2c230'); p.hl(x + w - 7, y + h + 6, 8, '#ffe07a'); p.vl(x + w, y + h + 6, 11, '#b48a1c');
    p.ell(x + w - 3, y + h + 13, 2, 2, '#d42a2a'); p.set(x + w - 4, y + h + 12, '#ff8a7a'); p.rect(x + w - 6, y + h + 7, 6, 2, '#2a2c30');
  }
  // ── 7~8열: 소화전 ──
  {
    const x = 118, y = 22, w = 22, h = 22;
    p.rect(x - 1, y - 1, w + 2, h + 2, '#8a1e1a'); p.rect(x, y, w, h, '#d03a30'); p.hl(x, y, w, '#e86a5a'); p.vl(x + w - 1, y, h, '#9a2420');
    p.rect(x + 2, y + 2, w - 4, 6, '#f6f2ea'); glyph(p, x + 3, y + 2, 2, '#c8281e', 231); p.set(x + 17, y + 4, '#c8281e');
    p.rect(x + 3, y + 10, w - 6, 9, '#a42a24'); p.rect(x + 4, y + 11, w - 8, 7, '#e8eef0', 0.35); p.line(x + 5, y + 17, x + 9, y + 12, '#ffffff', 0.4);
    p.rect(x + w - 5, y + 13, 2, 3, '#e8e0c8');
    p.ell(x + 11, y + 15, 4, 2, '#7a1c18', 0.5); // 안의 감긴 호스 그림자
  }
  // ── 10~13열: 녹색 안내 표지 '2호선 갈아타는 곳 →'. 그 밑에 광고판. ──
  const transfer = (x: number, y: number, n: number, dir: 'r' | 'd', seed: number): number => {
    const w = 15 + n * 7 + 10, h = 13;
    p.rect(x - 1, y - 1, w + 2, h + 2, '#14502a'); p.rect(x, y, w, h, '#1f8a3e'); p.hl(x, y, w, '#3aa85a'); p.hl(x, y + h - 1, w, '#16682e');
    lineBadge(p, x + 6, y + 6, 4.6, '#1f8a3e', '2', true);
    glyph(p, x + 13, y + 4, n, '#ffffff', seed);
    if (dir === 'r') arrow(p, x + w - 9, y + 4, 'r', '#ffffff'); else arrow(p, x + w - 8, y + 3, 'd', '#ffffff');
    p.vl(x + 6, y - 7, 6, '#7a8286'); p.vl(x + w - 7, y - 7, 6, '#7a8286'); // 천장에 매단 줄
    return w;
  };
  transfer(163, 16, 5, 'r', 241);
  adBox(p, 165, 33, 40, 27, 'cosme', 242);
  // ── 14~16열: 큰 광고판 ──
  adBox(p, 228, 18, 41, 42, 'phone', 243);
  // ── 18~20열: 방독면 보관함, 시계 ──
  {
    const x = 292, y = 24, w = 26, h = 30;
    p.rect(x - 1, y - 1, w + 2, h + 2, '#5a6266'); p.rect(x, y, w, h, '#e8ecec'); p.hl(x, y, w, '#ffffff');
    p.rect(x, y, w, 6, '#2a8a4a'); glyph(p, x + 3, y, 3, '#ffffff', 251);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { // 비닐에 싼 방독면
      const bx = x + 2 + c * 6, by = y + 8 + r * 10;
      p.rect(bx, by, 5, 8, '#e8c830'); p.hl(bx, by, 5, '#f8e478'); p.rect(bx + 1, by + 3, 3, 3, '#3a3a34'); p.set(bx + 2, by + 4, '#8a8a80');
    }
    p.rect(x + 1, y + 7, w - 2, h - 8, '#c8e0e8', 0.25); p.line(x + 3, y + h - 2, x + 12, y + 8, '#ffffff', 0.35); p.vl(x + 13, y + 7, h - 8, '#8a9296');
    p.rect(x + w - 5, y + h - 9, 2, 3, '#d42a2a');
  }
  { // 둥근 시계: 오후 세 시 사십 분
    const cx = 330, cy = 26;
    p.ell(cx, cy, 7, 7, '#3a3e42'); p.ell(cx, cy, 6, 6, '#f8f8f4'); p.set(cx - 2, cy - 4, '#ffffff');
    for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; p.set(Math.round(cx + Math.cos(t) * 5), Math.round(cy + Math.sin(t) * 5), '#6a6e72'); }
    p.line(cx, cy, cx + 3, cy + 1, '#1a1c20'); p.line(cx, cy, cx - 3, cy + 4, '#1a1c20'); p.set(cx, cy, '#d42a2a');
    p.vl(cx, 8, 11, '#7a8286');
  }
  // ── 22~26열: 광고판, '타는 곳' 표지 ──
  adBox(p, 356, 20, 40, 40, 'travel', 261);
  transfer(400, 16, 2, 'd', 262);
  // CCTV 돔
  for (const cx of [100, 250, 410]) { p.rect(cx - 2, 8, 5, 2, '#d8dcde'); p.ell(cx, 11, 3, 2, '#2a2e32'); p.set(cx - 1, 10, '#6a7276'); p.set(cx + 1, 12, '#c83a3a'); }

  // ── 바닥: 화강석 판, 기둥 줄 사이로 점자 블록이 계단까지 ──
  granite(p, T, WB, W - T, ry(5) - WB, top, '#a9aba8', '#9fa19e', 271);
  for (const lx of [48, 128, 208, 288, 368, 446]) for (let y = WB + 2; y < WB + 30; y++) for (let x = lx - 14; x < lx + 14; x++) {
    const e = ((x - lx) / 14) ** 2 + ((y - WB - 14) / 12) ** 2;
    if (e < 1 && rnd(x, y, 272) > 0.35 + e * 0.5) p.set(x, y, '#ffffff', 0.12);
  }
  p.hl(T, WB, W - T, '#2a2c2e', 0.6); p.dither(T, WB + 1, W - T, 2, '#2a2c2e', 0, 0.3);
  // 점자 블록: 3줄을 따라 계단까지. 발매기 앞과 계단 앞은 점형.
  const LY = ry(3) + 4;
  tactile(p, T + 8, LY, tx(26) - T - 8, 8, 'h');
  tactile(p, T + 8, ry(2), 8, LY - ry(2), 'v');
  tactile(p, T, ry(2), 32, 8, 'dot');
  tactile(p, tx(26), ry(2), 16, ry(5) - ry(2) - 4, 'dot');
  tactile(p, tx(5) + 8, LY, 8, 8, 'dot'); tactile(p, tx(7), LY, 8, 8, 'dot'); // 개찰구 앞뒤
  // 바닥의 때: 사람이 많이 지나는 가운데 줄이 반질하다
  for (let y = ry(2); y < ry(5) - 2; y++) for (let x = T; x < tx(26); x++) if (rnd(x, y, 273) > 0.985) p.set(x, y, '#6a6c6a', 0.6);
  for (let i = 0; i < 6; i++) { const x = 40 + Math.floor(rnd(i, 1, 274) * 360), y = ry(1) + 4 + Math.floor(rnd(i, 2, 274) * 58); p.ell(x, y, 1.5, 1, '#5a5c5a', 0.5); } // 눌어붙은 껌

  // ── 발매기 (막힌 칸, 벽에 붙어 있다) ──
  machine(17, 213, '#8ad0f6'); machine(33, 214, '#a0e0c8');

  // ── 계단 (27열, 2~4줄): 오른쪽으로 내려간다. 단이 낮아질수록 화면에서 아래로 밀리고 어두워진다. ──
  {
    const x0 = xEnd, y0 = ry(2), y1 = ry(5);
    p.rect(x0, y0, W - x0, y1 - y0, '#050506');
    p.rect(x0, y0, 2, y1 - y0, '#c8ccc8'); p.vl(x0 + 1, y0, y1 - y0, '#8a8e8c'); // 첫 단 모서리 (스테인리스)
    for (let i = 0; i < 4; i++) {
      const sx = x0 + 2 + i * 4, drop = 2 + i * 3, k = (i + 0.6) / 4.2, c = mix('#9a9c98', '#0c0d0e', k);
      for (let y = y0; y < y1; y++) for (let x = sx; x < Math.min(W, sx + 4); x++) {
        let col: string;
        if (y < y0 + drop) col = mix(mix('#d8d1bf', '#000000', 0.45 + i * 0.13), '#000000', ((y - y0) / drop) * 0.35); // 계단 옆벽 (위 난간 밑)
        else if (x === sx) col = mix(c, '#e6c84a', 0.55 - i * 0.12); // 미끄럼 방지 노란 줄
        else col = rnd(x, y, 291) > 0.9 ? mix(c, '#000000', 0.2) : c;
        p.set(x, y, col);
      }
      p.hl(sx, y0 + drop, 4, mix(c, '#000000', 0.5)); // 옆벽 밑 그늘
    }
  }

  // ── 앞에 서는 것 ──
  const props: Prop[] = [];
  const L2 = new Pix(W, H), P2 = new Pix(W, H), G4 = new Pix(W, H), P4 = new Pix(W, H), R5 = new Pix(W, H);
  // 개찰구: 6열 2·4줄 몸통. 1줄은 벽까지 이어진 유리 칸막이. 3줄이 지나가는 틈.
  {
    const gx = tx(6) + 1;
    { // 유리 칸막이: 깊이 방향으로 서 있어 좁은 띠로 보인다
      const px = gx + 5, pw = 6, py0 = 54, py1 = ry(2) + 2;
      p.rect(px, py0, pw, py1 - py0, '#8e979b'); p.vl(px, py0, py1 - py0, '#e2e7e9'); p.vl(px + pw - 1, py0, py1 - py0, '#6a7276');
      p.rect(px + 1, py0 + 2, pw - 2, py1 - py0 - 6, '#a8c8cc'); p.vl(px + 2, py0 + 4, 14, '#e8f6f8'); p.vl(px + 3, py0 + 22, 6, '#e8f6f8', 0.6);
      p.rect(px - 1, py0 - 2, pw + 2, 2, '#c8cfd2'); p.hl(px - 1, py0 - 2, pw + 2, '#f2f4f4');
      p.hl(px - 1, py1, pw + 2, '#2a2c2e', 0.5);
    }
    const cab = (L: Pix, yb: number, flapUp: boolean): void => {
      const w = 15, h = 15, y0 = yb - h;
      L.rect(gx, y0 - 5, w, 5, '#3c4c66'); L.hl(gx, y0 - 5, w, '#6a7ea0'); L.hl(gx, y0 - 1, w, '#2a364a');
      L.rect(gx + 2, y0 - 4, 5, 3, '#1a2230'); L.set(gx + 3, y0 - 3, '#5ad0ff'); L.set(gx + 4, y0 - 3, '#9ae8ff'); L.set(gx + 5, y0 - 3, '#5ad0ff'); // 카드 대는 곳
      L.rect(gx + 9, y0 - 4, 4, 2, '#0e1a12'); L.hl(gx + 10, y0 - 4, 2, '#7af09a'); // 잔액 화면
      for (let x = gx; x < gx + w; x++) L.vl(x, y0, h, x === gx ? '#e6eaec' : x === gx + w - 1 ? '#7a8286' : (x - gx) % 3 === 0 ? '#aeb5b9' : '#c2c9cc');
      L.rect(gx + 1, y0 + 2, 4, 4, '#14181c'); L.dots(`${gx + 1},${y0 + 3} ${gx + 2},${y0 + 3} ${gx + 3},${y0 + 3} ${gx + 4},${y0 + 3} ${gx + 3},${y0 + 2} ${gx + 3},${y0 + 4}`, '#58e07a'); // 들어가는 쪽: 초록 화살표
      L.rect(gx + w - 5, y0 + 2, 4, 4, '#14181c'); L.dots(`${gx + w - 5},${y0 + 2} ${gx + w - 2},${y0 + 2} ${gx + w - 4},${y0 + 3} ${gx + w - 3},${y0 + 3} ${gx + w - 4},${y0 + 4} ${gx + w - 3},${y0 + 4} ${gx + w - 5},${y0 + 5} ${gx + w - 2},${y0 + 5}`, '#ff4a3a'); // 나오는 쪽: 빨간 X
      L.hl(gx, y0 + 8, w, '#2a62b0');
      L.rect(gx, yb - 2, w, 2, '#4a5256');
      if (flapUp) { L.rect(gx + 5, yb - 1, 5, 3, '#f08a3a', 0.85); L.hl(gx + 5, yb - 1, 5, '#ffc08a'); } // 틈 쪽으로 접힌 주황 날개
      else { L.rect(gx + 5, y0 - 7, 5, 2, '#f08a3a', 0.85); L.hl(gx + 5, y0 - 7, 5, '#ffc08a'); }
      p.hl(gx - 1, yb, w + 2, '#2a2c2e', 0.6); p.dither(gx, yb + 1, w + 1, 2, '#2a2c2e', 0, 0.3);
    };
    cab(L2, ry(2) + 12, true);
    cab(G4, ry(4) + 12, false);
  }
  // 기둥: 9·13·17·21열, 2·4줄. 흰 타일, 모서리 보호대, 녹색 줄, 기둥 번호. 앞줄 기둥은 사람이 뒤에 서면 비친다.
  let num = 7;
  for (const r of [2, 4]) for (const c of [9, 13, 17, 21]) {
    const L = r === 2 ? P2 : P4, x0 = tx(c) + 1, w = 14, yb = ry(r + 1) - 1, fh = 52, y0 = yb - fh, cap = 6;
    L.rect(x0 - 1, y0 - cap, w + 2, cap, '#4a4e52'); L.hl(x0 - 1, y0 - cap, w + 2, '#c8ced2'); L.vl(x0 - 1, y0 - cap, cap, '#8a9094'); L.vl(x0 + w, y0 - cap, cap, '#6a7074'); // 천장으로 들어가는 윗면: 테두리가 밝은 판
    L.hl(x0, y0 - cap + 1, w, '#3a3d40'); L.hl(x0 - 1, y0 - 1, w + 2, '#9aa0a4');
    tiles(L, x0, y0, w, fh - 5, '#ebe7dc', '#c9c4b6', 7, 7, 280 + c + r);
    L.rect(x0, y0 + 24, w, 3, '#2f9a4a'); L.hl(x0, y0 + 24, w, '#5cc074'); L.hl(x0, y0 + 26, w, '#1f6e34');
    L.vl(x0 - 1, y0, fh, '#f4f6f6'); L.vl(x0, y0, fh - 5, '#d6dcde'); L.vl(x0 + w, y0, fh, '#8a9397'); L.vl(x0 + w - 1, y0, fh - 5, '#bfc5c0');
    for (let y = y0; y < yb - 5; y++) for (let x = x0 + w - 4; x < x0 + w - 1; x++) L.set(x, y, '#5a5040', 0.08);
    L.rect(x0 - 1, yb - 5, w + 2, 5, '#55585a'); L.hl(x0 - 1, yb - 5, w + 2, '#808486'); L.hl(x0 - 1, yb - 1, w + 2, '#3a3c3e');
    L.rect(x0 + 2, y0 + 6, 10, 7, '#1e3a6a'); L.hl(x0 + 2, y0 + 6, 10, '#3a5a8a'); // 기둥 번호판
    const ns = String(num++); text(L, x0 + 7 - ns.length * 2, y0 + 7, ns, '#ffffff');
    if (r === 2 && c === 13) { L.rect(x0 + 4, yb - 14, 6, 10, '#d42a2a'); L.vl(x0 + 4, yb - 14, 10, '#f05a4a'); L.rect(x0 + 5, yb - 16, 3, 2, '#2a2a2a'); L.rect(x0 + 5, yb - 11, 4, 3, '#f6f2ea'); } // 소화기
    if (r === 4 && c === 17) { L.rect(x0 + 2, y0 + 30, 10, 12, '#f6f5ef'); L.rect(x0 + 2, y0 + 30, 10, 3, '#d42a2a'); for (let i = 0; i < 3; i++) dashes(L, x0 + 3, y0 + 35 + i * 2, 8, '#5a5e66', 290 + i); } // 안내문
    if (r === 2 && c === 21) { L.rect(x0 + 2, y0 + 30, 10, 9, '#1f8a3e'); arrow(L, x0 + 3, y0 + 32, 'r', '#ffffff'); }
    if (r === 4 && c === 9) { // 금연 표지
      L.ell(x0 + 7, y0 + 35, 4, 4, '#d42a2a'); L.ell(x0 + 7, y0 + 35, 3, 3, '#ffffff'); L.hl(x0 + 5, y0 + 35, 5, '#3a3a3a'); L.set(x0 + 9, y0 + 34, '#a0a0a0');
      L.line(x0 + 5, y0 + 33, x0 + 9, y0 + 37, '#d42a2a');
    }
    p.hl(x0 - 1, yb + 1, w + 3, '#2a2c2e', 0.55); p.dither(x0 - 1, yb + 2, w + 4, 2, '#2a2c2e', 0, 0.3); p.vl(x0 + w + 1, yb - 8, 9, '#2a2c2e', 0.25);
  }
  // 계단 난간: 2줄 위 가장자리에 낮은 타일 턱과 스테인리스 손잡이 (1줄 통로와 계단을 가른다)
  const rail = (L: Pix, yb: number, front: boolean): void => {
    const x0 = xEnd, h = 14;
    L.rect(x0, yb - 6, W - x0, 6, '#d8d1bf'); L.hl(x0, yb - 6, W - x0, '#f0ece2'); L.hl(x0, yb - 1, W - x0, '#8a8476'); // 낮은 턱
    for (let x = x0 + 3; x < W; x += 8) L.vl(x, yb - 5, 4, '#bcb4a0');
    for (const x of [x0 + 1, x0 + 9]) { L.vl(x, yb - h, h - 6, '#7a8286'); L.vl(x + 1, yb - h, h - 6, '#c8ced2'); }
    L.rect(x0, yb - h - 2, W - x0, 2, '#d6dcde'); L.hl(x0, yb - h - 1, W - x0, '#7a8286'); L.rect(x0 - 1, yb - h - 2, 2, 3, '#e8ecee');
    if (front) L.hl(x0, yb, W - x0, '#2a2c2e', 0.5);
  };
  rail(L2, ry(2) + 1, false);
  rail(R5, ry(5) + 1, true);
  props.push(cut(L2, top, 2 * T), { ...cut(P2, top, 2 * T), fade: true }, cut(G4, top, 4 * T), { ...cut(P4, top, 4 * T), fade: true }, cut(R5, top, 5 * T - 1));
  // 옆벽 (밑그림)과 앞벽 (5줄)
  p.rect(0, 0, 10, H, '#000000'); slab(p, 10, 0, H, true);
  {
    const L = new Pix(W, H), y = ry(5);
    L.rect(10, y, W - 10, H - y, SLAB); L.hl(16, y, W - 16, SLAB_L); L.hl(16, y + 1, W - 16, '#2e2f38');
    slab(L, 10, y, H, true);
    props.push(cut(L, top, 5 * T + 1));
  }
  void s;
  return { base: p, props };
}

// ═══════════════════ 승강장 ═══════════════════
// 위 벽: 열차 안내 전광판, 광고, 벤치(3~4열), 역 이름판, 시계, 광고, 18열이 올라가는 계단. 4줄 노란 점자 블록, 5~6줄 선로.
export function platform(s: PlaceState): Place {
  const m = MAPS.platform, top = m.top || 56, cols = m.grid[0].length, W = cols * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), WB = top + T, ry = (r: number): number => top + r * T;
  const EDGE = ry(5); // 승강장 끝
  p.rect(0, 0, W, H, '#000000');
  // ── 벽: 천장, 테, 세로 법랑 판넬, 파란 줄 ──
  ceiling(p, W, [26, 106, 186, 252]);
  const BB = WB - 5;
  p.rect(0, 8, W, 4, '#a9b0b3'); p.hl(0, 8, W, '#d0d6d8'); p.hl(0, 11, W, '#6e7578');
  for (let y = 12; y < BB; y++) for (let x = 0; x < W; x++) {
    const lx = x % 16, pi = x >> 4;
    let c = y < 48 ? '#dfe3e0' : '#c9cfcc';
    if (rnd(pi, y >> 3, 301) > 0.88) c = mix(c, '#000000', 0.03);
    if (lx === 0) c = '#9ca3a0'; else if (lx === 1) c = '#eef1ef'; else if (lx === 15) c = mix(c, '#000000', 0.08);
    p.set(x, y, c);
  }
  p.rect(0, 46, W, 3, '#1f4fa8'); p.hl(0, 46, W, '#4a7ad0'); p.hl(0, 48, W, '#173c80');
  p.rect(0, BB, W, 5, '#55585a'); p.hl(0, BB, W, '#7f8385'); p.hl(0, WB - 1, W, '#3a3c3e');
  for (let x = 0; x < W; x++) if (rnd(x, 3, 302) > 0.88) p.vl(x, 12, 2 + Math.floor(rnd(x, 4, 302) * 6), '#a8aeab', 0.4); // 천장에서 흘러내린 때
  // ── 1~2열: 열차 도착 안내 전광판, 안전 포스터 ──
  {
    const x = 18, y = 13, w = 28, h = 12;
    p.vl(x + 4, 8, 5, '#7a8286'); p.vl(x + w - 5, 8, 5, '#7a8286');
    p.rect(x - 1, y - 1, w + 2, h + 2, '#3a3e42'); p.rect(x, y, w, h, '#0e0c0a');
    glyph(p, x + 1, y + 1, 2, '#ff9a2a', 311); arrow(p, x + 16, y + 1, 'l', '#ff9a2a'); p.rect(x + 24, y + 1, 3, 5, '#ff9a2a', 0.8);
    glyph(p, x + 1, y + 7, 1, '#ffd23a', 312); dashes(p, x + 8, y + 8, 18, '#ff9a2a', 313); dashes(p, x + 8, y + 10, 12, '#ff9a2a', 314, 0.7);
    p.hl(x, y, w, '#2a2622');
    const ax = 22, ay = 30; // 안전 포스터: 노랑·검정 사선 띠, 발 조심 그림
    p.rect(ax - 1, ay - 1, 22, 28, '#8a9296'); p.rect(ax, ay, 20, 26, '#f8f6ee');
    for (let i = 0; i < 20; i++) for (let j = 0; j < 4; j++) p.set(ax + i, ay + j, ((i + j) >> 1) % 2 ? '#1a1c20' : '#f2c230');
    glyph(p, ax + 2, ay + 6, 2, '#d42a2a', 315); for (let i = 0; i < 3; i++) dashes(p, ax + 2, ay + 13 + i * 2, 16, '#5a5e66', 316 + i);
    p.rect(ax + 6, ay + 20, 8, 3, '#2a2c30'); p.hl(ax + 2, ay + 23, 16, '#f2c230');
  }
  // ── 3~4열: 벤치 위 광고 ──
  adBox(p, 51, 17, 26, 24, 'drink', 321);
  // ── 6~10열: 역 이름판 '신도림' (흰 바탕, 파란 띠, 이전·다음 역) ──
  {
    const x = 97, y = 14, w = 78, h = 31;
    p.rect(x - 2, y - 2, w + 4, h + 4, '#5a6266'); p.hl(x - 2, y - 2, w + 4, '#9aa2a6');
    p.vl(x + 8, 8, 4, '#7a8286'); p.vl(x + w - 9, 8, 4, '#7a8286');
    p.rect(x, y, w, h, '#fbfbf7'); p.hl(x, y, w, '#ffffff');
    lineBadge(p, x + 10, y + 10, 6, '#2fa84f', '2');
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; p.set(Math.round(x + 10 + Math.cos(t) * 6), Math.round(y + 10 + Math.sin(t) * 6), '#2fa84f'); p.set(Math.round(x + 10 + Math.cos(t) * 5), Math.round(y + 10 + Math.sin(t) * 5), '#2fa84f'); }
    glyph(p, x + 22, y + 4, 3, '#1a1c22', 331, 2);
    dashes(p, x + 24, y + 16, 34, '#8a8e94', 332);
    p.rect(x, y + 20, w, 11, '#1f4fa8'); p.hl(x, y + 20, w, '#3a6ac0'); p.hl(x, y + h - 1, w, '#173c80');
    arrow(p, x + 3, y + 23, 'l', '#ffffff'); glyph(p, x + 12, y + 23, 2, '#ffffff', 333);
    arrow(p, x + w - 10, y + 23, 'r', '#ffffff'); glyph(p, x + w - 26, y + 23, 2, '#ffffff', 334);
    p.vl(x + Math.floor(w / 2), y + 22, 7, '#6a8ad0');
  }
  // ── 11~12열: 시계 (네모난 전자시계, 15:40) ──
  {
    const x = 182, y = 18, w = 22, h = 11;
    p.vl(x + 10, 8, 10, '#7a8286');
    p.rect(x - 1, y - 1, w + 2, h + 2, '#3a3e42'); p.rect(x, y, w, h, '#101412'); p.hl(x, y, w, '#26302a');
    text(p, x + 2, y + 3, '15', '#7af0a8'); p.set(x + 10, y + 4, '#7af0a8'); p.set(x + 10, y + 6, '#7af0a8'); text(p, x + 12, y + 3, '40', '#7af0a8');
  }
  // ── 13~16열: 큰 광고판 ──
  adBox(p, 212, 16, 56, 40, 'academy', 341);
  // ── 17열: 비상 전화와 소화기 함 ──
  {
    const x = 275, y = 36, w = 9, h = 22;
    p.rect(x - 1, y - 1, w + 2, h + 2, '#8a1e1a'); p.rect(x, y, w, h, '#d03a30'); p.hl(x, y, w, '#e86a5a');
    p.rect(x + 1, y + 2, w - 2, 4, '#f6f2ea'); p.set(x + 3, y + 3, '#c8281e'); p.set(x + 5, y + 4, '#c8281e');
    p.rect(x + 2, y + 8, 5, 8, '#2a2c30'); p.vl(x + 2, y + 8, 8, '#4a4e54'); p.set(x + 4, y + 18, '#ffd34a');
  }
  // ── 18열: 올라가는 계단. 위로 갈수록 밝다 (위층 통로의 빛). 위에 노란 '나가는 곳' 표지. ──
  const SX = tx(18), SW = 16;
  {
    const y0 = 14;
    p.rect(SX - 3, y0 - 2, SW + 3, WB - y0 + 2, '#7a8286'); p.vl(SX - 3, y0 - 2, WB - y0 + 2, '#d6dcde'); p.hl(SX - 3, y0 - 2, SW + 3, '#d6dcde');
    for (let y = y0; y < WB; y++) for (let x = SX; x < SX + SW; x++) p.set(x, y, '#1a1c1e');
    for (let y = y0; y < y0 + 7; y++) p.hl(SX, y, SW, mix('#f6f4ea', '#d0cec4', (y - y0) / 7)); // 위층 바닥: 밝다
    for (let k = 0; ; k++) { // 단: 아래에서 위로. 디딤판 2px(앞 모서리는 노란 줄), 챌판 2px. 위로 갈수록 밝다.
      const yb = ry(1) + 4 - k * 4; if (yb - 4 < y0 + 7) break;
      const t = Math.min(1, k / 12), tread = mix('#5a5c5a', '#d6d4ca', t), riser = mix('#2e302e', '#9a9c96', t);
      p.hl(SX, yb - 4, SW, mix(tread, '#f2c230', 0.5)); p.hl(SX, yb - 3, SW, tread); p.hl(SX, yb - 2, SW, riser); p.hl(SX, yb - 1, SW, mix(riser, '#000000', 0.25));
    }
    p.rect(SX, y0, 3, ry(1) + 4 - y0, '#b8b2a2'); p.vl(SX + 2, y0, ry(1) + 4 - y0, '#6a6458'); p.vl(SX, y0, ry(1) + 4 - y0, '#d8d2c2'); // 왼쪽 옆벽
    p.vl(SX + 4, y0 + 8, ry(1) - y0 - 6, '#e2e7e9'); p.vl(SX + 5, y0 + 8, ry(1) - y0 - 6, '#6a7276'); // 손잡이
    for (let y = y0 + 12; y < ry(1); y += 10) p.set(SX + 3, y, '#9aa2a6');
    p.dither(SX + 3, ry(1) - 14, SW - 3, 18, '#000000', 0, 0.18);
    // 표지: 노란 '나가는 곳 ↑'
    const gx = SX - 13, gy = 4;
    p.vl(gx + 6, 0, gy, '#7a8286'); p.vl(gx + 22, 0, gy, '#7a8286');
    p.rect(gx - 1, gy - 1, 30, 10, '#2a2c30'); p.rect(gx, gy, 28, 8, '#f6c818'); p.hl(gx, gy, 28, '#ffe06a');
    arrow(p, gx + 2, gy + 1, 'u', '#1a1a1a'); glyph(p, gx + 8, gy + 2, 3, '#1a1a1a', 351, 1);
  }
  // ── 바닥: 화강석. 4줄에 노란 점자 블록, 승차 위치 표시, 끝은 흰 턱. ──
  granite(p, T, WB, tx(19) - T, EDGE - WB, top, '#a6a8a5', '#9c9e9b', 361);
  for (const lx of [40, 120, 200, 266]) for (let y = WB + 2; y < WB + 28; y++) for (let x = lx - 14; x < lx + 14; x++) {
    const e = ((x - lx) / 14) ** 2 + ((y - WB - 13) / 11) ** 2;
    if (e < 1 && rnd(x, y, 362) > 0.35 + e * 0.5) p.set(x, y, '#ffffff', 0.12);
  }
  p.hl(T, WB, tx(19) - T, '#2a2c2e', 0.6); p.dither(T, WB + 1, tx(19) - T, 2, '#2a2c2e', 0, 0.3);
  tactile(p, T, ry(4) + 2, tx(19) - T, 8, 'dot');
  p.rect(T, EDGE - 4, tx(19) - T, 4, '#d6d4ca'); p.hl(T, EDGE - 4, tx(19) - T, '#eceae2');
  for (let x = T + 1; x < tx(19); x += 3) p.vl(x, EDGE - 3, 2, '#b8b6ac'); // 미끄럼 방지 홈
  p.hl(T, EDGE - 5, tx(19) - T, '#f2c230');
  // 승차 위치: 8열과 14열 4줄. 번호판과 화살표 (가운데로 내리고, 양옆으로 탄다).
  for (const [c, a, b] of [[8, '4', '3'], [14, '5', '1']] as const) {
    const cx = tx(c) + 8, y = ry(3) + 6;
    p.rect(cx - 6, y, 13, 7, '#1f4fa8'); p.hl(cx - 6, y, 13, '#4a7ad0');
    text(p, cx - 5, y + 1, a, '#ffffff'); p.hl(cx - 1, y + 3, 2, '#ffffff'); text(p, cx + 2, y + 1, b, '#ffffff');
    arrow(p, cx - 15, y, 'd', '#2fa84f'); arrow(p, cx + 11, y, 'd', '#2fa84f'); arrow(p, cx - 2, y - 8, 'u', '#f08a3a');
  }
  // ── 벤치 (3~4열, 1줄): 나무 좌판 두 개, 스테인리스 다리와 팔걸이. 사람이 그 위에 앉는다. ──
  {
    const x0 = tx(3) + 1, x1 = tx(5) - 1, ys = ry(1) + 3;
    p.rect(x0, ys - 12, x1 - x0, 9, '#8a9296'); // 등판 받침
    for (let i = 0; i < 2; i++) {
      const sx = x0 + 2 + i * 15;
      p.rect(sx, ys - 11, 13, 8, '#b07a48'); p.hl(sx, ys - 11, 13, '#d09a64'); p.hl(sx, ys - 7, 13, '#8a5a34'); p.hl(sx, ys - 4, 13, '#6a4426'); // 등받이 나무
      p.rect(sx, ys - 2, 13, 6, '#c08654'); p.hl(sx, ys - 2, 13, '#dca46e'); p.hl(sx, ys + 1, 13, '#a06c3e'); p.hl(sx, ys + 3, 13, '#6a4426'); // 좌판
    }
    for (const ax of [x0, x0 + 15, x1 - 2]) { p.rect(ax, ys - 4, 2, 9, '#a8b0b4'); p.vl(ax, ys - 4, 9, '#dfe4e6'); p.rect(ax - 1, ys - 5, 4, 2, '#c8ced2'); } // 팔걸이
    p.rect(x0 + 3, ys + 4, 2, 6, '#6a7276'); p.rect(x1 - 5, ys + 4, 2, 6, '#6a7276'); p.rect(x0 + 17, ys + 4, 2, 6, '#6a7276');
    p.hl(x0, ys + 10, x1 - x0, '#2a2c2e', 0.5); p.dither(x0, ys + 4, x1 - x0, 6, '#2a2c2e', 0, 0.2);
  }
  // ── 선로 (5~6줄): 턱 → 승강장 옆면 → 어두운 바닥, 자갈, 침목, 레일 두 줄 ──
  {
    const y0 = EDGE, y1 = H;
    p.rect(0, y0, W, y1 - y0, '#24231f');
    for (let y = y0; y < y0 + 9; y++) for (let x = 0; x < W; x++) p.set(x, y, rnd(x, y, 371) > 0.9 ? '#5a5a54' : mix('#7a7a72', '#4a4a44', (y - y0) / 9)); // 승강장 옆면
    p.hl(0, y0, W, '#9a9a90');
    for (let x = 6; x < W; x += 24) { p.rect(x, y0 + 4, 8, 4, '#1a1a18'); p.hl(x, y0 + 4, 8, '#0a0a0a'); } // 턱 밑 대피 공간
    p.dither(0, y0 + 9, W, 2, '#000000', 0, 0.5);
    p.rect(0, y0 + 9, W, y1 - y0 - 9, '#2c2a26');
    for (let gy = y0 + 9; gy < y1; gy += 2) for (let gx = -2; gx < W; gx += 3) { // 자갈: 작은 돌 하나가 3×2, 위가 밝고 아래가 어둡다
      const ox = gx + ((gy >> 1) % 2) + Math.floor(rnd(gx, gy, 372) * 2), n = rnd(gx, gy, 373);
      const c = n > 0.75 ? '#76716a' : n > 0.45 ? '#5e5a52' : n > 0.2 ? '#4a4740' : '#3a3833';
      const sh = mix(c, '#000000', 0.35), hi = mix(c, '#ffffff', 0.18);
      p.hl(ox, gy, 3, c); p.set(ox, gy, hi); p.hl(ox, gy + 1, 3, sh);
    }
    p.dither(0, y0 + 9, W, 3, '#000000', 1, 0.35); // 턱 밑 그늘
    const RA = y0 + 15, RB = y0 + 26;
    for (let x = 3; x < W; x += 12) { // 침목
      p.rect(x, RA - 3, 6, RB - RA + 7, '#86847a'); p.hl(x, RA - 3, 6, '#a4a296'); p.vl(x, RA - 2, RB - RA + 5, '#96948a'); p.vl(x + 5, RA - 3, RB - RA + 7, '#5e5c54'); p.hl(x, RB + 4, 6, '#1e1c1a');
      if (rnd(x, 1, 376) > 0.6) p.set(x + 2, RA + 4, '#6a685e');
    }
    for (const ry0 of [RA, RB]) {
      for (let x = 0; x < W; x++) if (rnd(x, ry0, 374) > 0.4) p.set(x, ry0 + 3, '#6a4a32', 0.5); // 녹 가루
      p.hl(0, ry0 - 1, W, '#2e3034'); p.hl(0, ry0, W, '#d6dade'); p.hl(0, ry0 + 1, W, '#6a6e72'); p.hl(0, ry0 + 2, W, '#3e4044');
      for (let x = 3; x < W; x += 12) { p.rect(x + 1, ry0 + 1, 4, 2, '#26282a'); p.set(x + 1, ry0 + 1, '#5a5e62'); } // 레일 고정쇠
    }
    for (let x = 0; x < W; x++) if (rnd(x, 5, 375) > 0.94) p.set(x, RA + 6 + Math.floor(rnd(x, 6, 375) * 4), '#8a8a80', 0.7);
  }
  // ── 옆벽 ──
  const props: Prop[] = [];
  p.rect(0, 0, 10, EDGE, '#000000'); slab(p, 10, 0, EDGE, true);
  p.rect(W - 10, 0, 10, EDGE, '#000000'); slab(p, W - 16, 0, EDGE, false);
  void s;
  return { base: p, props };
}
