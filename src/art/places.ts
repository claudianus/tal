// 걸어 다니는 바깥 맵들. 방(room.ts)처럼 맵 하나를 통째로 한 장으로 그린다.
// 그림의 (0,0) 은 맵의 (0, -top) 이다. 벽은 맵 위로 top 만큼 더 솟아 있다.
// 사람보다 앞에 서는 것(난간, 가로등 기둥, 나뭇잎, 그네 틀)은 props 로 따로 떼어서, 사람과 함께 발 위치 순서로 그린다.
// 색은 불이 켜진 상태로 칠한다. 어둠과 빛은 world.ts 가 덮는다.
import { Pix, mix, rnd } from './pix.ts';
import { MAPS } from '../maps.ts';

import { T, DIG, ART, text, cut, concrete, crack, type Prop, type PlaceState, type Place } from './kit.ts';
import { subway, trainPix, trainDoorOpen } from './places_subway.ts';
import { funeral, er, feetPix } from './places_funeral.ts';
import { concourse, platform } from './places_station.ts';
import { store, restroom } from './places_store.ts';
import { grandma } from './places_grandma.ts';
import { campus } from './places_campus.ts';
import { dorm } from './places_dorm.ts';
import { cafeteria } from './places_cafeteria.ts';
export type { Prop, PlaceState, Place } from './kit.ts';

// ═══════════════════ 11층 복도 ═══════════════════
const C_TOP = 56, WB = C_TOP + T; // WB: 벽이 바닥과 만나는 줄 (그림 좌표). 문은 사람보다 한 뼘 크다.
function steelDoor(p: Pix, tx: number, num: string, kind: 'home' | 'next' | 'other', seed: number, open = false): void {
  const w = 24, h = 52, x0 = tx * T + 4, y0 = WB - h;
  // 문틀: 시멘트 벽을 파고 들어간 철제 틀
  p.rect(x0 - 3, y0 - 3, w + 6, h + 3, '#5f6a66'); p.hl(x0 - 3, y0 - 3, w + 6, '#7d8883'); p.vl(x0 - 3, y0 - 3, h + 3, '#76817c'); p.vl(x0 + w + 2, y0 - 3, h + 3, '#46504c');
  p.rect(x0 - 1, y0 - 1, w + 2, h + 1, '#2f3532');
  // 문짝: 녹색 도는 회색 철문. 위아래 두 칸으로 눌린 무늬.
  const DOOR = kind === 'home' ? '#76877f' : '#7c8b8d', DL = mix(DOOR, '#ffffff', 0.16), DD = mix(DOOR, '#000000', 0.2), D3 = mix(DOOR, '#000000', 0.35);
  p.rect(x0, y0, w, h, DOOR);
  p.vl(x0, y0, h, DL); p.hl(x0, y0, w, DL); p.vl(x0 + w - 1, y0, h, DD);
  for (const [py, ph] of [[y0 + 12, 16], [y0 + 31, 17]] as const) {
    p.hl(x0 + 3, py, w - 6, DD); p.vl(x0 + 3, py, ph, DD); p.hl(x0 + 3, py + ph, w - 6, DL); p.vl(x0 + w - 4, py, ph + 1, DL);
  }
  // 오래된 철문: 아래쪽이 녹슬고 발로 찬 자국이 있다
  for (let y = y0 + h - 8; y < y0 + h; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) if (rnd(x, y, seed) > 0.78) p.set(x, y, '#7a5a44', 0.5);
  p.hl(x0, y0 + h - 1, w, D3);
  // 문패, 외시경, 도어록, 손잡이
  p.rect(x0 + 3, y0 + 3, 18, 7, '#d7d3c2'); p.hl(x0 + 3, y0 + 9, 18, '#9d9988'); p.vl(x0 + 20, y0 + 3, 7, '#b4b0a0');
  text(p, x0 + 5, y0 + 4, num, '#3a3a40');
  p.set(x0 + 12, y0 + 18, '#1a1c1e'); p.set(x0 + 12, y0 + 17, '#b9c0bc');
  p.rect(x0 + 18, y0 + 24, 4, 9, '#1e2124'); p.hl(x0 + 18, y0 + 24, 4, '#3d4246'); p.set(x0 + 19, y0 + 26, kind === 'home' ? '#7fe39a' : '#4a6a52'); p.rect(x0 + 19, y0 + 28, 2, 3, '#2c3034');
  p.rect(x0 + 17, y0 + 35, 5, 2, '#c4c8c4'); p.set(x0 + 21, y0 + 35, '#e8ece8'); p.hl(x0 + 17, y0 + 37, 5, '#3a3f3c');
  if (kind === 'home') { // 문틈에 꽂힌 채 쌓인 전단지. 아무도 빼지 않는다.
    p.rect(x0 + 1, y0 + 14, 4, 6, '#e8e2c8'); p.hl(x0 + 1, y0 + 16, 4, '#c44a3a'); p.rect(x0 + 2, y0 + 20, 4, 5, '#f0d878'); p.rect(x0 + 1, y0 + 25, 5, 3, '#dcdcd4');
    p.rect(x0 + 5, y0 + 42, 7, 5, '#efeadc'); p.hl(x0 + 5, y0 + 43, 7, '#4a7ac4'); p.hl(x0 + 6, y0 + 45, 5, '#a8a494');
  } else if (kind === 'next') { // 옆집: 우유 주머니, 현관 매트
    p.rect(x0 + 2, y0 + 19, 5, 7, '#e6dcc6'); p.hl(x0 + 2, y0 + 19, 5, '#c8b890'); p.set(x0 + 4, y0 + 18, '#8d8468'); p.dots(`${x0 + 3},${y0 + 22} ${x0 + 5},${y0 + 23}`, '#5a8ac0');
  } else if (rnd(tx, 0, seed) > 0.4) { // 다른 집: 붙었다 떨어진 스티커, 테이프 자국
    p.rect(x0 + 4, y0 + 30, 6, 4, '#e0d8b8', 0.8); p.set(x0 + 4, y0 + 30, '#c8c0a0');
  }
  if (open) { // 문이 바깥으로 열렸다: 남의 집 현관이 들여다보인다. 노란 형광등, 신발장, 벗어 둔 슬리퍼.
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const fl = y > y0 + h - 12, k = (y - y0) / h;
      p.set(x, y, fl ? (rnd(x, y, seed + 9) > 0.9 ? '#8a7558' : '#9c8664') : mix('#f2dfaa', '#b89c6c', k));
    }
    p.rect(x0 + 1, y0 + 14, 7, 26, '#7a5a3e'); p.hl(x0 + 1, y0 + 14, 7, '#9a7854'); p.hl(x0 + 1, y0 + 26, 7, '#5a412c'); // 신발장
    p.rect(x0 + 2, y0 + 10, 5, 4, '#6aa070'); p.set(x0 + 4, y0 + 9, '#4a7a50');                                           // 신발장 위 화분
    p.rect(x0 + 12, y0 + h - 7, 5, 2, '#d06a8a'); p.rect(x0 + 18, y0 + h - 6, 5, 2, '#d06a8a');                           // 슬리퍼
    p.rect(x0 + 10, y0 + 1, 8, 2, '#fffbe8');                                                                               // 현관등
    // 열린 문짝: 경첩이 오른쪽, 복도로 비스듬히 나와 있다
    const DOOR = '#7c8b8d', DD = mix(DOOR, '#000000', 0.25);
    for (let i = 0; i < 9; i++) { const x = x0 + w + 2 + i, t = Math.floor(i * 0.7); p.vl(x, y0 - 2 + t, h + 2 - t * 2 + 4, i < 2 ? DD : i > 7 ? mix(DOOR, '#ffffff', 0.15) : DOOR); }
    p.rect(x0 + w + 6, y0 + 33, 3, 2, '#c4c8c4');
  }
  // 문턱
  p.rect(x0 - 3, y0 + h, w + 6, 2, '#a6a49a'); p.hl(x0 - 3, y0 + h + 2, w + 6, '#5f5e57');
}
function kitchenWindow(p: Pix, tx: number, lit: boolean, day: boolean, seed: number): void {
  const x0 = tx * T + 3, w = 26, h = 17, y0 = WB - 44;
  p.rect(x0 - 2, y0 - 2, w + 4, h + 4, '#5d6662'); p.hl(x0 - 2, y0 - 2, w + 4, '#78827d');
  // 유리
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    let col: string;
    if (lit) col = y < y0 + 3 ? '#d6ae6c' : '#e9c47c';
    else if (day) col = mix('#9fb1b9', '#dfe8e6', (x - x0 + (y0 + h - y)) / (w + h));
    else col = mix('#151b27', '#243044', (y - y0) / h);
    if (!lit && ((x - x0) - (y - y0) * 0.9 > 3 && (x - x0) - (y - y0) * 0.9 < 6)) col = mix(col, '#ffffff', day ? 0.35 : 0.08); // 비친 빛 한 줄기
    p.set(x, y, col);
  }
  if (lit) { // 꽃무늬 커튼이 반쯤 쳐져 있다. 틈으로 TV 불빛.
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + 15; x++) {
      const k = (x * 3 + y * 5) % 11;
      p.set(x, y, k === 0 ? '#e8a6a0' : (x - x0) % 4 === 3 ? '#b8786e' : '#cf9388');
    }
    p.rect(x0 + 16, y0 + 5, 6, 6, '#86a8ec'); p.rect(x0 + 17, y0 + 6, 4, 4, '#b4ccf8');
    p.dots(`${x0 + 23},${y0 + 12} ${x0 + 24},${y0 + 12} ${x0 + 23},${y0 + 11}`, '#9a7040'); // 창가의 세제 병
  } else if (!day) {
    p.rect(x0 + 18, y0 + h - 6, 3, 6, '#2c3444'); p.rect(x0 + 21, y0 + h - 4, 3, 4, '#303a4c'); // 창 안쪽 그릇 실루엣
  }
  p.vl(x0 + 13, y0, h, '#4c5551'); // 미닫이 창의 가운데 틀
  // 방범창: 세로 쇠창살
  for (let x = x0; x < x0 + w; x += 4) { p.vl(x, y0 - 1, h + 2, '#39403d'); p.vl(x + 1, y0 - 1, h + 2, '#58615d', 0.6); }
  p.hl(x0 - 1, y0 - 1, w + 2, '#39403d'); p.hl(x0 - 1, y0 + h, w + 2, '#39403d');
  // 창턱: 앞으로 나온 시멘트 턱과 그 아래 그늘
  p.rect(x0 - 3, y0 + h + 2, w + 6, 2, '#c8c6b2'); p.hl(x0 - 3, y0 + h + 4, w + 6, '#6c7a70'); p.dither(x0 - 2, y0 + h + 5, w + 4, 2, '#3c4a42', 0, 0.35);
  // 창턱의 빗물 자국
  for (let i = 0; i < 4; i++) { const x = x0 + 2 + Math.floor(rnd(i, tx, seed) * (w - 4)); p.vl(x, y0 + h + 5, 4 + Math.floor(rnd(tx, i, seed) * 6), '#5e7066', 0.35); }
}
function corridor(s: PlaceState): Place {
  const m = MAPS.corridor, cols = m.grid[0].length, W = cols * T, H = m.grid.length * T + C_TOP;
  const p = new Pix(W, H);
  // 천장 밑면과 천장등
  p.rect(0, 0, W, 6, '#43443f'); p.hl(0, 5, W, '#2e2f2b');
  for (const [lx, dead] of [[64, false], [224, false], [304, true], [384, false]] as const) {
    p.rect(lx, 1, 16, 4, dead ? '#8e8f86' : '#eef2e4'); p.hl(lx, 4, 16, dead ? '#6a6b64' : '#c9cebf'); p.rect(lx - 1, 0, 18, 1, '#2a2b27');
    if (dead) p.dots(`${lx + 4},2 ${lx + 9},3 ${lx + 12},2`, '#3a3a34'); // 날벌레 시체
  }
  // 벽: 위는 누런 미색, 허리 아래는 초록 페인트. 경계에 가는 줄.
  const B1 = WB - 26, B2 = WB - 24, B3 = WB - 4; // 미색 / 줄 / 초록 / 걸레받이
  for (let y = 6; y < WB; y++) for (let x = 0; x < W; x++) {
    let col = y < B1 ? '#b7b49e' : y < B2 ? '#7f8f84' : y < B3 ? '#6f8a7b' : '#4e6157';
    const n = rnd(x, y, 21);
    if (y < B1 && n > 0.93) col = '#aba891';
    if (y >= B2 && y < B3 && n > 0.92) col = '#668072';
    if (y >= B2 && y < B3 && n < 0.03) col = '#7d978a';
    p.set(x, y, col);
  }
  p.hl(0, 6, W, '#8f8c78'); p.hl(0, B1, W, '#94a397'); p.hl(0, B3, W, '#5d7266');
  // 천장 밑에서 흘러내린 때
  for (let x = 0; x < W; x += 1) if (rnd(x, 1, 22) > 0.86) p.vl(x, 7, 3 + Math.floor(rnd(x, 2, 22) * 14), '#9f9c86', 0.55);
  // 허리 밑 긁힌 자국 (자전거 손잡이, 유모차)
  for (let i = 0; i < 26; i++) { const x = Math.floor(rnd(i, 3, 23) * W), y = B2 + 3 + Math.floor(rnd(i, 4, 23) * 14); p.hl(x, y, 2 + Math.floor(rnd(i, 5, 23) * 5), '#8aa395', 0.6); }
  // 칸막이 기둥 ('#' 타일): 앞으로 살짝 나온 기둥
  m.grid[0].split('').forEach((ch, tx) => {
    if (ch !== '#' || tx === 0 || tx === cols - 1) return;
    const x = tx * T;
    p.vl(x + 2, 6, WB - 6, '#c9c6b0'); p.vl(x + 13, 6, WB - 6, '#8a8774'); p.vl(x + 14, 6, WB - 6, '#6c6a5a', 0.6);
    p.vl(x + 2, B2, B3 - B2, '#82a092'); p.vl(x + 13, B2, B3 - B2, '#4f6559');
  });
  // 집들
  steelDoor(p, 1, '1106', 'home', 1); kitchenWindow(p, 3, false, s.day, 1);
  steelDoor(p, 6, '1107', 'next', 2, s.door === '1107'); kitchenWindow(p, 8, !s.day, s.day, 2);
  steelDoor(p, 11, '1108', 'other', 3); kitchenWindow(p, 13, false, s.day, 3);
  steelDoor(p, 16, '1109', 'other', 4); kitchenWindow(p, 18, false, s.day, 4);
  // 엘리베이터: 스테인리스 문 두 짝, 위에 층 표시
  {
    const x0 = 21 * T + 2, w = 28, h = 52, y0 = WB - h;
    p.rect(x0 - 3, y0 - 13, w + 6, h + 13, '#a4abac'); p.hl(x0 - 3, y0 - 13, w + 6, '#c9cfd0'); p.vl(x0 + w + 2, y0 - 13, h + 13, '#7c8384');
    p.rect(x0 + 6, y0 - 11, 16, 8, '#121314'); text(p, x0 + 10, y0 - 10, '1', '#ff6a50'); p.dots(`${x0 + 17},${y0 - 9} ${x0 + 16},${y0 - 8} ${x0 + 18},${y0 - 8} ${x0 + 17},${y0 - 7}`, '#ff6a50');
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const k = ((x - x0) % 14) / 14;
      p.set(x, y, mix('#c3c9ca', '#8b9293', k));
    }
    p.vl(x0 + 13, y0, h, '#5c6263'); p.vl(x0 + 14, y0, h, '#dfe4e4');
    p.dots(`${x0 + 4},${y0 + 10} ${x0 + 5},${y0 + 11} ${x0 + 20},${y0 + 30}`, '#e8ecec');
    p.rect(x0 + 2, y0 + 14, 9, 6, '#f2efe4', 0.9); p.hl(x0 + 3, y0 + 16, 7, '#5a5a5a', 0.7); p.hl(x0 + 3, y0 + 18, 5, '#5a5a5a', 0.7); // 점검 안내문
    p.rect(x0 - 3, y0 + h, w + 6, 2, '#8d9394');
    // 호출 버튼
    p.rect(x0 + w + 5, y0 + 18, 6, 12, '#9aa1a2'); p.hl(x0 + w + 5, y0 + 18, 6, '#c4caca');
    p.rect(x0 + w + 7, y0 + 20, 2, 2, '#ffd890'); p.rect(x0 + w + 7, y0 + 25, 2, 2, '#5a5f60');
  }
  // 계단실 입구: 열린 문틀, 안은 어둡고 계단이 내려간다. 위에 비상구 등.
  {
    const x0 = 25 * T + 3, w = 26, h = 52, y0 = WB - h;
    p.rect(x0 - 3, y0 - 3, w + 6, h + 3, '#5f6a66'); p.hl(x0 - 3, y0 - 3, w + 6, '#7d8883');
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, mix('#2a2e30', '#0d0f10', (y - y0) / h));
    for (let i = 0; i < 6; i++) { const y = y0 + 22 + i * 4; p.hl(x0 + 2 + i * 2, y, w - 4 - i * 2, '#3a3f42'); p.hl(x0 + 2 + i * 2, y + 1, w - 4 - i * 2, '#1c1f21'); }
    p.line(x0 + 3, y0 + 18, x0 + 14, y0 + 40, '#52585a');
    const sy = 7, g = new Pix(W, H); // 비상구 표시는 문틀 위
    g.rect(x0 + 5, 3, 16, 9, '#e6ece6'); g.rect(x0 + 6, 4, 14, 7, '#27a55a');
    g.dots(`${x0 + 9},5 ${x0 + 9},6 ${x0 + 8},7 ${x0 + 10},7 ${x0 + 9},8 ${x0 + 8},9 ${x0 + 10},9 ${x0 + 11},6`, '#f4fff4');
    g.dots(`${x0 + 14},7 ${x0 + 15},7 ${x0 + 16},7 ${x0 + 17},7 ${x0 + 16},6 ${x0 + 16},8`, '#f4fff4');
    p.blit(g, 0, sy - 3);
  }
  // 벽 밑에 놓인 것들 (막힌 칸 위라서 아무도 밟지 않는다). 벽 밑줄이 64 이던 때의 좌표로 그려서 내려 붙인다.
  const base = p;
  {
    const p = new Pix(W, H);
  // 우리 집 창 밑: 노끈으로 묶은 신문 더미, 부러진 우산
  p.rect(56, 54, 14, 9, '#d7d0bb'); p.hl(56, 54, 14, '#ebe6d6'); for (let y = 56; y < 63; y += 2) p.hl(56, y, 14, '#b8b09a'); p.vl(62, 54, 9, '#a0784a'); p.hl(56, 58, 14, '#a0784a');
  p.line(72, 46, 76, 63, '#27272c'); p.line(73, 46, 77, 63, '#3c3c44'); p.dots('71,45 72,44', '#27272c');
  // 1108 앞: 택배 상자 둘
  p.rect(212, 50, 15, 13, '#a68a62'); p.hl(212, 50, 15, '#bea078'); p.vl(219, 50, 13, '#8a7050'); p.rect(214, 54, 6, 3, '#e0dccf');
  p.rect(214, 42, 11, 8, '#b49670'); p.hl(214, 42, 11, '#c8ad88'); p.hl(214, 45, 11, '#d8c070', 0.7);
  // 1109 앞: 아이 세발자전거
  p.rect(292, 54, 10, 3, '#e05a7a'); p.hl(292, 54, 10, '#f48aa4'); p.vl(300, 48, 6, '#9a9aa2'); p.hl(298, 47, 5, '#3a3a40');
  for (const [cx, cy, r] of [[291, 59, 4], [302, 60, 3]] as const) for (let a = 0; a < 24; a++) p.set(Math.round(cx + Math.cos(a / 3.82) * r), Math.round(cy + Math.sin(a / 3.82) * r), '#2a2a30');
  // 1107 옆 기둥: 말라 죽은 화분
  p.rect(165, 55, 10, 8, '#8a4e36'); p.hl(165, 55, 10, '#a8644a'); p.hl(165, 62, 10, '#5e3424'); p.rect(166, 54, 8, 2, '#3c2e24');
  p.line(169, 54, 167, 44, '#6e6040'); p.line(170, 54, 173, 46, '#6e6040'); p.dots('166,44 167,43 174,46 173,45 171,49', '#8a7a50');
    base.blit(p, 0, WB - 64);
  }
  // 바닥: 시멘트. 초록 에폭시가 군데군데 남았다. 난간 쪽 배수 홈.
  const FY = C_TOP + T;
  concrete(p, 0, FY, W, 2 * T, '#8c8b81', 31);
  for (let y = FY; y < FY + 2 * T; y++) for (let x = 0; x < W; x++) {
    const e = rnd(x >> 3, y >> 2, 32);
    if (e > 0.7 && rnd(x, y, 33) > 0.25) p.set(x, y, rnd(x, y, 34) > 0.5 ? '#7d8b7c' : '#788676', 0.85);
  }
  for (let x = 4; x < W; x += 37) crack(p, x + Math.floor(rnd(x, 0, 35) * 20), FY + 4 + Math.floor(rnd(x, 1, 35) * 20), 12 + Math.floor(rnd(x, 2, 35) * 14), '#5e5d56', x);
  p.rect(0, FY + 2 * T - 4, W, 4, '#6f6e66'); p.hl(0, FY + 2 * T - 4, W, '#5a5953'); p.hl(0, FY + 2 * T - 1, W, '#7e7d74');
  // 벽과 바닥이 만나는 그늘, 문 앞 발자국 닳음
  p.hl(0, FY, W, '#3c3e38', 0.55); p.dither(0, FY + 1, W, 2, '#3c3e38', 0, 0.3);
  for (const dx of [24, 104, 184, 264]) for (let y = FY + 2; y < FY + 14; y++) for (let x = dx - 6; x < dx + 8; x++) if (rnd(x, y, 36) > 0.8) p.set(x, y, '#9d9c92', 0.5);
  p.rect(0, 0, 3, H, '#2a2b27'); p.rect(W - 3, 0, 3, H, '#2a2b27');
  if (s.mood === 'glass') { // 2장 끝: 우리 집 현관 앞에 초록 병이 깨져 흩어졌다. 쏟아진 술이 바닥에 번졌다.
    for (let y = WB - 44; y < WB - 27; y++) for (let x = 51; x < 77; x++) if (p.alpha(x, y) && (x - 51) % 4 > 1) p.set(x, y, '#7a9ae8', 0.4 - (y - WB + 44) * 0.012); // 우리 집 창: 안에서 TV 가 켜져 있다
    for (let y = FY + 4; y < FY + 24; y++) for (let x = 14; x < 70; x++) {
      const e = ((x - 40) / 28) ** 2 + ((y - FY - 13) / 9) ** 2 + (rnd(x >> 2, y >> 1, 141) - 0.5) * 0.5;
      if (e < 1) p.set(x, y, '#4e4f4a', 0.28); // 마르는 중인 얼룩
    }
    const shard = (x: number, y: number, k: number, seed: number): void => { // 조각 하나: 짙은 초록에 한쪽 모서리가 빛난다
      const w = 1 + Math.floor(rnd(seed, 1, 142) * k), h = Math.max(1, Math.floor(w * 0.6)), fl = rnd(seed, 2, 142) > 0.5;
      for (let j = 0; j < h; j++) p.hl(fl ? x + j : x, y + j, w - j, j === 0 ? '#9ae8b4' : '#3a9a5e'); // 세모난 조각, 윗날이 빛난다
      if (w > 2) p.set(fl ? x + w - 1 : x + w - 2, y + h - 1, '#1c4e2e');
      if (rnd(seed, 3, 142) > 0.55) p.set(fl ? x + 1 : x + w - 2, y, '#f0fff4');
    };
    for (let i = 0; i < 64; i++) { // 튄 방향: 문 앞에서 사방으로. 큰 조각은 가운데, 가루는 멀리.
      const a = rnd(i, 4, 143) * Math.PI * 2, r = Math.pow(rnd(i, 5, 143), 0.8) * (i < 14 ? 16 : 36);
      shard(Math.round(34 + Math.cos(a) * r * 1.3), Math.round(FY + 8 + Math.sin(a) * r * 0.3), i < 14 ? 6 : 2, i);
    }
    // 병목: 뚜껑 고리가 걸린 채 통째로 남았다
    p.rect(50, FY + 9, 8, 3, '#3a9a5e'); p.hl(50, FY + 9, 8, '#9ae8b4'); p.rect(58, FY + 9, 2, 3, '#c8ccd0'); p.set(58, FY + 9, '#f0f4f8'); p.hl(48, FY + 12, 3, '#1c4e2e'); p.set(49, FY + 10, '#3a9a5e'); p.set(49, FY + 11, '#3a9a5e');
    // 병 바닥: 둥근 테두리
    for (let a = 0; a < 20; a++) p.set(Math.round(22 + Math.cos(a / 3.18) * 4), Math.round(FY + 15 + Math.sin(a / 3.18) * 2), a % 3 ? '#3a9a5e' : '#b8f8cc');
    // 찢긴 상표 조각
    p.rect(62, FY + 7, 4, 3, '#e8f0e8'); p.hl(62, FY + 8, 4, '#2a9a5a'); p.set(65, FY + 9, '#c8d0c8');
  }
  // 난간 (사람 앞에 선다): 시멘트 턱 위에 쇠 난간
  const L = new Pix(W, H), RY = C_TOP + 3 * T;
  for (let x = 0; x < W; x++) {
    for (let y = RY - 6; y < RY; y++) L.set(x, y, y === RY - 6 ? '#c7c6bb' : y < RY - 3 ? '#b2b1a6' : '#a3a297');  // 턱 윗면
    for (let y = RY; y < H; y++) L.set(x, y, rnd(x, y, 37) > 0.9 ? '#6c6b63' : y < RY + 2 ? '#8c8b81' : '#7a7970'); // 턱 앞면
    if (rnd(x, 0, 38) > 0.9) L.vl(x, RY + 2, 3 + Math.floor(rnd(x, 1, 38) * 8), '#5f5e57', 0.6);                    // 빗물 자국
  }
  for (let x = 0; x < W; x += 8) { L.vl(x, RY - 16, 10, '#4a5355'); L.vl(x + 1, RY - 16, 10, '#6c7678', 0.7); }   // 난간 살
  L.hl(0, RY - 17, W, '#4a5355'); L.hl(0, RY - 18, W, '#8a9496'); L.hl(0, RY - 16, W, '#343b3d');
  L.hl(0, RY - 10, W, '#4a5355', 0.8);
  return { base: p, props: [cut(L, C_TOP, 3 * T)] };
}


