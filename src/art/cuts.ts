// 글 사이에 끼는 큰 그림: 거울, 단체 사진, 영상, 졸업앨범.
// 탈 머리는 kemono.ts 가 그린다. 실제 케모노 퍼슈트 사진을 보고 다시 그린 큰 머리다.
// 걷는 그림(chars.ts)과 무늬, 귀, 눈 색이 같아서 거울 속 고양이와 걷는 고양이가 같은 고양이로 읽힌다.
// 규칙(기획서 11장): 사람에게는 이목구비가 없다. 얼굴이 있는 건 고양이(와 탈)뿐이다.
import { Pix, mix, rnd } from './pix.ts';
import { furPass, kemonoHead, kemonoTorso, catSpec, suitSpec } from './kemono.ts';
import { humanBust, HAIR, SKIN, type HSpec } from './human.ts';
import { CAT_R, CX, Part, SUIT_R, charFrame, inSpace, stamp, stripe, type Ramps, type Space, type Species } from './chars.ts';

type UV = [number, number];
/** 도형 좌표의 (pu,pv) 가 판의 (ax,ay) 에 오도록, k 배로 키우고 th 만큼 돌린 판 */
function space(w: number, h: number, k: number, ax: number, ay: number, pu: number, pv: number, th = 0): Space & { fwd: (u: number, v: number) => UV } {
  const cs = Math.cos(th), sn = Math.sin(th);
  return {
    w, h, k,
    tf: (x, y) => { const dx = (x - ax) / k, dy = (y - ay) / k; return [pu + dx * cs + dy * sn, pv - dx * sn + dy * cs]; },
    fwd: (u, v) => { const du = (u - pu) * k, dv = (v - pv) * k; return [ax + du * cs - dv * sn, ay + du * sn + dv * cs]; },
  };
}
type Sp = ReturnType<typeof space>;
const inE = (u: number, v: number, cx: number, cy: number, rx: number, ry: number): boolean => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
function trimPix(p: Pix): Pix {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.alpha(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return new Pix(1, 1);
  const q = new Pix(x1 - x0 + 1, y1 - y0 + 1); q.blit(p, -x0, -y0); return q;
}
/** 점마다 밝기를 곱한다 (조명, 비네트). f 는 [r,g,b] 배율. */
function shade(p: Pix, f: (x: number, y: number) => [number, number, number]): void {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 4; if (!p.d[i + 3]) continue;
    const [r, g, b] = f(x, y); p.d[i] *= r; p.d[i + 1] *= g; p.d[i + 2] *= b;
  }
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));

// ── 삼색이의 상반신 ──
export type BustOpt = { k: number; tilt?: number; droopy?: boolean; blank?: boolean; body?: boolean; mark?: '' | 'torn' | 'sewn' };
const bustCache = new Map<string, Pix>();
const C = CX; // 머리 가운데 (도형 좌표)
export function catBust(o: BustOpt): Pix {
  const key = JSON.stringify(o);
  const hit = bustCache.get(key); if (hit) return hit;
  const k = o.k, body = o.body !== false;
  const w = Math.ceil(40 * k) + 6, h = Math.ceil((body ? 62 : 30) * k) + 6;
  const ax = 20 * k + 3, ay = 23 * k + 3; // 목(22,22)이 놓일 자리. 위로 귀 끝, 양옆으로 팔까지 들어간다.
  const p = new Pix(w, h);
  const flat = space(w, h, k, ax, ay, C, 22);
  const head = space(w, h, k, ax, ay, C, 22, o.tilt || 0);
  // 어깨와 가슴. 그의 오른쪽(보는 쪽 왼쪽)이 주황, 왼쪽이 검정. 가슴은 흰 털.
  if (body) kemonoTorso(p, (x, y) => { const [U, V] = flat.tf!(x, y); return [U - C, V - 25]; }, CAT_R, (u, _v, n) => (u < (n - 0.5) * 1.2 ? 'O' : 'K'), (s) => (s < 0 ? 'O' : 'K'));
  // 머리: 케모노 퍼슈트 사진을 보고 다시 그린 큰 머리 (kemono.ts). 걷는 그림과 같은 무늬, 같은 접힌 귀, 같은 초록 눈.
  kemonoHead(p, (x, y) => { const [U, V] = head.tf!(x, y); return [U - C, V - 16.6]; }, k, catSpec(CAT_R), { droopy: o.droopy, blank: o.blank, mark: o.mark || '' });
  const out = trimPix(p);
  bustCache.set(key, out);
  return out;
}

// ── 사람: 실루엣. 이목구비가 없다. ──
const SIL: Ramps = { S: ['#2e3849', '#161c27', '#0e121a', '#08090e'], H: ['#1c1d24', '#111217', '#0b0c10', '#060609'], F: ['#4a4c58', '#34363f', '#24252c', '#15161b'] };
/** 윤재. 머리가 눈을 덮었다. 목이 늘어난 티셔츠, 한여름인데 긴소매. (cx, top) 은 정수리.
 *  neat: 현우. 짧게 정리한 머리, 셔츠 깃. 그림은 human.ts 가 찍는다 (얼굴 없는 행인처럼: 살결에 빛과 그늘만). */
function yunjae(p: Pix, cx: number, top: number, R: Ramps = SIL, neat = false, extra: Partial<HSpec> = {}): void {
  const k = 2.05;
  const spec: HSpec = neat
    ? { skin: R.F ?? SKIN.fair, hair: R.H, cloth: R.S, style: 'neat', top: 'shirt', part: 0.6, seed: 13, ...extra }
    : { skin: R.F ?? SKIN.pale, hair: R.H, cloth: R.S, style: 'mop', top: 'stretch', sleeve: 'long', seed: 3, ...extra };
  humanBust(p, (x, y) => [(x - cx) / k, (y - top) / k - 8.8], spec);
}

