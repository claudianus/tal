// 도트를 한 점씩 찍는 그림판. Canvas 를 쓰지 않아서 브라우저와 Node(미리보기 도구)에서 똑같이 돈다.
// 흐린 선이나 반투명 번짐이 끼어들 틈이 없다. 찍은 점이 그대로 화면의 점이다.

export type Pal = Record<string, string>;

const hexCache = new Map<string, [number, number, number, number]>();
export function hex(col: string): [number, number, number, number] {
  let v = hexCache.get(col);
  if (!v) {
    const s = col.replace('#', '');
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255];
    hexCache.set(col, v);
  }
  return v;
}
/** 두 색을 섞는다 (t=0 이면 a, 1 이면 b). 중간 톤을 팔레트에서 뽑을 때 쓴다. */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b);
  const h = (i: number): string => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return `#${h(0)}${h(1)}${h(2)}`;
}

export class Pix {
  w: number; h: number; d: Uint8ClampedArray;
  constructor(w: number, h: number) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }

  /** 점 하나. a 가 1 보다 작으면 밑색과 섞는다. */
  set(x: number, y: number, col: string, a = 1): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, ca] = hex(col);
    const al = (ca / 255) * a;
    if (al <= 0) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (al >= 1 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.max(d[i + 3], Math.round(al * 255)); if (al >= 1) d[i + 3] = 255; return; }
    d[i] = Math.round(d[i] + (r - d[i]) * al); d[i + 1] = Math.round(d[i + 1] + (g - d[i + 1]) * al); d[i + 2] = Math.round(d[i + 2] + (b - d[i + 2]) * al);
  }
  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  rect(x: number, y: number, w: number, h: number, col: string, a = 1): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, col, a);
  }
  /** 가로줄 / 세로줄 */
  hl(x: number, y: number, n: number, col: string, a = 1): void { this.rect(x, y, n, 1, col, a); }
  vl(x: number, y: number, n: number, col: string, a = 1): void { this.rect(x, y, 1, n, col, a); }
  /** 여러 점: "x,y x,y ..." */
  dots(pts: string, col: string, a = 1): void {
    for (const p of pts.trim().split(/\s+/)) { const [x, y] = p.split(',').map(Number); this.set(x, y, col, a); }
  }
  /** 체크무늬로 찍는다 (디더). phase 로 홀짝을 고른다. */
  dither(x: number, y: number, w: number, h: number, col: string, phase = 0, a = 1): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (((i + j + phase) & 1) === 0) this.set(i, j, col, a);
  }
  /** 속을 채운 타원 */
  ell(cx: number, cy: number, rx: number, ry: number, col: string, a = 1): void {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
      const dx = (i - cx) / rx, dy = (j - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(i, j, col, a);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, col: string, a = 1): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); // 소수 좌표면 끝점에 영영 닿지 않는다
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.set(x0, y0, col, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** 다른 그림을 얹는다. */
  blit(src: Pix, dx: number, dy: number, flip = false, a = 1): void {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + (flip ? src.w - 1 - x : x)) * 4;
      const sa = src.d[i + 3];
      if (!sa) continue;
      const tx = dx + x, ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
      const o = (ty * this.w + tx) * 4, d = this.d, al = (sa / 255) * a;
      if (al >= 1 || d[o + 3] === 0) { d[o] = src.d[i]; d[o + 1] = src.d[i + 1]; d[o + 2] = src.d[i + 2]; d[o + 3] = al >= 1 ? 255 : Math.round(al * 255); }
      else { d[o] += (src.d[i] - d[o]) * al; d[o + 1] += (src.d[i + 1] - d[o + 1]) * al; d[o + 2] += (src.d[i + 2] - d[o + 2]) * al; }
    }
  }
  /** 빈 자리 중 그림에 맞닿은 점에 테두리를 두른다. */
  outline(col: string, diag = false): void {
    const hit: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y)) continue;
      if (this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1)
        || (diag && (this.alpha(x - 1, y - 1) || this.alpha(x + 1, y - 1) || this.alpha(x - 1, y + 1) || this.alpha(x + 1, y + 1)))) hit.push(x, y);
    }
    for (let i = 0; i < hit.length; i += 2) this.set(hit[i], hit[i + 1], col);
  }
  clone(): Pix { const p = new Pix(this.w, this.h); p.d.set(this.d); return p; }
}

/** 글자 한 칸이 점 하나인 그림. '.' 과 ' ' 는 빈 자리. */
export function sprite(rows: string[], pal: Pal): Pix {
  const w = Math.max(...rows.map((r) => r.length));
  const p = new Pix(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) throw new Error(`팔레트에 없는 글자 '${ch}' (${y}행 ${x}열)`);
      p.set(x, y, col);
    }
  });
  return p;
}

/** 0..1 난수. 같은 자리에서는 늘 같은 값이 나온다 (바닥 얼룩, 모래알). */
export function rnd(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