// ═══════════════════ 거실 ═══════════════════
// 노란 장판 (방과 같은 장판이다. 이 집은 전부 같은 장판을 깔았다)
function laminate(p: Pix, x0: number, y0: number, x1: number, y1: number, seed: number): void {
  const FL = '#8a7b60', FL_L = '#97886b', FL_D = '#79694f';
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const row = Math.floor((y - y0) / 8), in8 = (y - y0) % 8;
    let col = FL;
    if (in8 === 0 || (x + row * 23) % 46 === 0) col = FL_D;
    else if (in8 === 1) col = FL_L;
    const n = rnd(x >> 1, y, seed);
    if (in8 > 1 && n < 0.07) col = FL_L;
    if (in8 > 1 && n > 0.95) col = FL_D;
    p.set(x, y, col);
  }
}
const SLAB = '#25262e', SLAB_L = '#383a45';
function woodDoor(p: Pix, x0: number, y0: number, w: number, h: number, col: string): void {
  const L = mix(col, '#ffffff', 0.14), D = mix(col, '#000000', 0.22);
  p.rect(x0 - 3, y0 - 3, w + 6, h + 3, '#8a7158'); p.hl(x0 - 3, y0 - 3, w + 6, '#a68c70'); p.vl(x0 + w + 2, y0 - 3, h + 3, '#5c4836');
  p.rect(x0, y0, w, h, col); p.vl(x0, y0, h, L); p.vl(x0 + w - 1, y0, h, D);
  for (const [py, ph] of [[y0 + 5, 18], [y0 + 28, 19]] as const) { p.hl(x0 + 3, py, w - 6, D); p.vl(x0 + 3, py, ph, D); p.hl(x0 + 3, py + ph, w - 6, L); p.vl(x0 + w - 4, py, ph + 1, L); }
  for (let y = y0 + 1; y < y0 + h; y += 3) if (rnd(x0, y, 41) > 0.5) p.hl(x0 + 5, y, 3 + Math.floor(rnd(y, x0, 41) * 10), D, 0.25); // 나뭇결 무늬 시트지
  p.rect(x0 + w - 6, y0 + 27, 4, 2, '#c8c0a8'); p.set(x0 + w - 6, y0 + 29, '#6a604c');
}
function living(s: PlaceState): Place {
  const m = MAPS.living, top = 56, W = m.grid[0].length * T, H = m.grid.length * T + top, WB0 = top + T;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T; // r 번째 줄의 위쪽 (그림 좌표)
  p.rect(0, 0, W, H, '#000000');
  // 뒷벽: 누렇게 바랜 꽃무늬 벽지
  for (let y = 6; y < WB0; y++) for (let x = 16; x < W - 16; x++) {
    let col = '#b3a589';
    if ((x % 8 === 3 && y % 8 === 3) || (x % 8 === 7 && y % 8 === 7)) col = '#a6977b';
    if ((x % 8 === 4 && y % 8 === 3) || (x % 8 === 3 && y % 8 === 4)) col = '#bfb196';
    if (rnd(x, y, 42) > 0.97) col = '#a39478';
    p.set(x, y, col);
  }
  for (let x = 16; x < W - 16; x++) if (rnd(x, 0, 43) > 0.8) p.vl(x, 7, 6 + Math.floor(rnd(x, 1, 43) * 20), '#a8996e', 0.25); // 담배 연기에 누레진 자리
  p.rect(16, 0, W - 32, 6, '#3c3a36'); p.hl(16, 5, W - 32, '#8e826c'); p.hl(16, 6, W - 32, '#c4b89e');
  p.rect(16, WB0 - 4, W - 32, 4, '#6a5444'); p.hl(16, WB0 - 4, W - 32, '#806a58'); // 걸레받이
  // 화장실 문 (2-3칸)
  woodDoor(p, 2 * T + 4, WB0 - 52, 24, 52, '#cdc8bc');
  p.rect(2 * T + 9, WB0 - 46, 14, 8, '#9aa6aa'); p.dither(2 * T + 9, WB0 - 46, 14, 8, '#b8c4c6', 0, 0.6); // 불투명 유리
  p.rect(2 * T + 6, WB0 - 2, 20, 2, '#5e7a8a'); // 발매트
  // 부엌 (5-7칸): 위 찬장, 후드, 타일, 싱크대, 가스레인지, 냉장고
  {
    const x0 = 5 * T, x1 = 7 * T + 16;
    p.rect(x0, 10, 32, 18, '#cbbda2'); p.hl(x0, 10, 32, '#ddd1b8'); p.hl(x0, 27, 32, '#8e8270'); p.vl(x0 + 15, 10, 18, '#9e917c');
    p.rect(x0 + 12, 19, 2, 3, '#7a6e5c'); p.rect(x0 + 18, 19, 2, 3, '#7a6e5c');
    for (let y = 28; y < 48; y++) for (let x = x0; x < x0 + 32; x++) p.set(x, y, (x - x0) % 6 === 0 || (y - 28) % 6 === 0 ? '#bdbab0' : '#d9d6cc');
    p.rect(x0 + 16, 26, 16, 6, '#9da2a4'); p.hl(x0 + 16, 26, 16, '#c3c8ca'); p.hl(x0 + 17, 31, 14, '#5d6264');
    p.rect(x0 + 21, 31, 6, 1, s.day ? '#a8a49a' : '#ffe2a8');                                                // 후드 등
    p.rect(x0, 48, 32, 4, '#a7a49b'); p.hl(x0, 48, 32, '#c6c3ba');                                          // 상판
    p.rect(x0, 52, 32, WB0 - 52, '#c4b59b'); p.vl(x0 + 15, 52, WB0 - 52, '#9e917c'); p.hl(x0, WB0 - 1, 32, '#6a5444');
    p.rect(x0 + 2, 47, 11, 2, '#8c9294'); p.rect(x0 + 3, 48, 9, 1, '#5a6062'); p.line(x0 + 6, 38, x0 + 6, 46, '#b8bec0'); p.hl(x0 + 6, 38, 3, '#b8bec0'); // 싱크대와 수전
    p.rect(x0 + 18, 45, 12, 3, '#26272a'); p.dots(`${x0 + 20},45 ${x0 + 23},45 ${x0 + 26},45 ${x0 + 28},45`, '#4a4b50');            // 가스레인지
    p.rect(x0 + 21, 41, 7, 4, '#5a5e64'); p.hl(x0 + 21, 41, 7, '#7c8188');                                    // 냄비
    p.rect(x0 + 1, 43, 5, 4, '#e8e4da'); p.rect(x0 + 8, 44, 4, 3, '#e8e4da'); p.hl(x0 + 1, 43, 5, '#f8f6f0'); // 엎어 둔 그릇
    // 냉장고: 자석과 고지서, 하은네 동네 학원 전단
    p.rect(x1 - 16, 8, 15, WB0 - 8, '#d6d6cf'); p.vl(x1 - 16, 8, WB0 - 8, '#e8e8e2'); p.vl(x1 - 2, 8, WB0 - 8, '#a9a9a2'); p.hl(x1 - 16, 30, 15, '#9a9a93');
    p.vl(x1 - 4, 14, 10, '#9a9a93'); p.vl(x1 - 4, 36, 14, '#9a9a93');
    p.rect(x1 - 14, 12, 6, 8, '#f2efe4'); p.hl(x1 - 13, 14, 4, '#8a8478'); p.hl(x1 - 13, 16, 3, '#8a8478'); p.set(x1 - 11, 11, '#d04040');
    p.rect(x1 - 13, 36, 7, 5, '#f0d878'); p.set(x1 - 10, 35, '#3a7ac0'); p.rect(x1 - 9, 22, 3, 3, '#e05a5a');
  }
  // TV 장 (8-9칸, 1줄): 장 윗면에 TV, 엎어 둔 액자
  {
    const x0 = 8 * T, y0 = ry(1);
    p.rect(x0 - 1, WB0 - 18, 33, 18, '#111214'); p.rect(x0, WB0 - 17, 31, 15, '#17191c'); p.line(x0 + 4, WB0 - 15, x0 + 12, WB0 - 7, '#2a2d32'); // TV
    p.rect(x0 + 13, WB0 - 2, 6, 2, '#111214');
    p.rect(x0, y0 - 2, 32, 4, '#8c6e52'); p.hl(x0, y0 - 2, 32, '#a4866a');                                   // 장 윗면
    p.rect(x0, y0 + 2, 32, 12, '#6e5440'); p.hl(x0, y0 + 2, 32, '#5a4434'); p.vl(x0 + 16, y0 + 2, 12, '#4e3a2c'); p.hl(x0, y0 + 14, 32, '#2a1f18');
    p.rect(x0 + 12, y0 + 7, 2, 2, '#c8b898'); p.rect(x0 + 18, y0 + 7, 2, 2, '#c8b898');
    p.rect(x0 + 24, y0 - 3, 6, 2, '#3a2c22'); p.hl(x0 + 24, y0 - 3, 6, '#c8b070');                            // 엎어 둔 액자
    p.set(x0 + 28, WB0 - 3, '#ff4040');                                                                    // 대기 등
    // 벽시계: 멈췄다
    for (let a = 0; a < 30; a++) p.set(Math.round(x0 + 16 + Math.cos(a / 4.77) * 5), Math.round(17 + Math.sin(a / 4.77) * 5), '#4a3e34');
    p.ell(x0 + 16, 17, 4, 4, '#e8e2d4'); p.line(x0 + 16, 17, x0 + 16, 14, '#2a2a2a'); p.line(x0 + 16, 17, x0 + 18, 18, '#2a2a2a');
  }
  // 윤서 방 (10-11칸): 문이 열려 있다. 안은 천장까지 박스, 바닥에 초록 병들.
  {
    const x0 = 10 * T + 4, w = 24, h = 52, y0 = WB0 - h;
    p.rect(x0 - 3, y0 - 3, w + 6, h + 3, '#8a7158'); p.hl(x0 - 3, y0 - 3, w + 6, '#a68c70');
    p.rect(x0, y0, w, h, '#14110e');
    const box = (bx: number, by: number, bw: number, bh: number, c: string): void => {
      p.rect(bx, by, bw, bh, c); p.hl(bx, by, bw, mix(c, '#ffffff', 0.15)); p.vl(bx + bw - 1, by, bh, mix(c, '#000000', 0.25)); p.hl(bx + 1, by + Math.floor(bh / 2), bw - 2, '#c8b878', 0.5);
    };
    box(x0 + 4, y0 + 1, 10, 9, '#7a6448'); box(x0 + 13, y0 + 2, 11, 10, '#8a7050'); box(x0 + 3, y0 + 10, 12, 11, '#94795a'); box(x0 + 14, y0 + 12, 10, 10, '#7f6a4c');
    box(x0 + 5, y0 + 21, 9, 9, '#8a7050'); box(x0 + 14, y0 + 22, 10, 12, '#9a7f5e'); box(x0 + 3, y0 + 30, 11, 11, '#7a6448');
    for (let i = 0; i < 9; i++) { // 초록 병
      const bx = x0 + 4 + ((i * 5) % 19), by = y0 + h - 9 + (i % 2) * 2;
      p.rect(bx, by, 3, 7 - (i % 2) * 2, i % 3 ? '#3e7a4a' : '#2f6a3e'); p.set(bx + 1, by - 1, '#2a5a36'); p.set(bx, by + 1, '#7fc08c');
    }
    p.rect(x0, y0, 3, h, '#6e5644'); p.vl(x0 + 2, y0, h, '#4e3c2e'); // 안으로 열린 문짝
  }
  // 안방 (13-14칸): 닫혀 있다. 문틈으로 TV 빛이 샌다.
  woodDoor(p, 13 * T + 4, WB0 - 52, 24, 52, '#7b5d45');
  p.hl(13 * T + 4, WB0 - 1, 24, s.day ? '#3a2c22' : '#c8bc98');
  // 신발장 (15-16칸, 1줄): 키 큰 장. 문 하나에 거울이 붙었다.
  {
    const x0 = 15 * T, y1 = ry(2);
    p.rect(x0, 14, 32, 4, '#d8c8a8'); p.hl(x0, 14, 32, '#e8dcc0');
    p.rect(x0, 18, 32, y1 - 18, '#c3b190'); p.vl(x0 + 16, 18, y1 - 18, '#98876a'); p.hl(x0, y1 - 1, 32, '#5c4c3a'); p.vl(x0 + 31, 18, y1 - 18, '#98876a');
    p.rect(x0 + 18, 21, 11, y1 - 28, '#8fa0a8'); p.line(x0 + 19, 24, x0 + 27, 36, '#b8c6cc'); p.line(x0 + 19, 30, x0 + 25, 40, '#a8b8be'); // 거울
    p.rect(x0 + 12, 50, 2, 6, '#7a6a50'); p.rect(x0 + 16, 50, 2, 6, '#7a6a50');
  }
  // 바닥
  laminate(p, 16, WB0, W - 17, ry(6) - 1, 44);
  // 현관: 한 단 낮은 회색 타일
  {
    const x0 = 15 * T, y0 = ry(2), y1 = ry(5);
    for (let y = y0; y < y1; y++) for (let x = x0; x < W - 16; x++) p.set(x, y, (x - x0) % 10 === 0 || (y - y0) % 10 === 0 ? '#76776f' : rnd(x, y, 45) > 0.92 ? '#86877f' : '#8f9089');
    p.vl(x0, y0, y1 - y0, '#5a5048'); p.vl(x0 - 1, y0, y1 - y0, '#a8996e'); p.hl(x0, y0, 32, '#5a5048');
    // 아버지 구두 (벗어 던진 채), 사 년 동안 안 신은 내 운동화 (먼지)
    p.rect(x0 + 6, y0 + 6, 7, 3, '#1c1a1c'); p.hl(x0 + 6, y0 + 6, 7, '#3a363a'); p.rect(x0 + 14, y0 + 9, 7, 3, '#1c1a1c'); p.hl(x0 + 14, y0 + 9, 7, '#3a363a');
    p.rect(x0 + 18, y0 + 30, 6, 3, '#c8c6c0'); p.rect(x0 + 24, y0 + 31, 6, 3, '#c8c6c0'); p.hl(x0 + 18, y0 + 30, 12, '#dcdad4'); p.dots(`${x0 + 20},${y0 + 32} ${x0 + 26},${y0 + 33}`, '#3a5a8a');
    p.dither(x0 + 18, y0 + 30, 12, 3, '#9a988e', 0, 0.35);
  }
  // 왼쪽 벽과 내 방 문, 오른쪽 벽과 현관문
  p.rect(10, 0, 6, H - T + 6, SLAB); p.vl(15, 0, H - T, SLAB_L);
  p.rect(W - 16, 0, 6, H - T + 6, SLAB); p.vl(W - 16, 0, H - T, SLAB_L);
  { const y = ry(3) - 2; p.rect(10, y, 6, 20, '#4a3a2e'); p.rect(10, y + 2, 6, 16, '#7a6149'); p.vl(15, y + 2, 16, '#8f745a'); p.rect(16, y + 10, 2, 2, '#c8c2a8'); }
  {
    const x = W - 16, y = ry(3) - 4;
    p.rect(x, y, 6, 22, '#3a4044');
    if (s.door === 'front') { // 현관문이 열렸다: 문틀 안이 복도의 낮빛으로 하얗게 빈다. 빛이 현관 타일에 길게 눕는다.
      p.rect(x, y + 2, 6, 18, '#f4f1e2'); p.vl(x, y + 2, 18, '#ffffff'); p.vl(x + 5, y + 2, 18, '#d8d4c2');
      for (let i = 0; i < 26; i++) p.hl(x - 1 - i, y + 4 + Math.floor(i * 0.25), 1, '#fff8e0', 0.5 - i * 0.017), p.vl(x - 1 - i, y + 4 + Math.floor(i * 0.25), 14 + Math.floor(i * 0.3), '#fff4d8', 0.42 - i * 0.015);
    } else {
      p.rect(x, y + 2, 6, 18, '#6b7377'); p.vl(x, y + 2, 18, '#8a9296');
      p.rect(x - 3, y + 6, 3, 6, '#1e2124'); p.set(x - 2, y + 8, '#7fe39a'); p.rect(x - 3, y + 13, 3, 1, '#c4c8c4');
    }
  }
  // 가구 밑 그늘
  const band = (x: number, y: number, w: number): void => { p.hl(x, y, w, '#1d1820', 0.45); p.dither(x, y + 1, w, 1, '#1d1820', 0, 0.3); };
  band(16, WB0, 15 * T - 16); band(8 * T, ry(2), 32); band(15 * T, ry(2), 32);
  // 소파 옆에 굴러다니는 빈 병
  p.rect(10 * T + 4, ry(5) + 10, 7, 3, '#3e7a4a'); p.set(10 * T + 11, ry(5) + 11, '#2a5a36'); p.hl(10 * T + 5, ry(5) + 10, 4, '#7fc08c');
  // ── 앞에 서는 것들 ──
  const props: Prop[] = [];
  { // 식탁 (5-6칸, 2-3줄). 위에 만 원 한 장, 랩 씌운 접시, 소주병.
    const L = new Pix(W, H), x0 = 5 * T - 2, y0 = ry(2) - 6;
    L.rect(x0 - 5, y0 + 4, 5, 12, '#6e5440'); L.hl(x0 - 5, y0 + 4, 5, '#8c6e52'); L.vl(x0 - 5, y0 + 16, 10, '#4a3828'); L.vl(x0 - 1, y0 + 16, 10, '#4a3828'); // 의자
    L.rect(x0 + 36, y0 + 4, 5, 12, '#6e5440'); L.hl(x0 + 36, y0 + 4, 5, '#8c6e52'); L.vl(x0 + 36, y0 + 16, 10, '#4a3828'); L.vl(x0 + 40, y0 + 16, 10, '#4a3828');
    L.rect(x0, y0, 36, 26, '#9c7a58'); L.hl(x0, y0, 36, '#b89470'); L.vl(x0, y0, 26, '#ad8a66'); L.vl(x0 + 35, y0, 26, '#7a5c42');
    for (let y = y0 + 3; y < y0 + 25; y += 3) if (rnd(y, 1, 46) > 0.4) L.hl(x0 + 2 + Math.floor(rnd(y, 2, 46) * 10), y, 6 + Math.floor(rnd(y, 3, 46) * 12), '#8a6a4c', 0.5);
    L.rect(x0, y0 + 26, 36, 4, '#6a4e38'); L.hl(x0, y0 + 29, 36, '#3a2a1e');
    L.rect(x0 + 2, y0 + 30, 3, 8, '#4a3626'); L.rect(x0 + 31, y0 + 30, 3, 8, '#4a3626');
    if (s.mood !== 'rain') { L.rect(x0 + 8, y0 + 8, 9, 5, '#86a87e'); L.hl(x0 + 8, y0 + 8, 9, '#a6c49c'); L.rect(x0 + 11, y0 + 9, 3, 3, '#6a8a62'); L.hl(x0 + 8, y0 + 13, 9, '#5a7052'); } // 만 원. 3장 끝 일요일 아침(비)에는 없다
    else { L.hl(x0 + 8, y0 + 13, 9, '#8a6a4c', 0.5); } // 늘 놓이던 자리만 조금 덜 바랬다
    L.ell(x0 + 25, y0 + 13, 6, 4, '#e8e4da'); L.ell(x0 + 25, y0 + 12, 4, 2.4, '#d0603a'); L.line(x0 + 20, y0 + 10, x0 + 29, y0 + 15, '#ffffff', 0.5);  // 랩 씌운 김치찌개
    L.rect(x0 + 30, y0 + 1, 3, 9, '#3e7a4a'); L.rect(x0 + 31, y0 - 2, 1, 3, '#2a5a36'); L.vl(x0 + 30, y0 + 2, 6, '#7fc08c');                      // 소주병
    props.push(cut(L, top, 4 * T));
  }
  { // 소파 (7-9칸, 5줄): 뒤에서 본다. 등받이에 담요가 걸쳐 있다.
    const L = new Pix(W, H), x0 = 7 * T - 2, y0 = ry(5) - 14;
    L.rect(x0, y0 + 2, 52, 26, '#6a574c'); L.hl(x0 + 2, y0, 48, '#86705f'); L.hl(x0 + 1, y0 + 1, 50, '#7c6656');
    L.vl(x0, y0 + 2, 26, '#7c6656'); L.vl(x0 + 51, y0 + 2, 26, '#4e3e34'); L.vl(x0 + 17, y0 + 4, 22, '#584638'); L.vl(x0 + 34, y0 + 4, 22, '#584638');
    for (let y = y0 + 4; y < y0 + 26; y++) for (let x = x0 + 1; x < x0 + 51; x++) if (rnd(x, y, 47) > 0.94) L.set(x, y, '#5e4c42');
    L.rect(x0 + 30, y0, 16, 14, '#4e6a7c'); L.hl(x0 + 30, y0, 16, '#6a8698'); for (let x = x0 + 31; x < x0 + 46; x += 3) L.vl(x, y0 + 2, 12, '#3e5868');  // 담요
    L.rect(x0 + 2, y0 + 28, 48, 2, '#2a201a');
    props.push(cut(L, top, 6 * T));
  }
  { // 현관 구석: 우산꽂이와 빈 병 담긴 비닐봉지
    const L = new Pix(W, H), x0 = 15 * T + 2, y0 = ry(5) - 6;
    L.rect(x0, y0, 8, 20, '#5a6066'); L.hl(x0, y0, 8, '#7a8086'); L.line(x0 + 2, y0 - 10, x0 + 3, y0, '#2a2a30'); L.line(x0 + 5, y0 - 12, x0 + 5, y0, '#3a2a5a'); L.set(x0 + 5, y0 - 13, '#8a8a90');
    L.ell(x0 + 20, y0 + 12, 8, 8, '#d8d6d0'); L.dots(`${x0 + 16},${y0 + 8} ${x0 + 22},${y0 + 6} ${x0 + 25},${y0 + 10}`, '#f2f0ea');
    L.rect(x0 + 15, y0 + 2, 3, 8, '#3e7a4a'); L.rect(x0 + 21, y0 + 1, 3, 8, '#2f6a3e'); L.rect(x0 + 18, y0 + 4, 3, 7, '#3e7a4a');
    props.push(cut(L, top, 6 * T));
  }
  { // 앞벽 (아래쪽): 위에서 본 벽 두께
    const L = new Pix(W, H), y = ry(6);
    L.rect(10, y, W - 20, 6, SLAB); L.hl(16, y, W - 32, SLAB_L);
    props.push(cut(L, top, 6 * T + 1));
  }
  return { base: p, props };
}