// ── 거울 ──
export type MirrorOpt = { cat: boolean; bright: boolean; droopy: boolean; morning?: boolean };
const mirrorCache = new Map<string, Pix>();
export const MIRROR_W = 240, MIRROR_H = 150;
export function mirrorScene(o: MirrorOpt): Pix {
  const key = JSON.stringify(o);
  const hit = mirrorCache.get(key); if (hit) return hit;
  const W = MIRROR_W, H = MIRROR_H, p = new Pix(W, H);
  if (!o.bright) {
    // 밤의 방. 옷장 문 안쪽에 붙은 거울. 빛은 커튼 틈과 꺼져 가는 모니터뿐.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#0d1018', '#07080c', y / H + (rnd(x, y, 3) - 0.5) * 0.08));
    // 옷장 안쪽: 걸린 옷들의 실루엣
    for (let i = 0; i < 6; i++) { const x = 6 + i * 11; p.rect(x, 18 + (i % 2) * 6, 9, 70 + (i * 7) % 18, i % 2 ? '#0a0c11' : '#0c0f15'); p.hl(x + 3, 14, 3, '#151a22'); }
    p.hl(0, 14, 74, '#1b1f27');
    // 문짝 (나무) 과 거울
    const dx0 = 70, dx1 = 170;
    for (let y = 0; y < H; y++) for (let x = dx0; x < dx1; x++) {
      const g = Math.sin(x * 0.9 + Math.sin(y * 0.07 + x) * 2) > 0.7 ? 0.1 : 0;
      p.set(x, y, mix('#2a1f17', '#1a130e', g + (y / H) * 0.5));
    }
    p.vl(dx0, 0, H, '#3a2b20'); p.vl(dx1 - 1, 0, H, '#100b08');
    const gx0 = 80, gx1 = 160, gy0 = 8, gy1 = 146;
    p.rect(gx0 - 2, gy0 - 2, gx1 - gx0 + 4, gy1 - gy0 + 4, '#5a5048'); p.rect(gx0 - 1, gy0 - 1, gx1 - gx0 + 2, gy1 - gy0 + 2, '#2a2420');
    const glass = new Pix(gx1 - gx0, gy1 - gy0);
    for (let y = 0; y < glass.h; y++) for (let x = 0; x < glass.w; x++) glass.set(x, y, mix('#1a2130', '#0b0f16', y / glass.h * 0.9));
    // 거울에 비친 방 뒤쪽: 커튼 틈의 푸른 빛 한 줄, 책상 위 모니터의 얼룩
    glass.vl(64, 0, 70, '#5a7aa8'); glass.vl(65, 0, 70, '#2c3d58');
    for (let y = 70; y < glass.h; y++) glass.set(64 - Math.floor((y - 70) * 0.6), y, '#1c2638');
    glass.rect(4, 96, 22, 14, '#121822'); glass.rect(6, 98, 18, 10, '#1a2a2e');
    const fig = new Pix(glass.w, glass.h);
    if (o.cat) {
      const b = catBust({ k: 2.55, tilt: -0.16, droopy: o.droopy });
      fig.blit(b, Math.round(glass.w / 2 - b.w / 2), 14, true); // 거울이라 좌우가 바뀐다
    } else yunjae(fig, 40, 26);
    // 조명: 얼굴 쪽이 가장 밝고 아래로, 가장자리로 어두워진다. 커튼 틈 쪽 가장자리에 푸른 테.
    shade(fig, (x, y) => {
      const d = Math.hypot((x - glass.w * 0.48) / 46, (y - 44) / 70);
      const v = lerp(1.0, 0.34, d - 0.15);
      return o.cat ? [v * 0.88, v * 0.9, v * 1.02] : [v, v, v];
    });
    for (let y = 1; y < fig.h; y++) for (let x = fig.w - 2; x > 0; x--) { // 오른쪽 테두리 빛
      if (fig.alpha(x, y) && !fig.alpha(x + 1, y)) { fig.set(x, y, '#6f8fbf', 0.55); break; }
    }
    glass.blit(fig, 0, 0);
    // 유리: 비스듬한 얼룩과 먼지
    for (let y = 0; y < glass.h; y++) for (let x = 0; x < glass.w; x++) {
      const t = x + y * 0.55;
      if ((t > 18 && t < 21) || (t > 26 && t < 27)) glass.set(x, y, '#c8d6ff', 0.06);
      if (rnd(x, y, 9) > 0.996) glass.set(x, y, '#8a96a8', 0.5);
    }
    p.blit(glass, gx0, gy0);
    p.rect(dx0 + 3, 74, 3, 8, '#7a6a54'); p.set(dx0 + 4, 76, '#b4a284'); // 손잡이
    // 방 오른쪽: 벽과 침대 모서리
    p.rect(dx1, 100, W - dx1, H - 100, '#090a0e'); p.hl(dx1, 100, W - dx1, '#151820');
  } else {
    // 파티룸 화장실. 흰 타일, 넓은 거울, 세면대. 형광등이 너무 밝다.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const line = x % 16 === 0 || y % 16 === 0;
      p.set(x, y, line ? '#a9b2b3' : mix('#d7dcda', '#c3cac9', y / H + (rnd(x, y, 5) - 0.5) * 0.06));
    }
    const gx0 = 34, gx1 = 206, gy0 = 10, gy1 = 104;
    p.rect(gx0 - 2, gy0 - 2, gx1 - gx0 + 4, gy1 - gy0 + 4, '#8f989b'); p.hl(gx0 - 2, gy0 - 2, gx1 - gx0 + 4, '#e8eeef');
    const glass = new Pix(gx1 - gx0, gy1 - gy0);
    for (let y = 0; y < glass.h; y++) for (let x = 0; x < glass.w; x++) {
      const line = (x + 6) % 16 === 0 || (y + 2) % 16 === 0;
      glass.set(x, y, line ? '#98a6aa' : mix('#bfcacc', '#aab6b9', y / glass.h));
    }
    glass.rect(0, 0, glass.w, 4, '#f4f8f6'); // 비친 형광등
    const fig = new Pix(glass.w, glass.h);
    const R: Ramps = { S: ['#8a9094', '#6d7377', '#53595d', '#3a3f42'], H: HAIR.black, F: SKIN.pale };
    if (o.cat) { const b = catBust({ k: 2.2, droopy: o.droopy }); fig.blit(b, 60 - Math.round(b.w / 2), 8, true); }
    else yunjae(fig, 62, 18, R);
    // 현우: 셔츠 차림. 거울 속에서 눈이 마주친다 — 하지만 그에게도 눈은 그려지지 않는다.
    const HW: Ramps = { S: ['#f2f4f6', '#d8dde2', '#b2bac2', '#7f8890'], F: SKIN.fair, H: HAIR.dark };
    yunjae(fig, 128, 24, HW, true);
    glass.blit(fig, 0, 0);
    p.blit(glass, gx0, gy0);
    // 세면대
    p.rect(0, 112, W, 6, '#eef2f1'); p.rect(0, 118, W, H - 118, '#bfc6c6'); p.hl(0, 118, W, '#8f9898');
    p.rect(70, 112, 70, 14, '#f8faf9'); p.rect(74, 114, 62, 8, '#d0d8d8'); p.ell(105, 118, 4, 1.5, '#7f8a8c');
    p.rect(102, 104, 6, 9, '#9aa3a6'); p.rect(98, 103, 14, 3, '#c9d0d2'); p.rect(108, 106, 6, 2, '#9aa3a6');
    // 알약 봉지는 이미 주머니 속이다. 세면대 가장자리에 물방울만.
    for (const [x, y] of [[148, 114], [152, 115], [60, 115]]) p.set(x, y, '#ffffff');
  }
  if (o.morning && !o.bright) { // 토요일 아침: 커튼 틈으로 흐린 빛이 들어 방 전체가 회색으로 떠오른다
    shade(p, (x, y) => { const v = 2.3 + Math.max(0, 1 - Math.abs(x - 144) / 60) * 0.8 - y / H * 0.6; return [v * 0.92, v * 0.96, v]; });
  }
  mirrorCache.set(key, p);
  return p;
}

