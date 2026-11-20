// 윤재의 방. 통째로 한 장으로 그린다. 좌표는 그림 기준이고, 맵의 (0,0) 은 그림의 (0,16) 이다 (벽이 위로 한 칸 더 솟아 있다).
// 형광등 아래의 색으로 칠한다. 어둠과 빛은 world.ts 가 그 위에 덮는다.
import { Pix, mix, rnd, sprite } from './pix.ts';
import { catHeadAlone } from './chars.ts';

export type RoomState = {
  monitor: boolean; headGone: boolean; headDone: boolean; open: boolean; slit: string; day: boolean; lie: boolean;
  mark?: '' | 'torn' | 'sewn'; // 삼색이 머리의 귀
  box?: '' | 'shut' | 'open';  // 문 앞의 실밥 상자
  tidy?: boolean;              // 위기의 밤에 쓰레기를 치웠다
  ajar?: boolean;              // 3장: 잠금쇠가 뜯긴 문. 닫아도 한 뼘 도로 열린다
  headAt?: '' | 'bed' | 'floor'; // 머리가 받침대가 아닌 데 있다: 침대 밑에 걸렸다 / 바닥에 던져졌다
  pile?: '' | 'torn' | 'folded'; // 삼색이의 몸: 바닥에 찢긴 채 / 책상 위에 개어 둔 채
  closet?: '' | 'left' | 'mirror'; // 옷장 문이 열려 있다: 왼쪽(상자 넣는 쪽) / 오른쪽(안쪽에 거울)
};
/** 그림을 시계 방향으로 90도 돌린다 (점이 뭉개지지 않는다) */
function rot90(src: Pix): Pix {
  const q = new Pix(src.h, src.w);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4, j = (x * q.w + (src.h - 1 - y)) * 4;
    q.d[j] = src.d[i]; q.d[j + 1] = src.d[i + 1]; q.d[j + 2] = src.d[i + 2]; q.d[j + 3] = src.d[i + 3];
  }
  return q;
}
// 삼색이 몸의 털빛: 흰 바탕, 주황과 검정 얼룩
const SW = ['#f4efe6', '#ddd5c8', '#b9ae9f'], SO = ['#f08a32', '#c96a22'], SK = ['#46353f', '#2e2229'];
function furAt(x: number, y: number, sh: number): string {
  const n = Math.sin(x * 0.7 + y * 0.45) + Math.cos(x * 0.33 - y * 0.9);
  if (n > 1.05) return SO[sh > 0.5 ? 1 : 0];
  if (n < -1.15) return SK[sh > 0.5 ? 1 : 0];
  return SW[sh > 0.75 ? 2 : sh > 0.4 ? 1 : 0];
}
/** 3장의 밤 뒤: 바닥에 버려진 몸. 등이 갈라져 폼이 보이고, 왼팔이 실 몇 가닥에 매달렸고, 꼬리는 따로 떨어졌다. */
function tornPile(p: Pix, X: number, Y: number): void {
  p.ell(X + 12, Y + 12, 15, 3.4, INK, 0.38); // 그늘
  for (let y = Y; y < Y + 13; y++) for (let x = X; x < X + 25; x++) { // 몸통: 납작하게 꺼진 털가죽
    const dx = (x - (X + 12)) / 12.5, dy = (y - (Y + 6.5)) / 6.2;
    if (dx * dx + dy * dy > 1 - (x > X + 20 ? 0.25 : 0)) continue;
    p.set(x, y, furAt(x, y, Math.max(0, dy)));
  }
  for (let x = X + 4; x < X + 20; x++) { const y = Y + 5 + Math.round(Math.sin(x * 0.8) * 0.8); p.set(x, y, '#efe8d8'); p.set(x, y + 1, '#d9cfb8'); if (x % 3 === 0) p.set(x, y - 1, INK, 0.6); } // 등 솔기가 갈라졌다: 폼이 하얗게
  p.dots(`${X + 6},${Y + 4} ${X + 10},${Y + 7} ${X + 15},${Y + 4} ${X + 18},${Y + 7}`, '#9a3a2e'); // 끊긴 실밥
  for (let i = 0; i < 9; i++) { const x = X - 7 + i, y = Y + 9 + Math.round(i * 0.35); p.set(x, y, furAt(x, y, 0.2)); p.set(x, y + 1, furAt(x, y + 1, 0.6)); p.set(x, y + 2, SW[2]); } // 왼팔: 몸에서 떨어져 나갔다
  p.line(X - 1, Y + 10, X + 2, Y + 9, '#e8e0cc'); p.set(X, Y + 11, '#9a3a2e'); // 팔을 붙들고 있는 실 두 가닥
  for (let i = 0; i < 11; i++) { const x = X + 28 + i, y = Y + 13 - Math.round(Math.sin(i * 0.4) * 2); p.set(x, y, i > 7 ? SO[0] : furAt(x, y, 0.1)); p.set(x, y + 1, i > 7 ? SO[1] : SW[1]); } // 따로 떨어진 꼬리
  p.hl(X + 28, Y + 16, 11, INK, 0.3);
}
/** 4장: 이불 개듯이 갠 몸. 책상 왼쪽 모서리에 네모나게 얹었다. 꼬리를 맨 위에 둥글게. */
function foldedPile(p: Pix, X: number, Y: number): void {
  p.hl(X, Y + 8, 12, INK, 0.4);
  for (let k = 0; k < 3; k++) { const y = Y + 6 - k * 2; for (let x = X + k * 0.5; x < X + 12 - k * 0.5; x++) { p.set(Math.round(x), y, furAt(x, y + k * 3, 0)); p.set(Math.round(x), y + 1, furAt(x, y + k * 3, 0.8)); } }
  p.hl(X + 1, Y + 2, 10, SW[0]); p.dots(`${X + 3},${Y + 1} ${X + 4},${Y + 1} ${X + 5},${Y + 1} ${X + 6},${Y + 1}`, SO[0]); p.dots(`${X + 7},${Y + 1} ${X + 8},${Y + 2}`, SO[1]); // 둥글게 얹은 꼬리
  p.vl(X, Y + 3, 5, SW[2]); p.vl(X + 11, Y + 3, 5, SW[2]);
}
export const ROOM_OY = 16;