// ═══════════════════ 계단 ═══════════════════
function bigText(p: Pix, x: number, y: number, str: string, col: string, k = 2, a = 1): void {
  for (const ch of str) {
    const g = DIG[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') p.rect(x + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, col, a);
    x += 4 * k;
  }
}
function stairs(s: PlaceState): Place {
  const m = MAPS.stairs, top = 48, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H);
  p.rect(0, 0, W, H, '#000000');
  const iy = (r: number): number => top + r * T;
  const landings: [number, string][] = [[0, '11'], [4, '9'], [8, '7'], [12, '4'], [16, '1']];
  const flightCols = (r: number): number[] => (m.grid[r] || '').split('').map((c, i) => (c === 's' ? i : -1)).filter((i) => i >= 0);
  for (const [r, num] of landings) {
    const y1 = iy(r), y0 = y1 - 48;                     // 이 층 계단참의 뒷벽
    const skip = r > 0 ? flightCols(r - 1) : [];
    for (let y = y0; y < y1; y++) for (let x = 16; x < W - 16; x++) {
      if (skip.includes(Math.floor(x / T))) continue;
      const k = y - y0;
      let col = k < 2 ? '#3e403a' : k < 26 ? '#a8a794' : k < 28 ? '#7a8a7e' : k < 45 ? '#647c6e' : '#4c5e54';
      const n = rnd(x, y, 50 + r);
      if (k >= 2 && k < 26 && n > 0.94) col = '#9c9b88';
      if (k >= 28 && k < 45 && n > 0.93) col = '#5c7266';
      p.set(x, y, col);
    }
    for (let x = 16; x < W - 16; x++) if (!skip.includes(Math.floor(x / T)) && rnd(x, r, 51) > 0.85) p.vl(x, y0 + 2, 4 + Math.floor(rnd(x, r + 1, 51) * 12), '#96957f', 0.5); // 흘러내린 때
    // 층수: 벽에 크게 칠했다. 내려가는 계단 반대편에.
    const down = flightCols(r + 1);
    const nw = num.length * 12 + 7, nx = ({ '11': 22, '9': 100, '7': 124, '4': 54, '1': 140 } as Record<string, number>)[num];
    const right = nx > 90;
    bigText(p, nx + 1, y0 + 9, num, '#7c7a68', 3); bigText(p, nx, y0 + 8, num, '#3e5c4c', 3);
    { const fx = nx + num.length * 12; p.rect(fx, y0 + 14, 2, 9, '#3e5c4c'); p.hl(fx, y0 + 14, 5, '#3e5c4c'); p.hl(fx, y0 + 18, 4, '#3e5c4c'); }
    // 센서등: 벽 위의 둥근 등
    const lx = right ? nx - 20 : nx + nw + 20;
    p.ell(lx, y0 + 5, 5, 2.5, '#e8ecdc'); p.hl(lx - 5, y0 + 7, 11, '#9a9e90');
    // 비상구 표시 (계단 내려가는 쪽)
    if (down.length) {
      const ex = down[0] * T + 8;
      p.rect(ex - 7, y0 + 6, 14, 7, '#e6ece6'); p.rect(ex - 6, y0 + 7, 12, 5, '#27a55a'); p.dots(`${ex - 3},${y0 + 8} ${ex - 3},${y0 + 9} ${ex - 4},${y0 + 10} ${ex - 2},${y0 + 10} ${ex + 1},${y0 + 9} ${ex + 2},${y0 + 9} ${ex + 3},${y0 + 9}`, '#f4fff4');
    }
    // 계단참 바닥: 시멘트, 계단 쪽 끝에 놋쇠 미끄럼막이
    concrete(p, 16, y1, W - 32, T, '#8a8c84', 60 + r);
    p.hl(16, y1, W - 32, '#3c3e38', 0.5); p.dither(16, y1 + 1, W - 32, 1, '#3c3e38', 0, 0.3);
    p.hl(16, y1 + T - 2, W - 32, '#a9aba2'); p.hl(16, y1 + T - 1, W - 32, '#55574f');
    for (const c of down) { p.hl(c * T, y1 + T - 3, T, '#b49a5a'); }
    // 층마다 다른 것
    if (num === '11') { // 복도로 나가는 방화문 (열려 있다)
      const x0 = 4 * T + 2;
      p.rect(x0 - 2, y0 + 4, 28, 44, '#5f6a66'); p.rect(x0, y0 + 6, 24, 42, '#1a1d1c'); p.rect(x0, y0 + 6, 4, 42, '#8a3a32'); p.vl(x0 + 3, y0 + 6, 42, '#5a2420');
      p.rect(x0 + 6, y0 + 30, 16, 18, '#3a3f3c', 0.6);
    } else if (num === '9') { // 계단 창: 쇠창살 너머 밤
      const x0 = 4 * T;
      p.rect(x0 - 2, y0 + 6, 28, 16, '#5d6662'); p.rect(x0, y0 + 8, 24, 12, s.day ? '#a8b8be' : '#1a2234');
      if (!s.day) p.dots(`${x0 + 4},${y0 + 12} ${x0 + 9},${y0 + 15} ${x0 + 17},${y0 + 11} ${x0 + 20},${y0 + 16}`, '#e0c070');
      for (let x = x0; x < x0 + 24; x += 4) p.vl(x, y0 + 7, 14, '#39403d');
      p.rect(x0 - 3, y0 + 22, 30, 2, '#c8c6b2');
    } else if (num === '7') { // 소화전함
      const x0 = 6 * T;
      p.rect(x0, y0 + 14, 22, 30, '#b03a32'); p.hl(x0, y0 + 14, 22, '#d05a50'); p.vl(x0 + 21, y0 + 14, 30, '#7a2420');
      p.rect(x0 + 3, y0 + 18, 16, 6, '#e8e2d4'); p.hl(x0 + 4, y0 + 20, 14, '#b03a32'); p.rect(x0 + 15, y0 + 30, 3, 4, '#d8d0b0');
    } else if (num === '4') { // 죽은 고무나무 화분
      const x0 = 7 * T + 4;
      p.rect(x0, y0 + 36, 14, 12, '#6e4a36'); p.hl(x0, y0 + 36, 14, '#8a5e46'); p.rect(x0 + 1, y0 + 35, 12, 2, '#2e241c');
      p.line(x0 + 7, y0 + 35, x0 + 6, y0 + 12, '#5a4a32'); p.line(x0 + 6, y0 + 22, x0 + 1, y0 + 16, '#5a4a32'); p.line(x0 + 7, y0 + 18, x0 + 12, y0 + 13, '#5a4a32');
      p.dots(`${x0},${y0 + 15} ${x0 + 1},${y0 + 14} ${x0 + 12},${y0 + 12} ${x0 + 13},${y0 + 13} ${x0 + 5},${y0 + 11}`, '#7a6a3a');
      p.rect(x0 + 2, y0 + 48, 5, 2, '#7a6a3a'); p.set(x0 + 9, y0 + 49, '#6a5a30');                    // 떨어진 잎
    } else if (num === '1') { // 우편함
      const x0 = 4 * T;
      p.rect(x0 - 2, y0 + 8, 76, 30, '#8a9094'); p.hl(x0 - 2, y0 + 8, 76, '#a8aeb2');
      for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) {
        const bx = x0 + i * 9, by = y0 + 10 + j * 9;
        p.rect(bx, by, 8, 8, '#a2a8ac'); p.hl(bx + 1, by + 2, 6, '#3a3f42'); p.vl(bx + 7, by, 8, '#6a7074');
        if (rnd(i, j, 52) > 0.55) p.rect(bx + 1, by + 3, 6, 2, rnd(j, i, 53) > 0.5 ? '#efeadc' : '#f0d878'); // 삐져나온 고지서
      }
    }
  }
  // 계단: 한 층에 여덟 단. 단마다 디딤판, 놋쇠 줄, 챌판.
  for (let r = 0; r < m.grid.length; r++) for (const c of flightCols(r)) {
    const x0 = c * T, y0 = iy(r);
    for (let y = y0; y < y0 + T; y++) {
      const k = (y - top + 2) % 6;
      for (let x = x0; x < x0 + T; x++) p.set(x, y, k === 0 ? '#b49a5a' : k === 1 ? '#55544e' : k === 2 ? '#6e6d66' : rnd(x, y, 54) > 0.9 ? '#8a8982' : '#9a9890');
    }
  }
  // 계단 안쪽 난간: 벽과 계단 사이
  for (let r = 0; r < m.grid.length; r++) {
    const fc = flightCols(r);
    if (!fc.length) continue;
    const edge = fc[0] < 5 ? (fc[fc.length - 1] + 1) * T : fc[0] * T - 1, y0 = iy(r);
    p.vl(edge, y0, T, '#2a2d2e'); p.vl(edge + (fc[0] < 5 ? 1 : -1), y0, T, '#8a9294');
    for (let y = y0; y < y0 + T; y += 4) p.set(edge + (fc[0] < 5 ? 2 : -2), y, '#5a6062');
  }
  // 바깥 벽 두께, 1층 유리문
  p.rect(10, 0, 6, H, SLAB); p.vl(15, 0, H, SLAB_L); p.rect(W - 16, 0, 6, H, SLAB); p.vl(W - 16, 0, H, SLAB_L);
  { const y = iy(16) - 6; p.rect(8, y, 8, 22, '#2a2e30'); p.rect(9, y + 2, 6, 18, s.day ? '#c8d4d8' : '#d89a50'); p.vl(12, y + 2, 18, '#2a2e30'); p.set(10, y + 4, '#ffffff'); }
  const L = new Pix(W, H); L.rect(10, iy(17), W - 20, 6, SLAB); L.hl(16, iy(17), W - 32, SLAB_L);
  return { base: p, props: [cut(L, top, 17 * T + 1)] };
}

