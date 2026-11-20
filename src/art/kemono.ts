// 큰 그림용 탈 머리. 실제 케모노(일본식) 퍼슈트 사진을 보고 다시 그렸다.
// 사진에서 가져온 것:
//  - 머리는 둥글고 넓다. 볼 털이 바깥 아래로 뻗쳐서 얼굴이 하트/다이아몬드 모양이 된다. 목 밑에 긴 털이 늘어진다.
//  - 귀가 크고 높이 달렸다. 귓속에서 흰 털 뭉치가 삐져나온다.
//  - 눈이 얼굴의 가운데보다 아래, 코 가까이에 크게 붙는다. 바깥 눈꼬리가 올라가고, 위 눈꺼풀 선이 굵고 바깥으로 꼬리가 빠진다.
//    홍채가 눈을 거의 다 채우고(흰자는 가장자리에만), 위가 어둡고 아래가 밝다. 반짝임은 크게 하나, 작게 하나.
//  - 주둥이는 아주 짧다. 작은 코가 눈 바로 밑 가운데, 입은 코 바로 밑에 작게.
//  - 얼굴 가운데(눈 둘레, 주둥이)는 짧고 매끈한 털, 머리 위와 볼과 목은 긴 털. 색은 줄무늬보다 큰 덩어리로 나뉜다.
// 좌표: 머리 가운데가 (0,0), 단위는 도형 한 칸. 오른쪽이 +u, 아래가 +v.
import { Pix, mix, rnd } from './pix.ts';

type Ramp = readonly [string, string, string, string];
type Ramps = Record<string, Ramp>;
export type EarKind = 'cat' | 'fold' | 'fox' | 'rabbit' | 'bear' | 'dog';
export type KSpec = {
  R: Ramps;
  /** 머리 털 색 (u,v, 털결 잡음 0..1) → 램프 열쇠 */
  coat: (u: number, v: number, n: number) => string;
  /** 귀: 보는 쪽 왼쪽, 오른쪽 */
  ears: [EarKind, EarKind];
  earKey: (side: -1 | 1, u: number, v: number) => string;
  inner: string; // 귓속 열쇠
  iris: [string, string, string, string, string]; // 위(깊다) → 아래(밝다), 반사
  slit?: boolean; // 고양잇과: 세로로 긴 동공
  nose: [string, string, string]; // 밝은 면, 몸, 그늘
  muzzle?: number; // 주둥이가 앞으로 나온 정도 (0: 고양이, 1: 개·곰)
  tongue?: boolean;
  smile?: boolean; // 개·곰: ω 대신 넓은 웃는 입
  cheek?: number; // 볼 털 길이 배율
  wide?: number; // 머리 너비 배율
};
export type KOpt = { droopy?: boolean; blank?: boolean; mark?: '' | 'torn' | 'sewn' };

const LINE = '#2a1c26';
const LIGHT = [-0.5, -0.62, 0.6]; // 왼쪽 위에서 오는 빛

/** 털 끝이 뾰족한 덩어리. 각도 a(라디안, +u 축에서 아래로 잰다), 길이 len, 폭 w */
type Tuft = [number, number, number];
function radius(th: number, rx: number, ry: number, tufts: Tuft[]): number {
  const c = Math.cos(th), s = Math.sin(th);
  let r = 1 / Math.sqrt((c / rx) ** 2 + (s / ry) ** 2);
  for (const [a, len, w] of tufts) {
    let d = Math.abs(th - a); if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < w) r += len * (1 - d / w) ** 1.6;
  }
  return r;
}
function inPoly(pts: number[], X: number, Y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inE = (u: number, v: number, cx: number, cy: number, rx: number, ry: number): boolean => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
const segD = (u: number, v: number, x0: number, y0: number, x1: number, y1: number): number => {
  const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((u - x0) * dx + (v - y0) * dy) / l)) : 0;
  return Math.hypot(u - x0 - dx * t, v - y0 - dy * t);
};
/** 털결: 머리 가운데에서 바깥으로 뻗는 가닥. 0..1 */
function strand(u: number, v: number, seed: number, dens = 22): number {
  const th = Math.atan2(v, u), r = Math.hypot(u, v);
  const id = Math.floor((th / Math.PI) * dens + rnd(Math.floor(r * 0.8), seed, 3) * 0.7);
  return rnd(id, Math.floor(r * 0.4), seed);
}
const tone = (b: number): number => (b > 0.8 ? 0 : b > 0.52 ? 1 : b > 0.26 ? 2 : 3);