// ── 단체 사진: 곰이 뒤에서 팔을 둘러 앞줄 어깨에 앞발을 얹는다 ──
/** 다른 탈들. 눈은 삼색이와 같은 문법(유리알, 위 눈꺼풀, 반짝임 둘)이고 홍채 색만 탈마다 다르다. */
function suiter(p: Pix, sp: Sp, sp0: Sp, kind: Species, shirt: string | null, bodyOn = true): void {
  const R = SUIT_R[kind];
  const c = C;
  // 몸: 삼색이와 같은 퍼슈트 상반신. 셋은 탈 위에 반팔 티셔츠를 입었다. 목둘레로 털이 비어져 나오고, 소매 밑으로 털 팔이 나온다.
  if (bodyOn) {
    const R2: Ramps = shirt ? { ...R, S: [mix(shirt, '#ffffff', 0.3), shirt, mix(shirt, '#000000', 0.25), mix(shirt, '#000000', 0.5)] } : R;
    const neck = (u: number, v: number, n: number): boolean => v < 2.4 + (n - 0.5) * 0.9 - Math.abs(u) * 0.12 && Math.abs(u) < 6.4; // 목털이 옷깃 위로 비어져 나온다
    const key = shirt
      ? (u: number, v: number, n: number): string => (neck(u, v, n) ? (kind === 'fox' || kind === 'dog' ? 'W' : 'A') : 'S')
      : (u: number, v: number): string => (inE(u, v, 0, 20, 7.4, 10) ? 'W' : 'A'); // 곰: 배에 밝은 털
    kemonoTorso(p, (x, y) => { const [U, V] = sp0.tf!(x, y); return [U - c, V - 25]; }, R2, key, (_s, v) => (shirt && v < 10.5 ? 'S' : 'A'), false);
  }
  // 머리: 삼색이와 같은 케모노 머리 (kemono.ts). 귀, 주둥이, 홍채 색만 탈마다 다르다.
  kemonoHead(p, (x, y) => { const [U, V] = sp.tf!(x, y); return [U - c, V - 16.6]; }, sp.k, suitSpec(kind, R));
}
export function groupPhoto(droopy = false): Pix {
  const W = 240, H = 135, p = new Pix(W, H);
  // 파티룸. 벽은 따뜻한 나무색, 위에는 삼각 깃발 줄.
  // 파티룸 본방의 그 나무 벽 (places.ts 와 같은 판자, 같은 9칸 이음매). 플래시가 터진 순간이라 맵보다 한 톤 밝다.
  for (let y = 0; y < 112; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor(x / 9), seam = x % 9 === 0;
    const base = mix('#a07a5a', '#7a5a44', y / 112 * 0.7 + (rnd(plank, 0, 65) - 0.5) * 0.22);
    let c = seam ? mix(base, '#3a281c', 0.4) : x % 9 === 1 ? mix(base, '#ffffff', 0.1) : base;
    if (!seam && rnd(x, y >> 1, 66) > 0.94) c = mix(base, '#4a3424', 0.22); // 옹이와 결
    p.set(x, y, c);
  }
  p.rect(0, 106, W, 6, '#4e382a'); p.hl(0, 106, W, '#6e5240'); // 걸레받이
  const balloon = (bx: number, by: number, col: string): void => {
    p.ell(bx, by, 7, 8.5, mix(col, '#000000', 0.25)); p.ell(bx - 0.5, by - 0.5, 6.4, 7.8, col);
    p.ell(bx - 2.5, by - 3.5, 1.6, 2.4, mix(col, '#ffffff', 0.55)); p.set(bx - 3, by - 5, '#ffffff');
    p.set(bx, by + 9, mix(col, '#000000', 0.3)); for (let i = 10; i < 22; i++) p.set(bx + Math.round(Math.sin(i * 0.6)), by + i, '#b8a890');
  };
  balloon(14, 26, '#ef8a8a'); balloon(28, 20, '#8ac0ef'); balloon(212, 22, '#f2cf6a'); balloon(227, 30, '#b49ae8');
  for (let x = 0; x < W; x++) { const y = Math.round(8 + Math.sin(x / W * Math.PI) * 10); p.set(x, y, '#8a6e56'); }
  const FL = ['#e06a5a', '#f2c25a', '#6ab0d8', '#8ccf7a', '#c98ad8'];
  for (let i = 0; i < 14; i++) {
    const x = 6 + i * 17, y = Math.round(8 + Math.sin(x / W * Math.PI) * 10);
    for (let j = 0; j < 7; j++) p.hl(x + Math.floor(j / 2), y + 1 + j, 7 - j, FL[i % FL.length]);
  }
  p.rect(0, 112, W, H - 112, '#b88a5e'); p.hl(0, 112, W, '#7a5638'); for (let x = 0; x < W; x += 20) p.vl(x, 113, H - 113, '#a47a50');
  /** (x, top) 은 머리 가운데와 도형 좌표 v=0 이 놓일 자리 */
  const put = (x: number, top: number, k: number, kind: Species, shirt: string | null, tilt: number): void => {
    const q = new Pix(Math.ceil(40 * k), Math.ceil(80 * k) + 4);
    const ax = q.w / 2, ay = 34 * k + 2;
    suiter(q, space(q.w, q.h, k, ax, ay, C, 22, tilt), space(q.w, q.h, k, ax, ay, C, 22), kind, shirt);
    p.blit(q, Math.round(x - ax), Math.round(top - 12 * k - 2));
  };
  // 곰: 뒤에서 머리를 내밀고, 두 팔을 벌려 앞줄을 감싼다
  put(122, -2, 2.3, 'bear', null, 0);
  put(36, 32, 1.75, 'rabbit', '#5b7ec2', 0.12);
  put(80, 36, 1.75, 'fox', '#2f3540', 0.06);
  put(170, 36, 1.75, 'dog', '#c54848', -0.1);
  // 곰의 팔 (대본: 곰이 뒤에서 전부를 끌어안는다. 팔 안에 여우와 토끼와 강아지와 고양이가 들어간다.)
  // 두 팔이 삼색이 뒤에서 나와 여우·토끼, 강아지의 어깨 위를 지나 바깥 어깨를 감싼다. 털결이 팔을 따라 흐른다.
  const BR = SUIT_R.bear;
  const arms = new Pix(W, H); // 팔만 따로 그려 털결을 얹는다 (머리까지 얼룩지지 않게)
  inSpace({ w: W, h: H, k: 1 }, () => {
    stamp(arms, new Part('A').path([112, 76, 84, 86, 50, 90, 24, 98], 5.4, 4.6).light(70, 82, 30, 10), BR, true);
    stamp(arms, new Part('A').path([136, 76, 164, 86, 194, 90, 214, 98], 5.4, 4.6).light(176, 82, 30, 10).set({ dim: 1 }), BR, true);
    for (const [x, y, d] of [[21, 101, 0], [217, 101, 1]] as const) stamp(arms, new Part((X, Y) => (inE(X, Y, x + (d ? -1 : 1), y + 1.4, 3, 2.2) ? 'W' : 'A')).ell(x, y, 6.4, 5.4).light(x - 3, y - 3, 7, 6).set({ dim: d }), BR, true);
  });
  furPass(arms, BR, ['A'], 120, 40, 43);
  p.blit(arms, 0, 0);
  // 삼색이: 가운데. 여우가 끌어다 놓은 자리.
  const cat = catBust({ k: 1.75, droopy });
  p.blit(cat, 124 - Math.round(cat.w / 2), 40);
  // 플래시: 가운데가 밝고 가장자리가 가라앉는다
  shade(p, (x, y) => { const d = Math.hypot((x - 120) / 160, (y - 60) / 110); const v = lerp(1.06, 0.8, d); return [v, v * 0.98, v * 0.95]; });
  return p;
}

// ── 영상: 높은 층에서, 끝까지 당겨서 찍었다 ──
export function videoPlayground(droopy = false): Pix {
  const W = 240, H = 135, p = new Pix(W, H);
  // 모래: 가로등 밑이 밝고, 발자국과 그네 밑 파인 자리가 그늘진다
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const pit = Math.min(Math.hypot((x - 82) / 22, (y - 122) / 6), Math.hypot((x - 160) / 22, (y - 122) / 6));
    p.set(x, y, mix('#9a8462', '#6a5a44', rnd(x, y, 8) * 0.4 + (pit < 1 ? (1 - pit) * 0.5 : 0) + (y < 60 ? 0.2 : 0)));
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < 44; y++) p.set(x, y, mix('#3a3a36', '#2a2a28', rnd(x, y, 2) * 0.5)); // 놀이터 뒤 화단과 담
  p.rect(0, 44, W, 2, '#4a4a44');
  // 그네 틀: 굵은 철 기둥, 위에 가로대. 사슬은 점선.
  const fx0 = 36, fx1 = 206, ty = 6;
  for (const x of [fx0, fx1]) { p.rect(x - 2, ty, 5, 120 - ty, '#3f4a50'); p.vl(x - 1, ty, 120 - ty, '#6a7a82'); }
  p.rect(fx0 - 2, ty, fx1 - fx0 + 5, 5, '#4a565c'); p.hl(fx0 - 2, ty, fx1 - fx0 + 5, '#7a8a92');
  const seat = 112;
  for (const sx of [82, 160]) for (const dx of [-16, 16]) for (let y = ty + 5; y < seat; y++) if (y % 3) p.set(sx + dx, y, '#8a9296');
  // 둘: 고양이는 손을 흔들고, 아이는 옆 그네에서 발을 흔든다. 그림은 걷는 그림을 두 배로.
  const up2 = (q: Pix): Pix => { const r = new Pix(q.w * 2, q.h * 2); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const i = ((y >> 1) * q.w + (x >> 1)) * 4; if (q.d[i + 3]) r.d.set(q.d.subarray(i, i + 4), (y * r.w + x) * 4); } return r; };
  const cat = up2(charFrame({ kind: 'cat', droopy }, 'down', 0, 'sit', 'wave', 1));
  const ha = up2(charFrame({ kind: 'haeun' }, 'down', 0, 'sit'));
  for (const sx of [82, 160]) { p.rect(sx - 18, seat, 37, 4, '#2a1e18'); p.hl(sx - 18, seat, 37, '#5a4232'); }
  p.blit(cat, 82 - 44, seat + 6 - 100); p.blit(ha, 160 - 44, seat + 6 - 100);
  // 가로등: 화면 밖 왼쪽 위에서 주황 빛
  shade(p, (x, y) => { const d = Math.hypot((x - 110) / 150, (y - 80) / 100); const v = lerp(1.55, 0.3, d * 1.05); return [v, v * 0.78, v * 0.52]; });
  return grain(p, 2); // 줌: 2×2 칸씩 뭉개고, 잡음과 주사선
}

