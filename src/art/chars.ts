// 사람과 고양이. 부위마다 모양을 잡고(타원, 다각형, 굵기가 변하는 선), 위에서 오는 빛으로 네 단계 톤을 고르고,
// 부위 둘레에 테두리를 두른다. 다른 부위 위에 걸치는 테두리는 밑색을 어둡게 한 색이라서 선이 무겁지 않다.
// 한 장은 44×56, 발바닥이 y=54, 몸의 가운데가 x=22.
// 규칙(기획서 11장): 사람에게는 이목구비가 없다. 얼굴이 있는 건 고양이뿐이다.
import { Pix, mix, rnd, sprite, type Pal } from './pix.ts';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Look = {
  kind: 'yunjae' | 'cat' | 'cat_nohead' | 'yunjae_cathead' | 'haeun' | 'father' | 'guard' | 'catreal' | 'person' | 'police'
    | 'hyunwoo' | 'moka' | 'gombyo' | 'silbap' | Species | 'fox_nohead' | 'mother'
    | 'grandma' | 'nabi' | 'kid' | 'yunseo' | 'clerk';
  v?: number; // 지나가는 사람(person)의 차림 번호: 같은 사람이 여럿 서 있지 않게
  droopy?: boolean; eyes?: boolean;
  bare?: boolean; // 엔딩 A: 맨얼굴의 윤재에게 처음으로 눈과 입이 생긴다
  bag?: boolean; // 윤재가 등에 멘 국방색 의류대. 안에 삼색이가 들었다.
  case?: boolean; // 현우가 끄는 남색 캐리어. 안에 여우가 접혀 있다.
  parts?: number; // 탈을 입는 중: 1 몸통만(운동화, 맨손), 2 발과 꼬리까지(맨손), 3 손까지
  hold?: boolean; // 맨몸의 윤재가 삼색이의 머리를 배 앞에 안았다 (3장 끝, 바닥에 앉아서)
  mark?: '' | 'torn' | 'sewn'; // 삼색이 머리: 3장에서 귀가 뜯기고 주둥이 옆이 벌어진다. 4장에서 주황 실로 꿰맨다.
};
let curMark: '' | 'torn' | 'sewn' = ''; // catHeadOps 가 부를 때의 머리 상태
export const FW = 44, FH = 56, FOOT = 54, CX = 22;

export type Ramp = readonly [string, string, string, string]; // 밝은 쪽, 바탕, 그늘, 깊은 그늘
export type Ramps = Record<string, Ramp>;
export const LINE = '#1d1420';

// ── 도형 ──
const inEll = (X: number, Y: number, cx: number, cy: number, rx: number, ry: number): boolean => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1;
function inPoly(pts: number[], X: number, Y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** 좌우로 뒤집은 좌표 (axis 를 축으로) */
const mx = (pts: number[], axis: number): number[] => pts.map((v, i) => (i % 2 ? v : 2 * axis - v));

type ColorFn = (X: number, Y: number) => string;
/** 부위를 찍을 판. 보통은 44×56 한 장이지만, 거울이나 사진처럼 크게 그릴 때는 판을 키우고
 *  tf 로 판의 점(가운데)을 도형 좌표로 옮긴다. 도형은 그대로 두고 확대·기울이기만 한다. */
export type Space = { w: number; h: number; k: number; tf?: (x: number, y: number) => [number, number] };
let SPACE: Space = { w: FW, h: FH, k: 1 };
export function inSpace<T>(s: Space, fn: () => T): T { const o = SPACE; SPACE = s; try { return fn(); } finally { SPACE = o; } }
export class Part {
  w = SPACE.w; h = SPACE.h; k = SPACE.k; tf = SPACE.tf;
  m = new Uint8Array(this.w * this.h);
  color: ColorFn;
  dim = 0;      // 먼 쪽 팔다리는 한 톤 어둡게
  soft = 0.55;  // 다른 부위 위에 걸치는 테두리의 진하기
  fur = true;   // 털: 톤 경계가 살짝 흐트러진다
  cap = 3;      // 가장 깊은 그늘을 몇 번째 톤까지 쓰나 (얼굴의 흰 털은 2: 턱 밑이 회색 수염처럼 보이지 않게)
  lit: [number, number, number, number] | null = null;
  constructor(color: ColorFn | string) { this.color = typeof color === 'string' ? () => color : color; }
  has(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  /** 판의 점 (x,y) 의 가운데가 도형 좌표로 어디인가 */
  at(x: number, y: number): [number, number] { return this.tf ? this.tf(x + 0.5, y + 0.5) : [x + 0.5, y + 0.5]; }
  private each(test: (X: number, Y: number) => boolean, on: boolean): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const [X, Y] = this.at(x, y); if (test(X, Y)) this.m[y * this.w + x] = on ? 1 : 0; }
    return this;
  }
  ell(cx: number, cy: number, rx: number, ry: number, on = true): this { return this.each((X, Y) => inEll(X, Y, cx, cy, rx, ry), on); }
  poly(pts: number[], on = true): this { return this.each((X, Y) => inPoly(pts, X, Y), on); }
  /** 꺾은선을 따라가는 굵은 선. 굵기는 r0 에서 r1 로 변한다. 팔, 다리, 꼬리. */
  path(pts: number[], r0: number, r1: number, on = true): this {
    const seg: number[][] = [];
    let total = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
      seg.push([pts[i], pts[i + 1], pts[i + 2], pts[i + 3], total, l]);
      total += l;
    }
    return this.each((X, Y) => {
      for (const [x0, y0, x1, y1, s0, l] of seg) {
        const dx = x1 - x0, dy = y1 - y0;
        const t = l ? Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / (l * l))) : 0;
        const r = r0 + (r1 - r0) * ((s0 + t * l) / (total || 1));
        if (Math.hypot(X - x0 - dx * t, Y - y0 - dy * t) <= r) return true;
      }
      return false;
    }, on);
  }
  light(cx: number, cy: number, rx: number, ry: number): this { this.lit = [cx, cy, rx, ry]; return this; }
  set(k: Partial<Pick<Part, 'dim' | 'soft' | 'fur' | 'cap'>>): this { Object.assign(this, k); return this; }
}

function hexAt(p: Pix, x: number, y: number): string {
  const i = (y * p.w + x) * 4;
  return '#' + [0, 1, 2].map((k) => p.d[i + k].toString(16).padStart(2, '0')).join('');
}
/** 부위 하나를 찍는다: 테두리 먼저, 그 안을 빛에 따라 칠한다.
 *  삼색이(sel)의 바깥 테두리는 검은 선이 아니라 맞닿은 털의 가장 깊은 그늘을 선 쪽으로 당긴 색이다.
 *  빛이 오는 왼쪽 위는 옅고, 오른쪽 아래는 진하다. 그래서 털 뭉치가 선에 갇히지 않고 둥글게 떠 보인다. */
export function stamp(dest: Pix, pt: Part, R: Ramps, sel = false): void {
  const PW = pt.w, PH = pt.h;
  let x0 = PW, y0 = PH, x1 = -1, y1 = -1;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (pt.m[y * PW + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return;
  // 빛의 자리는 도형 좌표로 잰다. 따로 정하지 않았으면 부위의 상자 가운데.
  const [bx, by] = pt.at((x0 + x1) / 2, (y0 + y1) / 2);
  const [lx, ly, lrx, lry] = pt.lit || [bx, by, Math.max(1.5, (x1 - x0 + 1) / 2 / pt.k), Math.max(1.5, (y1 - y0 + 1) / 2 / pt.k)];
  const tone = (x: number, y: number): string => {
    const k = pt.color(...pt.at(x, y));
    return k[0] === '#' ? k : R[k][3];
  };
  for (let y = Math.max(0, y0 - 1); y <= Math.min(PH - 1, y1 + 1); y++) for (let x = Math.max(0, x0 - 1); x <= Math.min(PW - 1, x1 + 1); x++) {
    if (pt.has(x, y)) continue;
    const up = pt.has(x, y + 1), dn = pt.has(x, y - 1), lf = pt.has(x + 1, y), rt = pt.has(x - 1, y);
    if (!(up || dn || lf || rt)) continue;
    if (dest.alpha(x, y)) { dest.set(x, y, mix(hexAt(dest, x, y), LINE, pt.soft)); continue; }
    if (!sel) { dest.set(x, y, LINE); continue; }
    const [nx, ny] = up ? [x, y + 1] : lf ? [x + 1, y] : dn ? [x, y - 1] : [x - 1, y];
    const t = dn || rt ? 0.78 : up && lf ? 0.5 : 0.62;  // 아래·오른쪽 가장자리는 진하게
    dest.set(x, y, mix(tone(nx, ny), LINE, t));
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!pt.has(x, y)) continue;
    const [X, Y] = pt.at(x, y);
    const k = pt.color(X, Y);
    if (k[0] === '#') { dest.set(x, y, k); continue; }
    const r = R[k];
    if (!r) throw new Error(`색 '${k}' 이 없다`);
    let L = -(((X - lx) / lrx) * 0.5 + ((Y - ly) / lry) * 0.85);
    if (!pt.has(x, y - 1)) L += 0.42;
    if (!pt.has(x, y + 1)) L -= 0.4;
    if (!pt.has(x + 1, y)) L -= 0.22;
    if (pt.fur) L += (rnd(x, y, 17) - 0.5) * 0.2;
    const i = L > 0.6 ? 0 : L > -0.32 ? 1 : L > -0.8 ? 2 : 3;
    dest.set(x, y, r[Math.min(pt.cap, i + pt.dim)]);
  }
}
export type Op = [Part, Ramps] | ((p: Pix) => void);
function paint(p: Pix, rows: string[], x: number, y: number, pal: Record<string, string>): void {
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (pal[c]) p.set(x + i, y + j, pal[c]); }));
}

// ── 삼색이 ── 삼색. 그의 오른쪽은 주황, 왼쪽은 검정. 얼굴 가운데와 가슴, 손발, 꼬리 끝은 흰색. 왼쪽 귀 끝이 접혔다.
export const CAT_R: Ramps = {
  W: ['#fffdf8', '#f4eadf', '#dccac0', '#ae949e'],
  O: ['#ffc57c', '#f79d43', '#d8702f', '#984421'],
  Q: ['#f49a46', '#d6722e', '#b35826', '#7c361b'], // 주황 위의 줄무늬
  K: ['#8a8091', '#645a6c', '#473e50', '#2f2637'],
  J: ['#716779', '#50465a', '#3a3143', '#251d2c'], // 검정 위의 줄무늬
  P: ['#ffd4dd', '#f7a3b8', '#dc7592', '#a9506b'],
};
export const MOUTH = '#6e3346';
export const EYE: Record<string, string> = { L: LINE, H: '#ffffff', g: '#2f6844', G: '#74c25e', h: '#c8f394' };
const MESH: Record<string, string> = { L: '#5f585c', H: '#8f8a86', g: '#77716f', G: '#8f8a86', h: '#77716f' }; // 눈을 붙이기 전: 망사
// 유리알 같은 큰 눈. 위는 눈꺼풀 그늘로 어둡고, 아래로 갈수록 밝다. 반짝임은 두 눈 다 왼쪽 위.
const EYES = {
  round: ['.LLLL.', 'LHHggL', 'LHgggL', 'LggGGL', 'LgGGGL', 'LGGGhL', '.LLLL.'],
  // 케모노 퍼슈트처럼: 위 눈꺼풀이 굵고 바깥 눈꼬리가 올라가며 빠진다. 아래 선은 가늘다.
  kemoL: ['LLLLL.', '.LHHgL', 'LHgggL', 'LggGGL', 'LgGGGL', 'LGGGhL', '.LLLL.'],
  kemoR: ['.LLLLL', 'LHHgL.', 'LHgggL', 'LggGGL', 'LgGGGL', 'LGGGhL', '.LLLL.'],
  droopL: ['..LLL.', '.LLggL', 'LHHggL', 'LggGGL', 'LgGGGL', 'LGGGhL', '.LLLL.'],
  droopR: ['.LLL..', 'LggLL.', 'LHHggL', 'LggGGL', 'LgGGGL', 'LGGGhL', '.LLLL.'],
  side: ['.LLL.', 'LHHgL', 'LHggL', 'LggGL', 'LgGGL', 'LGGhL', '.LLL.'],
  sideDroop: ['..LL.', '.LLgL', 'LHggL', 'LggGL', 'LgGGL', 'LGGhL', '.LLL.'],
};
/** 주황/검정 털 위에 줄무늬를 얹는다. */
export const stripe = (c: string, X: number, Y: number, k = 0): string =>
  c === 'O' || c === 'K' ? (((Y + Math.abs(X - CX) * 0.35 + k) % 3.7) < 0.95 ? (c === 'O' ? 'Q' : 'J') : c) : c;
const tailColor: ColorFn = (X, Y) => (Y > 51.2 ? 'W' : Math.floor((Y + Math.abs(X - CX) * 0.45) / 2.6) % 2 ? 'K' : 'O');

