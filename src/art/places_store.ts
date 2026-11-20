// 2장의 밝은 곳 둘: 단지 상가 24시 편의점(새벽 세 시)과 홍대 골목 건물 3층 공용 화장실.
// places.ts 와 같은 방식: 벽 띠 → 바닥 → 막힌 칸의 물건 → 앞에 서는 것은 cut() 으로 뗀다.
// 색은 불이 켜진 상태로 칠한다. 둘 다 형광등 아래라 그늘이 얕다.
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';
import { T, text, cut, type Prop, type PlaceState, type Place } from './kit.ts';

const SLAB = '#25262e', SLAB_L = '#383a45';

/** 간판 글씨: 읽히지 않는 한글 모양 (places.ts 의 것과 같은 규칙, 5×5). */
function glyphs(p: Pix, x: number, y: number, n: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 6, r = (j: number): number => rnd(i, j, seed);
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
const shade = (c: string, t: number): string => (t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

// ═══════════════════ 편의점 (새벽 세 시) ═══════════════════
// 위 벽 왼쪽이 음료 냉장고(1~4), 가운데 벽에 시계와 행사 포스터, 9열 칸막이, 그 안쪽 벽이 담배 진열장.
// 진열대 넷(라면, 컵라면, 과자, 초콜릿), 계산대(9~12,3), 아래 벽 가운데가 자동문. 밖은 어두운 밤.
export function store(_s: PlaceState): Place {
  const m = MAPS.store, top = m.top ?? 48, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T, tx = (c: number): number => c * T, WB = ry(1);
  p.rect(0, 0, W, H, '#000000');

  // ── 뒷벽: 흰 벽판, 청록과 노랑의 띠. 천장 가장자리에 매입등. ──
  for (let y = 6; y < WB; y++) for (let x = 16; x < W - 16; x++) {
    let c = '#eceee9';
    if ((x - 16) % 32 === 0) c = '#dcdfda'; else if ((x - 16) % 32 === 1) c = '#f6f7f3';
    if (rnd(x, y, 201) > 0.985) c = '#e2e4df';
    p.set(x, y, c);
  }
  p.rect(16, 0, W - 32, 6, '#d6d9d5'); p.hl(16, 5, W - 32, '#a4aaa6'); p.hl(16, 4, W - 32, '#c2c6c2');
  for (let x = 24; x < W - 24; x += 40) { p.rect(x, 1, 24, 3, '#ffffff'); p.hl(x, 3, 24, '#e8f2f6'); } // 천장 매입등
  p.rect(16, 24, W - 32, 3, '#2a9a8c'); p.hl(16, 24, W - 32, '#4cbcac'); p.hl(16, 27, W - 32, '#f2c232'); // 띠
  p.rect(16, WB - 5, W - 32, 5, '#a9b0ae'); p.hl(16, WB - 5, W - 32, '#c8cecc'); p.hl(16, WB - 1, W - 32, '#7d8583'); // 걸레받이

  // ── 바닥: 밝은 회백색 타일 (8px), 형광등이 길게 비친다 ──
  const F0 = WB, F1 = ry(6);
  for (let y = F0; y < F1 + 2; y++) for (let x = 16; x < W - 16; x++) {
    const tX = x >> 3, tY = (y - F0) >> 3, n = rnd(tX, tY, 202);
    let c = n > 0.8 ? '#dcdfdb' : n < 0.15 ? '#e6e8e4' : '#e1e4e0';
    if ((x & 7) === 0 || ((y - F0) & 7) === 0) c = '#c6cbc8';
    else if ((x & 7) === 1 || ((y - F0) & 7) === 1) c = mix(c, '#ffffff', 0.35);
    if (rnd(x, y, 203) > 0.992) c = '#cfd3d0';
    p.set(x, y, c);
  }
  // 형광등 반사: 매끈한 타일에 흐릿하게 긴 빛
  for (const [cx, cy, w] of [[60, ry(4) + 4, 34], [124, ry(4) - 2, 30], [184, ry(5) + 6, 22], [124, ry(2) + 6, 26]] as const) {
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - w; x <= cx + w; x++) {
      const d = Math.abs(x - cx) / w + Math.abs(y - cy) / 3;
      if (d < 1 && ((x + y) & 1) === 0) p.set(x, y, '#ffffff', 0.55 * (1 - d));
    }
  }
  // 냉장고 불빛이 바닥에 푸르게 번진다
  for (let y = ry(2); y < ry(2) + 12; y++) for (let x = 17; x < tx(5) - 1; x++) if (((x + y) & 1) === 0) p.set(x, y, '#cfe8f4', 0.5 * (1 - (y - ry(2)) / 12));
  // 벽 아래 그늘
  const band = (x: number, y: number, w: number): void => { p.hl(x, y, w, '#5a6064', 0.3); p.dither(x, y + 1, w, 1, '#5a6064', 0, 0.2); };
  band(tx(5), WB, tx(4)); band(tx(10), WB, tx(3)); band(16, ry(2), tx(4));

  // ── 음료 냉장고 (1~4,1): 앞면이 한 칸 앞으로 나와 있다. 위에는 재고 상자. ──
  {
    const x0 = 16, x1 = tx(5), fy = ry(2), Y0 = fy - 58; // Y0: 냉장고 위판 높이 (벽 높이와 같다)
    // 위판: 회색 철판, 위에 쌓아 둔 상자
    p.rect(x0, 6, x1 - x0, Y0 - 6, '#b4b9ba'); p.hl(x0, Y0 - 1, x1 - x0, '#8e9496');
    for (let y = 6; y < Y0 - 1; y++) for (let x = x0; x < x1; x++) if (rnd(x, y, 204) > 0.9) p.set(x, y, '#a6abac');
    for (const [bx, by, bw, bh, c] of [[x0 + 4, 9, 18, 10, '#c9a66e'], [x0 + 24, 12, 14, 8, '#b8935e'], [x0 + 42, 8, 16, 12, '#c9a66e'], [x0 + 8, 4, 10, 6, '#d4b27a']] as const) {
      p.rect(bx, by, bw, bh, c); p.hl(bx, by, bw, shade(c, 0.25)); p.vl(bx + bw - 1, by, bh, shade(c, -0.2)); p.hl(bx, by + bh - 1, bw, shade(c, -0.3));
      p.hl(bx + 2, by + 3, bw - 4, '#8a6a40', 0.5); p.vl(bx + (bw >> 1), by, 2, '#e8dcc0'); // 테이프와 인쇄
    }
    // 머리 간판: 칸마다 이름 (밝은 청록 판)
    p.rect(x0, Y0, x1 - x0, 11, '#2a9a8c'); p.hl(x0, Y0, x1 - x0, '#5ccab8'); p.hl(x0, Y0 + 10, x1 - x0, '#1c6a62');
    for (let i = 0; i < 4; i++) glyphs(p, x0 + 3 + i * 16, Y0 + 3, 2, '#f4fbf8', 210 + i);
    // 문틀
    const gy0 = Y0 + 12, gy1 = fy - 3;
    p.rect(x0, Y0 + 11, x1 - x0, fy - Y0 - 11, '#33383c');
    p.rect(x0, fy - 3, x1 - x0, 3, '#5b6266'); p.hl(x0, fy - 3, x1 - x0, '#7e868a'); // 아래 받침
    // 문 넷: 안은 환하고 차갑다
    const shelfY = [gy0 + 8, gy0 + 16, gy0 + 24, gy0 + 32, gy1 - 1];
    for (let d = 0; d < 4; d++) {
      const gx0 = x0 + d * 16 + 2, gx1 = d === 3 ? x1 - 2 : x0 + d * 16 + 15; // 유리 [gx0, gx1)
      for (let y = gy0; y < gy1; y++) for (let x = gx0; x < gx1; x++) p.set(x, y, mix('#f4fbfd', '#cfe3ea', (y - gy0) / (gy1 - gy0)));
      p.vl(gx0, gy0, gy1 - gy0, '#ffffff'); p.vl(gx1 - 1, gy0, gy1 - gy0, '#ffffff'); // 문틀 안쪽 LED 띠
      // 선반: 철망, 앞에 가격표 줄
      for (const sy of shelfY) { p.hl(gx0 + 1, sy, gx1 - gx0 - 2, '#8fa0a6'); p.hl(gx0 + 1, sy + 1, gx1 - gx0 - 2, '#b8c6ca'); for (let x = gx0 + 2; x < gx1 - 1; x += 5) p.set(x, sy + 1, '#f2e05a'); }
      // 칸마다 물건
      for (let s = 0; s < shelfY.length; s++) {
        const by = shelfY[s] - 1; // 물건이 놓이는 줄 (바닥)
        let x = gx0 + 1;
        const end = gx1 - 1;
        if (d === 1 && s < 2) { // 바나나우유: 노란 단지가 줄지어 섰다
          while (x + 4 <= end) {
            p.rect(x + 1, by - 6, 2, 1, '#f0ece0');                      // 뚜껑
            p.rect(x + 1, by - 5, 2, 1, '#f2cf44');                      // 목
            p.rect(x, by - 4, 4, 3, '#f6d54c');                          // 둥근 몸통
            p.vl(x, by - 4, 3, '#fde98e'); p.vl(x + 3, by - 4, 3, '#d9a62a');
            p.rect(x + 1, by - 1, 2, 1, '#d9a62a');                      // 바닥
            p.set(x + 1, by - 3, '#ffffff', 0.7);                        // 반짝
            x += 5;
          }
          continue;
        }
        while (x < end - 1) {
          const k = rnd(d * 31 + s, x, 220);
          if (d === 0) { // 페트병: 생수, 이온음료, 차
            const c = k < 0.4 ? '#cfe9f6' : k < 0.75 ? '#5aa0e0' : '#c88a3a', cap = k < 0.4 ? '#2a6ac0' : k < 0.75 ? '#f2f6f8' : '#2a8a4a';
            p.set(x + 1, by - 7, cap); p.rect(x, by - 6, 3, 6, c); p.hl(x, by - 4, 3, k < 0.4 ? '#4a8ad0' : '#f2f2f2'); p.vl(x, by - 6, 6, '#ffffff', 0.5);
            x += 4;
          } else if (d === 1) { // 딸기우유, 흰 우유, 커피우유 (팩)
            const c = k < 0.35 ? '#f2a0b4' : k < 0.7 ? '#f4f4f0' : '#a8764a';
            p.rect(x, by - 5, 4, 5, c); p.hl(x, by - 6, 4, shade(c, -0.15)); p.set(x + 1, by - 7, shade(c, -0.15)); p.vl(x + 3, by - 5, 5, shade(c, -0.2)); p.hl(x, by - 3, 4, k < 0.7 ? '#4a8ad0' : '#f2e2c8');
            x += 5;
          } else if (d === 2) { // 캔: 콜라, 사이다, 커피, 에너지 음료
            const c = k < 0.3 ? '#d8302a' : k < 0.55 ? '#3aa04a' : k < 0.8 ? '#6a4630' : '#2a3a8a';
            p.rect(x, by - 5, 3, 5, c); p.hl(x, by - 5, 3, '#c8ccd0'); p.vl(x, by - 4, 4, shade(c, 0.35)); p.set(x + 1, by - 2, '#f2f2f2', 0.8);
            x += 4;
          } else { // 맥주 캔과 초록 병
            if (k < 0.45) { p.rect(x, by - 7, 3, 7, '#3e8a4c'); p.rect(x + 1, by - 9, 1, 2, '#3e8a4c'); p.vl(x, by - 6, 5, '#7ec08a'); p.hl(x, by - 4, 3, '#e8f0e8'); x += 4; }
            else { const c = k < 0.75 ? '#d8b04a' : '#c8ccd2'; p.rect(x, by - 5, 3, 5, c); p.hl(x, by - 5, 3, '#9aa0a4'); p.vl(x, by - 4, 4, shade(c, 0.35)); p.hl(x, by - 3, 3, '#2a4a9a'); x += 4; }
          }
        }
      }
      // 유리 반사, 아래쪽 성에
      for (let y = gy0; y < gy1; y++) { const xx = gx0 + 3 + Math.floor((gy1 - y) * 0.35); if (xx < gx1 - 1) { p.set(xx, y, '#ffffff', 0.35); p.set(xx + 1, y, '#ffffff', 0.18); } }
      p.dither(gx0 + 1, gy1 - 4, gx1 - gx0 - 2, 3, '#ffffff', d, 0.35);
      // 손잡이: 문마다 바깥쪽
      const hx = d % 2 === 0 ? gx1 - 3 : gx0 + 2;
      p.vl(hx, gy0 + 14, 12, '#d4dade'); p.vl(hx + 1, gy0 + 14, 12, '#7e868a'); p.set(hx, gy0 + 14, '#ffffff');
    }
    for (let d = 0; d <= 4; d++) { const mx = d === 4 ? x1 - 2 : x0 + d * 16; p.vl(mx, gy0, gy1 - gy0, '#22262a'); p.vl(mx + 1, gy0, gy1 - gy0, '#4a5156'); }
    // 앞으로 나온 모서리가 벽에 지는 그늘
    p.vl(x1, 6, WB - 6, '#c4c8c4'); p.vl(x1 + 1, 6, WB - 6, '#d4d8d4');
  }

  // ── 가운데 벽 (5~8): 시계, 행사 포스터, CCTV ──
  {
    const cx = tx(6) + 6;
    p.rect(cx, 10, 24, 10, '#1a1c1e'); p.hl(cx, 10, 24, '#3a3e42'); p.rect(cx + 1, 11, 22, 8, '#0e0f10');
    text(p, cx + 2, 12, '03', '#ff4a36'); p.set(cx + 11, 13, '#ff4a36'); p.set(cx + 11, 15, '#ff4a36'); text(p, cx + 13, 12, '07', '#ff4a36');
    // 1+1 포스터 (노랑)
    const px0 = tx(5) + 4;
    p.rect(px0, 31, 16, 22, '#f6d23a'); p.hl(px0, 31, 16, '#fde78a'); p.rect(px0, 47, 16, 6, '#d8302a');
    text(p, px0 + 2, 34, '1', '#d8302a'); p.rect(px0 + 6, 36, 3, 1, '#d8302a'); p.rect(px0 + 7, 35, 1, 3, '#d8302a'); text(p, px0 + 10, 34, '1', '#d8302a');
    p.rect(px0 + 4, 41, 3, 5, '#e8f2f8'); p.rect(px0 + 9, 41, 3, 5, '#5aa0e0'); p.set(px0 + 5, 40, '#2a6ac0'); p.set(px0 + 10, 40, '#f2f6f8');
    glyphs(p, px0 + 2, 48, 2, '#ffffff', 230);
    // 컵라면 행사 포스터
    const qx = tx(7) + 6;
    p.rect(qx, 32, 20, 20, '#f2efe6'); p.rect(qx, 32, 20, 5, '#e2601e'); glyphs(p, qx + 2, 32, 3, '#ffffff', 231);
    p.ell(qx + 10, 44, 6, 3, '#f4f2ea'); p.rect(qx + 4, 44, 13, 5, '#d8302a'); p.ell(qx + 10, 49, 6, 1.5, '#a82420'); p.hl(qx + 5, 43, 11, '#f6e2a8'); // 컵
    p.dots(`${qx + 8},41 ${qx + 11},40 ${qx + 13},41`, '#c8c8c8'); // 김
    p.set(qx, 32, '#c8b878'); p.set(qx + 19, 32, '#c8b878');
    // CCTV 돔
    p.rect(tx(8) + 6, 6, 6, 1, '#c8ccc8'); p.ell(tx(8) + 8.5, 8, 3, 2, '#2a2e32'); p.set(tx(8) + 7, 7, '#5a6268'); p.set(tx(8) + 9, 9, '#ff3a2a');
  }

  // ── 칸막이 (9열): 천장까지 오른 벽 ──
  p.rect(tx(9) + 5, 0, 6, ry(3) - 4, SLAB); p.vl(tx(9) + 10, 0, ry(3) - 4, SLAB_L);

  // ── 계산대 안쪽 벽 (10~12): 담배 진열장. 칸칸이 불이 들어온다. ──
  {
    const x0 = tx(10) + 1, x1 = W - 17, y0 = 8, y1 = WB - 7;
    p.rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, '#1e2124');
    p.rect(x0, y0, x1 - x0, 6, '#c8302a'); p.hl(x0, y0, x1 - x0, '#e85a4a'); glyphs(p, x0 + 15, y0 + 1, 3, '#ffffff', 240, 1); // 머리 간판
    const PK: [string, string][] = [['#f4f4f0', '#d8302a'], ['#f4f4f0', '#2a5ab0'], ['#d4b45a', '#7a5a2a'], ['#2a2a2e', '#c8a040'], ['#c8ccd2', '#3a7ac0'], ['#3a9a6a', '#e8f2ea'], ['#f4f4f0', '#3a9a6a'], ['#6a3a8a', '#e8d8f0'], ['#e8e2d0', '#8a6a3a']];
    for (let r = 0; r < 6; r++) {
      const sy = y0 + 7 + r * 7;
      p.rect(x0, sy, x1 - x0, 6, '#f6f4ea');
      for (let x = x0 + 1, i = 0; x + 3 <= x1; x += 4, i++) {
        const [b, t] = PK[Math.floor(rnd(r, Math.floor(i / 2), 241) * PK.length)];
        p.rect(x, sy + 1, 3, 4, b); p.hl(x, sy + 1, 3, t); p.vl(x + 2, sy + 2, 3, shade(b, -0.15)); p.set(x, sy + 3, shade(b, 0.4));
      }
      p.hl(x0, sy + 5, x1 - x0, '#2a2c30'); for (let x = x0 + 1; x < x1; x += 8) p.rect(x, sy + 5, 5, 1, '#f8f8f8'); // 가격표
    }
    // 아래 서랍장
    p.rect(x0 - 1, y1 + 1, x1 - x0 + 2, WB - y1 - 1, '#b8bec0'); p.hl(x0 - 1, y1 + 1, x1 - x0 + 2, '#d8dcde');
    for (let x = x0 + 1; x < x1 - 4; x += 16) { p.vl(x + 15, y1 + 2, WB - y1 - 3, '#8e9496'); p.hl(x + 5, y1 + 3, 5, '#5e6466'); }
    // 계산대 안쪽 바닥: 검은 고무 매트
    const mx0 = tx(10) + 1, my0 = ry(2) + 1;
    p.rect(mx0, my0, tx(3) - 2, 13, '#3c4044'); p.hl(mx0, my0, tx(3) - 2, '#565b60');
    for (let y = my0 + 2; y < my0 + 12; y += 3) for (let x = mx0 + 1; x < mx0 + tx(3) - 3; x += 3) p.set(x, y, '#2a2d30');
    // 카운터 밑 장바구니 더미
    p.rect(tx(12) + 3, ry(1) + 4, 11, 4, '#d8302a'); p.hl(tx(12) + 3, ry(1) + 4, 11, '#f05a4a'); p.rect(tx(12) + 3, ry(1) + 8, 11, 3, '#b8241e');
    for (let x = tx(12) + 4; x < tx(12) + 13; x += 2) p.set(x, ry(1) + 9, '#7a1814');
  }

  // ── 문 앞 발판 (7~8,5) ──
  {
    const x0 = tx(7) + 1, y0 = ry(5) + 1, w = tx(2) - 2, h = 14;
    p.rect(x0, y0, w, h, '#4a4e52'); p.rect(x0 + 1, y0 + 1, w - 2, h - 2, '#5a5f63');
    for (let y = y0 + 2; y < y0 + h - 2; y += 2) p.hl(x0 + 2, y, w - 4, '#464a4e');
    p.rect(x0 + 2, y0 + 1, w - 4, 1, '#2a9a8c');
  }

  // ── 아래 줄 밖: 밤의 보도. 가게 불빛이 문 앞만 조금 밝힌다. ──
  for (let y = F1 + 5; y < H; y++) for (let x = 0; x < W; x++) {
    const bx = (x + ((y >> 2) & 1) * 4) & 7, by = y & 3;
    let c = bx === 0 || by === 0 ? '#16181d' : '#1f2228';
    const spill = Math.max(0, 1 - Math.abs(x - 128) / 70) * Math.max(0, 1 - (y - F1 - 5) / 12);
    c = mix(c, '#5a5c58', spill * 0.55);
    p.set(x, y, c);
  }

  // ── 옆벽 ──
  p.rect(10, 0, 6, F1 + 5, SLAB); p.vl(15, 0, F1 + 5, SLAB_L);
  p.rect(W - 16, 0, 6, F1 + 5, SLAB); p.vl(W - 16, 0, F1 + 5, SLAB_L);

  const props: Prop[] = [];
  // ── 진열대: 사람 허리보다 조금 높다. 칸 밖으로 넘치지 않게. ──
  const gondola = (L: Pix, c0: number, r: number, kind: 'ramen' | 'cup' | 'chips' | 'choco', seed: number): void => {
    const x0 = tx(c0) + 1, x1 = tx(c0 + 2) - 1, fy = ry(r + 1) - 1, h = 15, fy0 = fy - h, tyo = fy0 - 7; // tyo: 윗면 위, fy0: 앞면 위 (윗칸 통로가 보이게 낮다)
    // 윗면: 등을 맞댄 맨 위 칸. 위에서 본 물건 꼭대기.
    L.rect(x0, tyo, x1 - x0, fy0 - tyo, '#c3c9cb'); L.hl(x0, tyo, x1 - x0, '#dde2e3'); L.hl(x0, fy0 - 1, x1 - x0, '#9aa2a5');
    for (let row = 0; row < 1; row++) for (let x = x0 + 1; x < x1 - 3; x += 5) {
      const k = rnd(x, row, seed), yy = tyo + 2;
      if (kind === 'cup') { L.rect(x, yy, 4, 4, '#f2f0ea'); L.rect(x + 1, yy + 1, 2, 2, k < 0.5 ? '#d8302a' : '#e8902a'); }
      else { const c = kind === 'ramen' ? (k < 0.5 ? '#d8302a' : k < 0.8 ? '#2a2a2e' : '#e8902a') : (k < 0.3 ? '#3a7ad8' : k < 0.6 ? '#f2c232' : k < 0.8 ? '#3aa04a' : '#8a4ac0'); L.rect(x, yy, 4, 4, c); L.hl(x, yy, 4, shade(c, 0.3)); }
    }
    // 앞면: 칸 셋. 옆판, 받침.
    L.rect(x0, fy0, x1 - x0, h, '#e9ecec');
    const lv = [fy0 + 1, fy0 + 8];
    for (let s = 0; s < 2; s++) {
      const by = lv[s] + 6; // 물건 바닥
      L.rect(x0 + 1, lv[s], x1 - x0 - 2, 6, '#d5dadb');
      let x = x0 + 2;
      while (x < x1 - 3) {
        const k = rnd(x, s, seed + 1);
        if (kind === 'ramen') { // 봉지라면: 납작하고 넓다
          const c = k < 0.4 ? '#d8302a' : k < 0.65 ? '#2a2a2e' : k < 0.85 ? '#e8902a' : '#f2c232';
          L.rect(x, by - 5, 6, 5, c); L.hl(x, by - 5, 6, shade(c, 0.3)); L.vl(x + 5, by - 4, 4, shade(c, -0.25)); L.rect(x + 2, by - 3, 2, 1, k < 0.65 ? '#f2c232' : '#d8302a');
          x += 7;
        } else if (kind === 'cup') { // 컵라면: 위가 넓은 흰 컵에 색 띠
          const c = k < 0.5 ? '#d8302a' : k < 0.8 ? '#e8902a' : '#3a7ad8';
          L.rect(x, by - 5, 5, 5, '#f4f2ec'); L.hl(x, by - 5, 5, '#ffffff'); L.rect(x, by - 3, 5, 2, c); L.set(x, by - 1, '#d8d4c8'); L.set(x + 4, by - 1, '#d8d4c8');
          x += 6;
        } else if (kind === 'chips') { // 과자 봉지: 빵빵하다
          const c = k < 0.3 ? '#3a7ad8' : k < 0.55 ? '#f2c232' : k < 0.75 ? '#3aa04a' : k < 0.9 ? '#d8302a' : '#8a4ac0';
          L.rect(x, by - 6, 5, 6, c); L.hl(x, by - 6, 5, shade(c, -0.25)); L.vl(x, by - 5, 4, shade(c, 0.35)); L.vl(x + 4, by - 5, 5, shade(c, -0.2)); L.set(x + 2, by - 3, '#f8f8f0');
          x += 6;
        } else { // 초콜릿, 사탕 상자
          const c = k < 0.35 ? '#6a3a24' : k < 0.6 ? '#d8302a' : k < 0.8 ? '#f2efe6' : '#e85a9a';
          L.rect(x, by - 4, 4, 4, c); L.hl(x, by - 4, 4, shade(c, 0.3)); L.vl(x + 3, by - 3, 3, shade(c, -0.25));
          x += 5;
        }
      }
      L.hl(x0 + 1, lv[s] + 6, x1 - x0 - 2, '#9aa2a5'); // 선반 앞 가격표 줄
      for (let xx = x0 + 3; xx < x1 - 3; xx += 9) L.rect(xx, lv[s] + 6, 4, 1, s === 1 ? '#f2d23a' : '#f8f8f4');
    }
    L.vl(x0, tyo, fy - tyo + 1, '#aab2b4'); L.vl(x1 - 1, tyo, fy - tyo + 1, '#8a9294'); // 옆판
    L.rect(x0, fy - 1, x1 - x0, 2, '#6e7678'); // 받침
    p.hl(x0, fy + 1, x1 - x0, '#5a6064', 0.3); // 바닥 그늘
  };
  for (const [c0, r, kind, seed] of [[2, 3, 'ramen', 250], [5, 3, 'cup', 251], [2, 5, 'chips', 252], [5, 5, 'choco', 253]] as const) {
    const L = new Pix(W, H); gondola(L, c0, r, kind, seed); props.push(cut(L, top, r * T + 8));
  }
  // ── 계산대 (9~12,3): 앞면 흰 판에 청록 띠, 19 금지 표시. 위에 껌 진열대, 카드 단말기, 포스기. ──
  {
    const L = new Pix(W, H), x0 = tx(9) + 1, x1 = W - 16, fy = ry(4) - 1, h = 16, fy0 = fy - h, tyo = fy0 - 10;
    L.rect(x0, tyo, x1 - x0, fy0 - tyo, '#d9d6cc'); L.hl(x0, tyo, x1 - x0, '#bcb8ae'); L.hl(x0, fy0 - 1, x1 - x0, '#f2f0ea');
    for (let y = tyo + 1; y < fy0 - 1; y++) for (let x = x0; x < x1; x++) if (rnd(x, y, 260) > 0.93) L.set(x, y, '#ccc8be');
    L.rect(x0, fy0, x1 - x0, h, '#f2f3f0'); L.vl(x0, fy0, h, '#ffffff'); L.vl(x1 - 1, fy0, h, '#c8ccca');
    L.rect(x0, fy0 + 4, x1 - x0, 3, '#2a9a8c'); L.hl(x0, fy0 + 7, x1 - x0, '#f2c232');
    L.rect(x0, fy - 2, x1 - x0, 3, '#5b6266'); // 걸레받이
    // 19세 금지 표시
    const sx = tx(10) + 2, sy = fy0 + 9;
    L.ell(sx + 4, sy + 3.5, 4.5, 4.5, '#d8302a'); L.ell(sx + 4, sy + 3.5, 3.2, 3.2, '#ffffff');
    text(L, sx + 1, sy + 1, '19', '#d8302a'); L.line(sx + 1, sy + 7, sx + 7, sy, '#d8302a');
    // 현금영수증 스티커, 카드 그림
    L.rect(tx(12) + 2, fy0 + 9, 10, 6, '#3a7ad8'); L.hl(tx(12) + 3, fy0 + 11, 8, '#ffffff', 0.8); L.hl(tx(12) + 3, fy0 + 13, 5, '#ffffff', 0.8);
    // 껌 진열대 (12열 앞쪽): 층층이 작은 갑
    {
      const gx = W - 29, gy = fy0 - 11;
      L.rect(gx, gy, 12, 11, '#c8ccce'); L.hl(gx, gy, 12, '#e8eced');
      const GC = ['#3aa04a', '#e85a9a', '#3a7ad8', '#f2c232', '#f4f4f0', '#d8302a'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
        const c = GC[(r * 4 + i * 3) % GC.length];
        L.rect(gx + 1 + i * 3, gy + 1 + r * 3, 2, 2, c); L.set(gx + 1 + i * 3, gy + 1 + r * 3, shade(c, 0.4));
      }
      L.hl(gx, gy + 10, 12, '#8a9294');
    }
    // 카드 단말기 (10열, 손님 쪽): 검은 몸, 작은 화면과 자판
    {
      const cx = tx(10) + 7, cy = fy0 - 8;
      L.rect(cx, cy, 7, 8, '#1e2124'); L.hl(cx, cy, 7, '#3a3e42'); L.rect(cx + 1, cy + 1, 5, 2, '#8ad0b8');
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) L.set(cx + 1 + i * 2, cy + 4 + j * 2, '#9aa2a8');
      L.line(cx + 7, cy + 6, cx + 10, cy + 7, '#2a2c30');
    }
    // 포스기 (9~10열): 알바 쪽을 보는 모니터의 뒤, 손님 쪽 작은 금액 창
    {
      const mx = tx(9) + 3, my = tyo - 13; // 알바 쪽 큰 화면의 뒤판에 손님용 작은 화면이 붙었다
      L.rect(mx, my, 19, 11, '#3a3e44'); L.hl(mx, my, 19, '#5a6068'); L.vl(mx + 18, my, 11, '#2a2d32'); L.hl(mx, my + 10, 19, '#26292e');
      L.rect(mx + 1, my + 2, 17, 7, '#0e1a14'); text(L, mx + 2, my + 3, '3400', '#5aea8a');
      L.rect(mx + 8, my + 11, 3, 4, '#2a2d32'); L.rect(mx + 5, my + 14, 9, 2, '#3a3e44');
      L.rect(mx + 2, my + 17, 14, 3, '#d8dcde'); L.hl(mx + 2, my + 17, 14, '#f2f4f4'); // 바코드 스캐너 받침
      L.rect(mx + 15, my + 15, 3, 2, '#2a2d32'); L.set(mx + 16, my + 15, '#ff5a3a'); // 스캐너
    }
    // 동전 접시
    L.ell(tx(11) + 6, tyo + 6, 4, 2, '#b8bec2'); L.ell(tx(11) + 6, tyo + 6, 3, 1.2, '#2a9a8c');
    props.push(cut(L, top, 3 * T + 8));
  }
  // ── 아래 벽: 낮게 잘린 유리 벽, 가운데 자동문. 문 위 가로대에 열림 센서. ──
  {
    const L = new Pix(W, H), fl = F1 + 2, gT = fl - 7, dx0 = tx(7), dx1 = tx(9);
    for (let x = 16; x < W - 16; x++) {
      if (x >= dx0 && x < dx1) continue;
      for (let y = gT; y < fl; y++) L.set(x, y, mix('#3a5468', '#1c2a38', (y - gT) / 7), 0.38); // 밤이 비치는 유리
      if (((x - (fl - gT)) % 23) < 2) for (let y = gT; y < fl; y++) if (((x + y) % 23) < 2) L.set(x, y, '#ffffff', 0.35); // 형광등이 비친 줄
    }
    // 열린 문짝: 양옆 고정 유리 뒤로 밀려 들어갔다 (유리 두 겹)
    for (const [a, b] of [[dx0 - 15, dx0], [dx1, dx1 + 15]] as const) { L.rect(a, gT, b - a, fl - gT, '#2a4054', 0.25); L.vl(a, gT, fl - gT, '#9aa4aa'); }
    L.hl(16, gT - 1, W - 32, '#c4cacd'); L.hl(16, gT - 2, W - 32, '#e8ecee'); // 윗틀
    L.rect(16, fl, W - 32, 3, '#a8afb3'); L.hl(16, fl, W - 32, '#d4d9dc'); L.hl(16, fl + 2, W - 32, '#6a7276'); // 아랫틀
    for (const mxp of [tx(3), tx(5), tx(11)]) { L.vl(mxp, gT - 2, fl - gT + 5, '#8a9296'); L.vl(mxp + 1, gT - 2, fl - gT + 5, '#c4cacd'); }
    // 문틀 기둥과 가로대
    for (const jx of [dx0 - 2, dx1]) { L.rect(jx, gT - 3, 2, fl - gT + 6, '#7a8286'); L.vl(jx, gT - 3, fl - gT + 6, '#c4cacd'); }
    L.hl(dx0, fl + 1, dx1 - dx0, '#8a9296'); L.hl(dx0, fl + 2, dx1 - dx0, '#5a6266'); // 바닥 레일
    // 센서: 가로대 가운데의 검은 상자, 빨간 불
    const sx = dx0 + 12;
    L.hl(dx0, fl + 3, dx1 - dx0, '#c4cacd', 0.9);
    L.rect(sx - 1, fl + 3, 10, 5, '#7a8286'); L.rect(sx, fl + 3, 8, 4, '#dfe3e5'); L.hl(sx, fl + 3, 8, '#ffffff'); L.hl(sx, fl + 6, 8, '#a8b0b4');
    L.rect(sx + 1, fl + 4, 4, 2, '#1a1d22'); L.set(sx + 2, fl + 4, '#5a7a9a'); L.set(sx + 6, fl + 4, '#ff3a2a'); L.set(sx + 6, fl + 5, '#a82018');
    // 바깥 유리에 붙은 24 스티커 (안에서 본 뒷면이라 흐리다)
    L.rect(tx(10) + 2, gT + 1, 9, 5, '#f2f2ee', 0.5); text(L, tx(10) + 3, gT + 1, '24', '#d8302a', 0.5);
    props.push(cut(L, top, 6 * T + 1));
  }
  return { base: p, props };
}