// ═══════════════════ 바깥 ═══════════════════
function asphalt(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), m = rnd(x >> 3, y >> 3, seed + 1);
    p.set(x, y, n > 0.93 ? '#6a6c6e' : n < 0.06 ? '#3e4044' : m > 0.8 ? '#505256' : '#57595c');
  }
}
function sand(p: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), m = rnd(x >> 2, y >> 2, seed + 1);
    p.set(x, y, n > 0.9 ? '#a8946e' : n < 0.08 ? '#cdb994' : m > 0.78 ? '#b29e78' : '#bba783');
  }
  for (let i = 0; i < 40; i++) { // 발자국과 손으로 판 자국
    const x = x0 + Math.floor(rnd(i, 1, seed) * w), y = y0 + Math.floor(rnd(i, 2, seed) * h);
    p.rect(x, y, 3, 2, '#a08c66', 0.6); p.set(x + 1, y + 2, '#cdb994', 0.6);
  }
}
/** 나무 한 그루. 줄기는 by 에서 시작하고, 잎은 위에 둥글게 뭉친다. 밤바람에 흔들리는 잎 끝은 밝다. */
function tree(L: Pix, cx: number, by: number, r: number, seed: number): void {
  L.rect(cx - 2, by - 22, 5, 22, '#3a2c22'); L.vl(cx - 2, by - 22, 22, '#4e3c2e'); L.hl(cx - 4, by - 1, 9, '#2a2018'); L.line(cx + 1, by - 18, cx + 6, by - 26, '#3a2c22');
  const G = ['#6e9460', '#4f7448', '#3a5a3a', '#26402c'];
  for (let y = by - 22 - r * 2; y < by - 14; y++) for (let x = cx - r - 4; x <= cx + r + 4; x++) {
    let d = 9;
    for (let k = 0; k < 6; k++) { // 잎 뭉치 여섯
      const ox = cx + Math.cos(k * 1.1 + seed) * r * 0.55, oy = by - 22 - r + Math.sin(k * 1.1 + seed) * r * 0.45;
      const rr = r * (0.55 + rnd(k, seed, 61) * 0.2);
      d = Math.min(d, Math.hypot(x - ox, (y - oy) * 1.1) / rr);
    }
    if (d > 1) continue;
    const lit = (cx - x) * 0.04 + (by - 22 - r - y) * 0.06 + (rnd(x, y, seed) - 0.5) * 0.5 + (1 - d) * 0.4;
    L.set(x, y, d > 0.86 ? G[3] : lit > 0.5 ? G[0] : lit > 0 ? G[1] : lit > -0.5 ? G[2] : G[3]);
  }
}
function lampPost(L: Pix, x: number, by: number, h: number): void {
  L.rect(x - 3, by - 5, 7, 5, '#2a2d30'); L.hl(x - 3, by - 5, 7, '#4a4f54'); L.hl(x - 3, by - 1, 7, '#1a1c1e');
  L.rect(x - 1, by - h, 3, h - 5, '#3a3f44'); L.vl(x - 1, by - h, h - 5, '#5e646a'); L.vl(x + 1, by - h, h - 5, '#2a2e32');
  for (let y = by - 30; y < by - 8; y += 4) L.rect(x - 1, y, 3, 2, '#e8e2d0', 0.7); // 붙였다 뗀 전단지 자국
  L.line(x, by - h, x - 8, by - h - 4, '#3a3f44'); L.line(x, by - h + 1, x - 8, by - h - 3, '#2a2e32');
  L.rect(x - 15, by - h - 6, 10, 4, '#2a2d30'); L.hl(x - 15, by - h - 6, 10, '#4a4f54');
  L.hl(x - 14, by - h - 2, 8, '#ffd08a'); L.hl(x - 13, by - h - 2, 6, '#fff2c8'); L.hl(x - 13, by - h - 1, 6, '#ffb860', 0.7);
}
function hedge(L: Pix, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), t = y - y0;
    if (t === 0 && n > 0.5) continue;
    L.set(x, y, t < 2 ? (n > 0.5 ? '#5e8452' : '#4f7448') : t > h - 3 ? '#22382a' : n > 0.85 ? '#4f7448' : n < 0.2 ? '#2c4632' : '#3a5a3a');
  }
}
function chainFence(p: Pix, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if ((x + y) % 5 === 0 || (x - y + 500) % 5 === 0) p.set(x, y, '#7a8084', 0.75);
  for (let x = x0; x < x0 + w; x += 32) { p.rect(x, y0 - 6, 2, h + 6, '#4a5054'); p.vl(x, y0 - 6, h + 6, '#6a7074'); }
  p.hl(x0, y0, w, '#5a6064');
  for (let x = x0; x < x0 + w; x++) { const k = (x % 6); p.set(x, y0 - 4 + (k < 3 ? 0 : 1), '#8a9094'); if (k === 1) p.dots(`${x},${y0 - 5} ${x + 1},${y0 - 3}`, '#9aa0a4'); } // 가시철사
}

function complex(s: PlaceState): Place {
  const m = MAPS.complex, top = 72, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T, GY = iy(1);
  // 하늘: 도시의 밤은 완전히 검지 않다
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#1a2030', '#2e3446', y / GY));
  // 센트럴 파크뷰 (철조망 너머, 오른쪽 위): 유리로 된 높은 동. 밤에도 창이 환하다.
  for (const [bx, bw, bt] of [[332, 54, 2], [404, 70, 10]] as const) {
    p.rect(bx, bt, bw, GY - bt, '#3a4458'); p.vl(bx, bt, GY - bt, '#5a6478'); p.vl(bx + bw - 1, bt, GY - bt, '#2a3244');
    for (let y = bt + 4; y < GY - 10; y += 5) for (let x = bx + 3; x < bx + bw - 3; x += 4) {
      const n = rnd(x, y, 62);
      p.rect(x, y, 3, 3, n > 0.55 ? (n > 0.85 ? '#f0e6c8' : '#c8dcf0') : '#2a3448');
    }
    p.rect(bx + 4, bt, bw - 8, 2, '#a8e0f0'); // 꼭대기 조명
  }
  p.rect(320, GY - 18, 160, 18, '#2c3a3c'); for (let x = 324; x < 476; x += 14) p.ell(x, GY - 12, 6, 5, '#3e5a48'); // 파크뷰 조경수
  p.rect(380, GY - 6, 50, 6, '#8a5a8a'); p.rect(430, GY - 6, 30, 6, '#5a8ac0');                             // 우레탄 놀이터
  chainFence(p, 320, GY - 40, W - 320, 52);
  // 108동: 낡은 복도식 아파트의 아래 두 층
  {
    const x1 = 14 * T;
    p.rect(0, 0, x1, GY, '#a39e90');
    for (let y = 0; y < GY; y++) for (let x = 0; x < x1; x++) if (rnd(x, y, 63) > 0.93) p.set(x, y, '#968f80');
    for (let x = 0; x < x1; x++) if (rnd(x, 0, 64) > 0.8) p.vl(x, 0, 10 + Math.floor(rnd(x, 1, 64) * 30), '#8e877a', 0.5); // 빗물 자국
    for (const fy of [4, 34]) { // 층마다 창과 쇠창살, 실외기
      p.hl(0, fy + 24, x1, '#c0bbae'); p.hl(0, fy + 25, x1, '#6e695e');
      for (let x = 6; x < x1 - 20; x += 30) {
        if (fy === 34 && x > 40 && x < 110) continue;
        const lit = (x === 36 && fy === 4) || (x === 186 && fy === 4);
        p.rect(x, fy + 4, 20, 14, lit ? '#e8c47c' : '#1e2430'); for (let i = x; i < x + 20; i += 3) p.vl(i, fy + 3, 16, '#4a4c50');
        p.rect(x + 22, fy + 14, 6, 6, '#c8c6c0'); p.ell(x + 25, fy + 17, 2, 2, '#7a7c80');
      }
    }
    bigText(p, 172, 2, '108', '#6a6458', 3); // 동 번호
    // 현관: 차양, 유리문, 안은 노란 불빛
    const dx = 4 * T;
    p.rect(dx - 6, 34, 44, 5, '#7a7468'); p.hl(dx - 6, 34, 44, '#b0aa9c'); p.hl(dx - 6, 39, 44, '#4a463e');
    p.rect(dx, 40, 32, GY - 40, '#3a3a36'); p.rect(dx + 2, 42, 28, GY - 42, '#e0a860'); p.vl(dx + 16, 42, GY - 42, '#3a3a36');
    p.rect(dx + 4, 46, 10, 12, '#f0c888'); p.line(dx + 4, 60, dx + 12, 50, '#f8dcaa');
    p.rect(dx - 4, GY - 2, 40, 2, '#8a867a');
  }
  // 경비실: 작은 초소. 창에 불이 켜져 있고, 그 안에 박씨의 그림자.
  {
    const x0 = 16 * T - 2;
    p.rect(x0 - 2, GY - 36, 38, 4, '#4a5a6a'); p.hl(x0 - 2, GY - 36, 38, '#6a7a8a');
    p.rect(x0, GY - 32, 34, 32, '#c8c2b0'); p.vl(x0 + 33, GY - 32, 32, '#8a8474');
    p.rect(x0 + 4, GY - 28, 20, 12, '#dcc890'); p.ell(x0 + 15, GY - 24, 2.5, 2.5, '#6a5e48'); p.ell(x0 + 15, GY - 18, 5, 3, '#6a5e48'); p.hl(x0 + 12, GY - 26, 7, '#4a5a6a'); // 경비 모자를 쓴 그림자
    p.hl(x0 + 4, GY - 16, 20, '#8a8474'); p.rect(x0 + 26, GY - 26, 6, 26, '#6a7480');
    text(p, x0 + 7, GY - 8, '108', '#3a3a3a');
  }
  // 바닥: 아스팔트 주차장
  asphalt(p, 0, GY, W, H - GY, 65);
  for (let x = 48; x < W - 40; x += 48) { p.vl(x, iy(5), 40, '#bdbcb2', 0.55); }      // 주차선
  p.hl(32, iy(5), W - 80, '#bdbcb2', 0.45);
  for (let x = 12 * T; x < 12 * T + 7; x++) for (let y = iy(1); y < iy(9); y++) p.set(x, y, ((y >> 3) % 2 === 0) ? '#b8a040' : '#3a3c40', 0.55); // 과속방지턱
  for (let i = 0; i < 8; i++) crack(p, 20 + i * 57, iy(2) + Math.floor(rnd(i, 1, 66) * 90), 18, '#3a3c40', i + 70);
  p.ell(22 * T, iy(7), 7, 5, '#3c3e42'); p.ell(22 * T, iy(7), 5, 3, '#4a4c50'); // 맨홀
  p.hl(0, GY, W, '#2a2c30', 0.6);
  // ── 앞에 서는 것들 ──
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void, footRow: number): void => { const L = new Pix(W, H); draw(L); props.push(cut(L, top, footRow * T)); };
  // 위쪽 줄의 나무 (108동 옆, 경비실 양옆): 사람 뒤라서 바닥 그림에 넣는다
  tree(p, 15 * T, GY, 20, 1); tree(p, 19 * T, GY, 19, 2);
  prop((L) => lampPost(L, 8 * T + 7, iy(4) - 2, 86), 4);
  prop((L) => lampPost(L, 21 * T + 7, iy(6) - 2, 86), 6);
  prop((L) => tree(L, 3 * T + 8, iy(8) - 2, 22, 3), 8); props[props.length - 1].fade = true;
  prop((L) => tree(L, 27 * T + 8, iy(7) - 2, 21, 4), 7); props[props.length - 1].fade = true;
  prop((L) => { // 세워 둔 낡은 승용차 (6-8칸, 6-7줄)
    const x0 = 6 * T, y0 = iy(6) - 10;
    L.rect(x0, y0 + 10, 48, 22, '#6a7a8c'); L.hl(x0, y0 + 10, 48, '#8a9aac'); L.rect(x0 + 8, y0, 30, 14, '#5a6a7c'); L.hl(x0 + 8, y0, 30, '#7a8a9c');
    L.rect(x0 + 10, y0 + 2, 12, 9, '#2a3444'); L.rect(x0 + 24, y0 + 2, 12, 9, '#2a3444'); L.line(x0 + 11, y0 + 9, x0 + 15, y0 + 3, '#4a5a6c');
    L.rect(x0 + 2, y0 + 22, 6, 3, '#e8d8a0'); L.rect(x0 + 40, y0 + 22, 6, 3, '#c04030'); L.rect(x0, y0 + 28, 48, 4, '#3a4450');
    L.rect(x0 + 4, y0 + 30, 8, 4, '#1a1c20'); L.rect(x0 + 36, y0 + 30, 8, 4, '#1a1c20');
    L.rect(x0 + 16, y0 + 18, 14, 4, '#e8e4d8'); L.dots(`${x0 + 18},${y0 + 20} ${x0 + 22},${y0 + 20} ${x0 + 26},${y0 + 20}`, '#3a3a3a'); // 앞유리 밑 주차증
  }, 8);
  prop((L) => { // 아래 생울타리, 놀이터로 가는 틈
    hedge(L, 0, iy(9) - 6, 22 * T, 22, 67); hedge(L, 25 * T, iy(9) - 6, 5 * T, 22, 68);
  }, 9);
  prop((L) => hedge(L, 0, GY - 4, 12, H - GY + 4, 69), 0); // 왼쪽 생울타리 (위에서 본다)
  prop((L) => { chainFence(L, W - 14, GY, 12, H - GY); }, 9);
  return { base: p, props };
}

function playground(s: PlaceState): Place {
  const m = MAPS.playground, top = 56, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T, GY = iy(0) + 8;
  // 놀이터 너머: 단지 쪽 어두운 아파트 벽과 하늘
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#1c2232', '#2a3040', y / GY));
  p.rect(0, 6, 130, GY - 6, '#6e6a60'); p.rect(200, 2, W - 200, GY - 2, '#68645a');
  for (const [x0, x1] of [[0, 130], [200, W]] as const) for (let y = 12; y < GY - 8; y += 14) for (let x = x0 + 6; x < x1 - 14; x += 26) {
    const lit = rnd(x, y, 71) > 0.82;
    p.rect(x, y, 14, 8, lit ? '#d8b070' : '#1e2430'); for (let i = x; i < x + 14; i += 3) p.vl(i, y, 8, '#4a4c50');
  }
  bigText(p, 230, 10, '107', '#4e4a42', 2);
  // 모래
  sand(p, 0, GY, W, H - GY, 72);
  // 왼쪽 화단: 고양이가 들어간 곳
  hedge(p, 0, iy(1) - 4, 16, 6 * T + 4, 73);
  for (let y = iy(1); y < iy(7); y += 7) p.dots(`${4 + (y % 3)},${y} ${9},${y + 3}`, '#c8506a');  // 시든 봉숭아
  // 놀이터 바닥 테두리 (모래 둑)
  p.hl(0, iy(11) - 1, W, '#8a7a5a');
  // ── 앞에 서는 것들 ──
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void, footRow: number): void => { const L = new Pix(W, H); draw(L); props.push(cut(L, top, footRow * T)); };
  prop((L) => { // 위쪽 울타리 (입구 틈)
    for (const [x0, x1] of [[0, 8 * T], [11 * T, W]] as const) {
      for (let x = x0; x < x1; x++) { L.vl(x, iy(0) - 2, 14, x % 4 === 0 ? '#4a5054' : '#2a2e32', x % 4 === 0 ? 1 : 0); }
      L.hl(x0, iy(0) - 2, x1 - x0, '#6a7074'); L.hl(x0, iy(0) + 6, x1 - x0, '#5a6064');
      for (let x = x0; x < x1; x += 4) L.vl(x, iy(0) - 2, 14, '#4a5054');
    }
  }, 1);
  prop((L) => { // 미끄럼틀: 계단, 발판, 기울어진 미끄럼판 (2-4칸, 2-3줄)
    const x0 = 2 * T, y0 = iy(2);
    L.rect(x0 + 2, y0 - 24, 3, 44, '#4a5a7a'); L.rect(x0 + 13, y0 - 24, 3, 44, '#4a5a7a');               // 기둥
    for (let y = y0 - 20; y < y0 + 18; y += 5) L.hl(x0 + 2, y, 14, '#6a7a9a');                            // 사다리
    L.rect(x0, y0 - 28, 20, 6, '#c8a040'); L.hl(x0, y0 - 28, 20, '#e8c060'); L.hl(x0, y0 - 23, 20, '#8a6a20'); // 발판
    for (let i = 0; i < 30; i++) { const x = x0 + 18 + i, y = y0 - 26 + Math.round(i * 1.4); L.vl(x, y, 7, i % 6 < 3 ? '#d06040' : '#c05030'); L.set(x, y, '#e88060'); L.set(x, y + 7, '#7a3020'); }
    L.rect(x0 + 44, y0 + 16, 6, 3, '#9a4a30');
  }, 4);
  prop((L) => { // 그네 틀 (8-12칸, 6줄). 쇠사슬과 앉는 판은 흔들리므로 world.ts 가 그린다 (SWING_SEATS).
    const x0 = 8 * T + 4, x1 = 13 * T - 4, by = iy(7) - 2, ty = by - 64;
    for (const x of [x0, x1]) { L.line(x - 4, by, x, ty, '#3a4a5a'); L.line(x - 3, by, x + 1, ty, '#5a6a7a'); L.line(x + 4, by, x, ty, '#3a4a5a'); }
    L.rect(x0 - 2, ty - 3, x1 - x0 + 5, 4, '#4a5a6a'); L.hl(x0 - 2, ty - 3, x1 - x0 + 5, '#7a8a9a');
  }, 7);
  // 앉는 판은 앉은 사람 밑이라서 바닥 그림에도 그림자를 둔다
  for (const sx of [9 * T + 8, 11 * T + 8]) p.ell(sx, iy(7) - 4, 7, 2, '#8a7a58');
  prop((L) => { // 시소 (3-5칸, 8줄)
    const x0 = 3 * T, y0 = iy(8) + 4;
    L.line(x0, y0 - 2, x0 + 47, y0 + 6, '#c8a040'); L.line(x0, y0 - 1, x0 + 47, y0 + 7, '#a88020'); L.line(x0, y0, x0 + 47, y0 + 8, '#7a5a10');
    L.rect(x0 + 21, y0 + 3, 6, 7, '#4a5a7a'); L.rect(x0 + 2, y0 - 6, 2, 5, '#3a3a40'); L.rect(x0 + 44, y0 + 2, 2, 5, '#3a3a40');
  }, 9);
  prop((L) => { // 벤치 (15-16칸, 3줄)
    const x0 = 15 * T, y0 = iy(3) - 8;
    L.rect(x0, y0, 32, 4, '#8a6a4a'); L.hl(x0, y0, 32, '#a8865e'); L.rect(x0, y0 + 6, 32, 5, '#7a5a3a'); L.hl(x0, y0 + 6, 32, '#9a7a56');
    L.rect(x0 + 2, y0 + 11, 2, 10, '#3a3a40'); L.rect(x0 + 28, y0 + 11, 2, 10, '#3a3a40');
  }, 4);
  prop((L) => lampPost(L, 14 * T + 8, iy(3) - 2, 80), 3);
  prop((L) => { // 오른쪽, 아래 울타리
    for (let y = iy(1); y < H; y++) { L.set(W - 9, y, '#2a2e32'); if (y % 4 === 0) L.hl(W - 12, y, 10, '#4a5054'); }
    L.vl(W - 12, iy(1), H - iy(1), '#5a6064');
    for (let x = 0; x < W; x++) { L.vl(x, iy(11) - 6, 14, x % 4 === 0 ? '#4a5054' : '#2a2e32', x % 4 === 0 ? 1 : 0.4); }
    L.hl(0, iy(11) - 6, W, '#6a7074');
  }, 12);
  prop((L) => hedge(L, 0, iy(10) - 4, 16, 20, 74), 11);
  return { base: p, props };
}