/** 머리. c 는 머리의 가운데, oy 는 아래로 내린 만큼. black 은 옆모습에서 검정 쪽이 보이는가. */
export function catHeadOps(dir: Dir, c: number, oy: number, droopy: boolean, blank: boolean, black: boolean): Op[] {
  const ops: Op[] = [];
  const mark = curMark;
  const SEW = '#f08a32', SEW_D = '#c95f22', FOAM = '#ece8dc', FOAM_D = '#b8b2a4';
  const E = blank ? MESH : EYE;
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const ruff = [c - 7.6, 17.6 + oy, c - 10.4, 19.6 + oy, c - 10.6, 21.2 + oy, c - 9.7, 22 + oy, c - 10.1, 23.6 + oy, c - 8.4, 24.8 + oy, c - 5.2, 25 + oy];
    const earUp = [c - 8.9, 15.2 + oy, c - 10.4, 5 + oy, c - 8.8, 4.2 + oy, c - 2.4, 11.4 + oy];        // 선 귀 (주황)
    const inUp = [c - 8.2, 13.2 + oy, c - 9.1, 7 + oy, c - 4.6, 11.6 + oy];
    const earDn = [c + 2.4, 11.4 + oy, c + 7.6, 6.2 + oy, c + 9.6, 6.6 + oy, c + 8.9, 15.2 + oy];        // 접힌 귀 (검정)
    const inDn = [c + 4.6, 11.8 + oy, c + 8, 8.4 + oy, c + 8.6, 12.8 + oy];
    const flap = [c + 7.2, 6.6 + oy, c + 9.8, 5.4 + oy, c + 12.6, 8.6 + oy, c + 11.6, 11.4 + oy, c + 9.4, 9.6 + oy];
    if (!back) {
      ops.push([new Part((X, Y) => (inPoly(inUp, X, Y) ? 'P' : 'O')).poly(earUp), CAT_R]);
      if (mark === 'torn') { // 접힌 귀가 뜯겨 옆으로 매달렸다. 실 두 가닥만 남았다.
        ops.push([new Part('K').poly([c + 6, 12.6 + oy, c + 9.4, 10.4 + oy, c + 13.8, 15.4 + oy, c + 13, 20.4 + oy, c + 9.6, 17.6 + oy]).set({ soft: 0.6 }), CAT_R]);
      } else {
        ops.push([new Part((X, Y) => (inPoly(inDn, X, Y) ? 'P' : 'K')).poly(earDn), CAT_R]);
        ops.push([new Part('K').poly(flap).set({ soft: 0.75 }), CAT_R]);
      }
    } else { // 뒤에서 보면 접힌 귀가 왼쪽에 온다. 귀 안쪽은 안 보인다.
      ops.push([new Part('O').poly(mx(earUp, c)), CAT_R]);
      ops.push([new Part('K').poly(mx(earDn, c)), CAT_R]);
      ops.push([new Part('K').poly(mx(flap, c)).set({ soft: 0.75 }), CAT_R]);
    }
    const blaze = [c - 0.9, 10 + oy, c + 0.9, 10 + oy, c + 2.8, 17.6 + oy, c - 2.8, 17.6 + oy];
    const face: ColorFn = back
      ? (X, Y) => (Math.abs(X - c) > 8.6 ? 'W' : X < c + Math.sin(Y * 0.6) * 1.4 ? 'K' : 'O')
      : (X, Y) => {
        if (inPoly(blaze, X, Y)) return 'W';
        if (X < c && inEll(X, Y, c - 5.6, 14.2 + oy, 6.4, 5.8)) return 'O';
        if (X >= c && inEll(X, Y, c + 6.2, 13.8 + oy, 6.6, 6.8)) return 'K';
        return 'W';
      };
    ops.push([new Part(face).ell(c, 18 + oy, 9, 7.4).poly(ruff).poly(mx(ruff, c)).ell(c, 24.2 + oy, 3.4, 1.7).light(c - 1.5, 14.5 + oy, 10, 15).set({ cap: 2, soft: 0.3 }), CAT_R]);
    ops.push((p) => {
      const O2 = CAT_R.O[2], O3 = CAT_R.Q[2];
      if (back) { for (const [x, y] of [[c + 3, 12], [c + 3, 13], [c + 5, 11], [c + 5, 12], [c + 6, 14]]) p.set(x, y + oy, O3); return; }
      for (const [x, y] of [[c - 5, 11], [c - 5, 12], [c - 3, 11], [c - 7, 12], [c - 7, 13]]) p.set(x, y + oy, O2); // 이마의 줄무늬
      paint(p, droopy ? EYES.droopL : EYES.kemoL, c - 8, 15 + oy, E); // 눈은 사진의 퍼슈트처럼 한 칸 낮게, 코 가까이
      paint(p, droopy ? EYES.droopR : EYES.kemoR, c + 2, 15 + oy, E);
      const P = CAT_R.P;
      p.set(c - 2, 20 + oy, P[2]); p.set(c - 1, 20 + oy, P[0]); p.set(c, 20 + oy, P[1]); p.set(c + 1, 20 + oy, P[2]);
      p.set(c - 1, 21 + oy, P[2]); p.set(c, 21 + oy, P[3]);
      for (const x of [c - 3, c - 1, c, c + 2]) p.set(x, 22 + oy, MOUTH);   // ω
      for (const x of [c - 2, c + 1]) p.set(x, 23 + oy, MOUTH);
      p.set(c - 1, 23 + oy, P[1]); p.set(c - 1, 24 + oy, P[2]); // 혀끝이 한쪽으로 살짝 나왔다 (꿰매 단 혀)
      for (const x of [c - 9, c - 8, c + 7, c + 8]) p.set(x, 22 + oy, P[1], 0.6); // 볼
      const W = CAT_R.W; // 귓속 흰 털
      for (const [x, y, k] of [[c - 8, 13, 0], [c - 8, 12, 1], [c - 7, 13, 1], [c - 9, 11, 1], [c - 7, 11, 0]] as const) p.set(x, y + oy, W[k]);
      if (mark !== 'torn') for (const [x, y, k] of [[c + 7, 13, 1], [c + 6, 12, 0], [c + 8, 12, 1], [c + 7, 11, 1]] as const) p.set(x, y + oy, W[k]);
      if (mark === 'torn') {
        p.set(c + 6, 11 + oy, FOAM); p.set(c + 7, 11 + oy, FOAM_D); p.set(c + 5, 12 + oy, FOAM); // 귀 뿌리의 폼
        p.set(c + 8, 10 + oy, '#fffaf0'); p.set(c + 9, 11 + oy, '#d8d2c6'); p.set(c + 8, 11 + oy, '#fffaf0', 0.6); // 실 두 가닥
        for (const [x, y, col] of [[c + 3, 20, FOAM_D], [c + 4, 20, FOAM], [c + 4, 21, FOAM], [c + 5, 21, FOAM], [c + 5, 22, FOAM_D], [c + 3, 21, FOAM_D]] as const) p.set(x, y + oy, col); // 주둥이 옆이 벌어졌다
      } else if (mark === 'sewn') { // 박음질: 두 땀 가고 한 땀 쉰다. 검정 털 위의 주황 실이라 보인다.
        for (const x of [c + 3, c + 4, c + 6, c + 7, c + 9]) p.set(x, 13 + oy, x === c + 9 ? SEW_D : SEW);
        p.set(c + 5, 12 + oy, SEW_D); p.set(c + 8, 12 + oy, SEW_D);
        p.set(c + 4, 20 + oy, SEW); p.set(c + 5, 21 + oy, SEW_D); p.set(c + 4, 22 + oy, SEW); // 주둥이 옆
      }
    });
    return ops;
  }
  // 옆모습: 오른쪽을 본다. black 이면 검정 쪽(왼쪽 얼굴)이 보이는 것으로 칠하고, 밖에서 뒤집는다.
  const near = black ? 'K' : 'O', far = black ? 'O' : 'K';
  const upright = [c - 5.4, 13 + oy, c - 5.4, 4.6 + oy, c - 3.8, 4 + oy, c + 1.4, 11.2 + oy];
  const inner = [c - 3.6, 11.4 + oy, c - 4.1, 6.6 + oy, c - 0.4, 11.2 + oy];
  const farEar = [c - 9.2, 13 + oy, c - 10.6, 5.8 + oy, c - 9, 5.2 + oy, c - 5.6, 10.6 + oy];
  if (!black) { // 먼 귀가 접힌 귀
    ops.push([new Part('K').poly(farEar).poly([c - 10.2, 6.6 + oy, c - 12.8, 8 + oy, c - 13, 11.2 + oy, c - 10.6, 10.6 + oy]).set({ dim: 1 }), CAT_R]);
    ops.push([new Part((X, Y) => (inPoly(inner, X, Y) ? 'P' : near)).poly(upright), CAT_R]);
  } else {      // 가까운 귀가 접힌 귀. 끝이 앞으로 숙었다.
    ops.push([new Part('O').poly(farEar).set({ dim: 1 }), CAT_R]);
    ops.push([new Part((X, Y) => (inPoly(inner, X, Y) ? 'P' : near)).poly([c - 5.4, 13 + oy, c - 5.2, 6.6 + oy, c - 3.4, 6.2 + oy, c + 1.4, 11.2 + oy]), CAT_R]);
    ops.push([new Part('K').poly([c - 5.6, 6.6 + oy, c - 2.4, 5.4 + oy, c - 0.8, 7.8 + oy, c - 2.8, 9.8 + oy, c - 5.2, 9.2 + oy]).set({ soft: 0.75 }), CAT_R]);
  }
  void far;
  const ruff = [c - 6.5, 19 + oy, c - 9.6, 21 + oy, c - 7.6, 22 + oy, c - 9.2, 24.4 + oy, c - 6.4, 24.3 + oy, c - 5.6, 26 + oy, c - 2.2, 24.6 + oy];
  const face: ColorFn = (X, Y) => (X > c + 2.2 || Y > 20.4 + oy || (X > c + 0.4 && Y > 13.5 + oy) ? 'W' : near);
  ops.push([new Part(face).ell(c - 1, 18 + oy, 8.4, 7.4).ell(c + 5.6, 21 + oy, 3.7, 2.8).poly(ruff).light(c, 14.5 + oy, 9.5, 15), CAT_R]);
  ops.push((p) => {
    const st = black ? CAT_R.J[2] : CAT_R.O[2];
    for (const [x, y] of [[c - 4, 11], [c - 4, 12], [c - 2, 11], [c - 6, 13], [c - 6, 14]]) p.set(x, y + oy, st);
    paint(p, droopy ? EYES.sideDroop : EYES.side, c + 1, 14 + oy, E);
    const P = CAT_R.P;
    p.set(c + 7, 20 + oy, P[1]); p.set(c + 8, 20 + oy, P[0]); p.set(c + 8, 21 + oy, P[2]);
    p.set(c + 7, 22 + oy, MOUTH); p.set(c + 6, 23 + oy, MOUTH); p.set(c + 5, 22 + oy, MOUTH);
    if (!black) { p.set(c + 6, 24 + oy, P[1]); p.set(c + 7, 24 + oy, P[2]); } // 혀끝은 주황 쪽으로 나와 있다
    if (mark === 'sewn') { if (black) { p.set(c - 4, 11 + oy, SEW); p.set(c - 2, 11 + oy, SEW); p.set(c - 3, 10 + oy, SEW_D); } else { p.set(c - 8, 12 + oy, SEW_D); p.set(c - 6, 12 + oy, SEW_D); } }
    else if (mark === 'torn') { p.set(c + 3, 21 + oy, FOAM); p.set(c + 4, 21 + oy, FOAM_D); if (black) p.set(c - 3, 9 + oy, FOAM); }
    p.set(c + 1, 21 + oy, P[1], 0.6); p.set(c + 2, 21 + oy, P[1], 0.6);
  });
  return ops;
}