// ── 졸업앨범: 3학년 4반. 하복들 사이에 혼자 긴소매. ──
export function yearbook(scribble: boolean): Pix {
  const W = 240, H = 135, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#e9e3d3', '#d6cfbd', (rnd(x, y, 4) * 0.5) + y / H * 0.3));
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]];
  const ME = 5;
  cells.forEach(([i, j], n) => {
    const x = 22 + i * 52, y = 8 + j * 62, w = 40, h = 46;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.set(x + xx, y + yy, mix('#b4c8d8', '#6d849a', Math.hypot((xx - 20) / 30, (yy - 14) / 40) + (rnd(xx, yy, n) - 0.5) * 0.05));
    // 얼굴 없는 증명사진. 하복은 흰 반소매 셔츠, 나만 긴소매. 사진관 배경은 위가 밝은 하늘색.
    const f = new Pix(w, h);
    const boy = n % 2 === 0 || n === 3;
    const styles = ['short', 'long', 'short', 'bob', 'short', 'mop', 'pony', 'long'] as const;
    const skins = [SKIN.warm, SKIN.fair, SKIN.tan, SKIN.warm, SKIN.fair, SKIN.pale, SKIN.warm, SKIN.fair];
    const hairs = [HAIR.black, HAIR.dark, HAIR.dark, HAIR.black, HAIR.brown, HAIR.black, HAIR.dark, HAIR.black];
    const white = ['#ffffff', '#eef1f3', '#ccd3da', '#98a1ad'] as const;
    const spec: HSpec = n === ME
      ? { skin: SKIN.pale, hair: HAIR.black, cloth: ['#e2e4e6', '#c4c8cc', '#a2a8ae', '#737a82'], trim: ['#56607a', '#3a4460', '#2a324a', '#1a2032'], style: 'mop', top: 'shirt', sleeve: 'long', tag: true, seed: 3 }
      : { skin: skins[n], hair: hairs[n], cloth: white, trim: boy ? ['#56607a', '#3a4460', '#2a324a', '#1a2032'] : ['#e86a78', '#c84a5a', '#9a3446', '#6a2232'], style: boy && styles[n] !== 'bob' ? 'short' : styles[n], top: boy ? 'shirt' : 'blouse', sleeve: 'short', tag: boy, ribbon: !boy, part: rnd(n, 4) * 1.4 - 0.7, seed: 20 + n };
    humanBust(f, (X, Y) => [(X - 20) / 1.25, Y / 1.25 - 14.4], spec);
    p.blit(f, x, y);
    p.hl(x + 6, y + h + 5, 28, '#9a9282'); p.hl(x + 10, y + h + 8, 20, '#b4ac9c');
    if (n === ME && scribble) {
      const pen = '#2a3f9a';
      for (const s2 of [-1, 1]) { // 세모 귀: 두 번 덧그었다
        const a = [x + 20 + s2 * 9, y + 10], b = [x + 20 + s2 * 8, y - 3], c2 = [x + 20 + s2 * 2, y + 7];
        for (const o of [0, 1]) { p.line(a[0] + o, a[1], b[0] + o, b[1], pen); p.line(b[0] + o, b[1], c2[0], c2[1], pen); }
      }
      for (const s of [-1, 1]) for (const d of [-2, 0, 2]) p.line(x + 20 + s * 4, y + 24 + d / 2, x + 20 + s * 16, y + 22 + d * 1.6, pen); // 수염
      // 밑에 쓴 글씨는 캔버스에서 손글씨로 얹는다 (scene.ts)
      p.hl(x + 4, y + h + 4, 32, '#e9e3d3'); p.hl(x + 4, y + h + 5, 32, '#e9e3d3'); p.hl(x + 4, y + h + 8, 32, '#e9e3d3');
    }
  });
  return p;
}
export const ALBUM_NOTE = { x: 22 + 52 + 20, y: 8 + 62 + 46 + 12 }; // '임대 고양이' 가 들어갈 자리 (그림 좌표)

// ── 어린이날 복지관: 불곰에게 아이 넷이 매달렸다 ──
// 곰표가 서버에 올린 휴대폰 사진. 플래시가 터졌다. 강당 벽에 그림자가 진다.
// 대본: "불곰이 서 있다. 아이 넷이 매달려 있다. 하나는 곰의 귀를 잡고 있다. 곰은 넘어지지 않으려고 다리를 벌렸다."
// 아이들에게 이목구비는 없다(11장). 얼굴은 살색 둥근 면에 빛과 그늘만 있다.
type Kid = { shirt: string; pants: string; hair: string; skin: string; shoe: string };
function kidRamps(k: Kid): Ramps {
  const r = (c: string, a = 0.32, b = 0.24): [string, string, string, string] => [mix(c, '#ffffff', a), c, mix(c, '#000000', b), mix(c, '#000000', b * 2)];
  return { S: r(k.shirt), L: r(k.pants), H: r(k.hair, 0.16, 0.3), F: r(k.skin, 0.25, 0.16), B: r(k.shoe, 0.4, 0.2), W: r('#f4f0e8', 0.4, 0.1) };
}
/** 아이 머리: 얼굴은 비우고 머리카락만. look 은 얼굴이 향한 쪽(-1 왼쪽 … 1 오른쪽). */
function kidHead(p: Pix, R: Ramps, x: number, y: number, r: number, look: number, style: 'bowl' | 'tails' | 'short' | 'cap'): void {
  stamp(p, new Part('F').ell(x, y, r, r * 1.06).light(x - r * 0.5, y - r * 0.5, r * 1.6, r * 1.8).set({ fur: false }), R, true);
  const ox = look * r * 0.35;
  if (style === 'tails') for (const s of [-1, 1]) stamp(p, new Part('H').path([x + s * r * 0.9, y - r * 0.2, x + s * r * 1.5, y + r * 0.4, x + s * r * 1.45, y + r * 1.1], r * 0.36, r * 0.3).set({ fur: false }), R, true);
  const hair = new Part('H').ell(x - ox * 0.3, y - r * 0.5, r * 1.06, r * 0.66).set({ fur: false }).light(x - r * 0.4, y - r, r * 1.4, r);
  if (style === 'bowl') hair.poly([x - r * 1.05, y - r * 0.4, x + r * 1.05, y - r * 0.4, x + r * 1.02, y + r * 0.15, x + ox, y - r * 0.12, x - r * 1.02, y + r * 0.15]);
  if (style === 'short' || style === 'tails') hair.poly([x - r * 1.02, y - r * 0.45, x + r * 1.02, y - r * 0.45, x + ox + r * 0.7, y - r * 0.2, x + ox - r * 0.2, y - r * 0.1, x - r * 0.98, y + r * 0.1]);
  if (style === 'cap') { hair.ell(x, y - r * 0.55, r * 1.08, r * 0.62); }
  stamp(p, hair, R, true);
  if (style === 'cap') stamp(p, new Part('H').ell(x + look * r * 0.95, y - r * 0.32, r * 0.9, r * 0.24).set({ fur: false, dim: 1 }), R, true); // 모자챙
  if (style === 'tails') for (const s of [-1, 1]) p.set(Math.round(x + s * r * 1.05), Math.round(y - r * 0.1), '#e85a7a'); // 머리끈
}
/** 매달린 아이: 두 손으로 곰의 팔뚝을 잡았다. (gx, gy) 는 손이 쥔 자리. kick 이면 무릎을 접어 올렸다. */
function hangingKid(p: Pix, K: Kid, gx: number, gy: number, lean: number, kick: boolean, style: 'bowl' | 'tails'): void {
  const R = kidRamps(K), hx = gx + lean * 2, hy = gy + 12, sx = gx + lean * 3, sy = gy + 18;
  inSpace({ w: p.w, h: p.h, k: 1 }, () => {
    // 다리
    if (kick) {
      stamp(p, new Part('L').path([sx - 2, sy + 15, sx - 3 + lean * 5, sy + 20, sx - 2 + lean * 4, sy + 28], 2.6, 2.3).set({ fur: false, dim: 1 }), R, true);
      stamp(p, new Part('L').path([sx + 2, sy + 15, sx + 7 * lean + 2, sy + 18, sx + 9 * lean + 2, sy + 24], 2.6, 2.3).set({ fur: false }), R, true);
      stamp(p, new Part('B').ell(sx - 2 + lean * 4, sy + 30, 3.2, 1.9).set({ fur: false, dim: 1 }), R, true);
      stamp(p, new Part('B').ell(sx + 9 * lean + 3, sy + 26, 3, 2).set({ fur: false }), R, true);
    } else {
      stamp(p, new Part('F').path([sx - 2, sy + 14, sx - 2.5, sy + 26, sx - 1.5, sy + 33], 2.2, 1.8).set({ fur: false, dim: 1 }), R, true);
      stamp(p, new Part('F').path([sx + 2, sy + 14, sx + 3, sy + 24, sx + 1.5, sy + 32], 2.2, 1.8).set({ fur: false }), R, true);
      stamp(p, new Part('B').ell(sx - 1.8, sy + 35, 3, 1.8).set({ fur: false, dim: 1 }), R, true);
      stamp(p, new Part('B').ell(sx + 1.8, sy + 34, 3, 1.8).set({ fur: false }), R, true);
    }
    // 몸통 (원피스면 치마가 퍼졌다)
    if (style === 'tails') stamp(p, new Part('S').poly([sx - 5, sy - 1, sx + 5, sy - 1, sx + 8, sy + 17, sx - 8, sy + 17]).light(sx - 3, sy + 2, 8, 10).set({ fur: false }), R, true);
    else {
      stamp(p, new Part('L').poly([sx - 5.4, sy + 10, sx + 5.4, sy + 10, sx + 6, sy + 17, sx - 6, sy + 17]).set({ fur: false }), R, true);
      stamp(p, new Part('S').poly([sx - 5.2, sy - 1, sx + 5.2, sy - 1, sx + 5.6, sy + 12, sx - 5.6, sy + 12]).light(sx - 3, sy + 1, 8, 10).set({ fur: false }), R, true);
    }
    // 팔: 어깨에서 위로, 손이 곰 팔을 쥔다
    for (const s of [-1, 1]) {
      stamp(p, new Part('F').path([sx + s * 4.4, sy + 1, gx + s * 3.6, gy + 4], 1.7, 1.5).set({ fur: false, dim: s > 0 ? 1 : 0 }), R, true);
      stamp(p, new Part('S').path([sx + s * 4.4, sy + 1, sx + s * 4.6 + (gx - sx) * 0.3, sy - 3], 2.3, 2.1).set({ fur: false }), R, true); // 소매
    }
    kidHead(p, R, hx, hy, 5.6, lean, style);
  });
}
function grip(p: Pix, K: Kid, gx: number, gy: number): void { // 곰 팔 위로 올라온 손가락
  const R = kidRamps(K);
  inSpace({ w: p.w, h: p.h, k: 1 }, () => { for (const s of [-1, 1]) stamp(p, new Part('F').ell(gx + s * 3.6, gy + 0.4, 2.2, 1.9).set({ fur: false }), R, true); });
}