const WALL = '#8b8e86', WALL_L = '#95988f', WALL_D = '#787b74', WALL_DD = '#62655f';
const BASE = '#4b4037', BASE_L = '#5e5146';
const FL = '#8a7b60', FL_L = '#97886b', FL_D = '#79694f', FL_DD = '#65573f';
const SLAB = '#25262e', SLAB_L = '#383a45';
const INK = '#1d1820';

function floor(p: Pix, x0: number, y0: number, x1: number, y1: number): void {
  // 노란 장판. 나무 무늬가 인쇄돼 있다. 줄은 8px 마다, 이음매는 엇갈린다.
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const row = Math.floor((y - y0) / 8), in8 = (y - y0) % 8;
    let col = FL;
    const seam = (x + row * 23) % 46 === 0;
    if (in8 === 0) col = FL_D;
    else if (seam) col = FL_D;
    else if (in8 === 1) col = FL_L;
    const n = rnd(x >> 1, y, 3);
    if (in8 > 1 && n < 0.07) col = FL_L;
    if (in8 > 1 && n > 0.95) col = FL_D;
    p.set(x, y, col);
  }
  // 침대에서 문까지, 사 년 동안 같은 길만 다닌 자국
  for (let x = 50; x < 158; x++) for (let y = 68; y < 82; y++) {
    const e = Math.abs(y - 75) / 7;
    if (rnd(x, y, 9) > 0.72 + e * 0.28) p.set(x, y, FL_DD, 0.22);
  }
}

function wall(p: Pix): void {
  p.rect(16, 0, 144, 32, WALL);
  for (let x = 16; x < 160; x++) {
    if (x % 6 === 1) p.vl(x, 1, 28, WALL_L, 0.6);          // 벽지의 세로줄
    if (x % 6 === 4) p.vl(x, 1, 28, WALL_D, 0.25);
  }
  p.hl(16, 0, 144, WALL_DD); p.hl(16, 1, 144, WALL_D);    // 천장 그늘
  // 걸레받이
  p.rect(16, 28, 144, 4, BASE); p.hl(16, 28, 144, BASE_L); p.hl(16, 31, 144, '#2e2620');
  // 곰팡이: 창가 모서리에서 번진다
  for (let y = 2; y < 26; y++) for (let x = 46; x < 64; x++) {
    const d = Math.hypot(x - 47, (y - 2) * 0.8);
    if (d < 13 && rnd(x, y, 5) > d / 13) p.set(x, y, d < 5 ? WALL_DD : WALL_D, 0.75);
  }
  // 누런 물자국
  for (let y = 2; y < 18; y++) if (rnd(121, y, 2) > 0.2) { p.set(121 + (y > 9 ? 1 : 0), y, '#8c8468', 0.7); if (y < 8) p.set(120, y, '#8c8468', 0.4); }
  // 포스터를 뗀 자리. 그 자리만 벽지가 덜 바랬다. 테이프 자국 네 개.
  p.rect(132, 6, 0, 0, WALL);
}