type SuitOps = { under: Op[]; arms: Op[]; ruff: Op[]; last: Op[]; uy: number };
/** 서 있을 때의 작은 움직임. tail 은 꼬리 끝이 -1/0/1 만큼 기운다, br 은 숨을 들이쉰 박자. */
export type Idle = { tail?: number; br?: number; parts?: number };
/** 입는 중에 보이는 사람 것: 운동화, 맨손 (탈 털이 아니라서 털 그늘 대신 선이 둘린다) */
const SHOE: Ramp = ['#d8d4cc', '#b4aea4', '#8a847c', '#5a5650'];
const SKIN_HAND: Ramp = ['#f2d2bc', '#dcb49a', '#b88a74', '#7e5a4c'];
/** 삼색이의 몸. dir 은 down/up/right 만 (left 는 right 를 black 으로 그려서 뒤집는다). */
function suitOps(dir: Dir, step: number, sit: boolean, emote: string, ph: number, black: boolean, idle: Idle = {}): SuitOps {
  const bob = step === 1 || step === 3 ? 1 : 0;         // 디딜 때 몸이 1px 내려앉는다
  const sw = (step === 1 ? -1 : step === 3 ? 1 : 0) + (idle.tail || 0); // 꼬리는 한 박자 늦게 따라온다. 서 있을 때는 천천히 흔든다
  const br = idle.br ? 0.6 : 0;                          // 숨: 가슴과 어깨만 부푼다 (머리는 그대로라 말풍선이 흔들리지 않는다)
  const uy = bob + (sit ? 5 : 0) + (emote === 'curl' ? 2 : 0);
  const o: SuitOps = { under: [], arms: [], ruff: [], last: [], uy };
  const R = CAT_R;
  const parts = idle.parts ?? 3;
  const FT: Ramps = parts < 2 ? { ...R, W: SHOE } : R;      // 발 파츠를 아직 안 씌웠다: 운동화가 보인다
  const HD: Ramps = parts < 3 ? { ...R, W: SKIN_HAND } : R; // 손 파츠를 아직 안 꼈다: 맨손이 소매 끝에 나와 있다
  const fk = parts < 2 ? 0.75 : 1, hk = parts < 3 ? 0.62 : 1;
  const tail = parts >= 2;
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const Lc = back ? 'K' : 'O', Rc = back ? 'O' : 'K';  // 보는 쪽 왼편, 오른편의 색
    if (!back && tail) o.under.push([new Part(tailColor).path([CX + 4, 37 + uy, CX + 9.6, 41 + uy, CX + 12 + sw * 0.6, 47, CX + 11.8 + sw, 51.4, CX + 9 + sw, 53.4], 3, 2.5), R]);
    const lifts: number[] = [];
    for (const s of [-1, 1]) {
      const lift = !sit && ((step === 1 && s < 0) || (step === 3 && s > 0)) ? 1 : 0;
      lifts.push(lift);
      const col = s < 0 ? Lc : Rc;
      const leg = new Part((X, Y) => (Y > 48.4 - lift ? 'W' : stripe(col, X, Y)));
      if (sit) leg.ell(CX + s * 4.4, 47.2, 4.4, 3.2);
      else leg.ell(CX + s * 4.3, 41 + bob, 4.1, 4.7).path([CX + s * 4.3, 43 + bob, CX + s * 4.6, 50 - lift], 2.5, 2.1);
      o.under.push([leg, R]);
      o.under.push([new Part('W').ell(CX + s * 4.6, 51.9 - lift + (1 - fk) * 2, 3.7 * fk, 2.4 * fk).light(CX + s * 4.6 - 1, 50.5, 4.5, 3), FT]);
    }
    if (parts >= 2) o.under.push((p) => { // 발가락 사이
      [-1, 1].forEach((s, i) => {
        const fx = Math.floor(CX + s * 4.6), fy = 53 - lifts[i];
        for (const dx of [-1, 1]) { p.set(fx + dx, fy, R.W[3]); p.set(fx + dx, fy - 1, R.W[2]); }
      });
    });
    const belly: ColorFn = (X, Y) => {
      if (!back) return inEll(X, Y, CX, 33 + uy, 3.3, 6.6) ? 'W' : stripe(X < CX ? Lc : Rc, X, Y, 1.5);
      // 등: 가운데가 물결지게 갈리고, 어깨와 엉덩이에 반대 색 삼색이 하나씩
      let k = X < CX + Math.sin(Y * 0.55 + 1) * 1.3 ? 'K' : 'O';
      if (inEll(X, Y, CX - 3.6, 27.8 + uy, 2.4, 1.8)) k = 'O';
      if (inEll(X, Y, CX + 3.6, 36.4 + uy, 2.6, 2)) k = 'K';
      return k === 'O' ? stripe(k, X, Y, 1.5) : k;
    };
    o.under.push([new Part(belly).ell(CX, 31.6 + uy - br * 0.5, 6.3 + br * 0.5, 6.8 + br * 0.5).ell(CX, 36.6 + uy, 7, 3.6), R]);
    // 팔
    for (const s of [-1, 1]) {
      const col = s < 0 ? Lc : Rc;
      const armCol: ColorFn = (X, Y) => stripe(col, X, Y, 0.7);
      const a = step === 1 ? s : step === 3 ? -s : 0;
      if (!back && emote === 'wave' && s > 0) {          // 손을 흔든다: 젤리가 보인다
        o.arms.push([new Part(armCol).path([CX + 6.2, 26.8 + uy, CX + 9.4 + ph, 20.4 + uy], 2.2, 1.9), R]);
        const px = CX + 10 + ph, py = 17.8 + uy;
        o.arms.push([new Part('W').ell(px, py, 2.9, 2.7), R]);
        o.arms.push((p) => {
          const x = Math.floor(px), y = Math.floor(py), P = R.P;
          p.set(x - 1, y + 1, P[1]); p.set(x, y + 1, P[1]); p.set(x + 1, y + 1, P[2]); p.set(x, y + 2, P[2]); p.set(x - 1, y + 1, P[0]);
          p.set(x - 2, y - 1, P[1]); p.set(x, y - 2, P[1]); p.set(x + 2, y - 1, P[1]);
        });
      } else if (!back && REACH.has(emote) && s > 0) {  // 앞으로 내민다: 젤리가 이쪽을 본다
        o.arms.push([new Part(armCol).path([CX + 6.2, 26.8 + uy, CX + 7.4, 31.4 + uy], 2.3, 2.1), R]);
        o.arms.push([new Part('W').ell(CX + 7, 33 + uy, 3.3, 3), R]);
        o.arms.push((p) => { const x = Math.floor(CX + 7), y = Math.floor(33 + uy), P = R.P; p.set(x - 1, y + 1, P[1]); p.set(x, y + 1, P[1]); p.set(x + 1, y + 1, P[2]); p.set(x - 2, y - 1, P[1]); p.set(x, y - 2, P[1]); p.set(x + 2, y - 1, P[1]); });
      } else if (!back && emote === 'hold') {            // 벗은 머리를 배 앞에 안는다: 두 손이 머리 양옆을 받친다
        o.arms.push([new Part(armCol).path([CX + s * 6.2, 26.8 + uy, CX + s * 8.8, 35 + uy], 2.2, 1.9), R]);
        o.arms.push([new Part('W').ell(CX + s * 8.2, 38.2 + uy, 2.9 * hk, 2.6 * hk), HD]);
      } else if (!back && (emote === 'heart' || emote === 'curl' || emote === 'eat' || emote === 'cover_mouth')) { // 두 손을 가슴 앞에 모은다 (먹는 시늉, 입 가리기는 더 높이)
        const ty = emote === 'curl' ? 34 : emote === 'eat' || emote === 'cover_mouth' ? 27.5 : 31;
        o.arms.push([new Part(armCol).path([CX + s * 6.2, 26.8 + uy, CX + s * 3, ty + uy], 2.2, 1.9), R]);
        o.arms.push([new Part('W').ell(CX + s * 2.2, ty + 0.6 + uy, 2.9 * hk, 2.6 * hk), HD]);
      } else {
        o.arms.push([new Part(armCol).path([CX + s * (6.2 + br * 0.5), 26.8 + uy - br, CX + s * (8.2 + br * 0.4), 34.6 + uy + a * 0.7 - br * 0.5], 2.2, 1.8), R]);
        o.arms.push([new Part('W').ell(CX + s * (8.6 + br * 0.4) - s * (1 - hk) * 1.5, 37.2 + uy + a * 0.7 - br * 0.5, 3 * hk, 2.7 * hk), HD]);
      }
    }
    // 목털
    if (!back) o.ruff.push([new Part('W').set({ soft: 0.3 }).ell(CX, 26.4 + uy - br * 0.5, 6.2 + br * 0.4, 2.7)
      .poly([CX - 5.8, 26.6 + uy, CX - 4, 30 + uy, CX - 1.8, 29.2 + uy, CX, 31 + uy, CX + 1.8, 29.2 + uy, CX + 4, 30 + uy, CX + 5.8, 26.6 + uy]), R]);
    else {
      o.ruff.push([new Part((X, Y) => (X < CX + Math.sin(Y * 0.6) * 1.4 ? 'K' : 'O')).ell(CX, 26.4 + uy, 6, 2.4), R]);
      if (tail) o.last.push([new Part(tailColor).path([CX, 36.6 + uy, CX + 0.4 + sw * 0.5, 42.6, CX + 1 + sw, 48.6, CX + 3 + sw, 52.2, CX + 6.6 + sw, 53], 3.1, 2.5), R]);
    }
    return o;
  }
  // 옆모습 (오른쪽을 본다)
  const near = black ? 'K' : 'O', far = black ? 'O' : 'K';
  const f = sit ? 0 : step === 1 ? 3 : step === 3 ? -3 : 0;   // 앞으로 내딛는 발
  const a = -f * 0.6;
  const leg = (col: string, dx: number, dim: number): void => {
    const pt = new Part((X, Y) => (Y > 48.4 ? 'W' : stripe(col, X, Y))).set({ dim });
    if (sit) pt.ell(CX + 2.4 + dx, 45.4, 5.2, 3.2);
    else pt.ell(CX + dx * 0.4, 41 + bob, 4.6, 4.9).path([CX + dx * 0.4, 43 + bob, CX + 0.6 + dx, 50.2], 2.6, 2.2);
    o.under.push([pt, R]);
    o.under.push([new Part('W').ell(CX + (sit ? 6.4 : 3) + (sit ? dx * 0.3 : dx) - (1 - fk) * 3, 52.3, 4.2 * fk, 2.2 * fk).set({ dim }), FT]);
  };
  if (tail) o.under.push([new Part(tailColor).path([CX - 3.6, 37 + uy, CX - 8, 41 + uy, CX - 10.4 - sw, 47, CX - 10.6 - sw, 51.2, CX - 7.8 - sw, 53.2], 3, 2.5), R]);
  leg(far, -f - 0.8, 1);
  o.under.push([new Part((X, Y) => stripe(far, X, Y)).path([CX + 1.6, 27 + uy, CX + 2.4 - a, 34.6 + uy], 2.1, 1.8).set({ dim: 1 }), R]);
  o.under.push([new Part('W').ell(CX + 2.8 - a, 36.8 + uy, 2.8 * hk, 2.5 * hk).set({ dim: 1 }), HD]);
  o.under.push([new Part((X, Y) => (X > CX + 2.4 + br ? 'W' : stripe(near, X, Y, 1.5))).ell(CX + br * 0.5, 31.6 + uy - br * 0.4, 5.8 + br * 0.5, 6.9 + br * 0.4).ell(CX - 0.4, 36.6 + uy, 6.4, 3.8), R]);
  leg(near, f + 0.4, 0);
  if (emote === 'hold') { // 벗은 머리를 앞으로 안는다
    o.arms.push([new Part((X, Y) => stripe(near, X, Y, 0.7)).path([CX - 0.4, 27.2 + uy, CX + 0.6, 34 + uy, CX + 4.6, 37.6 + uy], 2.3, 1.9), R]);
    o.arms.push([new Part('W').ell(CX + 5.6, 38.2 + uy, 2.9 * hk, 2.6 * hk), HD]);
  } else {
    o.arms.push([new Part((X, Y) => stripe(near, X, Y, 0.7)).path([CX - 0.4, 27.2 + uy, CX + 0.8 + a, 34.6 + uy], 2.3, 1.9), R]);
    o.arms.push([new Part('W').ell(CX + 1.2 + a, 37 + uy, 3 * hk, 2.7 * hk), HD]);
  }
  o.ruff.push([new Part('W').set({ soft: 0.35 }).poly([CX + 1.4, 24.6 + uy, CX + 6.2, 26.6 + uy, CX + 5, 27.8 + uy, CX + 6.4, 29.6 + uy, CX + 4, 29.8 + uy, CX + 4.6, 31.6 + uy, CX + 1.6, 30.4 + uy]), R]);
  return o;
}

// ── 다른 탈들 ── 정모에 온 여우, 토끼, 강아지, 곰. 몸의 뼈대는 삼색이와 같고, 만든 사람이 달라서
// 눈은 삼색이와 같은 만화 눈이고 홍채 색이 다르다. 셋은 탈 위에 티셔츠를 입었다 (단체 사진과 같은 색).
export type Species = 'fox' | 'rabbit' | 'dog' | 'bear';
export const SUIT_R: Record<Species, Ramps> = {
  fox: { A: ['#ffb877', '#ef8a3e', '#c9652b', '#8a421d'], W: CAT_R.W, K: ['#54484f', '#3b3138', '#2a2228', '#1a1418'], P: CAT_R.P },
  rabbit: { A: ['#e6e4ec', '#c8c5d1', '#a5a1b2', '#78738c'], W: CAT_R.W, K: ['#9a94a6', '#7e7890', '#625c74', '#463f56'], P: CAT_R.P }, // 회색 토끼
  dog: { A: ['#f9d996', '#e6b061', '#c08944', '#83592a'], W: ['#fff8ea', '#f6e8cc', '#dcc8a4', '#a8906c'], K: ['#a46c3e', '#84522c', '#643c20', '#432714'], P: CAT_R.P },
  bear: { A: ['#b07a56', '#8a5a3c', '#6a442c', '#47291b'], W: ['#e8cda6', '#d2b088', '#ae8a64', '#7a5c40'], K: ['#4a3022', '#3a2418', '#2a1a10', '#1a0f08'], P: CAT_R.P },
};
export const SUIT_SHIRT: Record<Species, string | null> = { fox: '#2f3540', rabbit: '#5b7ec2', dog: '#c54848', bear: null };
const FUR_R: Record<Species, Ramps> = Object.fromEntries((Object.keys(SUIT_R) as Species[]).map((k) => {
  const c = SUIT_SHIRT[k];
  const S: Ramp = c ? [mix(c, '#ffffff', 0.28), c, mix(c, '#000000', 0.25), mix(c, '#000000', 0.48)] : SUIT_R[k].A;
  return [k, { ...SUIT_R[k], S }];
})) as unknown as Record<Species, Ramps>;
/** 털 테두리(검은 선 대신 털의 깊은 그늘)를 쓰는 탈들 */
const FURRY = new Set<Ramps>([CAT_R, ...Object.values(FUR_R)]);
const PUPIL: Record<Species, string> = { fox: '#5a3a10', rabbit: '#1c1622', dog: '#3a2416', bear: '#1c1622' };
// 다른 탈들의 눈: 흰자 위의 점(구슬 눈)이 아니라 삼색이와 같은 만화 눈. 색 있는 홍채, 반짝임 둘, 위 눈꺼풀이 두껍다.
const TOON = { front: ['.LLL.', 'LHiiL', 'LHiIL', 'LiIIL', 'LIIhL', '.LLL.'], frontL: ['LLLL.', '.HiiL', 'LHiIL', 'LiIIL', 'LIIhL', '.LLL.'], frontR: ['.LLLL', 'LHii.', 'LHiIL', 'LiIIL', 'LIIhL', '.LLL.'], side: ['LLL.', 'HiiL', 'HiIL', 'iIIL', 'IIhL', 'LLL.'] };
const IRIS: Record<Species, [string, string, string]> = { // 밝은 홍채, 어두운 홍채, 아래 반사
  fox: ['#f2b048', '#a8601c', '#ffe0a0'], rabbit: ['#c49ae0', '#6e48a0', '#ecd8ff'], dog: ['#c88a4a', '#6e4420', '#f0c890'], bear: ['#d09a58', '#6a3e1c', '#f4d4a0'],
};