export function bearPhoto(): Pix {
  const W = 240, H = 135, p = new Pix(W, H);
  const FLOOR = 96;
  // ── 강당: 크림색 벽, 민트색 징두리 판, 블라인드 친 창, 아이들 그림, 풍선 다발, 삼각 깃발 ──
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#ece4cf', '#dcd2b8', y / FLOOR * 0.7 + (rnd(x >> 1, y >> 1, 6) - 0.5) * 0.05));
  p.rect(0, 70, W, FLOOR - 70, '#a8c4b2'); p.hl(0, 69, W, '#f4f0e2'); p.hl(0, 70, W, '#8aa898'); p.hl(0, 71, W, '#c0d6c6');
  for (let x = 0; x < W; x += 20) p.vl(x, 72, FLOOR - 72, '#94b2a2'); // 판의 이음매
  // 창: 블라인드 사이로 낮빛
  p.rect(6, 8, 44, 52, '#c4bba4'); p.rect(8, 10, 40, 48, '#f6f8f2');
  for (let y = 10; y < 58; y += 3) { p.hl(8, y, 40, '#d6dcd8'); p.hl(8, y + 1, 40, '#e8ece6'); }
  p.vl(28, 10, 48, '#c4bba4'); p.hl(6, 60, 44, '#b0a68e');
  // 아이들이 그린 그림, 마스킹 테이프로 붙였다
  const DR = [['#e86a5a', '#4a90d0'], ['#f2c040', '#58b060'], ['#d070b0', '#f09040'], ['#5aa0e0', '#e86a5a']];
  DR.forEach(([a, b2], i) => {
    const x0 = 160 + i * 19, y0 = 30 + (i % 2) * 4;
    p.rect(x0, y0, 15, 12, '#fbfaf4'); p.hl(x0, y0 + 12, 15, '#c8c2b0');
    p.ell(x0 + 5, y0 + 5, 3, 3, a); p.line(x0 + 2, y0 + 10, x0 + 13, y0 + 9, b2); p.line(x0 + 9, y0 + 3, x0 + 12, y0 + 7, b2);
    p.rect(x0 + 6, y0 - 1, 3, 2, '#e8d48a', 0.9);
  });
  // 삼각 깃발 줄: 벽 위를 가로지른다
  const FLG = ['#e86a6a', '#f2c45a', '#6aa8e0', '#8ccf7a', '#e88ac0'];
  const sag = (x: number): number => 6 + Math.round(Math.sin((x - 54) / (W - 54) * Math.PI) * 9);
  for (let x = 54; x < W; x++) p.set(x, sag(x), '#8a8070');
  for (let i = 0; i < 11; i++) { const x = 58 + i * 17, y = sag(x + 3); for (let j = 0; j < 7; j++) p.hl(x + Math.floor(j / 2), y + 1 + j, 7 - j, FLG[i % 5]); p.set(x + 1, y + 2, '#ffffff', 0.5); }
  // 풍선 다발 둘
  const balloon = (bx: number, by: number, c: string, tx: number, ty: number): void => {
    p.line(bx, by + 7, tx, ty, '#9a9282');
    p.ell(bx, by, 5.4, 6.6, mix(c, '#000000', 0.18)); p.ell(bx - 0.6, by - 0.6, 4.6, 5.8, c);
    p.ell(bx - 2, by - 3, 1.4, 2, mix(c, '#ffffff', 0.6)); p.set(bx - 2, by - 3, '#ffffff'); p.set(bx, by + 7, mix(c, '#000000', 0.25));
  };
  for (const [bx, by, c] of [[62, 26, '#e86a6a'], [72, 22, '#f2c45a'], [67, 34, '#6aa8e0'], [77, 32, '#e88ac0']] as const) balloon(bx, by, c, 70, 62);
  for (const [bx, by, c] of [[214, 52, '#8ccf7a'], [224, 48, '#e86a6a'], [219, 60, '#f2c45a']] as const) balloon(bx, by, c, 222, 82);
  // 바닥: 강당의 나무 바닥. 플래시가 반사됐다.
  for (let y = FLOOR; y < H; y++) {
    const t = (y - FLOOR) / (H - FLOOR), pw = 3 + Math.floor(t * 6);
    for (let x = 0; x < W; x++) {
      const row = Math.floor((y - FLOOR) / pw);
      const seam = (y - FLOOR) % pw === 0;
      let c = mix('#cfa874', '#b88f5c', rnd(Math.floor((x + row * 37) / 30), row, 8) * 0.8);
      if (seam) c = mix(c, '#7a5a38', 0.55);
      if (rnd(x >> 2, y, 9) > 0.93) c = mix(c, '#a07a4a', 0.4);
      p.set(x, y, c);
    }
  }
  p.hl(0, FLOOR, W, '#7a6a52'); p.hl(0, FLOOR - 1, W, '#6a7a6e');
  // 오른쪽 끝: 흰 천을 덮은 접이식 탁자, 주스 팩
  p.rect(196, 80, 44, 4, '#f4f2ec'); p.rect(196, 84, 44, 9, '#e6e2d8'); p.hl(196, 92, 44, '#c8c2b4');
  for (let i = 0; i < 4; i++) { const x = 204 + i * 8; p.rect(x, 74, 4, 6, ['#f2c45a', '#e86a6a', '#8ccf7a', '#f2c45a'][i]); p.hl(x, 74, 4, '#ffffff'); p.set(x + 2, 72, '#f4f2ec'); p.set(x + 2, 73, '#f4f2ec'); }
  p.vl(200, 93, 8, '#8a8478'); p.vl(236, 93, 8, '#8a8478');

  // ── 인물: 따로 그린 다음 벽에 플래시 그림자를 드리운다 ──
  const fg = new Pix(W, H);
  const B = SUIT_R.bear;
  const kA: Kid = { shirt: '#f2cc48', pants: '#3e5c94', hair: '#2a211c', skin: '#e9bf9c', shoe: '#f0f0ea' };
  const kB: Kid = { shirt: '#ee8aa8', pants: '#ee8aa8', hair: '#3a2a20', skin: '#f0c8a8', shoe: '#e85a6a' };
  const kC: Kid = { shirt: '#5a9ad8', pants: '#3a3a4a', hair: '#241c18', skin: '#dcae8a', shoe: '#f0f0ea' };
  const kD: Kid = { shirt: '#5aa86a', pants: '#4a4a5a', hair: '#2c221c', skin: '#e4b896', shoe: '#e05a4a' };
  const cx = 120, headK = 2.5, hx = cx, hy = 40; // 곰 머리의 (C, 22) 가 놓일 자리
  const ear = (s: number): [number, number] => [hx + s * 7.4 * headK, hy + (10.2 - 22) * headK];
  // 등에 업힌 아이 (곰 머리 뒤): 오른쪽 어깨 너머로 머리와 한 팔이 보인다
  const RC = kidRamps(kC);
  inSpace({ w: W, h: H, k: 1 }, () => {
    stamp(fg, new Part('S').poly([cx + 20, 42, cx + 38, 38, cx + 42, 56, cx + 22, 58]).light(cx + 28, 40, 10, 8).set({ fur: false, dim: 1 }), RC, true);
    kidHead(fg, RC, cx + 33, 31, 6, -0.7, 'short');
  });
  inSpace({ w: W, h: H, k: 1 }, () => {
    // 다리: 버티느라 벌렸다. 무릎이 조금 굽었다.
    stamp(fg, new Part('A').path([cx - 12, 92, cx - 19, 108, cx - 24, 122], 10, 9).light(cx - 22, 96, 10, 22).set({ dim: 1 }), B, true);
    stamp(fg, new Part('A').path([cx + 12, 92, cx + 19, 108, cx + 24, 122], 10, 9).light(cx + 14, 96, 10, 22), B, true);
    for (const s of [-1, 1]) stamp(fg, new Part((X, Y) => (inE(X, Y, cx + s * 28, 126.4, 6.4, 2.6) ? 'W' : 'A')).ell(cx + s * 27, 125.4, 11.5, 5.6).set({ dim: s < 0 ? 1 : 0 }), B, true);
    // 몸: 크고 둥글다. 배는 밝은 털. 힘을 주느라 조금 앞으로 숙였다.
    stamp(fg, new Part((X, Y) => (inE(X, Y, cx, 82, 14, 16) ? 'W' : 'A')).ell(cx, 78, 25, 26).ell(cx, 58, 23, 11).light(cx - 10, 62, 28, 28), B, true);
    // 팔: 어깨에서 비스듬히 내려와 팔꿈치를 굽혔다. 아이가 팔뚝에 매달렸다.
    stamp(fg, new Part('A').path([cx - 20, 56, cx - 38, 62, cx - 52, 58], 8.6, 7.4).light(cx - 40, 54, 16, 8), B, true);
    stamp(fg, new Part('A').path([cx + 20, 56, cx + 38, 62, cx + 52, 58], 8.6, 7.4).light(cx + 34, 54, 16, 8).set({ dim: 1 }), B, true);
    for (const s of [-1, 1]) { // 앞발: 손바닥 패드
      stamp(fg, new Part((X, Y) => (inE(X, Y, cx + s * 60, 57, 3, 3.4) ? 'K' : 'A')).ell(cx + s * 59, 56, 7.4, 7).light(cx + s * 59 - 2, 53, 6, 6).set({ dim: s > 0 ? 1 : 0 }), B, true);
    }
  });
  furPass(fg, B, ['A', 'W'], cx, 74); // 퍼슈트 털결: 몸 가운데에서 팔다리 끝으로 뻗는다
  // 매달린 두 아이 (손은 곰 팔 위에 다시 얹는다)
  const gL: [number, number] = [cx - 40, 58], gR: [number, number] = [cx + 41, 59];
  hangingKid(fg, kA, gL[0], gL[1], -0.4, true, 'bowl');
  hangingKid(fg, kB, gR[0], gR[1], 0.3, false, 'tails');
  // 머리: 단체 사진의 그 곰
  {
    const q = new Pix(Math.ceil(40 * headK), Math.ceil(34 * headK));
    const sp = space(q.w, q.h, headK, q.w / 2, 22 * headK, C, 22);
    suiter(q, sp, sp, 'bear', null, false);
    fg.blit(q, Math.round(hx - q.w / 2), Math.round(hy - 22 * headK));
  }
  grip(fg, kA, gL[0], gL[1] - 3); grip(fg, kB, gR[0], gR[1] - 3);
  // 업힌 아이의 손: 곰의 오른쪽 귀를 잡았다. 다른 손은 곰의 어깨.
  {
    const [ex, ey] = ear(1);
    inSpace({ w: W, h: H, k: 1 }, () => {
      stamp(fg, new Part('S').path([cx + 27, 40, cx + 27, 24, ex + 5, ey + 4], 2.2, 2).set({ fur: false }), RC, true); // 팔을 들어 귀로
      stamp(fg, new Part('F').ell(ex + 3, ey + 2, 2.6, 2.2).set({ fur: false }), RC, true);
      stamp(fg, new Part('F').ell(cx + 18, 50, 2.4, 2).set({ fur: false }), RC, true); // 다른 손은 곰의 어깨
    });
  }
  // 오른 다리를 끌어안고 발등에 앉은 아이 (옆모습, 볼을 곰 다리에 붙였다)
  {
    const RD = kidRamps(kD), x = cx + 34, y = 102;
    inSpace({ w: W, h: H, k: 1 }, () => {
      stamp(fg, new Part('L').path([x + 2, y + 16, x + 10, y + 19, x + 12, y + 25], 2.8, 2.5).set({ fur: false }), RD, true); // 접은 다리
      stamp(fg, new Part('B').ell(x + 13, y + 26, 3.4, 2).set({ fur: false }), RD, true);
      stamp(fg, new Part('S').poly([x - 4, y + 2, x + 6, y + 2, x + 8, y + 18, x - 3, y + 18]).light(x + 2, y + 4, 8, 10).set({ fur: false }), RD, true);
      stamp(fg, new Part('S').ell(x + 1, y + 1, 5.5, 3.4).set({ fur: false, dim: 1 }), RD, true); // 후드
      kidHead(fg, RD, x - 1, y - 3, 5.4, -1, 'cap');
      stamp(fg, new Part('S').path([x + 2, y + 6, x - 6, y + 10, x - 9, y + 8], 2, 1.8).set({ fur: false }), RD, true); // 다리를 감은 팔
      stamp(fg, new Part('F').ell(x - 9, y + 8, 2, 1.8).set({ fur: false }), RD, true);
    });
  }
  // 플래시 그림자: 벽에, 인물 오른쪽 위로 비켜서 연하게
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) if (fg.alpha(x - 5, y - 3)) p.set(x, y, '#5a5040', 0.22);
  // 바닥 그림자
  p.ell(cx, 127, 50, 5, '#3a2a18', 0.3); p.ell(cx - 44, 108, 9, 2.4, '#3a2a18', 0.18); p.ell(cx + 46, 108, 9, 2.4, '#3a2a18', 0.18);
  p.blit(fg, 0, 0);
  // 플래시: 가운데가 밝고 가장자리가 떨어진다. 살짝 따뜻하다.
  shade(p, (x, y) => { const d = Math.hypot((x - 118) / 150, (y - 70) / 100); const v = lerp(1.1, 0.72, d); return [v * 1.02, v, v * 0.95]; });
  return p;
}