function windowAndCurtain(p: Pix, s: RoomState): void {
  // 알루미늄 창틀
  p.rect(18, 4, 28, 23, '#55585f'); p.rect(19, 5, 26, 21, '#3b3e46'); p.hl(18, 4, 28, '#6d7078');
  // 유리: 낮이면 밝고 밤이면 어둡다. 커튼이 거의 다 가린다.
  p.rect(20, 6, 24, 19, s.day ? mix(s.slit, '#ffffff', 0.25) : '#141a2a');
  // 암막 커튼. 사 년 동안 걷은 적이 없다. 주름마다 색이 다르다.
  const C0 = '#3a3948', C1 = '#474658', C2 = '#2c2b38', C3 = '#55546a';
  for (let x = 17; x <= 46; x++) {
    const k = (x - 17) % 5;
    const col = k === 0 ? C2 : k === 1 ? C0 : k === 2 ? C1 : k === 3 ? C3 : C0;
    const drop = 28 + ((x * 7) % 3 === 0 ? 1 : 0);
    for (let y = 3; y <= drop; y++) p.set(x, y, y > drop - 2 ? C2 : col);
  }
  // 커튼 틈. 바깥의 색이 한 줄 들어온다.
  if (!s.open) { p.vl(31, 5, 22, s.slit); p.vl(32, 6, 20, mix(s.slit, C0, 0.55)); p.set(31, 27, mix(s.slit, C0, 0.5)); }
  // 커튼 봉
  p.hl(16, 2, 32, '#22222a'); p.hl(16, 3, 32, '#4a4a55', 0.6); p.set(16, 2, '#6a6a76'); p.set(47, 2, '#6a6a76');
  for (let x = 18; x < 46; x += 4) p.set(x, 3, '#14141a');
}