/** 탈 머리. c 는 가운데, oy 는 내린 만큼. dir 은 down/up/right (left 는 밖에서 뒤집는다). */
function furHeadOps(sp: Species, dir: Dir, c: number, oy: number): Op[] {
  const R = FUR_R[sp], ops: Op[] = [];
  const big = sp === 'bear' ? 1 : 0;
  const eyePal = { L: LINE, H: '#ffffff', i: IRIS[sp][0], I: IRIS[sp][1], h: IRIS[sp][2] };
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    for (const s of [-1, 1]) { // 귀 (머리 뒤에 먼저)
      if (sp === 'fox') {
        const inner = [c + s * 4.6, 12 + oy, c + s * 8.6, 5.4 + oy, c + s * 8.4, 12.4 + oy];
        ops.push([new Part((X, Y) => (Y < 6.2 + oy ? 'K' : !back && inPoly(inner, X, Y) ? 'W' : 'A')).poly([c + s * 3, 12.4 + oy, c + s * 9.6, 2.8 + oy, c + s * 9.6, 13.8 + oy]), R]);
      } else if (sp === 'rabbit') {
        ops.push([new Part((X, Y) => (!back && Math.abs(X - (c + s * (3.9 + (12 - Y + oy) * 0.13))) < 0.8 && Y > 3 + oy && Y < 10.6 + oy ? 'P' : 'A')).path([c + s * 3.2, 12.4 + oy, c + s * 4.4, 5 + oy, c + s * 5.4, 1.2 + oy], 2.3, 1.8), R]);
      } else if (sp === 'bear') {
        ops.push([new Part((X, Y) => (!back && inEll(X, Y, c + s * 7.3, 10.8 + oy, 1.5, 1.3) ? 'W' : 'A')).ell(c + s * 7.5, 10.6 + oy, 3.2, 3), R]);
      }
    }
    const face: ColorFn = back ? () => 'A' : (X, Y) => {
      if (sp === 'fox') return Y > 19.2 + oy && Math.abs(X - c) > 1.2 ? 'W' : 'A';
      if (sp === 'rabbit') return inEll(X, Y, c, 21.2 + oy, 4.2, 2.8) ? 'W' : 'A';
      return inEll(X, Y, c, 21.4 + oy, 4.8 + big * 0.4, 3.3) ? 'W' : 'A';
    };
    const head = new Part(face).ell(c, 18 + oy - big * 0.4, 9 + big * 0.8, 7.4 + big * 0.7).light(c - 1.5, 14.5 + oy, 10, 15);
    if (sp === 'fox') head.poly([c - 8.6, 17 + oy, c - 12, 21.4 + oy, c - 6.6, 23 + oy]).poly([c + 8.6, 17 + oy, c + 12, 21.4 + oy, c + 6.6, 23 + oy]); // 볼털
    if (sp === 'rabbit') head.ell(c, 24.2 + oy, 3.2, 1.6);
    ops.push([head, R]);
    if (sp === 'dog') for (const s of [-1, 1]) ops.push([new Part('K').path([c + s * 6.6, 11.4 + oy, c + s * 10.2, 13.8 + oy, c + s * 10.1, 20.6 + oy], 2.4, 2.9), R]); // 처진 귀
    if (back) return ops;
    ops.push((p) => {
      paint(p, TOON.frontL, c - 7, 14 + oy, eyePal); paint(p, TOON.frontR, c + 2, 14 + oy, eyePal);
      if (sp === 'rabbit') { p.set(c - 1, 20 + oy, R.P[1]); p.set(c, 20 + oy, R.P[2]); for (const x of [c - 7, c - 6, c + 5, c + 6]) p.set(x, 20 + oy, R.P[1], 0.6); }
      else { p.set(c - 1, 20 + oy, '#4a4050'); p.set(c, 20 + oy, LINE); p.set(c - 1, 21 + oy, LINE); p.set(c, 21 + oy, LINE); if (sp !== 'fox') { p.set(c - 2, 20 + oy, LINE); p.set(c + 1, 20 + oy, LINE); } }
      for (const [x, y] of [[c - 2, 22], [c - 1, 23], [c, 23], [c + 1, 22]] as const) p.set(x, y + oy + (sp === 'rabbit' ? 0 : 0), MOUTH);
      if (sp === 'dog') { p.set(c, 24 + oy, R.P[1]); p.set(c - 1, 24 + oy, R.P[2]); } // 혀
      if (sp === 'fox') for (const [x, y] of [[c - 10, 21], [c + 9, 21], [c - 9, 22], [c + 8, 22]] as const) p.set(x, y + oy, CAT_R.W[1]);
    });
    return ops;
  }
  // 옆모습 (오른쪽을 본다)
  if (sp === 'fox') {
    ops.push([new Part((X, Y) => (Y < 6.4 + oy ? 'K' : 'A')).poly([c - 8.8, 13 + oy, c - 9.6, 4.6 + oy, c - 7.6, 4.4 + oy, c - 4.6, 10.8 + oy]).set({ dim: 1 }), R]);
    ops.push([new Part((X, Y) => (Y < 6.6 + oy ? 'K' : inPoly([c - 3.8, 11.6 + oy, c - 3.6, 6.4 + oy, c - 0.6, 11 + oy], X, Y) ? 'W' : 'A')).poly([c - 5.6, 13 + oy, c - 4.6, 3.2 + oy, c - 2.6, 3 + oy, c + 1.4, 11.2 + oy]), R]);
  } else if (sp === 'rabbit') {
    ops.push([new Part('A').path([c - 1.8, 12 + oy, c - 3.4, 4.8 + oy, c - 4.6, 1 + oy], 2.1, 1.7).set({ dim: 1 }), R]);
    ops.push([new Part((X, Y) => (Y > 3 + oy && Y < 10 + oy && Math.abs(X - (c - 4.4 + (Y - oy - 4) * 0.25)) < 0.7 ? 'P' : 'A')).path([c - 3.6, 12 + oy, c - 5.8, 5 + oy, c - 7.4, 1 + oy], 2.3, 1.8), R]);
  } else if (sp === 'bear') {
    ops.push([new Part('A').ell(c - 8.2, 12 + oy, 2.8, 2.6).set({ dim: 1 }), R]);
    ops.push([new Part((X, Y) => (inEll(X, Y, c - 3.6, 11.6 + oy, 1.4, 1.2) ? 'W' : 'A')).ell(c - 3.8, 11.2 + oy, 3, 2.8), R]);
  }
  const face: ColorFn = (X, Y) => {
    if (sp === 'fox') return Y > 20.6 + oy || (X > c + 3 && Y > 19.4 + oy) ? 'W' : 'A';
    if (sp === 'rabbit') return X > c + 2.6 && Y > 19.4 + oy ? 'W' : 'A';
    return X > c + 2.4 && Y > 18.8 + oy ? 'W' : 'A';
  };
  const head = new Part(face).ell(c - 1, 18 + oy - big * 0.4, 8.4 + big * 0.7, 7.4 + big * 0.7).light(c, 14.5 + oy, 9.5, 15);
  if (sp === 'fox') head.poly([c + 3, 18.6 + oy, c + 10.8, 21.2 + oy, c + 9.8, 22.6 + oy, c + 3, 24 + oy]).poly([c - 7, 19 + oy, c - 10.4, 22.4 + oy, c - 5.6, 24 + oy]);
  else head.ell(c + (sp === 'rabbit' ? 4.6 : 5.4), 21 + oy, sp === 'rabbit' ? 3 : 3.8, sp === 'rabbit' ? 2.6 : 2.9);
  ops.push([head, R]);
  if (sp === 'dog') ops.push([new Part('K').path([c - 3.6, 12 + oy, c - 6.6, 14.4 + oy, c - 6.4, 20.6 + oy], 2.4, 2.8), R]);
  ops.push((p) => {
    paint(p, TOON.side, c + 1, 13 + oy, eyePal);
    const nx = sp === 'fox' ? c + 10 : sp === 'rabbit' ? c + 7 : c + 8;
    if (sp === 'rabbit') p.set(nx, 20 + oy, R.P[1]);
    else { p.set(nx, 20 + oy, LINE); p.set(nx, 21 + oy, LINE); p.set(nx - 1, 20 + oy, '#4a4050'); }
    p.set(nx - 3, 23 + oy, MOUTH); p.set(nx - 2, 23 + oy, MOUTH);
  });
  return ops;
}

/** 탈의 몸. 삼색이의 몸과 같은 뼈대에 종마다 색, 티셔츠, 꼬리. 곰은 이 미터: 어깨와 몸통이 한 뼘 넓다. */
function furOps(sp: Species, dir: Dir, step: number, sit: boolean, emote: string, ph: number, idle: Idle = {}): SuitOps {
  const R = FUR_R[sp], shirt = !!SUIT_SHIRT[sp];
  const bob = step === 1 || step === 3 ? 1 : 0;
  const sw = (step === 1 ? -1 : step === 3 ? 1 : 0) + (idle.tail || 0);
  const br = idle.br ? 0.6 : 0;
  const uy = bob + (sit ? 5 : 0);
  const bw = sp === 'bear' ? 1.16 : 1; // 몸통 폭
  const o: SuitOps = { under: [], arms: [], ruff: [], last: [], uy };
  const paw = sp === 'fox' ? 'K' : sp === 'bear' ? 'A' : 'W';
  const torsoCol = (X: number, Y: number, back: boolean): string => {
    if (shirt) return Y > 37.8 + uy ? 'A' : 'S';
    return !back && inEll(X, Y, CX, 33 + uy, 3.9, 6.8) ? 'W' : 'A';
  };
  const tail = (side: 'front' | 'back' | 'side'): Op | null => {
    const tipW: ColorFn = (_X, Y) => (Y > 50.4 ? 'W' : 'A');
    if (sp === 'fox') {
      if (side === 'front') return [new Part(tipW).path([CX + 4, 37 + uy, CX + 10.6, 40 + uy, CX + 13.6 + sw * 0.6, 46, CX + 13.4 + sw, 51, CX + 10 + sw, 53.6], 4.2, 3.2), R];
      if (side === 'back') return [new Part(tipW).path([CX, 37 + uy, CX + 0.6 + sw * 0.5, 43, CX + 1.6 + sw, 49, CX + 4 + sw, 52.6, CX + 8 + sw, 53.4], 4.4, 3.2), R];
      return [new Part(tipW).path([CX - 3.6, 37 + uy, CX - 9, 40.5 + uy, CX - 12.6 - sw, 46.4, CX - 12.6 - sw, 51, CX - 9.4 - sw, 53.4], 4.2, 3.2), R];
    }
    if (sp === 'dog') { // 말려 올라간 꼬리
      if (side === 'front') return [new Part('A').path([CX + 5, 37 + uy, CX + 9.6, 34 + uy, CX + 10.6 + sw * 0.4, 29.6 + uy, CX + 8.6 + sw * 0.4, 27.8 + uy], 2.4, 1.8), R];
      if (side === 'back') return [new Part('A').path([CX, 37.4 + uy, CX + 1.4, 33.4 + uy, CX + 3.4 + sw * 0.5, 30.4 + uy, CX + 2 + sw * 0.5, 28.4 + uy], 2.5, 1.9), R];
      return [new Part('A').path([CX - 4, 37 + uy, CX - 8, 34 + uy, CX - 8.6 - sw * 0.4, 29.8 + uy, CX - 6.6 - sw * 0.4, 28.4 + uy], 2.3, 1.7), R];
    }
    if (side === 'front') return null;
    const puff = sp === 'rabbit' ? 'W' : 'A';
    if (side === 'back') return [new Part(puff).ell(CX + sw * 0.3, 38.6 + uy, sp === 'rabbit' ? 2.7 : 2.2, sp === 'rabbit' ? 2.5 : 2), R];
    return [new Part(puff).ell(CX - 6.4 * bw, 38.4 + uy, sp === 'rabbit' ? 2.5 : 2, sp === 'rabbit' ? 2.4 : 1.9), R];
  };
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    if (!back) { const t = tail('front'); if (t) o.under.push(t); }
    if (back && sp === 'dog') { const t = tail('back'); if (t) o.last.push(t); }
    for (const s of [-1, 1]) {
      const lift = !sit && ((step === 1 && s < 0) || (step === 3 && s > 0)) ? 1 : 0;
      const leg = new Part((_X, Y) => (sp === 'fox' && Y > 46.4 - lift ? 'K' : Y > 48.4 - lift && paw === 'W' ? 'W' : 'A'));
      if (sit) leg.ell(CX + s * 4.4 * bw, 47.2, 4.4 * bw, 3.2);
      else leg.ell(CX + s * 4.3 * bw, 41 + bob, 4.1 * bw, 4.7).path([CX + s * 4.3 * bw, 43 + bob, CX + s * 4.6 * bw, 50 - lift], 2.5 * bw, 2.1 * bw);
      o.under.push([leg, R]);
      o.under.push([new Part(paw).ell(CX + s * 4.6 * bw, 51.9 - lift, 3.7 * bw, 2.4).light(CX + s * 4.6 - 1, 50.5, 4.5, 3), R]);
    }
    o.under.push([new Part((X, Y) => torsoCol(X, Y, back)).ell(CX, 31.6 + uy - br * 0.5, (6.3 + br * 0.5) * bw, 6.8 + br * 0.5).ell(CX, 36.6 + uy, 7 * bw, 3.6).set({ fur: !shirt }), R]);
    if (shirt && !back) o.under.push((p) => { const y = Math.round(37.6 + uy); for (let x = Math.round(CX - 6 * bw); x <= Math.round(CX + 6 * bw); x++) if (p.alpha(x, y)) p.set(x, y, R.S[3]); }); // 티셔츠 밑단
    for (const s of [-1, 1]) {
      const a = step === 1 ? s : step === 3 ? -s : 0;
      const armCol: ColorFn = (_X, Y) => (shirt && Y < 29.6 + uy ? 'S' : 'A');
      const sx = 6.2 * bw;
      if (!back && emote === 'wave' && s > 0) {
        o.arms.push([new Part(armCol).path([CX + sx, 26.8 + uy, CX + sx + 3.2 + ph, 20.4 + uy], 2.2, 1.9), R]);
        o.arms.push([new Part(paw).ell(CX + sx + 3.8 + ph, 17.8 + uy, 2.9, 2.7), R]);
      } else if (!back && emote === 'hold') {
        o.arms.push([new Part(armCol).path([CX + s * sx, 26.8 + uy, CX + s * 8.8, 35 + uy], 2.2, 1.9), R]);
        o.arms.push([new Part(paw).ell(CX + s * 8.2, 38.2 + uy, 2.9, 2.6), R]);
      } else {
        o.arms.push([new Part(armCol).path([CX + s * (sx + br * 0.5), 26.8 + uy - br, CX + s * (sx + 2 + br * 0.4), 34.6 + uy + a * 0.7 - br * 0.5], 2.2 * bw, 1.8 * bw), R]);
        o.arms.push([new Part(paw).ell(CX + s * (sx + 2.4 + br * 0.4), 37.2 + uy + a * 0.7 - br * 0.5, 3 * bw, 2.7), R]);
      }
    }
    // 목: 티셔츠 목둘레 위로 털이 나온다
    o.ruff.push([new Part((X) => (!back && Math.abs(X - CX) < 3.2 ? 'W' : 'A')).set({ soft: 0.3 }).ell(CX, 26.4 + uy - br * 0.5, 5.4 * bw, 2.4), R]);
    if (back && sp !== 'dog') { const t = tail('back'); if (t) o.last.push(t); }
    return o;
  }
  // 옆모습 (오른쪽을 본다)
  const f = sit ? 0 : step === 1 ? 3 : step === 3 ? -3 : 0, a = -f * 0.6;
  const leg = (dx: number, dim: number): void => {
    const pt = new Part((_X, Y) => (sp === 'fox' && Y > 46.4 ? 'K' : Y > 48.4 && paw === 'W' ? 'W' : 'A')).set({ dim });
    if (sit) pt.ell(CX + 2.4 + dx, 45.4, 5.2, 3.2);
    else pt.ell(CX + dx * 0.4, 41 + bob, 4.6 * bw, 4.9).path([CX + dx * 0.4, 43 + bob, CX + 0.6 + dx, 50.2], 2.6 * bw, 2.2 * bw);
    o.under.push([pt, R]);
    o.under.push([new Part(paw).ell(CX + (sit ? 6.4 + dx * 0.3 : 3 + dx), 52.3, 4.2, 2.2).set({ dim }), R]);
  };
  const t = tail('side'); if (t) o.under.push(t);
  leg(-f - 0.8, 1);
  const armCol: ColorFn = (_X, Y) => (shirt && Y < 29.6 + uy ? 'S' : 'A');
  o.under.push([new Part(armCol).path([CX + 1.6, 27 + uy, CX + 2.4 - a, 34.6 + uy], 2.1, 1.8).set({ dim: 1 }), R]);
  o.under.push([new Part(paw).ell(CX + 2.8 - a, 36.8 + uy, 2.8, 2.5).set({ dim: 1 }), R]);
  o.under.push([new Part((X, Y) => (shirt ? (Y > 37.8 + uy ? 'A' : 'S') : X > CX + 2.4 ? 'W' : 'A')).ell(CX + br * 0.5, 31.6 + uy - br * 0.4, (5.8 + br * 0.5) * bw, 6.9 + br * 0.4).ell(CX - 0.4, 36.6 + uy, 6.4 * bw, 3.8).set({ fur: !shirt }), R]);
  leg(f + 0.4, 0);
  if (emote === 'hold') {
    o.arms.push([new Part(armCol).path([CX - 0.4, 27.2 + uy, CX + 0.6, 34 + uy, CX + 4.6, 37.6 + uy], 2.3, 1.9), R]);
    o.arms.push([new Part(paw).ell(CX + 5.6, 38.2 + uy, 2.9, 2.6), R]);
  } else {
    o.arms.push([new Part(armCol).path([CX - 0.4, 27.2 + uy, CX + 0.8 + a, 34.6 + uy], 2.3 * bw, 1.9 * bw), R]);
    o.arms.push([new Part(paw).ell(CX + 1.2 + a, 37 + uy, 3, 2.7), R]);
  }
  o.ruff.push([new Part((X) => (X > CX + 1.6 ? 'W' : 'A')).set({ soft: 0.35 }).ell(CX + 1.4, 26.6 + uy, 4.6, 2.2), R]);
  return o;
}

