// 1호선. 객차 안(subway 맵)과, 승강장에서 본 전동차 한 칸의 옆모습(trainPix).
// 토요일 낮이지만 지하 구간이라 창밖은 터널이다. 검은 유리에 차 안 형광등이 비친다.
// 객차: 위 벽에 긴 의자와 창, 문 옆 구석(7·10열), 출입문(8~9열). 아래 줄은 맞은편 의자의 등받이와 아래 벽 (앞층).
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';

// ── 색 ──
const CEIL = '#e2dfd5', CEIL_D = '#c4c0b4';
const WALL = '#dcd7c8', WALL_L = '#ebe7dc', WALL_D = '#bcb6a6', WALL_DD = '#8f8a7d';
const ST = '#aab0b7', ST_L = '#dde2e6', ST_D = '#747a82', ST_DD = '#4b5058';
const SEAT = '#2f478c', SEAT_L = '#4560a8', SEAT_D = '#22356c', SEAT_DD = '#16224a';
const PINK = '#d4688f', PINK_L = '#e88aac', PINK_D = '#a84a6e', PINK_DD = '#7a3050';
const FLOOR = '#8d8f93', FLOOR_D = '#7d7f84', FLOOR_L = '#9b9da1';
const YEL = '#eec02a', YEL_D = '#b88c18';
const SLAB = '#25262e', SLAB_L = '#3a3c46';
const LINE1 = '#1d3a8f'; // 1호선 남색

/** 간판 글씨: 읽히지 않는 한글 모양 (5×5 한 글자). */
function glyphs(p: Pix, x: number, y: number, n: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 6, r = (j: number): number => rnd(i, j, seed);
    const px = (u: number, v: number): void => p.set(gx + u, y + v, col, a);
    const fin = r(3) > 0.55, ch = fin ? 3 : 5;
    if (r(0) > 0.35) for (let u = 0; u < 3; u++) px(u, 0);
    if (r(1) > 0.3) for (let v = 0; v < ch; v++) px(0, v);
    if (r(5) > 0.5) for (let u = 0; u < 3; u++) px(u, ch - 1);
    else if (r(6) > 0.5) px(1, Math.floor(ch / 2));
    for (let v = 0; v < ch; v++) px(4, v);
    if (r(2) > 0.4) px(3, Math.floor(ch / 2));
    if (fin) for (let u = 0; u < 5; u++) px(u, 4);
  }
}
/** 아주 작은 글씨 줄: 한 글자가 2~3px. 읽히지 않는 안내문. */
function tinyLine(p: Pix, x: number, y: number, w: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < w; i++) if (rnd(x + i, y, seed) > 0.3 && (i % 4) !== 3) p.set(x + i, y, col, a);
}

