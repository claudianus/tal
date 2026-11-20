// 4장의 두 장면: 지방 병원 장례식장 입구(밤), 응급실 침대에서 올려다본 천장.
// 둘 다 조용한 장면이다. 크게 움직이는 것도, 센 색도 없다. 칠은 불이 켜진 고유색으로, 어둠과 빛은 world.ts 가 덮는다.
import { T, text, cut, type Place, type PlaceState, type Prop } from './kit.ts';
import { Pix, mix, rnd, sprite } from './pix.ts';
import { MAPS } from '../maps.ts';

/** 화강석: 잔 점이 박힌 돌 */
function granite(p: Pix, x0: number, y0: number, w: number, h: number, base: string, seed: number): void {
  const L = mix(base, '#ffffff', 0.14), D = mix(base, '#000000', 0.14), DD = mix(base, '#000000', 0.28);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed);
    p.set(x, y, n > 0.95 ? DD : n > 0.86 ? D : n < 0.07 ? L : base);
  }
}

// ═══════════════════ 장례식장 입구 (밤) ═══════════════════
// 지방 병원 뒤편의 장례식장. 밝은 석재 외벽, 가운데 자동 유리문, 문 위 차양에 '장례식장'.
// 문 양쪽 낮은 화단 앞에 근조 화환이 줄지어 섰다. 오른쪽 끝에 빈소 안내판. 앞마당은 보도블록.

// 차양 글씨 '장례식장' (7×7 한 글자, 1 = 점)
const SIGN: string[][] = [
  ['###.#..', '.#..##.', '#.#.#..', '.......', '.####..', '#....#.', '.####..'], // 장
  ['###.#.#', '..#.#.#', '..###.#', '###.#.#', '#..##.#', '#...#.#', '###.#.#'], // 례
  ['.#..#..', '.#..#..', '#.#.#..', '.......', '.####..', '....#..', '....#..'], // 식
  ['###.#..', '.#..##.', '#.#.#..', '.......', '.####..', '#....#.', '.####..'], // 장
];

/** 근조 화환: 삼각 받침대 위에 흰 국화를 둥글게 꽂고, 양옆에 글씨 띠를 늘어뜨린다. kind 1 은 이단으로 쌓은 것. */
function wreath(L: Pix, cx: number, fy: number, seed: number, kind: number): void {
  const LEG = '#9c8058', LEGD = '#6e5a3c', LEGL = '#bfa47a';
  const hub = fy - 24;
  // 받침대: 뒷다리(짧게 보인다), 앞 두 다리, 가로대
  L.line(cx, hub, cx, fy - 3, LEGD);
  L.line(cx - 1, hub, cx - 7, fy, LEG); L.line(cx, hub, cx - 6, fy, LEGL);
  L.line(cx + 1, hub, cx + 7, fy, LEGD); L.line(cx, hub, cx + 6, fy, LEG);
  L.hl(cx - 4, fy - 9, 9, LEGD); L.hl(cx - 4, fy - 10, 9, LEG);
  L.set(cx - 7, fy, '#4a3e2c'); L.set(cx + 7, fy, '#4a3e2c'); // 발끝
  // 꽃 덩어리
  const PET = '#f1efe8', PETL = '#fdfdf9', PETS = '#d2cfc5', PETD = '#aeaaa0', LEAF = '#3e6a3c', LEAFD = '#2a4a2c', LEAFL = '#5a8a50';
  const flowers = (ox: number, oy: number, rx: number, ry: number, hole: number, s2: number): void => {
    // 잎 테두리
    for (let y = Math.floor(oy - ry - 2); y <= oy + ry + 2; y++) for (let x = Math.floor(ox - rx - 2); x <= ox + rx + 2; x++) {
      const dx = (x - ox) / (rx + 1.4), dy = (y - oy) / (ry + 1.4), d = dx * dx + dy * dy;
      if (d <= 1 && (d > 0.72 || rnd(x, y, s2) > 0.9)) L.set(x, y, rnd(x, y, s2 + 1) > 0.6 ? LEAFD : y < oy ? LEAFL : LEAF);
      else if (d <= 1.12 && rnd(x, y, s2 + 2) > 0.7) L.set(x, y, LEAFD); // 삐져나온 잎끝
    }
    // 국화: 바탕을 깔고 송이를 얹는다. 위가 밝고 아래가 그늘진다.
    for (let y = Math.floor(oy - ry); y <= oy + ry; y++) for (let x = Math.floor(ox - rx); x <= ox + rx; x++) {
      const dx = (x - ox) / rx, dy = (y - oy) / ry, d = dx * dx + dy * dy;
      if (d > 1 || d < hole) continue;
      L.set(x, y, dy > 0.45 ? PETS : PET);
    }
    for (let j = -ry; j <= ry; j += 3) for (let i = -rx; i <= rx; i += 3) {
      const x = Math.round(ox + i + (rnd(i, j, s2 + 3) - 0.5) * 2), y = Math.round(oy + j + (rnd(j, i, s2 + 4) - 0.5) * 2);
      const dx = (x - ox) / rx, dy = (y - oy) / ry, d = dx * dx + dy * dy;
      if (d > 0.85 || d < hole + 0.05) continue;
      L.set(x, y, PETL); L.set(x + 1, y, PETL); L.set(x, y + 1, PET); L.set(x + 1, y + 1, dy > 0.3 ? PETD : PETS);
      if (rnd(x, y, s2 + 5) > 0.75) L.set(x, y, '#e2e6c8'); // 꽃술
    }
  };
  // 띠: 하얀 리본에 검은 글씨 (읽히지 않는 덩어리), 끝은 제비꼬리로 자른다
  const ribbon = (x: number, y0: number, len: number, s2: number): void => {
    L.rect(x, y0, 3, len, '#f3f0e6'); L.vl(x + 2, y0, len, '#cdc8ba'); L.vl(x, y0, len, '#fbfaf4');
    for (let k = 0; k < Math.floor((len - 6) / 4); k++) {
      const gy = y0 + 3 + k * 4;
      for (let v = 0; v < 3; v++) for (let u = 0; u < 2; u++) if (rnd(u + k * 3, v, s2) > 0.4) L.set(x + u, gy + v, '#2a2a2e', 0.85);
    }
    L.d[((y0 + len - 1) * L.w + x + 1) * 4 + 3] = 0; // 제비꼬리
    L.d[((y0 + len - 2) * L.w + x + 1) * 4 + 3] = 0;
  };
  if (kind === 0) {
    const oy = fy - 35;
    ribbon(cx - 11, oy - 2, 32, seed + 10); ribbon(cx + 9, oy - 2, 32, seed + 11);
    flowers(cx, oy, 9, 9, 0, seed);
    // 가운데: 연노랑 국화 한 송이
    L.ell(cx, oy, 2.2, 2.2, '#e8e2b0'); L.set(cx - 1, oy - 1, '#f6f2d0'); L.set(cx + 1, oy + 1, '#c8c090');
  } else {
    const o1 = fy - 39, o2 = fy - 27;
    ribbon(cx - 10, o1 - 2, 34, seed + 10); ribbon(cx + 8, o1 - 2, 34, seed + 11);
    flowers(cx, o2, 6, 4, 0, seed + 20);
    flowers(cx, o1, 8, 7, 0, seed);
  }
}