function desk(p: Pix, s: RoomState): void {
  const TOP = '#a38769', TOP_L = '#b59b7d', TOP_D = '#8c7257', FRONT = '#775c44', FRONT_D = '#5c4634', DARK = '#3a2c22';
  // 벽에 붙인 것들: 달력(사 년 전 8월에 멈췄다), 도안 스케치
  p.rect(53, 6, 9, 12, '#d9d6cc'); p.rect(53, 6, 9, 3, '#b0554c'); p.hl(53, 18, 9, '#9a978e');
  for (let y = 10; y < 17; y += 2) for (let x = 54; x < 61; x += 2) p.set(x, y, '#8d8a84');
  p.set(57, 5, '#c8c4b8');
  p.rect(92, 5, 9, 11, '#e2ded2'); p.hl(92, 16, 9, '#a9a59a');             // 삼색이 도안: 정면
  p.dots('94,8 95,7 96,8 97,7 98,8', '#e9822f'); p.dots('98,9 99,9 99,8', '#3b2e38'); p.dots('95,10 98,10', '#3a7a3a'); p.dots('96,12 97,12', '#e2718d');
  p.set(96, 4, '#d8c070'); // 마스킹 테이프
  p.rect(103, 8, 7, 8, '#dedacd'); p.dots('104,10 105,11 106,10 107,12 105,13', '#8d8a84'); p.set(106, 7, '#d8c070');
  p.rect(84, 9, 6, 6, '#e8d98a'); p.dots('85,11 86,11 87,11 85,13 86,13', '#9a8c50');             // 포스트잇
  // 책상 윗면
  p.rect(64, 27, 48, 14, TOP); p.hl(64, 27, 48, TOP_D); p.hl(64, 28, 48, TOP_L); p.hl(64, 40, 48, TOP_L);
  for (let x = 66; x < 111; x += 3) if (rnd(x, 1, 8) > 0.5) p.hl(x, 31 + Math.floor(rnd(x, 2, 8) * 8), 2 + Math.floor(rnd(x, 3, 8) * 3), TOP_D, 0.45);
  // 앞판과 다리 사이 어둠, 의자 등받이
  p.rect(64, 41, 48, 6, FRONT); p.hl(64, 41, 48, FRONT_D); p.rect(64, 41, 3, 7, FRONT_D); p.rect(109, 41, 3, 7, FRONT_D);
  p.rect(68, 43, 40, 5, DARK); p.hl(64, 47, 48, '#2a211a');
  p.rect(79, 36, 16, 11, '#2e2f38'); p.rect(80, 37, 14, 9, '#3b3c48'); p.hl(80, 37, 14, '#4c4d5b');
  for (let y = 39; y < 45; y += 2) p.hl(81, y, 12, '#33343f');                // 메시 등받이
  p.set(79, 36, FRONT, 0); p.rect(85, 46, 4, 2, '#22232a');
  // 모니터 (오른쪽 칸)
  p.rect(101, 29, 4, 3, '#1c1c22'); p.rect(98, 31, 10, 2, '#26262e'); p.hl(98, 31, 10, '#383844');
  p.rect(95, 12, 16, 18, '#1b1b21'); p.hl(95, 12, 16, '#34343e'); p.vl(95, 12, 18, '#2a2a33');
  if (s.monitor) {
    p.rect(96, 13, 14, 15, '#1c2740'); p.rect(96, 13, 4, 15, '#141c30');     // 서버 목록 / 대화창
    p.dots('97,15 97,18 97,21', '#e9822f'); p.set(97, 24, '#6f8fd8'); p.set(98, 15, '#d04040');
    for (let y = 15; y < 26; y += 2) { const w = 3 + Math.floor(rnd(1, y, 4) * 6); p.hl(101, y, w, y % 4 === 3 ? '#9fb4e6' : '#6f84b8'); }
    p.hl(101, 26, 8, '#2b3a5e'); p.hl(96, 13, 14, '#2a3a5c');
  } else {
    p.rect(96, 13, 14, 15, '#0c0d13'); p.line(98, 15, 104, 21, '#1a1c26'); p.line(100, 15, 105, 20, '#15171f');
  }
  p.set(109, 28, s.monitor ? '#7fd49a' : '#5a2a2a');
  // 키보드, 마우스
  p.rect(94, 34, 13, 5, '#2b2c34'); p.hl(94, 34, 13, '#41424d');
  for (let y = 35; y < 38; y++) for (let x = 95; x < 106; x += 2) p.set(x + (y & 1), y, '#585a68');
  p.rect(108, 35, 3, 4, '#33343d'); p.set(109, 35, '#55566a');
  // 통장, 컵라면, 실패, 글루건, 가위, 털 조각
  p.rect(66, 35, 6, 4, '#4f8a6a'); p.hl(66, 35, 6, '#6fae8b'); p.vl(68, 35, 4, '#d8c070');
  if (!s.tidy) { p.rect(74, 31, 5, 2, '#e6e1d6'); p.rect(74, 33, 5, 4, '#d8d2c6'); p.hl(74, 34, 5, '#c0443a'); p.hl(74, 37, 5, '#a8a298'); p.line(76, 28, 79, 31, '#b89a6a'); }
  p.rect(86, 31, 3, 4, '#e9822f'); p.hl(86, 30, 3, '#d8d2c6'); p.hl(86, 35, 3, '#d8d2c6'); p.hl(86, 32, 3, '#c95f22');
  p.rect(89, 37, 5, 2, '#d9b53a'); p.set(94, 37, '#8d8a84'); p.rect(90, 39, 2, 1, '#2a2a30');
  p.dots('82,30 83,31 84,30', '#8d8f96'); p.dots('81,32 85,32', '#c0443a');
  p.dots('70,31 71,32 73,30', '#f08a32'); p.dots('69,33 72,33', '#46353f'); p.dots('68,31 71,30', '#fffaf0');
  // 머리 받침대와 삼색이의 머리. 이 방에서 색이 있는 건 이것뿐이다.
  p.rect(74, 24, 4, 4, '#b8b4a8'); p.hl(72, 28, 8, '#9a968a'); p.hl(73, 27, 6, '#cfcbc0');
  if (!s.headGone && !s.headAt) {
    const head = catHeadAlone(!s.headDone, false, s.mark || ''); // 눈을 붙이기 전에는 눈 자리에 망사만 대 놓았다
    p.blit(head, 76 - Math.floor(head.w / 2), 28 - head.h);
    if (!s.headDone) { p.dots('67,12 86,11 75,9', '#d04040'); p.dots('67,11 86,10 75,8', '#e8e8e8'); } // 시침핀
  } else {
    p.rect(73, 14, 6, 10, '#d9d6cc'); p.rect(72, 16, 8, 6, '#d9d6cc'); p.vl(72, 17, 4, '#b8b4a8'); p.hl(73, 14, 6, '#ecebe4'); // 빈 스티로폼 머리
  }
  if (s.pile === 'folded') foldedPile(p, 64, 29); // 책상 왼쪽 모서리에 개어 둔 삼색이
}

function trash(p: Pix, s: RoomState): void {
  p.rect(115, 36, 10, 11, '#3e5a56'); p.vl(115, 36, 11, '#2f4643'); p.vl(124, 36, 11, '#2f4643'); p.hl(115, 46, 10, '#22302e');
  if (s.tidy) { // 새 봉지를 씌웠다. 안이 비었다.
    p.rect(114, 34, 12, 3, '#e8eae6'); p.hl(114, 34, 12, '#f8f8f6'); p.rect(116, 35, 8, 1, '#22302e'); p.set(114, 36, '#c8cac6'); p.set(125, 36, '#c8cac6');
    p.dots('114,37 125,37 114,38', '#e8eae6');
    return;
  }
  // 쓰레기통은 넘친 지 오래다
  p.rect(114, 34, 12, 3, '#d8d6d0'); p.hl(114, 34, 12, '#f0eeea'); p.set(114, 36, '#a8a6a0'); p.set(125, 36, '#a8a6a0');
  // 컵라면 용기 탑
  for (let i = 0; i < 4; i++) { const y = 29 - i * 3; p.rect(116 + (i & 1), y, 7, 3, '#e6e1d6'); p.hl(116 + (i & 1), y + 1, 7, '#c0443a'); p.set(116 + (i & 1), y + 2, '#b9b4a8'); }
  p.rect(116, 31, 8, 3, '#e6e1d6'); p.hl(116, 32, 8, '#c0443a');
  p.line(119, 15, 122, 18, '#b89a6a');
  // 페트병 둘, 비닐봉지
  p.rect(126, 38, 2, 8, '#8fb0c0'); p.set(126, 37, '#3a6ea8'); p.vl(126, 40, 4, '#b8d4e0');
  p.rect(112, 40, 3, 7, '#9fbac6'); p.set(113, 39, '#3a6ea8'); p.vl(112, 42, 3, '#c6dde6');
  p.rect(121, 41, 5, 5, '#e8e6e0'); p.dots('121,41 125,41', '#3e5a56'); p.dots('123,40 122,39 124,39', '#f6f4f0'); p.dots('122,44 124,43', '#c8c6c0');
}