/** 터널 속을 달리는 차창: 검은 유리, 차 안 형광등과 맞은편 창이 비친다. 아래쪽에 맞은편 의자 등받이가 남색으로 어린다. */
function darkGlass(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const t = (y - y0) / h;
    let c = mix('#0c1018', '#141b27', t);
    if (y >= y0 + h - 5) c = mix(c, '#1c2748', 0.55); // 맞은편 등받이가 비친다
    if (rnd(x >> 3, y, seed) > 0.985) c = mix(c, '#3a4352', 0.5); // 터널 벽의 케이블, 흐르는 점
    p.set(x, y, c);
  }
  // 터널 속 케이블 두 줄: 아주 흐리게
  for (const [yy, a] of [[y0 + 9, 0.35], [y0 + 11, 0.25]] as const) for (let x = x0; x < x0 + w; x++) if (rnd(x >> 1, yy, seed + 1) > 0.25) p.set(x, yy, '#2a3240', a);
  // 차 안 형광등이 유리에 비친 줄 (위쪽)과, 맞은편 창틀이 비친 흐린 세로줄
  for (let x = x0 + 2; x < x0 + w - 2; x++) if ((x - x0) % 23 < 17) p.set(x, y0 + 3, '#6a7688', 0.55);
  for (let x = x0 + 3; x < x0 + w - 3; x++) if ((x - x0) % 23 < 15) p.set(x, y0 + 4, '#3e4858', 0.4);
  for (let k = x0 + 11; k < x0 + w - 2; k += 22) p.vl(k, y0 + 6, h - 12, '#2c3444', 0.6);
  // 비스듬한 반사 두 줄
  for (let i = 0; i < 7; i++) { p.set(x0 + w - 12 + i, y0 + h - 4 - i * 2, '#5a6678', 0.35); p.set(x0 + w - 9 + i, y0 + h - 4 - i * 2, '#5a6678', 0.2); }
}
/** 둥근 모서리 창틀: 바깥 알루미늄, 안쪽 검은 고무. */
function windowFrame(p: Pix, x0: number, y0: number, w: number, h: number): void {
  p.rect(x0 - 2, y0 - 2, w + 4, h + 4, ST);
  p.hl(x0 - 1, y0 - 2, w + 2, ST_L); p.vl(x0 - 2, y0 - 1, h + 2, ST_L);
  p.hl(x0 - 1, y0 + h + 1, w + 2, ST_D); p.vl(x0 + w + 1, y0 - 1, h + 2, ST_D);
  for (const [cx, cy] of [[x0 - 2, y0 - 2], [x0 + w + 1, y0 - 2], [x0 - 2, y0 + h + 1], [x0 + w + 1, y0 + h + 1]] as const) p.set(cx, cy, WALL);
  p.rect(x0 - 1, y0 - 1, w + 2, h + 2, '#24272c');
}
/** 광고 액자 하나. kind 마다 다른 광고. */
function poster(p: Pix, x: number, y: number, w: number, h: number, kind: number, seed: number): void {
  p.rect(x - 1, y - 1, w + 2, h + 2, ST_D); p.hl(x - 1, y - 1, w + 2, ST_L); p.hl(x - 1, y + h, w + 2, ST_DD);
  const in_ = (c: string): void => p.rect(x, y, w, h, c);
  switch (kind % 6) {
    case 0: // 학원: 흰 바탕, 남색 띠, 붉은 큰 글씨
      in_('#f4f2ec'); p.rect(x, y, w, 3, '#203a7a'); glyphs(p, x + 2, y + 4, 3, '#d0342c', seed); tinyLine(p, x + 2, y + h - 2, w - 4, '#6a6a70', seed);
      p.rect(x + w - 7, y + 4, 5, 5, '#f2c230'); break;
    case 1: // 피부과: 살구빛, 흐린 동그라미
      in_('#f2dcd0'); p.ell(x + w - 7, y + h / 2, 4, 4, '#fbeee6'); p.ell(x + w - 7, y + h / 2, 2, 2, '#e8b8a8');
      glyphs(p, x + 2, y + 2, 2, '#8a4a5a', seed); tinyLine(p, x + 2, y + h - 3, w - 12, '#b07a80', seed); tinyLine(p, x + 2, y + h - 2, w - 14, '#b07a80', seed + 1); break;
    case 2: // 공익 광고: 연두, 흰 글씨
      in_('#7cc08a'); p.rect(x, y + h - 3, w, 3, '#5aa06a'); glyphs(p, x + 3, y + 2, 3, '#ffffff', seed); break;
    case 3: // 법률 상담: 짙은 남색, 노란 전화번호
      in_('#1e2a4a'); glyphs(p, x + 2, y + 1, 2, '#f2d060', seed); text(p, x + 2, y + h - 5, '1588', '#ffffff'); break;
    case 4: // 여행: 하늘과 바다
      for (let j = 0; j < h; j++) p.hl(x, y + j, w, j < h * 0.55 ? mix('#8cc8ec', '#cce8f6', j / h) : '#2e7ab8');
      p.hl(x, y + Math.round(h * 0.55), w, '#e8f4fa'); p.ell(x + w - 6, y + 3, 1.6, 1.6, '#fff4c0');
      p.vl(x + 8, y + 3, 4, '#f8f8f8'); p.set(x + 7, y + 5, '#f8f8f8'); p.set(x + 7, y + 6, '#f8f8f8'); p.hl(x + 6, y + 7, 5, '#6a4a3a');
      glyphs(p, x + 12, y + 1, 2, '#ffffff', seed, 0.9); break;
    default: // 코레일 안내: 흰 바탕, 남색 줄
      in_('#f6f6f2'); p.hl(x, y + 2, w, LINE1); glyphs(p, x + 2, y + 4, 3, '#2a2a30', seed);
      p.ell(x + w - 5, y + h - 4, 2, 2, LINE1); p.set(x + w - 5, y + h - 4, '#ffffff');
  }
  p.set(x, y, '#ffffff', 0.5); // 액자 유리에 비친 빛 한 점
}

