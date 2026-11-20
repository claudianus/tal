// 걷는 맵 그림을 그릴 때 같이 쓰는 도구. places.ts 와 places_*.ts 가 함께 쓴다.
import { Pix, mix, rnd } from './pix.ts';

/** fade: 사람이 뒤에 서면 반쯤 비친다 (나뭇잎처럼 사람을 통째로 가리는 것) */
export type Prop = { pix: Pix; x: number; y: number; foot: number; fade?: boolean };
export type PlaceState = { day: boolean; mood: string };
export type Place = { base: Pix; props: Prop[] };
export const T = 16;

// ── 작은 글씨 (3×5) ── 문패, 층수
export const DIG: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  F: '111100110100100', B: '110101110101110',
};
export function text(p: Pix, x: number, y: number, s: string, col: string, a = 1): void {
  for (const ch of s) {
    const g = DIG[ch];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') p.set(x + (i % 3), y + Math.floor(i / 3), col, a);
    x += 4;
  }
}

/** 떼어 낸 층에서 그림이 있는 부분만 잘라 prop 으로 만든다. foot 은 맵 좌표의 y (이보다 발이 위에 있는 사람을 가린다). */
export function cut(layer: Pix, top: number, foot: number): Prop {
  let x0 = layer.w, y0 = layer.h, x1 = -1, y1 = -1;
  for (let y = 0; y < layer.h; y++) for (let x = 0; x < layer.w; x++) if (layer.alpha(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return { pix: new Pix(1, 1), x: 0, y: 0, foot };
  const q = new Pix(x1 - x0 + 1, y1 - y0 + 1);
  q.blit(layer, -x0, -y0);
  return { pix: q, x: x0, y: y0 - top, foot };
}

// ── 콘크리트 ──
export function concrete(p: Pix, x0: number, y0: number, w: number, h: number, base: string, seed: number): void {
  const L = mix(base, '#ffffff', 0.08), D = mix(base, '#000000', 0.1), DD = mix(base, '#000000', 0.2);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = rnd(x, y, seed), m = rnd(x >> 2, y >> 1, seed + 1);
    p.set(x, y, n > 0.96 ? DD : n > 0.88 ? D : n < 0.05 ? L : m > 0.82 ? mix(base, '#000000', 0.05) : base);
  }
}
/** 금: 꺾이며 뻗는 한 줄 */
export function crack(p: Pix, x: number, y: number, len: number, col: string, seed: number): void {
  for (let i = 0; i < len; i++) {
    p.set(x, y, col, 0.8);
    const r = rnd(i, seed, 4);
    if (r < 0.45) x++; else if (r < 0.7) y++; else if (r < 0.85) y--; else x++;
    if (rnd(i, seed, 5) > 0.9) p.set(x, y + 1, col, 0.4);
  }
}


/** 맵 위를 움직이는 그림. places.ts 가 채우고 world.ts 가 그린다 (승강장 열차, 응급실 커튼 밑의 발). */
export const ART: { train?: Pix; trainOpen?: Pix; feet?: Record<string, Pix> } = {};