// ═══════════════════ 파티룸 층 공용 화장실 ═══════════════════
// 골목 안 건물 삼 층. 옛날 민트색 타일, 긴 거울, 세면대 셋. 칸 둘 중 오른쪽은 사용중. 바닥은 늘 젖어 있다.
export function restroom(_s: PlaceState): Place {
  const m = MAPS.restroom, top = m.top ?? 48, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T, tx = (c: number): number => c * T, WB = ry(1);
  p.rect(0, 0, W, H, '#000000');
  // ── 벽: 8px 민트 타일, 가운데 짙은 청록 띠. 낡아서 몇 장은 색이 다르고 금이 갔다. ──
  const TILE = '#a6d2c4', GROUT = '#7fa89b';
  for (let y = 6; y < WB; y++) for (let x = 16; x < W - 16; x++) {
    const gx = (x - 16) & 7, gy = (y - 6) & 7, tX = (x - 16) >> 3, tY = (y - 6) >> 3, n = rnd(tX, tY, 301);
    let c = n > 0.93 ? '#b4d8cc' : n < 0.06 ? '#98c4b6' : TILE;
    if (tY === 4) c = '#4f9488';
    if (gx === 0 || gy === 0) c = GROUT;
    else if (gx === 1 || gy === 1) c = shade(c, 0.22);
    else if (gx === 7 || gy === 7) c = shade(c, -0.06);
    if (y > WB - 10 && rnd(x, y, 302) > 0.75) c = mix(c, '#6a7a60', 0.25); // 아래쪽 묵은 때
    p.set(x, y, c);
  }
  p.rect(16, 0, W - 32, 6, '#55574f'); p.hl(16, 5, W - 32, '#8e9088'); p.hl(16, 4, W - 32, '#6e7068');
  p.rect(16, WB - 3, W - 32, 3, '#6a9488'); p.hl(16, WB - 3, W - 32, '#86b0a4');
  // 금 간 타일 둘
  p.line(tx(7) + 2, 46, tx(7) + 6, 50, '#5e8478'); p.line(tx(7) + 6, 50, tx(7) + 5, 53, '#5e8478');
  p.line(tx(4) + 9, 54, tx(4) + 13, 52, '#5e8478');

  // ── 바닥: 6px 회녹색 타일, 물기 ──
  for (let y = WB; y < ry(4) + 2; y++) for (let x = 16; x < W - 16; x++) {
    const gx = (x - 16) % 6, gy = (y - WB) % 6, n = rnd(Math.floor((x - 16) / 6), Math.floor((y - WB) / 6), 303);
    let c = n > 0.85 ? '#a7b2aa' : n < 0.12 ? '#b9c3bb' : '#b0bab2';
    if (gx === 0 || gy === 0) c = '#87928a';
    else if (rnd(x, y, 304) > 0.95) c = shade(c, -0.07);
    p.set(x, y, c);
  }
  // 물기: 젖은 자리는 어둡고, 형광등이 하얗게 맺힌다
  const wet = (cx: number, cy: number, rx: number, rz: number, seed: number): void => {
    for (let y = Math.floor(cy - rz) - 1; y <= cy + rz + 1; y++) for (let x = Math.floor(cx - rx) - 2; x <= cx + rx + 2; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / rz) ** 2 + (rnd(x >> 1, y, seed) - 0.5) * 0.5;
      if (d < 1) p.set(x, y, '#5e7a74', 0.28);
    }
    p.hl(Math.round(cx - rx * 0.5), Math.round(cy - rz * 0.3), Math.max(2, Math.round(rx * 0.5)), '#f4fbf8', 0.55);
    p.set(Math.round(cx + rx * 0.3), Math.round(cy + rz * 0.2), '#f4fbf8', 0.5);
  };
  wet(30, ry(2) + 5, 12, 3.5, 310); wet(52, ry(2) + 3, 7, 2.5, 311); wet(74, ry(3) + 2, 10, 3, 312); wet(108, ry(2) + 6, 6, 2, 313); wet(46, ry(3) + 9, 5, 1.5, 314);
  // 배수구
  { const cx = tx(4) + 10, cy = ry(3) + 2; p.ell(cx, cy, 3.5, 2.5, '#5a625c'); p.ell(cx, cy, 2.5, 1.6, '#2a302c'); for (let x = cx - 2; x <= cx + 2; x += 2) p.vl(x, cy - 1, 3, '#8a948c'); }
  // 젖은 신발 자국 (문에서 세면대로)
  for (const [x, y] of [[72, ry(3) + 10], [78, ry(3) + 4], [66, ry(2) + 12], [58, ry(2) + 6]] as const) { p.rect(x, y, 2, 3, '#7a8a84', 0.45); p.set(x, y + 4, '#7a8a84', 0.45); }
  // 벽 아래 그늘
  p.hl(16, WB, W - 32, '#3a4a44', 0.3); p.dither(16, WB + 1, W - 32, 1, '#3a4a44', 0, 0.2);

  // ── 거울: 세면대 셋 위로 가로로 길다. 비친 건 반대쪽 벽의 타일과 형광등뿐. ──
  {
    const x0 = 18, x1 = tx(4) - 2, y0 = 12, y1 = 43;
    p.rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, '#b8c0c0'); p.hl(x0 - 2, y0 - 2, x1 - x0 + 4, '#e2e8e8'); p.hl(x0 - 2, y1 + 1, x1 - x0 + 4, '#7a8484');
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      let c = mix('#8fa8a4', '#4e605e', (y - y0) / (y1 - y0));
      const gx = (x - x0 + 3) % 7, gy = (y - y0 + 2) % 7; // 반대쪽 벽 타일: 한 걸음 멀어서 조금 작다
      if (gx === 0 || gy === 0) c = mix(c, '#3a4a46', 0.22);
      p.set(x, y, c);
    }
    p.rect(x0 + 6, y0 + 1, 20, 2, '#f4fbf8', 0.8); p.hl(x0 + 6, y0 + 3, 20, '#c8dcd8', 0.5); // 비친 형광등
    for (const [o, w] of [[2, 3], [9, 1], [30, 2]] as const) for (let y = y0; y < y1; y++) for (let k = 0; k < w; k++) { const x = x0 + o + k + Math.floor((y1 - y) * 0.6); if (x < x1) p.set(x, y, '#ffffff', 0.13); } // 비스듬한 반사
    for (let x = x0; x < x1; x++) if (rnd(x, 0, 320) > 0.55) p.vl(x, y1 - 1 - Math.floor(rnd(x, 1, 320) * 2), 2, '#2a2e2a', 0.6); // 아래 가장자리 은박이 삭았다
    for (const [x, y] of [[x0, y0], [x1 - 2, y0], [x0, y0 + 1]] as const) { p.set(x, y, '#2a2e2a', 0.6); p.set(x + 1, y, '#2a2e2a', 0.4); }
    for (let i = 0; i < 5; i++) { const x = x0 + 3 + Math.floor(rnd(i, 1, 321) * (x1 - x0 - 6)), y = y1 - 6 + Math.floor(rnd(i, 2, 321) * 3); p.set(x, y, '#d8e4e0', 0.45); p.set(x + 1, y, '#d8e4e0', 0.25); } // 아래쪽에 말라붙은 물방울 자국
  }
  // 거울 위 형광등
  p.rect(26, 7, 30, 3, '#f6faf6'); p.hl(26, 9, 30, '#c8d0cc'); p.rect(24, 7, 2, 3, '#9aa29e'); p.rect(56, 7, 2, 3, '#9aa29e');

  // ── 세면대 (1~3,1): 인조 대리석 상판, 둥근 도기 셋, 아래 칸에 휴지통 ──
  {
    const x0 = 16, x1 = tx(4) - 1, fy = ry(2) - 1, h = 17, tyo = ry(1) - h + 1, fy0 = fy - h;
    p.rect(x0, tyo, x1 - x0, fy0 - tyo, '#ddd9cf'); p.hl(x0, tyo, x1 - x0, '#bfbab0'); p.hl(x0, fy0 - 1, x1 - x0, '#f4f2ec');
    for (let y = tyo + 1; y < fy0 - 1; y++) for (let x = x0; x < x1; x++) { const n = rnd(x, y, 330); if (n > 0.9) p.set(x, y, n > 0.97 ? '#9a968c' : '#ccc8be'); }
    // 앞치마: 같은 타일, 아래에 휴지통 칸
    for (let y = fy0; y < fy; y++) for (let x = x0; x < x1; x++) {
      const gx = (x - x0) & 7, gy = (y - fy0) & 7;
      p.set(x, y, gx === 0 || gy === 0 ? GROUT : gx === 1 || gy === 1 ? '#b8dcd0' : y > fy - 4 ? '#8cb4a8' : TILE);
    }
    p.hl(x0, fy0, x1 - x0, '#f4f2ec');
    const bx0 = tx(3) + 1, bx1 = x1 - 1;
    p.rect(bx0, fy0 + 2, bx1 - bx0, fy - fy0 - 2, '#22302c'); p.hl(bx0, fy0 + 2, bx1 - bx0, '#141c1a');
    p.rect(bx0 + 2, fy0 + 6, bx1 - bx0 - 4, fy - fy0 - 6, '#9aa4a6'); p.hl(bx0 + 2, fy0 + 6, bx1 - bx0 - 4, '#1e2022'); p.hl(bx0 + 2, fy0 + 7, bx1 - bx0 - 4, '#c4ccce'); // 휴지통과 검은 봉투 테
    p.vl(bx1 - 3, fy0 + 7, fy - fy0 - 8, '#7a8486');
    p.rect(bx0 + 3, fy0 + 3, 4, 3, '#f4f4ee'); p.set(bx0 + 5, fy0 + 2, '#f4f4ee'); p.rect(bx0 + 7, fy0 + 4, 3, 2, '#e8e8e0'); // 넘친 종이 타월
    p.rect(x0, fy, x1 - x0, 1, '#3a4a44', 0.5);
    // 도기 세면대 셋
    for (let i = 0; i < 3; i++) {
      const cx = tx(1 + i) + 8, cy = tyo + 9;
      p.ell(cx, cy, 6, 4, '#f6f6f2'); p.ell(cx, cy + 0.5, 4.6, 2.8, '#cfd6d4'); p.ell(cx, cy + 1, 3.4, 1.8, '#e2e8e6');
      p.hl(cx - 4, cy - 3, 8, '#ffffff'); p.set(cx, cy + 1, '#5a6260'); // 배수 구멍
      if (i === 1) p.set(cx - 1, cy + 2, '#c8a878', 0.5); // 물때
      // 수도꼭지: 뒤에서 앞으로 굽은 크롬
      p.rect(cx - 1, tyo - 1, 3, 3, '#c8d0d2'); p.set(cx - 1, tyo - 1, '#ffffff'); p.vl(cx, tyo + 2, 2, '#9aa4a8'); p.set(cx + 2, tyo, '#5a6468');
      if (i === 2) { p.set(cx, tyo + 5, '#8ac8e8'); p.set(cx, tyo + 7, '#8ac8e8', 0.6); } // 한 방울씩 샌다
    }
    // 물비누: 분홍 펌프 병
    const sx = tx(2) - 1;
    p.rect(sx, tyo + 2, 3, 6, '#f0a6c0'); p.vl(sx, tyo + 2, 6, '#fcd0de'); p.rect(sx + 1, tyo, 1, 2, '#f4f4f0'); p.hl(sx, tyo - 1, 3, '#f4f4f0'); p.hl(sx, tyo + 7, 3, '#c87896');
    p.ell(sx + 1, tyo + 9, 2, 0.8, '#f0a6c0', 0.4); // 흘린 비누
  }
  // 종이 타월함 (4열 벽)
  {
    const x0 = tx(4) + 2, y0 = 22;
    p.rect(x0, y0, 12, 15, '#e8ece8'); p.hl(x0, y0, 12, '#ffffff'); p.vl(x0 + 11, y0, 15, '#b8c0bc'); p.hl(x0, y0 + 14, 12, '#9aa29e');
    p.rect(x0 + 3, y0 + 4, 6, 3, '#6a7672'); p.rect(x0 + 4, y0 + 5, 4, 1, '#c8d0cc');
    p.rect(x0 + 3, y0 + 15, 6, 3, '#f6f6f0'); p.hl(x0 + 3, y0 + 17, 6, '#d8d8d0'); // 혀를 내민 종이
  }

  // ── 칸막이 화장실 (5~6,1): 바랜 미색 판. 왼쪽 문은 조금 열려 있고(비었음), 오른쪽은 사용중. ──
  {
    const x0 = tx(5), x1 = tx(7), fy = ry(2), h = 40, ft = fy - h, bt = ft - 12; // ft: 앞 윗선, bt: 뒤 윗선
    const PAN = '#d8cfb6', PAN_L = '#ece4cc', PAN_D = '#b0a68c';
    p.rect(x0, bt, x1 - x0, ft - bt, '#7e9e94'); // 칸 안쪽 벽: 그늘진 타일
    for (let y = bt; y < ft; y++) for (let x = x0; x < x1; x++) if (((x - 16) & 7) === 0 || ((y - 6) & 7) === 0) p.set(x, y, '#678a80');
    for (const fx of [x0 + 8, x0 + 24]) { p.vl(fx, bt + 2, 9, '#c8d0d2'); p.vl(fx + 1, bt + 2, 9, '#8a9496'); p.rect(fx - 1, bt + 1, 4, 2, '#dfe4e4'); } // 물 내리는 관
    for (const px of [x0, x0 + 15, x1 - 2]) { p.rect(px, bt, 2, ft - bt, PAN_L); p.vl(px + 1, bt, ft - bt, PAN_D); } // 칸막이 윗면
    p.rect(x0, ft - 2, x1 - x0, 2, '#c4cacc'); p.hl(x0, ft - 2, x1 - x0, '#eef2f2'); // 윗 가로대
    // 기둥과 문
    for (const px of [x0, x0 + 15, x1 - 2]) { p.rect(px, ft, 2, h, PAN); p.vl(px, ft, h, PAN_L); p.rect(px, fy - 3, 2, 3, '#c4cacc'); }
    // 왼쪽 문: 안으로 조금 열렸다. 틈으로 어두운 칸 안.
    const d0 = x0 + 2, d1 = x0 + 15, dt = ft + 1, db = fy - 3;
    p.rect(d0, dt, d1 - d0, db - dt, '#2e3634'); p.rect(d0, db, d1 - d0, 3, '#3a4a44', 0.6);
    p.rect(d0, dt, d1 - d0 - 3, db - dt, mix(PAN, '#000000', 0.08)); p.vl(d0, dt, db - dt, PAN_L); p.vl(d1 - 4, dt, db - dt, PAN_D);
    p.rect(d1 - 6, dt + 19, 2, 3, '#9aa2a4'); p.set(d1 - 6, dt + 19, '#e8ecec'); p.rect(d1 - 7, dt + 14, 3, 2, '#3aa04a'); p.set(d1 - 7, dt + 14, '#7ad08a');
    p.vl(d1 - 2, db - 9, 4, '#e8ecea'); p.set(d1 - 1, db - 8, '#c8d0ce'); // 틈으로 보이는 변기 가장자리 // 손잡이, 초록 '비어 있음'
    // 오른쪽 문: 닫혔다. 빨간 '사용중'.
    const e0 = x0 + 17, e1 = x1 - 2;
    p.rect(e0, dt, e1 - e0, db - dt, PAN); p.vl(e0, dt, db - dt, PAN_L); p.vl(e1 - 1, dt, db - dt, PAN_D); p.hl(e0, db - 1, e1 - e0, PAN_D);
    p.rect(e0 + 1, dt + 13, 6, 4, '#c4cacc'); p.rect(e0 + 2, dt + 14, 4, 2, '#e8302a'); p.set(e0 + 2, dt + 14, '#ff7a6a'); p.rect(e0 + 1, dt + 19, 2, 3, '#9aa2a4'); p.set(e0 + 1, dt + 19, '#e8ecec');
    p.rect(e0, db, e1 - e0, 3, '#1e2422', 0.7); // 문 밑 틈: 안은 어둡다
    // 문에 붙은 종이와 낙서
    p.rect(e0 + 6, dt + 4, 6, 7, '#f4f2ea'); p.hl(e0 + 7, dt + 6, 4, '#5a5a5a'); p.hl(e0 + 7, dt + 8, 3, '#5a5a5a'); p.set(e0 + 6, dt + 4, '#c8b878');
    p.line(d0 + 2, dt + 22, d0 + 6, dt + 20, '#3a3a44', 0.6); p.line(e0 + 4, dt + 24, e0 + 9, dt + 25, '#3a3a44', 0.5); p.set(e0 + 10, dt + 24, '#3a3a44', 0.5);
    p.hl(x0, fy, x1 - x0, '#3a4a44', 0.3);
  }
  // ── 7열 벽: 환풍기, 붙은 종이 ──
  {
    const x0 = tx(7) + 2, y0 = 12;
    p.rect(x0, y0, 12, 12, '#d8dcd6'); p.hl(x0, y0, 12, '#f2f4f0'); p.vl(x0 + 11, y0, 12, '#9aa098');
    for (let y = y0 + 2; y < y0 + 11; y += 2) { p.hl(x0 + 2, y, 8, '#4a524c'); p.hl(x0 + 2, y + 1, 8, '#c4c8c2'); }
    p.dither(x0 + 1, y0 + 9, 10, 2, '#5a5a4a', 0, 0.4); // 먼지
    const q0 = tx(7) + 3, q1 = 31;
    p.rect(q0, q1, 10, 13, '#f6f4ec'); glyphs(p, q0 + 0, q1 + 2, 2, '#c8302a', 340, 0.9); p.hl(q0 + 1, q1 + 9, 8, '#7a7a7a'); p.hl(q0 + 1, q1 + 11, 6, '#7a7a7a');
    p.set(q0, q1, '#c8b878'); p.set(q0 + 9, q1, '#c8b878');
  }

  // ── 옆벽, 아래 벽 너머 복도 ──
  p.rect(10, 0, 6, ry(4) + 6, SLAB); p.vl(15, 0, ry(4) + 6, SLAB_L);
  p.rect(W - 16, 0, 6, ry(4) + 6, SLAB); p.vl(W - 16, 0, ry(4) + 6, SLAB_L);
  for (let y = ry(4) + 2; y < H; y++) for (let x = tx(4); x < tx(6); x++) { const n = rnd(x, y, 350); p.set(x, y, n > 0.93 ? '#7a7870' : n < 0.05 ? '#9a978c' : '#8a877e'); } // 복도 시멘트
  p.rect(tx(4), ry(4), tx(2), 3, '#9a9890'); p.hl(tx(4), ry(4), tx(2), '#c4c2b8'); p.hl(tx(4), ry(4) + 2, tx(2), '#6a685f'); // 문턱

  const props: Prop[] = [];
  { // 앞벽: 문 자리는 비었다. 문짝은 밖으로 활짝 열려 복도 쪽 벽에 붙었다.
    const L = new Pix(W, H), y = ry(4);
    L.rect(10, y, tx(4) - 10, 6, SLAB); L.hl(16, y, tx(4) - 16, SLAB_L);
    L.rect(tx(6), y, W - 10 - tx(6), 6, SLAB); L.hl(tx(6), y, W - 16 - tx(6), SLAB_L);
    for (const jx of [tx(4) - 2, tx(6)]) { L.rect(jx, y - 2, 2, 8, '#7a6450'); L.vl(jx, y - 2, 8, '#9a8268'); } // 문틀
    L.rect(tx(6) + 2, y + 6, 3, H - y - 6, '#cdc2a6'); L.vl(tx(6) + 2, y + 6, H - y - 6, '#ece4cc'); L.vl(tx(6) + 4, y + 6, H - y - 6, '#9a9078'); // 열린 문짝의 옆선
    L.rect(tx(6) + 5, y + 10, 2, 2, '#c4cacc');
    props.push(cut(L, top, 4 * T + 1));
  }
  return { base: p, props };
}