/** 오른쪽을 보는 옆얼굴. 이마, 콧등, 입술, 턱으로 이어지는 옆선만 있고 이목구비는 없다.
 *  젖은 머리카락이 이마와 목덜미에 들러붙었다. 가로등 빛이 왼쪽 뒤에서 와서 뒤통수와 목덜미가 밝고, 얼굴 앞선에는 가는 테만 남는다. */
function profileHead(p: Pix, R: Ramps): void {
  // 얼굴 앞선: y 마다 가장 앞으로 나온 x
  const FR: [number, number][] = [[24, 128], [30, 136], [36, 139], [42, 140], [46, 141], [49, 143], [53, 147], [56, 147], [58, 142], [61, 143], [63, 142.5], [65, 140.5], [67, 141], [70, 141], [73, 137], [75, 130]];
  const front = (y: number): number => {
    if (y < FR[0][0] || y > FR[FR.length - 1][0]) return -1;
    for (let i = 1; i < FR.length; i++) if (y <= FR[i][0]) { const [y0, x0] = FR[i - 1], [y1, x1] = FR[i]; return x0 + (x1 - x0) * (y - y0) / (y1 - y0); }
    return -1;
  };
  const jaw = (x: number): number => 74 - (130 - x) * 0.42; // 턱 밑선: 턱 끝에서 귀 밑으로 올라간다
  const skull = (x: number, y: number): boolean => inE(x, y, 118, 44, 21, 24);
  const faceIn = (x: number, y: number): boolean => (skull(x, y) && y < jaw(x)) || (x >= 112 && x <= front(y) && y < jaw(x) && y > 24);
  const neckIn = (x: number, y: number): boolean => y > 56 && y < 96 && x > 106 + (y - 60) * 0.05 && x < 131 - Math.max(0, 76 - y) * 0.15 + (y > 80 ? (y - 80) * 0.1 : 0);
  const hairIn = (x: number, y: number): boolean => {
    if (!inE(x, y, 117, 41, 23.5, 25)) return false;
    if (y < 28 - (x - 120) * 0.1) return true; // 정수리
    if (x < 112 - (y - 40) * 0.2 && y < 66) return true; // 뒤통수와 목덜미
    // 이마에 들러붙은 다발: 끝이 뾰족하다
    const c = Math.floor((x - 112) / 5), t = (x - 112) / 5 - c;
    const tip = 33 + (1 - Math.abs(2 * t - 1)) * (6 + rnd(c, 3, 7) * 7);
    return x >= 112 && x < front(y) + 1 && y < tip;
  };
  const W = p.w, H = p.h, id = new Uint8Array(W * H), col: string[] = new Array(W * H);
  const LT = [-0.7, -0.35, 0.55];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, c = '';
    const nx = (x - 120) / 26, ny = (y - 48) / 30, nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    const lam = nx * LT[0] + ny * LT[1] + nz * LT[2];
    if (neckIn(x, y)) { r = 1; c = R.F[y < jaw(x) + 6 ? 3 : tone4(0.5 + lam * 0.3 - (x - 110) * 0.012)]; }
    if (faceIn(x, y)) { r = 2; c = R.F[tone4(0.5 + lam * 0.4 - Math.max(0, x - front(y) + 4) * 0.08)]; }
    if (inE(x, y, 111, 52, 3.4, 5.6) && !hairIn(x, y)) { r = 3; c = R.F[inE(x, y, 111.5, 52.5, 1.5, 3) ? 3 : tone4(0.62 + lam * 0.2)]; } // 귀
    if (hairIn(x, y)) {
      r = 4;
      const sn = rnd(Math.floor(x * 0.7 + y * 0.25), 5, 9);
      let b = 0.42 + lam * 0.5 + (sn - 0.5) * 0.3;
      if (Math.abs(y - (26 + (x - 112) * 0.18)) < 1.2 && sn > 0.3 && x < 128) b = 0.95; // 젖은 머리의 반짝임
      c = R.H[tone4(b)];
    }
    id[y * W + x] = r; if (r) col[y * W + x] = c;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = id[i]; if (!r) continue;
    let e = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = id[(y + dy) * W + x + dx] ?? 0; if (!q) e = 2; else if (q > r && !(r === 1 && q === 2)) e = Math.max(e, 1); }
    let c = col[i];
    if (e === 2 && r !== 4 && x > 120) c = mix(c, '#d8a07a', 0.6); // 앞선의 가는 빛 테
    else if (e) c = mix(c, '#140f14', e === 2 ? 0.6 : 0.4);
    p.set(x, y, c);
  }
}
const tone4 = (b: number): number => (b > 0.78 ? 0 : b > 0.5 ? 1 : b > 0.26 ? 2 : 3);