function recycle(s: PlaceState): Place {
  const m = MAPS.recycle, top = 40, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), iy = (r: number): number => top + r * T, WB = iy(1);
  // 분리수거장 뒷벽: 시멘트 블록, 페인트 글씨
  for (let y = 0; y < WB; y++) for (let x = 0; x < W; x++) {
    const bx = (x + ((y >> 3) % 2) * 8) % 16, by = y % 8;
    let col = bx === 0 || by === 0 ? '#6e6a60' : '#8e897c';
    if (rnd(x, y, 80) > 0.92) col = '#827d70';
    if (y < 3) col = '#a8a394';
    p.set(x, y, col);
  }
  p.rect(30, 8, 76, 16, '#e8e4d6'); p.rect(31, 9, 74, 14, '#3a6a9a'); for (const [x, w] of [[36, 30], [36, 22], [72, 28], [72, 18]] as const) p.hl(x, x === 36 ? (w === 30 ? 12 : 17) : (w === 28 ? 12 : 17), w, '#ffffff', 0.8); p.vl(68, 11, 10, '#ffffff', 0.5); // 분리수거 요일 안내판
  for (let x = 0; x < W; x++) if (rnd(x, 2, 81) > 0.8) p.vl(x, 3, 6 + Math.floor(rnd(x, 3, 81) * 20), '#5e5a50', 0.4);
  // 바닥: 젖은 시멘트, 흘러나온 물 자국
  concrete(p, 0, WB, W, H - WB, '#6e6c66', 82);
  for (let y = WB; y < H; y++) for (let x = 0; x < W; x++) if (rnd(x >> 2, y >> 2, 83) > 0.82) p.set(x, y, '#5a5852', 0.6);
  p.hl(0, WB, W, '#2a2a28', 0.6); p.dither(0, WB + 1, W, 2, '#2a2a28', 0, 0.35);
  // 수거함들 (막힌 칸): 초록 그물망 자루, 노란 자루, 파란 통, 납작한 박스 더미
  // 자루: 아래가 불룩하고 위를 묶었다. 그물 자루는 안의 병이 비친다.
  const bag = (x0: number, w: number, c: string, net: boolean, seed: number): void => {
    const y0 = WB - 18, h = 32, cx = x0 + w / 2;
    const L = mix(c, '#ffffff', 0.25), D = mix(c, '#000000', 0.25), DD = mix(c, '#000000', 0.45);
    for (let y = y0; y < y0 + h; y++) {
      const t = (y - y0) / h, hw = (w / 2) * (0.45 + 0.55 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.5)) + (rnd(y, seed, 84) - 0.5);
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const k = (x - cx) / hw;
        let col = k < -0.55 ? L : k > 0.6 ? D : c;
        if (y > y0 + h - 3) col = DD;
        if (net && ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0)) col = DD;
        if (!net && (x * 7 + y * 3) % 13 === 0) col = L; // 비닐 주름
        p.set(x, y, col);
      }
    }
    p.rect(cx - 2, y0 - 4, 4, 5, D); p.hl(cx - 3, y0 - 4, 6, c); p.set(cx + 2, y0 - 5, L); // 묶은 매듭
    if (net) for (let i = 0; i < 7; i++) { const bx = x0 + 5 + ((i * 7) % (w - 10)), by = y0 + 8 + (i % 3) * 7; p.rect(bx, by, 3, 6, '#c8dce4'); p.set(bx + 1, by - 1, '#3a6ea8'); p.vl(bx, by + 1, 4, '#eef6f8'); }
  };
  bag(2 * T - 2, 34, '#3e7a4a', true, 1);
  bag(5 * T - 1, 32, '#d0b030', false, 2);
  p.rect(8 * T + 2, WB - 22, 44, 32, '#3a6a9a'); p.hl(8 * T + 2, WB - 22, 44, '#6a9aca'); p.rect(8 * T + 2, WB - 24, 44, 3, '#2a5a8a'); p.vl(8 * T + 45, WB - 22, 32, '#2a4a6a'); p.vl(8 * T + 2, WB - 22, 32, '#5a8aba');
  p.rect(8 * T + 8, WB - 16, 14, 7, '#e8e8e8'); p.dots(`${8 * T + 11},${WB - 13} ${8 * T + 14},${WB - 14} ${8 * T + 17},${WB - 13} ${8 * T + 14},${WB - 11}`, '#3a6a9a'); // 재활용 표시
  p.rect(8 * T + 4, WB + 4, 40, 6, '#a68a62'); p.hl(8 * T + 4, WB + 4, 40, '#bea078'); p.hl(8 * T + 4, WB + 7, 40, '#8a7050'); p.vl(8 * T + 20, WB + 4, 6, '#c8b878'); // 납작하게 묶은 박스
  // 버려진 의자 하나, 스티로폼 상자
  p.rect(12 * T, WB - 8, 12, 4, '#8a6a4a'); p.rect(12 * T, WB - 20, 3, 16, '#8a6a4a'); p.vl(12 * T + 10, WB - 4, 8, '#5a4a3a'); p.vl(12 * T + 1, WB - 4, 8, '#5a4a3a');
  p.rect(T + 2, WB - 10, 10, 8, '#e8e8e2'); p.hl(T + 2, WB - 10, 10, '#ffffff');
  // ── 앞에 서는 것: 앞쪽 낮은 담, 왼쪽 담. 오른쪽은 트였다. ──
  const L = new Pix(W, H);
  const wallTop = (x0: number, y0: number, w: number, h: number): void => {
    L.rect(x0, y0, w, h, '#8e897c'); L.hl(x0, y0, w, '#b0ab9c'); L.hl(x0, y0 + h - 1, w, '#4a463e');
    for (let x = x0; x < x0 + w; x += 16) L.vl(x, y0 + 4, h - 5, '#6e6a60');
  };
  wallTop(0, iy(6) - 8, W, 24);
  const L2 = new Pix(W, H);
  L2.rect(0, WB - 8, 10, iy(6) - WB + 8, '#7e796c'); L2.vl(9, WB - 8, iy(6) - WB + 8, '#a8a394');
  L2.rect(W - 10, WB - 8, 10, iy(4) - WB + 8, '#7e796c'); L2.vl(W - 10, WB - 8, iy(4) - WB + 8, '#a8a394');
  return { base: p, props: [cut(L, top, 6 * T), cut(L2, top, 0)] };
}