// ═══════════════════ 1호선 객차 안 ═══════════════════
export function subway(_s: PlaceState): Place {
  const m = MAPS.subway, top = 56, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T, tx = (c: number): number => c * T;
  const WB = ry(1); // 72: 위 벽이 바닥과 만나는 줄
  const X0 = tx(1), X1 = tx(17); // 차 안 (양 끝은 차체 벽)
  const SECS = [tx(1), tx(11)]; // 의자 칸의 왼쪽 끝 (각 96px, 6칸)
  const DX0 = tx(8), DX1 = tx(10); // 출입문 128..160
  p.rect(0, 0, W, H, '#000000');

  // ── 천장: 형광등 덮개가 길게 이어진다 ──
  for (let y = 0; y < 10; y++) for (let x = X0; x < X1; x++) p.set(x, y, mix(CEIL_D, CEIL, Math.min(1, y / 6)));
  p.hl(X0, 0, X1 - X0, '#3a3c42');
  for (let x = X0 + 4; x < X1 - 4; x += 46) {
    const w = Math.min(42, X1 - 4 - x);
    p.rect(x, 2, w, 5, '#cfd3d0'); p.rect(x + 1, 3, w - 2, 3, '#f6f8f2'); p.hl(x + 1, 4, w - 2, '#ffffff');
    p.hl(x, 7, w, '#a8aaa4');
  }
  p.hl(X0, 9, X1 - X0, CEIL_D); p.hl(X0, 10, X1 - X0, '#a9a497');
  // ── 광고 띠 (비스듬한 굽은 벽) ──
  for (let y = 11; y < 23; y++) for (let x = X0; x < X1; x++) p.set(x, y, mix('#d2cdbe', '#c6c1b2', (y - 11) / 12));
  for (let s = 0; s < 2; s++) for (let i = 0; i < 3; i++) {
    const x = SECS[s] + 4 + i * 31;
    poster(p, x, 12, 27, 9, [0, 1, 2, 3, 4, 5][(s * 3 + i + 1) % 6], 200 + s * 3 + i);
  }
  { // 노선도: 문 위. 남색 줄 위에 역 점, 지금 역은 붉은 점. 갈아타는 역은 다른 색 고리.
    const x = tx(7) + 2, y = 12, w = 60, h = 9;
    p.rect(x - 1, y - 1, w + 2, h + 2, ST_D); p.hl(x - 1, y - 1, w + 2, ST_L); p.rect(x, y, w, h, '#f8f8f4');
    p.hl(x + 2, y + 5, w - 4, LINE1); p.hl(x + 2, y + 6, w - 4, mix(LINE1, '#000000', 0.2));
    for (let i = 0; i < 10; i++) {
      const sx = x + 3 + i * 6;
      const tr = i === 2 ? '#3aa64a' : i === 6 ? '#2e9ad8' : i === 8 ? '#f08a2a' : '';
      p.set(sx, y + 5, '#ffffff'); p.set(sx, y + 6, '#ffffff');
      if (tr) { p.set(sx - 1, y + 5, tr); p.set(sx + 1, y + 5, tr); p.set(sx - 1, y + 6, tr); p.set(sx + 1, y + 6, tr); }
      if (i % 2 === 0) p.hl(sx - 1, y + 2, 3, '#8a8a90');
    }
    const cur = x + 3 + 4 * 6; p.rect(cur - 1, y + 4, 3, 4, '#d8302a'); p.set(cur, y + 5, '#ff8a7a'); // 지금 역
    p.hl(cur - 2, y + 1, 5, '#2a2a30');
  }
  // ── 선반 (의자 위): 스테인리스 그물 ──
  for (const sx of SECS) {
    p.hl(sx + 1, 23, 94, ST_L); p.hl(sx + 1, 24, 94, ST);
    for (let x = sx + 1; x < sx + 95; x++) p.set(x, 25, x % 2 ? ST_D : '#c6cbd0');
    p.hl(sx + 1, 26, 94, ST_DD);
    for (let x = sx + 8; x < sx + 95; x += 30) { p.rect(x, 23, 2, 4, ST_D); p.set(x, 23, ST_L); } // 받침
  }
  // ── 위 벽: 크림색 판. 창, 의자, 문, 구석 ──
  for (let y = 23; y < WB; y++) for (let x = X0; x < X1; x++) {
    if (y < 27 && SECS.some((sx) => x > sx && x < sx + 95)) continue; // 선반 자리
    const seam = (x - X0) % 48 === 0;
    p.set(x, y, seam ? WALL_D : rnd(x, y, 210) > 0.97 ? mix(WALL, WALL_D, 0.5) : WALL);
  }
  for (const sx of SECS) p.hl(sx + 1, 27, 94, WALL_D, 0.7); // 선반 그늘
  // 창: 의자 칸마다 둘.
  for (const sx of SECS) for (const [wx, i] of [[sx + 5, 0], [sx + 50, 1]] as const) {
    const wy = 30, ww = 41, wh = 21;
    windowFrame(p, wx, wy, ww, wh);
    darkGlass(p, wx, wy, ww, wh, 220 + sx + i);
  }
  p.hl(X0, 53, X1 - X0, WALL_L); p.hl(X0, 54, X1 - X0, WALL_D); // 창턱
  // 아래 벽 걸레받이 (구석)
  for (const cx of [tx(7), tx(10)]) { p.rect(cx, WB - 5, T, 5, ST); p.hl(cx, WB - 5, T, ST_L); p.hl(cx, WB - 1, T, ST_DD); }

  { // 왼쪽 구석 (7열): 비상 인터폰과 안내 스티커
    const x = tx(7) + 4;
    p.rect(x, 40, 8, 10, '#e6e2d8'); p.hl(x, 40, 8, '#f6f4ee'); p.rect(x, 40, 8, 2, '#d4382e'); p.vl(x + 7, 41, 9, WALL_D);
    for (let j = 0; j < 3; j++) p.hl(x + 2, 44 + j * 2, 4, '#5a5a60'); p.rect(x + 3, 51, 2, 1, '#2a2a30');
    p.rect(x + 1, 32, 6, 5, '#f2a020'); p.set(x + 3, 33, '#ffffff'); p.set(x + 3, 34, '#ffffff'); p.set(x + 3, 36, '#ffffff');
  }
  { // 오른쪽 구석 (10열): 붙은 안내문, 비상 코크 덮개
    const x = tx(10) + 3;
    p.rect(x, 33, 10, 13, '#f8f7f2'); p.hl(x, 33, 10, LINE1); for (let j = 0; j < 4; j++) tinyLine(p, x + 1, 36 + j * 2, 8, '#6a6a72', 250 + j);
    p.hl(x, 46, 10, WALL_DD, 0.5);
    p.rect(x + 2, 56, 7, 6, '#c8ccd0'); p.hl(x + 2, 56, 7, ST_L); p.rect(x + 3, 58, 5, 2, '#d03a30'); p.hl(x + 2, 61, 7, ST_D);
  }

  // ── 의자 (위 줄): 남색 모켓 등받이와 방석. 끝에 스테인리스 팔걸이. ──
  const bench = (sx: number, pink: number): void => {
    for (let c = 0; c < 6; c++) {
      const x0 = sx + c * T, pk = c === pink;
      const B = pk ? PINK : SEAT, BL = pk ? PINK_L : SEAT_L, BD = pk ? PINK_D : SEAT_D, BDD = pk ? PINK_DD : SEAT_DD;
      for (let y = 55; y < 86; y++) for (let x = x0; x < x0 + T; x++) {
        const k = x - x0;
        let col: string;
        const top_ = mix(B, BL, 0.55), soft = mix(B, BD, 0.5);
        if (y === 55) col = k === 0 ? BD : k === 15 ? soft : BL;                    // 등받이 윗단: 자리마다 살짝 꺼진다
        else if (y < 58) col = k === 0 ? soft : top_;
        else if (y < 72) col = y > 68 ? soft : k === 0 ? soft : k < 4 ? mix(B, BL, 0.2) : B; // 등받이: 아래로 갈수록 그늘
        else if (y === 72) col = BDD;                                               // 등받이와 방석이 만나는 골
        else if (y < 79) col = y === 73 ? BD : k === 0 ? mix(top_, B, 0.5) : top_;  // 방석 윗면 (빛을 받는다)
        else if (y === 79) col = BL;                                                // 방석 앞 모서리
        else col = y > 83 ? BDD : y === 80 ? B : BD;                                // 방석 앞면
        if (y > 56 && y < 84 && y !== 72 && ((x * 3 + y * 5) % 11 === 0)) col = mix(col, '#ffffff', 0.08); // 모켓 결
        p.set(x, y, col);
      }
    }
    // 의자 밑: 난방기 망
    p.rect(sx, 86, 96, 2, '#2a2c32'); for (let x = sx + 1; x < sx + 95; x += 2) p.set(x, 86, '#4a4e56');
    // 팔걸이 겸 칸막이 (문 쪽 끝만, 차 끝은 벽)
    const ex = sx === SECS[0] ? sx + 94 : sx;
    p.rect(ex - 1, 50, 4, 36, ST); p.vl(ex - 1, 50, 36, ST_L); p.vl(ex + 2, 50, 36, ST_D); p.hl(ex - 1, 50, 4, ST_L);
    p.rect(ex, 56, 2, 14, '#c9d2d8'); // 칸막이 판 (반투명)
  };
  bench(SECS[0], -1); bench(SECS[1], -1);
  // 손잡이 봉과 고리: 의자 앞 모서리 위. 흰 고리가 늘어섰다.
  for (const sx of SECS) {
    p.hl(sx, 39, 96, ST_L); p.hl(sx, 40, 96, ST_D);
    for (let x = sx + 6; x < sx + 94; x += 12) {
      p.vl(x, 41, 3, '#8a9098');                                                    // 끈
      p.set(x, 44, '#f4f4ee'); p.set(x - 1, 45, '#f4f4ee'); p.set(x + 1, 45, '#d8d8d0'); p.hl(x - 1, 46, 3, '#b8b8b0'); // 세모 고리
    }
  }

  // ── 바닥: 회색 바닥재, 가운데 미끄럼 방지 줄 ──
  for (let y = WB; y < ry(5); y++) for (let x = X0; x < X1; x++) {
    const n = rnd(x, y, 260), b = rnd(x >> 3, y >> 2, 261);
    p.set(x, y, n > 0.95 ? FLOOR_D : n < 0.04 ? FLOOR_L : b > 0.85 ? mix(FLOOR, FLOOR_D, 0.4) : FLOOR);
  }
  for (let x = X0 + 64; x < X1; x += 64) for (let y = WB; y < ry(5); y++) p.set(x, y, FLOOR_D, 0.6); // 바닥재 이음매
  { // 미끄럼 방지 줄: 통로 한가운데
    const y0 = ry(3) - 3;
    p.hl(X0, y0, X1 - X0, '#6a6c71'); p.hl(X0, y0 + 5, X1 - X0, '#6a6c71');
    for (let y = y0 + 1; y < y0 + 5; y++) for (let x = X0; x < X1; x++) p.set(x, y, (x + (y & 1)) % 3 === 0 ? '#76787d' : '#a5a7ab');
    p.hl(X0, y0 + 6, X1 - X0, FLOOR_L, 0.6);
  }
  for (let x = X0; x < X1; x++) if (rnd(x, 5, 262) > 0.94) p.set(x, WB + 30 + Math.floor(rnd(x, 6, 262) * 30), '#6e7074'); // 신발 자국 몇 점
  // 의자 밑 그늘, 벽 그늘
  for (const sx of SECS) { p.hl(sx, ry(2), 96, '#2a2c32', 0.55); p.dither(sx, ry(2) + 1, 96, 2, '#2a2c32', 0, 0.3); }
  for (const cx of [tx(7), tx(10)]) { p.hl(cx, WB, T, '#2a2c32', 0.45); p.dither(cx, WB + 1, T, 1, '#2a2c32', 0, 0.3); }
  // 문 앞 (위·아래): 알루미늄 문턱과 노란 선
  const sill = (y: number, flip: boolean): void => {
    for (let x = DX0 - 2; x < DX1 + 2; x++) for (let j = 0; j < 4; j++) p.set(x, y + j, x % 2 ? '#c6cace' : '#8e9298');
    p.hl(DX0 - 2, flip ? y - 1 : y + 4, DX1 - DX0 + 4, ST_DD);
    const yy = flip ? y - 4 : y + 5;
    p.rect(DX0 - 2, yy, DX1 - DX0 + 4, 3, YEL); p.hl(DX0 - 2, flip ? yy : yy + 2, DX1 - DX0 + 4, YEL_D);
    for (let x = DX0; x < DX1; x += 3) p.set(x, yy + 1, '#f6dc70'); // 점자 블록 같은 오돌토돌
  };
  sill(ry(2), false); sill(ry(4) - 4, true);

  // ── 출입문 (8~9열): 양쪽 미닫이, 길쭉한 유리창, 노란 경고 띠. 문간이 의자 앞 모서리까지 나와 있다. ──
  const DT = 42, DB = ry(2); // 문짝 위, 아래
  {
    const x0 = DX0, x1 = DX1, y0 = DT;
    p.rect(x0 - 4, y0 - 5, x1 - x0 + 8, DB - y0 + 5, ST); // 문틀
    p.hl(x0 - 4, y0 - 5, x1 - x0 + 8, ST_L); p.hl(x0 - 4, y0 - 4, x1 - x0 + 8, mix(ST, ST_L, 0.5));
    p.vl(x0 - 1, y0 - 1, DB - y0 + 1, ST_DD); p.vl(x1, y0 - 1, DB - y0 + 1, ST_DD); p.hl(x0 - 1, y0 - 1, x1 - x0 + 2, ST_DD);
    // 문틀 위 LED 안내판: 다음 역 이름이 주황 점으로 흐른다
    p.rect(x0 + 3, y0 - 4, 26, 3, '#101114'); for (let x = x0 + 4; x < x0 + 28; x++) if (rnd(x, 24, 230) > 0.5) p.set(x, y0 - 3, x < x0 + 9 ? '#ff9a3a' : '#e8601a');
    // 문 위 벽의 문 번호판 (4-3)
    p.rect(x0 + 11, 29, 11, 7, '#f6f6f2'); p.hl(x0 + 11, 35, 11, WALL_DD); text(p, x0 + 12, 30, '4', LINE1); p.set(x0 + 16, 32, LINE1); text(p, x0 + 18, 30, '3', LINE1);
    for (let leaf = 0; leaf < 2; leaf++) {
      const lx = x0 + leaf * 16, lw = 16;
      for (let y = y0; y < DB; y++) for (let x = lx; x < lx + lw; x++) {
        const k = x - lx;
        p.set(x, y, k === 0 ? ST_L : k === lw - 1 ? ST_D : (y + k * 3) % 29 === 0 ? mix(ST, ST_L, 0.4) : ST);
      }
      // 유리창: 길쭉하다, 모서리가 둥글다
      const gx = lx + 3, gy = y0 + 4, gw = 10, gh = 21;
      p.rect(gx - 1, gy - 1, gw + 2, gh + 2, '#202328');
      darkGlass(p, gx, gy, gw, gh, 240 + leaf);
      for (const [cx, cy] of [[gx - 1, gy - 1], [gx + gw, gy - 1], [gx - 1, gy + gh], [gx + gw, gy + gh]] as const) p.set(cx, cy, ST);
      p.hl(gx - 1, gy + gh + 1, gw + 2, ST_L, 0.7);
      // 손 끼임 주의 스티커 (유리 아래, 동그란 빨간 테)
      const sx = leaf ? gx + 1 : gx + gw - 5, sy = gy + gh - 6;
      p.rect(sx, sy, 4, 4, '#f6f4ee'); p.hl(sx, sy, 4, '#d43a32'); p.hl(sx, sy + 3, 4, '#d43a32'); p.vl(sx, sy, 4, '#d43a32'); p.vl(sx + 3, sy, 4, '#d43a32'); p.set(sx + 1, sy + 2, '#2a2a2a');
      // 노란 경고 띠 (검은 빗금)
      for (let y = y0 + 30; y < y0 + 33; y++) for (let x = lx + 1; x < lx + lw - 1; x++) p.set(x, y, (x + y) % 4 < 2 ? YEL : '#2a2622');
      p.hl(lx + 1, y0 + 33, lw - 2, YEL_D);
      // 문 아래쪽: 발로 찬 자국
      for (let x = lx + 2; x < lx + lw - 2; x++) if (rnd(x, 70, 241 + leaf) > 0.7) p.set(x, DB - 2 - Math.floor(rnd(x, 1, 241) * 3), ST_D, 0.6);
    }
    // 가운데 고무: 두 문짝이 맞닿는 자리
    p.rect(x0 + 15, y0, 2, DB - y0, '#1a1c20'); p.vl(x0 + 16, y0 + 2, DB - y0 - 4, '#3a3d44');
    p.hl(x0 - 4, DB - 1, x1 - x0 + 8, ST_DD);
  }
  const props: Prop[] = [];
  { // 위 줄 의자 끝의 세로 봉: 의자 앞 모서리에 서서 천장의 손잡이 봉까지 오른다
    const L = new Pix(W, H);
    for (const x of [tx(7), tx(11)]) {
      L.rect(x - 1, 39, 3, ry(2) - 39, ST); L.vl(x - 1, 39, ry(2) - 39, ST_L); L.vl(x + 1, 39, ry(2) - 39, ST_D);
      for (let y = 44; y < ry(2) - 3; y += 9) L.set(x, y, '#eef2f4');
      L.rect(x - 2, ry(2) - 2, 5, 2, ST_D); L.hl(x - 2, ry(2) - 2, 5, ST_L); // 바닥 받침
      L.rect(x - 2, 38, 5, 3, ST_D); L.hl(x - 2, 38, 5, ST_L);              // 봉과 봉이 만나는 이음쇠
    }
    props.push(cut(L, top, 2 * T));
  }
  // ── 아래 줄: 맞은편 의자. 방석(foot 64)과 등받이·아래 벽(foot 80)을 따로 뗀다. ──
  const SB = [tx(1), tx(11)];
  {
    const L = new Pix(W, H), y0 = ry(4) - 8;
    for (const sx of SB) for (let c = 0; c < 6; c++) {
      const x0 = sx + c * T, pk = sx === SB[1] && c === 0; // 11열: 임산부 배려석 (분홍)
      const B = pk ? PINK : SEAT, BL = pk ? PINK_L : SEAT_L, BD = pk ? PINK_D : SEAT_D;
      for (let y = y0; y < y0 + 12; y++) for (let x = x0; x < x0 + T; x++) {
        const k = x - x0;
        let col = y === y0 ? BL : y === y0 + 1 ? mix(B, BL, 0.5) : k === 0 ? BD : B;
        if (y > y0 && (x * 3 + y * 5) % 11 === 0) col = mix(col, '#ffffff', 0.08);
        L.set(x, y, col);
      }
    }
    props.push(cut(L, top, 4 * T));
  }
  {
    const L = new Pix(W, H), y0 = ry(4) + 2, yb = ry(5);
    // 등받이: 뒤에서 본다. 위가 둥글게 말린 남색 모켓, 한 자리씩 골.
    for (const sx of SB) {
      for (let c = 0; c < 6; c++) {
        const x0 = sx + c * T, pk = sx === SB[1] && c === 0;
        const B = pk ? PINK : SEAT, BL = pk ? PINK_L : SEAT_L, BD = pk ? PINK_D : SEAT_D, BDD = pk ? PINK_DD : SEAT_DD;
        for (let y = y0; y < yb; y++) for (let x = x0; x < x0 + T; x++) {
          const k = x - x0;
          let col: string;
          if (y === y0) col = k === 0 || k === 15 ? BD : BL;
          else if (y === y0 + 1) col = k === 0 ? BD : mix(B, BL, 0.5);
          else col = k === 0 ? mix(B, BD, 0.6) : y > yb - 3 ? BD : y < y0 + 4 ? mix(B, BL, 0.2) : B;
          if (y > y0 + 1 && y < yb - 2 && (x * 3 + y * 5) % 11 === 0) col = mix(col, '#ffffff', 0.08);
          L.set(x, y, col);
        }
        if (pk) { // 등받이 위의 분홍 표시판
          L.ell(x0 + 8, y0 + 7, 3, 3, '#fbeef3'); L.ell(x0 + 8, y0 + 7, 1.6, 1.6, PINK_D); L.set(x0 + 8, y0 + 6, '#fbeef3');
        }
      }
    }
    // 칸막이: 문 쪽 의자 끝
    for (const x of [tx(7), tx(11)]) {
      L.rect(x - 2, y0 - 10, 4, yb - y0 + 10, ST); L.vl(x - 2, y0 - 10, yb - y0 + 10, ST_L); L.vl(x + 1, y0 - 10, yb - y0 + 10, ST_D);
      L.hl(x - 2, y0 - 10, 4, ST_L); L.rect(x - 1, y0 - 6, 2, 8, '#c9d2d8');
    }
    // 아래 벽: 잘라 낸 차체 벽의 윗면. 창턱(크림), 스테인리스 겉판, 그 아래는 어둠.
    L.rect(0, yb, W, H - yb, '#0a0b0e');
    L.rect(X0, yb, X1 - X0, 4, WALL); L.hl(X0, yb, X1 - X0, WALL_L); L.hl(X0, yb + 3, X1 - X0, WALL_DD);
    L.rect(X0, yb + 4, X1 - X0, 3, ST); L.hl(X0, yb + 4, X1 - X0, ST_L); L.hl(X0, yb + 6, X1 - X0, ST_D);
    L.rect(X0, yb + 7, X1 - X0, 3, LINE1); L.hl(X0, yb + 9, X1 - X0, mix(LINE1, '#000000', 0.35)); // 겉판의 남색 띠 단면
    L.rect(X0, yb + 10, X1 - X0, 6, SLAB); L.hl(X0, yb + 10, X1 - X0, SLAB_L);
    { // 아래 출입문 (8~9열): 등받이 높이에서 잘라 낸 문짝 두 장. 유리창 윗부분, 가운데 고무, 노란 띠.
      const y = ry(4) + 2;
      L.rect(DX0 - 3, y - 1, DX1 - DX0 + 6, yb - y + 8, ST); L.hl(DX0 - 3, y - 1, DX1 - DX0 + 6, ST_L); L.vl(DX0 - 3, y - 1, yb - y + 8, ST_L); L.vl(DX1 + 2, y - 1, yb - y + 8, ST_D);
      for (let leaf = 0; leaf < 2; leaf++) {
        const lx = DX0 + leaf * 16;
        L.rect(lx, y + 1, 16, yb - y + 5, mix(ST, ST_L, 0.25)); L.vl(lx, y + 1, yb - y + 5, ST_L); L.vl(lx + 15, y + 1, yb - y + 5, ST_D);
        L.rect(lx + 3, y + 3, 10, 6, '#202328'); L.rect(lx + 4, y + 4, 8, 5, '#121820'); L.hl(lx + 4, y + 4, 8, '#3a4656'); // 유리 윗부분
        for (let x = lx + 1; x < lx + 15; x++) L.set(x, y + 11, (x >> 1) % 2 ? YEL : '#2a2622');
      }
      L.rect(DX0 + 15, y, 2, yb - y + 7, '#1a1c20');
    }
    props.push(cut(L, top, 5 * T));
  }
  // 양 끝 차체 벽 (0열, 17열): 연결문 쪽. 단면만 보인다.
  for (const x of [X0 - 6, X1]) { p.rect(x, 0, 6, H, SLAB); p.vl(x === X1 ? x : x + 5, 0, H, SLAB_L); }
  return { base: p, props };
}

