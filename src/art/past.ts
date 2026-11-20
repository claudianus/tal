// 4장의 지나간 자리들과 엔딩 C의 장례식장. 한 장짜리 도트 배경 (240×150).
// 규칙(기획서 11장): 사람에게는 이목구비가 없다. 할머니도, 입구의 아버지도.
// 할머니 집만 색이 있다. 이 게임에서 유일하게 채도가 있는 장면이다.
import { Pix, mix, rnd } from './pix.ts';

export const PAST_W = 240, PAST_H = 150;
const cache = new Map<string, Pix>();
function once(key: string, f: () => Pix): Pix {
  let p = cache.get(key);
  if (!p) { p = f(); cache.set(key, p); }
  return p;
}

// 삼색 고양이 나비. 웅크려 잔다. (x,y) 는 몸의 가운데, k 는 크기.
function nabi(p: Pix, x: number, y: number, k = 1): void {
  const W0 = '#f4f1ea', W1 = '#dcd6ca', OR = '#e2832e', OR_D = '#b9621c', BK = '#2a2420', BK_L = '#3e3530';
  p.ell(x, y, 9 * k, 4.6 * k, W1);
  p.ell(x, y - 0.6 * k, 8.4 * k, 4 * k, W0);
  p.ell(x - 3.5 * k, y - 1.5 * k, 3.6 * k, 2.6 * k, OR); p.ell(x - 4 * k, y - 0.8 * k, 2.4 * k, 1.4 * k, OR_D);
  p.ell(x + 2.5 * k, y - 2 * k, 2.6 * k, 2 * k, BK); p.set(Math.round(x + 2 * k), Math.round(y - 3 * k), BK_L);
  // 머리: 앞발 위에 묻었다. 귀 둘.
  const hx = x + 7 * k, hy = y - 1.2 * k;
  p.ell(hx, hy, 3.4 * k, 2.8 * k, W0); p.ell(hx + 0.8 * k, hy - 1.2 * k, 2 * k, 1.6 * k, OR);
  p.dots(`${Math.round(hx - 1.5 * k)},${Math.round(hy - 3 * k)} ${Math.round(hx + 1.6 * k)},${Math.round(hy - 3.2 * k)}`, BK);
  p.hl(Math.round(hx - 1), Math.round(hy + 0.4 * k), 2, '#8a7a70'); // 감은 눈
  // 꼬리: 몸을 한 바퀴 감았다
  for (let a = 0; a < 2.4; a += 0.08) p.set(Math.round(x - 6 * k + Math.cos(a + 1.6) * 7 * k), Math.round(y + 2.6 * k + Math.sin(a + 1.6) * 1.6 * k), a < 1.2 ? BK : OR);
}

// 얼굴 없는 할머니. 앉아 있다. (x, y) 는 엉덩이. 흰 머리를 쪽 졌다. 꽃무늬 몸빼.
function grandma(p: Pix, x: number, y: number, lap = false): void {
  const BL = '#9c86b4', BL_D = '#7a6694', BL_L = '#b8a6cc', PA = '#4a5a8a', PA_D = '#36426a', SK = '#d9ae8c', SK_D = '#b88c6e', HA = '#ecebe6', HA_D = '#bdbbb4';
  // 다리: 마루 끝에 걸터앉아 아래로
  p.rect(x - 7, y - 2, 14, 6, PA); p.hl(x - 7, y + 3, 14, PA_D);
  p.rect(x - 6, y + 4, 5, 12, PA); p.rect(x + 1, y + 4, 5, 12, PA_D);
  for (let i = 0; i < 16; i++) { // 몸빼의 잔꽃: 다리 안에만
    const leg = i & 1, lx = x + (leg ? 1 : -6) + Math.floor(rnd(i, 1, 3) * 5), ly = y + Math.floor(rnd(i, 2, 3) * 15);
    p.set(lx, ly, i % 3 ? '#d86a8a' : '#e8d070');
  }
  p.rect(x - 6, y + 16, 5, 2, '#2c2c34'); p.rect(x + 1, y + 16, 5, 2, '#2c2c34'); // 고무신
  p.hl(x - 6, y + 16, 5, '#5a5a66'); p.hl(x + 1, y + 16, 5, '#5a5a66');
  // 몸: 등이 조금 굽었다
  p.ell(x, y - 9, 7.5, 9, BL); p.ell(x - 2, y - 11, 4, 5, BL_L, 0.5); p.vl(x + 6, y - 14, 10, BL_D);
  for (let i = 0; i < 10; i++) p.set(x - 6 + Math.floor(rnd(i, 3, 4) * 12), y - 16 + Math.floor(rnd(i, 4, 4) * 14), '#efe6f4', 0.8);
  // 팔과 손: 무릎 위에 모았다
  p.rect(x - 9, y - 10, 3, 9, BL_D); p.rect(x + 6, y - 10, 3, 9, BL_D);
  p.ell(x - 4, y - 2, 2.2, 1.6, SK); p.ell(x + 4, y - 2, 2.2, 1.6, SK);
  // 목과 머리. 얼굴은 그리지 않는다.
  p.rect(x - 2, y - 20, 4, 3, SK_D);
  p.ell(x, y - 25, 5.2, 5.6, SK); p.ell(x + 2, y - 23, 2.6, 3.6, SK_D, 0.5);
  p.ell(x - 0.5, y - 28, 5.6, 3.6, HA); p.ell(x - 4.6, y - 26, 2.4, 2.4, HA); p.ell(x - 6, y - 25, 2.2, 2.1, HA_D); // 뒤로 쪽 진 머리
  p.hl(x - 4, y - 31, 7, '#ffffff', 0.7);
  if (lap) nabi(p, x, y - 5, 0.7);
}