// ═══════════════════ 파티룸 ═══════════════════
// 털날림 주의보 정모. 골목 안쪽 건물 삼 층. 왼쪽은 계단참과 현관문, 가운데 본방, 오른쪽 작은 방.
// 본방 벽은 단체 사진 속 그 나무 벽이다. 삼각 깃발 줄, 꼬마전구, 에어컨, 소파, 접이식 테이블.
function party(_s: PlaceState): Place {
  const m = MAPS.party, top = 56, W = m.grid[0].length * T, H = m.grid.length * T + top, WB0 = top + T;
  const p = new Pix(W, H);
  const ry = (r: number): number => top + r * T;
  const tx = (c: number): number => c * T;
  p.rect(0, 0, W, H, '#000000');
  // ── 계단참 (0-3칸): 연두색 걸레받이 페인트, 위는 누런 미색. 형광등 하나. ──
  for (let y = 6; y < WB0; y++) for (let x = 16; x < tx(4) + 5; x++) {
    const n = rnd(x, y, 61);
    p.set(x, y, y > 44 ? (n > 0.93 ? '#5c7466' : '#66806f') : n > 0.95 ? '#a8a290' : '#b5af9c');
  }
  p.hl(16, 44, tx(4) - 11, '#4e6457'); p.hl(16, 45, tx(4) - 11, '#7a947f');
  for (let x = 18; x < tx(4); x += 7) if (rnd(x, 2, 62) > 0.4) p.vl(x, 46, 3 + Math.floor(rnd(x, 3, 62) * 8), '#4e6457', 0.5); // 페인트 흘러내린 자국
  p.rect(16, 0, tx(4) - 11, 6, '#3c3a36'); p.hl(16, 5, tx(4) - 11, '#8e826c');
  p.rect(26, 6, 28, 3, '#dfe6e2'); p.hl(26, 8, 28, '#9aa49f'); // 형광등
  p.rect(22, 20, 10, 13, '#f2efe6'); p.hl(23, 22, 8, '#8a8a8a'); p.hl(23, 24, 6, '#8a8a8a'); p.hl(23, 26, 7, '#8a8a8a'); p.rect(24, 28, 5, 3, '#d04a4a'); // 붙은 전단 (배달 음식)
  p.set(22, 20, '#c8b878'); p.set(31, 20, '#c8b878');
  p.rect(40, 30, 14, 8, '#2a2c2e'); p.rect(41, 31, 12, 6, '#5a6a62'); text(p, 43, 32, '3F', '#e8f0e4'); // 층 표시
  concrete(p, 16, WB0, tx(4) - 11, ry(6) - WB0, '#8d8b84', 63);
  for (let i = 0; i < 40; i++) p.set(16 + Math.floor(rnd(i, 1, 64) * 48), WB0 + Math.floor(rnd(i, 2, 64) * 80), ['#a8a49a', '#6e6c66', '#b4ab94'][i % 3]); // 인조석 알갱이
  // 내려가는 계단 (0칸 4줄)
  for (let k = 0; k < 4; k++) { const c = mix('#8d8b84', '#141516', k / 3.4); p.rect(0, ry(4) - 4 + k * 5, 16 - k * 2, 5, c); p.hl(0, ry(4) - 4 + k * 5, 16 - k * 2, mix(c, '#ffffff', 0.15)); }
  p.rect(0, ry(3), 16, ry(4) - 4 - ry(3), '#3a3a38'); p.rect(0, ry(5) + 4, 16, ry(6) - ry(5) - 4, '#3a3a38');
  p.hl(0, ry(4) - 7, 18, '#9a9a96'); p.hl(0, ry(5) + 3, 18, '#9a9a96'); // 난간
  // 현관문 앞 발판과 우산
  p.rect(tx(3) + 1, ry(4) + 2, 10, 12, '#4a4038'); p.dither(tx(3) + 1, ry(4) + 2, 10, 12, '#5e5246', 0, 0.6);
  // ── 본방 뒷벽 (5-16칸): 세로 판자. 사진 속 그 색. ──
  const R0 = tx(5) - 5, R1 = tx(17) + 5;
  for (let y = 6; y < WB0; y++) for (let x = R0; x < R1; x++) {
    const plank = Math.floor((x - R0) / 9), seam = (x - R0) % 9 === 0;
    const base = mix('#80604a', '#5e4334', y / WB0 * 0.7 + (rnd(plank, 0, 65) - 0.5) * 0.25);
    let c = seam ? mix(base, '#2a1d15', 0.45) : (x - R0) % 9 === 1 ? mix(base, '#ffffff', 0.08) : base;
    if (!seam && rnd(x, y >> 1, 66) > 0.93) c = mix(base, '#3a281c', 0.25); // 옹이와 결
    p.set(x, y, c);
  }
  p.rect(R0, 0, R1 - R0, 6, '#2e241e'); p.hl(R0, 5, R1 - R0, '#9a7a5e');
  p.rect(R0, WB0 - 5, R1 - R0, 5, '#3e2c22'); p.hl(R0, WB0 - 5, R1 - R0, '#5a4232'); // 걸레받이
  // 창 (5-6칸): 블라인드를 반쯤 내렸다. 오후 세 시의 바깥.
  {
    const x0 = tx(5) + 3, y0 = 14, w = 28, h = 34;
    p.rect(x0 - 2, y0 - 2, w + 4, h + 5, '#e8e2d6'); p.rect(x0, y0, w, h, '#cfe0ea');
    for (let y = y0 + 18; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, mix('#d6e6ee', '#a8c2cc', (y - y0 - 18) / 16)); // 길 건너 건물
    p.rect(x0 + 3, y0 + 22, 9, 12, '#9aaab0'); p.rect(x0 + 15, y0 + 20, 11, 14, '#b0bcc0');
    for (let i = 0; i < 4; i++) p.rect(x0 + 5 + (i % 2) * 3, y0 + 24 + Math.floor(i / 2) * 4, 2, 2, '#e8f0f2');
    for (let y = y0; y < y0 + 17; y += 2) { p.hl(x0, y, w, '#f2efe6'); p.hl(x0, y + 1, w, '#d8d2c4'); } // 블라인드
    p.vl(x0 + w / 2, y0, h, '#e8e2d6'); p.rect(x0 - 3, y0 + h + 1, w + 6, 3, '#f2efe6'); p.hl(x0 - 3, y0 + h + 3, w + 6, '#9a9284');
    p.vl(x0 + 4, y0 + 17, 9, '#c8c0b0'); p.set(x0 + 4, y0 + 26, '#e8e2d6'); // 블라인드 줄
    p.rect(x0 + 2, y0 + h - 2, 5, 3, '#7aa86a'); p.rect(x0 + 3, y0 + h - 5, 3, 3, '#8ac07a'); p.set(x0 + 4, y0 + h - 6, '#5a8a4a'); // 창턱의 작은 화분
  }
  // 사진 벽 (7-11칸): 크라프트지 현수막에 발바닥과 글자 조각, 옆에 폴라로이드.
  {
    const x0 = tx(7) + 6, y0 = 22, w = 66, h = 15;
    p.rect(x0, y0, w, h, '#c9a774'); p.hl(x0, y0, w, '#dcbd8c'); p.hl(x0, y0 + h - 1, w, '#9a7a4e');
    for (let x = x0; x < x0 + w; x += 3) p.set(x, y0 + h, '#c9a774'); // 손으로 자른 아래 가장자리
    const LC = ['#e06a5a', '#f2c25a', '#6ab0d8', '#8ccf7a', '#c98ad8', '#f08a3a'];
    for (let i = 0; i < 8; i++) { // 글자: 색종이를 오려 붙였다 (읽히지 않을 만큼 작다)
      const lx = x0 + 6 + i * 7, c = LC[i % LC.length];
      p.rect(lx, y0 + 4, 5, 7, c); p.rect(lx + 1 + (i % 3), y0 + 5 + (i % 2) * 2, 2, 3, '#c9a774'); p.hl(lx, y0 + 4, 5, mix(c, '#ffffff', 0.35));
    }
    for (const [px, py] of [[x0 - 6, y0 + 8], [x0 + w + 3, y0 + 3]] as const) { // 발바닥 도장
      p.ell(px + 2, py + 3, 2, 1.6, '#e8d8c8'); for (const dx of [-1, 1, 3, 5]) p.set(px + dx, py, '#e8d8c8');
    }
    for (const [x, y, c] of [[tx(11) + 4, 40, '#f08a3a'], [tx(11) + 10, 44, '#8a5a3c'], [tx(7) - 4, 42, '#eceaf2']] as const) { // 폴라로이드: 지난 정모의 탈들
      p.rect(x, y, 7, 8, '#f6f2ea'); p.rect(x + 1, y + 1, 5, 5, '#3a3036'); p.ell(x + 3.5, y + 3.5, 1.6, 1.6, c); p.set(x + 3, y - 1, '#d04a4a');
    }
  }
  // 깃발 줄과 꼬마전구 (5-16칸)
  const FL = ['#e06a5a', '#f2c25a', '#6ab0d8', '#8ccf7a', '#c98ad8'];
  const sag = (x: number, a: number, b: number, d: number): number => 9 + Math.sin(((x - a) / (b - a)) * Math.PI) * d;
  for (const [a, b] of [[R0, tx(11) + 8], [tx(11) + 8, R1]] as const) {
    for (let x = a; x < b; x++) p.set(x, Math.round(sag(x, a, b, 7)), '#2a1d15');
    for (let x = a + 4, i = 0; x < b - 6; x += 10, i++) {
      const y = Math.round(sag(x, a, b, 7));
      for (let j = 0; j < 7; j++) p.hl(x + Math.floor(j / 2), y + 1 + j, 7 - j, mix(FL[(i + (a > R0 ? 2 : 0)) % FL.length], '#000000', j > 4 ? 0.15 : 0));
    }
    for (let x = a + 1; x < b; x++) p.set(x, Math.round(sag(x, a, b, 5)) + 6, '#3a2a1e'); // 전구 줄
    for (let x = a + 6, i = 0; x < b - 3; x += 8, i++) { // 전구: 유리알이 한 점씩 반짝인다
      const y = Math.round(sag(x, a, b, 5)) + 7;
      p.set(x, y, '#ffe9a8'); p.set(x, y + 1, '#ffc860'); p.set(x - 1, y + 1, '#e8a040'); p.set(x, y + 2, '#c88830');
    }
  }
  // 화장실 문 (12칸): 흰 문, 남녀 그림 판
  {
    const x0 = tx(12) - 2, w = 20, h = 50, y0 = WB0 - h;
    p.rect(x0 - 2, y0 - 2, w + 4, h + 2, '#5e4334'); p.rect(x0, y0, w, h, '#e6e2d8'); p.vl(x0, y0, h, '#f6f2ea'); p.vl(x0 + w - 1, y0, h, '#b8b2a6');
    p.rect(x0 + 4, y0 + 10, 12, 8, '#3a4a5a'); p.ell(x0 + 7, y0 + 12, 1, 1, '#e8f0f4'); p.rect(x0 + 6, y0 + 14, 3, 3, '#e8f0f4'); p.ell(x0 + 13, y0 + 12, 1, 1, '#f4a0a8'); p.rect(x0 + 12, y0 + 14, 3, 3, '#f4a0a8');
    p.rect(x0 + w - 5, y0 + 26, 3, 2, '#9a9284');
  }
  // 에어컨 (14-15칸): 십팔 도로 내려 놓았다
  {
    const x0 = tx(14) - 4, y0 = 16, w = 40, h = 13;
    p.rect(x0, y0, w, h, '#eceae4'); p.hl(x0, y0, w, '#fbfaf6'); p.hl(x0, y0 + h - 1, w, '#a8a69e'); p.vl(x0 + w - 1, y0, h, '#c4c2ba');
    p.rect(x0 + 2, y0 + h - 4, w - 4, 2, '#8a8880'); for (let x = x0 + 3; x < x0 + w - 3; x += 3) p.set(x, y0 + h - 3, '#5a5852');
    p.rect(x0 + 4, y0 + 3, 9, 6, '#1e2a26'); text(p, x0 + 5, y0 + 3, '18', '#7fe0b0'); p.set(x0 + w - 5, y0 + 4, '#7fe39a');
    p.line(x0 + w - 6, y0 + h, x0 + w - 4, y0 + h + 20, '#c4c2ba'); // 배수 호스
  }
  // 소파 (13-16칸, 1줄): 먼지 낀 청록 벨벳. 등받이가 벽에 붙어 있다.
  {
    const x0 = tx(13) - 2, x1 = tx(17) + 1, yb = WB0 - 12, ys = ry(1) + 2, ye = ry(2) - 1;
    p.rect(x0, yb, x1 - x0, ys - yb + 2, '#3e6670'); p.hl(x0 + 1, yb, x1 - x0 - 2, '#5a8892'); p.hl(x0, yb + 1, x1 - x0, '#4a7680');
    for (let x = x0 + 21; x < x1 - 4; x += 21) p.vl(x, yb + 3, ys - yb - 3, '#2f525a'); // 등쿠션 사이
    p.rect(x0, ys, x1 - x0, ye - ys, '#4a7680'); p.hl(x0, ys, x1 - x0, '#6a9aa2'); p.hl(x0, ye - 2, x1 - x0, '#2f525a'); p.hl(x0, ye - 1, x1 - x0, '#1e3338');
    for (let x = x0 + 21; x < x1 - 4; x += 21) p.vl(x, ys + 1, ye - ys - 3, '#3a626a');
    for (let y = yb; y < ye; y++) for (let x = x0; x < x1; x++) if (rnd(x, y, 67) > 0.95) p.set(x, y, '#5a8690', 0.6); // 벨벳 결
    for (const ax of [x0 - 3, x1 - 3]) { p.rect(ax, ys - 6, 6, ye - ys + 6, '#355a62'); p.hl(ax, ys - 6, 6, '#5a8892'); p.hl(ax, ye - 1, 6, '#1e3338'); } // 팔걸이
    p.rect(x0 + 4, ys - 7, 10, 8, '#e88aa0'); p.hl(x0 + 4, ys - 7, 10, '#f6aec0'); p.set(x0 + 8, ys - 3, '#c86a80'); // 쿠션
    p.rect(x1 - 16, ys - 6, 9, 7, '#f2c25a'); p.hl(x1 - 16, ys - 6, 9, '#fad88a');
    p.rect(x0 + 30, ys + 2, 8, 3, '#d8d4cc'); p.hl(x0 + 30, ys + 2, 8, '#f2efe8'); // 소파에 흘린 털 뭉치 브러시
  }
  // ── 작은 방 뒷벽 (18-22칸): 줄무늬 벽지. 백열등 하나. 규칙이 붙어 있다. ──
  const S0 = tx(18) - 5, S1 = tx(23) + 5;
  for (let y = 6; y < WB0; y++) for (let x = S0; x < S1; x++) p.set(x, y, (x >> 2) % 2 ? '#c8c0ae' : '#cfc8b6');
  for (let y = 6; y < WB0; y++) for (let x = S0; x < S1; x++) if (rnd(x, y, 68) > 0.97) p.set(x, y, '#b8b09c');
  p.rect(S0, 0, S1 - S0, 6, '#2e2a26'); p.hl(S0, 5, S1 - S0, '#8a8272');
  p.rect(S0, WB0 - 4, S1 - S0, 4, '#7a6a58'); p.hl(S0, WB0 - 4, S1 - S0, '#94826c');
  { // 붙은 종이: "머리는 여기서만" (줄 몇 개로)
    const x0 = tx(20) + 1, y0 = 16;
    p.rect(x0, y0, 14, 17, '#f8f6ee'); p.hl(x0 + 2, y0 + 3, 10, '#d04a4a'); for (let i = 0; i < 4; i++) p.hl(x0 + 2, y0 + 6 + i * 3, 6 + ((i * 3) % 5), '#5a5a5a');
    p.set(x0 + 1, y0, '#c8b878'); p.set(x0 + 12, y0, '#c8b878');
  }
  p.line(tx(21) + 8, 6, tx(21) + 8, 12, '#3a3430'); p.ell(tx(21) + 8, 14, 2, 2.4, '#ffe2a0'); p.set(tx(21) + 7, 13, '#ffffff'); // 백열등
  // 바닥: 본방은 꿀색 마루, 작은 방은 회색 장판
  for (let y = WB0; y < ry(6); y++) for (let x = tx(5) - 5; x < tx(17) + 5; x++) {
    const row = Math.floor((y - WB0) / 6), in6 = (y - WB0) % 6;
    let c = in6 === 0 || (x + row * 29) % 52 === 0 ? '#7a5634' : in6 === 1 ? '#b88a5a' : '#a67a4c';
    if (in6 > 1 && rnd(x >> 1, y, 69) > 0.94) c = '#94683e';
    p.set(x, y, c);
  }
  for (let y = WB0; y < ry(6); y++) for (let x = tx(18) - 5; x < tx(23) + 5; x++) p.set(x, y, rnd(x >> 1, y >> 1, 70) > 0.9 ? '#8a8a84' : (x + y) % 12 === 0 ? '#86867f' : '#93938c');
  for (let y = ry(3); y < ry(4); y++) for (let x = tx(17); x < tx(18); x++) p.set(x, y, (x - tx(17)) % 6 === 0 ? '#7a5634' : '#a67a4c'); // 작은 방 문턱
  p.hl(tx(17) + 4, ry(4) - 1, 9, '#5a4a3a');
  for (let y = ry(4) - 4; y < ry(4) + 18; y++) for (let x = tx(4); x < tx(5); x++) p.set(x, y, '#4a4038'); // 현관 문턱
  // 러그 (11-15칸, 2-4줄): 겨자색, 크림색 테두리. 테이블 밑.
  {
    const cx = tx(13) + 8, cy = ry(3) + 8;
    p.ell(cx, cy, 44, 22, '#e8dcc0'); p.ell(cx, cy, 41, 20, '#d4a448');
    for (let y = cy - 20; y <= cy + 20; y++) for (let x = cx - 41; x <= cx + 41; x++) {
      const d = ((x - cx) / 41) ** 2 + ((y - cy) / 20) ** 2;
      if (d <= 1 && d > 0.55 && rnd(x, y, 71) > 0.6) p.set(x, y, '#c8963e');
      if (d <= 0.3 && (x + y) % 5 === 0) p.set(x, y, '#dcb058');
    }
  }
  // 방석: 사람이 앉을 자리
  for (const [c, r, col] of [[13, 2, '#c98ad8'], [15, 3, '#6ab0d8'], [13, 4, '#8ccf7a'], [11, 3, '#e06a5a'], [14, 2, '#f2c25a']] as const) {
    const x = tx(c) + 2, y = ry(r) + 8;
    p.rect(x, y, 12, 7, col); p.hl(x, y, 12, mix(col, '#ffffff', 0.3)); p.hl(x, y + 6, 12, mix(col, '#000000', 0.3)); p.set(x + 6, y + 3, mix(col, '#000000', 0.25));
  }
  // 현관 안쪽에 벗어 놓은 신발: 구두, 운동화, 등산화, 메리제인
  for (const [x, y, c, l] of [[tx(5) + 2, ry(5) + 6, '#1c1a1c', '#3e3a3e'], [tx(5) + 10, ry(5) + 8, '#e8e6e0', '#ffffff'], [tx(6) + 4, ry(5) + 5, '#6a4a2e', '#8a6a48'], [tx(6) + 12, ry(5) + 9, '#c8486a', '#e8789a']] as const) {
    p.rect(x, y, 6, 3, c); p.hl(x, y, 6, l); p.rect(x + 1, y + 4, 6, 3, c); p.hl(x + 1, y + 4, 6, l);
  }
  // 벽 그늘
  const band = (x: number, y: number, w: number): void => { p.hl(x, y, w, '#1d1820', 0.4); p.dither(x, y + 1, w, 1, '#1d1820', 0, 0.28); };
  band(16, WB0, tx(4) - 16); band(R0, WB0, tx(13) - R0); band(tx(13), ry(2) - 1, tx(4)); band(S0, WB0, S1 - S0);
  // 옆벽: 계단참|본방 (4칸, 현관문), 본방|작은 방 (17칸, 문을 열어 두었다), 양 끝
  const slab = (x: number, y0: number, y1: number): void => { p.rect(x, y0, 6, y1 - y0, SLAB); p.vl(x + 5, y0, y1 - y0, SLAB_L); };
  slab(10, 0, H - T + 6); slab(W - 16, 0, H - T + 6);
  slab(tx(4) + 5, 0, ry(4) - 4); slab(tx(4) + 5, ry(4) + 18, H - T + 6);
  { // 현관문: 철문. 계단참 쪽에 종이 한 장과 발바닥 도장.
    const x = tx(4) + 5, y = ry(4) - 4;
    p.rect(x, y, 6, 22, '#3a3a40'); p.rect(x, y + 2, 6, 18, '#5a5e6a'); p.vl(x, y + 2, 18, '#7a7e8a'); p.rect(x - 2, y + 10, 2, 3, '#c8c4b8');
    p.rect(x - 3, y - 12, 3, 9, '#f6f2ea'); p.set(x - 2, y - 10, '#d04a4a'); p.set(x - 2, y - 8, '#3a3a3a'); p.set(x - 2, y - 6, '#c86a3a'); // '털날림 주의보 정모'
  }
  slab(tx(17) + 5, 0, ry(3) - 2); slab(tx(17) + 5, ry(4) + 2, H - T + 6);
  p.rect(tx(17) + 5, ry(3) - 2, 6, 3, '#4a3a2e'); // 문틀 윗부분
  p.rect(tx(18), ry(3) - 14, 3, 14, '#a88a6a'); p.vl(tx(18) + 2, ry(3) - 14, 14, '#7a6048'); // 안으로 열린 문짝
  // ── 앞에 서는 것들 ──
  const props: Prop[] = [];
  { // 접이식 테이블 (12-14칸, 3줄): 피자 상자, 콜라, 종이컵, 반짇고리
    const L = new Pix(W, H), x0 = tx(12) - 1, y0 = ry(3) - 4, w = 50;
    L.rect(x0, y0, w, 18, '#e8e4dc'); L.hl(x0, y0, w, '#fbf9f4'); L.vl(x0, y0, 18, '#f2efe8'); L.vl(x0 + w - 1, y0, 18, '#bcb6aa');
    L.rect(x0, y0 + 18, w, 3, '#9a948a'); L.hl(x0, y0 + 20, w, '#5a564e');
    for (const lx of [x0 + 2, x0 + w - 4]) { L.vl(lx, y0 + 21, 7, '#6a665e'); L.vl(lx + 1, y0 + 21, 7, '#8a867c'); } // 접이식 다리
    // 피자 상자: 뚜껑이 뒤로 젖혀졌다. 올리브가 여섯 개.
    L.rect(x0 + 6, y0 - 7, 22, 8, '#b48a58'); L.hl(x0 + 6, y0 - 7, 22, '#c8a070'); L.rect(x0 + 10, y0 - 5, 9, 3, '#d04a3a');
    L.rect(x0 + 5, y0 + 1, 24, 15, '#c49a66'); L.rect(x0 + 6, y0 + 2, 22, 13, '#e0b878');
    L.ell(x0 + 17, y0 + 8.5, 10, 6, '#d8963e'); L.ell(x0 + 17, y0 + 8.5, 8.6, 5, '#f4cc6a');
    L.line(x0 + 17, y0 + 3, x0 + 17, y0 + 14, '#c8963e'); L.line(x0 + 8, y0 + 8, x0 + 26, y0 + 9, '#c8963e');
    L.rect(x0 + 21, y0 + 5, 5, 4, '#e0b878'); // 한 조각은 이미 없다
    for (const [px, py] of [[x0 + 12, y0 + 6], [x0 + 15, y0 + 11], [x0 + 20, y0 + 11]] as const) { L.ell(px, py, 1.4, 1.2, '#c0392b'); L.set(px, py - 1, '#e05a4a'); } // 페퍼로니
    for (const [px, py] of [[x0 + 10, y0 + 9], [x0 + 13, y0 + 4], [x0 + 16, y0 + 8], [x0 + 19, y0 + 7], [x0 + 23, y0 + 12], [x0 + 11, y0 + 12]] as const) { L.set(px, py, '#2a2a22'); L.set(px + 1, py, '#4a4a3a'); }
    // 1.5리터 콜라와 종이컵
    L.rect(x0 + 33, y0 - 9, 5, 16, '#3a1a16'); L.rect(x0 + 33, y0 - 3, 5, 4, '#d0302a'); L.vl(x0 + 34, y0 - 8, 14, '#6a3a30'); L.rect(x0 + 34, y0 - 11, 3, 2, '#d0302a');
    for (const [cx2, cy2] of [[x0 + 40, y0 + 4], [x0 + 44, y0 + 9], [x0 + 31, y0 + 11]] as const) { L.rect(cx2, cy2, 4, 4, '#f6f2ea'); L.hl(cx2, cy2, 4, '#ffffff'); L.hl(cx2 + 1, cy2 + 1, 2, '#5a2a20'); }
    // 반짇고리: 쿠키 깡통
    L.rect(x0 + 38, y0 + 12, 9, 5, '#3a6aa8'); L.hl(x0 + 38, y0 + 12, 9, '#6a9ad8'); L.set(x0 + 40, y0 + 14, '#f2c25a'); L.set(x0 + 43, y0 + 14, '#f2efe6');
    props.push(cut(L, top, 4 * T));
  }
  { // 삼각대에 꽂은 휴대폰 (9칸, 5줄): 타이머를 맞춰 둔다
    const L = new Pix(W, H), cx = tx(9) + 8, y0 = ry(5) - 14;
    L.line(cx, y0 + 8, cx - 5, y0 + 26, '#2a2a30'); L.line(cx, y0 + 8, cx + 5, y0 + 26, '#2a2a30'); L.line(cx, y0 + 8, cx, y0 + 27, '#3a3a40');
    L.rect(cx - 4, y0, 9, 7, '#1a1a1e'); L.rect(cx - 3, y0 + 1, 7, 5, '#2a3a5a'); L.set(cx + 3, y0 + 1, '#e05a4a'); L.rect(cx - 2, y0 + 7, 5, 2, '#3a3a40');
    props.push(cut(L, top, 6 * T));
  }
  { // 작은 방: 선풍기 두 대 (18-19칸, 1줄)
    const L = new Pix(W, H);
    for (const [cx, by] of [[tx(18) + 8, ry(2) - 1], [tx(19) + 9, ry(2) - 2]] as const) {
      L.ell(cx, by - 1, 6, 2, '#d8d6d0'); L.hl(cx - 5, by - 2, 10, '#eceae4');
      L.rect(cx - 1, by - 22, 2, 20, '#c8c6c0'); L.vl(cx - 1, by - 22, 20, '#e4e2dc');
      L.ell(cx, by - 30, 8, 8, '#9aa2a8'); L.ell(cx, by - 30, 6.5, 6.5, '#e8eef0');
      for (let a = 0; a < 3; a++) { const t = a * 2.094; L.line(cx, by - 30, Math.round(cx + Math.cos(t) * 5), Math.round(by - 30 + Math.sin(t) * 5), '#7ab0d8'); }
      L.ell(cx, by - 30, 1.4, 1.4, '#3a4a5a');
      for (let a = 0; a < 16; a++) L.set(Math.round(cx + Math.cos(a / 2.55) * 7), Math.round(by - 30 + Math.sin(a / 2.55) * 7), '#b8c0c6'); // 망
    }
    props.push(cut(L, top, 2 * T));
  }
  { // 작은 방: 행거 (21-22칸, 1줄). 셔츠와 정장 바지, 등산복 조끼, 카디건. 맨 끝에 빈 옷걸이.
    const L = new Pix(W, H), x0 = tx(21) - 2, x1 = tx(23) - 1, ty = ry(1) - 30;
    L.hl(x0, ty, x1 - x0, '#9aa2a8'); L.hl(x0, ty + 1, x1 - x0, '#5a6268');
    for (const x of [x0, x1 - 1]) L.vl(x, ty, 31, '#7a8288');
    L.hl(x0 - 3, ty + 30, 7, '#5a6268'); L.hl(x1 - 4, ty + 30, 7, '#5a6268');
    const hang = (x: number, w: number, h: number, c: string): void => {
      L.set(x + Math.floor(w / 2), ty + 1, '#c8c4b8'); L.line(x, ty + 4, x + Math.floor(w / 2), ty + 2, '#c8c4b8'); L.line(x + w - 1, ty + 4, x + Math.floor(w / 2), ty + 2, '#c8c4b8');
      L.rect(x, ty + 4, w, h, c); L.vl(x, ty + 4, h, mix(c, '#ffffff', 0.2)); L.vl(x + w - 1, ty + 4, h, mix(c, '#000000', 0.25));
    };
    hang(x0 + 2, 7, 15, '#f2f2ee'); L.vl(x0 + 5, ty + 5, 13, '#d8d8d2'); L.rect(x0 + 4, ty + 8, 3, 1, '#2a4a8a'); // 현우의 흰 셔츠, 주머니의 사원증 줄
    hang(x0 + 10, 5, 22, '#24262c');                                                                     // 정장 바지
    hang(x0 + 16, 7, 13, '#a8a070'); L.vl(x0 + 19, ty + 5, 11, '#6a6448'); L.rect(x0 + 17, ty + 8, 2, 2, '#6a6448'); // 곰표의 조끼
    hang(x0 + 24, 6, 17, '#d8c8a8');                                                                     // 실밥의 카디건
    props.push(cut(L, top, 2 * T));
  }
  { // 작은 방: 긴 의자 (20-22칸, 5줄). 수건과 물병.
    const L = new Pix(W, H), x0 = tx(20) - 1, y0 = ry(5) - 2, w = 50;
    L.rect(x0, y0, w, 7, '#a07a54'); L.hl(x0, y0, w, '#c09a70'); L.hl(x0, y0 + 3, w, '#8a6646'); L.hl(x0, y0 + 6, w, '#6a4a32');
    for (const lx of [x0 + 2, x0 + w - 5]) L.rect(lx, y0 + 7, 3, 7, '#5a3e28');
    L.rect(x0 + 6, y0 - 3, 10, 4, '#e8eef2'); L.hl(x0 + 6, y0 - 3, 10, '#ffffff'); L.vl(x0 + 10, y0 - 3, 4, '#c8d8e0'); // 수건
    for (const bx of [x0 + 36, x0 + 41]) { L.rect(bx, y0 - 7, 3, 8, '#b8dcef'); L.set(bx + 1, y0 - 8, '#3a7ac0'); L.vl(bx, y0 - 6, 5, '#e8f6ff'); } // 물병
    props.push(cut(L, top, 5 * T + 4)); // 5줄에 앉은 사람은 의자 앞에 그린다
  }
  { // 앞벽
    const L = new Pix(W, H), y = ry(6);
    L.rect(10, y, W - 20, 6, SLAB); L.hl(16, y, W - 32, SLAB_L);
    props.push(cut(L, top, 6 * T + 1));
  }
  return { base: p, props };
}