// ── 사람 ──
type HSpec = {
  R: Ramps;
  head: [number, number, number];           // 머리의 가운데 y, 가로 반지름, 세로 반지름
  hair: (X: number, Y: number, dir: Dir, c: number, cy: number) => string;
  sh: number; hem: number; hip: number; tw: number; // 어깨 y, 윗옷 끝 y, 엉덩이 y, 몸통 반폭
  armR: number; legR: number; legW: number;
  sleeve: (Y: number) => string;            // 팔의 색 (어깨에서 잰 y)
  foot: [number, number];
  collar?: boolean;
  torso?: (X: number, Y: number, dir: Dir) => string; // 윗옷 무늬 (조끼처럼 겹쳐 입은 것)
};
/** sit: 의자에 앉는다 (몸이 4px 내려간다). 'floor': 바닥에 주저앉는다 — 엉덩이가 바닥에 닿고 다리가 앞으로 나온다. */
const FLOOR_D = 9;
// 사람의 몸짓 (charFrame 이 그릴 때만 잠깐 정한다): 끄덕, 젓기, 웃음, 내밀기, 입 가리기
let hEm = '', hPh = 0;
const REACH = new Set(['give', 'reach', 'point']);
/** wave: 오른손을 머리 옆으로 들어 흔든다 (앞모습만). 값은 손의 좌우 흔들림. */
function humanOps(h: HSpec, dir: Dir, step: number, sitArg: boolean | 'floor', withHead: boolean, wave: number | false = false): { ops: Op[]; top: number; head: Op[]; body: Op[] } {
  let hs0 = -1; // 머리(머리카락·앞머리 그늘·얼굴 앞의 손)가 시작하는 자리
  const floor = sitArg === 'floor', sit = !!sitArg;
  const bob = (step === 1 || step === 3 ? 1 : 0) + (hEm === 'laugh' && hPh ? 1 : 0);
  const uy = bob + (floor ? FLOOR_D : sit ? 4 : 0);
  const hdx = hEm === 'shake' ? (hPh ? 1 : -1) : 0, hdy = hEm === 'nod' && hPh ? 1 : 0;
  const lt = h.hip + (floor ? FLOOR_D : sit ? 4 : bob);
  const R = h.R, ops: Op[] = [];
  const [hcy, hrx, hry] = h.head;
  const arm = (Y: number): string => h.sleeve(Y - uy - h.sh);
  if (dir === 'down' || dir === 'up') {
    for (const s of [-1, 1]) {
      if (floor) { // 다리가 보는 쪽으로 뻗어 나와 짧아 보인다. 발끝이 벌어진다.
        ops.push([new Part('L').path([CX + s * h.legW, lt - 1, CX + s * (h.legW + 1.6), 52.4], h.legR + 0.2, h.legR), R]);
        if (dir === 'down') ops.push([new Part('F').ell(CX + s * (h.legW + 2), 53.4, h.foot[0], h.foot[1] + 0.4).set({ fur: false }), R]);
        continue;
      }
      const lift = !sit && ((step === 1 && s < 0) || (step === 3 && s > 0)) ? 1 : 0;
      ops.push([new Part('L').path([CX + s * h.legW, lt, CX + s * (h.legW + 0.1), 52 - lift], h.legR, h.legR * 0.9), R]);
      ops.push([new Part('F').ell(CX + s * (h.legW + 0.2), 53 - lift, h.foot[0], h.foot[1]).set({ fur: false }), R]);
    }
    ops.push([new Part('L').ell(CX, h.hip + uy, h.tw - 0.4, 2.4).set({ fur: false }), R]);
    const neck: ColorFn = (X, Y) => (h.collar && dir === 'down' && inEll(X, Y, CX, h.sh + uy, 2.4, 1.4) ? 'S' : h.torso ? h.torso(X, Y, dir) : 'T');
    ops.push([new Part(neck).poly([CX - h.tw, h.sh + uy, CX + h.tw, h.sh + uy, CX + h.tw - 0.4, h.hem + uy, CX - h.tw + 0.4, h.hem + uy]).ell(CX, h.sh + 1 + uy, h.tw + 0.2, 2.2).set({ fur: false }), R]);
    for (const s of [-1, 1]) {
      const a = step === 1 ? s : step === 3 ? -s : 0;
      const up = wave !== false && s > 0 && dir === 'down';
      const fwd = REACH.has(hEm) && s > 0 && dir === 'down'; // 앞으로 내민 손: 몸 앞, 가슴 높이
      const mouth = hEm === 'cover_mouth' && s > 0 && dir === 'down';
      const ax = up ? h.tw + 2.6 + (wave as number) : fwd ? h.tw - 0.4 : mouth ? 1.4 : floor ? h.tw + 2.2 : h.tw + 1;
      const ay = up ? hcy - hry * 0.3 + uy : fwd ? h.sh + 6 + uy : mouth ? h.sh + 1 + uy : floor ? Math.min(h.hem - 1.2 + uy, 52.2) : h.hem - 1.2 + uy + a * 0.6; // 주저앉으면 손이 바닥을 짚는다
      ops.push([new Part((_X, Y) => arm(Y)).path([CX + s * (h.tw + 0.4), h.sh + 1.2 + uy, CX + s * ax, ay - 1.2], h.armR, h.armR * 0.85).set({ fur: false }), R]);
      ops.push([new Part('S').ell(CX + s * ax, ay, h.armR * 0.75, h.armR * 0.7).set({ fur: false }), R]);
    }
    if (withHead) { hs0 = ops.length; ops.push([new Part((X, Y) => h.hair(X, Y, dir, CX + hdx, hcy + uy + hdy)).ell(CX + hdx, hcy + uy + hdy, hrx, hry).set({ fur: false }), R]); if (dir === 'down') ops.push(fringeShade(R, hcy + uy + hdy, hry)); }
    if (hEm === 'cover_mouth' && dir === 'down' && withHead) ops.push([new Part('S').ell(CX + 0.6, hcy + hry * 0.62 + uy, h.armR * 0.95, h.armR * 0.8).set({ fur: false }), R]); // 손이 입을 가린다
    if (REACH.has(hEm) && dir === 'down') ops.push([new Part('S').ell(CX + h.tw - 0.4, h.sh + 6 + uy, h.armR * 0.95, h.armR * 0.85).set({ fur: false }), R]); // 내민 손은 몸 앞에 온다
    if (hEm === 'block' && dir === 'down' && withHead) { // 팔을 들어 얼굴 앞을 막는다. 소매가 손등까지 덮는다
      ops.push([new Part((_X, Y) => arm(Y)).path([CX + h.tw + 0.4, h.sh + 1 + uy, CX + 3.4, hcy + hry * 0.5 + uy, CX - 2.6, hcy + uy], h.armR * 1.05, h.armR * 0.9).set({ fur: false }), R]);
      ops.push([new Part('S').ell(CX - 3.2, hcy - 0.4 + uy, h.armR * 0.8, h.armR * 0.7).set({ fur: false }), R]);
    }
  } else {
    const f = sit ? 0 : step === 1 ? 2.4 : step === 3 ? -2.4 : 0, a = -f * 0.5;
    // 주저앉으면 무릎이 조금 서고 다리가 앞으로 뻗는다. 발끝이 선다.
    const leg = (dx: number): number[] => (floor ? [CX - 0.6 + dx, lt - 1, CX + 4 + dx, lt - 2.6, CX + 7.4 + dx, 52.2] : [CX - 0.3 - f * 0.3 + dx, lt, CX - f + dx, 52]);
    const foot = (dx: number): [number, number, number, number] => (floor ? [CX + 8.6 + dx, 51.6, h.foot[1] + 0.2, h.foot[0]] : [CX - f + 1.1 + dx, 53, h.foot[0] + 0.4, h.foot[1]]);
    ops.push([new Part('L').path(leg(floor ? -1 : 0), h.legR, h.legR * 0.9).set({ dim: 1, fur: false }), R]);
    ops.push([new Part('F').ell(...foot(floor ? -1 : 0)).set({ dim: 1, fur: false }), R]);
    ops.push([new Part((_X, Y) => arm(Y)).path(floor ? [CX - 0.6, h.sh + 1.2 + uy, CX - 3.4, 51] : [CX - 0.6, h.sh + 1.2 + uy, CX - 0.6 - a, h.hem - 2.4 + uy], h.armR, h.armR * 0.85).set({ dim: 1, fur: false }), R]);
    ops.push([new Part('L').ell(CX, h.hip + uy, h.tw * 0.82, 2.4).set({ fur: false }), R]);
    ops.push([new Part((X, Y) => (h.torso ? h.torso(X, Y, dir) : 'T')).poly([CX - h.tw * 0.8, h.sh + uy, CX + h.tw * 0.8, h.sh + uy, CX + h.tw * 0.78, h.hem + uy, CX - h.tw * 0.78, h.hem + uy]).ell(CX, h.sh + 1 + uy, h.tw * 0.82, 2.2).set({ fur: false }), R]);
    if (floor) {
      ops.push([new Part('L').path(leg(0.4), h.legR, h.legR * 0.9).set({ fur: false }), R]);
      ops.push([new Part('F').ell(...foot(0.4)).set({ fur: false }), R]);
    } else {
      ops.push([new Part('L').path([CX + 0.3 + f * 0.3, lt, CX + f, 52], h.legR, h.legR * 0.9).set({ fur: false }), R]);
      ops.push([new Part('F').ell(CX + f + 1.1, 53, h.foot[0] + 0.4, h.foot[1]).set({ fur: false }), R]);
    }
    const hx = floor ? CX + 4.2 : CX + 0.4 + a, hy = floor ? lt - 2.8 : h.hem - 1.2 + uy; // 주저앉으면 손이 무릎에 얹힌다
    ops.push([new Part((_X, Y) => arm(Y)).path([CX + 0.2, h.sh + 1.2 + uy, hx, hy - 1.2], h.armR, h.armR * 0.85).set({ fur: false }), R]);
    ops.push([new Part('S').ell(hx, hy, h.armR * 0.75, h.armR * 0.7).set({ fur: false }), R]);
    if (withHead) { hs0 = ops.length; ops.push([new Part((X, Y) => h.hair(X, Y, dir, CX + hdx * 0.5, hcy + uy + hdy)).ell(CX - 0.3 + hdx * 0.5, hcy + uy + hdy, hrx - 0.3, hry).set({ fur: false }), R]); ops.push(fringeShade(R, hcy + uy + hdy, hry)); }
    if (hEm === 'block' && withHead) { // 옆에서: 굽힌 팔뚝이 얼굴 앞에 선다
      ops.push([new Part((_X, Y) => arm(Y)).path([CX + 0.4, h.sh + 1.2 + uy, CX + hrx + 2.6, h.sh + 1.6 + uy, CX + hrx + 1.8, hcy + 1.2 + uy], h.armR * 1.05, h.armR * 0.9).set({ fur: false }), R]);
      ops.push([new Part('S').ell(CX + hrx + 1.6, hcy + 0.6 + uy, h.armR * 0.8, h.armR * 0.7).set({ fur: false }), R]);
    }
    if (REACH.has(hEm) || hEm === 'cover_mouth') ops.push([new Part('S').ell(hEm === 'cover_mouth' ? CX + hrx - 0.4 : CX + h.tw + 2.6, hEm === 'cover_mouth' ? hcy + hry * 0.6 + uy : h.sh + 4 + uy, h.armR * 0.85, h.armR * 0.75).set({ fur: false }), R]);
  }
  const cut = hs0 < 0 ? ops.length : hs0;
  return { ops, top: Math.floor(hcy + uy - hry), head: ops.slice(cut), body: ops.slice(0, cut) };
}
/** 앞머리 바로 밑의 그늘. 사람에게는 이목구비를 그리지 않는다(11장). 대신 눈이 있을 자리에 머리카락 그림자가 진다.
 *  빈 살색 얼굴은 마네킹처럼 보인다. 그늘이 지면 '가려진 얼굴'로 읽힌다. */
function fringeShade(R: Ramps, cy: number, ry: number): Op {
  return (p) => {
    const hair = new Set(R.H), skin = new Set(R.S), deep = R.H[3];
    const hx = (x: number, y: number): string => { const i = (y * p.w + x) * 4; return '#' + [0, 1, 2].map((k) => p.d[i + k].toString(16).padStart(2, '0')).join(''); };
    for (let x = 0; x < p.w; x++) for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(p.h - 2, Math.ceil(cy + ry)); y++) {
      if (!p.alpha(x, y) || !hair.has(hx(x, y))) continue;
      if (!p.alpha(x, y + 1) || !skin.has(hx(x, y + 1))) continue;
      p.set(x, y + 1, mix(hx(x, y + 1), deep, 0.5));
      if (p.alpha(x, y + 2) && skin.has(hx(x, y + 2))) p.set(x, y + 2, mix(hx(x, y + 2), deep, 0.18));
    }
  };
}