// ── 영상 2: 분리수거장 뒤. 고양이가 머리를 벗는다. 2초. ──
export function videoFace(droopy = false): Pix {
  const W = 240, H = 135, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { // 블록 담
    const row = Math.floor(y / 9), mortar = y % 9 === 0 || (x + (row % 2) * 12) % 24 === 0;
    p.set(x, y, mortar ? '#4a4a48' : mix('#6e6c66', '#5e5c57', rnd(Math.floor((x + (row % 2) * 12) / 24), row, 3)));
  }
  p.rect(0, 112, W, H - 112, '#3a3834');
  shade(p, (x) => { const v = lerp(0.95, 0.22, x / 200); return [v, v * 0.8, v * 0.6]; }); // 담: 오른쪽으로 갈수록 그늘
  // 가까이 당겼다: 오른쪽을 보는 옆얼굴. 목 아래는 탈의 몸통(가까운 쪽이 검정), 목털, 그리고 겨드랑이에 낀 고양이 머리.
  const PF: Ramps = { F: ['#e6c4b0', '#c49c88', '#987868', '#64504a'], H: ['#2a2a30', '#1a1a1f', '#121216', '#09090c'] };
  profileHead(p, PF);
  inSpace({ w: W, h: H, k: 1 }, () => {
    stamp(p, new Part((X, Y) => stripe(X > 150 ? 'W' : 'K', X / 2.2, Y / 2.2, 0.4)).poly([58, 135, 66, 104, 92, 90, 150, 88, 178, 98, 192, 135]).light(110, 96, 50, 30), CAT_R, true);
    stamp(p, new Part('W').poly([96, 92, 104, 84, 124, 82, 146, 84, 158, 92, 150, 98, 140, 94, 130, 100, 118, 95, 106, 100]).light(120, 86, 22, 8).set({ cap: 2 }), CAT_R, true); // 목털
  });
  // 겨드랑이에 낀 고양이 머리: 옆으로 누워 렌즈를 본다. 몸이 빠진 탈은 눈만 그대로다.
  const hb = new Pix(W, H), hk = 2.2, th = 0.42;
  kemonoHead(hb, (x, y) => { const dx = (x - 188) / hk, dy = (y - 112) / hk; return [dx * Math.cos(th) + dy * Math.sin(th), -dx * Math.sin(th) + dy * Math.cos(th)]; }, hk, catSpec(CAT_R), { droopy });
  p.blit(hb, 0, 0);
  // 빛: 가로등이 담에 반쯤 가려 왼쪽에서만 든다
  shade(p, (x, y) => { const v = lerp(1.35, 0.55, Math.hypot((x - 135) / 90, (y - 50) / 90)); return [v, v * 0.8, v * 0.58]; });
  return grain(p, 2);
}
/** 줌으로 뭉개고 잡음과 주사선을 넣는다. 영상 컷 공통. */
function grain(p: Pix, n = 3): Pix {
  const W = p.w, H = p.h, q = new Pix(W, H);
  for (let y = 0; y < H; y += n) for (let x = 0; x < W; x += n) {
    let r = 0, g = 0, b = 0, c = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { if (x + i >= W || y + j >= H) continue; const ii = ((y + j) * W + x + i) * 4; r += p.d[ii]; g += p.d[ii + 1]; b += p.d[ii + 2]; c++; }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const xx = x + i, yy = y + j; if (xx >= W || yy >= H) continue;
      const o = (yy * W + xx) * 4, z = (rnd(xx, yy, 41) - 0.5) * 26, s = yy % 2 ? 0.9 : 1;
      q.d[o] = (r / c + z) * s; q.d[o + 1] = (g / c + z) * s; q.d[o + 2] = (b / c + z + 6) * s; q.d[o + 3] = 255;
    }
  }
  q.ell(12, 11, 3, 3, '#d8382c');
  return q;
}

