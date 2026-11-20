// 막간: 윤서의 대학 캠퍼스. 강의동 앞 광장, 금요일 정오, 맑은 늦여름.
// 위는 붉은 벽돌 강의동 앞면 (0줄 8~9열이 열어 둔 유리문). 1줄 벽 앞에 나무 벤치 셋, 광장에 느티나무 셋.
// 바닥은 회색 보도블록 광장 → 붉은 보도 (오른쪽 끝이 기숙사 쪽 길) → 연석 → 잔디 띠.
// 빛은 왼쪽 위(한낮)에서 온다. 그림자는 짧고 거의 발밑에 진다.
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';

const tx = (c: number): number => c * T;

// ── 색 ──
const BRICK = ['#a9553c', '#9c4b35', '#b4614a', '#8f4430']; // 붉은 벽돌 (빛 받은 쪽부터)
const MORTAR = '#c8b8a4', MORTAR_D = '#a8977f';
const CONC = { LL: '#ecE8de', L: '#dcd8cd', M: '#c6c1b4', D: '#9d988b', DD: '#77736a' };
const FRAME = { L: '#6a7076', M: '#464b50', D: '#2c3034' };
const GRASS = ['#a6cf68', '#7cb24a', '#5a943a', '#3c722c'];
const LEAF = ['#9ccc5e', '#6eac44', '#4c8a36', '#33682a', '#22481e'];
const BARK = { L: '#a39684', M: '#7e705e', D: '#584c3e' };
const SHADE = '#24323a'; // 한낮 그늘 (위에 반투명으로 덮는다)