// ── 할머니 집 (열여섯 살, 7월) ──
export function grandmaScene(): Pix {
  return once('grandma', () => {
    const p = new Pix(PAST_W, PAST_H);
    // 하늘: 한여름. 구름이 크다.
    for (let y = 0; y < 80; y++) for (let x = 0; x < PAST_W; x++) p.set(x, y, mix('#4f8fd4', '#b4d6ee', y / 80 + (rnd(x >> 2, y >> 2, 1) - 0.5) * 0.04));
    const cloud = (cx: number, cy: number, s: number): void => {
      for (const [dx, dy, r] of [[0, 0, 10], [10, 2, 8], [-11, 3, 7], [4, -6, 7], [19, 5, 5], [-19, 6, 4]]) p.ell(cx + dx * s, cy + dy * s, r * s, r * 0.72 * s, '#ffffff');
      for (let x = Math.round(cx - 24 * s); x < cx + 26 * s; x++) for (let y = Math.round(cy + 2 * s); y < cy + 10 * s; y++) if (p.alpha(x, y) && rnd(x, y, 2) > 0.4) p.set(x, y, '#d8e6f0', 0.7);
    };
    cloud(48, 20, 1); cloud(178, 12, 0.8); cloud(118, 38, 0.5);
    // 먼 산 두 겹
    for (let x = 0; x < PAST_W; x++) {
      const a = 58 + Math.round(Math.sin(x * 0.03) * 6 + Math.sin(x * 0.081) * 3);
      for (let y = a; y < 90; y++) p.set(x, y, mix('#7aa09a', '#6a9488', (y - a) / 20));
      const b = 70 + Math.round(Math.sin(x * 0.045 + 2) * 5 + Math.sin(x * 0.13) * 2);
      for (let y = b; y < 92; y++) p.set(x, y, rnd(x, y, 5) > 0.85 ? '#3f7040' : '#4c8048');
    }
    // 마당: 다져진 흙
    for (let y = 88; y < PAST_H; y++) for (let x = 0; x < PAST_W; x++) p.set(x, y, mix('#d2bd90', '#bfa67a', rnd(x, y, 6) * 0.6 + (y - 88) / 200));
    // 고추밭 (왼쪽 앞): 이랑마다 지주대, 초록 잎 사이로 빨간 고추
    for (let r = 0; r < 6; r++) {
      const y0 = 96 + r * 9;
      for (let x = 0; x < 92 - r * 4; x++) {
        const top = y0 - 4 - Math.round(rnd(x >> 1, r, 7) * 3);
        for (let y = top; y < y0 + 3; y++) p.set(x, y, rnd(x, y, 8) > 0.7 ? '#2f6a2c' : rnd(x, y, 9) > 0.5 ? '#3f8a38' : '#4fa044');
        if (rnd(x, r, 10) > 0.86) { p.set(x, top + 3, '#d0321e'); p.set(x, top + 4, '#d0321e'); p.set(x, top + 5, '#9a2416'); }
      }
      for (let x = 4; x < 90 - r * 4; x += 12) p.vl(x, y0 - 9, 10, '#8a6a44');
      p.hl(0, y0 + 3, 92 - r * 4, '#a88a5e');
    }
    // 집: 녹슨 슬레이트 지붕, 흰 회벽, 미닫이, 나무 마루
    const HX = 104, HW = 136;
    for (let y = 50; y < 78; y++) {
      const inset = Math.round((78 - y) * 0.55);
      for (let x = HX - 4 + inset; x < HX + HW; x++) {
        const ridge = (x + Math.floor(y / 2)) % 4;
        let col = ridge === 0 ? '#c47a44' : ridge === 1 ? '#a45a2c' : '#b06634';
        if (rnd(x >> 1, y, 11) > 0.9) col = '#7a3a1e';
        if (rnd(x, y >> 2, 12) > 0.94) col = '#8a8478'; // 녹 사이 슬레이트 빛
        p.set(x, y, col);
      }
    }
    p.hl(HX - 4, 78, HW + 4, '#5a2e18'); p.hl(HX - 4, 79, HW + 4, '#3a2014');
    for (let y = 80; y < 108; y++) for (let x = HX; x < HX + HW; x++) p.set(x, y, mix('#ece2ca', '#d8ccb0', (y - 80) / 28 + (rnd(x, y, 13) - 0.5) * 0.1));
    p.rect(HX, 80, HW, 4, '#b8ab90', 0.6); // 처마 그늘
    // 미닫이 셋: 창호지 격자
    for (const dx of [10, 50, 90]) {
      p.rect(HX + dx, 84, 34, 22, '#7a5434'); p.rect(HX + dx + 2, 86, 30, 18, '#f2ecdc');
      for (let gx = HX + dx + 2; gx < HX + dx + 32; gx += 5) p.vl(gx, 86, 18, '#a88a64');
      for (let gy = 86; gy < 104; gy += 6) p.hl(HX + dx + 2, gy, 30, '#a88a64');
      p.vl(HX + dx + 17, 84, 22, '#5a3c24');
    }
    // 마루와 기둥
    for (let y = 106; y < 116; y++) for (let x = HX - 6; x < HX + HW; x++) p.set(x, y, (x - HX) % 9 === 0 ? '#7a5030' : y === 106 ? '#c08a54' : mix('#a8743e', '#946232', (y - 106) / 10));
    p.rect(HX - 6, 116, HW + 6, 6, '#3a2818'); // 마루 밑 어둠
    for (const dx of [-4, 64, 132]) { p.rect(HX + dx, 76, 4, 46, '#6e4a2a'); p.vl(HX + dx, 76, 46, '#8a6038'); }
    p.rect(HX + 40, 122, 16, 5, '#9a9890'); p.hl(HX + 40, 122, 16, '#b8b6ae'); // 댓돌
    p.rect(HX + 44, 120, 3, 2, '#2c2c34'); p.rect(HX + 49, 120, 3, 2, '#2c2c34'); // 벗어 둔 고무신 한 켤레
    // 할머니와 나비: 마루 끝
    grandma(p, HX + 34, 104);
    nabi(p, HX + 74, 103, 1);
    // 수돗가 (오른쪽 앞): 시멘트 받침, 수도꼭지, 빨간 고무 대야
    p.rect(196, 124, 34, 16, '#a8a8a0'); p.hl(196, 124, 34, '#c8c8c0'); p.rect(196, 138, 34, 2, '#7a7a72');
    p.rect(204, 108, 3, 18, '#7a8a9a'); p.rect(204, 107, 8, 3, '#8a9aaa'); p.set(211, 110, '#9fd0f0');
    p.ell(218, 132, 11, 4.5, '#c8382a'); p.ell(218, 131, 9, 3.2, '#6aa8d0'); p.hl(212, 130, 6, '#b8e0f4');
    // 처마 그림자가 마당에 진다
    for (let y = 122; y < 132; y++) for (let x = HX - 6; x < HX + HW; x++) if (rnd(x, y, 14) > (y - 122) / 10) p.set(x, y, '#8a7656', 0.35);
    return p;
  });
}