// ── 귀 (머리 좌표, 보는 쪽 왼쪽 기준 s=-1. 오른쪽은 u 를 뒤집는다) ──
function earShape(kind: EarKind): { out: number[]; inn: number[]; tip?: number } {
  switch (kind) {
    case 'cat': return { out: [-9.6, -2.4, -11.8, -16.4, -10.4, -17.2, -2.2, -8.6], inn: [-8.6, -4.6, -10.4, -14.2, -4.4, -8.4] };
    case 'fold': return { out: [-9.6, -2.4, -11.2, -13.2, -7.6, -14.6, -2.2, -8.6], inn: [-8.4, -5, -9.6, -11.6, -4.6, -8.8] };
    case 'fox': return { out: [-9.8, -2.2, -12.6, -17.6, -11, -18.4, -2.4, -8.8], inn: [-8.8, -4.4, -11.2, -15.2, -4.6, -8.6], tip: -13.6 };
    case 'rabbit': return { out: [-7.2, -6, -10.6, -18, -10.2, -25.6, -7.6, -27.2, -5.2, -25, -3.4, -8.6], inn: [-6.6, -8.6, -8.8, -18, -8.2, -24.4, -6.6, -24.8, -5.4, -17.4, -4.4, -9.2] };
    case 'bear': return { out: [], inn: [] };
    case 'dog': return { out: [], inn: [] };
  }
}