/** 간판 글씨: 읽히지 않는 한글 덩어리 (5×5, k 배). */
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
/** 글자 없는 작은 글줄 */
function dashes(p: Pix, x: number, y: number, w: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < w; i++) if (rnd(Math.floor(i / 3), y, seed) > 0.25 && (i % 3 !== 2 || rnd(i, y, seed + 1) > 0.5)) p.set(x + i, y, col, a);
}
/** 붉은 벽돌 벽: 7×3 벽돌, 1px 줄눈, 한 단씩 반 장 어긋난다. */
function brick(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor(y / 4), ly = y % 4, off = (row & 1) * 4, lx = (x + off) % 8, bi = Math.floor((x + off) / 8);
    let col: string;
    if (ly === 3) col = lx === 7 ? MORTAR_D : MORTAR;
    else if (lx === 7) col = MORTAR_D;
    else {
      const n = rnd(bi, row, seed);
      col = n > 0.86 ? BRICK[2] : n > 0.6 ? BRICK[1] : n < 0.08 ? BRICK[3] : BRICK[0];
      if (ly === 0 && lx < 5) col = mix(col, '#e8a080', 0.14);          // 벽돌 윗모서리
      if (rnd(x, y, seed + 1) > 0.95) col = mix(col, '#3a1e14', 0.2);   // 구운 얼룩
    }
    p.set(x, y, col);
  }
}
/** 유리: 낮에는 하늘을 비추고, 아래쪽엔 광장의 나무가 어둡게 비친다. */
function glass(p: Pix, x0: number, y0: number, w: number, h: number, day: boolean, seed: number, trees = false): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const t = (y - y0) / h;
    let col = day ? mix('#a6cbe2', '#56788f', t) : mix('#1a2232', '#2a3448', t);
    const s = (x - x0) + (y - y0) * 0.8 + seed * 7;
    if (day && (s % 29 > 4 && s % 29 < 8)) col = mix(col, '#ffffff', 0.35); // 비스듬히 비친 빛
    if (day && (s % 29 === 9)) col = mix(col, '#ffffff', 0.15);
    if (trees && day) {
      const hgt = h * 0.42 + Math.sin(x * 0.21 + seed) * 3 + Math.sin(x * 0.07 + seed * 2) * 4;
      if (y0 + h - y < hgt) col = mix(col, rnd(x >> 1, y >> 1, seed) > 0.5 ? '#3e5a3e' : '#4a6a48', 0.55);
    }
    p.set(x, y, col);
  }
  if (!day) for (let i = 0; i < 2; i++) if (rnd(seed, i, 5) > 0.55) p.rect(x0 + 2 + i * Math.floor(w / 2), y0 + 2, Math.floor(w / 2) - 4, h - 4, '#c8b88a', 0.6);
  p.hl(x0, y0, w, mix(FRAME.D, '#000000', 0.2), 0.6); // 창틀 밑 그늘
}
/** 창틀 */
function frame(p: Pix, x0: number, y0: number, w: number, h: number): void {
  p.rect(x0 - 2, y0 - 2, w + 4, 2, FRAME.M); p.rect(x0 - 2, y0 + h, w + 4, 2, FRAME.D);
  p.rect(x0 - 2, y0, 2, h, FRAME.M); p.rect(x0 + w, y0, 2, h, FRAME.D);
  p.hl(x0 - 2, y0 - 2, w + 4, FRAME.L); p.vl(x0 - 2, y0 - 2, h + 4, FRAME.L);
}
/** 보도블록: pw×ph 장을 반 장씩 어긋나게 깐다. pal 의 색에서 장마다 하나를 고른다. 줄눈은 바탕보다 조금만 어둡다. */
function pavers(p: Pix, x0: number, y0: number, w: number, h: number, pal: string[], joint: string, seed: number, pw = 10, ph = 5): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor(y / ph), ly = y % ph, off = (row & 1) * (pw >> 1), lx = (x + off) % pw, bi = Math.floor((x + off) / pw);
    const n = rnd(bi, row, seed);
    let col = pal[Math.min(pal.length - 1, Math.floor(n * pal.length))];
    if (rnd(x >> 4, y >> 3, seed + 2) > 0.75) col = mix(col, '#000000', 0.035);       // 넓은 얼룩
    if (ly === ph - 1 || lx === pw - 1) col = mix(col, joint, 0.75);
    else if (ly === 0 && lx === 0) col = mix(col, '#ffffff', 0.12);                  // 모서리가 닳아 밝다
    const k = rnd(x, y, seed + 1);
    if (k > 0.975) col = mix(col, '#000000', 0.1); else if (k < 0.02) col = mix(col, '#ffffff', 0.12);
    p.set(x, y, col);
  }
}
/** 잔디: 넓은 결 두 겹과 풀잎 */
function lawn(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), m = rnd(x >> 3, y >> 2, seed + 1);
    let col = m > 0.7 ? GRASS[2] : GRASS[1];
    if (n > 0.88) col = GRASS[0]; else if (n < 0.1) col = GRASS[3]; else if (n > 0.7 && ((x + y) & 1)) col = mix(col, GRASS[0], 0.5);
    p.set(x, y, col);
  }
  for (let i = 0; i < Math.floor(w * h / 18); i++) { // 풀잎 끝
    const x = x0 + Math.floor(rnd(i, 1, seed + 2) * w), y = y0 + 1 + Math.floor(rnd(i, 2, seed + 2) * (h - 1));
    p.set(x, y, GRASS[0]); p.set(x, y + 1, GRASS[3]);
  }
}
/** 회양목 같은 작은 관목 덩어리 (둥글게 다듬었다). */
function shrub(p: Pix, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy + (rnd(x, y, seed) - 0.5) * 0.25;
    if (d > 1) continue;
    const lit = -dx * 0.5 - dy * 0.8 + (rnd(x >> 1, y >> 1, seed + 1) - 0.5) * 0.6;
    p.set(x, y, d > 0.82 && dy > 0 ? LEAF[4] : lit > 0.45 ? LEAF[0] : lit > -0.1 ? LEAF[1] : lit > -0.6 ? LEAF[2] : LEAF[3]);
  }
}
/** 나무 그늘: 한낮이라 둥근 그늘이 거의 줄기 밑에 진다. 잎 사이로 햇빛 조각이 샌다. */
function treeShadow(p: Pix, cx: number, by: number, rx: number, ry: number, seed: number): void {
  for (let y = Math.floor(by - ry); y <= by + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - by) / ry, d = dx * dx + dy * dy + (rnd(x >> 1, y, seed) - 0.5) * 0.18;
    if (d > 1) continue;
    if (d > 0.82 && ((x + y) & 1)) continue;             // 가장자리는 체크무늬로 풀린다
    if (rnd(x >> 1, y >> 1, seed + 1) > 0.94) continue;  // 햇빛 조각
    p.set(x, y, SHADE, 0.26);
  }
}
/** 느티나무: 줄기에서 가지가 갈라지고, 둥근 수관이 잎 뭉치로 울퉁불퉁하다. (cx, by) 는 줄기 밑동. */
function tree(L: Pix, cx: number, by: number, r: number, seed: number, lean = 0): void {
  // 줄기: 밑동이 살짝 넓고, 위에서 세 갈래
  for (let y = by - 20; y < by; y++) {
    const t = (by - y) / 20, hw = 3 + (t < 0.12 ? 1 : 0);
    for (let x = cx - hw; x <= cx + hw - 1; x++) {
      const k = x - (cx - hw);
      let col = k === 0 ? BARK.L : k >= hw * 2 - 2 ? BARK.D : BARK.M;
      if (rnd(x, y >> 1, seed + 9) > 0.8) col = mix(col, '#c8bca8', 0.35); // 얼룩진 수피
      L.set(x, y, col);
    }
  }
  L.line(cx - 1, by - 18, cx - 7, by - 27, BARK.M); L.line(cx - 1, by - 17, cx - 7, by - 26, BARK.L);
  L.line(cx + 1, by - 18, cx + 8, by - 28, BARK.D); L.line(cx + 1, by - 19, cx + 7, by - 29, BARK.M);
  L.vl(cx, by - 30, 12, BARK.M);
  // 수관: 잎 뭉치 여덟 개를 겹친다
  const cy = by - 19 - r; cx += lean; // 수관이 줄기에서 살짝 비껴 있다
  const blobs: [number, number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const a = k * 0.785 + seed * 0.7;
    blobs.push([cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.42, r * (0.5 + rnd(k, seed, 61) * 0.18)]);
  }
  blobs.push([cx, cy - 2, r * 0.62]);
  const dist = (x: number, y: number): [number, number] => {
    let d = 9, bi = 0;
    for (let i = 0; i < blobs.length; i++) { const [ox, oy, rr] = blobs[i]; const v = Math.hypot(x - ox, (y - oy) * 1.12) / rr; if (v < d) { d = v; bi = i; } }
    return [d, bi];
  };
  for (let y = Math.floor(cy - r * 1.2); y < by - 10; y++) for (let x = cx - r - 6; x <= cx + r + 6; x++) {
    const [d, bi] = dist(x, y);
    const edge = 1 + (rnd(x >> 1, y >> 1, seed + 3) - 0.5) * 0.18; // 잎 끝이 들쭉날쭉하다
    if (d > edge) continue;
    const [ox, oy, rr] = blobs[bi];
    // 뭉치마다 왼쪽 위가 밝다. 수관 전체로도 아래쪽이 그늘진다.
    const local = ((ox - x) * 0.7 + (oy - y)) / rr, whole = (cy - y) / r * 0.5 + (cx - x) / r * 0.25;
    const lit = local * 0.6 + whole + (rnd(x, y, seed + 4) - 0.5) * 0.35;
    let col = lit > 0.55 ? LEAF[0] : lit > 0.1 ? LEAF[1] : lit > -0.35 ? LEAF[2] : lit > -0.8 ? LEAF[3] : LEAF[4];
    if (d > edge - 0.12 && lit < 0) col = LEAF[4];              // 그늘진 쪽 가장자리
    L.set(x, y, col);
  }
  // 잎 사이 틈으로 보이는 가지 몇 조각
  for (const [dx, dy] of [[-6, 6], [5, 4], [-2, 10]] as const) { L.set(cx + dx, cy + dy, BARK.D); L.set(cx + dx + 1, cy + dy - 1, BARK.D); }
  // 맨 위 잎끝의 반짝임
  for (let i = 0; i < 14; i++) {
    const x = cx - r + Math.floor(rnd(i, 1, seed + 5) * r * 1.4), y = cy - r + Math.floor(rnd(i, 2, seed + 5) * r);
    if (L.alpha(x, y) && L.alpha(x, y + 1)) { L.set(x, y, '#c4e48a'); }
  }
}
/** 나무 밑동의 쇠 덮개 (막힌 칸) */
function treeGrate(p: Pix, cx: number, cy: number): void {
  const x0 = cx - 8, y0 = cy - 5;
  p.rect(x0 - 1, y0 - 1, 18, 12, CONC.D); p.hl(x0 - 1, y0 - 1, 18, CONC.L);
  p.rect(x0, y0, 16, 10, '#3e3a34');
  for (let y = y0 + 1; y < y0 + 10; y += 2) p.hl(x0 + 1, y, 14, '#5e5850');
  for (let x = x0 + 3; x < x0 + 16; x += 4) p.vl(x, y0, 10, '#4a453e');
  p.ell(cx, cy, 4, 2.5, '#5a4632'); // 덮개 안 흙
  p.hl(x0, y0 + 10, 16, CONC.DD);
}
/** 나무 벤치: 주물 다리와 팔걸이, 나무 등받이 두 줄, 좌판. 사람이 그 위에 앉는다. (x0~x1, 좌판 높이 ys) */
function bench(p: Pix, x0: number, x1: number, ys: number): void {
  const W2 = x1 - x0;
  // 그늘 (발밑, 오른쪽 아래로 조금)
  p.dither(x0 + 2, ys + 5, W2, 6, SHADE, 0, 0.5);
  p.hl(x0 + 2, ys + 10, W2, SHADE, 0.3);
  // 다리
  for (const lx of [x0 + 1, x1 - 3]) { p.rect(lx, ys + 3, 2, 7, '#2e3236'); p.set(lx, ys + 3, '#5a6066'); p.hl(lx - 1, ys + 9, 4, '#22262a'); }
  p.rect(x0 + Math.floor(W2 / 2) - 1, ys + 3, 2, 6, '#2e3236');
  // 등받이: 나무 두 줄
  for (const [y, h] of [[ys - 12, 3], [ys - 7, 3]] as const) {
    p.rect(x0 + 1, y, W2 - 2, h, '#b07a48'); p.hl(x0 + 1, y, W2 - 2, '#d4a06a'); p.hl(x0 + 1, y + h - 1, W2 - 2, '#7a5030');
    for (let x = x0 + 4; x < x1 - 2; x += 9) p.set(x, y + 1, '#8a5a34');  // 나뭇결
  }
  p.hl(x0 + 1, ys - 4, W2 - 2, '#5a3c22', 0.5); // 등받이 밑 틈
  // 좌판: 나무 세 줄
  p.rect(x0, ys - 3, W2, 7, '#c08654');
  p.hl(x0, ys - 3, W2, '#e0aa72'); p.hl(x0, ys - 1, W2, '#8a5a34'); p.hl(x0, ys, W2, '#c89060'); p.hl(x0, ys + 2, W2, '#8a5a34'); p.hl(x0, ys + 3, W2, '#5e3c22');
  for (let x = x0 + 6; x < x1; x += 11) p.set(x, ys + 1, '#a06c3e');
  // 주물 팔걸이 (양끝)
  for (const ax of [x0 - 1, x1 - 1]) {
    p.rect(ax, ys - 13, 2, 17, '#33383c'); p.vl(ax, ys - 13, 17, '#5e656b');
    p.rect(ax - 1, ys - 6, 4, 2, '#3e4448'); p.set(ax - 1, ys - 6, '#7a8288');
  }
}
/** 자전거 한 대 (옆모습). x 는 뒷바퀴 가운데, by 는 땅. flip 이면 왼쪽을 본다. */
function bike(L: Pix, x: number, by: number, col: string, flip: boolean, seed: number): void {
  const s = flip ? -1 : 1, cy = by - 6, fx = x + s * 17;
  for (const wx of [x, fx]) { // 바퀴: 검은 타이어, 은색 바퀴살
    for (let a = 0; a < 36; a++) { const t = a / 36 * Math.PI * 2; L.set(Math.round(wx + Math.cos(t) * 6), Math.round(cy + Math.sin(t) * 6), '#1e2022'); L.set(Math.round(wx + Math.cos(t) * 5), Math.round(cy + Math.sin(t) * 5), '#3a3e42'); }
    L.line(wx - 4, cy, wx + 4, cy, '#9aa0a4', 0.7); L.line(wx, cy - 4, wx, cy + 4, '#9aa0a4', 0.7); L.set(wx, cy, '#c8ccd0');
  }
  const D = mix(col, '#000000', 0.3), Lc = mix(col, '#ffffff', 0.3);
  const bx = x + s * 8, sx = x + s * 4, hx = fx - s * 3;
  L.line(x, cy, bx, cy, D); L.line(x, cy, sx, cy - 9, col); L.line(sx, cy - 9, hx, cy - 9, Lc); L.line(sx, cy - 8, bx, cy, col);
  L.line(bx, cy, hx, cy - 9, col); L.line(hx, cy - 9, fx, cy, D); L.line(hx, cy - 9, hx - s, cy - 12, '#3a3e42');
  L.hl(Math.min(hx - s * 3, hx + s), cy - 12, 4, '#2a2e32');                 // 핸들
  L.rect(Math.min(sx - s * 3, sx + s * 2) , cy - 11, 5, 2, '#22262a'); L.vl(sx, cy - 10, 1, '#5a6066'); // 안장
  L.set(bx, cy + 1, '#5a6066'); L.set(bx + s, cy + 2, '#2a2e32');            // 페달
  if (rnd(seed, 1, 7) > 0.4) { L.rect(Math.min(fx + s * 1, fx + s * 6), cy - 9, 6, 4, '#3a3a36'); L.hl(Math.min(fx + s * 1, fx + s * 6), cy - 9, 6, '#5a5a54'); } // 앞 바구니
}

