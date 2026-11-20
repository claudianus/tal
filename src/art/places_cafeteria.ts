// 막간: 윤서의 대학 학생식당. 목요일 점심 열두 시 사십 분, 형광등이 다 켜졌다.
// places.ts 와 같은 방식: 벽 띠 → 바닥 → 막힌 칸의 물건 → 앞에 서는 것은 cut() 으로 뗀다.
// 위 벽: 메뉴판, 주방 배식구와 스테인리스 배식대(1~8,1, 오른쪽 끝 8열이 식판 더미, 줄은 오른쪽에서 왼쪽으로),
// 시계와 게시판(9~11), 식판 반납 컨베이어(12~14,1), 벽에 붙은 컵 소독기와 벽걸이 정수기(15~17, 벽 속에 묻혀 걷는 칸을 막지 않는다).
// 긴 탁자 넷(2~7, 11~16 / 3·5줄). 4줄 의자는 위(3줄 탁자)를 보고, 등받이가 앉은 사람 앞에 선다. 아래 벽 가운데(9~10)가 유리문.
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';

const SLAB = '#25262e', SLAB_L = '#383a45';
const shade = (c: string, t: number): string => (t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

/** 간판 글씨: 읽히지 않는 한글 모양 (5×5 한 글자) */
function glyphs(p: Pix, x: number, y: number, n: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 7, r = (j: number): number => rnd(i, j, seed);
    const px = (u: number, v: number): void => p.set(gx + u, y + v, col, a);
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

/** 스테인리스 식판 (위에서 본 12×7). food: 다 먹었으면 0, 반쯤 1, 그대로 2 */
function tray(L: Pix, x: number, y: number, food: number, seed: number): void {
  L.rect(x, y, 12, 7, '#cdd4d7'); L.hl(x, y, 12, '#eef2f3'); L.vl(x, y, 7, '#e2e7e9'); L.hl(x, y + 6, 12, '#959ea2'); L.vl(x + 11, y + 1, 6, '#a9b1b5');
  const well = (wx: number, wy: number, w: number, h: number, c: string | null): void => {
    L.rect(wx, wy, w, h, '#aab2b6'); L.hl(wx, wy, w, '#8c959a');
    if (c) { L.rect(wx, wy + (h > 2 ? 1 : 0), w, h - (h > 2 ? 1 : 0), c); if (w > 2) L.set(wx + 1, wy + h - 1, shade(c, 0.3)); }
  };
  const k = (j: number): number => rnd(seed, j, 41);
  const side = ['#c8402e', '#5f8a3a', '#e8c84a', '#b8452a'];
  well(x + 1, y + 1, 3, 2, food >= 1 || k(0) < 0.3 ? side[Math.floor(k(1) * 4)] : null);
  well(x + 5, y + 1, 2, 2, food >= 1 && k(2) > 0.3 ? side[Math.floor(k(3) * 4)] : null);
  well(x + 8, y + 1, 3, 2, food >= 2 || k(4) < 0.25 ? side[Math.floor(k(5) * 4)] : null);
  well(x + 1, y + 4, 5, 2, food >= 1 ? '#f4f1e8' : null);                       // 밥
  well(x + 7, y + 4, 4, 2, food >= 1 ? (k(6) < 0.5 ? '#c8602e' : '#b89a5a') : null); // 국
  if (food === 0 && k(7) > 0.4) L.set(x + 2, y + 5, '#f4f1e8');
}
/** 스테인리스 물컵 (위에서 비스듬히, 3×4) */
function cup(L: Pix, x: number, y: number): void {
  L.rect(x, y, 3, 4, '#b4bcc0'); L.hl(x, y, 3, '#7c868b'); L.set(x + 1, y, '#5c666b'); L.vl(x, y + 1, 3, '#e8edef'); L.vl(x + 2, y + 1, 3, '#8c969b');
}

export function cafeteria(_s: PlaceState): Place {
  const m = MAPS.cafeteria, top = m.top ?? 56, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T, tx = (c: number): number => c * T, WB = ry(1), F1 = ry(6);
  p.rect(0, 0, W, H, '#000000');

  // ── 뒷벽: 미색 칠, 아래는 연한 청자색 타일 띠, 걸레받이. 천장 가장자리에 형광등 줄 끝. ──
  for (let y = 6; y < WB; y++) for (let x = 16; x < W - 16; x++) {
    let c = '#ebe7dc';
    if ((x - 16) % 64 === 0) c = '#dad5c9'; else if ((x - 16) % 64 === 1) c = '#f5f2ea';
    if (rnd(x, y, 301) > 0.985) c = '#e2ded2';
    p.set(x, y, c);
  }
  p.rect(16, 0, W - 32, 6, '#d4d0c6'); p.hl(16, 4, W - 32, '#bfbab0'); p.hl(16, 5, W - 32, '#9d988e');
  for (let x = 30; x < W - 40; x += 52) { p.rect(x, 1, 30, 3, '#ffffff'); p.hl(x, 3, 30, '#e4eef2'); }
  const TB = 44; // 타일 띠 위
  for (let y = TB; y < WB - 4; y++) for (let x = 16; x < W - 16; x++) {
    const gx = (x - 16) & 7, gy = (y - TB) & 7, n = rnd((x - 16) >> 3, (y - TB) >> 3, 302);
    let c = n > 0.75 ? '#cddcd4' : n < 0.2 ? '#d6e4dd' : '#d2e0d8';
    if (gx === 0 || gy === 0) c = '#b3c4bb'; else if (gx === 1 || gy === 1) c = mix(c, '#ffffff', 0.35);
    p.set(x, y, c);
  }
  p.hl(16, TB - 2, W - 32, '#f7f4ee'); p.hl(16, TB - 1, W - 32, '#c4beb2'); // 띠 위 몰딩
  p.rect(16, WB - 4, W - 32, 4, '#8f9b95'); p.hl(16, WB - 4, W - 32, '#aeb9b3'); p.hl(16, WB - 1, W - 32, '#6b7671');

  // ── 메뉴판 (1~8열 위): 남색 판 셋. 코너 이름, 음식 사진, 값. ──
  {
    const x0 = 20, x1 = 141, y0 = 8, y1 = 31;
    p.rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, '#4a5056'); p.hl(x0 - 2, y0 - 2, x1 - x0 + 4, '#6e757b'); p.hl(x0 - 2, y1 + 1, x1 - x0 + 4, '#2e3236');
    p.rect(x0, y0, x1 - x0, y1 - y0, '#1f2b3c');
    const HC = ['#e8893a', '#5aa86a', '#4a8ad0'], PR = ['5500', '6500', '4000'];
    for (let i = 0; i < 3; i++) {
      const sx = x0 + 2 + i * 40, w = 37;
      if (i) p.vl(sx - 2, y0 + 1, y1 - y0 - 2, '#33425a');
      p.rect(sx, y0 + 2, w, 7, HC[i]); p.hl(sx, y0 + 2, w, shade(HC[i], 0.3)); p.hl(sx, y0 + 8, w, shade(HC[i], -0.25));
      glyphs(p, sx + 3, y0 + 3, 2, '#ffffff', 310 + i);
      text(p, sx + w - 6, y0 + 3, String(i + 1), '#ffffff'); // 1, 2, 3 코너
      // 사진: 그릇 하나
      const bx = sx + 2, by = y0 + 11;
      p.rect(bx, by, 14, 10, '#2c3a50');
      p.ell(bx + 7, by + 6, 6, 3, '#e8ecee'); p.ell(bx + 7, by + 5.5, 5, 2.2, i === 0 ? '#c4532e' : i === 1 ? '#d8963e' : '#e05a3a');
      if (i === 0) p.dots(`${bx + 5},${by + 5} ${bx + 8},${by + 4} ${bx + 9},${by + 6}`, '#f0e2c0');
      if (i === 1) { p.rect(bx + 4, by + 4, 6, 2, '#f2cc4a'); p.set(bx + 6, by + 3, '#5a8a3a'); }
      if (i === 2) { p.dots(`${bx + 4},${by + 5} ${bx + 6},${by + 6} ${bx + 9},${by + 5} ${bx + 10},${by + 6}`, '#f6e8d0'); }
      p.hl(bx + 3, by + 1, 6, '#ffffff', 0.25);
      // 반찬 이름 줄과 값
      for (let j = 0; j < 2; j++) p.hl(sx + 18, y0 + 12 + j * 3, 8 + Math.floor(rnd(i, j, 311) * 10), '#9aa8bc');
      text(p, sx + 18, y0 + 18, PR[i], '#ffd25a');
    }
  }
  // ── 주방 배식구 (1~8열): 벽을 터서 안쪽 주방이 보인다. 흰 타일, 국솥, 걸린 국자, 김. ──
  {
    const x0 = 20, x1 = 141, y0 = 35, y1 = 64;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const gx = (x - x0) % 6, gy = (y - y0) % 6;
      p.set(x, y, gx === 0 || gy === 0 ? '#7e888b' : y < y0 + 4 ? '#7a8487' : '#959fa2');
    }
    p.rect(x0, y0, x1 - x0, 3, '#5a6366'); // 안쪽 그늘
    p.rect(x0, y0 + 18, x1 - x0, 4, '#6e777b'); p.hl(x0, y0 + 18, x1 - x0, '#c4cbce'); // 안쪽 작업대
    // 걸린 국자와 뒤집개
    p.hl(x0 + 70, y0 + 4, 40, '#8a9296');
    for (let i = 0; i < 6; i++) { const lx = x0 + 73 + i * 6; p.vl(lx, y0 + 5, 7 + (i % 2) * 2, '#9aa2a6'); if (i % 2) p.rect(lx - 1, y0 + 13, 3, 2, '#b4bcc0'); else p.rect(lx - 1, y0 + 11, 3, 3, '#8a9296'); }
    // 국솥: 큰 은색 솥, 김이 오른다
    const kx = x0 + 6;
    p.rect(kx, y0 + 8, 26, 10, '#7c868a'); p.hl(kx, y0 + 9, 26, '#5a6367'); p.vl(kx + 2, y0 + 9, 9, '#d4dadd'); p.vl(kx + 3, y0 + 9, 9, '#b0b8bc'); p.vl(kx + 24, y0 + 9, 9, '#5f686c'); p.vl(kx + 25, y0 + 9, 9, '#4e575b');
    p.rect(kx - 2, y0 + 7, 30, 2, '#c4cbce'); p.hl(kx - 2, y0 + 7, 30, '#eef2f3');
    for (let i = 0; i < 26; i++) { const sx = kx + 2 + ((i * 7) % 24), sy = y0 + 1 + ((i * 5) % 6); p.set(sx, sy, '#ffffff', 0.55); }
    // 밥솥 둘, 쌓인 국그릇
    for (const bx of [x0 + 40, x0 + 54]) { p.rect(bx, y0 + 9, 11, 9, '#e8e6e0'); p.hl(bx, y0 + 9, 11, '#ffffff'); p.vl(bx + 10, y0 + 10, 8, '#a8a6a0'); p.rect(bx + 3, y0 + 12, 5, 2, '#3a3e44'); p.set(bx + 4, y0 + 12, '#5aea8a'); }
    for (let k = 0; k < 4; k++) { p.hl(x0 + 112 - k, y0 + 17 - k * 2, 6 + k * 2, '#e8ecee'); p.hl(x0 + 112 - k, y0 + 16 - k * 2, 6 + k * 2, '#b4bcc0'); }
    // 배식구 테두리
    p.rect(x0 - 2, y0 - 2, x1 - x0 + 4, 2, '#c3cacd'); p.hl(x0 - 2, y0 - 2, x1 - x0 + 4, '#eef2f3');
    p.vl(x0 - 2, y0, y1 - y0, '#c3cacd'); p.vl(x0 - 1, y0, y1 - y0, '#8d9599'); p.vl(x1, y0, y1 - y0, '#a3abaf'); p.vl(x1 + 1, y0, y1 - y0, '#7a8286');
  }
  // ── 시계와 게시판 (9~11열) ──
  {
    const cx = 156;
    p.rect(cx - 1, 9, 25, 11, '#4a4e54'); p.rect(cx, 10, 23, 9, '#14161a');
    text(p, cx + 2, 12, '12', '#ff6a3a'); p.set(cx + 11, 13, '#ff6a3a'); p.set(cx + 11, 15, '#ff6a3a'); text(p, cx + 13, 12, '40', '#ff6a3a');
    p.hl(cx, 10, 23, '#2a2d32');
    // 코르크 게시판: 동아리 모집, 축제, 분실물
    const bx = 148, by = 24, bw = 40, bh = 18;
    p.rect(bx - 1, by - 1, bw + 2, bh + 2, '#8a6440'); p.hl(bx - 1, by - 1, bw + 2, '#a8805a');
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) p.set(x, y, rnd(x, y, 320) > 0.8 ? '#a87e52' : '#b98d5c');
    const fl: [number, number, number, number, string][] = [[bx + 2, by + 2, 10, 13, '#f4f0e6'], [bx + 13, by + 1, 11, 9, '#f2c25a'], [bx + 26, by + 3, 11, 14, '#e8f0f4'], [bx + 14, by + 11, 9, 6, '#f6b0b8']];
    fl.forEach(([x, y, w, h, c], i) => {
      p.rect(x, y, w, h, c); p.hl(x, y + h, w, '#6a4a2e', 0.5);
      for (let j = 0; j < Math.floor(h / 3); j++) p.hl(x + 1, y + 2 + j * 3, w - 2 - ((i + j) % 3), j === 0 ? '#3a4a6a' : '#8a8a8a');
      p.set(x + Math.floor(w / 2), y, ['#d04a4a', '#3a7ad8', '#3aa04a', '#f2c25a'][i]);
    });
    p.rect(bx + 4, by + 9, 6, 4, '#5a9ad8'); p.rect(bx + 28, by + 9, 7, 5, '#8ccf7a'); // 전단 사진
  }
  // ── 식판 반납구 (12~14열): 벽을 뚫은 구멍, 비닐 발, 위에 초록 안내판 ──
  {
    const x0 = 196, x1 = 236, y0 = 32, y1 = 63;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p.set(x, y, mix('#3a464b', '#56646a', (y - y0) / (y1 - y0)));
    p.rect(x0 + 4, y0 + 10, 14, 10, '#4a585e'); p.hl(x0 + 4, y0 + 10, 14, '#6a787e'); // 안쪽 식기세척기
    for (let i = 0; i < 5; i++) p.rect(x0 + 22 + i * 3, y0 + 14, 2, 6, '#7c8a90'); // 세워 둔 식판
    for (let x = x0; x < x1; x += 4) { // 비닐 발
      const len = y1 - y0 - 5 - ((x >> 2) % 3 === 0 ? 2 : 0);
      for (let y = y0 + 1; y < y0 + len; y++) { p.set(x, y, '#d6e6ea', 0.45); p.set(x + 1, y, '#c4d8dc', 0.3); p.set(x + 2, y, '#a8c0c6', 0.25); }
      p.set(x, y0 + len, '#e8f2f4', 0.6);
    }
    p.rect(x0 - 2, y0 - 2, x1 - x0 + 4, 2, '#c3cacd'); p.hl(x0 - 2, y0 - 2, x1 - x0 + 4, '#eef2f3');
    p.vl(x0 - 2, y0, y1 - y0, '#c3cacd'); p.vl(x0 - 1, y0, y1 - y0, '#8d9599'); p.vl(x1, y0, y1 - y0, '#a3abaf'); p.vl(x1 + 1, y0, y1 - y0, '#7a8286');
    // 안내판: '식판 반납' 과 화살표
    const sx = 197, sy = 16;
    p.rect(sx, sy, 38, 11, '#2f7a5a'); p.hl(sx, sy, 38, '#4a9a78'); p.hl(sx, sy + 10, 38, '#1e5a40');
    glyphs(p, sx + 3, sy + 3, 4, '#ffffff', 330);
    p.dots(`${sx + 32},${sy + 3} ${sx + 33},${sy + 4} ${sx + 34},${sy + 5} ${sx + 33},${sy + 6} ${sx + 32},${sy + 7}`, '#ffffff');
  }
  // ── 컵 소독기와 벽걸이 정수기 (15~17열): 벽에 붙어 있어 걷는 자리를 막지 않는다 ──
  {
    // 컵 소독기: 스테인리스 함, 유리문 안 푸른 불, 엎어 둔 물컵 두 줄
    const x0 = 247, y0 = 22, w = 22, h = 22;
    p.rect(x0, y0, w, h, '#b4bcc0'); p.hl(x0, y0, w, '#e4e9eb'); p.vl(x0, y0, h, '#d0d6d9'); p.vl(x0 + w - 1, y0, h, '#7e878b'); p.hl(x0, y0 + h - 1, w, '#6e777b');
    p.rect(x0 + 2, y0 + 3, w - 4, h - 7, '#5a64a8');
    for (let r = 0; r < 2; r++) { p.hl(x0 + 2, y0 + 9 + r * 6, w - 4, '#8a94c8'); for (let i = 0; i < 5; i++) { const cx = x0 + 3 + i * 3; p.rect(cx, y0 + 5 + r * 6, 2, 4, '#c8ccec'); p.set(cx, y0 + 5 + r * 6, '#e8eaff'); } }
    p.line(x0 + 3, y0 + h - 5, x0 + 8, y0 + 3, '#ffffff', 0.3);
    p.rect(x0 + 2, y0 + h - 3, 4, 1, '#3aea8a'); p.rect(x0 + w - 6, y0 + h - 3, 3, 1, '#2a2e32');
    // 정수기: 벽 속에 묻힌 흰 몸, 위에 작은 창, 꼭지 둘, 물받이
    const qx = 274, qy = 26, qw = 18;
    p.rect(qx - 1, qy - 1, qw + 2, WB - qy, '#9aa2a4'); // 벽을 판 자리
    p.rect(qx, qy, qw, WB - qy - 2, '#eef0ef'); p.vl(qx, qy, WB - qy - 2, '#ffffff'); p.vl(qx + qw - 1, qy, WB - qy - 2, '#c2c8c8');
    p.rect(qx + 2, qy + 2, qw - 4, 5, '#22282e'); p.set(qx + 4, qy + 4, '#4ab0ff'); p.set(qx + 6, qy + 4, '#ff6a4a'); p.hl(qx + 9, qy + 4, 5, '#7ad0ff');
    p.rect(qx + 2, qy + 10, qw - 4, 14, '#a8b0b4'); p.hl(qx + 2, qy + 10, qw - 4, '#6e777b'); p.vl(qx + 2, qy + 11, 13, '#8c959a');
    p.rect(qx + 5, qy + 11, 2, 3, '#3a7ad8'); p.rect(qx + 11, qy + 11, 2, 3, '#d8402e'); p.set(qx + 5, qy + 14, '#c4ccd0'); p.set(qx + 11, qy + 14, '#c4ccd0');
    p.rect(qx + 2, qy + 22, qw - 4, 3, '#d8dddf'); for (let x = qx + 3; x < qx + qw - 3; x += 2) p.set(x, qy + 23, '#7e878b'); // 물받이
    p.hl(qx + 1, qy + 30, qw - 2, '#4a7ab8'); // 띠
    p.rect(qx + 6, qy + 34, 6, 3, '#d8dddf'); // 이름표
    // '물은 셀프' 종이
    p.rect(qx - 26, 50, 18, 12, '#f8f6ee'); p.hl(qx - 24, 52, 10, '#3a7ad8'); p.hl(qx - 24, 55, 13, '#7a7a7a'); p.hl(qx - 24, 58, 8, '#7a7a7a');
    p.set(qx - 25, 50, '#c8b878'); p.set(qx - 10, 50, '#c8b878');
  }

  // ── 바닥: 밝은 미색 타일 (16px, 칸에 맞춘다). 형광등이 길게 비친다. ──
  for (let y = WB; y < F1 + 6; y++) for (let x = 16; x < W - 16; x++) {
    const gx = x & 15, gy = (y - WB) & 15, n = rnd(x >> 4, (y - WB) >> 4, 340);
    let c = n > 0.78 ? '#dfd9cc' : n < 0.18 ? '#e9e4d9' : '#e4dfd3';
    if (gx === 0 || gy === 0) c = '#c7c0b1';
    else if (gx === 1 || gy === 1) c = mix(c, '#ffffff', 0.35);
    else if (rnd(x, y, 341) > 0.985) c = '#d2cbbd';
    p.set(x, y, c);
  }
  for (const [cx, cy, w] of [[64, ry(2) + 8, 30], [168, ry(3) + 2, 26], [272, ry(4) + 4, 22], [100, ry(4) + 6, 34], [196, ry(5) + 8, 28]] as const) {
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - w; x <= cx + w; x++) {
      const d = Math.abs(x - cx) / w + Math.abs(y - cy) / 3;
      if (d < 1 && ((x + y) & 1) === 0) p.set(x, y, '#ffffff', 0.55 * (1 - d));
    }
  }
  // 벽 아래 그늘
  const band = (x: number, y: number, w: number, a = 0.3): void => { p.hl(x, y, w, '#5a5850', a); p.dither(x, y + 1, w, 1, '#5a5850', 0, a * 0.7); };
  band(tx(9), WB, tx(3)); band(tx(15), WB, tx(4) - 0);
  // 정수기 앞 물방울, 떨어진 냅킨
  p.dots(`282,${WB + 3} 285,${WB + 5} 279,${WB + 6} 288,${WB + 4}`, '#c8dce4', 0.9); p.dots(`283,${WB + 3} 286,${WB + 5}`, '#ffffff', 0.8);
  p.rect(tx(17) + 5, ry(4) + 6, 4, 3, '#fbfaf6'); p.set(tx(17) + 8, ry(4) + 8, '#d8d4c8');
  // 문 앞 매트 (9~10, 5줄 아래쪽)
  {
    const x0 = tx(9) + 1, y0 = ry(5) + 4, w = tx(2) - 2, h = 12;
    p.rect(x0, y0, w, h, '#4a4e52'); p.rect(x0 + 1, y0 + 1, w - 2, h - 2, '#5a5f63');
    for (let y = y0 + 2; y < y0 + h - 1; y += 2) p.hl(x0 + 2, y, w - 4, '#4a4f53');
  }

  // ── 배식대 (1~8,1): 스테인리스. 윗면에 반찬 통 여섯, 김 서린 가림 유리, 앞면에 식판 미는 봉. 8열은 식판 더미, 1열은 수저통. ──
  {
    const x0 = 16, x1 = tx(9), tt = 61, tf = 75, fy = ry(2);
    // 윗면
    p.rect(x0, tt, x1 - x0, tf - tt, '#c9d0d3');
    for (let y = tt + 1; y < tf; y++) for (let x = x0; x < x1; x++) if (rnd(x >> 2, y, 350) > 0.8) p.set(x, y, '#bfc6c9');
    p.hl(x0, tt, x1 - x0, '#e9edef'); p.hl(x0, tt + 1, x1 - x0, '#a9b1b4');
    // 반찬 통: 밥, 국, 제육볶음, 김치, 콩나물무침, 계란말이 (오른쪽에서 왼쪽으로 집는다)
    const px0 = tx(2) - 2;
    p.rect(px0 - 1, tt + 2, 6 * 16 + 1, 10, '#8e979b');
    const pan = (i: number, f: (x: number, y: number) => void): void => {
      const x = px0 + i * 16, y = tt + 3;
      p.rect(x, y, 15, 8, '#e3e8ea'); p.rect(x + 1, y + 1, 13, 7, '#7c8589');
      f(x + 1, y + 1);
      p.hl(x, y, 15, '#f4f7f8');
    };
    // 6열 → 1... 순서: 계란말이(2), 콩나물(3), 김치(4), 제육(5), 국(6), 밥(7)
    pan(5, (x, y) => { // 밥: 흰 쌀, 주걱
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) p.set(x + i, y + j, rnd(x + i, y + j, 351) > 0.75 ? '#ffffff' : rnd(x + i, y + j, 352) > 0.85 ? '#e0dbcd' : '#f2efe5');
      p.rect(x + 8, y - 4, 2, 7, '#f4f2ec'); p.rect(x + 7, y + 2, 4, 3, '#fbfaf6'); p.vl(x + 9, y - 4, 7, '#d8d4c8');
    });
    pan(4, (x, y) => { // 국: 육개장 빛, 건더기, 국자
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) p.set(x + i, y + j, ((i + j * 3) % 7 === 0) ? '#e0884a' : j < 2 ? '#d06a38' : '#c4532e');
      p.dots(`${x + 3},${y + 3} ${x + 9},${y + 2} ${x + 6},${y + 5}`, '#5a8a3a'); p.dots(`${x + 4},${y + 5} ${x + 10},${y + 5}`, '#6a3a24');
      p.ell(x + 4, y + 2, 2, 1.4, '#b4bcc0'); p.line(x + 5, y + 1, x + 11, y - 6, '#a9b1b5'); p.line(x + 6, y + 1, x + 12, y - 6, '#dfe4e6');
    });
    pan(3, (x, y) => { // 제육볶음: 붉은 고기, 양파, 집게
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) { const n = rnd(x + i, y + j, 353); p.set(x + i, y + j, n > 0.8 ? '#e8dcb0' : n > 0.55 ? '#d8683a' : n > 0.2 ? '#b8452a' : '#8a2e1c'); }
      p.line(x + 2, y + 4, x + 7, y - 4, '#9aa2a6'); p.line(x + 3, y + 4, x + 8, y - 4, '#d4dadd');
    });
    pan(2, (x, y) => { // 김치
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) { const n = rnd(x + i, y + j, 354); p.set(x + i, y + j, (i + j) % 4 === 0 ? '#f0e2c0' : n > 0.7 ? '#e86a4a' : n > 0.15 ? '#c8402e' : '#9a2e20'); }
    });
    pan(1, (x, y) => { // 콩나물무침
      for (let j = 0; j < 7; j++) for (let i = 0; i < 13; i++) { const n = rnd(x + i, y + j, 355); p.set(x + i, y + j, n > 0.85 ? '#e8c84a' : n > 0.75 ? '#5f8a3a' : (i + j * 2) % 3 === 0 ? '#d8cc98' : '#efe6b8'); }
      p.line(x + 9, y + 4, x + 12, y - 4, '#9aa2a6');
    });
    pan(0, (x, y) => { // 계란말이: 노란 토막이 두 줄
      p.rect(x, y, 13, 7, '#c8a040');
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const ex = x + 1 + i * 3, ey = y + r * 3 + 1; p.rect(ex, ey, 3, 3, '#f2cc4a'); p.set(ex, ey, '#fae08a'); p.set(ex + 1, ey + 1, '#e0a838'); p.set(ex + 2, ey + 2, '#d09a30'); }
    });
    // 김: 국과 밥 위로
    for (let i = 0; i < 18; i++) { const sx = px0 + 66 + Math.floor(rnd(i, 1, 356) * 26), sy = tt - 9 + Math.floor(rnd(i, 2, 356) * 9); p.set(sx, sy, '#ffffff', 0.45); }
    // 1열: 수저통. 숟가락은 머리가 위, 젓가락은 둘씩.
    {
      const sx = x0 + 3, sy = tt + 2;
      p.rect(sx, sy, 11, 9, '#a9b1b5'); p.hl(sx, sy, 11, '#e2e7e9'); p.vl(sx + 5, sy, 9, '#7e878b'); p.hl(sx, sy + 8, 11, '#6e777b');
      for (let i = 0; i < 4; i++) { const hx = sx + 1 + i; p.vl(hx, sy - 5 + (i % 2), 6, '#dfe4e6'); p.set(hx, sy - 6 + (i % 2), '#f4f7f8'); }
      for (let i = 0; i < 4; i++) { const hx = sx + 6 + i; p.vl(hx, sy - 7 + (i % 2) * 2, 7, i % 2 ? '#c4cbce' : '#eef2f3'); }
    }
    // 8열: 식판 더미 (줄은 여기서 시작한다)
    {
      const sx = tx(8) + 2, sy = tt - 3;
      for (let k = 0; k < 7; k++) p.hl(sx, sy + 8 + k, 12, k % 2 ? '#8e979b' : '#dfe4e6');
      tray(p, sx, sy + 1, 0, 1);
      for (let x = sx; x < sx + 12; x++) if (!p.alpha(x, sy + 8)) p.set(x, sy + 8, '#959ea2');
    }
    // 가림 유리: 기둥 셋, 위 선반, 비스듬한 앞 유리
    const gy = 46;
    for (const gx of [tx(2) - 4, tx(5) - 2, tx(8) - 2]) { p.vl(gx, gy + 2, tt - gy - 1, '#8a9296'); p.vl(gx + 1, gy + 2, tt - gy - 1, '#d4dadd'); }
    p.rect(tx(2) - 5, gy, tx(8) - tx(2) + 6, 3, '#cfe6ec', 0.55); p.hl(tx(2) - 5, gy, tx(8) - tx(2) + 6, '#ffffff', 0.85); p.hl(tx(2) - 5, gy + 2, tx(8) - tx(2) + 6, '#7ea4ae', 0.8);
    for (let y = gy + 3; y < gy + 11; y++) p.hl(tx(2) - 5, y, tx(8) - tx(2) + 6, '#c4e2ea', 0.16);
    for (let k = 0; k < 4; k++) { const lx = tx(2) + 6 + k * 26; p.line(lx, gy + 10, lx + 6, gy + 3, '#ffffff', 0.45); p.line(lx + 2, gy + 10, lx + 7, gy + 4, '#ffffff', 0.25); }
    // 앞 모서리와 앞면
    p.hl(x0, tf - 1, x1 - x0, '#f2f5f6'); p.hl(x0, tf, x1 - x0, '#9aa3a7');
    p.rect(x0, tf + 1, x1 - x0, fy - tf - 1, '#b9c0c3');
    for (let x = x0 + 32; x < x1; x += 32) { p.vl(x, tf + 1, fy - tf - 1, '#949ca0'); p.vl(x + 1, tf + 1, fy - tf - 1, '#d2d8da'); }
    p.vl(x1 - 1, tt, fy - tt, '#7e878b');
    p.rect(x0, fy - 3, x1 - x0, 3, '#5f676b'); p.hl(x0, fy - 3, x1 - x0, '#7c8589');
    // 식판 미는 봉: 세 줄, 받침 쇠
    for (let x = x0 + 6; x < x1; x += 24) p.rect(x, tf + 2, 2, 4, '#7c8589');
    p.hl(x0, tf + 3, x1 - x0, '#eef2f3'); p.hl(x0, tf + 4, x1 - x0, '#a3abaf');
    p.hl(x0, tf + 6, x1 - x0, '#eef2f3'); p.hl(x0, tf + 7, x1 - x0, '#a3abaf');
    // 앞면 코너 표지: 1, 2 코너 (메뉴판 색)
    p.rect(tx(3), tf + 9, 8, 3, '#e8893a'); p.rect(tx(6), tf + 9, 8, 3, '#5aa86a');
    // 바닥 그늘
    p.hl(x0, fy, x1 - x0, '#5a5850', 0.35); p.dither(x0, fy + 1, x1 - x0, 1, '#5a5850', 0, 0.25);
  }
  // ── 식판 반납 컨베이어 (12~14,1): 벨트가 오른쪽으로 흘러 구멍 속으로 들어간다. 수저 통, 잔반 구멍. ──
  {
    const x0 = tx(12), x1 = tx(15), tt = 62, tf = 75, fy = ry(2);
    p.rect(x0, tt, x1 - x0, tf - tt, '#c9d0d3'); p.hl(x0, tt, x1 - x0, '#e9edef');
    const bx0 = x0 + 2, bx1 = x1 - 12; // 벨트
    p.rect(bx0, tt + 2, bx1 - bx0, 9, '#3e4549');
    for (let x = bx0; x < bx1; x += 3) { p.vl(x, tt + 2, 9, '#2a3034'); p.vl(x + 1, tt + 3, 7, '#566066'); }
    p.hl(bx0, tt + 2, bx1 - bx0, '#1e2326');
    tray(p, bx0 + 2, tt + 3, 1, 7); tray(p, bx0 + 19, tt + 3, 0, 8);
    p.line(bx0 + 6, tt + 5, bx0 + 13, tt + 7, '#e2e7e9'); // 식판 위 숟가락
    // 수저 반납 통: 물에 담근다
    const sx = x1 - 10;
    p.rect(sx, tt + 1, 9, 10, '#9aa3a7'); p.hl(sx, tt + 1, 9, '#e2e7e9'); p.rect(sx + 1, tt + 2, 7, 4, '#8ab0bc');
    for (let i = 0; i < 4; i++) p.line(sx + 1 + i * 2, tt + 3, sx + 2 + i * 2, tt - 3 + (i % 2), i % 2 ? '#c4cbce' : '#eef2f3');
    p.hl(x0, tf - 1, x1 - x0, '#f2f5f6'); p.hl(x0, tf, x1 - x0, '#9aa3a7');
    p.rect(x0, tf + 1, x1 - x0, fy - tf - 1, '#b9c0c3'); p.vl(x0, tt, fy - tt, '#e2e7e9'); p.vl(x1 - 1, tt, fy - tt, '#7e878b');
    // 잔반 구멍: 검은 입, 고무 테두리
    p.rect(x0 + 22, tf + 3, 18, 6, '#3a3e40'); p.rect(x0 + 23, tf + 4, 16, 4, '#151719'); p.hl(x0 + 22, tf + 3, 18, '#2a2e30');
    p.rect(x0 + 3, tf + 2, 17, 7, '#f2f2ee'); p.hl(x0 + 3, tf + 8, 17, '#9aa3a7'); glyphs(p, x0 + 5, tf + 3, 2, '#2f7a5a', 337); // '잔반'
    p.rect(x0, fy - 3, x1 - x0, 3, '#5f676b'); p.hl(x0, fy - 3, x1 - x0, '#7c8589');
    p.hl(x0, fy, x1 - x0, '#5a5850', 0.35); p.dither(x0, fy + 1, x1 - x0, 1, '#5a5850', 0, 0.25);
    p.rect(x0 + 30, fy + 2, 3, 2, '#c8402e', 0.5); // 흘린 김칫국 한 방울
  }

  // ── 옆벽 ──
  p.rect(10, 0, 6, F1 + 6, SLAB); p.vl(15, 0, F1 + 6, SLAB_L);
  p.rect(W - 16, 0, 6, F1 + 6, SLAB); p.vl(W - 16, 0, F1 + 6, SLAB_L);
  // 아래 줄 밖: 한낮의 복도. 볕이 든다.
  for (let y = F1 + 6; y < H; y++) for (let x = 0; x < W; x++) {
    const n = rnd(x >> 3, y >> 2, 360);
    p.set(x, y, ((x & 15) === 0 || ((y - F1) & 7) === 0) ? '#8e8c84' : n > 0.7 ? '#a8a69c' : '#a2a096');
  }

  const props: Prop[] = [];
  // ── 의자: 회청색 플라스틱 판, 크롬 다리 ──
  const CH = '#57758e', CHL = shade(CH, 0.25), CHD = shade(CH, -0.25), CHDD = shade(CH, -0.45);
  /** 등받이: 플라스틱 판. back: 뒤에서 본 면(어둡고 손잡이 구멍), 아니면 앉는 쪽에서 본 안쪽 면. */
  const backrest = (L: Pix, cx: number, by: number, h: number, back: boolean): void => {
    const x0 = cx - 6;
    for (let j = 0; j < h; j++) {
      const inset = j === 0 ? 1 : j === h - 1 ? 1 : 0;
      for (let i = inset; i < 12 - inset; i++) {
        let c = back ? CH : CHL;
        if (i === inset || (j === 0)) c = back ? CHL : shade(CH, 0.4);
        else if (i === 11 - inset) c = CHD;
        if (j === h - 1) c = CHDD;
        else if (!back && j > 1 && i > 1 && i < 10) c = j === 2 ? CH : shade(CH, 0.12);
        L.set(x0 + i, by + j, c);
      }
    }
    if (back) { L.hl(cx - 2, by + 2, 4, CHDD); L.hl(cx - 2, by + 3, 4, CHD); }
  };
  /** 4줄: 위를 보고 앉는 의자. 판은 바닥(base), 등받이는 앉은 사람 앞(L). */
  const chairUp = (L: Pix, c: number, r: number): void => {
    const cx = tx(c) + 8, sy = ry(r) + 4;
    p.rect(cx - 6, sy, 12, 5, CH); p.hl(cx - 6, sy, 12, CHL); p.hl(cx - 6, sy + 4, 12, CHD);
    for (const lx of [cx - 5, cx + 4]) { p.vl(lx, sy + 5, 6, '#7c8589'); }
    p.hl(cx - 6, sy + 12, 13, '#5a5850', 0.3);
    const by = sy - 4;
    backrest(L, cx, by, 9, true);
    for (const lx of [cx - 4, cx + 3]) L.set(lx, by + 9, '#8a9296'); // 등받이를 받친 쇠
    for (const lx of [cx - 6, cx + 5]) { L.vl(lx, by + 10, 6, '#b4bcc0'); L.set(lx, by + 16, '#5f676b'); }
  };
  /** 2줄: 아래(탁자)를 보고 앉는 의자. 등받이가 사람 뒤라서 낮은 층(L). */
  const chairDown = (L: Pix, c: number, r: number): void => {
    const cx = tx(c) + 8, sy = ry(r) + 6;
    backrest(L, cx, sy - 11, 9, false);
    for (const lx of [cx - 4, cx + 3]) L.set(lx, sy - 2, '#8a9296');
    p.rect(cx - 6, sy - 1, 12, 5, CH); p.hl(cx - 6, sy - 1, 12, CHL); p.hl(cx - 6, sy + 3, 12, CHD);
  };
  /** 탁자 밑에 밀어 넣은 빈 의자. up: 탁자 앞쪽 (등받이가 탁자 모서리 앞에 보인다), down: 탁자 뒤쪽 (등받이 꼭대기만 보인다) */
  const tuckUp = (L: Pix, c: number, r: number): void => {
    const cx = tx(c) + 8, by = ry(r) + 3;
    backrest(L, cx, by, 8, true);
    for (const lx of [cx - 6, cx + 5]) { L.vl(lx, by + 8, 4, '#b4bcc0'); L.set(lx, by + 12, '#5f676b'); }
  };
  const tuckDown = (c: number, r: number): void => {
    const cx = tx(c) + 8;
    backrest(p, cx, ry(r) - 12, 6, false);
  };

  // ── 긴 탁자: 연한 자작 무늬 상판, 크롬 다리. 3줄 탁자는 2줄 사람의 아랫몸을, 5줄 탁자는 4줄 사람의 발을 가린다. ──
  const TOP = '#e4d4b4', TOPL = '#f1e6cf', TOPG = '#d9c7a4', EDGE = '#b39a72', EDGED = '#8a7354';
  const table = (L: Pix, c0: number, c1: number, r: number): void => {
    const x0 = tx(c0) + 1, x1 = tx(c1 + 1) - 1, t0 = ry(r) - 8, tf = ry(r) + 2, fl = ry(r) + 15;
    // 바닥 그늘
    for (let y = tf + 2; y < fl + 1; y++) for (let x = x0 + 1; x < x1 - 1; x++) p.set(x, y, '#6a6458', y < tf + 5 ? 0.26 : y === fl ? 0.1 : 0.15);
    // 뒷다리 (짧게)
    for (const lx of [x0 + 4, x1 - 6]) L.vl(lx, tf + 2, fl - tf - 5, '#7c8589');
    // 앞다리
    for (const lx of [x0 + 2, x1 - 4]) { L.rect(lx, tf + 2, 2, fl - tf - 2, '#9aa2a6'); L.vl(lx, tf + 2, fl - tf - 2, '#d4dadd'); L.hl(lx - 1, fl - 1, 4, '#5f676b'); }
    // 상판
    L.rect(x0, t0, x1 - x0, tf - t0, TOP);
    for (let y = t0 + 1; y < tf; y++) for (let x = x0; x < x1; x++) if (rnd(x >> 3, y, 370 + r) > 0.7 && ((x + y * 5) % 9) < 5) L.set(x, y, TOPG);
    L.hl(x0, t0, x1 - x0, TOPL); L.vl(x0, t0, tf - t0, TOPL); L.vl(x1 - 1, t0, tf - t0, TOPG);
    L.rect(x0, tf, x1 - x0, 2, EDGE); L.hl(x0, tf + 1, x1 - x0, EDGED); L.set(x0, tf, TOPG); L.set(x1 - 1, tf + 1, '#6e5a40');
  };

  // 2줄 의자 (오른쪽 3줄 탁자의 뒤쪽만: 왼쪽은 배식 줄): 등받이는 1줄 사람 앞, 2줄 사람 뒤
  {
    const L = new Pix(W, H);
    chairDown(L, 12, 2); chairDown(L, 16, 2);
    props.push(cut(L, top, 2 * T + 4));
  }
  // 3줄 탁자 뒤쪽에 밀어 넣은 의자 꼭대기 (13~15), 5줄 탁자 뒤쪽 의자 꼭대기
  for (const c of [13, 14, 15]) tuckDown(c, 3);
  for (const c of [2, 5, 12, 16]) tuckDown(c, 5);
  // 3줄 탁자 둘과 그 위의 식판, 물컵
  {
    const L = new Pix(W, H);
    table(L, 2, 7, 3); table(L, 11, 16, 3);
    const t0 = ry(3) - 8;
    // 4줄 사람 앞 (탁자 앞쪽): seat_a(3) seat_me(4) seat_b(6) seat_c(13) seat_d(15)
    tray(L, tx(3) + 2, t0 + 4, 2, 11); cup(L, tx(3) + 14, t0 + 3);
    tray(L, tx(6) + 2, t0 + 4, 1, 12); cup(L, tx(5) + 12, t0 + 4);
    tray(L, tx(13) + 2, t0 + 4, 1, 13); cup(L, tx(14) + 1, t0 + 2);
    tray(L, tx(15) + 2, t0 + 4, 2, 14);
    // 2줄 사람 앞 (탁자 뒤쪽): seat_e(12) seat_f(16)
    tray(L, tx(12) + 2, t0, 2, 15); cup(L, tx(11) + 10, t0 + 1);
    tray(L, tx(16) + 2, t0, 1, 16);
    // 두고 간 것: 휴지, 빈 물컵
    L.rect(tx(7) + 3, t0 + 3, 5, 3, '#fbfaf6'); L.set(tx(7) + 7, t0 + 5, '#d8d4c8');
    cup(L, tx(2) + 4, t0 + 3);
    props.push(cut(L, top, 3 * T + 8));
  }
  // 3줄 탁자 앞쪽에 밀어 넣은 빈 의자 (등받이가 탁자 앞에 보인다)
  {
    const L = new Pix(W, H);
    for (const c of [2, 5, 7, 11, 14, 16]) tuckUp(L, c, 3);
    props.push(cut(L, top, 4 * T + 2));
  }
  // 4줄 의자: 사람이 앉는 자리. 등받이가 앉은 사람의 허리 아래를 가린다.
  {
    const L = new Pix(W, H);
    for (const c of [3, 4, 6, 13, 15]) chairUp(L, c, 4);
    props.push(cut(L, top, 4 * T + 14));
  }
  // 5줄 탁자 둘: 반쯤 빈 자리, 남은 식판
  {
    const L = new Pix(W, H);
    table(L, 2, 7, 5); table(L, 11, 16, 5);
    const t0 = ry(5) - 8;
    tray(L, tx(2) + 6, t0, 0, 21); cup(L, tx(3) + 4, t0 + 1);
    tray(L, tx(5) + 3, t0 + 3, 1, 22);
    tray(L, tx(12) + 1, t0 + 1, 0, 23); tray(L, tx(13) + 1, t0 + 3, 0, 24); cup(L, tx(14) + 2, t0 + 2); cup(L, tx(14) + 6, t0 + 4);
    // 누가 맡아 둔 자리: 책 한 권과 텀블러
    L.rect(tx(16) + 1, t0 + 2, 9, 6, '#3a5a8a'); L.hl(tx(16) + 1, t0 + 2, 9, '#5a7aaa'); L.hl(tx(16) + 1, t0 + 7, 9, '#f2efe6');
    L.rect(tx(16) + 11, t0 - 2, 3, 6, '#d86a5a'); L.hl(tx(16) + 11, t0 - 2, 3, '#f2efe6');
    props.push(cut(L, top, 5 * T + 8));
  }
  // ── 아래 벽: 짙은 벽 머리, 가운데(9~10) 유리문 둘. 문틀은 은색, 유리 너머로 한낮의 복도. ──
  {
    const L = new Pix(W, H), y = F1, dx0 = tx(9), dx1 = tx(11);
    L.rect(10, y, dx0 - 10, 6, SLAB); L.hl(16, y, dx0 - 16, SLAB_L);
    L.rect(dx1, y, W - 10 - dx1, 6, SLAB); L.hl(dx1, y, W - 16 - dx1, SLAB_L);
    // 문짝 둘: 바닥에서 솟은 유리문. 알루미늄 틀, 가운데 세로 손잡이. 유리 너머는 한낮의 복도.
    const gT = y - 9, gB = y + 6;
    for (let yy = gT; yy < gB; yy++) for (let x = dx0; x < dx1; x++) L.set(x, yy, mix('#d8eef2', '#a8cad4', (yy - gT) / (gB - gT)), 0.42);
    for (let x = dx0; x < dx1; x++) for (let yy = gT; yy < gB; yy++) if (((x - dx0) + (yy - gT)) % 13 < 2) L.set(x, yy, '#ffffff', 0.4); // 비친 빛
    L.hl(dx0, gT - 1, dx1 - dx0, '#d8dee0'); L.hl(dx0, gT, dx1 - dx0, '#8a9296'); // 윗틀
    L.rect(dx0, gB - 1, dx1 - dx0, 2, '#8a9296'); L.hl(dx0, gB - 1, dx1 - dx0, '#c4cacd'); // 아랫틀
    for (const vx of [dx0, dx0 + 15, dx0 + 17, dx1 - 2]) { L.vl(vx, gT, gB - gT + 1, '#c4cacd'); L.vl(vx + 1, gT, gB - gT + 1, '#7a8286'); }
    for (const hx of [dx0 + 12, dx0 + 19]) { L.rect(hx, gT + 3, 1, 8, '#eef2f3'); L.vl(hx + 1, gT + 3, 8, '#8a9296'); }
    for (const jx of [dx0 - 3, dx1 + 1]) { L.rect(jx, gT - 2, 2, gB - gT + 4, '#6a7276'); L.vl(jx, gT - 2, gB - gT + 4, '#b4bcc0'); }
    props.push(cut(L, top, 6 * T + 1));
  }
  return { base: p, props };
}