function closet(p: Pix, s: RoomState): void {
  const W0 = '#766150', W1 = '#8a7462', W2 = '#5f4d3f', W3 = '#43362c';
  p.rect(128, 1, 32, 46, W0);
  p.rect(128, 1, 32, 3, W1); p.hl(128, 1, 32, '#a18a76'); p.hl(128, 4, 32, W2);         // 윗면
  p.vl(128, 5, 42, W2); p.vl(159, 5, 42, W3); p.vl(143, 5, 41, W3); p.vl(144, 5, 41, W1, 0.5);
  for (const x0 of [130, 146]) {                                                      // 문짝 안쪽 테
    p.hl(x0, 8, 12, W2); p.hl(x0, 42, 12, W1, 0.6); p.vl(x0, 8, 35, W2); p.vl(x0 + 11, 8, 35, W1, 0.6);
    for (let y = 10; y < 41; y += 3) if (rnd(x0, y, 6) > 0.4) p.hl(x0 + 2, y, 3 + Math.floor(rnd(x0, y, 7) * 6), W2, 0.35); // 나뭇결
  }
  p.rect(140, 22, 2, 6, '#b8b6b0'); p.vl(141, 22, 6, '#7d7b76'); p.rect(146, 22, 2, 6, '#b8b6b0'); p.vl(147, 22, 6, '#7d7b76');
  p.rect(128, 45, 32, 2, W3); p.hl(128, 47, 32, '#2a211a');
  p.rect(133, 12, 4, 4, '#b8a888', 0.6); p.set(134, 13, '#8a7a5a');                    // 뜯다 만 스티커
  if (s.closet) { // 문 한 짝이 열렸다. 안은 어둡고 옷이 걸려 있다. 문짝은 경첩 쪽에 세로로 선다.
    const L = s.closet === 'left', x0 = L ? 129 : 144, w = 15;
    p.rect(x0, 5, w, 40, '#1b161c'); p.hl(x0, 9, w, '#5e5146');                         // 안쪽 그늘, 옷걸이 봉
    const cols = ['#3f4455', '#5d6376', '#4c5266', '#6b5a4a', '#3a3c48'];
    for (let i = 0; i < 5; i++) { const x = x0 + 1 + i * 3; p.rect(x, 10, 2, 18 + ((i * 7) % 9), cols[i]); p.set(x, 9, '#8d8a84'); } // 걸린 옷 (긴소매뿐이다)
    if (L) p.rect(x0 + 2, 36, 10, 8, '#8a7250'), p.hl(x0 + 2, 36, 10, '#a08660'); // 바닥에 상자
    const hx = L ? 126 : 158; // 문짝: 경첩에 붙어 앞으로 열렸다 (옆에서 보면 얇다)
    p.rect(hx, 4, 3, 46, W2); p.vl(hx + (L ? 0 : 2), 4, 46, W3); p.hl(hx, 4, 3, '#a18a76');
    if (!L) { for (let y = 7; y < 46; y++) p.set(hx, y, y % 7 < 2 ? '#c8d4dc' : '#8d9aa6'); } // 안쪽 면의 거울이 방 쪽으로 번득인다
  }
}

