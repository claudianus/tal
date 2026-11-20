// 큰 그림용 사람 상반신. 이목구비는 없다(기획서 11장): 살결에 빛과 그늘, 앞머리가 이마에 지우는 그림자만 있다.
// 일본 애니메이션의 '얼굴 없는 행인'처럼, 머리 모양과 옷과 자세로 누구인지 읽히게 한다.
//  - 머리카락은 덩어리(다발)로 나뉘고, 끝이 뾰족하게 모인다. 다발 사이에 그늘 선, 정수리 둘레에 빛의 고리.
//  - 얼굴은 턱으로 갈수록 좁아진다. 앞머리 바로 밑, 턱 밑 목에 진한 그늘. 귀가 옆으로 조금 나온다.
//  - 옷은 원기둥처럼 빛을 받고, 깃과 단추와 이름표 같은 작은 것들로 사람을 가른다.
// 좌표: 머리 가운데가 (0,0), 단위는 도형 한 칸. 오른쪽이 +u, 아래가 +v. 정수리 ≈ -9, 턱 ≈ 7.8, 어깨선 ≈ 13.
import { Pix, mix, rnd } from './pix.ts';

type Ramp = readonly [string, string, string, string];
export type HairStyle = 'mop' | 'short' | 'neat' | 'bob' | 'long' | 'pony';
export type Top = 'tee' | 'stretch' | 'shirt' | 'blouse' | 'vest';
export type HSpec = {
  skin: Ramp; hair: Ramp; cloth: Ramp;
  trim?: Ramp; // 깃, 조끼 안의 티, 리본, 이름표
  style: HairStyle;
  fringe?: number; // 앞머리 끝의 높이 (-4: 이마가 보인다, 0: 눈썹, 2.5: 눈을 덮는다)
  part?: number; // 가르마와 쓸린 방향 (-1..1)
  top: Top;
  sleeve?: 'long' | 'short';
  tag?: boolean; // 교복 이름표
  ribbon?: boolean; // 교복 리본
  down?: number; // 고개를 숙인 정도 (0..1)
  seed?: number;
};

const LINE = '#241a24';
const L = [-0.5, -0.6, 0.62]; // 왼쪽 위에서 오는 빛
const tone = (b: number): number => (b > 0.78 ? 0 : b > 0.5 ? 1 : b > 0.26 ? 2 : 3);
const inE = (u: number, v: number, cx: number, cy: number, rx: number, ry: number): boolean => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
function inPoly(pts: number[], X: number, Y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const lam = (nx: number, ny: number): number => { const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny)); return nx * L[0] + ny * L[1] + nz * L[2]; };