export function funeral(s: PlaceState): Place {
  const m = MAPS.funeral, top = m.top || 64, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T, WB = iy(1);
  // ── 하늘 한 줄, 옥상 난간 ──
  for (let y = 0; y < 4; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#141a28', '#1f2738', y / 3));
  p.rect(0, 4, W, 3, '#b6b1a6'); p.hl(0, 4, W, '#d4d0c6'); p.hl(0, 7, W, '#6f6b63');
  // ── 외벽: 밝은 석재 판을 줄눈 맞춰 붙였다 ──
  const WALL = '#cdc7ba';
  for (let y = 8; y < WB - 8; y++) for (let x = 0; x < W; x++) {
    const px = x % 32, py = (y - 8) % 16, pi = Math.floor(x / 32), pj = Math.floor((y - 8) / 16);
    const tone = rnd(pi, pj, 201) > 0.6 ? mix(WALL, '#a89e8c', 0.12) : rnd(pi, pj, 202) > 0.7 ? mix(WALL, '#ffffff', 0.08) : WALL;
    let col = tone;
    const n = rnd(x, y, 203);
    if (n > 0.95) col = mix(tone, '#000000', 0.13); else if (n < 0.04) col = mix(tone, '#ffffff', 0.15);
    if (px === 0 || py === 0) col = '#a09a8e';
    else if (py === 1) col = mix(tone, '#ffffff', 0.18);
    else if (py === 15) col = mix(tone, '#000000', 0.08);
    p.set(x, y, col);
  }
  // 아래 걸레받이: 짙은 화강석
  granite(p, 0, WB - 8, W, 8, '#7f7a72', 204); p.hl(0, WB - 8, W, '#a19b90'); p.hl(0, WB - 1, W, '#4f4b45');
  // 위층 창: 왼쪽은 복도 불이 켜졌고 오른쪽은 꺼졌다. 둘 다 반투명 유리.
  const win = (x0: number, lit: boolean): void => {
    p.rect(x0 - 2, 12, 44, 18, '#7d796f'); p.hl(x0 - 2, 12, 44, '#5c5951'); p.hl(x0 - 3, 30, 46, '#e2ddd2'); p.hl(x0 - 3, 31, 46, '#8f8a80');
    for (let y = 13; y < 29; y++) for (let x = x0 - 1; x < x0 + 41; x++) {
      const c = lit ? mix('#e9ece2', '#cfd6cf', (y - 13) / 16) : mix('#2a3242', '#3a4456', (y - 13) / 16);
      p.set(x, y, c);
    }
    if (lit) for (let y = 14; y < 28; y += 2) p.hl(x0 - 1, y, 42, '#c4cbc4', 0.6); // 블라인드
    else p.line(x0 + 4, 27, x0 + 14, 14, '#4c5870', 0.7);
    p.vl(x0 + 20, 13, 16, '#6a665d');
  };
  win(20, true); win(196, false);
  // ── 차양: 윗면, 짙은 간판 띠, 그 밑 그늘과 매입등 ──
  const CX0 = 84, CX1 = 172;
  p.rect(CX0, 9, CX1 - CX0, 5, '#9a968e'); p.hl(CX0, 9, CX1 - CX0, '#b8b4ac'); for (let x = CX0; x < CX1; x += 11) p.vl(x, 10, 4, '#8a867e');
  p.rect(CX0, 14, CX1 - CX0, 12, '#2a2f3a'); p.hl(CX0, 14, CX1 - CX0, '#8f96a2'); p.hl(CX0, 15, CX1 - CX0, '#3d4452'); p.hl(CX0, 25, CX1 - CX0, '#1a1e26');
  p.vl(CX0, 14, 12, '#4a5160'); p.vl(CX1 - 1, 14, 12, '#1a1e26');
  SIGN.forEach((g, i) => g.forEach((row, v) => { for (let u = 0; u < 7; u++) if (row[u] === '#') p.set(112 + i * 9 + u, 17 + v, '#f2eee2'); }));
  p.rect(CX0 + 2, 26, CX1 - CX0 - 4, 2, '#4a4a4c'); p.dither(CX0 + 2, 28, CX1 - CX0 - 4, 1, '#3a3836', 0, 0.5);
  for (const x of [96, 158]) { p.hl(x, 26, 4, '#fff6dc'); p.hl(x + 1, 27, 2, '#e8dcc0'); }
  // ── 자동 유리문 ──
  const DX0 = 102, DX1 = 154, DY0 = 28;
  p.rect(DX0, DY0, DX1 - DX0, WB - DY0, '#a7aeb5');
  // 유리 너머: 하얗게 밝은 로비, 멀리 흰 국화 제단과 액자 하나
  const BW0 = 118, BW1 = 150, BY0 = 41, BY1 = 62;
  for (let y = DY0 + 6; y < WB - 2; y++) for (let x = DX0 + 3; x < DX1 - 3; x++) {
    const side = x < BW0 ? BW0 - x : x >= BW1 ? x - BW1 + 1 : 0; // 안쪽 벽에서 옆으로 떨어진 만큼 천장과 바닥이 벌어진다
    let c: string;
    if (y < BY0 - Math.round(side * 0.45)) c = '#f9f8f3'; // 천장
    else if (y >= BY1 + Math.round(side * 0.9)) c = mix('#dcd9cf', '#cbc8be', (y - BY1) / 16); // 바닥
    else c = side === 0 ? '#eeebe3' : x < BW0 ? '#e4e1d8' : '#e0ddd4'; // 안쪽 벽, 옆벽
    p.set(x, y, c);
  }
  p.hl(BW0, BY1, BW1 - BW0, '#c4c1b8'); p.hl(BW0 + 3, BY0 - 3, BW1 - BW0 - 6, '#ffffff'); // 바닥 걸레받이, 천장등 한 줄
  { // 제단: 옅은 나무 뒷판, 흰 천 덮은 단, 층층이 흰 국화, 가운데 검은 테 액자
    const ax = 135;
    p.rect(ax - 12, 42, 25, 18, '#d6cfbf'); p.hl(ax - 12, 42, 25, '#e4dfd2'); p.vl(ax - 12, 42, 18, '#c4bcaa'); p.vl(ax + 12, 42, 18, '#c4bcaa');
    p.rect(ax - 11, 59, 23, 3, '#f8f7f2'); p.hl(ax - 11, 61, 23, '#c8c5bc');
    for (let t = 0; t < 4; t++) {
      const yy = 57 - t * 2, hw = 10 - t * 2;
      for (let x = ax - hw; x <= ax + hw; x++) { p.set(x, yy, (x + t) % 2 ? '#ffffff' : '#e8e7e0'); p.set(x, yy + 1, (x + t) % 3 ? '#e6e5de' : '#bdbbb3'); }
    }
    p.set(ax - 9, 57, '#b8c6a4'); p.set(ax + 8, 56, '#b8c6a4'); p.set(ax - 4, 53, '#b8c6a4'); p.set(ax + 5, 54, '#b8c6a4');
    p.rect(ax - 3, 44, 7, 8, '#232326');
    p.rect(ax - 2, 45, 5, 6, '#b0b1b3');
    p.dots(`${ax - 1},45 ${ax},45 ${ax + 1},45 ${ax - 2},46 ${ax - 1},46 ${ax},46 ${ax + 1},46 ${ax + 2},46 ${ax - 1},47 ${ax},47 ${ax + 1},47`, '#94959a'); // 흐린 회색 덩어리, 얼굴 없음
    for (let x = ax - 2; x <= ax + 2; x++) { p.set(x, 49, '#808186'); p.set(x, 50, '#808186'); } p.set(ax - 1, 48, '#8a8b90'); p.set(ax, 48, '#8a8b90'); p.set(ax + 1, 48, '#8a8b90');
    p.set(ax - 3, 44, '#0e0e10'); p.set(ax + 3, 44, '#0e0e10');
  }
  // 유리: 차가운 기운, 비친 빛줄기, 안전 띠
  for (let y = DY0 + 6; y < WB - 2; y++) for (let x = DX0 + 3; x < DX1 - 3; x++) {
    p.set(x, y, '#c4d6dc', 0.14);
    const k = (x * 2 - y + 400) % 26;
    if (k < 2) p.set(x, y, '#ffffff', 0.35);
  }
  for (let x = DX0 + 3; x < DX1 - 3; x += 2) p.set(x, 66, '#f4f6f6', 0.75);
  // 문틀: 양쪽 고정창, 가운데 미닫이 두 짝, 위 센서
  p.rect(DX0, DY0, DX1 - DX0, 6, '#9aa1a8'); p.hl(DX0, DY0, DX1 - DX0, '#c7ccd1'); p.hl(DX0, DY0 + 5, DX1 - DX0, '#6c737a');
  p.rect(124, DY0 + 1, 9, 3, '#2a2d32'); p.set(131, DY0 + 2, '#e05040');
  p.rect(DX0, DY0, 3, WB - DY0, '#b7bdc3'); p.vl(DX0 + 2, DY0 + 6, WB - DY0 - 6, '#6c737a');
  p.rect(DX1 - 3, DY0, 3, WB - DY0, '#8e959c'); p.vl(DX1 - 3, DY0 + 6, WB - DY0 - 6, '#c7ccd1');
  for (const x of [111, 143]) { p.vl(x, DY0 + 6, WB - DY0 - 6, '#c7ccd1'); p.vl(x + 1, DY0 + 6, WB - DY0 - 6, '#7c838a'); }
  p.vl(127, DY0 + 6, WB - DY0 - 6, '#c7ccd1'); p.vl(128, DY0 + 6, WB - DY0 - 6, '#5c636a');
  p.rect(DX0, WB - 2, DX1 - DX0, 2, '#7a8188'); p.hl(DX0, WB - 2, DX1 - DX0, '#b2b8be');

  // ── 땅: 보도블록, 문 앞은 화강석 판, 발판 ──
  for (let y = WB; y < H; y++) for (let x = 0; x < W; x++) {
    const r = Math.floor((y - WB) / 6), bx = (x + (r % 2) * 6) % 12, by = (y - WB) % 6, bi = Math.floor((x + (r % 2) * 6) / 12);
    const v = rnd(bi, r, 210);
    const base = v > 0.9 ? '#a39184' : v > 0.6 ? '#9d988e' : v > 0.25 ? '#a9a49a' : '#b2ada3';
    let col = base;
    if (bx === 0 || by === 0) col = '#77726a';
    else if (by === 1) col = mix(base, '#ffffff', 0.12);
    else if (by === 5 || bx === 11) col = mix(base, '#000000', 0.08);
    else if (rnd(x, y, 211) > 0.94) col = mix(base, '#000000', 0.12);
    p.set(x, y, col);
  }
  granite(p, 96, WB, 64, 32, '#b6b3ac', 212);
  for (let x = 96; x <= 160; x += 16) p.vl(Math.min(x, 159), WB, 32, '#8f8c85');
  p.hl(96, WB + 16, 64, '#8f8c85'); p.hl(96, WB + 17, 64, '#c8c5be'); p.hl(96, WB + 32, 64, '#6f6b64');
  p.rect(112, WB + 2, 32, 11, '#46494e'); p.hl(112, WB + 2, 32, '#5c6066'); p.hl(112, WB + 12, 32, '#2e3034');
  for (let x = 114; x < 142; x += 3) p.vl(x, WB + 4, 7, '#3a3d42');
  p.hl(0, WB, W, '#3e3b36', 0.7); p.dither(0, WB + 1, W, 2, '#3e3b36', 0, 0.3);

  // ── 화환이 서는 자리: 벽에 붙은 낮은 화단 (화환이 적은 밤에도 그 칸은 막혀 보인다) ──
  const planter = (x0: number, x1: number, seed: number): void => {
    p.rect(x0, WB - 4, x1 - x0, 11, '#a49f94');
    for (let x = x0; x < x1; x++) {
      const h = 3 + Math.round(1.6 * Math.sin(x * 0.55 + seed) + rnd(x, 0, seed) * 1.5);
      for (let y = WB - h - 1; y < WB + 1; y++) p.set(x, y, y === WB - h - 1 ? '#5f8250' : rnd(x, y, seed) > 0.75 ? '#2c4529' : '#3e5e3a');
    }
    p.hl(x0, WB + 1, x1 - x0, '#cfcabe'); p.hl(x0, WB + 2, x1 - x0, '#b9b4a8');
    granite(p, x0, WB + 3, x1 - x0, 6, '#9d988c', seed + 1); p.hl(x0, WB + 9, x1 - x0, '#5f5b55'); p.dither(x0, WB + 10, x1 - x0, 2, '#3e3b36', 0, 0.35);
    p.vl(x0, WB - 4, 14, '#c3beb2'); p.vl(x1 - 1, WB - 4, 14, '#7a756b');
  };
  planter(32, 96, 220); planter(160, 224, 221);

  // ── 안내판 (14,1): 검은 판에 호실 번호와 이름 자리. 이름은 글자 덩어리뿐이다. ──
  {
    const bx = 225, by = 50, bw = 17, bh = 32;
    p.vl(bx + 3, by + bh, WB + 14 - by - bh, '#55585e'); p.vl(bx + bw - 4, by + bh, WB + 14 - by - bh, '#55585e');
    p.vl(bx + 4, by + bh, WB + 14 - by - bh, '#7c8086'); p.vl(bx + bw - 3, by + bh, WB + 14 - by - bh, '#3a3c40');
    p.hl(bx + 1, WB + 14, bw - 2, '#3a3c40'); p.ell(bx + bw / 2, WB + 14, 9, 1.5, '#2a2a28', 0.35);
    p.rect(bx - 1, by - 1, bw + 2, bh + 2, '#9aa0a6'); p.hl(bx - 1, by - 1, bw + 2, '#c4c9ce'); p.vl(bx + bw, by, bh + 1, '#6a7076');
    p.rect(bx, by, bw, bh, '#1c1e23');
    p.rect(bx, by, bw, 6, '#2c3038'); for (let k = 0; k < 3; k++) p.rect(bx + 3 + k * 4, by + 2, 3, 2, '#e8e6dc', 0.9); // 머리글: 글자 덩어리
    for (let i = 0; i < 3; i++) {
      const ry = by + 9 + i * 7;
      text(p, bx + 2, ry, String(i + 1), '#e8e6dc');
      for (let k = 0; k < 3; k++) if (rnd(i, k, 231) > 0.15) p.rect(bx + 7 + k * 3, ry + 1, 2, 3, '#cfcdc4', 0.85);
      p.hl(bx + 1, ry + 6, bw - 2, '#2e3138');
    }
    p.line(bx + 1, by + 30, bx + 8, by + 7, '#ffffff', 0.08);
  }

  // ── 양옆: 낮은 화단 (막힌 칸) ──
  const sideBed = (x0: number, edge: number): void => {
    for (let y = WB; y < iy(6); y++) for (let x = x0; x < x0 + 16; x++) p.set(x, y, rnd(x, y, 240) > 0.7 ? '#2c4529' : rnd(x >> 1, y >> 1, 241) > 0.6 ? '#4a6e44' : '#3e5e3a');
    p.rect(edge, WB, 3, iy(6) - WB, '#c6c1b6'); p.vl(edge + (x0 === 0 ? 2 : 0), WB, iy(6) - WB, '#8e897e');
    for (let y = WB + 12; y < iy(6); y += 16) p.hl(edge, y, 3, '#9e998e');
  };
  sideBed(0, 13); sideBed(240, 240);
  // 앞마당의 작은 흔적: 담배꽁초 두엇 (재떨이 곁)
  p.set(210, iy(4) + 15, '#e8e2d0'); p.set(211, iy(4) + 15, '#c8a070'); p.set(196, iy(5) + 3, '#e8e2d0');

  const props: Prop[] = [];
  // ── 화환: 밤에는 여섯, 사람이 다 빠진 밤(few)에는 문 양옆 둘 ──
  const fy = WB + 14; // 그림 y, 맵으로는 30
  const spots: [number, number][] = s.mood === 'few' ? [[86, 0], [170, 1]] : [[42, 1], [63, 0], [85, 0], [171, 0], [192, 1], [213, 0]];
  spots.forEach(([cx, kind], i) => {
    p.ell(cx, fy - 1, 8, 1.6, '#2e2c28', 0.3);
    const L = new Pix(W, H);
    wreath(L, cx, fy, 300 + i * 17, kind);
    props.push(cut(L, top, fy - top));
  });
  // ── 재떨이 기둥 (12,4 오른쪽 끝): 스테인리스 원통 ──
  {
    const L = new Pix(W, H), cx = 203, by = iy(4) + 12;
    L.ell(cx, by, 4, 1.5, '#2a2a28', 0.35);
    for (let y = by - 18; y <= by; y++) for (let x = cx - 3; x <= cx + 3; x++) {
      const u = x - cx;
      L.set(x, y, u === -2 ? '#e4e8ea' : u === -3 ? '#9aa0a4' : u === 3 ? '#5e6468' : u === 2 ? '#7c8286' : u === -1 ? '#c4c9cc' : '#a6acb0');
    }
    L.rect(cx - 3, by - 20, 7, 2, '#5a5f63'); L.hl(cx - 2, by - 20, 5, '#3a3d40'); L.hl(cx - 3, by - 21, 7, '#b8bdc0'); L.set(cx, by - 20, '#d8d2c0'); // 위 뚜껑과 모래
    L.hl(cx - 3, by - 12, 7, '#6a7074'); L.hl(cx - 3, by - 1, 7, '#55595c');
    props.push(cut(L, top, by - top));
  }
  // ── 앞 화단 (6줄): 회양목 생울타리와 경계석. 7~8열은 나가는 길. ──
  {
    const L = new Pix(W, H), y0 = iy(6) - 9;
    const bed = (x0: number, x1: number): void => {
      for (let x = x0; x < x1; x++) {
        const h = Math.round(2 + 1.5 * Math.sin(x * 0.45) + rnd(x, 1, 250) * 2);
        for (let y = y0 - h; y < y0 + 14; y++) {
          const n = rnd(x, y, 251);
          L.set(x, y, y < y0 - h + 1 ? '#6a8e58' : y < y0 - h + 3 ? (n > 0.5 ? '#557a48' : '#4a6e44') : n > 0.78 ? '#2a4428' : n > 0.4 ? '#3a5a38' : '#34523a');
        }
      }
      L.rect(x0, y0 + 14, x1 - x0, 2, '#d0cbc0'); L.rect(x0, y0 + 16, x1 - x0, H - y0 - 16, '#a19c91');
      for (let x = x0 + 20; x < x1; x += 24) L.vl(x, y0 + 16, H - y0 - 16, '#7f7a70');
      if (x0 > 0) { L.vl(x0, y0 - 2, H - y0 + 2, '#d0cbc0'); L.vl(x0 + 1, y0 - 2, H - y0 + 2, '#a19c91'); }
      if (x1 < W) { L.vl(x1 - 1, y0 - 2, H - y0 + 2, '#7f7a70'); L.vl(x1 - 2, y0 - 2, H - y0 + 2, '#a19c91'); }
    };
    bed(0, 112); bed(144, W);
    props.push(cut(L, top, 6 * T));
  }
  return { base: p, props };
}

// ═══════════════════ 응급실 천장 ═══════════════════
// 침대에 누워 올려다본 천장. 바닥이 아니라 천장 그 자체가 맵이다 (top 0).
// 석고 천장 타일, 흰 확산판 형광등, 스프링클러, 환기구. 침대를 두른 커튼 레일이 U자로 지나가고,
// 연두색 커튼이 가장자리 쪽으로 늘어진다 (누워서 보면 커튼 아래로 갈수록 바깥으로 벌어진다). 아래 끝 커튼 밑 틈으로 밖의 빛.
export function er(_s: PlaceState): Place {
  const m = MAPS.er, W = m.grid[0].length * T, H = m.grid.length * T;
  const p = new Pix(W, H);
  const LX = 96, LY = 24; // 형광등 가운데
  // ── 천장 타일: 32px 판, 흰 T바, 작은 구멍 무늬 ──
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = (x - 16 + 64) % 32, gy = (y - 8 + 64) % 32;
    const ti = Math.floor((x - 16 + 64) / 32), tj = Math.floor((y - 8 + 64) / 32);
    let col = rnd(ti, tj, 401) > 0.7 ? '#e5e8e7' : '#e9ecea';
    const n = rnd(x, y, 402);
    if (n > 0.91) col = '#c9cfd0';
    else if (n > 0.885) col = '#d6dbdb';
    if (rnd(x >> 1, y, 403) > 0.985) col = '#bcc3c5'; // 벌레 먹은 듯한 홈
    if (gx === 1 || gy === 1) col = '#f3f5f4';
    if (gx === 30 || gy === 30) col = '#d8dcdc';
    if (gx === 0 || gy === 0) col = '#f7f8f8';
    if (gx === 31 || gy === 31) col = '#c3c9cb';
    const d = Math.hypot(x - LX, y - LY);
    p.set(x, y, mix(col, '#aeb8be', Math.min(0.3, d / 380)));
  }
  // 위 끝: 머리맡 벽이 살짝 보인다
  for (let y = 0; y < 4; y++) p.hl(0, y, W, mix('#e1e5df', '#d2d7d2', y / 3));
  p.hl(0, 4, W, '#b8bfbd'); p.hl(0, 5, W, '#f4f6f4');
  // 얼룩: 오래된 물 자국 하나
  for (let y = 12; y < 34; y++) for (let x = 50; x < 76; x++) {
    const d = Math.hypot((x - 62) / 1.2, y - 22) + (rnd(x >> 1, y >> 1, 404) - 0.5) * 2;
    if (Math.abs(d - 7) < 0.7) p.set(x, y, '#cfc6b0', 0.55); else if (d < 7) p.set(x, y, '#ddd6c4', 0.25);
  }
  // ── 형광등: 흰 확산판 (5~6열, 1줄) ──
  {
    const x0 = 80, y0 = 8, w = 32, h = 32;
    p.rect(x0, y0, w, h, '#b9c0c3'); p.rect(x0 + 1, y0 + 1, w - 2, h - 2, '#dde2e4');
    for (let y = y0 + 3; y < y0 + h - 3; y++) for (let x = x0 + 3; x < x0 + w - 3; x++) {
      const e = Math.min(x - x0 - 3, x0 + w - 4 - x, y - y0 - 3, y0 + h - 4 - y);
      p.set(x, y, e === 0 ? '#eef3f5' : e === 1 ? '#f7fafb' : (x + y) % 4 === 0 ? '#fbfdfd' : '#ffffff');
    }
    p.hl(x0 + 2, y0 + 2, w - 4, '#c9d0d3'); p.vl(x0 + 2, y0 + 2, h - 4, '#c9d0d3');
    p.hl(x0 + 2, y0 + h - 3, w - 4, '#eef2f3'); p.vl(x0 + w - 3, y0 + 2, h - 4, '#eef2f3');
  }
  // ── 스프링클러 헤드 ──
  {
    const cx = 64, cy = 56;
    p.ell(cx, cy, 3.4, 3.4, '#a3aaad'); p.ell(cx, cy, 2.6, 2.6, '#dfe3e3'); p.ell(cx, cy, 1.3, 1.3, '#8d969a');
    p.set(cx - 2, cy - 2, '#f6f8f8'); p.set(cx, cy, '#c84034'); p.set(cx + 2, cy + 2, '#9aa2a5');
  }
  // ── 환기구: 네 방향 사각 디퓨저 ──
  {
    const x0 = 115, y0 = 43, s = 26;
    for (let k = 0; k < 13; k++) {
      const col = k === 0 ? '#c3c9cb' : k === 1 ? '#f2f4f4' : k >= 10 ? '#e4e7e7' : k % 2 === 0 ? '#8f989c' : '#eef1f1';
      const a = x0 + k, b = y0 + k, ss = s - 2 * k;
      if (ss <= 0) break;
      p.hl(a, b, ss, col); p.hl(a, b + ss - 1, ss, k % 2 === 0 && k < 10 ? '#7f888c' : col);
      p.vl(a, b, ss, col); p.vl(a + ss - 1, b, ss, k % 2 === 0 && k < 10 ? '#7f888c' : col);
    }
    p.rect(x0 + 10, y0 + 10, 6, 6, '#e6e9e9'); p.hl(x0 + 10, y0 + 10, 6, '#f6f8f8');
    for (let i = 0; i < s + 4; i++) for (const [x, y] of [[x0 - 2 + i, y0 - 2], [x0 - 2 + i, y0 + s + 1], [x0 - 2, y0 - 2 + i], [x0 + s + 1, y0 - 2 + i]] as const)
      if (rnd(x, y, 405) > 0.45) p.set(x, y, '#aab2b5', 0.3); // 바람 자국 먼지
  }
  // ── 커튼: 레일에서 바깥으로. 위는 그물 띠, 아래는 연두 천의 주름, 밑자락 너머로 밖의 빛. ──
  const CX = 96, CY = 52, XL = 18, XR = 173, YB = 98, HEM = 1.38;
  const CL = '#d0e6b6', CM = '#bad89c', CD = '#a2c585', CDD = '#88ac6e', P = 9.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x >= XL && x <= XR && y <= YB) continue;
    const dx = x + 0.5 - CX, dy = y + 0.5 - CY;
    let t = 99, side = 0;
    if (dx < 0) { const v = (XL - CX) / dx; if (v < t) { t = v; side = 0; } }
    if (dx > 0) { const v = (XR - CX) / dx; if (v < t) { t = v; side = 1; } }
    if (dy > 0) { const v = (YB - CY) / dy; if (v < t) { t = v; side = 2; } }
    const depth = 1 / t, u = side === 2 ? CX + dx * t : CY + dy * t;
    const uu = u + (depth - 1) * 5 * Math.sin(u / 17 + side), ph = uu / P + 0.35 * Math.sin(uu / 23 + side * 2) + 0.18 * Math.sin(uu / 7.3), fr = ph - Math.floor(ph); // 주름 한 폭 안의 자리 (0..1)
    const f = fr < 0.12 ? -1 : fr < 0.3 ? 0.9 : fr < 0.7 ? 0.2 : -0.4; // 접힌 골, 빛 받는 마루, 넓은 면, 그늘
    const hem = HEM + (fr < 0.3 ? 0.01 : 0);
    if (depth < 1.1) { // 그물 띠: 성긴 그물 너머로 천장이 비친다
      const mesh = Math.round(u) % 2 === 0 || Math.round(depth * 60) % 2 === 0;
      p.set(x, y, mesh ? '#eef4e8' : '#d6e0d2', mesh ? 0.75 : 0.3);
      if (fr < 0.12) p.set(x, y, '#c4d2c0', 0.4);
    } else if (depth < 1.125) p.set(x, y, '#9fbf86');
    else if (depth < hem - 0.03) {
      const k = 1.2 - f * 1.1 + (depth - 1.12) * 2.6;
      p.set(x, y, k < 0.5 ? CL : k < 1.45 ? CM : k < 2.2 ? CD : CDD);
    } else if (depth < hem) p.set(x, y, depth < hem - 0.015 ? '#6b8d57' : '#88a96e'); // 밑단 박음질
    else { // 커튼 밑 틈: 밖의 빛과 바닥
      const yy = y - (CY + (YB - CY) * hem);
      p.set(x, y, yy < 1 ? '#b4bfc2' : yy < 2 ? '#f2f6f4' : yy < 7 ? mix('#dfe7e8', '#d4dde0', (yy - 2) / 5) : mix('#ccd6d9', '#bfcacf', Math.min(1, (yy - 7) / 5)));
    }
  }
  // 바닥 띠에 걸레받이 그림자 한 줄 (발이 설 자리)
  for (let x = 0; x < W; x++) p.set(x, 122, '#b9c4c8', 0.6);
  // 레일: 알루미늄 U자. 바깥쪽에 커튼 고리.
  const RL = '#eef1f2', RD = '#9fa8ad', HK = '#7d878c';
  p.rect(XL - 2, 0, 2, YB - 1, RL); p.vl(XL - 2, 0, YB - 1, RD);
  p.rect(XR + 1, 0, 2, YB - 1, RL); p.vl(XR + 2, 0, YB - 1, RD);
  p.rect(XL + 1, YB + 1, XR - XL - 1, 2, RL); p.hl(XL + 1, YB + 2, XR - XL - 1, RD);
  p.dots(`${XL - 1},${YB - 1} ${XL},${YB} ${XL - 1},${YB} ${XL},${YB + 1} ${XR + 1},${YB - 1} ${XR},${YB} ${XR + 1},${YB} ${XR},${YB + 1}`, RL);
  p.dots(`${XL - 2},${YB - 1} ${XL - 1},${YB + 1} ${XL},${YB + 2} ${XR + 2},${YB - 1} ${XR + 1},${YB + 1} ${XR},${YB + 2}`, RD);
  for (let y = 4; y < YB - 2; y += 7) { p.set(XL - 3, y, HK); p.set(XR + 3, y, HK); }
  for (let x = XL + 4; x < XR - 1; x += 7) p.set(x, YB + 3, HK);
  return { base: p, props: [] };
}