// 바랜 사진: 평상의 할머니, 무릎 위의 나비. 사진 테두리, 누렇게 뜬 색, 구석의 접힌 자국.
export function grandmaPhoto(): Pix {
  return once('grandmaPhoto', () => {
    const W = 160, H = 96, p = new Pix(W, H);
    p.rect(0, 0, W, H, '#ece6d6');
    const X0 = 6, Y0 = 6, X1 = W - 6, Y1 = H - 14;
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const t = (y - Y0) / (Y1 - Y0);
      p.set(x, y, t < 0.45 ? mix('#9cbcd0', '#c8d4cc', t / 0.45) : mix('#9a9a62', '#8a8452', (t - 0.45) / 0.55));
    }
    // 감나무 그늘과 평상
    p.ell(40, 24, 34, 18, '#5a7a48'); p.ell(30, 18, 18, 10, '#6a8a54');
    p.rect(26, 62, 94, 6, '#9a7448'); p.hl(26, 62, 94, '#b88c58'); p.rect(30, 68, 3, 12, '#6a4a2a'); p.rect(113, 68, 3, 12, '#6a4a2a');
    grandma(p, 72, 64, true);
    // 바랜 기운: 누런 막, 가장자리가 하얗게 날았다
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      const e = Math.min(x - X0, X1 - x, y - Y0, Y1 - y);
      p.set(x, y, '#f0d8a0', 0.22 + (e < 6 ? (6 - e) * 0.05 : 0));
      if (rnd(x, y, 15) > 0.988) p.set(x, y, '#fff6e0', 0.35);
    }
    // 접힌 자국 (지갑에 오래 있었다)
    p.line(X1 - 22, Y0, X1, Y0 + 14, '#fffaf0', 0.7); p.line(X1 - 21, Y0, X1, Y0 + 13, '#b8a888', 0.4);
    p.hl(X0, Math.round((Y0 + Y1) / 2), X1 - X0, '#fffaf0', 0.25);
    p.hl(12, H - 8, 30, '#8a8478', 0.5); // 뒷면에서 배어 나온 볼펜 글씨 자리
    return p;
  });
}