/** p 위에 사람 상반신을 찍는다. tf: 판의 (x+.5,y+.5) → 몸 좌표 (u,v). */
export function humanBust(p: Pix, tf: (x: number, y: number) => [number, number], S: HSpec): void {
  const W = p.w, H = p.h;
  const seed = S.seed ?? 1, part = S.part ?? 0, dn = S.down ?? 0;
  const style = S.style;
  const trim = S.trim ?? S.cloth;
  // 고개를 숙이면: 얼굴이 아래로 짧아지고, 정수리가 앞으로 와서 머리카락이 더 보인다
  const fcy = dn * 1.6, fry = 7.8 - dn * 1.6;
  const faceHW = (v: number): number => {
    const t = (v - fcy) / fry; if (t < -1 || t > 1) return -1;
    if (t < 0.18) return 6.3 * Math.sqrt(1 - t * t);
    const j = (t - 0.18) / 0.82; // 턱선: 아래로 좁아지다 둥글게 모인다
    return 6.2 - 3.9 * j ** 1.4 - (j > 0.86 ? (j - 0.86) * 9 : 0);
  };
  // 앞머리 끝선
  const base = (S.fringe ?? (style === 'neat' ? -1.8 : style === 'mop' ? 2.4 : -0.6)) + dn * 2.8;
  const cw = style === 'mop' ? 1.7 : style === 'neat' ? 2.6 : 2.1; // 다발 너비
  const amp = style === 'mop' ? 1.8 : style === 'neat' ? 1.1 : 1.3;
  const fringe = (u: number): { y: number; t: number } => {
    const uu = u - part * 1.6 + 20;
    const c = Math.floor(uu / cw), t = uu / cw - c;
    const jit = rnd(c, seed, 7);
    const tip = (1 - Math.abs(2 * t - 1)) ** 1.25;
    // 바깥으로 갈수록 끝선이 올라가 이마의 둥근 면을 따라간다. 쓸린 방향으로 비스듬하다.
    const y = base - (u / 6.4) ** 2 * 1.6 + tip * amp * (0.55 + jit * 0.7) - amp * 0.5 + u * part * 0.22;
    return { y, t };
  };
  // 옆머리가 내려오는 길이
  const sideLen = style === 'bob' ? 6.8 : style === 'long' ? 9 : style === 'mop' ? 4.2 : style === 'pony' ? 2 : style === 'neat' ? 0.6 : 2.4;
  const crownRX = style === 'neat' ? 7.3 : style === 'mop' ? 7.9 : 7.5, crownRY = style === 'mop' ? 9.2 : 8.8;
  const crownCY = -0.9 + dn * 0.8;
  const inCrown = (u: number, v: number): boolean => {
    const th = Math.atan2(v - crownCY, u);
    let r = 1 / Math.sqrt((Math.cos(th) / crownRX) ** 2 + (Math.sin(th) / crownRY) ** 2);
    if (style === 'mop' || style === 'short') { // 정수리 위의 삐친 다발
      const k = Math.floor((th + Math.PI) * 4.2), f = (th + Math.PI) * 4.2 - k;
      if (v < crownCY - 3) r += (1 - Math.abs(2 * f - 1)) * (0.5 + rnd(k, seed, 3) * 0.7);
    }
    return Math.hypot(u, v - crownCY) <= r;
  };
  const hairFront = (u: number, v: number): { t: number } | null => {
    const au = Math.abs(u);
    // 옆머리: 얼굴 가장자리를 덮고 내려와 끝이 뾰족하다
    const sw = style === 'bob' ? 1.9 : style === 'long' ? 1.6 : style === 'mop' ? 1.5 : 1.1;
    const fhw = Math.max(faceHW(v), 5.6);
    if (v > crownCY && v < sideLen && au > fhw - sw && au < fhw + (style === 'bob' ? 2.2 : 1.4) + v * 0.06) {
      const k = Math.floor((au - fhw + sw) / 1.2), tipLen = sideLen - (k % 2) * 1.1 - rnd(k, seed + (u < 0 ? 1 : 2), 5) * 0.8;
      if (v < tipLen) return { t: ((au - fhw + sw) / 1.2) % 1 };
    }
    if (!inCrown(u, v)) return null;
    const f = fringe(u);
    if (v < f.y) return { t: f.t };
    if (au > faceHW(v) - 0.2 && v < sideLen) return { t: 0.5 };
    if (faceHW(v) < 0 && v < fcy) return { t: 0.5 }; // 얼굴 위 정수리
    return null;
  };
  const hairBack = (u: number, v: number): boolean => {
    if (style === 'long') return Math.abs(u) < 8.2 + Math.max(0, v) * 0.12 && v > -2 && v < 17 - Math.abs(Math.sin(u * 1.3 + seed)) * 1.4;
    if (style === 'bob') return Math.abs(u) < 8.4 && v > -2 && v < 6.6 - Math.abs(Math.sin(u * 1.6 + seed)) * 0.7;
    if (style === 'pony') return inE(u, v, 0, -9.6, 2.6, 2.2) || (u > 0 && inE(u, v, 7.2, -2, 1.9, 6));
    return false;
  };
  // 몸
  const half = (v: number): number => (v < 9.8 ? -1 : 2.7 + 11 * (1 - Math.exp(-(v - 9.8) / 1.9)));
  const neckIn = (u: number, v: number): boolean => v > fcy + 3 && v < 12 && Math.abs(u) < 2.5 + Math.max(0, v - 9.5) * 0.25;

  const id = new Uint8Array(W * H); // 0 빈칸, 1 뒷머리, 2 몸, 3 목, 4 얼굴, 5 귀, 6 깃·장식, 7 앞머리
  const col: string[] = new Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = tf(x + 0.5, y + 0.5);
    const au = Math.abs(u);
    let reg = 0, c = '';
    const hairCol = (t: number, extra = 0): string => {
      const nx = u / (crownRX + 1), ny = (v - crownCY) / (crownRY + 1.5);
      let b = 0.5 + lam(nx, ny) * 0.55 + extra;
      const sn = rnd(Math.floor(u * 1.4 - v * part * 0.3 + 40), seed, 9);
      b += (sn - 0.5) * 0.22;
      if (t < 0.12 || t > 0.88) b -= 0.22; // 다발 사이의 그늘
      // 빛의 고리: 정수리 둘레에 끊어진 띠
      const ring = -5.6 + dn * 1.2 + au * au * 0.03;
      if (Math.abs(v - ring) < 0.55 && u < 4.5 && sn > 0.28) b = 0.95;
      return S.hair[tone(b)];
    };
    if (hairBack(u, v)) { reg = 1; c = hairCol(0.5, -0.22); }
    // 몸과 옷
    const hw = half(v);
    if (hw > 0 && au < hw) {
      const arm = au > hw - 3.6 && v > 13.4; // 팔: 몸통 옆에서 아래로
      const nx = u / (hw + 4), ny = v < 13 ? -0.75 * (1 - (v - 9.8) / 3.2) : 0.1;
      let b = 0.56 + lam(nx, ny) * 0.36;
      if (arm && Math.abs(au - (hw - 3.6)) < 0.5) b -= 0.32; // 팔과 몸 사이의 주름
      if (!arm && v > 14 && Math.abs(Math.abs(u) - (hw - 6.2) - Math.sin(v * 0.7 + seed) * 0.4) < 0.3) b -= 0.18; // 옷이 몸에서 늘어지는 주름
      let R: Ramp = S.cloth;
      const shortSleeve = S.sleeve === 'short' && arm && v > 17.2;
      if (shortSleeve) R = S.skin;
      else if (S.top === 'vest' && au < 1.4 + Math.max(0, v - 10) * 0.2 && !arm) R = trim; // 조끼 안의 티
      else if (S.top === 'vest' && arm) R = trim;
      reg = 2; c = R[tone(b)];
      // 목둘레: 맨살이 드러나는 자리
      const neckOpen = S.top === 'stretch' ? v < 10.4 + 2.6 * (1 - (u / 4.2) ** 2) + Math.sin(u * 2.2) * 0.25 && au < 4.2
        : S.top === 'tee' || S.top === 'vest' ? v < 10.5 + 0.9 * (1 - (u / 2.9) ** 2) && au < 2.9
          : v < 10.2 + Math.max(0, 1.4 - au) * 1.8 && au < 1.6 + (v - 9.8) * 0.1; // 셔츠: 단추 하나 푼 V
      if (neckOpen) { reg = 3; c = S.skin[tone(0.52 + lam(u / 4, 0.1) * 0.25)]; }
      else if ((S.top === 'tee' || S.top === 'vest') && v < 11.3 + 0.9 * (1 - (u / 3.3) ** 2) && au < 3.4) { reg = 6; c = (S.top === 'vest' ? trim : S.cloth)[tone(b - 0.1)]; } // 립 깃
    }
    // 셔츠 깃: 목 양옆에서 날개처럼 펼쳐진다
    if (S.top === 'shirt' || S.top === 'blouse') {
      for (const s of [-1, 1]) {
        const lu = u * s;
        const wing = S.top === 'blouse' ? [0.2, 11.6, 2.4, 9.4, 5.2, 10.3, 4.6, 12.4, 1.6, 13.0] : [0.3, 12.6, 2.6, 9.3, 5.6, 10.2, 4.4, 12.8, 1.2, 13.6];
        if (inPoly(wing, lu, v)) { reg = 6; c = S.cloth[tone(0.66 + (lu - 2) * -0.04 - (s > 0 ? 0.14 : 0) + (v - 10) * -0.05)]; }
      }
      if (reg === 2 && au < 0.3 && v > 13.4) c = S.cloth[2]; // 단추 줄
      if (reg === 2 && au < 0.6 && v > 14 && (v - 14) % 2.8 < 0.5) c = S.cloth[3];
      if (S.ribbon && inPoly([-2.4, 12.2, 0, 13.2, 2.4, 12.2, 2.4, 14.4, 0, 13.6, -2.4, 14.4], u, v)) { reg = 6; c = trim[tone(0.6 - (v - 12) * 0.1 + (au < 0.6 ? 0.2 : 0))]; }
    }
    if (S.tag && u > -8.4 && u < -4.6 && v > 15.4 && v < 16.7) { reg = 6; c = v < 15.9 ? '#e8ecf4' : trim[1]; }
    // 목
    if (!reg || reg === 1) if (neckIn(u, v)) {
      reg = 3;
      const chin = v < fcy + fry + 1.6; // 턱 밑 그늘
      c = S.skin[tone(0.5 + lam(u / 3, 0) * 0.25 - (chin ? 0.26 : 0))];
    }
    // 귀
    for (const s of [-1, 1]) if (inE(u, v, s * 6.4, fcy + 1.3, 1.3, 2.1) && !(reg === 4)) {
      reg = 5; c = S.skin[tone(0.5 + (s < 0 ? 0.16 : -0.14) - (inE(u, v, s * 6.5, fcy + 1.4, 0.6, 1.1) ? 0.22 : 0))];
    }
    // 얼굴
    const fw = faceHW(v);
    if (fw > 0 && au < fw) {
      reg = 4;
      let b = 0.6 + lam(u / (fw + 1.6), (v - fcy) / (fry + 2.4)) * 0.22;
      const f = fringe(u);
      if (v < f.y + 1.2) b -= 0.3; // 앞머리가 이마에 지우는 그림자
      if (au > fw - 1.2 && v < sideLen + 0.5) b -= 0.2; // 옆머리 그림자
      c = S.skin[tone(b)];
    }
    // 앞머리
    const hf = hairFront(u, v);
    if (hf) { reg = 7; c = hairCol(hf.t); }
    id[y * W + x] = reg; if (reg) col[y * W + x] = c;
  }
  // 테두리: 뒤에 있는 칸이 앞의 칸이나 빈칸과 닿으면 짙게. 얼굴과 목, 목과 몸은 잇는다.
  const z = [0, 1, 2, 3, 4, 3.5, 5, 6];
  const out = col.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = id[i]; if (!r) continue;
    let edge = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      const q = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : id[Y * W + X];
      if (!q) edge = 2;
      else if (z[q] > z[r] && !(r === 3 && q === 4) && !(r === 2 && q === 3) && !(r === 3 && q === 5)) edge = Math.max(edge, 1);
    }
    if (edge) out[i] = mix(col[i], LINE, edge === 2 ? (p.alpha(x, y) ? 0.45 : 0.75) : 0.45);
  }
  for (let i = 0; i < W * H; i++) if (id[i]) p.set(i % W, Math.floor(i / W), out[i]);
}

// ── 살결과 머리색 ──
export const SKIN: Record<string, Ramp> = {
  warm: ['#ffe2cf', '#f2c4a6', '#d69a80', '#a8705e'],
  fair: ['#fff0e4', '#f6d6c0', '#dcac94', '#ab7c6c'],
  tan: ['#f0c8a2', '#d9a47e', '#b67c5e', '#875646'],
  pale: ['#eae4e2', '#d2c8c6', '#aea2a2', '#7e7476'], // 윤재: 볕을 못 본 살
};
export const HAIR: Record<string, Ramp> = {
  black: ['#4a4656', '#26232e', '#18161e', '#0d0c12'],
  dark: ['#5a4a46', '#33282a', '#221a1c', '#130e10'],
  brown: ['#8a6650', '#5c4234', '#412e26', '#271a16'],
  ash: ['#6a6670', '#45424c', '#302e36', '#1c1b20'],
  gray: ['#e4e2e0', '#bdbab8', '#96928f', '#6c6866'],
};