function bed(p: Pix, s: RoomState): void {
  // 낮은 침대. 머리가 위쪽. 맵의 (1..2, 2..4) = 그림의 x16..47, y48..95.
  const FR = '#5a4a3c', FR_L = '#6e5c4c', FR_D = '#3a2e25';
  p.rect(16, 47, 32, 49, FR); p.rect(16, 47, 32, 4, FR_L); p.hl(16, 47, 32, '#84705e'); p.hl(16, 51, 32, FR_D);
  p.rect(16, 92, 32, 4, FR); p.hl(16, 92, 32, FR_L); p.hl(16, 95, 32, FR_D); p.vl(47, 51, 44, FR_D); p.vl(16, 51, 41, FR_D);
  // 매트리스와 시트
  p.rect(17, 52, 30, 40, '#b4b0a6'); p.hl(17, 52, 30, '#c8c4ba'); p.vl(46, 52, 40, '#8f8b82');
  for (let y = 54; y < 64; y++) for (let x = 18; x < 46; x++) if (rnd(x, y, 11) > 0.93) p.set(x, y, '#a29e94');
  // 베개. 가운데가 꺼졌다.
  p.rect(20, 53, 24, 10, '#d6d2c6'); p.hl(21, 53, 22, '#e8e5dc'); p.hl(20, 62, 24, '#a9a59a'); p.vl(20, 54, 8, '#bdb9ae'); p.vl(43, 54, 8, '#bdb9ae');
  p.set(20, 53, '#b4b0a6'); p.set(43, 53, '#b4b0a6'); p.set(20, 62, '#b4b0a6'); p.set(43, 62, '#b4b0a6');
  p.rect(27, 56, 10, 4, '#c6c2b6'); p.hl(28, 59, 8, '#b8b4a8');
  // 이불. 구겨진 채로 사 년.
  const B0 = '#5b6377', B1 = '#717a90', B2 = '#454c5e', B3 = '#363b4a';
  const top = s.lie ? 63 : 67;
  const edgeAt = (x: number): number => top + Math.round(Math.sin(x * 0.55) * 1.3 + (x > 36 ? (x - 36) * (s.lie ? 0.15 : 0.5) : 0));
  for (let x = 17; x < 47; x++) for (let y = edgeAt(x); y < 92; y++) p.set(x, y, x === 17 || x === 46 ? B2 : y > 89 ? B3 : B0);
  // 주름: 밝은 줄 하나에 그늘 한 줄. 구긴 방향이 제각각이다.
  const fold = (x0: number, y0: number, x1: number, y1: number): void => { p.line(x0, y0, x1, y1, B1); p.line(x0, y0 + 1, x1, y1 + 1, B2); };
  fold(19, 74, 28, 70); fold(30, 73, 42, 78); fold(21, 82, 33, 86); fold(35, 84, 44, 81); fold(24, 78, 29, 79); fold(38, 71, 43, 72);
  p.dither(18, 86, 28, 3, B2, 0, 0.6); p.dither(34, 74, 10, 4, B1, 1, 0.35);
  for (let x = 17; x < 47; x++) { const e = edgeAt(x); p.set(x, e, '#8792a8'); p.set(x, e + 1, B1); if (x % 4 === 1) p.set(x, e + 2, B1); } // 접힌 윗단
  if (s.lie) { // 이불 밑에 사람이 있다: 베개 바로 밑에서 어깨가 시작해 발치까지 이어진다
    const half = (y: number): number => (y < 70 ? 6 + (y - 63) * 0.9 : y < 80 ? 12 - (y - 70) * 0.25 : 9.5 - (y - 80) * 0.35); // 어깨 → 몸통 → 다리
    for (let y = 63; y < 92; y++) {
      const hw = half(y);
      for (let x = Math.ceil(31.5 - hw); x <= Math.floor(31.5 + hw); x++) {
        if (x < 18 || x > 45) continue;
        const dx = (x - 31.5) / hw;
        p.set(x, y, dx < -0.55 ? B1 : dx > 0.6 ? B2 : B0);
      }
      if (y > 63) { const l = Math.round(31.5 - hw), r = Math.round(31.5 + hw); if (l >= 18) p.set(l, y, B3, 0.7); if (r <= 45) p.set(r, y, B3, 0.8); }
    }
    for (let x = 25; x < 39; x++) { p.set(x, 63, '#8792a8'); p.set(x, 64, B1); } // 턱밑까지 끌어 올린 이불 끝
    p.line(26, 72, 30, 70, B1); p.line(33, 76, 37, 80, B2); p.line(28, 84, 31, 86, B2); // 이불 주름이 몸을 따라 진다
    p.ell(31.5, 58, 7, 4.5, '#a9a59a', 0.55); // 베개가 머리 무게로 꺼졌다
  }
  // 발치에 밀려난 이불 끝이 바닥으로 흘렀다
  p.rect(40, 90, 7, 4, B2); p.hl(40, 90, 7, B0); p.set(47, 93, B3);
}