// ═══════════════════ 역 앞 거리 (비 갠 저녁) ═══════════════════
/** 간판 글씨: 읽히지 않는 한글 모양. 한 글자는 5×5 (k 배). 자음 하나, 세로 모음, 가끔 받침. */
function glyphs(p: Pix, x: number, y: number, n: number, col: string, seed: number, k = 1, a = 1): void {
  for (let i = 0; i < n; i++) {
    const gx = x + i * 7 * k, r = (j: number): number => rnd(i, j, seed);
    const px = (u: number, v: number): void => p.rect(gx + u * k, y + v * k, k, k, col, a);
    const fin = r(3) > 0.5, ch = fin ? 3 : 5; // 받침이 있으면 위가 납작하다
    if (r(0) > 0.35) for (let u = 0; u < 3; u++) px(u, 0);         // 윗획
    if (r(1) > 0.3) for (let v = 0; v < ch; v++) px(0, v);         // 왼획
    if (r(5) > 0.5) for (let u = 0; u < 3; u++) px(u, ch - 1);     // 아랫획 (ㅁ, ㄷ)
    else if (r(6) > 0.5) px(1, Math.floor(ch / 2));                 // 점 (ㅅ, ㅈ 비슷하게)
    for (let v = 0; v < ch; v++) px(4, v);                          // 세로 모음
    if (r(2) > 0.4) px(3, Math.floor(ch / 2));                      // 모음의 곁획
    if (fin) { for (let u = 0; u < 5; u++) px(u, 4); if (r(7) > 0.5) px(0, 3); }
  }
}
function street(_s: PlaceState): Place {
  const m = MAPS.street, top = 80, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), GY = top + T, CY = top + 3 * T; // GY: 건물이 보도와 만나는 줄, CY: 연석
  const WET = '#1c1e2c';
  // 하늘: 비 갠 저녁. 구름 아래가 도시 불빛에 보랏빛으로 물들었다.
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#232640', '#4a3c5c', Math.min(1, y / 40)));
  for (let i = 0; i < 6; i++) { const cx = 30 + i * 84 + Math.floor(rnd(i, 1, 101) * 30); p.ell(cx, 6 + Math.floor(rnd(i, 2, 101) * 6), 26, 4, '#3a3450', 0.7); p.ell(cx + 8, 4, 16, 2, '#4a4060', 0.5); }
  // 건물: [x0, x1, 지붕 높이, 벽색]
  const BLD: [number, number, number, string][] = [[0, 80, 10, '#a39a8a'], [80, 160, 4, '#8d6f62'], [160, 224, 16, '#9a9c98'], [224, 304, 12, '#b0a690'], [304, 384, 18, '#7c6e66'], [384, 448, 24, '#5e626a'], [448, 480, 14, '#4e4440']];
  for (const [x0, x1, ry, col] of BLD) {
    const D = mix(col, '#000000', 0.12), L = mix(col, '#ffffff', 0.1);
    for (let y = ry; y < GY; y++) for (let x = x0; x < x1; x++) { const n = rnd(x, y, 102); p.set(x, y, n > 0.94 ? D : n < 0.04 ? L : col); }
    p.hl(x0, ry, x1 - x0, '#2a2834'); p.hl(x0, ry + 1, x1 - x0, L); p.rect(x0, ry - 2, x1 - x0, 2, mix(col, '#000000', 0.3)); // 옥상 난간
    p.vl(x1 - 1, ry, GY - ry, mix(col, '#000000', 0.3));
    for (let x = x0; x < x1; x++) if (rnd(x, 0, 103) > 0.82) p.vl(x, ry + 2, 4 + Math.floor(rnd(x, 1, 103) * 18), D, 0.6); // 빗물 자국
  }
  // 전깃줄: 하늘을 가로지른다
  for (const [y0, sag] of [[14, 5], [19, 4], [24, 6]] as const) for (let x = 0; x < W; x++) { const u = (x % 160) / 160; p.set(x, Math.round(y0 + Math.sin(u * Math.PI) * sag), '#16141e', 0.85); }
  // ── 2층 ──
  const win2 = (x: number, w: number, glass: string, blinds = true): void => {
    p.rect(x - 1, 22, w + 2, 18, '#3a3842'); p.rect(x, 23, w, 16, glass);
    if (blinds) for (let y = 24; y < 31; y += 2) p.hl(x, y, w, mix(glass, '#000000', 0.18));
    p.vl(x + Math.floor(w / 2), 23, 16, '#3a3842'); p.hl(x - 2, 40, w + 4, '#c8c2b4');
  };
  win2(8, 26, '#2a3040'); win2(44, 26, '#e8d8a8');                                 // 편의점 위: 하나는 불이 켜졌다
  for (const x of [88, 118]) { win2(x, 24, '#8a54c8', false); p.rect(x + 2, 25, 20, 3, '#c890f0'); } // 노래방: 보랏빛
  { // 노래방 세로 간판: 짙은 판에 분홍·하늘 글자가 번갈아
    const x = 150; p.rect(x, 8, 10, 40, '#1a1424'); p.vl(x, 8, 40, '#3a2c48'); p.rect(x - 2, 12, 2, 2, '#4a4a50'); p.rect(x - 2, 40, 2, 2, '#4a4a50');
    for (let i = 0; i < 5; i++) glyphs(p, x + 2, 10 + i * 7, 1, i % 2 ? '#7ae8f8' : '#ff7ad8', 104 + i);
  }
  for (const x of [168, 196]) { win2(x, 22, '#d8e4f0'); }                         // 학원: 형광등
  p.rect(190, 20, 4, 22, '#f0ece0'); glyphs(p, 191, 22, 1, '#c83a3a', 105); glyphs(p, 191, 30, 1, '#c83a3a', 106); // 세로 현수막
  win2(234, 22, '#2c3440'); win2(266, 26, '#c8d0b0');
  win2(318, 22, '#262a34'); win2(350, 22, '#262a34');
  p.rect(336, 28, 10, 8, '#c8c8c0'); p.ell(341, 32, 3, 3, '#8a8a88'); p.vl(343, 36, 30, '#5a5a5a', 0.7); // 실외기와 물 떨어지는 관
  for (const x of [392, 420]) win2(x, 26, '#20242c');
  // ── 1층 가게 ──
  const SB = 44, GL = 56, ST = GY - 4; // 간판 띠, 유리, 문턱
  const front = (x0: number, w: number, glass: (x: number, y: number) => string): void => {
    p.rect(x0, SB - 1, w, GY - SB + 1, '#3a3640');
    for (let y = GL; y < ST; y++) for (let x = x0 + 3; x < x0 + w - 3; x++) p.set(x, y, glass(x, y));
    p.vl(x0 + 2, GL, ST - GL, '#5a5862'); p.vl(x0 + w - 3, GL, ST - GL, '#5a5862'); p.hl(x0 + 2, GL - 1, w - 4, '#5a5862');
    p.rect(x0, ST, w, 4, '#8a8880'); p.hl(x0, ST, w, '#a8a69c'); p.hl(x0, GY - 1, w, '#4a4844');
  };
  const sign = (x0: number, w: number, bg: string, fg: string, n: number, seed: number, edge?: string): void => {
    p.rect(x0 + 1, SB, w - 2, 10, bg); p.hl(x0 + 1, SB, w - 2, mix(bg, '#ffffff', 0.25)); p.hl(x0 + 1, SB + 9, w - 2, mix(bg, '#000000', 0.3));
    if (edge) { p.hl(x0 + 1, SB + 1, w - 2, edge); p.hl(x0 + 1, SB + 8, w - 2, edge); }
    glyphs(p, x0 + Math.floor((w - n * 7) / 2) + 1, SB + 3, n, fg, seed);
  };
  const person = (x: number, y: number, col: string): void => { p.ell(x, y, 3, 3, col); p.ell(x, y + 7, 5, 4, col); p.rect(x - 5, y + 7, 11, 6, col); }; // 얼굴 없는 손님
  { // 편의점: 하얀 불빛, 진열대 세 줄
    front(0, 80, (x, y) => (y < GL + 3 ? '#cfe0dc' : '#e6f0ec'));
    for (const y of [64, 72, 80]) { p.hl(6, y, 46, '#9aa8a6'); for (let x = 6; x < 52; x += 2) if (rnd(x, y, 107) > 0.25) p.rect(x, y - 3, 1, 3, ['#d84a3a', '#3a7ad8', '#f0c840', '#4ab070', '#f0f0e8'][Math.floor(rnd(x, y, 108) * 5)]); }
    p.rect(58, GL + 1, 16, ST - GL - 1, '#d8e8e4'); p.vl(58, GL + 1, ST - GL - 1, '#5a5862'); p.vl(66, GL + 1, ST - GL - 1, '#7a7a80'); // 유리문
    p.rect(60, 70, 5, 7, '#f0e080'); p.rect(68, 70, 5, 7, '#f0e080'); // 문에 붙은 행사 전단
    person(30, 70, '#6a7a7c');
    sign(0, 80, '#f2f4f0', '#2a5ab8', 5, 109, '#3aa858');
  }
  { // 치킨집: 주황 불빛, 탁자에 둘러앉은 사람들
    front(80, 80, (x, y) => mix('#f0b870', '#c87840', (y - GL) / 40));
    for (const [x, y] of [[96, 70], [108, 72], [132, 70], [144, 72]] as const) person(x, y, '#6a3a24');
    p.rect(92, 82, 24, 3, '#8a4a28'); p.rect(128, 82, 24, 3, '#8a4a28');
    for (const x of [100, 104, 136, 141]) { p.rect(x, 78, 2, 4, '#f8d860'); p.set(x, 77, '#fff8e0'); } // 맥주잔
    sign(80, 80, '#c43a28', '#f8d040', 5, 110);
    p.ell(146, SB + 5, 3, 2, '#c88038'); p.rect(141, SB + 4, 3, 2, '#f8f0e0'); // 닭다리 그림
  }
  { // 부동산: 문 닫았다. 셔터를 반쯤 내렸고 유리에 매물 종이.
    front(160, 64, () => '#1c2028');
    for (let y = GL + 6; y < ST - 6; y += 9) for (let x = 166; x < 214; x += 9) p.rect(x, y, 6, 7, '#d8d4c8', 0.8);
    for (let y = GL; y < 74; y++) p.hl(163, y, 58, y % 2 ? '#8a8c90' : '#9a9ca0'); p.hl(163, 74, 58, '#5a5c60'); p.rect(188, 72, 8, 2, '#3a3c40');
    sign(160, 64, '#2a3a6a', '#e8ecf0', 4, 111);
  }
  { // 약국: 하얗고, 상자가 빼곡하다. 초록 십자가 돌출 간판.
    front(224, 80, (x, y) => (y < GL + 3 ? '#d8eae2' : '#eef6f2'));
    for (const y of [64, 71, 78, 85]) { p.hl(230, y, 40, '#a8b8b0'); for (let x = 230; x < 270; x += 3) p.rect(x, y - 4, 2, 4, ['#f0f0f0', '#e86a6a', '#6aa8e8', '#f0d070', '#8ad0a0'][Math.floor(rnd(x, y, 112) * 5)]); }
    p.rect(276, GL + 1, 22, ST - GL - 1, '#dceee6'); p.vl(276, GL + 1, ST - GL - 1, '#5a5862'); p.vl(287, GL + 1, ST - GL - 1, '#7a7a80');
    p.rect(250, 82, 22, 8, '#c8d0cc'); // 계산대
    sign(224, 80, '#f4f6f2', '#2a9a4a', 4, 113);
    p.rect(230, 24, 13, 13, '#2a2e30'); p.rect(231, 25, 11, 11, '#3ac860'); p.rect(235, 26, 3, 9, '#f4fff4'); p.rect(232, 29, 9, 3, '#f4fff4'); // 십자가
    p.hl(243, 30, 4, '#4a4a50'); // 벽에 박은 쇠
  }
  { // 카페: 문 닫는 중. 의자를 탁자에 뒤집어 올렸다. 줄무늬 차양.
    front(304, 80, (x, y) => mix('#a87850', '#5a3a28', (y - GL) / 40));
    for (const x of [316, 344]) { p.rect(x, 80, 16, 2, '#4a3020'); p.vl(x + 7, 82, 10, '#4a3020'); for (const dx of [1, 12]) { p.vl(x + dx, 72, 8, '#3a2418'); p.hl(x + dx - 1, 72, 3, '#3a2418'); } }
    p.ell(364, 66, 4, 2, '#f8d090'); p.vl(364, GL, 8, '#2a2020'); // 하나 남은 펜던트 등
    for (let x = 302; x < 386; x++) for (let y = SB - 2; y < SB + 8; y++) p.set(x, y, Math.floor((x - 302) / 6) % 2 ? '#2e5a46' : '#e8dcc0');
    for (let x = 302; x < 386; x += 6) p.set(x + 2, SB + 8, '#2e5a46'); p.hl(302, SB - 3, 84, '#1e3a2e');
  }
  { // 지하철 입구: 유리 지붕 아래로 계단이 내려간다. 25-26칸이 계단 입구.
    const x0 = 400, x1 = 432, RY = 44;
    p.rect(386, RY - 14, 60, 12, '#1e2a48'); p.hl(386, RY - 14, 60, '#3a4a6a'); p.hl(386, RY - 3, 60, '#121a30'); // 역 이름판
    p.ell(396, RY - 8, 4, 4, '#3ab060'); p.ell(396, RY - 8, 3, 3, '#4ac870'); text(p, 395, RY - 10, '2', '#f4fff4');
    glyphs(p, 404, RY - 11, 4, '#f0f4f8', 114); glyphs(p, 432, RY - 9, 1, '#a8b8d0', 115);
    p.rect(386, RY - 2, 60, 5, '#4a5258'); p.hl(386, RY - 2, 60, '#7a868e'); p.hl(386, RY + 2, 60, '#2a3036'); // 지붕
    p.hl(x0 + 2, RY + 3, x1 - x0 - 4, '#f4fff8'); p.hl(x0 + 2, RY + 4, x1 - x0 - 4, '#b8d0d0'); // 지붕 밑 형광등
    for (const gx of [388, 434]) for (let y = RY + 3; y < GY; y++) for (let x = gx; x < gx + 10; x++) p.set(x, y, (x + y) % 9 === 0 ? '#a8c0c8' : x === gx || x === gx + 9 ? '#5a646c' : '#3a4a58', x === gx || x === gx + 9 ? 1 : 0.85); // 옆 유리벽
    for (let y = RY + 5; y < GY; y++) { // 계단: 아래로 갈수록 (화면 위로 갈수록) 어둡다
      const t = (GY - y) / (GY - RY - 5), k = (GY - y) % 4;
      p.hl(x0, y, x1 - x0, mix(k === 0 ? '#b8c4c8' : k === 1 ? '#8a969c' : '#7a868c', '#14181c', Math.min(1, t * 1.15)));
      if (k === 0 && t < 0.7) { p.set(x0 + 3, y, '#d8b830', 1 - t); p.set(x1 - 4, y, '#d8b830', 1 - t); } // 계단 끝 노란 줄
    }
    p.line(x0 + 1, GY - 2, x0 + 4, RY + 10, '#c8d0d4'); p.line(x1 - 2, GY - 2, x1 - 5, RY + 10, '#c8d0d4'); // 손잡이
    p.rect(x0 - 2, GY - 1, x1 - x0 + 4, 1, '#d8c040');
  }
  { // 골목: 벽돌, 붙었다 찢긴 포스터, 홈통
    for (let y = 30; y < GY; y++) for (let x = 450; x < W; x++) { const row = (y >> 2), bx = (x + (row % 2) * 3) % 7; p.set(x, y, bx === 0 || y % 4 === 0 ? '#3a2e2a' : rnd(x >> 2, row, 116) > 0.5 ? '#6a4a3e' : '#5e4236'); }
    p.rect(456, 54, 12, 16, '#e8d8b0'); p.rect(458, 56, 8, 5, '#c84a4a'); p.rect(470, 60, 8, 12, '#a8c8e8', 0.8); p.line(456, 70, 462, 62, '#3a2e2a');
    p.vl(452, 20, GY - 20, '#6a6a70'); p.vl(453, 20, GY - 20, '#4a4a50');
  }
  // ── 보도: 젖은 보도블록 ──
  for (let y = GY; y < CY; y++) for (let x = 0; x < W; x++) {
    const row = (y - GY) >> 2, bx = (x + (row % 2) * 4) & 7, by = (y - GY) & 3, n = rnd((x + (row % 2) * 4) >> 3, row, 117);
    let col = n > 0.66 ? '#6e6466' : n > 0.33 ? '#7a6e6a' : '#655e60';
    if (bx === 0 || by === 0) col = '#3e3a40'; else if (by === 1) col = mix(col, '#ffffff', 0.07);
    p.set(x, y, mix(col, WET, 0.32));
  }
  for (let y = CY - 7; y < CY - 2; y++) for (let x = 0; x < W; x++) p.set(x, y, mix((x % 3 === 0 ? '#8a7020' : '#b8962a'), WET, 0.25)); // 점자블록 한 줄
  for (let y = GY; y < CY - 7; y++) for (let x = 404; x < 428; x++) p.set(x, y, mix(((x >> 1) + (y >> 1)) % 2 ? '#b8962a' : '#8a7020', WET, 0.25)); // 입구 앞 점형 블록
  p.hl(0, GY, W, '#1a1820', 0.6); p.dither(0, GY + 1, W, 2, '#1a1820', 0, 0.3);
  // 웅덩이: 위 간판이 거꾸로 번진다
  const glow = (x: number): string => (x < 80 ? '#d8f0ec' : x < 160 ? '#f0a860' : x < 224 ? '#8a90a8' : x < 304 ? '#7ae8a0' : x < 384 ? '#d0a070' : '#c8e0f0');
  for (const [cx, cy, rx, ry] of [[52, 118, 15, 3], [170, 104, 10, 2], [262, 121, 14, 3], [356, 107, 9, 2], [430, 116, 12, 2]] as const) {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e > 0.7) p.set(x, y, '#3a4060', 0.5); else p.set(x, y, mix('#2a3050', glow(x), 0.25 + 0.4 * (1 - Math.abs(x - cx) / rx))); // 가장자리는 보도가 비치고, 가운데는 간판이 비친다
    }
    p.hl(cx - Math.floor(rx / 2), cy, Math.floor(rx / 2), '#e0e8f8', 0.45); // 하늘 한 줄
  }
  // ── 연석과 차도 ──
  p.rect(0, CY, W, 2, '#b4b2a8'); p.rect(0, CY + 2, W, 2, '#7a7870'); p.hl(0, CY + 4, W, '#121418');
  for (let y = CY + 5; y < H; y++) for (let x = 0; x < W; x++) { const n = rnd(x, y, 118); p.set(x, y, n > 0.92 ? '#34363e' : n < 0.07 ? '#1a1c22' : '#24262e'); }
  for (let x = 6; x < W; x += 44) p.rect(x, H - 9, 22, 2, '#c8c8c0', 0.55); // 차선
  for (const [x, col, w] of [[40, '#d8f0ec', 9], [120, '#f0a860', 8], [154, '#ff7ad8', 3], [236, '#5ae890', 4], [268, '#e8f6f0', 7], [416, '#c8e0f0', 8], [136, '#f0e6d0', 3], [344, '#f0e6d0', 3]] as const) {
    for (let y = CY + 6; y < H; y++) { // 젖은 차도에 세로로 길게 번진 불빛
      const wob = Math.round(Math.sin(y * 1.7 + x) * 1.2), a = 0.55 * (1 - (y - CY - 6) / (H - CY - 6) * 0.6);
      for (let dx = -w; dx <= w; dx++) if (rnd(x + dx, y, 119) > 0.3) p.set(x + dx + wob, y, col, a * (1 - Math.abs(dx) / (w + 1)));
    }
  }
  for (let i = 0; i < 14; i++) { const x = Math.floor(rnd(i, 1, 120) * W), y = CY + 8 + Math.floor(rnd(i, 2, 120) * (H - CY - 12)); p.ell(x, y, 3, 1, '#4a4e5a', 0.6); } // 남은 빗방울 자국
  // ── 앞에 서는 것들 (연석 위: 막힌 줄이라 아무도 밟지 않는다) ──
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void): void => { const L = new Pix(W, H); draw(L); props.push(cut(L, top, 3 * T)); };
  for (const x of [8 * T + 7, 21 * T + 7]) prop((L) => lampPost(L, x, CY + 3, 92));
  prop((L) => { // 연석에 세운 배달 오토바이. 뒤에 빨간 배달통.
    const x = 11 * T + 2, y = CY - 2;
    L.ell(x + 2, y + 2, 4, 4, '#121214'); L.ell(x + 20, y + 2, 4, 4, '#121214'); L.ell(x + 2, y + 2, 2, 2, '#5a5a60'); L.ell(x + 20, y + 2, 2, 2, '#5a5a60');
    L.rect(x + 3, y - 6, 16, 5, '#e8e4dc'); L.hl(x + 3, y - 6, 16, '#ffffff'); L.rect(x + 16, y - 14, 3, 9, '#2a2a30'); L.hl(x + 14, y - 15, 7, '#1a1a20');
    L.rect(x - 1, y - 16, 11, 10, '#c43a28'); L.hl(x - 1, y - 16, 11, '#e85a40'); L.rect(x + 1, y - 13, 7, 3, '#f8f0e0');
  });
  prop((L) => { for (const x of [392, 440]) { L.rect(x, CY - 6, 4, 8, '#8a9096'); L.hl(x, CY - 6, 4, '#c8ccd0'); L.hl(x, CY - 3, 4, '#e8c040'); } }); // 볼라드
  return { base: p, props };
}