// 윤재. 머리가 눈을 덮었다. 목이 늘어난 티셔츠. 한여름인데 긴소매. 소매는 손등까지 내려온다.
const YJ_R: Ramps = {
  H: ['#3b3547', '#27222f', '#1c1823', '#120f17'],
  S: ['#f0d3ba', '#e0ba9e', '#c49681', '#9a6e63'],
  T: ['#8b91a5', '#6d7388', '#535971', '#3d4258'],
  L: ['#4b4f67', '#373b51', '#292c3e', '#1d1f2d'],
  F: ['#d9d3c9', '#b7afa3', '#8e867c', '#625b54'],
};
const yjHair = (X: number, Y: number, dir: Dir, c: number, cy: number): string => {
  if (dir === 'up') return Y > cy + 3.6 && Math.abs(X - c) < 2.2 ? 'S' : 'H';
  if (dir === 'down') {
    if (Y < cy + 1.4) return 'H';
    if (Math.abs(X - c) > 3.3) return Y < cy + 4.2 ? 'H' : 'S';
    if (Y < cy + 2.6 && Math.floor(X) % 2 === 0) return 'H'; // 앞머리 끝이 들쭉날쭉하다
    return 'S';
  }
  if (X > c + 1 && Y > cy + 1.2) return Y < cy + 2.2 && X < c + 3 ? 'H' : 'S';
  return 'H';
};
// 엔딩 A: 얼굴이 생기는 순간. 앞머리가 이마 위로 걷혀서 눈과 입이 보인다.
const yjHairBare = (X: number, Y: number, dir: Dir, c: number, cy: number): string => {
  if (dir !== 'down') return yjHair(X, Y, dir, c, cy);
  if (Y < cy - 0.9) return 'H';
  if (Math.abs(X - c) > 3.4) return Y < cy + 3.4 ? 'H' : 'S';
  return 'S';
};
const YJ: HSpec = {
  R: YJ_R, head: [19.6, 4.9, 5.5], hair: yjHair, sh: 27, hem: 41.4, hip: 40.6, tw: 5.3,
  armR: 1.8, legR: 2.1, legW: 2.5, sleeve: (y) => (y > 12.6 ? 'S' : 'T'), foot: [2.4, 1.6], collar: true,
};
// 국방색 의류대. 전역하던 날 메고 나온 원통형 가방을 등에 비스듬히 멨다. 안에 삼색이가 접혀 들었고,
// 지퍼 끝으로 주황 털이 조금 삐져나온다. behind 는 몸보다 먼저, front 는 몸 위·머리 아래에 그린다.
const BAG_R: Ramps = {
  B: ['#8e935c', '#6f7446', '#555a37', '#3c3f27'],
  W: ['#646844', '#4d5135', '#3c3f29', '#2b2d1d'],
  O: ['#f8bd72', '#ee9440', '#cc712b', '#9c5220'],
};
function bagOps(d: Dir, step: number): { behind: Op[]; front: Op[] } {
  const uy = step === 1 || step === 3 ? 1 : 0, sh = YJ.sh + uy;
  const tube = (x0: number, y0: number, x1: number, y1: number): Op => [new Part('B').path([x0, y0 + uy, x1, y1 + uy], 3.5, 3.3).set({ fur: false }), BAG_R];
  const strap = (pts: number[]): Op => [new Part('W').path(pts.map((v, i) => (i % 2 ? v + uy : v)), 0.75, 0.75).set({ fur: false }), BAG_R];
  const tuft = (x: number, y: number, flip = 1): Op => (q) => { // 지퍼 끝에서 삐져나온 털 세 가닥
    const Y = Math.round(y + uy), X = Math.round(x);
    q.set(X, Y, BAG_R.O[1]); q.set(X + flip, Y - 1, BAG_R.O[0]); q.set(X - flip, Y - 1, BAG_R.O[2]); q.set(X, Y - 2, BAG_R.O[1]);
  };
  const zip = (x0: number, y0: number, x1: number, y1: number): Op => (q) => { // 지퍼 선: 한 칸씩 밝은 이빨
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) { const t = i / n; q.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + uy + (y1 - y0) * t), i % 2 ? '#2b2d1d' : '#a9ad78'); }
  };
  if (d === 'down') return { // 앞에서: 왼쪽 어깨 위로 윗동이, 오른쪽 허리 옆으로 밑동이 보인다
    behind: [tube(CX - 7, 22.5, CX + 7, 40), tuft(CX - 8.6, 20.6)],
    front: [strap([CX - 3.4, sh + 0.4, CX - 2.6, sh + 9.5]), strap([CX + 3.4, sh + 0.4, CX + 2.6, sh + 9.5])],
  };
  if (d === 'up') return { // 뒤에서: 등을 비스듬히 덮는다. 지퍼가 길게 지나간다
    behind: [],
    front: [tube(CX + 7, 22.5, CX - 7, 40), zip(CX + 8, 21.6, CX - 6.4, 38.4), tuft(CX + 8.4, 20.8, -1),
      strap([CX - 4.2, sh, CX - 3.8, sh + 3.4]), strap([CX + 4.2, sh, CX + 3.8, sh + 3.4])],
  };
  return { // 옆에서 (오른쪽을 본다): 등 뒤에 세워 멨다. 가슴으로 끈 하나
    behind: [tube(CX - 5.6, 22, CX - 4.4, 39.5), zip(CX - 8.4, 22, CX - 7.6, 37), tuft(CX - 6.4, 19.6)],
    front: [strap([CX - 1.6, sh + 0.2, CX + 2.4, sh + 4.6, CX + 2.2, sh + 10])],
  };
}