function clutter(p: Pix, s: RoomState): void {
  // 책상 밑으로 흘러나온 것들: 털 조각, 폼 부스러기, 실
  const tuft = (x: number, y: number, c: string): void => { p.set(x, y, c); p.set(x + 1, y, c); p.set(x + 1, y - 1, c, 0.8); };
  [[70, 52, '#f08a32'], [76, 50, '#46353f'], [83, 54, '#fffaf0'], [90, 51, '#f08a32'], [97, 55, '#fffaf0'], [103, 51, '#46353f'], [108, 53, '#ffb85c'], [87, 58, '#46353f'], [79, 57, '#efe0cf']]
    .forEach(([x, y, c]) => tuft(x as number, y as number, c as string));
  p.dots('73,55 81,51 94,53 100,57 106,56 85,50', '#d8cf9a');
  p.line(92, 56, 99, 59, '#e9822f', 0.8); p.set(100, 59, '#e9822f');
  // 본뜬 종이 (귀 모양)
  p.rect(112, 53, 8, 6, '#dcd8cc'); p.set(112, 53, FL); p.set(119, 53, FL); p.hl(113, 58, 6, '#a9a59a'); p.dots('114,55 115,54 116,55 117,56', '#8d8a84');
  // 침대 옆: 충전 중인 휴대폰, 먹다 만 컵라면
  p.rect(50, 58, 4, 7, '#1c1c24'); p.rect(51, 59, 2, 5, '#2a2c3a'); p.line(52, 57, 49, 50, '#2a2a32'); p.set(49, 49, '#d8d6d0');
  if (!s.tidy) { p.rect(52, 86, 6, 2, '#e6e1d6'); p.rect(52, 88, 6, 4, '#d8d2c6'); p.hl(52, 89, 6, '#c0443a'); p.hl(52, 92, 6, FL_DD); p.line(56, 83, 58, 86, '#b89a6a'); }
  // 벗어 둔 옷 더미
  for (let y = 99; y < 108; y++) for (let x = 24; x < 42; x++) {
    const dx = (x - 33) / 9, dy = (y - 104) / 4.6;
    if (dx * dx + dy * dy > 1) continue;
    const f = (x + y * 2) % 7;
    p.set(x, y, f < 2 ? '#4c5266' : f < 4 ? '#5d6376' : f === 4 ? '#757c90' : '#3f4455');
  }
  p.hl(26, 108, 14, FL_DD, 0.6);
  if (s.tidy) {
    // 묶은 봉지 셋, 그 옆에 접어서 끈으로 묶은 상자들, 밟아서 납작해진 페트병
    const bag = (x: number, y: number, c0: string, c1: string): void => {
      p.ell(x, y, 5, 4.2, c1); p.ell(x - 0.6, y - 0.6, 4.2, 3.4, c0); p.dots(`${x - 2},${y - 2} ${x + 1},${y - 1}`, '#ffffff');
      p.set(x, y - 5, c1); p.set(x - 1, y - 6, c0); p.set(x + 1, y - 6, c0); p.hl(x - 4, y + 4, 9, '#1d1820', 0.35); // 묶은 매듭
    };
    bag(140, 104, '#e8eae6', '#b8bab6'); bag(149, 106, '#dfe6ee', '#a8b4c2'); bag(144, 98, '#eceee8', '#bcbeb8');
    p.rect(128, 104, 7, 6, '#a08660'); p.hl(128, 104, 7, '#b89c74'); p.rect(128, 106, 7, 1, '#7c6646'); p.rect(128, 108, 7, 1, '#7c6646'); p.vl(131, 104, 6, '#e8e0c8');
    p.rect(126, 111, 5, 1, '#9fbac6'); p.set(126, 111, '#3a6ea8');
  } else {
    // 택배 상자 (납작하게 접었다), 2L 생수병
    p.rect(136, 99, 18, 10, '#a08660'); p.hl(136, 99, 18, '#b89c74'); p.hl(136, 108, 18, '#7c6646'); p.vl(144, 99, 10, '#8a7250'); p.rect(141, 102, 7, 3, '#d8d4c8'); p.hl(142, 103, 5, '#8d8a84');
    p.rect(128, 52, 3, 9, '#9fbac6'); p.vl(128, 54, 5, '#c6dde6'); p.set(129, 51, '#3a6ea8'); p.rect(128, 56, 3, 2, '#3a6ea8', 0.7);
  }
  if (s.pile === 'torn') tornPile(p, 102, 94); // 어젯밤 그 자리에
  if (s.headAt) {
    const head = catHeadAlone(!s.headDone, false, s.mark || '');
    if (s.headAt === 'bed') { // 침대 밑으로 밀었는데 머리가 걸렸다. 몸은 침대 밑 그늘에, 머리는 침대 옆에 반쯤 나와 있다
      p.rect(44, 80, 4, 9, SW[2]); p.dots('45,82 46,85 45,87', SO[1]);
      p.hl(48, 90, 14, INK, 0.4);
      p.blit(head, 47, 90 - head.h);
    } else { // 바닥에 던졌다: 옆으로 굴러 누웠다
      const r = rot90(head);
      p.ell(70 + r.w / 2, 106, r.w / 2 + 2, 2.2, INK, 0.4);
      p.blit(r, 70, 106 - r.h);
    }
  }
  if (s.box) { // 실밥이 부친 상자. 엄마가 문 안쪽으로 밀어 넣었다. 받는 사람, 삼색이.
    const X = 146, Y = 84;
    p.hl(X, Y + 10, 12, '#1d1820', 0.4);
    p.rect(X, Y + 6, 12, 4, '#8a7250'); p.hl(X, Y + 9, 12, '#6a563a'); p.rect(X + 1, Y + 7, 4, 2, '#e8e4da'); p.hl(X + 2, Y + 7, 2, '#8d8a84'); // 앞면과 송장
    if (s.box === 'shut') {
      p.rect(X, Y, 12, 6, '#b89c74'); p.hl(X, Y, 12, '#c8ae86'); p.vl(X + 6, Y, 6, '#d8cf9a'); p.vl(X + 6, Y + 6, 2, '#d8cf9a');
    } else { // 뜯었다. 날개가 벌어졌고 안이 어둡다.
      p.rect(X, Y, 12, 6, '#4a3a28'); p.rect(X + 1, Y + 1, 10, 4, '#33281c');
      p.rect(X - 2, Y - 1, 3, 6, '#c8ae86'); p.rect(X + 11, Y - 1, 3, 6, '#b89c74'); p.hl(X + 1, Y - 2, 10, '#c8ae86'); p.vl(X + 6, Y - 2, 1, '#d8cf9a');
      p.dots(`${X + 3},${Y + 2} ${X + 4},${Y + 3}`, '#46353f'); p.set(X + 8, Y + 3, '#f08a32'); // 남은 털 조각
    }
  }
}