export function campus(s: PlaceState): Place {
  const m = MAPS.campus, top = m.top || 72, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T, WB = iy(1);
  const day = s.day;

  // ═══ 강의동 앞면 ═══
  // 위층: 벽돌, 창 한 줄
  brick(p, 0, 0, W, 30, 11);
  for (let x = 10; x < W - 10; x += 40) {
    const y0 = 5, w = 24, h = 17;
    p.rect(x - 3, y0 - 4, w + 6, 2, BRICK[3]);                                          // 창 위 벽돌 세운 줄
    for (let i = x - 3; i < x + w + 3; i += 3) p.vl(i, y0 - 4, 2, MORTAR_D);
    glass(p, x, y0, w, h, day, x);
    p.vl(x + 11, y0, h, FRAME.M); p.vl(x + 12, y0, h, FRAME.D); p.hl(x, y0 + 5, w, FRAME.M); // 창살
    frame(p, x, y0, w, h);
    p.rect(x - 3, y0 + h + 2, w + 6, 2, CONC.L); p.hl(x - 3, y0 + h + 4, w + 6, CONC.DD); // 창턱
    for (let i = x; i < x + w; i++) if (rnd(i, 3, 12) > 0.7) p.vl(i, y0 + h + 5, 1 + Math.floor(rnd(i, 4, 12) * 3), mix(BRICK[3], '#000000', 0.15), 0.5); // 창턱 밑 빗물 자국
  }
  // 층 사이 콘크리트 띠
  const BY = 28, BH = 14;
  p.rect(0, BY, W, BH, CONC.M); p.hl(0, BY, W, CONC.LL); p.hl(0, BY + 1, W, CONC.L);
  p.hl(0, BY + BH - 1, W, CONC.DD); p.hl(0, BY + BH, W, mix(BRICK[3], '#000000', 0.3));
  for (let x = 0; x < W; x++) if (rnd(x, 0, 13) > 0.85) p.set(x, BY + 2 + Math.floor(rnd(x, 1, 13) * 7), CONC.D, 0.6);
  for (let x = 47; x < W; x += 96) p.vl(x, BY + 1, BH - 1, CONC.D); // 이음매
  // 아래층: 벽돌 기둥 사이 큰 유리창
  brick(p, 0, BY + BH + 1, W, WB - BY - BH - 1, 14);
  const GY0 = 47, GY1 = 79; // 유리 위·아래
  const bays: [number, number][] = [[4, 32], [44, 32], [84, 28], [180, 30], [218, 32], [258, 32], [298, 32], [338, 32]];
  for (const [x, w] of bays) {
    glass(p, x, GY0, w, GY1 - GY0, day, x + 3, true);
    p.vl(x + Math.floor(w / 2), GY0, GY1 - GY0, FRAME.M); p.vl(x + Math.floor(w / 2) + 1, GY0, GY1 - GY0, FRAME.D); // 세로 창살
    p.hl(x, GY0 + 9, w, FRAME.M); p.hl(x, GY0 + 10, w, FRAME.D);                                                   // 가로 창살
    frame(p, x, GY0, w, GY1 - GY0);
  }
  // 창 안: 게시물 몇 장이 붙어 있다 (안쪽이라 흐리다)
  for (const [x, y, c] of [[52, 64, '#e8e0c8'], [60, 66, '#f0c860'], [230, 63, '#e8e4dc'], [306, 65, '#c8dce8']] as const) { p.rect(x, y, 6, 8, c, 0.55); p.hl(x + 1, y + 2, 4, '#5a5e66', 0.4); }
  // 걸레받이: 화강석 띠
  p.rect(0, GY1 + 2, W, WB - GY1 - 2, '#a8a59e');
  for (let y = GY1 + 2; y < WB; y++) for (let x = 0; x < W; x++) { const n = rnd(x, y, 15); if (n > 0.8) p.set(x, y, n > 0.95 ? '#8a8780' : '#b8b5ae'); }
  p.hl(0, GY1 + 2, W, '#cfccc4'); p.hl(0, WB - 1, W, '#6e6b64');
  for (let x = 0; x < W; x += 32) p.vl(x, GY1 + 3, WB - GY1 - 4, '#8a8780');

  // ── 출입구 (8~9열): 콘크리트 차양, 열어 둔 유리문, 안은 그늘진 로비 ──
  {
    const dx0 = tx(8) - 2, dx1 = tx(10) + 2, dy0 = 50;
    // 로비 안쪽: 뒷벽과 반들거리는 바닥, 안쪽 방풍문의 틀
    for (let y = dy0; y < WB; y++) for (let x = dx0; x < dx1; x++) {
      let col = y < 70 ? mix('#5c5852', '#4a4742', (y - dy0) / 22) : mix('#7a766c', '#9a958a', (y - 70) / (WB - 70));
      if (y >= 70 && (x - dx0) % 12 === 0) col = mix(col, '#000000', 0.12);
      p.set(x, y, col);
    }
    p.rect(dx0 + 6, 52, dx1 - dx0 - 12, 18, '#3e3b37'); p.rect(dx0 + 8, 54, dx1 - dx0 - 16, 16, '#6f8a98');  // 안쪽 방풍문
    p.vl(dx0 + Math.floor((dx1 - dx0) / 2), 54, 16, '#3e3b37');
    p.rect(dx0 + 10, 56, 5, 7, '#dad2bc', 0.7); p.rect(dx1 - 15, 57, 5, 6, '#f2d070', 0.6);                 // 방풍문에 붙은 안내문
    for (let x = dx0 + 2; x < dx1 - 2; x++) p.set(x, 71, '#c8c2b4', 0.5);                                     // 바닥에 비친 바깥빛
    p.dither(dx0, 72, dx1 - dx0, 14, '#ffffff', 0, 0.06);
    p.rect(dx0 + 4, 84, dx1 - dx0 - 8, 4, '#3c3e3a'); p.hl(dx0 + 4, 84, dx1 - dx0 - 8, '#55574f');           // 발판 매트
    // 문틀
    p.rect(dx0 - 3, dy0 - 1, 3, WB - dy0 + 1, FRAME.M); p.vl(dx0 - 3, dy0 - 1, WB - dy0 + 1, FRAME.L);
    p.rect(dx1, dy0 - 1, 3, WB - dy0 + 1, FRAME.D);
    p.rect(dx0 - 3, dy0 - 1, dx1 - dx0 + 6, 2, FRAME.M);
    // 안으로 활짝 연 문짝 둘: 비스듬히 보이는 유리판과 은색 손잡이
    for (const side of [0, 1]) {
      const jx = side ? dx1 - 1 : dx0, dir = side ? -1 : 1;
      for (let i = 0; i < 9; i++) {
        const x = jx + dir * i, yT = dy0 + 1 + Math.round(i * 0.7), yB = WB - 1 - Math.round(i * 0.5);
        p.vl(x, yT, yB - yT, i === 0 || i === 8 ? FRAME.M : mix('#7a98a8', '#a8c4d2', i / 8), i === 0 || i === 8 ? 1 : 0.8);
        p.set(x, yT, FRAME.L); p.set(x, yB, FRAME.D);
      }
      const hx = jx + dir * 7; p.vl(hx, 63, 9, '#d8dde0'); p.vl(hx + dir, 63, 9, '#8a9094');
    }
    p.hl(dx0, WB - 1, dx1 - dx0, '#b8b5ae'); // 문턱
    // 차양: 기둥 위로 내민 콘크리트 판, 밑에 그늘
    const cx0 = tx(8) - 14, cx1 = tx(10) + 14, cy0 = 43;
    p.rect(cx0, cy0, cx1 - cx0, 7, CONC.M); p.hl(cx0, cy0, cx1 - cx0, CONC.LL); p.hl(cx0, cy0 + 1, cx1 - cx0, CONC.L);
    p.hl(cx0, cy0 + 6, cx1 - cx0, CONC.DD); p.vl(cx0, cy0, 7, CONC.L); p.vl(cx1 - 1, cy0, 7, CONC.D);
    p.dither(cx0 + 1, cy0 + 7, cx1 - cx0 - 2, 3, '#000000', 0, 0.3); p.hl(cx0 + 1, cy0 + 7, cx1 - cx0 - 2, '#000000', 0.25);
    // 건물 이름: 콘크리트 띠 위에 청동 글씨 세 자와 학교 표장. 아래에 영문 한 줄.
    const nx = tx(9) - 26, ny = BY + 2;
    p.ell(nx - 9, ny + 4.5, 5, 5, '#2f5a8a'); p.ell(nx - 9, ny + 4.5, 3, 3, '#f0f0e8'); p.ell(nx - 9, ny + 5, 1.6, 1.6, '#2f5a8a'); p.set(nx - 11, ny + 1, '#6a8ac0'); // 학교 표장
    for (const [ox, oy, c] of [[1, 2, '#9a958a'], [0, 0, '#8a7256'], [0, 1, '#3a2e26']] as const) { // 그림자, 볕 받은 윗면, 청동 글씨 ('…관')
      glyph(p, nx + ox, ny + oy, 3, c, 41, 2); glyph(p, nx + 42 + ox, ny + oy, 1, c, 42, 2);
    }
    // 건물 번호판: 왼쪽 기둥 위
    p.rect(116, 53, 11, 7, '#1f4a86'); p.hl(116, 53, 11, '#4a74b0'); text(p, 118, 54, '07', '#ffffff');
  }

  // ── 현수막: 위층 오른쪽 창 앞에 끈으로 묶었다 ──
  {
    const x0 = 222, x1 = 336, y0 = 7, y1 = 22;
    for (const [ax, ay, bx, by] of [[x0, y0, x0 - 4, y0 - 5], [x1, y0, x1 + 4, y0 - 5], [x0, y1, x0 - 3, y1 + 4], [x1, y1, x1 + 3, y1 + 4]] as const) p.line(ax, ay, bx, by, '#d8d2c0');
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 1.2);
      if (y === y1 && rnd(x, 0, 51) > 0.85) continue;
      let col = '#f6f3ea';
      if ((x - x0) % 23 === 11) col = '#e2ddd0';                       // 접혔던 주름
      if (y === y1 || y === y1 - 1) col = '#d8d2c2';                   // 아래로 처진 그늘
      p.set(x, y + (y >= y1 - 1 ? sag : 0), col);
    }
    p.hl(x0, y0, x1 - x0 + 1, '#ffffff');
    p.rect(x0 + 3, y0 + 3, 4, 10, '#2a5aa8');                          // 학교 색 띠
    glyph(p, x0 + 11, y0 + 4, 5, '#2a4a9a', 52, 1);
    glyph(p, x0 + 50, y0 + 4, 4, '#d0342a', 53, 1);
    glyph(p, x0 + 82, y0 + 4, 4, '#2a4a9a', 54, 1);
    dashes(p, x0 + 11, y0 + 11, 92, '#7a7a88', 55);
  }

  // ═══ 바닥 ═══
  const PY = iy(5), CY = iy(6); // 붉은 보도, 연석
  // 광장: 회색 보도블록
  pavers(p, 0, WB, W, PY - WB, ['#cbc6ba', '#c4bfb3', '#d0cbbf', '#bdb8ac', '#c8c3b7'], '#a19c90', 21);
  // 정문 축: 문에서 아래로 넓은 화강석 판석
  for (let y = WB + 3; y < PY; y++) for (let x = tx(8) - 2; x < tx(10) + 2; x++) {
    const lx = (x - tx(8) + 2) % 18, ly = (y - WB - 3) % 10, n = rnd(Math.floor((x - tx(8) + 2) / 18), Math.floor((y - WB - 3) / 10), 22);
    let col = n > 0.6 ? '#dcd8ce' : '#d2cec4';
    if (rnd(x, y, 23) > 0.9) col = '#bcb8ae'; else if (rnd(x, y, 24) > 0.94) col = '#eceae2';
    if (ly === 9 || lx === 17) col = '#a8a49a'; else if (ly === 0) col = mix(col, '#ffffff', 0.25);
    p.set(x, y, col);
  }
  // 광장 가운데 원형 무늬: 붉은 벽돌 고리 두 겹
  {
    const ox = tx(9), oy = iy(3) + 8;
    for (let y = oy - 18; y <= oy + 18; y++) for (let x = ox - 44; x <= ox + 44; x++) {
      const d = Math.hypot((x - ox) / 40, (y - oy) / 16);
      if (d > 0.84 && d < 1) p.set(x, y, ((Math.atan2(y - oy, x - ox) * 12 / Math.PI + 48) | 0) % 2 ? '#a65a44' : '#b8684e');
      else if (d >= 1 && d < 1.05) p.set(x, y, '#8a7a6a');
      else if (d > 0.36 && d < 0.44) p.set(x, y, '#a65a44');
      if (d > 0.82 && d < 0.84) p.set(x, y, '#8a4a38');
    }
  }
  // 벽 밑 배수 띠
  p.rect(0, WB, W, 3, '#8e8a80'); for (let x = 0; x < W; x += 3) p.set(x, WB + 1, '#5a5650');
  p.dither(0, WB + 3, W, 2, '#000000', 0, 0.12); // 건물이 드리운 아주 얇은 그늘
  // 붉은 보도 (5줄): 기숙사 쪽 길. 화면 밖으로 이어진다.
  p.hl(0, PY, W, '#a8a49a'); p.hl(0, PY + 1, W, '#8a867c');
  pavers(p, 0, PY + 2, W, CY - PY - 2, ['#b26a52', '#aa634c', '#b87058', '#a45e48'], '#86503e', 25, 12, 7);
  // 연석과 잔디 띠
  p.rect(0, CY, W, 3, CONC.L); p.hl(0, CY, W, CONC.LL); p.hl(0, CY + 2, W, CONC.D); p.hl(0, CY + 3, W, CONC.DD);
  for (let x = 0; x < W; x += 24) p.vl(x, CY, 3, CONC.D);
  lawn(p, 0, CY + 4, W, H - CY - 4, 26);
  p.dither(0, CY + 4, W, 2, '#000000', 0, 0.18);
  for (const [x, c] of [[30, '#f4f0e0'], [70, '#f0d850'], [118, '#f4f0e0'], [178, '#e88aa8'], [362, '#f0d850']] as const) { // 잔디 사이 꽃
    p.set(x, CY + 9, c); p.set(x + 1, CY + 10, c); p.set(x - 1, CY + 10, c); p.set(x, CY + 11, GRASS[3]);
  }
  // 자전거 거치대 자리: 잔디를 걷어 낸 판석 바닥 (15~20열)
  pavers(p, tx(15), CY + 4, tx(21) - tx(15), H - CY - 4, ['#bcb7ab', '#b4afa3', '#c2bdb2'], '#958f84', 27, 16, 6);

  // ═══ 가장자리: 왼쪽 화단, 오른쪽 화단 ═══
  {
    // 왼쪽 (0열): 화강석 테를 두른 화단, 회양목
    const x1 = 14;
    p.rect(0, WB, x1, CY - WB, '#6a4e36');
    for (let y = WB; y < CY; y++) for (let x = 0; x < x1; x++) if (rnd(x, y, 31) > 0.8) p.set(x, y, '#5a4230');
    for (let y = WB + 8; y < CY; y += 13) shrub(p, 6, y, 7, 6, y);
    p.rect(x1, WB, 3, CY - WB, CONC.M); p.vl(x1, WB, CY - WB, CONC.LL); p.vl(x1 + 2, WB, CY - WB, CONC.D);
    // 오른쪽 (23열, 1~4줄): 화단. 5줄은 기숙사 쪽으로 트였다.
    const x0 = W - 14;
    p.rect(x0, WB, 14, PY - WB, '#6a4e36');
    for (let y = WB; y < PY; y++) for (let x = x0; x < W; x++) if (rnd(x, y, 32) > 0.8) p.set(x, y, '#5a4230');
    for (let y = WB + 8; y < PY - 4; y += 13) shrub(p, x0 + 8, y, 7, 6, y + 3);
    p.rect(x0 - 3, WB, 3, PY - WB, CONC.M); p.vl(x0 - 3, WB, PY - WB, CONC.L); p.vl(x0 - 1, WB, PY - WB, CONC.D);
    p.rect(x0 - 3, PY - 4, 17, 4, CONC.M); p.hl(x0 - 3, PY - 4, 17, CONC.LL); p.hl(x0 - 3, PY - 1, 17, CONC.DD); // 화단 앞 턱
  }

  // ═══ 물건 ═══
  // 쓰레기통: 출입구 왼쪽 벽 밑 (일반 / 재활용)
  {
    const x0 = tx(6) + 6, by = WB + 1;
    p.dither(x0 + 2, by - 1, 22, 3, SHADE, 0, 0.5);
    for (const [i, c, cl] of [[0, '#5a6a72', '#7a8a92'], [1, '#3a7a5a', '#5a9a7a']] as const) {
      const bx = x0 + i * 11;
      p.rect(bx, by - 17, 10, 17, c); p.vl(bx, by - 17, 17, cl); p.vl(bx + 9, by - 17, 17, mix(c, '#000000', 0.3));
      p.rect(bx - 1, by - 19, 12, 3, mix(c, '#000000', 0.15)); p.hl(bx - 1, by - 19, 12, cl);
      p.rect(bx + 3, by - 18, 4, 1, '#1a1c1e');                         // 넣는 구멍
      p.rect(bx + 2, by - 13, 6, 4, '#eceae2'); p.hl(bx + 3, by - 12, 4, c); // 표시 딱지
      p.hl(bx, by - 1, 10, '#22262a');
    }
  }
  // 벤치 셋 (1줄, 4~5, 10~11, 17~18열): 걷는 칸에 그려서 사람이 그 위에 앉는다
  for (const c of [4, 10, 17]) bench(p, tx(c) + 1, tx(c + 2) - 1, iy(1) + 3);
  // 나무 그늘과 밑동 덮개 (막힌 칸)
  const trees: [number, number, number, number, number][] = [[20, 1, 22, 1, 1], [2, 2, 21, 2, -3], [14, 2, 23, 3, 0]];
  for (const [c, r, rad, sd, ln] of trees) {
    const cx = tx(c) + 8, by = iy(r) + 12;
    treeShadow(p, cx + 2 + ln, by - 1, rad + 3, 9, sd + 70);
    treeGrate(p, cx, by - 2);
  }
  // 바닥의 낙엽 몇 장 (늦여름: 아직 초록이 많다)
  for (let i = 0; i < 26; i++) {
    const x = 18 + Math.floor(rnd(i, 1, 81) * (W - 36)), y = WB + 6 + Math.floor(rnd(i, 2, 81) * (PY - WB - 8));
    p.set(x, y, rnd(i, 3, 81) > 0.6 ? '#c8a050' : '#8aa850'); p.set(x + 1, y, '#7a6a3a', 0.6);
  }

  // ═══ 앞에 서는 것 ═══
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void, foot: number, fade = false): void => { const L = new Pix(W, H); draw(L); const q = cut(L, top, foot); if (fade) q.fade = true; props.push(q); };
  // 나무: 같은 줄에 선 사람까지 잎이 덮는다
  for (const [c, r, rad, sd, ln] of trees) prop((L) => tree(L, tx(c) + 8, iy(r) + 12, rad, sd, ln), r * T + 14, true);
  // 자전거 거치대와 자전거 (잔디 띠, 15~20열): 5줄에 선 사람의 발을 가린다
  prop((L) => {
    const by = H - 3, x0 = tx(15) + 4, x1 = tx(21) - 4;
    for (let x = x0; x <= x1; x += 15) { L.rect(x, by - 9, 2, 9, '#7a8086'); L.vl(x, by - 9, 9, '#b8c0c6'); }
    L.hl(x0, by - 9, x1 - x0 + 2, '#b8c0c6'); L.hl(x0, by - 8, x1 - x0 + 2, '#6a7076');
    const cols = ['#c8463a', '#3a6aa8', '#e8e4d8', '#2e3236'];
    for (let i = 0; i < 3; i++) bike(L, x0 + 8 + i * 31 + (i === 1 ? 17 : 0), by, cols[i], i === 1, i + 1);
  }, 6 * T);
  // 거치대 옆 쓰레기통 하나
  prop((L) => {
    const x = tx(21) + 3, by = H - 3;
    L.rect(x, by - 15, 10, 15, '#5a6a72'); L.vl(x, by - 15, 15, '#7a8a92'); L.vl(x + 9, by - 15, 15, '#3e4a50');
    L.rect(x - 1, by - 17, 12, 3, '#4a5a62'); L.hl(x - 1, by - 17, 12, '#8a9aa2'); L.rect(x + 3, by - 16, 4, 1, '#1a1c1e');
    L.hl(x, by, 11, SHADE, 0.4);
  }, 6 * T);
  // 오른쪽 아래 잔디 위: 기숙사 쪽을 가리키는 이정표
  prop((L) => {
    const sx = W - 22, by = H - 2;
    L.rect(sx, by - 14, 2, 14, '#4a4f54'); L.vl(sx, by - 14, 14, '#7a8086');
    L.rect(sx - 8, by - 15, 22, 8, '#2a5a3a'); L.hl(sx - 8, by - 15, 22, '#4a8a5a'); L.hl(sx - 8, by - 8, 22, '#1a3a26');
    glyph(L, sx - 6, by - 14, 2, '#ffffff', 61, 1, 0.9); L.dots(`${sx + 11},${by - 12} ${sx + 10},${by - 13} ${sx + 10},${by - 11} ${sx + 9},${by - 12}`, '#ffffff');
    L.hl(sx - 1, by, 5, SHADE, 0.4);
  }, 6 * T);
  return { base: p, props };
}