// ═══════════════════ 집에서 역까지 (한낮) ═══════════════════
// 단지 정문에서 오른쪽 끝 지하철 입구(28-29칸)까지. 낡은 동네 상가. 해가 머리 위에 있어서 그림자가 발밑에 짧게 붙는다.
/** 플라타너스: 줄기가 길어서 잎이 사람 머리 위에 있다. 얼룩덜룩한 껍질. */
function planeTree(L: Pix, cx: number, by: number, r: number, seed: number): void {
  const th = 58;
  for (let y = by - th; y < by; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    const n = rnd(x >> 1, y >> 2, seed);
    L.set(x, y, x === cx - 2 ? '#d8d0b8' : x === cx + 2 ? '#7a705c' : n > 0.6 ? '#c8c0a4' : n > 0.3 ? '#a8a088' : '#8a8670');
  }
  L.line(cx, by - th + 16, cx - 10, by - th + 4, '#8a8670'); L.line(cx + 1, by - th + 10, cx + 12, by - th, '#8a8670');
  const G = ['#8ab070', '#6a9458', '#4e7646', '#365a36'];
  for (const [dx, dy, k] of [[0, 0, 1], [-r * 0.7, 6, 0.75], [r * 0.7, 5, 0.75], [-r * 0.3, -8, 0.7], [r * 0.4, -7, 0.7]] as const) {
    const ccx = cx + dx, ccy = by - th - 6 + dy, rr = r * k;
    for (let y = Math.floor(ccy - rr); y <= ccy + rr; y++) for (let x = Math.floor(ccx - rr * 1.2); x <= ccx + rr * 1.2; x++) {
      const e = ((x - ccx) / (rr * 1.2)) ** 2 + ((y - ccy) / rr) ** 2;
      if (e > 1 || (e > 0.8 && rnd(x, y, seed + 1) > 0.5)) continue;
      const lit = (y - ccy) / rr - (x - ccx) / (rr * 2.4) + (rnd(x >> 1, y >> 1, seed + 2) - 0.5) * 0.9; // 해는 위에서 온다
      L.set(x, y, G[lit < -0.45 ? 0 : lit < 0.15 ? 1 : lit < 0.6 ? 2 : 3]);
    }
  }
}
function road(_s: PlaceState): Place {
  const m = MAPS.road, top = 80, W = m.grid[0].length * T, H = m.grid.length * T + top;
  const p = new Pix(W, H), GY = top + T, CY = top + 3 * T;
  // 하늘: 한낮. 위는 짙고 아래는 희뿌옇다. 구름 몇 장.
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#5ea4dc', '#d4e8f2', Math.min(1, y / 46)));
  for (const [cx, cy, rx] of [[70, 10, 22], [250, 6, 30], [420, 14, 18]] as const) { p.ell(cx, cy, rx, 4, '#f4f8fa'); p.ell(cx - rx / 3, cy - 2, rx / 2, 3, '#ffffff'); p.hl(cx - rx + 4, cy + 4, rx * 2 - 8, '#c8dceb'); }
  // 단지 (왼쪽): 낮은 담 너머로 복도식 아파트 한 동. 정문 기둥에 아파트 이름.
  {
    p.rect(0, 6, 96, GY - 6, '#cfc6b2'); p.hl(0, 6, 96, '#a8a090');
    for (let fy = 10; fy < 60; fy += 12) { p.hl(0, fy + 8, 96, '#e8e2d2'); p.hl(0, fy + 9, 96, '#8a8474'); for (let x = 4; x < 92; x += 14) p.rect(x, fy + 1, 9, 6, rnd(x, fy, 131) > 0.7 ? '#7a8a96' : '#3e4a56'); }
    bigText(p, 70, 12, '107', '#8a8474', 2);
    for (let y = 60; y < GY; y++) for (let x = 0; x < 96; x++) { const row = y >> 2, bx = (x + (row % 2) * 4) & 7; p.set(x, y, bx === 0 || y % 4 === 0 ? '#7a5a48' : rnd(x >> 3, row, 132) > 0.5 ? '#a8705a' : '#9a6450'); } // 붉은 벽돌 담
    for (let x = 0; x < 96; x += 6) { p.vl(x, 48, 12, '#2e5a3e'); p.vl(x + 1, 48, 12, '#4a7a5a'); } p.hl(0, 48, 96, '#2e5a3e'); p.hl(0, 54, 96, '#2e5a3e'); // 담 위 초록 철책
    p.rect(8, 42, 18, GY - 42, '#d8d0bc'); p.hl(8, 42, 18, '#f0e8d4'); p.vl(25, 42, GY - 42, '#a8a08c'); // 정문 기둥
    p.rect(10, 50, 14, 22, '#f4f0e4'); for (let i = 0; i < 3; i++) glyphs(p, 14, 52 + i * 7, 1, '#3a5a8a', 133 + i); // 세로 이름판
    p.rect(26, 70, 18, GY - 70, '#3a3c40'); p.rect(27, 72, 16, GY - 74, '#8a8c90'); for (let x = 28; x < 43; x += 3) p.vl(x, 72, GY - 74, '#5a5c60'); // 열린 차량 차단기 자리
  }
  // 상가 건물들: [x0, x1, 지붕, 벽색]
  const BLD: [number, number, number, string][] = [[96, 160, 22, '#d8cdb8'], [160, 240, 14, '#c4c8c0'], [240, 304, 26, '#e0d0c8'], [304, 368, 18, '#bcb4a6'], [368, 432, 14, '#d4ccbe'], [432, 496, 24, '#a8aeb4'], [496, 512, 30, '#c8bca8']];
  for (const [x0, x1, ry, col] of BLD) {
    const D = mix(col, '#000000', 0.1), L = mix(col, '#ffffff', 0.18);
    for (let y = ry; y < GY; y++) for (let x = x0; x < x1; x++) { const n = rnd(x, y, 134); p.set(x, y, n > 0.95 ? D : n < 0.05 ? L : col); }
    p.rect(x0, ry - 2, x1 - x0, 2, mix(col, '#000000', 0.25)); p.hl(x0, ry, x1 - x0, L);
    p.vl(x1 - 1, ry, GY - ry, mix(col, '#000000', 0.22));
    for (let x = x0; x < x1; x++) if (rnd(x, 0, 135) > 0.85) p.vl(x, ry + 2, 3 + Math.floor(rnd(x, 1, 135) * 14), D, 0.5);
  }
  const win2 = (x: number, w: number, glass: string): void => { p.rect(x - 1, 26, w + 2, 15, '#5a5650'); p.rect(x, 27, w, 13, glass); p.line(x + 1, 38, x + w - 3, 28, mix(glass, '#ffffff', 0.5)); p.vl(x + Math.floor(w / 2), 27, 13, '#5a5650'); p.hl(x - 2, 41, w + 4, '#f0ece0'); };
  const SB = 46, GL = 58, ST = GY - 4;
  const front = (x0: number, w: number, glass: string): void => {
    p.rect(x0, SB - 1, w, GY - SB + 1, '#4a4650');
    for (let y = GL; y < ST; y++) for (let x = x0 + 3; x < x0 + w - 3; x++) p.set(x, y, (x - y) % 23 < 3 ? mix(glass, '#ffffff', 0.45) : glass); // 해가 비친 유리
    p.vl(x0 + 2, GL, ST - GL, '#8a8890'); p.vl(x0 + w - 3, GL, ST - GL, '#8a8890'); p.hl(x0 + 2, GL - 1, w - 4, '#8a8890');
    p.rect(x0, ST, w, 4, '#b8b6ac'); p.hl(x0, ST, w, '#d8d6cc'); p.hl(x0, GY - 1, w, '#6a6862');
  };
  const sign = (x0: number, w: number, bg: string, fg: string, n: number, seed: number): void => {
    p.rect(x0 + 1, SB, w - 2, 10, bg); p.hl(x0 + 1, SB, w - 2, mix(bg, '#ffffff', 0.3)); p.hl(x0 + 1, SB + 9, w - 2, mix(bg, '#000000', 0.3));
    glyphs(p, x0 + Math.floor((w - n * 7) / 2) + 1, SB + 3, n, fg, seed);
  };
  { // 세탁소: 비닐 씌운 옷들이 걸려 있다
    win2(104, 22, '#7a9ab4'); win2(132, 22, '#7a9ab4');
    front(96, 64, '#5a6a78');
    for (let x = 102; x < 150; x += 5) { p.vl(x + 2, GL + 2, 3, '#c8ccd0'); p.rect(x, GL + 5, 5, 18, ['#3a4a6a', '#e8e4dc', '#6a3a3a', '#2a2a2e'][Math.floor(rnd(x, 1, 136) * 4)]); p.rect(x, GL + 5, 5, 18, '#e8f0f8', 0.35); }
    p.hl(100, GL + 2, 52, '#9a9ca0');
    sign(96, 64, '#f4f6f8', '#2a5ab8', 3, 137);
  }
  { // 동네 슈퍼: 빨간 줄무늬 차양, 문 앞에 과일 상자와 음료 상자
    win2(170, 26, '#8aaac4'); win2(204, 26, '#8aaac4');
    front(160, 80, '#3a4048');
    for (const y of [64, 74]) { p.hl(166, y, 40, '#7a7e86'); for (let x = 166; x < 206; x += 2) if (rnd(x, y, 138) > 0.3) p.rect(x, y - 4, 1, 4, ['#e85a4a', '#f0d040', '#5aa0e0', '#f4f4ec'][Math.floor(rnd(x, y, 139) * 4)]); }
    p.rect(212, GL + 1, 22, ST - GL - 1, '#6a7a88'); p.vl(223, GL + 1, ST - GL - 1, '#8a8890');
    sign(160, 80, '#f0c838', '#c43a28', 4, 140);
    for (let x = 158; x < 242; x++) for (let y = SB + 10; y < SB + 16; y++) p.set(x, y, Math.floor((x - 158) / 6) % 2 ? '#d84a3a' : '#f4ece0');
    for (let x = 158; x < 242; x += 6) p.set(x + 3, SB + 16, '#d84a3a');
  }
  { // 미용실: 줄무늬 기둥, 분홍 간판
    win2(250, 20, '#9ab4c8'); win2(276, 20, '#9ab4c8');
    front(240, 64, '#6a7680');
    p.rect(256, 70, 10, 14, '#2a2a30'); p.rect(255, 66, 12, 5, '#3a3a40'); p.rect(272, 64, 18, 14, '#d8e4ec', 0.6); // 의자와 거울
    sign(240, 64, '#f4c8d8', '#a83a6a', 3, 141);
    p.rect(296, 56, 6, 26, '#f4f4f4'); for (let y = 56; y < 82; y++) p.set(297 + ((y >> 1) % 4), y, (y >> 2) % 2 ? '#d83a3a' : '#3a5ad8'); p.rect(295, 54, 8, 2, '#c8ccd0'); p.rect(295, 82, 8, 2, '#c8ccd0'); // 이발소 기둥
  }
  { // 빈 점포: 유리에 신문지, 붉은 '임대'
    win2(312, 20, '#2a3038'); win2(338, 20, '#2a3038');
    front(304, 64, '#d8d0b8');
    for (let i = 0; i < 9; i++) { const x = 310 + (i % 3) * 17, y = GL + 2 + Math.floor(i / 3) * 11; p.rect(x, y, 15, 10, '#e4dcc4'); for (let k = 1; k < 9; k += 2) p.hl(x + 1, y + k, 13, '#b8b09a'); }
    p.rect(320, 64, 24, 14, '#f8f4ec'); glyphs(p, 323, 68, 2, '#d83a3a', 142, 1);
    sign(304, 64, '#8a8c90', '#c8c8c8', 4, 143);
  }
  { // 분식집 위에 상가 교회: 지붕 위 붉은 십자가
    win2(376, 22, '#c8d4dc'); win2(404, 22, '#c8d4dc');
    p.rect(372, 17, 56, 7, '#f4f4f0'); glyphs(p, 378, 18, 7, '#3a3a8a', 144);
    p.rect(398, 1, 3, 12, '#d83a3a'); p.rect(394, 4, 11, 3, '#d83a3a'); p.vl(398, 1, 12, '#f06a5a'); p.rect(397, 13, 5, 1, '#5a5a5a'); // 옥상 위 붉은 십자가
    front(368, 64, '#c88a50');
    p.rect(378, 66, 22, 10, '#a8a8ac'); p.ell(384, 70, 5, 3, '#e86a3a'); p.ell(394, 70, 4, 3, '#f0d0a0'); // 떡볶이 판과 튀김
    for (let i = 0; i < 4; i++) p.vl(380 + i * 6, 58 + (i % 2), 5, '#ffffff', 0.5); // 김
    sign(368, 64, '#2a8a5a', '#f4f4ec', 3, 145);
  }
  { // 지하철 입구: 지붕 없이 땅으로 내려가는 계단. 초록 난간과 기둥 표지판.
    const x0 = 448, x1 = 480;
    win2(440, 20, '#7a8a9a'); win2(470, 20, '#7a8a9a');
    p.rect(436, 50, 56, GY - 50, '#b8b4ac'); p.hl(436, 50, 56, '#d8d4cc');
    for (let y = 54; y < GY; y++) { // 계단: 위(멀리)로 갈수록 그늘
      const t = (GY - y) / (GY - 54), k = (GY - y) % 4;
      p.hl(x0, y, x1 - x0, mix(k === 0 ? '#e8e6de' : k === 1 ? '#b0aea6' : '#c4c2ba', '#3a3c40', Math.min(1, t * 1.2)));
      if (k === 0 && t < 0.8) { p.set(x0 + 2, y, '#e0c030'); p.set(x1 - 3, y, '#e0c030'); }
    }
    for (const gx of [x0 - 4, x1 + 1]) { p.rect(gx, 52, 3, GY - 52, '#2e6a4a'); p.vl(gx, 52, GY - 52, '#4a9a6a'); for (let y = 56; y < GY; y += 6) p.hl(gx - 1, y, 5, '#2e6a4a'); } // 초록 난간
    p.rect(x0 - 2, GY - 1, x1 - x0 + 4, 1, '#e0c030');
    p.rect(486, 20, 4, GY - 20, '#6a6e74'); p.vl(486, 20, GY - 20, '#9a9ea4'); // 기둥 표지판
    p.rect(480, 14, 16, 16, '#1e2a48'); p.ell(487, 21, 5, 5, '#3ab060'); text(p, 486, 19, '2', '#ffffff'); p.hl(481, 28, 14, '#c8d0e0');
  }
  // 처마 그늘: 해가 머리 위라 건물 발치에만 짧게 진다
  // ── 보도: 마른 보도블록. 붉은 줄과 회색 줄. ──
  for (let y = GY; y < CY; y++) for (let x = 0; x < W; x++) {
    const row = (y - GY) >> 2, bx = (x + (row % 2) * 4) & 7, by = (y - GY) & 3, band = Math.floor(x / 64) % 2, n = rnd((x + (row % 2) * 4) >> 3, row, 146);
    let col = band ? (n > 0.5 ? '#b49488' : '#a8887c') : (n > 0.5 ? '#bcb8b0' : '#aeaaa2');
    if (bx === 0 || by === 0) col = mix(col, '#000000', 0.25); else if (by === 1) col = mix(col, '#ffffff', 0.12);
    p.set(x, y, col);
  }
  for (let y = CY - 7; y < CY - 2; y++) for (let x = 0; x < W; x++) p.set(x, y, x % 3 === 0 ? '#b8961e' : '#e0bc34'); // 점자블록
  for (let y = GY; y < CY - 7; y++) for (let x = 452; x < 476; x++) p.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? '#e0bc34' : '#b8961e');
  p.dither(0, GY, 448, 3, '#3a3430', 0, 0.35); p.hl(0, GY, W, '#3a3430', 0.5);
  p.ell(200, 112, 7, 3, '#5a5c60'); p.ell(200, 112, 5, 2, '#787a7e'); for (let x = 196; x < 205; x += 2) p.set(x, 112, '#4a4c50'); // 맨홀
  // ── 연석과 차도 ──
  p.rect(0, CY, W, 2, '#dcdad0'); p.rect(0, CY + 2, W, 2, '#9a988e'); p.hl(0, CY + 4, W, '#4a4c50');
  for (let y = CY + 5; y < H; y++) for (let x = 0; x < W; x++) { const n = rnd(x, y, 147), mm = rnd(x >> 3, y >> 3, 148); p.set(x, y, n > 0.93 ? '#8a8c8e' : n < 0.06 ? '#5a5c60' : mm > 0.82 ? '#6e7074' : '#76787c'); }
  for (let x = 208; x < 272; x += 9) p.rect(x, CY + 6, 5, H - CY - 8, '#eceae4', 0.92); // 횡단보도
  p.hl(0, H - 4, W, '#e8c040'); p.hl(0, H - 2, W, '#e8c040'); // 가운데 노란 겹선
  for (let i = 0; i < 10; i++) crack(p, Math.floor(rnd(i, 1, 149) * W), CY + 8 + Math.floor(rnd(i, 2, 149) * 18), 10, '#5a5c60', i + 150);
  // ── 앞에 서는 것들: 가로수와 전봇대 (연석 위). 해가 머리 위라 그림자가 나무 바로 밑에 고인다. ──
  const props: Prop[] = [];
  const prop = (draw: (L: Pix) => void, fade = false): void => { const L = new Pix(W, H); draw(L); const q = cut(L, top, 3 * T); q.fade = fade; props.push(q); };
  for (const [cx, r, sd] of [[72, 18, 151], [184, 20, 152], [348, 19, 153]] as const) {
    for (let y = CY - 16; y < CY + 6; y++) for (let x = cx - 30; x < cx + 30; x++) { // 나뭇잎 그림자: 얼룩덜룩하게
      const e = ((x - cx) / 28) ** 2 + ((y - CY + 6) / 10) ** 2;
      if (e > 1) continue;
      const fleck = rnd(Math.floor(x / 3), Math.floor(y / 2), sd) > 0.8; // 잎 사이로 새는 해
      if (!fleck) p.set(x, y, '#3a3448', e > 0.75 ? 0.16 : 0.3);
    }
    p.rect(cx - 7, CY - 1, 15, 4, '#4a4a4e'); for (let x = cx - 6; x < cx + 7; x += 2) p.vl(x, CY - 1, 4, '#2a2a2e'); // 나무 밑 쇠 덮개
    prop((L) => planeTree(L, cx, CY + 2, r, sd), true);
  }
  prop((L) => { // 전봇대: 전선이 엉켜 있다. 변압기 하나.
    const x = 286, by = CY + 2;
    L.rect(x - 2, 4, 5, by - 4, '#a8a49a'); L.vl(x - 2, 4, by - 4, '#c8c4ba'); L.vl(x + 2, 4, by - 4, '#7a766e');
    L.rect(x - 12, 12, 25, 2, '#5a5a5e'); L.rect(x + 4, 18, 9, 12, '#7a7e84'); L.hl(x + 4, 18, 9, '#9a9ea4');
    for (let y = by - 40; y < by - 10; y += 5) L.rect(x - 2, y, 5, 3, ['#f0e8c8', '#e8c8c8', '#c8e0f0'][Math.floor(rnd(y, 1, 154) * 3)], 0.85); // 붙은 전단지
    for (const [dy, sag] of [[13, 6], [16, 9], [20, 5]] as const) { for (let xx = 0; xx < x; xx++) L.set(xx, Math.round(dy + Math.sin(xx / x * Math.PI) * sag), '#2a2a2e', 0.8); for (let xx = x; xx < W; xx++) L.set(xx, Math.round(dy + Math.sin((xx - x) / (W - x) * Math.PI) * sag), '#2a2a2e', 0.8); }
  });
  return { base: p, props };
}

const PAINT: Record<string, (s: PlaceState) => Place> = { corridor, living, stairs, complex, playground, recycle, party, street, road, subway, funeral, er, concourse, platform, store, restroom, grandma, campus, dorm, cafeteria };
// 맵 위를 움직이는 그림 (승강장의 열차, 응급실 커튼 밑의 발)
ART.train = trainPix(); ART.trainOpen = trainDoorOpen();
ART.feet = { sneakers: feetPix('sneakers'), shoes: feetPix('shoes'), slippers: feetPix('slippers') };
const cache = new Map<string, Place>();
export function paintPlace(id: string, s: PlaceState): Place | null {
  const f = PAINT[id];
  if (!f) return null;
  const key = `${id}/${s.day ? 1 : 0}/${s.mood}/${s.door || ''}`; // 분위기마다 따로 그린다 (복도는 2장 끝에만 깨진 병이 있다)
  let v = cache.get(key);
  if (!v) { v = f(s); cache.set(key, v); }
  return v;
}