// ═══════════════════ 커튼 밑 틈으로 보이는 발 ═══════════════════
// 앞(침대 쪽)을 보고 선 발 한 켤레. 투명 바탕, 발목 위는 없다.
const FEET: Record<'sneakers' | 'shoes' | 'slippers', { rows: string[]; pal: Record<string, string> }> = {
  sneakers: { // 하얀 운동화, 흰 양말 (열일곱 살 여학생)
    rows: ['.kkk....kkk.', 'ilwli..ilwli', 'wwlww..wwlww', 'iwwwi..iwwwi', 'mmmmm..mmmmm', 'ddddd..ddddd'],
    pal: { k: '#ebe6da', l: '#aab0b8', w: '#fbfbf8', i: '#c6ccd2', m: '#e9e6de', d: '#8d939a' },
  },
  shoes: { // 검은 구두, 짙은 바짓단
    rows: ['ttttt..ttttt', 'TtttT..TtttT', 'obbbo..obbbo', 'bbhbb..bbhbb', 'bbbbb..bbbbb', 'sssss..sssss'],
    pal: { t: '#34363e', T: '#24262c', o: '#121216', b: '#24242a', h: '#7a7e88', s: '#4a4038' },
  },
  slippers: { // 병원 슬리퍼, 회색 양말
    rows: ['.ggg....ggg.', '.GgG....GgG.', 'BBBBB..BBBBB', 'bBBBb..bBBBb', 'GgggG..GgggG', 'sssss..sssss'],
    pal: { g: '#a4a8ae', G: '#8c9096', B: '#7894bc', b: '#5a74a0', s: '#c0c7ce' },
  },
};
export function feetPix(kind: 'sneakers' | 'shoes' | 'slippers'): Pix {
  const f = FEET[kind];
  return sprite(f.rows, f.pal);
}