/** p 위에 머리를 찍는다. tf: 판의 (x+.5,y+.5) → 머리 좌표 (u,v). k: 판 한 점이 머리 좌표로 몇 칸인지의 역수(확대 배율). */
export function kemonoHead(p: Pix, tf: (x: number, y: number) => [number, number], k: number, S: KSpec, o: KOpt = {}): void {
  const W = p.w, H = p.h;
  const wide = S.wide ?? 1, ch = S.cheek ?? 1, mz = S.muzzle ?? 0;
  const rx = 10 * wide, ry = 9.4;
  const tufts: Tuft[] = [];
  for (const sgn of [1, -1]) { // 볼 털: 바깥 아래로 세 갈래
    const at = (a: number): number => (sgn > 0 ? a : Math.PI - a);
    tufts.push([at(0.22), 2.6 * ch, 0.4], [at(0.62), 2.2 * ch, 0.36]);
  }
  tufts.push([-Math.PI / 2 - 0.16, 1.5, 0.3], [-Math.PI / 2 + 0.22, 1.1, 0.26]); // 정수리 앞머리
  const id = new Uint8Array(W * H); // 0 빈칸, 1 먼 귀, 2 귀, 3 귓속, 4 머리, 5 주둥이
  const col: string[] = new Array(W * H);
  const hx = (u: number, v: number): boolean => { const th = Math.atan2(v, u); return Math.hypot(u, v) <= radius(th, rx, ry, tufts); };
  const muzzleIn = (u: number, v: number): boolean => mz > 0 && inE(u, v, 0, 4.6, 3.6 + mz * 0.8, 2.6 + mz * 0.5);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = tf(x + 0.5, y + 0.5);
    const i = y * W + x;
    let reg = 0, c = '';
    // 귀: 머리 뒤
    for (const side of [-1, 1] as const) {
      const kind = S.ears[side < 0 ? 0 : 1];
      const lu = side < 0 ? u : -u; // 왼쪽 귀 좌표로
      if (kind === 'bear') {
        if (inE(lu, v, -7.6, -7.4, 3.6, 3.4)) {
          const innr = inE(lu, v, -7.4, -7.0, 2.0, 1.9);
          const n = strand(lu + 7.6, v + 7.4, 7);
          const key = innr ? S.inner : S.earKey(side, u, v);
          const b = 0.62 - (lu + 7.6) * 0.04 - (v + 7.4) * 0.05 + (n - 0.5) * 0.2 - (innr ? 0.15 : 0);
          reg = innr ? 3 : 2; c = S.R[key][tone(b)];
        }
        continue;
      }
      if (kind === 'dog') continue; // 늘어진 귀는 머리 앞에 그린다
      const e = earShape(kind);
      if (o.mark === 'torn' && side > 0 && kind === 'fold') continue;
      if (!inPoly(e.out, lu, v)) continue;
      const innr = inPoly(e.inn, lu, v);
      const n = strand(lu + 6, v + 4, 11 + side, 30);
      let key = innr ? S.inner : S.earKey(side, u, v);
      if (e.tip !== undefined && v < e.tip) key = 'K';
      // 귓속 흰 털: 귀 뿌리에서 위로 삐져나온 가닥
      if (innr && v > -11.5 && n > 0.48 - (v + 4) * 0.05) key = 'W';
      const b = (innr ? 0.38 : 0.66) - (v + 10) * -0.012 + (lu + 7) * -0.03 + (n - 0.5) * 0.3 - (side > 0 ? 0.12 : 0);
      reg = innr ? 3 : 2; c = S.R[key][tone(b)];
    }
    // 머리
    if (hx(u, v)) {
      const n = strand(u, v, 5);
      const nx = u / (rx + 1.5), ny = v / (ry + 1.5), nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
      let b = 0.42 + (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) * 0.62;
      const r = Math.hypot(u / rx, v / ry);
      const smooth = inE(u, v, 0, 2.2, 7.4, 5.4); // 눈 둘레와 주둥이: 짧고 매끈한 털
      b += (n - 0.5) * (smooth ? 0.06 : 0.22) * Math.min(1, r * 1.2);
      if (r > 1) b -= (r - 1) * 0.5; // 털 끝은 한 톤 가라앉는다
      let key = S.coat(u, v, n);
      if (muzzleIn(u, v)) { key = 'W'; b = 0.7 - (v - 4.6) * 0.12 - Math.abs(u) * 0.04; reg = 5; } else reg = 4;
      c = S.R[key][tone(b)];
    }
    // 접힌 귀: 끝이 앞으로, 바깥 아래로 꺾여 내려온다
    for (const side of [-1, 1] as const) {
      if (S.ears[side < 0 ? 0 : 1] !== 'fold' || o.mark === 'torn') continue;
      const lu = side < 0 ? u : -u;
      const flap = [-7.4, -14.6, -10.6, -14.2, -13.4, -10.8, -12.8, -8.4, -10.4, -10.6, -8.2, -11.4];
      if (!inPoly(flap, lu, v)) continue;
      const n = strand(lu + 10, v + 12, 17, 30);
      const b = 0.5 - (v + 14) * 0.06 + (n - 0.5) * 0.25 - (side > 0 ? 0.08 : 0);
      reg = 6; c = S.R[S.earKey(side, u, v)][tone(b)];
    }
    // 찢긴 귀: 뜯겨 옆으로 매달렸다
    if (o.mark === 'torn') for (const side of [-1, 1] as const) {
      if (S.ears[side < 0 ? 0 : 1] !== 'fold') continue;
      const lu = side < 0 ? u : -u;
      if (!inPoly([-6.4, -7.2, -9.8, -9.4, -14.2, -3.2, -13.4, 2.6, -10.2, -0.8], lu, v)) continue;
      const b = 0.46 - (v + 8) * 0.02 + (strand(lu + 10, v, 19, 30) - 0.5) * 0.25;
      reg = 6; c = S.R[S.earKey(side, u, v)][tone(b)];
    }
    // 늘어진 귀 (개): 머리 앞
    if (S.ears[0] === 'dog') for (const side of [-1, 1] as const) {
      const lu = side < 0 ? u : -u;
      const ear = [-6.6, -7.4, -10.4, -7.2, -13.2, -1.6, -13.4, 6.8, -11.2, 8.6, -9.4, 5.2, -8.4, -2.4];
      if (!inPoly(ear, lu, v)) continue;
      const n = strand(lu + 11, v + 3, 13 + side, 34);
      const b = 0.62 - (v + 7) * 0.035 + (n - 0.5) * 0.3 - (side > 0 ? 0.12 : 0) - (lu < -12.4 ? 0.2 : 0);
      reg = 6; c = S.R[S.earKey(side, u, v)][tone(b)];
    }
    id[i] = reg; if (reg) col[i] = c;
  }
  // 테두리: 뒤에 있는 칸이 앞의 칸이나 빈칸과 닿으면 그 칸의 깊은 그늘로. 바깥은 더 짙게.
  const z = [0, 1, 2, 2, 4, 5, 6];
  const out: string[] = col.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = id[i]; if (!r) continue;
    let edge = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      const q = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : id[Y * W + X];
      if (!q) edge = 2; else if (z[q] > z[r] && !(r === 2 && q === 3) && !(r === 3 && q === 2) && !(r === 4 && q === 5) && !(r === 5 && q === 4)) edge = Math.max(edge, 1);
    }
    if (edge) out[i] = mix(col[i], LINE, edge === 2 ? (p.alpha(x, y) ? 0.42 : 0.72) : 0.5);
  }
  for (let i = 0; i < W * H; i++) if (id[i]) p.set(i % W, Math.floor(i / W), out[i]);

  // ── 얼굴 ──
  const face = (f: (u: number, v: number) => string | null, a = 1): void => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!id[y * W + x]) continue;
      const [u, v] = tf(x + 0.5, y + 0.5); const c = f(u, v); if (c) p.set(x, y, c, a);
    }
  };
  // 볼 홍조
  face((u, v) => (inE(u, v, -6.6, 4.4, 1.8, 0.85) || inE(u, v, 6.6, 4.4, 1.8, 0.85) ? '#f48c9c' : null), 0.4);
  // 눈
  const EX = 4.7 * Math.min(1.05, wide), EY = 1.4, ERX = 2.75, ERY = 3.2, SL = 0.12;
  const [i0, i1, i2, i3, i4] = S.iris;
  for (const side of [-1, 1] as const) {
    const ex = side * EX;
    face((u, v) => {
      const du = (u - ex) * side; // 바깥이 +
      const dv = v - EY + du * SL; // 바깥 눈꼬리가 올라간다
      const lidTop = o.droopy ? -ERY * 0.8 + 2.2 + 1.3 * Math.max(0, du / ERX) : -ERY * 0.8;
      const inEye = (du / ERX) ** 2 + (dv / ERY) ** 2 <= 1 && dv > lidTop;
      // 위 눈꺼풀 선: 굵고 바깥으로 꼬리가 빠진다
      const e1 = (du / ERX) ** 2 + (dv / ERY) ** 2, e2 = (du / (ERX + 0.45)) ** 2 + (dv / (ERY + 0.6)) ** 2;
      if (o.droopy && dv < lidTop - 0.6) return null; // 내려온 눈꺼풀 위는 털
      const lid = (dv < -0.2 && e2 <= 1 && e1 > 1 && du > -ERX * 0.7) || (dv <= lidTop + 0.7 && dv > lidTop - 0.6 && e2 <= 1)
        || inPoly([ERX * 0.6, -ERY * 0.7, ERX + 0.95, -ERY * 0.85, ERX + 0.2, -ERY * 0.35], du, dv); // 바깥 눈꼬리가 살짝 빠진다
      const rim = !inEye && (du / (ERX + 0.5)) ** 2 + (dv / (ERY + 0.5)) ** 2 <= 1 && dv > lidTop;
      if (lid) return LINE;
      if (rim) return dv > 0 ? null : LINE;
      if (!inEye) return null;
      if (o.blank) return ((Math.floor(u * k) + Math.floor(v * k)) & 1) ? '#7a7472' : '#5f585c';
      // 반짝임: 두 눈 다 화면 왼쪽 위에서 빛을 받는다
      const su = u - ex, sv = v - EY;
      if (inE(su, sv, -0.95, -0.7 + (o.droopy ? 0.8 : 0), 0.8, 0.72)) return '#ffffff';
      if (inE(su, sv, 1.2, 1.55, 0.45, 0.42)) return i4;
      const iris = inE(du, dv, -0.1, 0.25, ERX * 0.97, ERY * 1.02);
      if (!iris) return dv < lidTop + 1.4 ? '#cfc6cc' : '#f7f2ef'; // 흰자는 가장자리에만
      const pup = S.slit ? inE(su, sv, 0.1, 0.5, 0.8, 2.1) : inE(su, sv, 0.05, 0.45, 1.3, 1.45);
      const t = (dv - lidTop) / (ERY - lidTop);
      let c = t < 0.22 ? i0 : t < 0.48 ? i1 : t < 0.76 ? i2 : i3;
      if (pup) c = mix(i0, '#000000', 0.55);
      if (!pup && inE(su, sv, 0.3, 2.0, 2.2, 0.9) && t > 0.7) c = mix(i3, '#ffffff', 0.25); // 아래쪽의 맑은 반사
      return c;
    });
  }
  // 코: 둥근 역삼각형, 윗면에 빛
  const NY = 4.3 + mz * 0.5, NW = 1.35 + mz * 0.5;
  face((u, v) => {
    const t = (v - (NY - 0.7)) / 1.5;
    if (t < 0 || t > 1 || Math.abs(u) > NW * (1 - t * 0.75) + 0.1) return null;
    if (t < 0.3 && u < 0.2 && u > -NW * 0.6) return S.nose[0];
    return t > 0.72 ? S.nose[2] : S.nose[1];
  });
  // 입: 코 밑 짧은 줄과 ω
  const MY = NY + 1.0;
  const MO = '#5e2a3a';
  face((u, v) => {
    if (segD(u, v, 0, MY - 0.2, 0, MY + 0.55) < 0.24) return MO;
    if (S.smile) { const d = Math.hypot(u, v - (MY - 0.6)); return Math.abs(d - 1.6) < 0.24 && v > MY - 0.1 ? MO : null; }
    for (const sgn of [-1, 1]) {
      const cx = sgn * 0.95, cy = MY + 0.5;
      const d = Math.hypot(u - cx, v - cy);
      if (Math.abs(d - 0.95) < 0.22 && v > cy - 0.1) return MO;
    }
    if (S.tongue && inE(u, v, -0.95, MY + 1.75, 0.65, 0.6)) return v < MY + 1.6 ? '#f7a3b8' : '#dc7592'; // 꿰매 단 혀끝
    return null;
  });
  // 상처와 꿰맨 자리
  if (o.mark === 'sewn') face((u, v) => {
    const t = (u - 3) / 6; // 오른쪽 귀 뿌리를 따라 박음질
    if (t >= 0 && t <= 1 && Math.abs(v - (-6.6 - t * 1.2)) < 0.32 && Math.floor(t * 9) % 3 !== 2) return '#f08a32';
    if (segD(u, v, 4.2, 4.2, 5.4, 5.6) < 0.25) return '#f08a32';
    return null;
  });
  if (o.mark === 'torn') face((u, v) => {
    if (inE(u, v, 6.2, -7.4, 2.4, 1.1)) return (Math.floor(u * 2 + v * 3) & 1) ? '#ece8dc' : '#b8b2a4'; // 귀 뿌리의 폼
    if (inE(u, v, 4.6, 4.6, 1.3, 0.8)) return '#ece8dc';
    return null;
  });
}