// ── 장례식장 입구 (밤) ── 할머니 때(4장)와 윤재 때(엔딩 C)가 같은 구도다.
export function funeralScene(): Pix {
  return once('funeral', () => {
    const p = new Pix(PAST_W, PAST_H);
    // 병원 별관 외벽: 어두운 타일, 불 꺼진 창
    for (let y = 0; y < 118; y++) for (let x = 0; x < PAST_W; x++) p.set(x, y, mix('#15171b', '#1c1f24', ((x % 12 === 0 || y % 8 === 0) ? 0.6 : 0) + rnd(x, y, 3) * 0.2));
    for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) { if (c === 3 || c === 4) continue; p.rect(8 + c * 30, 6 + r * 20, 16, 10, '#0c0d10'); if (rnd(c, r, 4) > 0.7) p.rect(8 + c * 30, 6 + r * 20, 16, 10, '#3a4048', 0.6); }
    // 간판: 하얀 가로 막대. 글씨는 읽히지 않게 둔다.
    p.rect(84, 34, 72, 10, '#d8dcd8'); p.rect(86, 36, 68, 6, '#eef0ec'); for (let x = 92; x < 150; x += 7) p.rect(x, 37, 4, 4, '#55595e', 0.55);
    // 유리문: 안쪽이 하얗게 밝다
    p.rect(92, 48, 56, 72, '#2a2d32');
    for (let y = 50; y < 120; y++) for (let x = 94; x < 146; x++) p.set(x, y, mix('#f4f6f0', '#d6dad4', (y - 50) / 70));
    p.vl(119, 50, 70, '#8a8e90'); p.vl(120, 50, 70, '#5a5e62');
    p.rect(108, 80, 2, 10, '#8a8e90'); p.rect(130, 80, 2, 10, '#8a8e90'); // 손잡이
    // 안쪽 복도의 안내판 (흰 판에 검은 줄) — 이름이 거기 있다
    p.rect(124, 58, 16, 20, '#ffffff'); for (let y = 61; y < 76; y += 3) p.hl(126, y, 12, '#3a3a3a', 0.7);
    // 바닥: 젖은 보도블록. 문의 빛이 길게 눕는다.
    for (let y = 118; y < PAST_H; y++) for (let x = 0; x < PAST_W; x++) p.set(x, y, ((x + (y >> 2) * 3) % 10 === 0 || y % 6 === 0) ? '#101114' : '#16181b');
    for (let y = 120; y < PAST_H; y++) { const s = (y - 120) * 0.9; for (let x = Math.round(94 - s); x < 146 + s; x++) p.set(x, y, '#e8ece6', 0.14 - (y - 120) * 0.003); }
    // 근조 화환 넷: 흰 국화, 초록 잎 테두리, 흰 리본 두 줄
    const wreath = (cx: number, cy: number): void => {
      p.line(cx, cy + 12, cx - 7, 132, '#2a2d2a'); p.line(cx, cy + 12, cx + 7, 132, '#2a2d2a'); p.vl(cx, cy + 12, 20, '#2a2d2a');
      p.ell(cx, cy, 15, 15, '#3a5a3a'); p.ell(cx, cy, 13, 13, '#e6e6e0');
      for (let i = 0; i < 70; i++) { const a = rnd(i, cx, 5) * 6.28, r = rnd(i, cx, 6) * 12; p.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), i % 3 ? '#ffffff' : '#c8c8c0'); }
      p.ell(cx, cy, 3, 3, '#d8d0a0');
      for (const dx of [-5, 4]) { p.rect(cx + dx, cy + 8, 2, 30, '#f2f2ee'); for (let y = cy + 12; y < cy + 36; y += 4) p.set(cx + dx, y, '#8a8a86'); }
    };
    wreath(40, 84); wreath(68, 88); wreath(172, 88); wreath(200, 84);
    // 입구에 선 사람. 검은 양복. 문의 빛을 등지고 있어서 실루엣뿐이다.
    const fx = 120, fy = 119;
    p.rect(fx - 6, fy - 26, 12, 26, '#050506'); p.rect(fx - 8, fy - 36, 16, 14, '#050506'); p.ell(fx, fy - 41, 4.4, 5, '#050506');
    p.rect(fx - 9, fy - 34, 3, 16, '#050506'); p.rect(fx + 6, fy - 34, 3, 16, '#050506');
    p.vl(fx - 1, fy - 18, 18, '#18191c'); // 다리 사이로 빛이 아주 조금
    // 바깥 가로등 하나, 아주 멀리
    for (let y = 0; y < 60; y++) for (let x = 0; x < 50; x++) { const d = Math.hypot(x - 14, y - 10) / 30; if (d < 1) p.set(x, y, '#9aa4a8', (1 - d) * 0.15); }
    return p;
  });
}