function shell(p: Pix, s: RoomState): void {
  p.rect(0, 0, p.w, p.h, '#000000');
  // 벽 윗면 (위에서 내려다본 벽의 두께)
  p.rect(10, 0, 6, 118, SLAB); p.vl(15, 0, 112, SLAB_L);
  p.rect(160, 0, 6, 118, SLAB); p.vl(160, 0, 112, SLAB_L);
  p.rect(10, 112, 156, 6, SLAB); p.hl(16, 112, 144, SLAB_L);
  // 스위치 (오른쪽 벽)
  p.rect(160, 52, 2, 6, '#dedad0'); p.set(160, 54, '#8d8a84'); p.set(161, 57, '#a9a59a');
  // 방문 (오른쪽 벽). 맵의 (10,3) = y64..79.
  p.rect(160, 62, 6, 20, '#4a3a2e'); p.rect(160, 64, 6, 16, s.open ? '#e8c890' : '#7a6149');
  if (!s.open && s.ajar) { // 잠금쇠가 문틀째 뜯겼다. 문짝이 경첩 쪽으로 한 뼘 비껴 안으로 들어와 있다. 그 틈으로 거실 빛.
    p.rect(160, 64, 6, 16, '#e8c890'); p.vl(165, 64, 16, '#c8a874');
    for (let i = 0; i < 16; i++) { const x = 159 - Math.round(i * 0.28); p.set(x, 64 + i, '#7a6149'); p.set(x + 1, 64 + i, '#8f745a'); p.set(x - 1, 64 + i, '#5c4836', 0.7); }
    p.dots('163,73 164,74 163,76 165,77', '#b89a6a'); p.dots('164,75 162,74', '#4a3a2e'); // 뜯긴 자리: 나뭇결이 일어났다
    p.hl(158, 75, 1, '#c8c2a8'); p.set(155, 80, '#8d8468'); // 손잡이는 문짝을 따라 들어왔다
  } else if (!s.open) { p.vl(160, 64, 16, '#8f745a'); p.vl(163, 64, 16, '#5c4836'); p.rect(158, 75, 2, 2, '#c8c2a8'); p.set(158, 76, '#8d8468'); }
  else { p.rect(150, 62, 10, 3, '#7a6149'); p.hl(150, 62, 10, '#8f745a'); }
}

function shadows(p: Pix): void {
  // 가구 밑의 그늘: 진한 줄 하나, 성긴 점 한 줄
  const band = (x: number, y: number, w: number): void => { p.hl(x, y, w, '#1d1820', 0.45); p.dither(x, y + 1, w, 1, '#1d1820', 0, 0.3); };
  band(16, 32, 48); band(64, 48, 96); band(16, 96, 33);
  p.vl(48, 51, 45, '#1d1820', 0.3); p.dither(49, 52, 1, 44, '#1d1820', 1, 0.2);
  p.vl(16, 32, 15, '#1d1820', 0.25); p.vl(159, 48, 64, '#1d1820', 0.22);
}

const cache = new Map<string, Pix>();
export function paintRoom(s: RoomState): Pix {
  const key = JSON.stringify(s);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = new Pix(176, 128);
  shell(p, s);
  wall(p);
  floor(p, 16, 32, 159, 111);
  windowAndCurtain(p, s);
  shadows(p);
  closet(p, s);
  trash(p, s);
  desk(p, s);
  bed(p, s);
  clutter(p, s);
  if (cache.size > 40) cache.clear();
  cache.set(key, p);
  return p;
}
export { INK };