/** 삼색이: 보는 쪽 왼쪽(그의 오른쪽)이 주황, 오른쪽이 검정, 가운데 흰 줄. 오른쪽 귀가 접혔다. 초록 눈. */
export function catSpec(R: Ramps): KSpec {
  return {
    R,
    coat: (u, v, n) => {
      const j = (n - 0.5) * 1.4;
      if (Math.abs(u) < 0.9 + Math.max(0, v + 9) * 0.2 + j * 0.2 && v < 2.5) return 'W'; // 이마의 흰 줄
      if (v > 2.2 - Math.abs(u) * 0.08 + j) return 'W';        // 볼 아래와 주둥이
      if (u < 0) return v < -5.5 && (Math.floor(u * 0.9 + n) & 1) && u > -6 && u < -1.8 ? 'Q' : 'O'; // 이마 줄무늬 몇 가닥
      return 'K';
    },
    ears: ['cat', 'fold'],
    earKey: (side) => (side < 0 ? 'O' : 'K'),
    inner: 'P',
    iris: ['#1f4a32', '#2f6844', '#4f9a50', '#7cc860', '#e8ffd0'],
    slit: true,
    nose: [R.P[0], R.P[1], R.P[2]],
    tongue: true,
  };
}
export type Species = 'fox' | 'rabbit' | 'dog' | 'bear';
export function suitSpec(kind: Species, R: Ramps): KSpec {
  switch (kind) {
    case 'fox': return {
      R, ears: ['fox', 'fox'], earKey: () => 'A', inner: 'W',
      coat: (u, v, n) => (v > 1.8 - Math.abs(u) * 0.12 + (n - 0.5) * 1.2 ? 'W' : 'A'),
      iris: ['#5a2c0c', '#a8601c', '#e89a34', '#f8c868', '#fff0c8'], slit: true,
      nose: ['#6a5a66', '#2a2228', '#140f12'], cheek: 1.35,
    };
    case 'rabbit': return {
      R, ears: ['rabbit', 'rabbit'], earKey: () => 'A', inner: 'P',
      coat: (u, v, n) => (inE(u, v, 0, 4.6, 4.6, 3.4 + (n - 0.5)) ? 'W' : 'A'),
      iris: ['#3e2a66', '#6e4aa8', '#9c78d0', '#c8a8ee', '#f4e8ff'],
      nose: [CAT_P[0], CAT_P[1], CAT_P[2]], cheek: 0.8,
    };
    case 'dog': return {
      R, ears: ['dog', 'dog'], earKey: () => 'K', inner: 'K',
      coat: (u, v, n) => (Math.abs(u) < 1 + Math.max(0, v + 9) * 0.12 + (n - 0.5) * 0.6 && v < 2 ? 'W' : 'A'),
      iris: ['#3e2410', '#7a4c22', '#a8743c', '#d0a064', '#fff0d8'],
      nose: ['#6a5a66', '#2a2228', '#140f12'], muzzle: 1, cheek: 0.7, smile: true,
    };
    case 'bear': return {
      R, ears: ['bear', 'bear'], earKey: () => 'A', inner: 'W',
      coat: () => 'A',
      iris: ['#1e1610', '#3e2c1a', '#7a5630', '#c09058', '#fff4dc'],
      nose: ['#6a5a66', '#2a2228', '#140f12'], muzzle: 0.8, cheek: 0.6, wide: 1.08, smile: true,
    };
  }
}
const CAT_P: Ramp = ['#ffd4dd', '#f7a3b8', '#dc7592', '#a9506b'];