// ── 응급실 천장 (누워서 본다) ──
export function erScene(): Pix {
  return once('er', () => {
    const p = new Pix(PAST_W, PAST_H);
    // 흡음 천장 타일: 30px 칸, 바늘구멍 무늬
    for (let y = 0; y < PAST_H; y++) for (let x = 0; x < PAST_W; x++) {
      const gx = (x + 7) % 30, gy = (y + 4) % 30;
      let col = mix('#e2e4de', '#d2d6d0', rnd(x >> 3, y >> 3, 2) * 0.5);
      if (gx === 0 || gy === 0) col = '#b4b8b2';
      else if (gx === 1 || gy === 1) col = '#f0f2ee';
      else if (rnd(x, y, 3) > 0.9) col = '#c2c6c0';
      p.set(x, y, col);
    }
    // 형광등 두 개. 깜빡이지 않는다.
    for (const x0 of [23, 143]) {
      p.rect(x0, 26, 60, 18, '#c8ccc8'); p.rect(x0 + 2, 28, 56, 14, '#fbfdfa');
      for (let x = x0 + 4; x < x0 + 56; x += 4) p.vl(x, 28, 14, '#e8ece8');
      for (let y = 0; y < 80; y++) for (let x = x0 - 30; x < x0 + 90; x++) { const d = Math.hypot((x - x0 - 30) / 70, (y - 35) / 36); if (d < 1 && !(x >= x0 && x < x0 + 60 && y >= 26 && y < 44)) p.set(x, y, '#ffffff', (1 - d) * 0.35); }
    }
    // 스프링클러, 연기 감지기
    p.ell(120, 70, 3, 3, '#c0c4be'); p.set(120, 70, '#8a8e88');
    p.ell(186, 76, 5, 5, '#f4f6f2'); p.ell(186, 76, 2, 2, '#c8ccc6'); p.set(188, 74, '#d04040');
    // 커튼 레일: 눈 아래쪽 가장자리로 돈다. 연두색 커튼이 몰려 있다.
    p.hl(0, 104, PAST_W, '#8e9692'); p.hl(0, 105, PAST_W, '#6a726e');
    for (let y = 106; y < PAST_H; y++) for (let x = 0; x < PAST_W; x++) {
      const side = x < 70 || x > 176; // 가운데는 걷혀 있다
      if (!side && y < 132) continue;
      const fold = Math.sin(x * 0.55) * 0.5 + 0.5;
      p.set(x, y, mix('#a6cc9e', '#6f9a70', fold * 0.7 + (y - 106) / 160));
    }
    for (let x = 2; x < PAST_W; x += 6) if (x < 70 || x > 176) p.set(x, 106, '#5a625e'); // 고리
    // 차가운 빛, 가장자리는 어둡다
    for (let y = 0; y < PAST_H; y++) for (let x = 0; x < PAST_W; x++) { const d = Math.hypot((x - 120) / 150, (y - 70) / 100); if (d > 0.7) p.set(x, y, '#6a7472', (d - 0.7) * 0.6); }
    return p;
  });
}
