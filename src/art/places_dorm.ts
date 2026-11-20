// 막간: 윤서의 대학 기숙사 2인실. 금·토요일 밤 11시 넘어 불 끈 방.
// 위 벽에 붙박이 책상 둘과 그 위 책장, 가운데 창(블라인드). 양옆에 철제 침대: 왼쪽은 자는 룸메이트(이불 덩어리), 오른쪽은 윤서.
// 아래 가운데가 복도로 나가는 문. 칠은 불 켜진 고유색으로, 어둠은 world.ts 가 덮는다.
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';
import { T, text, cut, type Prop, type PlaceState, type Place } from './kit.ts';

const SLAB = '#25262e', SLAB_L = '#383a45';
const STEEL = '#64707a', STEEL_L = '#93a0aa', STEEL_D = '#3c454e';

/** 한글 흉내: 작은 획 덩어리 n 개 */
function glyphs(p: Pix, x: number, y: number, n: number, col: string, seed: number, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 4;
    for (let j = 0; j < 9; j++) if (rnd(i * 9 + j, seed, 7) > 0.45) p.set(gx + (j % 3), y + Math.floor(j / 3), col, a);
    p.set(gx + 1, y + 1, col, a);
  }
}

export function dorm(_s: PlaceState): Place {
  const m = MAPS.dorm, top = m.top || 48, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const tx = (c: number): number => c * T, ry = (r: number): number => top + r * T, WB0 = ry(1);
  const p = new Pix(W, H);
  p.rect(0, 0, W, H, '#000000');

  // ── 뒷벽: 기숙사 아이보리 페인트. 아랫단은 회녹색으로 한 번 더 칠했다. 테이프 자국, 의자에 긁힌 자리. ──
  for (let y = 6; y < WB0; y++) for (let x = 16; x < W - 16; x++) {
    const low = y >= 44;
    const base = low ? '#a8ae9c' : '#d3ccb8';
    const n = rnd(x, y, 501), mm = rnd(x >> 2, y >> 2, 502);
    p.set(x, y, n > 0.97 ? mix(base, '#000000', 0.07) : n < 0.03 ? mix(base, '#ffffff', 0.08) : mm > 0.86 ? mix(base, '#000000', 0.03) : base);
  }
  p.hl(16, 43, W - 32, '#e2dccb'); p.hl(16, 44, W - 32, '#8a9080'); // 두 색 경계의 칠 턱
  p.rect(16, 0, W - 32, 6, '#3c3a36'); p.hl(16, 5, W - 32, '#8e826c'); p.hl(16, 6, W - 32, '#c4b89e');
  p.rect(16, WB0 - 3, W - 32, 3, '#6e7268'); p.hl(16, WB0 - 3, W - 32, '#8a8e84'); // 걸레받이
  for (const [x, y] of [[54, 22], [58, 30], [102, 18], [52, 38]] as const) { p.rect(x, y, 3, 2, '#e8e2c8', 0.7); p.set(x, y, '#c4bc9a', 0.6); } // 떼다 남은 테이프
  p.line(100, 52, 106, 54, '#7a806e', 0.6); p.line(50, 55, 54, 53, '#7a806e', 0.5); // 의자 등받이에 긁힌 자리

  // ── 바닥: 리놀륨 데코타일. 미색 바탕에 잔 점, 이음매. 문에서 침대 사이가 닳았다. ──
  {
    const FL = '#bdb5a2';
    for (let y = WB0; y < ry(6); y++) for (let x = 16; x < W - 16; x++) {
      const tu = Math.floor((x - 16) / 12), tv = Math.floor((y - WB0) / 12);
      let col = (tu + tv) % 2 ? FL : mix(FL, '#a49c88', 0.22);
      const n = rnd(x, y, 520);
      if (n > 0.985) col = mix(col, '#7a7262', 0.35); else if (n > 0.965) col = mix(col, '#e4dcc8', 0.4); else if (n < 0.02) col = mix(col, '#9a9280', 0.35);
      if ((x - 16) % 12 === 0 || (y - WB0) % 12 === 0) col = mix(col, '#8a8270', 0.4);
      const wear = Math.abs(x - 80) < 18 && y > ry(2) ? 0.12 * (1 - Math.abs(x - 80) / 18) : 0;
      if (wear) col = mix(col, '#d8d0bc', wear);
      p.set(x, y, col);
    }
    // 흘린 얼룩 하나, 머리카락 몇 올
    p.ell(70, ry(3) + 6, 3, 1.6, '#a89a7e', 0.5);
    p.line(58, ry(5) + 4, 63, ry(5) + 6, '#2a2222', 0.6); p.line(96, ry(2) + 9, 99, ry(2) + 7, '#2a2222', 0.5);
  }

  // ── 붙박이 책상 + 위 책장 (1~2열, 7~8열) ──
  const WD = '#c6a97e', WD_L = '#dcc49c', WD_D = '#9c8058', WD_DD = '#6e5638';
  const desk = (x0: number, ped: 'left' | 'right'): void => {
    const x1 = x0 + 31;
    // 위 책장: 벽에 매단 열린 칸 + 문 달린 칸
    p.rect(x0, 10, 31, 3, WD_L); p.hl(x0, 10, 31, '#ece0c4');
    p.rect(x0, 13, 31, 19, '#5a4632'); // 칸 안쪽 그늘
    p.rect(x0, 13, 2, 19, WD); p.rect(x1 - 2, 13, 2, 19, WD_D); p.rect(x0, 30, 31, 3, WD); p.hl(x0, 32, 31, WD_DD);
    const doorX = ped === 'left' ? x0 + 2 : x1 - 13; // 문 달린 칸
    p.rect(doorX, 13, 11, 17, WD); p.vl(doorX, 13, 17, WD_L); p.vl(doorX + 10, 13, 17, WD_D); p.rect(ped === 'left' ? doorX + 8 : doorX + 1, 20, 1, 3, '#d8d0c0');
    p.hl(x0, 13, 31, '#3a2c20'); // 칸 위쪽 그늘
    // 책상 상판 (위에서 보인다) 과 앞판
    p.rect(x0, 48, 31, 13, WD); p.hl(x0, 48, 31, mix(WD, '#000000', 0.15)); p.hl(x0, 49, 31, WD_D, 0.5);
    for (let y = 50; y < 60; y += 2) if (rnd(x0, y, 503) > 0.4) p.hl(x0 + 2 + Math.floor(rnd(y, x0, 504) * 12), y, 4 + Math.floor(rnd(x0, y, 505) * 10), WD_D, 0.25); // 나뭇결 시트
    p.rect(x0, 61, 31, 2, WD_L); p.hl(x0, 62, 31, '#ece0c4'); // 앞 모서리
    const px = ped === 'left' ? x0 : x1 - 11;
    p.rect(x0, 63, 31, 15, '#2e241c'); // 무릎 들어가는 자리: 어둡다
    p.rect(px, 63, 11, 15, WD); p.vl(px, 63, 15, WD_L); p.vl(px + 10, 63, 15, WD_D); // 서랍 기둥
    for (const dy of [67, 72]) p.hl(px, dy, 11, WD_DD);
    for (const dy of [65, 69, 74]) { p.rect(px + 4, dy, 3, 1, '#e4dccb'); p.set(px + 4, dy + 1, WD_DD); }
    p.rect(ped === 'left' ? x1 - 2 : x0, 63, 2, 15, WD_D); // 반대쪽 다리 판
    p.hl(x0, 78, 31, '#1d1820', 0.5); p.dither(x0, 79, 31, 1, '#1d1820', 0, 0.35);
  };
  desk(tx(1) + 1, 'left');
  desk(tx(7), 'right');

  // 룸메이트 책상 (1~2열): 노트북, 인형, 화장품, 책장엔 알록달록한 책과 작은 화분, 벽엔 폴라로이드
  {
    const x0 = tx(1) + 1;
    const books: [number, number, string][] = [[14, 15, '#e6a0a8'], [16, 14, '#a8c8e0'], [18, 16, '#f0d888'], [20, 13, '#d0d0d8'], [23, 15, '#b8a0d0']];
    for (const [bx, bh, c] of books) { p.rect(x0 + bx, 30 - bh, 2, bh, c); p.vl(x0 + bx, 30 - bh, bh, mix(c, '#ffffff', 0.3)); p.set(x0 + bx + 1, 29, mix(c, '#000000', 0.25)); }
    p.rect(x0 + 25, 25, 4, 5, '#c87a5a'); p.hl(x0 + 25, 25, 4, '#e09a78'); p.dots(`${x0 + 26},23 ${x0 + 27},22 ${x0 + 28},24 ${x0 + 26},24 ${x0 + 27},24`, '#5a9a5a'); // 다육이 화분
    // 폴라로이드 셋, 꼬마전구 줄
    for (const [i, dx] of [[0, 3], [1, 11], [2, 19]] as const) {
      p.rect(x0 + dx, 35 + (i % 2), 6, 7, '#f4f2ea'); p.rect(x0 + dx + 1, 36 + (i % 2), 4, 4, ['#8ab0c8', '#e0a88a', '#a8c890'][i]); p.set(x0 + dx + 2, 35 + (i % 2), '#e8c060');
    }
    for (let x = x0 + 1; x < x0 + 30; x++) { const y = 33 + Math.round(Math.sin((x - x0) / 4.6) * 0.8 + 0.8); p.set(x, y, '#5a5a50'); if ((x - x0) % 5 === 2) p.set(x, y + 1, '#ffe6a0'); }
    // 노트북: 덮개를 연 채 잠들었다. 충전 불빛.
    p.rect(x0 + 10, 39, 15, 10, '#2a2c32'); p.rect(x0 + 11, 40, 13, 8, '#14161c'); p.line(x0 + 12, 41, x0 + 16, 45, '#262a34');
    p.rect(x0 + 9, 49, 17, 4, '#b4b8bc'); p.hl(x0 + 9, 49, 17, '#d4d8dc'); p.hl(x0 + 10, 50, 15, '#8a8e94', 0.6); p.hl(x0 + 9, 52, 17, '#7a7e84'); p.set(x0 + 24, 52, '#7fe39a');
    // 인형: 하얀 곰. 얼굴은 그리지 않는다.
    const bx = x0 + 4, by = 44;
    p.ell(bx, by + 5, 3.6, 3.4, '#ece6dc'); p.ell(bx, by, 3, 2.8, '#f4eee4'); p.set(bx - 3, by - 3, '#e2dace'); p.set(bx + 3, by - 3, '#e2dace'); p.set(bx - 2, by - 3, '#f4eee4'); p.set(bx + 2, by - 3, '#f4eee4');
    p.set(bx + 2, by + 1, '#d4ccc0'); p.hl(bx - 2, by + 9, 5, '#b8b0a4'); p.rect(bx - 1, by + 3, 3, 1, '#e88a9a');
    // 화장품 병, 손거울
    p.rect(x0 + 27, 47, 2, 5, '#f0c0c8'); p.set(x0 + 27, 46, '#f8f4f0'); p.rect(x0 + 29, 48, 2, 4, '#3a3a44'); p.set(x0 + 29, 48, '#c8b070');
    p.ell(x0 + 28, 57, 2.4, 1.6, '#dce8ee'); p.set(x0 + 27, 56, '#ffffff');
    p.rect(x0 + 3, 56, 5, 3, '#e8b4c0'); p.hl(x0 + 3, 56, 5, '#f4d0d8'); // 파우치
  }

  // 윤서 책상 (7~8열): 전공책 더미, 영수증, 알바 근무표(숫자), 스탠드. 책장엔 두꺼운 전공책과 파일철.
  {
    const x0 = tx(7);
    const books: [number, number, number, string][] = [[2, 3, 16, '#3a5a8a'], [5, 3, 17, '#8a3a3a'], [8, 2, 15, '#2f6a52'], [10, 3, 17, '#5a5a6a'], [13, 2, 14, '#c8a050']];
    for (const [bx, bw, bh, c] of books) { p.rect(x0 + bx, 30 - bh, bw, bh, c); p.vl(x0 + bx, 30 - bh, bh, mix(c, '#ffffff', 0.22)); p.hl(x0 + bx, 30 - bh + 3, bw, '#e8e0c8', 0.8); p.hl(x0 + bx, 30 - bh + 5, bw, '#e8e0c8', 0.5); }
    p.line(x0 + 15, 29, x0 + 17, 18, '#d8d0c0'); p.line(x0 + 16, 29, x0 + 18, 18, '#a89c88'); // 기울어진 파일철
    // 알바 근무표: 벽에 테이프로. 요일 칸과 시간 숫자, 형광펜.
    {
      const qx = x0 + 2, qy = 34;
      p.rect(qx, qy, 19, 13, '#f6f4ec'); p.hl(qx, qy + 12, 19, '#c8c4b4'); p.vl(qx + 18, qy, 13, '#d8d4c4');
      p.rect(qx + 7, qy - 1, 5, 2, '#e8e2c8', 0.8); // 테이프
      glyphs(p, qx + 1, qy + 1, 3, '#3a3a44', 610, 0.85);
      p.rect(qx + 1, qy + 4, 17, 7, '#f0e070', 0.55);
      text(p, qx + 1, qy + 5, '18', '#3a3a44'); p.hl(qx + 9, qy + 7, 1, '#3a3a44'); text(p, qx + 11, qy + 5, '24', '#3a3a44'); // 금·토 18시~24시
      p.hl(qx + 2, qy + 11, 4, '#7a7a84'); p.hl(qx + 8, qy + 11, 3, '#7a7a84'); p.hl(qx + 13, qy + 11, 4, '#c8302a');
    }
    // 영수증 몇 장: 꽂아 두었다가 흘러내렸다
    
    // 전공책 더미: 상판 위에 비스듬히 쌓였다
    const stack: [number, number, string][] = [[2, 13, '#3a4a6a'], [3, 12, '#9a4040'], [1, 14, '#e2dccc'], [3, 11, '#4a6a5a']];
    let sy = 57;
    for (const [dx, w, c] of stack) {
      sy -= 3; const bx = x0 + 2 + dx;
      p.rect(bx, sy, w, 3, c); p.hl(bx, sy, w, mix(c, '#ffffff', 0.25)); p.hl(bx + 1, sy + 1, w - 2, '#ece6d4', c === '#e2dccc' ? 0 : 0.6); p.vl(bx + w - 1, sy, 3, mix(c, '#000000', 0.3));
    }
    p.hl(x0 + 3, 57, 15, '#6e5638', 0.6);
    // 상판 위 영수증들, 볼펜, 머그
    for (const [rx, ry0, rw, rh] of [[19, 52, 4, 5], [22, 55, 5, 3], [17, 57, 3, 3]] as const) { p.rect(x0 + rx, ry0, rw, rh, '#f4f2ea'); p.hl(x0 + rx, ry0 + rh - 1, rw, '#c8c4b8'); p.set(x0 + rx + 1, ry0 + 1, '#8a8a8a'); }
    p.line(x0 + 12, 59, x0 + 17, 58, '#2a4a9a'); p.set(x0 + 17, 58, '#c8c8d0');
    p.rect(x0 + 24, 49, 4, 4, '#e8e4dc'); p.vl(x0 + 27, 49, 4, '#b8b4ac'); p.hl(x0 + 24, 49, 4, '#6a4a32'); p.set(x0 + 28, 50, '#d8d4cc'); // 식은 커피
    // 스탠드: 무게추 받침, 꺾인 팔, 아래를 향한 갓
    const lx = x0 + 29;
    p.ell(lx, 56, 2.6, 1.3, '#3a3c42'); p.hl(lx - 2, 55, 4, '#5a5c64');
    p.line(lx, 55, lx + 1, 42, '#4a4c54'); p.line(lx + 1, 42, lx - 4, 37, '#4a4c54'); p.set(lx + 1, 42, '#7a7c84');
    p.rect(lx - 9, 36, 6, 3, '#3a3c42'); p.hl(lx - 9, 36, 6, '#6a6c74'); p.hl(lx - 8, 39, 4, '#f4ecc8');
    p.line(lx, 56, lx + 2, 60, '#2a2a30'); // 전선
  }

  // ── 창 (4~5열): 알루미늄 새시, 내린 블라인드. 살 틈으로 바깥 가로등의 주황빛. ──
  {
    const x0 = tx(4) + 3, x1 = tx(6) - 3, y0 = 12, y1 = 46;
    p.rect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, '#9aa0a0'); p.hl(x0 - 2, y0 - 2, x1 - x0 + 4, '#c8cecc'); p.vl(x1 + 1, y0 - 2, y1 - y0 + 4, '#6e7474');
    p.rect(x0, y0, x1 - x0, y1 - y0, '#1a2234');
    // 블라인드 살: 2줄 살에 1줄 틈. 틈은 아래·오른쪽(가로등 쪽)으로 갈수록 주황빛이 진하다.
    for (let y = y0 + 3; y < y1 - 2; y++) {
      const k = (y - y0 - 3) % 3;
      for (let x = x0; x < x1; x++) {
        if (k === 2) {
          const g = Math.min(1, Math.max(0, ((x - x0) / (x1 - x0)) * 0.7 + ((y - y0) / (y1 - y0)) * 0.5 - 0.15));
          p.set(x, y, mix('#2a2e44', '#f0a050', g));
        } else p.set(x, y, k === 0 ? '#dcdad0' : '#bebcb2');
      }
    }
    // 누가 손가락으로 벌려 본 살 한 군데
    for (let x = x0 + 14; x < x0 + 20; x++) { p.set(x, y0 + 21, '#f4b860'); p.set(x, y0 + 22, '#e89a48'); }
    p.set(x0 + 13, y0 + 21, '#bebcb2'); p.set(x0 + 20, y0 + 22, '#bebcb2');
    // 블라인드 맨 아래: 다 내리지 않았다. 유리 너머 주황 가로등빛과 어두운 나뭇가지.
    p.rect(x0, y1 - 3, x1 - x0, 1, '#a8a69c');
    for (let x = x0; x < x1; x++) for (let y = y1 - 2; y < y1; y++) p.set(x, y, mix('#2a2e44', '#f0a050', (x - x0) / (x1 - x0) * 0.8));
    p.rect(x0, y0, x1 - x0, 3, '#e4e2da'); p.hl(x0, y0 + 2, x1 - x0, '#a8a69c'); // 헤드 레일
    p.vl(x0 + 5, y0 + 3, 4, '#d8d6cc'); p.set(x0 + 5, y0 + 7, '#bebcb2'); // 짧게 감아 올린 조절 막대
    // 창턱
    p.rect(x0 - 3, y1 + 2, x1 - x0 + 6, 3, '#e0dcd0'); p.hl(x0 - 3, y1 + 2, x1 - x0 + 6, '#f2efe6'); p.hl(x0 - 3, y1 + 5, x1 - x0 + 6, '#7a7e74');
    p.rect(x0 + 1, y1 - 1, 3, 3, '#e8e6e0'); p.set(x0 + 2, y1 - 2, '#5a9a5a'); p.set(x0 + 1, y1 - 2, '#4a8a4a'); // 작은 선인장
    p.rect(x1 - 7, y1 + 1, 5, 1, '#3a3a40'); // 충전기
  }
  // 창 아래 (4~5,1): 작은 냉장고와 서랍장. 위에 전기포트, 컵라면.
  {
    const fx = tx(4) + 2;
    p.rect(fx, 55, 14, 4, '#e8e8e2'); p.hl(fx, 55, 14, '#f8f8f4'); // 윗면
    p.rect(fx, 59, 14, 18, '#d8d8d2'); p.vl(fx, 59, 18, '#ecece6'); p.vl(fx + 13, 59, 18, '#a8a8a2'); p.hl(fx, 76, 14, '#8a8a84');
    p.rect(fx + 11, 62, 1, 6, '#9a9a94'); p.set(fx + 2, 61, '#e85a4a'); // 손잡이, 대기 등
    p.rect(fx + 3, 66, 5, 4, '#f0c850'); p.hl(fx + 3, 66, 5, '#f8e090'); // 스티커
    p.rect(fx + 2, 51, 5, 4, '#f0ece2'); p.hl(fx + 2, 51, 5, '#c84a3a'); // 컵라면
    const dx = tx(5) + 1;
    p.rect(dx, 52, 14, 3, '#eef0f2'); p.hl(dx, 52, 14, '#ffffff');
    p.rect(dx, 55, 14, 22, '#dfe4e8'); p.vl(dx + 13, 55, 22, '#aab0b6');
    for (const yy of [61, 68]) p.hl(dx, yy, 14, '#9aa2a8');
    for (const yy of [57, 63, 70]) p.rect(dx + 5, yy, 4, 1, '#8a9298');
    p.rect(dx + 2, 64, 9, 3, '#c8a0b0', 0.5); p.rect(dx + 2, 58, 8, 2, '#8aa0c8', 0.45); // 반투명 서랍 속 옷
    // 전기포트
    p.rect(dx + 3, 44, 7, 8, '#f2f2ee'); p.vl(dx + 3, 44, 8, '#ffffff'); p.vl(dx + 9, 44, 8, '#bcbcb8'); p.hl(dx + 3, 44, 7, '#d8d8d4');
    p.rect(dx + 10, 46, 2, 4, '#d8d8d4'); p.set(dx + 2, 45, '#d8d8d4'); p.hl(dx + 3, 51, 7, '#6a6a70');
    p.hl(fx, 77, 30, '#1d1820', 0.5); p.dither(fx, 78, 30, 2, '#1d1820', 0, 0.3);
  }
  // 3열 벽: 옷걸이 고리에 수건과 에코백. 6열 벽: 접어서 기대 둔 빨래 건조대에 양말 몇 짝.
  {
    const hx = tx(3) + 3;
    p.hl(hx, 22, 10, '#8a8e94'); p.set(hx + 1, 23, '#5a5e64'); p.set(hx + 8, 23, '#5a5e64');
    p.rect(hx - 1, 24, 6, 16, '#8ab8c8'); p.vl(hx - 1, 24, 16, '#a8d0dc'); p.hl(hx - 1, 37, 6, '#6a98aa'); p.hl(hx - 1, 39, 6, '#ffffff', 0.5);
    p.rect(hx + 6, 24, 7, 13, '#d8ccb0'); p.vl(hx + 6, 24, 13, '#e8dcc0'); p.line(hx + 7, 24, hx + 9, 22, '#c4b898'); p.line(hx + 11, 24, hx + 9, 22, '#c4b898');
    p.rect(hx + 8, 29, 3, 3, '#3a5a8a', 0.8); // 에코백 무늬
    const rx = tx(6) + 3;
    for (let y = 19; y < 52; y += 3) { p.hl(rx + 1, y, 9, '#d4d8dc'); p.hl(rx + 1, y + 1, 9, '#9aa0a6', 0.35); } // 촘촘한 건조대 살
    for (const x of [rx, rx + 10]) { p.vl(x, 15, 48, '#c8ccd0'); p.vl(x + 1, 15, 48, '#8a9096'); p.set(x, 62, '#5a6066'); p.set(x + 1, 62, '#5a6066'); }
    p.hl(rx, 15, 12, '#e4e8ec'); p.hl(rx, 16, 12, '#9aa0a6'); // 접힌 윗단
    // 윗단에 걸쳐 둔 수건 한 장, 살에 집어 둔 양말
    p.rect(rx - 1, 14, 14, 2, '#c8b4e0'); p.hl(rx, 13, 12, '#dccef0'); p.rect(rx, 16, 5, 10, '#c8b4e0'); p.vl(rx, 16, 10, '#dccef0'); p.vl(rx + 4, 16, 10, '#a894c4');
    p.rect(rx + 6, 16, 6, 7, '#b4a0d0'); p.vl(rx + 11, 16, 7, '#9884b4'); p.hl(rx + 6, 22, 6, '#9884b4');
    p.rect(rx + 6, 28, 2, 5, '#f0f0ea'); p.set(rx + 7, 33, '#f0f0ea'); p.rect(rx + 3, 37, 2, 5, '#3a3a44'); p.set(rx + 4, 42, '#3a3a44'); p.rect(rx + 7, 40, 2, 5, '#e6a0a8'); p.set(rx + 8, 45, '#e6a0a8'); // 양말
    for (const [cx, cy] of [[rx + 6, 27], [rx + 3, 36], [rx + 7, 39]] as const) p.hl(cx, cy, 2, '#7ac0e0'); // 빨래집게
    p.hl(rx - 1, WB0 - 1, 13, '#1d1820', 0.4);
  }

  // ── 침대 (1~2열, 7~8열 · 3~4줄): 철제 프레임, 매트리스, 베개, 이불. 머리는 위쪽. ──
  // 누우면 엔진이 머리를 (칸 x*16+15.5, 칸 y*16+10) 에 그린다: 윤서 쪽은 그림 (127.5, 106). 베개를 거기에.
  const bedBody = (x0: number, sheet: string, seed: number): void => {
    const x1 = x0 + 31, my0 = ry(3) + 2, my1 = ry(5) - 6; // 매트리스 윗면 y 98..121
    p.rect(x0 + 1, my0 + 2, 31, my1 - my0 + 12, '#1d1820', 0.35); // 밑 그늘
    // 프레임 옆 레일
    p.rect(x0, my0, 32, my1 - my0 + 4, STEEL); p.vl(x0, my0, my1 - my0 + 4, STEEL_L); p.vl(x1, my0, my1 - my0 + 4, STEEL_D);
    // 매트리스 + 시트
    p.rect(x0 + 1, my0, 30, my1 - my0, sheet); p.hl(x0 + 1, my0, 30, mix(sheet, '#ffffff', 0.25)); p.vl(x0 + 1, my0, my1 - my0, mix(sheet, '#ffffff', 0.12)); p.vl(x1 - 1, my0, my1 - my0, mix(sheet, '#000000', 0.12));
    for (let y = my0 + 2; y < my1; y++) for (let x = x0 + 2; x < x1 - 1; x++) if (rnd(x, y, seed) > 0.95) p.set(x, y, mix(sheet, '#000000', 0.06));
    // 발치 쪽 매트리스 옆면, 프레임 레일, 침대 밑 (보관함), 다리
    p.rect(x0 + 1, my1, 30, 3, mix(sheet, '#000000', 0.18)); p.hl(x0 + 1, my1, 30, mix(sheet, '#000000', 0.08));
    p.rect(x0, my1 + 3, 32, 2, STEEL); p.hl(x0, my1 + 3, 32, STEEL_L); p.hl(x0, my1 + 4, 32, STEEL_D);
    p.rect(x0 + 2, my1 + 5, 28, 5, '#2a2630'); p.hl(x0 + 2, my1 + 5, 28, '#18161c');
    // 침대 밑 반투명 수납함: 철 지난 옷
    p.rect(x0 + 4, my1 + 6, 17, 4, '#b8bcc4'); p.hl(x0 + 4, my1 + 6, 17, '#dce0e6'); p.rect(x0 + 6, my1 + 7, 13, 3, mix('#b8bcc4', seed % 2 ? '#8a6a8a' : '#5a7aa0', 0.5)); p.vl(x0 + 20, my1 + 6, 4, '#8a8e96');
    p.rect(x0, my1 + 5, 2, 6, STEEL_D); p.rect(x1 - 1, my1 + 5, 2, 6, STEEL_D); p.set(x0, my1 + 10, '#2a2e34'); p.set(x1, my1 + 10, '#2a2e34');
    // 발치 난간: 매트리스 위로 조금 솟은 쇠파이프
    p.rect(x0, my1 - 5, 2, 8, STEEL); p.vl(x0, my1 - 5, 8, STEEL_L); p.rect(x1 - 1, my1 - 5, 2, 8, STEEL); p.vl(x1, my1 - 5, 8, STEEL_D);
    p.hl(x0, my1 - 5, 32, STEEL_L); p.hl(x0, my1 - 4, 32, STEEL); p.hl(x0 + 2, my1 - 3, 28, STEEL_D, 0.6);
    p.set(x0, my1 - 6, STEEL_L); p.set(x1, my1 - 6, STEEL);
  };
  const pillow = (cx: number, cy: number, col: string, dent: boolean): void => {
    const L = mix(col, '#ffffff', 0.35), D = mix(col, '#000000', 0.2);
    p.rect(cx - 10, cy - 4, 21, 9, col); p.hl(cx - 9, cy - 5, 19, L); p.hl(cx - 9, cy + 5, 19, D);
    p.vl(cx - 11, cy - 3, 7, mix(col, '#000000', 0.08)); p.vl(cx + 11, cy - 3, 7, D);
    p.hl(cx - 8, cy - 4, 14, L, 0.6);
    if (dent) { p.ell(cx + 0.5, cy + 0.5, 6, 2.6, D, 0.45); p.hl(cx - 4, cy - 2, 8, mix(col, '#000000', 0.1), 0.6); }
  };

  // 천: 높이 함수에서 기울기를 구해 왼쪽 위 빛으로 다섯 톤을 고른다. 주름과 뭉친 덩어리가 한 결로 이어진다.
  const cloth = (x0: number, y0: number, x1: number, y1: number, inside: (x: number, y: number) => boolean, h: (x: number, y: number) => number, pal: string[], print?: (x: number, y: number) => boolean): void => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!inside(x, y)) continue;
      const gx = h(x + 1, y) - h(x - 1, y), gy = h(x, y + 1) - h(x, y - 1);
      const v = (0.55 * gx + 0.8 * gy) * 0.38; // 왼쪽 위를 향한 면(높이가 오른쪽·아래로 오르는 면)이 밝다
      let k = v > 0.55 ? 0 : v > 0.18 ? 1 : v > -0.18 ? 2 : v > -0.55 ? 3 : 4;
      if (!inside(x, y + 1) || !inside(x + 1, y)) k = Math.max(k, 3); // 아래·오른쪽 가장자리는 그늘
      if (k === 2 && print && print(x, y)) k = 1;
      p.set(x, y, pal[k]);
    }
  };
  const bump = (x: number, y: number, cx: number, cy: number, rx: number, ry0: number, hh: number): number => {
    const dx = (x - cx) / rx, dy = (y - cy) / ry0, d = 1 - dx * dx - dy * dy;
    return d > 0 ? hh * d * (2 - d) : 0; // 가장자리가 부드럽게 내려앉는다
  };
  const ridge = (x: number, y: number, ax: number, ay: number, bx: number, by: number, wdt: number, hh: number): number => {
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    const d = Math.hypot(x - ax - vx * t, y - ay - vy * t) / wdt, taper = Math.sin(t * Math.PI) * 0.7 + 0.3;
    return d < 1 ? hh * taper * (1 - d * d) : 0;
  };

  // 룸메이트 침대: 이불을 머리끝까지 뒤집어쓰고 벽 쪽으로 돌아누웠다. 베개 귀퉁이만 보인다.
  {
    const x0 = tx(1), my0 = ry(3) + 2, my1 = ry(5) - 6;
    bedBody(x0, '#d8d4cc', 530);
    pillow(x0 + 16, ry(3) + 8, '#e8e2d4', false);
    const pal = ['#c4dce2', '#9fbcc6', '#83a2ae', '#66848f', '#4e6874'];
    const inside = (x: number, y: number): boolean => {
      if (y >= my1 || x < x0 + 1 || x > x0 + 30) return false;
      const topE = x > x0 + 21 ? my0 + 10 + (x - x0 - 21) * 0.4 : my0 + 3 + Math.sin(x * 0.8) * 0.6; // 오른쪽 위로 베개 귀퉁이가 나온다
      return y >= topE;
    };
    // 머리(이불 속) → 웅크린 등 → 접은 무릎. 하나로 이어진 둥근 덩어리.
    // 몸의 등줄기를 따라 굽은 관 하나 (겹치는 곳은 max 로: 안장처럼 꺼지지 않게)
    const spine = [[x0 + 13, my0 + 5], [x0 + 11, my0 + 12], [x0 + 13, my0 + 18], [x0 + 20, my0 + 21]];
    const tube = (x: number, y: number): number => {
      let best = 0;
      for (let i = 0; i + 1 < spine.length; i++) {
        const [ax, ay] = spine[i], [bx, by] = spine[i + 1], vx = bx - ax, vy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        const wdt = 8.5 - i * 1.2, d = Math.hypot(x - ax - vx * t, y - ay - vy * t) / wdt;
        if (d < 1) { const q = 1 - d * d; best = Math.max(best, (7.5 - i * 1.1) * q * (2 - q)); }
      }
      return best;
    };
    const h = (x: number, y: number): number => tube(x, y) + ridge(x, y, x0 + 22, my0 + 13, x0 + 28, my0 + 19, 2, 0.6) + ridge(x, y, x0 + 3, my0 + 21, x0 + 9, my0 + 22, 2, 0.6);
    cloth(x0 + 1, my0, x0 + 31, my1, inside, h, pal);
    for (let y = my0; y < my1; y++) for (let x = x0 + 1; x < x0 + 31; x++) // 덩어리가 오른쪽 아래 이불 위로 지우는 그늘
      if (inside(x, y) && tube(x, y) < 0.6 && tube(x - 2, y - 2) > 2) p.set(x, y, pal[3]);
    p.vl(x0, my0 + 8, my1 - my0 - 8, pal[3]); p.vl(x0 - 1, my0 + 12, my1 - my0 - 16, pal[4]); // 벽 쪽으로 늘어진 이불 자락
  }

  // 윤서 침대: 이불이 흐트러졌다. 한쪽 자락은 바닥으로 흘렀다. 베개 가운데가 꺼졌고, 그 옆에 휴대폰.
  {
    const x0 = tx(7), my0 = ry(3) + 2, my1 = ry(5) - 6;
    bedBody(x0, '#dcd6d0', 540);
    pillow(x0 + 16, ry(3) + 9, '#eee8e0', true);
    // 시트가 구겨졌다
    p.line(x0 + 4, my0 + 13, x0 + 9, my0 + 12, '#c4bcb4'); p.line(x0 + 24, my0 + 14, x0 + 28, my0 + 15, '#c4bcb4');
    const pal = ['#f2d8da', '#dcb2b8', '#c4959d', '#a4747e', '#7e5660'];
    const edge = (x: number): number => my0 + 12 + Math.sin(x * 0.45) * 1.2 + (x < x0 + 9 ? (x0 + 9 - x) * 0.7 : 0);
    const inside = (x: number, y: number): boolean => y < my1 && x >= x0 + 1 && x <= x0 + 30 && y >= edge(x);
    const h = (x: number, y: number): number =>
      ridge(x, y, x0 + 4, edge(x) + 1.5, x0 + 28, edge(x) + 1.5, 2.2, 1.6) // 접혀 넘어간 윗단
      + bump(x, y, x0 + 21, my0 + 19, 10, 6, 4.5) + bump(x, y, x0 + 9, my0 + 19, 6, 4, 2) // 걷어차여 뭉친 덩어리
      + ridge(x, y, x0 + 3, my0 + 22, x0 + 14, my0 + 16, 2.4, 1.8) + ridge(x, y, x0 + 15, my0 + 23, x0 + 27, my0 + 15, 2.2, 1.4)
      + ridge(x, y, x0 + 6, my1 - 1, x0 + 16, my1 - 4, 2, 1.2);
    cloth(x0 + 1, my0, x0 + 31, my1, inside, h, pal);
    for (let x = x0 + 2; x < x0 + 30; x++) { const e = Math.ceil(edge(x)); if (inside(x, e)) p.set(x, e, '#fbeeee'); } // 안감
    // 왼쪽(통로 쪽)으로 흘러내린 자락: 옆 레일을 덮고 바닥에 고였다. 세로 주름.
    const dy0 = my0 + 15, dy1 = ry(5) + 1;
    for (let y = dy0; y < dy1; y++) {
      const t = (y - dy0) / (dy1 - dy0), xl = Math.round(x0 - 1 - t * 4 - Math.sin(t * 3) * 0.8), xr = x0 + 2;
      for (let x = xl; x <= xr; x++) {
        const f = x - xl, fold = f === 2 || f === 5; // 세로 주름 두 줄
        p.set(x, y, x === xl ? pal[4] : y < dy0 + 2 ? pal[1] : fold ? pal[3] : f === 3 || f === 6 ? pal[1] : pal[2]);
      }
    }
    p.ell(x0 - 3, dy1, 4, 1.6, pal[3]); p.hl(x0 - 6, dy1 - 1, 6, pal[2]); p.hl(x0 - 6, dy1 + 2, 7, '#1d1820', 0.4);
    // 휴대폰: 베개 옆, 이불 끝에 반쯤 묻혔다. 화면이 켜져 있다.
    const fx = x0 + 24, fy = my0 + 12;
    p.rect(fx, fy, 5, 7, '#1c1c24'); p.rect(fx + 1, fy + 1, 3, 5, '#bcd8f4'); p.hl(fx + 1, fy + 1, 3, '#e8f4ff'); p.set(fx + 2, fy + 3, '#7aa8d8');
    // 충전 줄: 책상 밑 콘센트에서 바닥을 따라 침대 옆 레일로 올라온다
    { const pts = [[x0 + 3, ry(2) - 2], [x0 - 2, ry(2) + 3], [x0 - 4, ry(2) + 10], [x0 - 2, my0 + 2], [x0, my0 + 5]];
      for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#34343c'); }
  }
  // ── 바닥의 것들 ──
  {
    // 윤서 슬리퍼: 한 짝은 뒤집혔다
    const sx = tx(6) + 2, sy = ry(5) + 4;
    const slipper = (x: number, y: number, sole: string, band: string): void => { // 위에서 본 슬리퍼: 둥근 바닥에 가로 띠
      p.rect(x, y + 1, 4, 5, sole); p.hl(x + 1, y, 2, sole); p.hl(x + 1, y + 6, 2, sole); p.vl(x + 3, y + 1, 5, mix(sole, '#000000', 0.2));
      p.rect(x, y + 3, 4, 2, band); p.hl(x, y + 3, 4, mix(band, '#ffffff', 0.3)); p.hl(x + 1, y + 7, 3, '#1d1820', 0.35);
    };
    slipper(sx, sy, '#c8ccd4', '#4a5a7a');
    p.rect(sx + 6, sy + 4, 6, 3, '#8a8e96'); p.hl(sx + 7, sy + 3, 4, '#8a8e96'); p.hl(sx + 7, sy + 7, 4, '#8a8e96'); p.hl(sx + 7, sy + 3, 4, '#a4a8b0'); p.hl(sx + 7, sy + 8, 4, '#1d1820', 0.35); // 뒤집힌 한 짝: 밑창
    p.dots(`${sx + 8},${sy + 5} ${sx + 10},${sy + 5}`, '#6e727a');
    // 룸메이트 슬리퍼: 가지런히
    const rx = tx(3) + 3, ry0 = ry(4) + 6;
    for (const dx of [0, 5]) slipper(rx + dx, ry0, '#f4e4e8', '#e8a0b0');
    // 문 앞 신발 두 켤레: 운동화와 알바 갈 때 신는 검은 단화
    const shoe = (x: number, y: number, c: string, sole: string, lace: string): void => { // 위에서 본 신발: 앞코가 아래(문 쪽)
      p.rect(x, y, 3, 5, c); p.set(x + 1, y + 5, c); p.vl(x, y, 5, mix(c, '#ffffff', 0.3)); p.vl(x + 2, y + 1, 4, sole);
      p.set(x + 1, y, '#2a2228'); p.set(x + 1, y + 1, '#4a3e44'); p.set(x + 1, y + 3, lace); // 발 넣는 구멍, 끈
      p.hl(x, y + 6, 3, '#1d1820', 0.35);
    };
    shoe(tx(4) + 4, ry(5) + 6, '#ece8e0', '#bab4aa', '#c84a5a'); shoe(tx(4) + 8, ry(5) + 7, '#ece8e0', '#bab4aa', '#c84a5a');
    shoe(tx(5) + 6, ry(5) + 7, '#2e2e36', '#18181c', '#4a4a52'); shoe(tx(5) + 10, ry(5) + 6, '#2e2e36', '#18181c', '#4a4a52');
    // 의자 두 개: 책상 밑으로 밀어 넣었다. 윤서 의자 등받이엔 알바 앞치마.
    const chair = (cx: number, col: string): void => {
      p.rect(cx - 6, 63, 12, 9, col); p.hl(cx - 6, 63, 12, mix(col, '#ffffff', 0.2)); p.vl(cx + 5, 63, 9, mix(col, '#000000', 0.25));
      p.rect(cx - 1, 72, 2, 4, '#3a3a40'); p.hl(cx - 5, 76, 10, '#2a2a30'); p.set(cx - 5, 77, '#1a1a1e'); p.set(cx + 4, 77, '#1a1a1e');
    };
    chair(tx(2) + 2, '#5a5a66');
    chair(tx(7) + 12, '#5a5a66');
    p.rect(tx(7) + 7, 63, 9, 11, '#2e5a44'); p.hl(tx(7) + 7, 63, 9, '#40745a'); p.vl(tx(7) + 15, 63, 11, '#22463a'); p.set(tx(7) + 10, 66, '#e8e2c8'); p.hl(tx(7) + 8, 73, 7, '#22463a'); // 앞치마
  }

  // ── 옆벽, 아래 벽 문틀 너머 복도 ──
  p.rect(10, 0, 6, ry(6) + 6, SLAB); p.vl(15, 0, ry(6), SLAB_L);
  p.rect(W - 16, 0, 6, ry(6) + 6, SLAB); p.vl(W - 16, 0, ry(6), SLAB_L);
  for (let y = ry(6) + 2; y < H; y++) for (let x = tx(4); x < tx(6); x++) { const n = rnd(x, y, 560); p.set(x, y, n > 0.93 ? '#8a8a84' : n < 0.05 ? '#b4b4ac' : '#a2a29a'); } // 복도 테라조
  p.rect(tx(4), ry(6), tx(2), 2, '#e4e0d4'); p.hl(tx(4), ry(6) + 1, tx(2), '#9a968a'); // 문턱

  const props: Prop[] = [];
  { // 침대 머리판: 매트리스보다 조금 솟은 쇠파이프. 2줄에 선 사람의 발을 가린다.
    const L = new Pix(W, H);
    for (const x0 of [tx(1), tx(7)]) {
      const x1 = x0 + 31, yb = ry(3) + 3;
      L.rect(x0, yb - 8, 2, 10, STEEL); L.vl(x0, yb - 8, 10, STEEL_L); L.rect(x1 - 1, yb - 8, 2, 10, STEEL); L.vl(x1, yb - 8, 10, STEEL_D);
      L.set(x0, yb - 9, STEEL_L); L.set(x1, yb - 9, STEEL); L.set(x0 + 1, yb - 9, STEEL);
      L.hl(x0 + 2, yb - 7, 28, STEEL_L); L.hl(x0 + 2, yb - 6, 28, STEEL_D);
      L.hl(x0 + 2, yb - 3, 28, STEEL); L.hl(x0 + 2, yb - 2, 28, STEEL_D);
      for (let x = x0 + 6; x < x1 - 4; x += 6) L.vl(x, yb - 5, 2, STEEL_D);
    }
    props.push(cut(L, top, 3 * T));
  }
  { // 룸메이트 침대 발치 난간에 널어 둔 수건 (빨래)
    const L = new Pix(W, H), x0 = tx(1) + 3, y0 = ry(5) - 12; // y0: 발치 난간 윗선
    const C0 = '#ecd48c', C1 = '#f8e8b0', C2 = '#cdb06a';
    L.rect(x0 + 1, y0 - 4, 7, 3, C2); L.hl(x0 + 1, y0 - 4, 7, C0); // 난간 너머(이불 쪽)로 넘어간 자락
    L.rect(x0, y0 - 1, 9, 2, C1); L.hl(x0 + 1, y0 - 2, 7, '#fff4cc'); // 난간에 걸친 접힌 자리
    L.rect(x0, y0 + 1, 9, 12, C0); L.vl(x0, y0 + 1, 12, C1); L.vl(x0 + 8, y0 + 1, 12, C2); L.vl(x0 + 5, y0 + 3, 8, C2, 0.6);
    L.hl(x0, y0 + 9, 9, '#e08a6a'); // 줄무늬
    for (let x = x0; x < x0 + 9; x += 2) L.set(x, y0 + 13, C0); // 올 풀린 끝
    props.push(cut(L, top, 5 * T - 3));
  }
  { // 앞벽: 문 자리(4~5열)만 비었다. 문짝은 닫혀 벽 두께 안에 위쪽 모서리만 보인다.
    const L = new Pix(W, H), y = ry(6);
    L.rect(10, y, tx(4) - 10, 6, SLAB); L.hl(16, y, tx(4) - 16, SLAB_L);
    L.rect(tx(6), y, W - 10 - tx(6), 6, SLAB); L.hl(tx(6), y, W - 16 - tx(6), SLAB_L);
    for (const jx of [tx(4) - 2, tx(6)]) { L.rect(jx, y - 2, 2, 8, '#7a6450'); L.vl(jx, y - 2, 8, '#9a8268'); } // 문틀
    L.rect(tx(4), y + 2, tx(2), 3, '#b49a78'); L.hl(tx(4), y + 2, tx(2), '#ccb490'); L.hl(tx(4), y + 4, tx(2), '#7a6450'); // 문짝 윗모서리
    L.rect(tx(6) - 5, y, 2, 2, '#c8ccd0'); L.set(tx(6) - 5, y, '#eef0f2'); // 안쪽 손잡이
    props.push(cut(L, top, 6 * T + 1));
  }
  return { base: p, props };
}