/** 퍼슈트 상반신. 목(0, 0)에서 아래로. 사진처럼 어깨가 둥글게 처지고, 가슴에는 긴 털이 아래로 흘러내린다.
 *  key(u,v,n): 몸통 색, arm(side,v): 팔 색. 열쇠 'S' 는 옷감: 털결 대신 주름이 진다. bib: 가슴 흰 털이 있는가. */
export function kemonoTorso(p: Pix, tf: (x: number, y: number) => [number, number], R: Ramps, key: (u: number, v: number, n: number) => string, arm: (side: -1 | 1, v: number) => string, bib = true): void {
  const W = p.w, H = p.h;
  const half = (v: number): number => 12.6 - 7 * Math.exp(-v / 4);
  const fall = (u: number, v: number, seed: number): number => { // 아래로 흐르는 털결
    const id = Math.floor(u * 1.3 + rnd(Math.floor(v * 0.6), seed, 2) * 0.8);
    return rnd(id, Math.floor(v * 0.85 + rnd(id, 0, seed + 1) * 3), seed);
  };
  const id = new Uint8Array(W * H), cloth = new Uint8Array(W * H), col: string[] = new Array(W * H);
  const fold = (u: number, v: number): number => Math.sin(u * 0.62 + v * 0.3 + Math.sin(v * 0.21) * 1.4) * 0.06; // 옷감의 큰 주름
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = tf(x + 0.5, y + 0.5);
    if (v < -1) continue;
    const i = y * W + x;
    // 팔: 둥근 어깨에서 시작해 바깥 아래로 조금 벌어지며 가늘어진다. 반팔 소매는 끝이 넓게 벌어진다.
    for (const side of [-1, 1] as const) {
      const au = u * side;
      const ax = 10.2 + 3.2 * (1 - Math.exp(-Math.max(0, v - 3) / 8));
      const ak = arm(side, v), cl = ak === 'S';
      const aw = 3.3 - Math.min(0.7, Math.max(0, v - 3) * 0.03) + (cl ? 0.6 + Math.max(0, v - 6) * 0.08 : 0);
      const cap = inE(au, v, 10.4, 5.2, 3.9, 3.4);
      if ((v > 3 && Math.abs(au - ax) < aw) || cap) {
        const n = fall(au, v, 23 + side);
        const t = (au - ax) / aw; // -1 안쪽 … +1 바깥
        const b = 0.52 - t * 0.16 * side * -1 * -1 + (cl ? fold(au * 2, v) : (n - 0.5) * 0.18) - (side > 0 ? 0.12 : 0) - v * 0.004 - (cap && v < 3 ? 0 : 0);
        id[i] = 2; cloth[i] = cl ? 1 : 0; col[i] = R[ak][tone(b)];
      }
    }
    if (Math.abs(u) <= half(v) && !id[i]) {
      const n = fall(u, v, 29);
      const nx = u / 15;
      let b = 0.42 + (-0.5 * nx + 0.62 * Math.sqrt(Math.max(0, 1 - nx * nx))) * 0.5 - v * 0.005 + (n - 0.5) * 0.14;
      let k = key(u, v, n);
      if (k === 'S') { b += fold(u, v) - (n - 0.5) * 0.14; cloth[i] = 1; }
      if (bib && k !== 'S') { // 가슴 흰 털: 목에서 넓게 퍼졌다가 아래로 좁아진다. 끝이 털 뭉치로 갈라진다.
        const w = v < 9 ? 4.6 + v * 0.55 : Math.max(3.2, 9.5 - (v - 9) * 0.22);
        if (Math.abs(u) < w + (n - 0.5) * 1.6) { k = 'W'; b += 0.08; }
      }
      id[i] = 1; col[i] = R[k][tone(b)];
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = id[i]; if (!r) continue;
    let edge = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      const q = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : id[Y * W + X];
      if (!q) edge = 2; else if (q > r) edge = Math.max(edge, 1);
      else if (q && cloth[i] && !cloth[Y * W + X]) edge = Math.max(edge, 1); // 옷깃과 소매 끝
    }
    p.set(x, y, edge ? mix(col[i], LINE, edge === 2 ? 0.72 : 0.45) : col[i]);
  }
}