// ═══════════════════ 승강장에서 본 전동차 한 칸 ═══════════════════
// 스테인리스 차체, 남색 띠, 불 켜진 창 안에 서 있는 사람의 그림자, 출입문 넷. 같은 그림 두 장을 이어 붙여 두 칸으로 쓴다.
const TW = 320, TH = 60;
/** 문 가운데의 x (그림 좌표). */
export const TRAIN_DOORS: number[] = [40, 120, 200, 280];
const DOOR_HW = 10, BODY_T = 7, BODY_B = 53, WIN_T = 16, WIN_B = 32, DOOR_T = 12;

function trainBody(open: boolean): Pix {
  const p = new Pix(TW, TH);
  // 지붕: 둥근 지붕, 냉방기 두 대
  for (let y = 2; y < BODY_T; y++) for (let x = 1; x < TW - 1; x++) p.set(x, y, mix('#6e747c', '#b4bac1', (y - 2) / 5));
  p.hl(2, 2, TW - 4, '#8e949b');
  for (const x0 of [64, 200]) { p.rect(x0, 0, 56, 3, '#9aa0a8'); p.hl(x0, 0, 56, '#c4cad0'); for (let x = x0 + 3; x < x0 + 54; x += 4) p.set(x, 1, '#6e747c'); }
  // 차체: 스테인리스. 위는 매끈하고 아래는 세로 골.
  for (let y = BODY_T; y < BODY_B; y++) for (let x = 0; x < TW; x++) {
    let c = y === BODY_T ? '#e6eaee' : y < BODY_T + 3 ? '#cfd4d9' : '#c2c7cd';
    if (y > 41 && x % 4 === 0) c = '#a7adb4';
    if (y > 41 && x % 4 === 1) c = '#d6dadf';
    p.set(x, y, c);
  }
  p.rect(0, 10, TW, 2, LINE1);            // 창 위 가는 남색 띠
  p.rect(0, 35, TW, 5, LINE1); p.hl(0, 35, TW, '#3a58b0'); p.hl(0, 39, TW, '#13286a'); // 창 아래 굵은 남색 띠
  p.hl(0, 40, TW, '#5a8ad8');             // 하늘색 가는 줄
  p.hl(0, BODY_B - 1, TW, '#7a8088');
  // 양 끝: 연결막(주름)
  for (const x of [0, TW - 3]) { p.rect(x, BODY_T + 2, 3, BODY_B - BODY_T - 2, '#3a3e44'); for (let y = BODY_T + 3; y < BODY_B; y += 2) p.hl(x, y, 3, '#555a62'); }
  // 하부: 기기 상자, 대차와 바퀴
  p.rect(2, BODY_B, TW - 4, TH - BODY_B, '#2c2e33'); p.hl(2, BODY_B, TW - 4, '#45484f');
  for (const [x0, w] of [[70, 40], [130, 24], [176, 50], [240, 20]] as const) { p.rect(x0, BODY_B + 1, w, 4, '#3a3d43'); p.hl(x0, BODY_B + 1, w, '#50545c'); }
  for (const cx of [22, 46, TW - 46, TW - 22]) {
    p.ell(cx, TH - 2, 5, 4, '#1a1b1e'); p.ell(cx, TH - 2, 3, 2.5, '#3a3c42'); p.set(cx, TH - 3, '#6a6e76');
  }
  for (const x0 of [14, TW - 54]) { p.rect(x0, BODY_B + 2, 40, 2, '#1e2024'); p.hl(x0, BODY_B + 2, 40, '#3e4148'); } // 대차 틀
  // 창: 문과 문 사이에 둘, 양 끝 칸에 하나
  const wins: [number, number][] = [[7, 20]];
  for (let i = 0; i < 3; i++) { const a = TRAIN_DOORS[i] + DOOR_HW + 5, b = TRAIN_DOORS[i + 1] - DOOR_HW - 5, w = Math.floor((b - a - 4) / 2); wins.push([a, w], [a + w + 4, w]); }
  wins.push([TW - 27, 20]);
  wins.forEach(([x0, w], i) => litWindow(p, x0, WIN_T, w, WIN_B - WIN_T, 300 + i, i));
  // 문
  TRAIN_DOORS.forEach((cx, i) => (open ? openDoor : shutDoor)(p, cx, i));
  // 노선 표시 (남색 동그라미에 1), 차량 번호
  { const bx = TRAIN_DOORS[1] + 40; p.ell(bx, 46, 4, 4, '#ffffff'); p.ell(bx, 46, 3.4, 3.4, LINE1); text(p, bx - 1, 44, '1', '#ffffff'); }
  text(p, TRAIN_DOORS[2] + 30, 44, '311', '#4a5058');
  p.rect(TW - 16, 44, 9, 5, '#2a2c30'); p.rect(TW - 15, 45, 7, 3, '#e8601a', 0.85); // 끝의 작은 표시등
  return p;
}
/** 불 켜진 창: 크림색 차 안, 맞은편 창은 어둡고, 손잡이 고리, 서 있는 사람의 그림자 (얼굴 없음). */
function litWindow(p: Pix, x0: number, y0: number, w: number, h: number, seed: number, idx: number): void {
  p.rect(x0 - 1, y0 - 1, w + 2, h + 2, '#2a2d33');
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    let c = y < y0 + 2 ? '#fbfcf4' : y < y0 + 4 ? '#e6e8dc' : '#d8d8c8';
    if (y >= y0 + 4 && y < y0 + 10 && (x - x0) % 14 > 2) c = '#5a6270';       // 맞은편 창 (터널 쪽이라 어둡다)
    if (y >= y0 + 11) c = '#3a4f92';                                            // 맞은편 의자 등받이
    if (y === y0 + 10) c = '#c4c4b4';
    p.set(x, y, c);
  }
  for (let x = x0 + 2; x < x0 + w - 1; x += 4) { p.set(x, y0 + 4, '#8a8e94'); p.set(x, y0 + 5, '#f2f2ea'); } // 손잡이 고리
  p.hl(x0, y0 + 3, w, '#a8acb0');                                                 // 손잡이 봉
  // 서 있는 사람들: 머리와 어깨만 보인다. 칸마다 다르게.
  const sil = ['#4a5060', '#565c6a', '#3e4452', '#625a5a'];
  const n = idx === 0 || idx === 7 ? 1 : 1 + Math.floor(rnd(seed, 1, 310) * 2.4);
  for (let k = 0; k < n; k++) {
    const cx = x0 + 3 + Math.floor(rnd(seed, k + 2, 311) * (w - 6)), c = sil[(seed + k) % sil.length], hy = y0 + 4 + Math.floor(rnd(seed, k, 312) * 3);
    p.ell(cx, hy + 2, 2.2, 2.6, c);                                               // 머리
    if (rnd(seed, k, 313) > 0.5) { p.hl(cx - 2, hy, 5, mix(c, '#000000', 0.25)); p.set(cx + 2, hy + 1, mix(c, '#000000', 0.25)); } // 모자나 머리카락 결
    for (let y = hy + 5; y < y0 + h; y++) { const hw = Math.min(5, 2 + (y - hy - 5)); p.hl(cx - hw, y, hw * 2 + 1, c); } // 어깨와 몸
    if (rnd(seed, k, 314) > 0.55) { p.vl(cx + 4, hy, 5, c); p.set(cx + 4, hy - 1, c); } // 손잡이를 잡은 팔
  }
  // 유리 반사
  for (let i = 0; i < Math.min(6, h - 2); i++) p.set(x0 + w - 4 - i, y0 + 1 + i * 2, '#ffffff', 0.35);
  p.hl(x0, y0 + h, w, '#e8ecef'); // 창 아래 테
}
function doorFrame(p: Pix, cx: number): void {
  const x0 = cx - DOOR_HW, x1 = cx + DOOR_HW;
  p.rect(x0 - 2, DOOR_T - 2, x1 - x0 + 4, BODY_B - DOOR_T + 2, '#8e949b');
  p.vl(x0 - 2, DOOR_T - 2, BODY_B - DOOR_T + 2, '#e2e6ea'); p.hl(x0 - 2, DOOR_T - 2, x1 - x0 + 4, '#e2e6ea');
  p.rect(x0 - 1, DOOR_T - 1, x1 - x0 + 2, BODY_B - DOOR_T + 1, '#2a2d33');
}
function shutDoor(p: Pix, cx: number, i: number): void {
  doorFrame(p, cx);
  const x0 = cx - DOOR_HW;
  for (let leaf = 0; leaf < 2; leaf++) {
    const lx = x0 + leaf * DOOR_HW, lw = DOOR_HW;
    for (let y = DOOR_T; y < BODY_B; y++) for (let x = lx; x < lx + lw; x++) {
      const k = x - lx;
      p.set(x, y, k === 0 ? '#e0e4e8' : k === lw - 1 ? '#8e949b' : y > 41 ? '#bcc1c7' : '#c8cdd2');
    }
    litWindow(p, lx + 2, WIN_T + 1, lw - 4, 12, 400 + i * 2 + leaf, 0);
    p.rect(lx + 2, 34, lw - 4, 2, YEL); p.hl(lx + 2, 36, lw - 4, YEL_D); // 노란 경고 스티커
  }
  p.rect(cx - 1, DOOR_T, 2, BODY_B - DOOR_T, '#1a1c20');
  p.set(cx - DOOR_HW + 2, DOOR_T - 4, '#7a4a2a'); p.set(cx - DOOR_HW + 3, DOOR_T - 4, '#7a4a2a'); // 꺼진 문 표시등
  p.hl(cx - DOOR_HW - 1, BODY_B - 1, DOOR_HW * 2 + 2, '#5a6068');
}
function openDoor(p: Pix, cx: number, _i: number): void {
  doorFrame(p, cx);
  const x0 = cx - DOOR_HW, x1 = cx + DOOR_HW;
  // 안쪽: 맞은편 문(닫힘, 창은 터널이라 검다), 천장 불빛, 바닥
  for (let y = DOOR_T; y < BODY_B; y++) for (let x = x0; x < x1; x++) {
    let c = y < DOOR_T + 2 ? '#fbfcf4' : y < DOOR_T + 4 ? '#ebe8dc' : '#ddd8c8';
    if (x >= x0 + 3 && x < x1 - 3 && y >= DOOR_T + 5 && y < BODY_B - 5) c = '#a6acb3';            // 맞은편 문짝
    if ((x === x0 + 5 || x === x1 - 6 || (x > x0 + 4 && x < x0 + 9) || (x > x1 - 10 && x < x1 - 5)) && y >= DOOR_T + 8 && y < DOOR_T + 20) c = '#1c222c'; // 그 창
    if (x === cx || x === cx - 1) { if (y >= DOOR_T + 5 && y < BODY_B - 5) c = '#3a3d44'; }
    if (y >= BODY_B - 5) c = y === BODY_B - 5 ? '#b0b2b4' : '#8e9094';                          // 바닥
    p.set(x, y, c);
  }
  p.rect(x0 + 3, DOOR_T + 22, 4, 2, YEL); p.rect(x1 - 7, DOOR_T + 22, 4, 2, YEL);
  // 문 옆의 세로 봉, 의자 끝 칸막이
  p.vl(x0 + 1, DOOR_T + 2, BODY_B - DOOR_T - 5, '#e8ecef'); p.vl(x1 - 2, DOOR_T + 2, BODY_B - DOOR_T - 5, '#9aa0a8');
  p.rect(x0, BODY_B - 14, 1, 9, '#3a4f92'); p.rect(x1 - 1, BODY_B - 14, 1, 9, '#3a4f92');
  // 문턱 (안쪽 빛이 발판에 떨어진다)
  p.hl(x0 - 1, BODY_B - 1, x1 - x0 + 2, '#d8dcd8');
  p.set(cx - DOOR_HW + 2, DOOR_T - 4, '#ffb040'); p.set(cx - DOOR_HW + 3, DOOR_T - 4, '#ffd080'); // 켜진 문 표시등
}
export function trainPix(): Pix { return trainBody(false); }
/** 문이 열린 같은 칸 (같은 크기). */
export function trainDoorOpen(): Pix { return trainBody(true); }