// 하은. 여덟 살. 반팔 잠옷에 잠옷 바지, 분홍 슬리퍼. 단발.
const HA_R: Ramps = {
  H: ['#40343f', '#2c232e', '#1f1822', '#141016'],
  S: ['#ffe2cb', '#f5caae', '#dba78f', '#b37d6c'],
  T: ['#fff1b6', '#f2da90', '#d5b66d', '#a88a4c'],
  L: ['#b6d3ee', '#90b5d8', '#6d90bb', '#4e6b94'],
  F: ['#ffc6d3', '#f396ae', '#d06b88', '#a04c66'],
};
const HA: HSpec = {
  R: HA_R, head: [32.3, 4.5, 4.4], sh: 38.2, hem: 45.4, hip: 45.2, tw: 3.6, armR: 1.25, legR: 1.5, legW: 1.7, foot: [2, 1.2],
  sleeve: (y) => (y > 3 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => {
    if (dir === 'up') return Y > cy + 3.4 && Math.abs(X - c) < 1.8 ? 'S' : 'H';
    if (dir === 'down') {
      if (Y < cy - 0.6) return 'H';
      if (Math.abs(X - c) > 2.8) return Y < cy + 3.8 ? 'H' : 'S';
      if (Y < cy + 0.4 && Math.floor(X) % 2 === 1) return 'H';
      return 'S';
    }
    return X > c + 0.6 && Y > cy - 0.8 && Y < cy + 4 ? 'S' : 'H';
  },
};
// 박씨. 경비 모자, 남색 제복, 희끗한 옆머리.
const GD_R: Ramps = {
  H: ['#50668f', '#35476b', '#273452', '#1a233a'], // 모자
  A: ['#babcc3', '#90939c', '#6d7079', '#4b4d55'], // 옆머리
  S: ['#e8c5a6', '#cfa687', '#b0876d', '#866051'],
  T: ['#48597f', '#35455f', '#28354a', '#1b2435'],
  L: ['#2e313d', '#23252f', '#1a1c24', '#111218'],
  F: ['#2a2a32', '#1b1b21', '#131317', '#0a0a0d'],
};
const GD: HSpec = {
  ...YJ, R: GD_R, head: [19.6, 5, 5.4], tw: 5.7, collar: false, sleeve: (y) => (y > 12.6 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => {
    if (Y < cy - 0.6) return 'H';
    if (dir === 'up') return Y > cy + 3.4 ? 'S' : 'A';
    if (dir === 'down') return Math.abs(X - c) > 3.3 && Y < cy + 3 ? 'A' : 'S';
    return X > c + 0.8 ? 'S' : Y < cy + 3 ? 'A' : 'S';
  },
};
// 경찰관 (엔딩 A). 새벽 출동이라 남색 근무복 위에 형광 조끼. 정모. 얼굴은 없다.
const PO_R: Ramps = {
  H: ['#3a4766', '#26304a', '#1b2238', '#11162a'], // 모자
  A: ['#3c4a6e', '#2b3654', '#1f2740', '#141a2c'], // 근무복 소매
  S: ['#e2c0a2', '#c9a183', '#ab8269', '#82604f'],
  T: ['#e8f86a', '#c8e042', '#9ab82e', '#6e8a22'], // 형광 조끼
  L: ['#2b3350', '#20263c', '#171c2e', '#0f1320'],
  F: ['#1e1e24', '#141418', '#0e0e11', '#08080a'],
};
const PO: HSpec = {
  ...GD, R: PO_R, head: [19.4, 5, 5.4], tw: 5.9, sleeve: (y) => (y > 12.6 ? 'S' : 'A'),
  hair: (X, Y, dir, c, cy) => {
    if (Y < cy - 0.2) return 'H';
    if (dir === 'down' && Y < cy + 0.6 && Math.abs(X - c) < 4.2) return 'F'; // 모자챙
    if (dir === 'up') return Y > cy + 3.4 ? 'S' : 'H';
    if (dir === 'down') return Math.abs(X - c) > 3.3 && Y < cy + 2.4 ? 'H' : 'S';
    return X > c + 0.8 ? (Y < cy + 0.6 ? 'F' : 'S') : Y < cy + 2.4 ? 'H' : 'S';
  },
};
const ramp = (a: string, b: string, c: string, d: string): Ramp => [a, b, c, d];
const SIL_R: Ramps = Object.fromEntries(['H', 'A', 'S', 'T', 'L', 'F'].map((k) => [k, k === 'S' || k === 'T' ? ramp('#2a2c35', '#1c1e25', '#14151b', '#0b0c10') : ramp('#202128', '#15161c', '#0f1014', '#08090c')]));
// 엄마. 쉰 중반. 식당 일을 하고 막 들어왔다. 짧게 볶은 파마에 흰머리가 섞였고, 바랜 장밋빛 블라우스, 남색 바지, 회색 슬리퍼.
// 윤재보다 머리 하나 작다.
const MO_R: Ramps = {
  H: ['#6a5652', '#4a3a38', '#342828', '#221a1a'],
  A: ['#b8b0ac', '#948c88', '#726a66', '#524c4a'],
  S: ['#efcfb4', '#d8b294', '#b88e74', '#8e6656'],
  T: ['#c8a8a8', '#a8888c', '#87686e', '#614a52'],
  L: ['#3c4050', '#2e313e', '#22252e', '#17191f'],
  F: ['#9a9aa2', '#7a7a84', '#5a5a64', '#3e3e46'],
};
const MO: HSpec = {
  ...YJ, R: MO_R, head: [22.6, 5.2, 5.2], sh: 29.4, hem: 42.6, hip: 42.2, tw: 4.7, armR: 1.6, legR: 1.9, legW: 2.2, collar: false,
  sleeve: (y) => (y > 11.4 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => { // 볶은 머리: 귀를 덮고 둥글게 부푼다. 정수리 쪽에 흰 가닥.
    const grey = Math.floor(X * 3 + Y * 5) % 11 === 0 ? 'A' : 'H';
    if (Y < cy - 0.4) return grey;
    if (dir === 'up') return Y > cy + 3.6 ? 'S' : grey;
    if (dir === 'down') return (Math.abs(X - c) > 3.2 && Y < cy + 3.4) || Y < cy + 0.9 - (Math.floor(X) % 2) * 0.7 ? grey : 'S'; // 볶은 앞머리가 이마에 내려온다
    return X < c - 0.2 || Y < cy + 0.4 ? grey : 'S';
  },
};
const FA: HSpec = { ...GD, R: SIL_R, head: [18, 5.3, 5.6], sh: 25.6, tw: 6.5, armR: 2.2, legR: 2.5, legW: 2.9, hair: () => 'H', sleeve: () => 'T' };
const DIM_R: Ramps = {
  H: ['#30313a', '#23242c', '#1a1b21', '#111216'], A: ['#30313a', '#23242c', '#1a1b21', '#111216'],
  S: ['#9c887a', '#85716b', '#6c5b57', '#504241'], T: ['#474c58', '#373b46', '#2b2e37', '#1f2128'],
  L: ['#31333d', '#262830', '#1d1f25', '#15161b'], F: ['#26262d', '#1c1c22', '#141419', '#0d0d10'],
};
// ── 정모의 사람들 ── 얼굴은 없다. 옷과 머리 모양과 소품으로 가른다.
// 현우: 흰 셔츠에 정장 바지, 구두. 머리를 단정하게 넘겼다. 주머니에 푼 넥타이, 사원증 줄.
const HW_R: Ramps = {
  H: ['#3a3236', '#26201f', '#1a1616', '#0f0d0d'],
  S: ['#f3d8c2', '#e2bea4', '#c49a84', '#9a7062'],
  T: ['#ffffff', '#eceae6', '#c8c8c8', '#8e9096'],
  L: ['#3e424e', '#2b2e38', '#1f2129', '#14151a'],
  F: ['#4a4448', '#2a2628', '#1a1718', '#0e0c0d'],
};
const HW: HSpec = {
  R: HW_R, head: [19.4, 4.8, 5.4], sh: 27, hem: 40.4, hip: 40, tw: 5.1, armR: 1.75, legR: 2.05, legW: 2.4, foot: [2.5, 1.5], collar: true,
  sleeve: (y) => (y > 12.8 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => {
    if (dir === 'up') return Y > cy + 3 && Math.abs(X - c) < 2.6 ? 'S' : 'H';
    if (dir === 'down') return Y < cy - 0.8 || (Math.abs(X - c) > 3.7 && Y < cy + 2.2) || Y < cy + 1.4 - (X - c) * 0.32 ? 'H' : 'S'; // 옆으로 넘긴 앞머리가 비스듬히 이마를 덮는다
    return X < c - 0.4 || Y < cy - 1.2 ? 'H' : 'S';
  },
};
// 모카: 스무 살쯤. 연보라 후드티에 청반바지. 머리띠에 강아지 귀, 허리에 꼬리. 그것만 달았는데도 강아지 같다.
const MK_R: Ramps = {
  H: ['#4a4048', '#2e2630', '#221c24', '#161216'],
  S: ['#ffe0cc', '#f2c6ac', '#d6a48c', '#ac7a6a'],
  T: ['#eadcfa', '#cbb4ec', '#a68ece', '#7c66a4'],
  L: ['#94b8de', '#6f94c0', '#52729c', '#3a5272'],
  F: ['#ffffff', '#e4e2ea', '#b8b4c4', '#7c788a'],
};
const MK: HSpec = {
  R: MK_R, head: [20.4, 4.7, 5.1], sh: 28, hem: 39.6, hip: 39.4, tw: 4.8, armR: 1.7, legR: 1.75, legW: 2.1, foot: [2.2, 1.4], collar: false,
  sleeve: (y) => (y > 11.8 ? 'S' : 'T'),
  torso: (X, Y, dir) => (dir === 'down' && Y > 34.6 && Y < 36.8 && Math.abs(X - CX) < 3.4 ? 'L' : 'T'), // 후드티 앞주머니
  hair: (X, Y, dir, c, cy) => {
    if (dir === 'up') return 'H';
    if (dir === 'down') return Y < cy || Math.abs(X - c) > 3.2 ? 'H' : 'S';
    return X < c + 0.6 || Y < cy - 0.6 ? 'H' : 'S';
  },
};
// 곰표: 사십 대. 회색 티셔츠에 등산복 조끼, 등산화. 구청 민원실. 불곰 풀슈트 십이 년 차. 덩치가 크다.
const GB_R: Ramps = {
  H: ['#9a948e', '#77726c', '#5a5652', '#3e3b38'],
  S: ['#eccaae', '#d8ae92', '#b88a74', '#8c6456'],
  T: ['#b4b8bc', '#93979c', '#74787e', '#55585e'],
  V: ['#c8c08a', '#a8a070', '#847c52', '#5e583a'],
  L: ['#8a8a7a', '#6e6e60', '#56564a', '#3e3e34'],
  F: ['#8a6a48', '#6a4e34', '#4e3824', '#342416'],
};
const GB: HSpec = {
  R: GB_R, head: [18.8, 5.1, 5.4], sh: 26.6, hem: 41.4, hip: 41, tw: 6.3, armR: 2.1, legR: 2.4, legW: 2.8, foot: [2.7, 1.6], collar: true,
  sleeve: (y) => (y > 5 ? 'S' : 'T'),
  torso: (X, Y, dir) => (dir === 'up' ? 'V' : dir === 'down' ? (Math.abs(X - CX) < 1.5 ? 'T' : 'V') : X > CX + 2.6 ? 'T' : 'V'),
  hair: (X, Y, dir, c, cy) => (dir === 'up' ? (Y > cy + 3.4 ? 'S' : 'H') : dir === 'down' ? (Y < cy - 1.4 || (Math.abs(X - c) > 4.2 && Y < cy + 1) ? 'H' : 'S') : X < c - 1.2 || Y < cy - 1.6 ? 'H' : 'S'),
};
// 실밥: 서른 남짓. 헐렁한 카디건, 긴 치마. 머리를 틀어 올렸다. 목에 줄자를 걸었다.
const SB_R: Ramps = {
  H: ['#4a3a3a', '#322626', '#241b1c', '#161011'],
  S: ['#f6dcc8', '#e6c2a8', '#c8a08a', '#9c766a'],
  T: ['#efe4cc', '#d8c8a8', '#b8a682', '#8a7a5c'],
  L: ['#646a7c', '#4c5162', '#3a3e4c', '#282b36'],
  F: ['#5a4a42', '#3e322c', '#2c231f', '#1c1614'],
};
const SB: HSpec = {
  R: SB_R, head: [19.8, 4.7, 5.2], sh: 27.6, hem: 42.4, hip: 41.6, tw: 5.4, armR: 1.85, legR: 2.3, legW: 1.6, foot: [2.2, 1.4], collar: true,
  sleeve: (y) => (y > 13.2 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => (dir === 'up' ? (Y > cy + 3.6 && Math.abs(X - c) < 2 ? 'S' : 'H') : dir === 'down' ? (Y < cy - 0.4 || (Math.abs(X - c) > 3.6 && Y < cy + 2.4) ? 'H' : 'S') : X < c - 0.2 || Y < cy - 1 ? 'H' : 'S'),
};
// 현우의 캐리어. 남색 하드 케이스에 세로 골, 바퀴 둘, 늘인 손잡이. 옆 지퍼 틈으로 여우 꼬리 끝이 삐져나왔다.
// 앞·뒤에서는 몸 옆에 세워 끌고, 옆에서는 몸 뒤로 끌려온다 (몸보다 먼저 그린다).
const CASE = ['#56699a', '#384a74', '#283658', '#1a243c'] as const;
function caseOps(d: Dir, step: number): { behind: Op[]; front: Op[] } {
  const uy = step === 1 || step === 3 ? 1 : 0;
  const draw = (x0: number, hx: number, tail: number): Op => (q) => {
    const w = 9, h = 14, y0 = FOOT - h - 1;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const cx = x === x0 || x === x0 + w - 1, cy = y === y0 || y === y0 + h - 1;
      if (cx && cy) continue; // 둥근 모서리
      q.set(x, y, cx || cy ? LINE : x === x0 + 1 || y === y0 + 1 ? CASE[0] : (x - x0) % 3 === 0 ? CASE[2] : y > y0 + h - 4 ? CASE[2] : CASE[1]);
    }
    q.hl(x0 + 1, y0 + 5, w - 2, CASE[3]); // 가운데 띠
    q.set(x0 + 1, FOOT - 1, '#121216'); q.set(x0 + w - 2, FOOT - 1, '#121216'); // 바퀴
    // 늘인 손잡이: 은색 대 둘, 위에 검은 손잡이
    const top = 36 + uy, mx = x0 + Math.floor(w / 2);
    for (let y = top + 1; y < y0; y++) { const t = (y - top) / (y0 - top), x = Math.round(hx + (mx - hx) * t); q.set(x - 1, y, '#8e959e'); q.set(x + 1, y, '#5e646c'); }
    q.hl(hx - 2, top, 5, '#1a1a20'); q.set(hx - 2, top - 1, LINE); q.set(hx + 2, top - 1, LINE);
    // 지퍼 틈의 여우 꼬리 끝
    if (tail) { const tx = tail > 0 ? x0 + w - 1 : x0, ty = y0 + 5; q.set(tx, ty, '#ee9440'); q.set(tx + tail, ty, '#f8bd72'); q.set(tx + tail, ty + 1, '#ee9440'); q.set(tx + 2 * tail, ty, '#f4f0ea'); }
  };
  if (d === 'down') return { behind: [], front: [draw(CX + 6, CX + 7, 1)] };
  if (d === 'up') return { behind: [], front: [draw(CX - 15, CX - 7, -1)] };
  return { behind: [draw(CX - 17, CX - 4, -1)], front: [] }; // 오른쪽으로 걷는다: 캐리어는 뒤에서 끌려온다
}
/** 사람마다 몸 위에 얹는 것 (머리보다 먼저 그리는 것, 머리 다음에 그리는 것). */
function extraOps(kind: string, d: Dir, step: number, sit: boolean): { mid: Op[]; top: Op[] } {
  const uy = (step === 1 || step === 3 ? 1 : 0) + (sit ? 4 : 0);
  const mid: Op[] = [], top: Op[] = [];
  if (kind === 'hyunwoo' && d !== 'up') mid.push((q) => { // 주머니에 꽂은 넥타이 끝, 삐져나온 사원증 줄
    const x = d === 'down' ? CX - 3 : CX + 1, y = Math.round(HW.hem + uy) - 4;
    q.set(x, y, '#7a2a36'); q.set(x, y + 1, '#5a1e28'); q.set(x + 1, y + 1, '#2a4a8a'); q.set(x + 1, y + 2, '#2a4a8a'); q.set(x + 2, y + 3, '#3a6ac0');
  });
  if (kind === 'moka') {
    const A = SUIT_R.dog.A, cy = MK.head[0] + uy;
    const tail: Op = [new Part('A').path(d === 'up' ? [CX + 1, 38 + uy, CX + 3, 42 + uy, CX + 2.4, 46 + uy] : [CX - 4.4, 38 + uy, CX - 7.2, 41.6 + uy, CX - 7.4, 45.4 + uy], 1.6, 1.1), { A }];
    if (d === 'up') top.push(tail); else mid.push(tail);
    for (const s of d === 'right' ? [-1] : [-1, 1]) top.push([new Part('K').path([CX + s * 3.8, cy - 4.6, CX + s * 6.2, cy - 2.2, CX + s * 6.6, cy + 2.8], 1.7, 2.3), { K: SUIT_R.dog.A }]); // 머리띠의 강아지 귀
    top.push((q) => { for (let x = CX - 4; x <= CX + 4; x++) if (q.alpha(x, Math.round(cy - 4.4))) q.set(x, Math.round(cy - 4.4), '#e86a8a'); }); // 분홍 머리띠
  }
  if (kind === 'gombyo' && d === 'down') mid.push((q) => { const y = Math.round(GB.sh + uy) + 5; q.set(CX - 4, y, '#e8783a'); q.set(CX - 3, y, '#e8783a'); }); // 조끼의 구청 산악회 배지
  if (kind === 'silbap') {
    const cy = SB.head[0] + uy;
    top.push([new Part('H').ell(d === 'right' ? CX - 3.4 : CX, cy - (d === 'up' ? 2.4 : 4.6), 2.6, 2.2), SB_R]); // 틀어 올린 머리
    if (d === 'down') mid.push((q) => { const y0 = Math.round(SB.sh + uy); for (const x of [CX - 2, CX + 2]) for (let y = y0 + 1; y < y0 + 9; y++) q.set(x, y, y % 2 ? '#f2d24a' : '#c8a830'); }); // 목에 건 줄자
  }
  return { mid, top };
}
const PS: HSpec = { ...YJ, R: DIM_R, collar: false, hair: (X, Y, dir, c, cy) => (dir === 'up' || Y < cy || (dir !== 'down' && X < c + 1) ? 'H' : 'S') };
// 지나가는 사람들: 얼굴은 없고, 머리색·피부·옷만 다르다. 지하철과 환승 통로를 채운다.
const ramp1 = (a: string): Ramp => [mix(a, '#ffffff', 0.2), a, mix(a, '#000000', 0.22), mix(a, '#000000', 0.42)];
const CROWD: { h: string; s: string; t: string; l: string; f: string; perm?: boolean; long?: boolean }[] = [
  { h: '#26252c', s: '#c8a08a', t: '#3a4660', l: '#2c2e36', f: '#1e1e24' },
  { h: '#4a3a32', s: '#e0bca0', t: '#c8b89a', l: '#4a4e5a', f: '#e8e4dc', long: true },
  { h: '#8a8884', s: '#c09a84', t: '#6a5a4e', l: '#3a3a40', f: '#2a2620', perm: true },
  { h: '#1e1d22', s: '#d6b096', t: '#e4e2dc', l: '#2a3a5a', f: '#d8d4cc' },
  { h: '#3a2e2a', s: '#b88e78', t: '#5a6a4a', l: '#2e2e34', f: '#26241e', long: true },
  { h: '#2a2930', s: '#d8b8a0', t: '#7a3a44', l: '#3a3c48', f: '#1e1c22' },
  { h: '#5a4a3e', s: '#caa48c', t: '#8a8e96', l: '#24262e', f: '#3a3632', perm: true },
];
const crowdSpec = (v: number): HSpec => {
  const c = CROWD[((v % CROWD.length) + CROWD.length) % CROWD.length];
  const R: Ramps = { H: ramp1(c.h), A: ramp1(mix(c.h, '#ffffff', 0.4)), S: ramp1(c.s), T: ramp1(c.t), L: ramp1(c.l), F: ramp1(c.f) };
  if (c.perm) return { ...MO, R };
  if (c.long) return { ...YJ, R, collar: false, hair: (X, Y, dir, cx, cy) => (Y < cy + (dir === 'up' ? 7 : 0.2) || (dir !== 'up' && Math.abs(X - cx) > 2.6 && Y < cy + 7) ? 'H' : 'S') };
  return { ...PS, R };
};
// 할머니: 작고 허리가 조금 굽었다. 흰머리를 뒤로 쪽졌다. 꽃무늬 블라우스, 몸빼 바지. (4장, 색이 있는 장면)
const GM_R: Ramps = { H: ramp1('#a8a39c'), A: ramp1('#d4d0ca'), S: ramp1('#d0a284'), T: ramp1('#b07ab8'), L: ramp1('#3a4a6a'), F: ramp1('#6a5a4a') };
const GM: HSpec = {
  ...MO, R: GM_R, head: [25.2, 5, 5], sh: 31.6, hem: 43.6, hip: 43.2, tw: 4.4,
  sleeve: (y) => (y > 10.4 ? 'S' : 'T'),
  hair: (X, Y, dir, c, cy) => { if (dir === 'up') return Y > cy + 4 ? 'S' : 'H'; if (Y < cy - 0.2) return 'H'; return dir !== 'down' && X < c - 1.6 && Y < cy + 3 ? 'H' : 'S'; },
};
// 아이 (지하철에서 가방을 본 아이): 하은보다 조금 작고 노란 우비
const KD: HSpec = { ...HA, R: { ...HA_R, T: ramp1('#e8c84a'), L: ramp1('#4a6a9a'), F: ramp1('#e8e4dc'), H: ramp1('#2a2430') } };
// 윤서 (열일곱, 4장의 식탁): 긴 생머리, 교복 블라우스
const YS_R: Ramps = { H: ramp1('#1e1c22'), A: ramp1('#2e2c34'), S: ramp1('#e6c2a6'), T: ramp1('#e8e6e2'), L: ramp1('#3a3e58'), F: ramp1('#e4e2dc') };
const YS: HSpec = { ...MO, R: YS_R, head: [22.4, 5, 5.1], tw: 4.3, hair: (X, Y, dir, c, cy) => (Y < cy + (dir === 'up' ? 9 : 0.1) || (dir !== 'up' && Math.abs(X - c) > 2.5 && Y < cy + 9) ? 'H' : 'S') };
// 편의점 알바: 초록 조끼
const CK: HSpec = { ...PS, R: { ...DIM_R, H: ramp1('#2a2830'), S: ramp1('#c8a48c'), T: ramp1('#3a7a5a'), L: ramp1('#2a2c34') } };

// ── 진짜 고양이 ──
const RC: Pal = { o: '#0e0d12', k: '#2b2a33', K: '#3f3e4a', Y: '#d9e06a', E: '#14121a', n: '#d98a96', W: '#cfcac4' };
const RC_SIT = ['.oo....oo...', 'okko..okko..', 'okkkookkko..', 'okKkkkkKko..', 'okYEkkYEko..', 'okkkknkkko..', '.okkkkkko.oo', '.okkWWkkooko', '.okkWWkkkkko', '.okkkkkkkko.', '..oooooooo..'];
const RC_WALK = ['o..........o.o.', 'oo........okoko', '.oo......okkkko', '.okoooooookYkno', '..okKKkkkkkkko.', '..okkkkkkkkko..', '..okkokkkokko..'];
const RC_LEGS = [['..oko.oo.oko...', '..oo......oo...'], ['...okoo.oko....', '....oo...oo....']];

function run(ops: Op[], p: Pix): void { for (const op of ops) { if (typeof op === 'function') op(p); else stamp(p, op[0], op[1], FURRY.has(op[1])); } }

const cache = new Map<string, Pix>();
/** 한 사람의 한 장면. ph 는 감정표현의 박자 (0/1). */
export function charFrame(look: Look, dir: Dir, step: number, pose = 'stand', emote = '', ph = 0, idle: Idle = {}): Pix {
  const tl = Math.max(-1, Math.min(1, Math.round(idle.tail || 0))), br = idle.br ? 1 : 0;
  idle = { tail: tl, br };
  const key = `${look.kind}${look.v ?? ''}/${look.mark || ''}/${look.droopy ? 1 : 0}${look.eyes ? 1 : 0}${look.bare ? 1 : 0}${look.bag ? 1 : 0}${look.case ? 1 : 0}${look.hold ? 1 : 0}${look.parts ?? ''}/${dir}/${step}/${pose}/${emote}/${ph}/${tl}${br}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const left = dir === 'left';
  const d: Dir = left ? 'right' : dir;
  const sit = pose === 'sit' || pose === 'curl' || pose === 'floor';
  const hs: boolean | 'floor' = pose === 'floor' ? 'floor' : sit; // 사람 몸만 바닥에 주저앉는다. 탈 쓴 몸은 그냥 앉는다.
  if (sit) step = 0;
  const p = new Pix(FW, FH);
  const ops: Op[] = [];
  const droopy = !!look.droopy;
  curMark = look.mark || '';
  const hdx = emote === 'tilt' ? 1 : emote === 'shake' ? (ph ? 1 : -1) : 0, hdy = (emote === 'nod' || emote === 'tilt') && ph ? 1 : 0;
  hEm = emote; hPh = ph;
  if (pose === 'lie') { // 이불 밖으로 머리만 나온다
    if (look.kind === 'yunjae' || look.kind === 'person' || look.kind === 'yunseo') ops.push(...humanOps(look.kind === 'yunseo' ? YS : YJ, 'down', 0, false, true).head);
    else ops.push(...catHeadOps('down', CX, 0, droopy, false, false));
  } else switch (look.kind) {
    case 'cat': {
      const s = suitOps(d, step, sit, emote, ph, left, idle);
      ops.push(...s.under, ...s.arms, ...s.ruff, ...catHeadOps(d, CX + hdx, s.uy + hdy, droopy, false, left), ...s.last);
      break;
    }
    case 'cat_nohead': { // 탈을 벗었다. 윤재의 머리가 목털 위에 있고, 고양이 머리는 배 앞에 안았다 (뒤에서는 안 보인다).
      const s = suitOps(d, step, sit, d === 'up' || !look.hold ? emote : 'hold', ph, left, { ...idle, parts: look.parts });
      ops.push(...s.under, ...s.ruff, ...humanOps({ ...YJ, head: [22.2, 4.6, 5.2] }, d, step, sit, true).head);
      if (d !== 'up' && look.hold) ops.push(...catHeadOps('down', CX + (d === 'down' ? 0 : 6), 21 + s.uy, droopy, false, false));
      ops.push(...s.arms, ...s.last);
      break;
    }
    case 'yunjae_cathead': {
      const h = humanOps(YJ, d, step, hs, false);
      ops.push(...h.ops, ...catHeadOps(d, CX + hdx, 1 + (step === 1 || step === 3 ? 1 : 0) + (pose === 'floor' ? FLOOR_D : sit ? 4 : 0) + hdy, droopy, false, left));
      break;
    }
    case 'yunjae': {
      const hh = humanOps(look.bare ? { ...YJ, hair: yjHairBare } : YJ, d, step, hs, true), h = hh.ops;
      if (look.bag && !sit) { const b = bagOps(d, step); ops.push(...b.behind, ...hh.body, ...b.front, ...hh.head); }
      else ops.push(...h);
      if (look.hold && d !== 'up') { // 머리를 안았다: 두 팔 안에 고양이 얼굴이 이쪽을 본다
        const hoy = 20 + (step === 1 || step === 3 ? 1 : 0) + (pose === 'floor' ? FLOOR_D : sit ? 4 : 0);
        ops.push(...catHeadOps('down', CX + (d === 'down' ? 0 : 5), hoy, droopy, false, false));
      }
      if (look.bare && d !== 'up') { // 앞머리 밑으로 눈이 보이고, 입이 생긴다. 이 게임에서 사람에게 생기는 마지막 얼굴이다.
        const ey = hh.top + 7, my = hh.top + 9;
        ops.push((q) => {
          if (d === 'down') { for (const x of [CX - 2, CX + 1]) q.set(x, ey, '#2a2230'); q.set(CX - 1, my, '#8a5a50'); q.set(CX, my, '#8a5a50'); }
          else { q.set(CX + 3, ey, '#2a2230'); q.set(CX + 4, my, '#8a5a50'); }
        });
      }
      break;
    }
    case 'haeun': {
      const hh = humanOps(HA, d, step, hs, true, emote === 'wave' ? (ph ? 0.8 : -0.4) : false);
      ops.push(...hh.ops);
      if (look.eyes && d !== 'up') { // 2장부터 아주 희미하게. 윤재가 처음으로 '본' 사람이다.
        const ey = Math.round(HA.head[0]) + 1 + (step === 1 || step === 3 ? 1 : 0) + (hs === 'floor' ? FLOOR_D : hs ? 4 : 0);
        ops.push((q) => { for (const x of d === 'down' ? [CX - 2, CX + 1] : [CX + 2]) if (q.alpha(x, ey)) q.set(x, ey, '#6a4a48', 0.55); });
      }
      break;
    }
    case 'hyunwoo': case 'moka': case 'gombyo': case 'silbap': {
      const spec = { hyunwoo: HW, moka: MK, gombyo: GB, silbap: SB }[look.kind];
      const hh = humanOps(spec, d, step, sit, true), x = extraOps(look.kind, d, step, sit);
      const k = look.case && !sit ? caseOps(d, step) : { behind: [], front: [] };
      ops.push(...k.behind, ...hh.body, ...x.mid, ...hh.head, ...x.top, ...k.front);
      break;
    }
    case 'fox': case 'rabbit': case 'dog': case 'bear': {
      const s = furOps(look.kind, d, step, sit, emote, ph, idle);
      ops.push(...s.under, ...s.arms, ...s.ruff, ...furHeadOps(look.kind, d, CX + hdx, s.uy + hdy - (look.kind === 'bear' ? 1 : 0)), ...s.last);
      break;
    }
    case 'fox_nohead': { // 여우 몸에 사람 머리. 젖은 앞머리가 이마에 붙었다. 여우 머리는 배 앞에 안았다.
      const s = furOps('fox', d, step, sit, d === 'up' ? emote : 'hold', ph, idle);
      ops.push(...s.under, ...s.ruff, ...humanOps({ ...HW, head: [22.2, 4.6, 5.2] }, d, step, sit, true).head);
      if (d !== 'up') ops.push((q) => { for (const [x, y] of [[CX - 2, 19], [CX + 1, 20], [CX - 3, 21]] as const) if (q.alpha(x, y + s.uy)) q.set(x, y + s.uy, '#5a5054'); }); // 물기
      if (d !== 'up') ops.push(...furHeadOps('fox', 'down', CX + (d === 'down' ? 0 : 6), 21 + s.uy));
      ops.push(...s.arms, ...s.last);
      break;
    }
    case 'guard': ops.push(...humanOps(GD, d, step, hs, true).ops); break;
    case 'police': {
      ops.push(...humanOps(PO, d, step, hs, true).ops);
      if (d !== 'up') ops.push((q) => { // 조끼의 반사띠 두 줄과 어깨의 무전기
        for (let x = 0; x < FW; x++) for (const y of [29, 33]) { const yy = y + (step === 1 || step === 3 ? 1 : 0) + (hs === 'floor' ? FLOOR_D : hs ? 4 : 0); if (q.alpha(x, yy) && Math.abs(x - CX) < 6) q.set(x, yy, '#e8eef0'); }
        const rx = d === 'down' ? CX - 4 : CX + 1; q.set(rx, 26, '#1a1a20'); q.set(rx, 27, '#1a1a20'); q.set(rx, 25, '#3a3a44');
        const by = 17 + (step === 1 || step === 3 ? 1 : 0) + (hs === 'floor' ? FLOOR_D : hs ? 4 : 0); if (d === 'down') { q.set(CX - 1, by, '#e0c050'); q.set(CX, by, '#b89a3a'); } else q.set(CX + 3, by, '#e0c050'); // 모자의 휘장
      });
      break;
    }
    case 'mother': ops.push(...humanOps(MO, d, step, hs, true).ops); break;
    case 'person': ops.push(...humanOps(look.v === undefined ? PS : crowdSpec(look.v), d, step, hs, true).ops); break;
    case 'grandma': ops.push(...humanOps(GM, d, step, hs, true, emote === 'wave' ? (ph ? 0.8 : -0.4) : false).ops); break;
    case 'kid': ops.push(...humanOps(KD, d, step, hs, true, emote === 'wave' ? (ph ? 0.8 : -0.4) : false).ops); break;
    case 'yunseo': ops.push(...humanOps(YS, d, step, hs, true).ops); break;
    case 'clerk': ops.push(...humanOps(CK, d, step, hs, true).ops); break;
    case 'nabi': // 할머니의 고양이. 삼색이와 같은 주황·검정·흰색.
      ops.push((q) => {
        const pal: Pal = { ...RC, k: '#f2ece2', K: '#e8843a', E: '#2a2018', Y: '#c8b84a', W: '#ffffff', o: '#2a1e18' };
        const s0 = step === 0 || step === 2;
        if (s0) q.blit(sprite(RC_SIT, pal), CX - 6, 44); else { q.blit(sprite(RC_WALK, pal), CX - 8, 46); q.blit(sprite(RC_LEGS[step % 2], pal), CX - 8, 53); }
        // 얼룩: 주황과 검정 조각
        for (let y = 40; y < FH; y++) for (let x = 0; x < FW; x++) {
          if (!q.alpha(x, y)) continue;
          const i = (y * FW + x) * 4; if (q.d[i] < 0x80) continue; // 테두리·눈은 그대로
          const n = Math.sin(x * 0.9 + y * 0.5) + Math.cos(x * 0.4 - y * 1.1);
          if (n > 1.1) q.set(x, y, '#e8843a'); else if (n < -1.2) q.set(x, y, '#2a2428');
        }
      });
      break;
    case 'father': {
      const h = humanOps(FA, d, step, hs, true);
      ops.push(...h.ops);
      if (emote === 'hold' && d !== 'up') { // 삼색이의 머리를 두 손으로 잡았다
        const m = curMark; curMark = 'torn';
        ops.push(...catHeadOps('down', CX + (d === 'down' ? 0 : 6), FA.sh - 7, false, false, false));
        curMark = m;
      }
      if (look.eyes && d !== 'up') { // 3장에서 처음으로 눈이 생긴다
        const ey = Math.round(FA.head[0]) + 1;
        ops.push((q) => { for (const x of d === 'down' ? [CX - 3, CX + 2] : [CX + 3]) q.set(x, ey, '#b4372c'); });
      }
      break;
    }
    case 'catreal':
      ops.push((q) => {
        if (step === 0 || step === 2) q.blit(sprite(RC_SIT, RC), CX - 6, 44);
        else { q.blit(sprite(RC_WALK, RC), CX - 8, 46); q.blit(sprite(RC_LEGS[step % 2], RC), CX - 8, 53); }
      });
      break;
  }
  // 왼쪽을 보면 통째로 뒤집는다.
  run(ops, p);
  hEm = ''; hPh = 0;
  let out = left ? (() => { const q = new Pix(FW, FH); q.blit(p, 0, 0, true); return q; })() : p;
  if (pose === 'stoop') out = stoopOf(out, dir);
  cache.set(key, out);
  return out;
}

/** 허리와 고개를 숙였다: 발은 그대로 두고 위를 눌러 키를 낮춘다. 머리는 보는 쪽으로 내밀고 아래로 떨군다.
 *  앞이나 뒤를 볼 때는 머리가 어깨 속으로 더 묻힌다. 모든 사람과 탈에 같이 쓴다. */
function stoopOf(src: Pix, dir: Dir): Pix {
  const q = new Pix(FW, FH), side = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  let top = FH; for (let y = 0; y < FH && top === FH; y++) for (let x = 0; x < FW; x++) if (src.alpha(x, y)) { top = y; break; }
  const knee = FOOT - 6, headH = Math.round((FOOT - top) * 0.36), neck = top + headH;
  const K = 0.8, drop = Math.round((knee - neck) * (1 - K)) + (side ? 0 : 1); // 몸통만 눌리고 머리는 그 만큼 내려앉는다
  const srcY = (y: number): number => {
    if (y >= knee) return y;
    const bodyTop = neck + drop;
    if (y >= bodyTop) return Math.round(knee - (knee - y) / ((knee - bodyTop) / (knee - neck)));
    return y - drop; // 머리
  };
  for (let y = 0; y < FH; y++) {
    const sy = srcY(y); if (sy < 0 || sy >= FH) continue;
    const h = FOOT - y;
    const lean = side * (y < neck + drop ? 3 : Math.max(0, (h - 12) * 0.1)); // 고개가 앞으로 나온다
    for (let x = 0; x < FW; x++) {
      const sx = Math.round(x - lean);
      if (sx < 0 || sx >= FW || !src.alpha(sx, sy)) continue;
      const i = (sy * FW + sx) * 4; q.d.set(src.d.subarray(i, i + 4), (y * FW + x) * 4);
    }
  }
  return q;
}

/** 그림에서 빈 자리를 잘라 낸다. */
export function trim(p: Pix): { pix: Pix; x: number; y: number } {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.alpha(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { pix: new Pix(1, 1), x: 0, y: 0 };
  const q = new Pix(x1 - x0 + 1, y1 - y0 + 1);
  q.blit(p, -x0, -y0);
  return { pix: q, x: x0, y: y0 };
}
const tops = new WeakMap<Pix, number>();
/** 그림의 맨 윗줄 (말풍선을 띄울 자리) */
export function topOf(p: Pix): number {
  let v = tops.get(p);
  if (v === undefined) { v = trim(p).y; tops.set(p, v); }
  return v;
}
/** 삼색이의 머리만, 정면. 책상 위에 놓인 머리. blank 면 아직 눈이 없다. */
export function catHeadAlone(blank: boolean, droopy = false, mark: '' | 'torn' | 'sewn' = ''): Pix {
  const k = `alone/${blank}/${droopy}/${mark}`;
  let v = cache.get(k);
  if (!v) { curMark = mark; const p = new Pix(FW, FH); run(catHeadOps('down', CX, 0, droopy, blank, false), p); curMark = ''; v = trim(p).pix; cache.set(k, v); }
  return v;
}