/** 이미 찍힌 털 위에 털결을 얹는다. 아래로 흐르는 가닥마다 한 톤 밝거나 어둡게. (cx,cy) 둘레(반지름 dens/4)는 짧은 털. R 의 keys 램프 색인 점만 건드린다. */
export function furPass(p: Pix, R: Ramps, keys: string[], cx: number, cy: number, seed = 41, dens = 60): void {
  const at = new Map<string, [string, number]>();
  for (const k of keys) R[k].forEach((c, t) => at.set(c.toLowerCase(), [k, t]));
  const hx = (i: number): string => '#' + [0, 1, 2].map((j) => p.d[i + j].toString(16).padStart(2, '0')).join('');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 4; if (!p.d[i + 3]) continue;
    const hit = at.get(hx(i)); if (!hit) continue;
    const [k, t] = hit;
    // 털은 아래로 흘러내린다: 짧은 세로 가닥. 가운데(배)는 짧은 털이라 덜 탄다.
    const id = Math.floor(x / 1.4 + rnd(Math.floor(y / 1.7), seed, 2) * 0.9);
    const n = rnd(id, Math.floor(y / 2.2 + rnd(id, 0, seed + 1) * 3), seed);
    const soft = Math.hypot(x - cx, (y - cy) * 0.8) < dens * 0.25;
    const nt = n > (soft ? 0.93 : 0.84) ? t - 1 : n < (soft ? 0.06 : 0.13) ? t + 1 : t;
    if (nt !== t && nt >= 0 && nt <= 3) p.set(x, y, R[k][nt]);
  }
}