// ── 편의점: 새벽 세 시, 형광등. 계산대 앞의 고양이와 휴대폰을 보는 알바. ──
const storeCache = new Map<string, Pix>();
export function storeScene(cat: boolean, droopy: boolean): Pix {
  const key = `${cat}${droopy}`; let hit = storeCache.get(key);
  if (!hit) { hit = storeScene0(cat, droopy); storeCache.set(key, hit); }
  return hit;
}
function storeScene0(cat: boolean, droopy: boolean): Pix {
  const W = MIRROR_W, H = MIRROR_H, p = new Pix(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#dfe6e2', '#c9d2cf', y / H + (rnd(x, y, 7) - 0.5) * 0.04));
  // 천장의 형광등
  p.rect(0, 0, W, 6, '#b9c2c0');
  for (const x of [20, 100, 180]) { p.rect(x, 2, 48, 3, '#ffffff'); p.hl(x, 5, 48, '#e6f0ee'); }
  // 가운데: 유리문 너머의 밤
  p.rect(84, 16, 72, 84, '#8a9592'); p.rect(86, 18, 68, 80, '#0e1620');
  for (let y = 18; y < 98; y++) for (let x = 86; x < 154; x++) if (rnd(x, y, 12) > 0.997) p.set(x, y, '#e0a050'); // 먼 창의 불빛
  p.ell(108, 40, 10, 10, '#2a2a22'); p.ell(108, 40, 4, 4, '#a07a3c'); // 길 건너 가로등
  p.vl(120, 18, 80, '#8a9592'); p.rect(114, 54, 4, 12, '#c8d0ce'); p.rect(122, 54, 4, 12, '#c8d0ce');
  for (let i = 0; i < 40; i++) p.set(90 + i, 80 - i, '#ffffff', 0.08); // 유리에 비친 형광등
  // 왼쪽: 과자 선반
  const SN = ['#e05a4a', '#f0b440', '#4a8ad0', '#60b060', '#d070a0', '#f08a3a'];
  for (let r = 0; r < 5; r++) {
    p.rect(0, 20 + r * 17, 78, 2, '#8a9294');
    for (let i = 0; i < 12; i++) { const c = SN[(i * 7 + r * 3) % 6], h = 9 + ((i + r) % 3) * 2; p.rect(2 + i * 6, 20 + r * 17 - h, 5, h, c); p.hl(2 + i * 6, 20 + r * 17 - h, 5, mix(c, '#ffffff', 0.4)); }
  }
  // 오른쪽: 음료 냉장고. 안이 더 밝다.
  p.rect(162, 14, 78, 92, '#7d8a8c');
  for (let d = 0; d < 3; d++) {
    const x0 = 165 + d * 25; p.rect(x0, 17, 23, 86, '#eef6f6');
    for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) {
      const c = ['#f2d24a', '#e8eef0', '#6ab0e0', '#e06060', '#8acb6a'][(i + r + d) % 5];
      p.rect(x0 + 2 + i * 5, 22 + r * 16, 4, 11, c); p.set(x0 + 2 + i * 5, 22 + r * 16, '#ffffff');
    }
    p.vl(x0 + 22, 17, 86, '#9aa6a8');
  }
  // 알바: 계산대 뒤, 고개를 숙이고 휴대폰을 본다. 조끼.
  const AL: Ramps = { S: ['#5aa878', '#3f8a5e', '#2f6e4a', '#1f4e34'], F: SKIN.tan, H: HAIR.dark };
  const fig = new Pix(W, H);
  yunjae(fig, 196, 34, AL, true, { style: 'short', top: 'vest', trim: ['#f2efe8', '#d6d0c6', '#aea69a', '#7e766a'], down: 0.8, seed: 11 });
  p.blit(fig, 0, 0);
  p.rect(176, 92, 8, 5, '#20262a'); p.rect(177, 93, 6, 3, '#bfe0ff'); // 휴대폰의 빛
  // 손님: 삼색 고양이. 계산대 너머로 상반신만.
  if (cat) {
    const b = catBust({ k: 2.2, droopy, tilt: 0.05 });
    p.blit(b, 96 - Math.round(b.w / 2), 26);
  }
  // 계산대
  p.rect(0, 104, W, 6, '#f2f4f2'); p.hl(0, 104, W, '#ffffff'); p.rect(0, 110, W, H - 110, '#8c6e56');
  for (let x = 0; x < W; x += 20) p.vl(x, 110, H - 110, '#7a5e48');
  p.rect(140, 88, 26, 16, '#2a3034'); p.rect(142, 90, 22, 9, '#4a7a9a'); p.rect(150, 100, 6, 4, '#2a3034'); // 포스기
  for (const x of [118, 126]) { p.rect(x, 92, 6, 12, '#f6dc5a'); p.rect(x + 1, 89, 4, 3, '#f0f0e8'); p.vl(x + 1, 94, 7, '#fff3a8'); } // 바나나우유 두 개
  if (cat) { // 젤리 손이 지폐 한 장을 쥐고 있다
    p.rect(82, 99, 16, 6, '#c8d8a8'); p.hl(82, 99, 16, '#e0ecc4');
    for (const x of [80, 100]) { p.ell(x, 102, 5, 3.5, '#f4eadf'); p.ell(x, 103, 2, 1.2, '#f7a3b8'); }
  }
  return p;
}

// ── 소나기: 미끄럼틀 밑. 아이가 내 팔에 머리를 기대고 잠들었다. ──
/** 쪼그려 앉아 잠든 하은. (ax, ay) 는 정수리, k 배. 얼굴은 내 팔 쪽으로 돌아가 머리카락만 보인다. */
function haeunAsleep(p: Pix, ax: number, ay: number, k: number): void {
  const HR: Ramps = {
    H: ['#4a3d49', '#2c232e', '#1f1822', '#141016'],
    T: ['#fff1b6', '#f2da90', '#d5b66d', '#a88a4c'],
    L: ['#b6d3ee', '#90b5d8', '#6d90bb', '#4e6b94'],
    F: ['#ffc6d3', '#f396ae', '#d06b88', '#a04c66'],
    S: ['#e8cdbb', '#d4b29c', '#b48f7c', '#8a6a5c'],
  };
  inSpace({ w: p.w, h: p.h, k, tf: (x, y) => [(x - ax) / k, (y - ay) / k] }, () => {
    stamp(p, new Part('L').ell(3, 24, 9, 6).light(1, 21, 8, 5), HR, true);           // 무릎을 세운 다리 (프레임 밖으로 잘린다)
    stamp(p, new Part('T').poly([-7, 9, 5, 8, 9, 21, -8, 22]).light(-3, 11, 7, 8), HR, true); // 반팔 잠옷
    stamp(p, new Part('S').path([5, 11, 7, 17, 3, 21], 1.7, 1.5), HR, true);          // 무릎을 안은 팔
    stamp(p, new Part('S').ell(1.5, 8.6, 2.2, 1.6), HR, true);                        // 목덜미
    stamp(p, new Part('H').ell(-1, 3, 6.4, 6.1).poly([-7.2, 3, -6.8, 9.4, -3, 8.6, 0, 9.6, 3.6, 8.8, 5.6, 4]).light(-3, -1, 6, 6), HR, true); // 단발: 고개가 내 쪽으로 기울어 얼굴이 가려졌다
  });
  // 젖은 머리칼: 가로등이 오른쪽 가장자리를 주황으로 훑고, 정수리에 물기가 하얗게 맺힌다.
  const sx = (u: number): number => Math.round(ax + u * k), sy = (v: number): number => Math.round(ay + v * k);
  for (let v = -2.6; v < 9; v += 1 / k) {
    const half = v < 3 ? 6.4 * Math.sqrt(Math.max(0, 1 - ((v - 3) / 6.1) ** 2)) : 5.6 - (v - 3) * 0.3;
    const x = sx(-1 + half) - 1, y = sy(v);
    p.set(x, y, '#e0954a', 0.75); p.set(x - 1, y, '#a0643a', 0.5);
  }
  for (const [u, v, n] of [[-4, -1.2, 5], [-2.6, -2.2, 4], [0.6, -2.6, 3]] as const) p.hl(sx(u), sy(v), n, '#8a7e92', 0.8);
  for (const [u, v] of [[-3, 0.6], [1.8, -1.4], [-5, 4]] as const) p.set(sx(u), sy(v), '#e8eef4');
}
const slideCache = new Map<string, Pix>();
export function slideScene(droopy: boolean): Pix {
  let hit = slideCache.get(String(droopy));
  if (!hit) { hit = slideScene0(droopy); slideCache.set(String(droopy), hit); }
  return hit;
}
function slideScene0(droopy: boolean): Pix {
  const W = MIRROR_W, H = MIRROR_H, p = new Pix(W, H);
  // 밖: 비 내리는 밤. 멀리 가로등 하나.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#141c26', '#0c1016', y / H + (rnd(x, y, 9) - 0.5) * 0.06));
  for (let y = 0; y < 100; y++) for (let x = 0; x < W; x++) { const d = Math.hypot((x - 196) / 60, (y - 36) / 40); if (d < 1) p.set(x, y, '#e0954a', (1 - d) * 0.35); }
  p.rect(195, 30, 3, 90, '#0a0c0e');
  // 젖은 모래와 웅덩이
  for (let y = 108; y < H; y++) for (let x = 0; x < W; x++) p.set(x, y, mix('#3a3428', '#2a251d', rnd(x, y, 4) * 0.7));
  for (const [x, y, rx] of [[60, 132, 26], [170, 140, 34], [200, 120, 14]]) {
    p.ell(x, y, rx, rx * 0.18, '#1c2430');
    p.hl(x - rx * 0.4, y - 1, rx * 0.5, '#d68a46', 0.5); // 웅덩이에 비친 가로등
  }
  // 미끄럼틀의 철판: 왼쪽 위에서 오른쪽으로 내려온다. 그 밑이 우리 자리.
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(4 + x * 0.22);
    for (let y = y0; y < y0 + 10; y++) p.set(x, y, y < y0 + 2 ? '#c4553e' : y < y0 + 7 ? '#8e3a2c' : '#5a241c');
    if (x % 9 === 0) for (let k = 0; k < 4; k++) p.set(x, y0 + 10 + k * 3, '#9fb4c8', 0.7 - k * 0.15); // 가장자리에서 떨어지는 물방울
  }
  p.rect(8, 6, 6, 112, '#3a3e44'); p.vl(8, 6, 112, '#5a6068'); // 사다리 기둥
  for (let y = 20; y < 110; y += 14) p.rect(14, y, 24, 3, '#3a3e44');
  // 우리 둘: 고양이는 쪼그려 앉아 있고, 아이가 팔에 기대 잠들었다
  const b = catBust({ k: 2.1, droopy, tilt: 0.12 });
  p.blit(b, 104 - Math.round(b.w / 2), 40);
  haeunAsleep(p, 148, 92, 2.8);
  // 밑의 그늘: 철판 밑은 빛이 덜 든다
  shade(p, (x, y) => { const v = lerp(1.0, 0.55, Math.abs(x - 118) / 140 + (y < 40 ? 0.3 : 0)); return [v * 0.86, v * 0.9, v * 1.04]; });
  return p;
}
