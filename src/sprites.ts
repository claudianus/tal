// 도트 그림. 전부 코드로 찍는다. 타일은 16×16, 사람은 32×36 (src/art/chars.ts).
// 규칙(기획서 11장): 사람에게는 이목구비가 없다. 얼굴이 있는 건 고양이뿐이다.
import type { Dir } from './maps.ts';
import { charFrame, trim, topOf, CX, FOOT, type Look } from './art/chars.ts';
import { Pix, sprite } from './art/pix.ts';

type C = CanvasRenderingContext2D;
const r = (c: C, x: number, y: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(x, y, w, h); };

export type TileCtx = { t: number; monitor: boolean; day: boolean; slit: string; x: number; y: number; open: boolean; headGone?: boolean };

const WALL = '#23272c', WALL_D = '#191c20', WALL_L = '#2d3238';
const FL = '#33373a', FL2 = '#3a3d3c', CON = '#3c4043', ASP = '#2a2d31', SAND = '#5a554a';

function wall(c: C, x: number, y: number): void { r(c, x, y, 16, 16, WALL); r(c, x, y + 13, 16, 3, WALL_D); r(c, x, y, 16, 1, WALL_L); }
function floor(c: C, x: number, y: number, col: string, k: TileCtx): void {
  r(c, x, y, 16, 16, col);
  if ((k.x * 7 + k.y * 13) % 5 === 0) r(c, x + 3, y + 9, 2, 1, 'rgba(0,0,0,0.18)');
  if ((k.x * 3 + k.y * 11) % 7 === 0) r(c, x + 11, y + 4, 1, 1, 'rgba(255,255,255,0.06)');
}
function door(c: C, x: number, y: number, col: string, knobRight = true): void {
  wall(c, x, y); r(c, x + 3, y + 1, 10, 15, col); r(c, x + 3, y + 1, 10, 1, 'rgba(255,255,255,0.08)');
  r(c, x + (knobRight ? 10 : 5), y + 9, 1, 2, '#8d8468');
}

export function drawTile(c: C, name: string, x: number, y: number, k: TileCtx): void {
  switch (name) {
    case 'void': r(c, x, y, 16, 16, '#000'); break;
    case 'wall': wall(c, x, y); break;
    case 'floor': floor(c, x, y, FL, k); break;
    case 'floor2': floor(c, x, y, FL2, k); r(c, x, y, 16, 1, 'rgba(0,0,0,0.12)'); break;
    case 'concrete': floor(c, x, y, CON, k); r(c, x + 15, y, 1, 16, 'rgba(0,0,0,0.15)'); break;
    case 'asphalt': floor(c, x, y, ASP, k); break;
    case 'sand': floor(c, x, y, SAND, k); if ((k.x + k.y * 5) % 4 === 0) r(c, x + 7, y + 6, 1, 1, '#6a6456'); break;
    case 'window': // 커튼 틈은 손가락 한 마디만큼이다
      wall(c, x, y); r(c, x + 1, y + 2, 14, 10, '#15171a'); r(c, x + 1, y + 2, 14, 1, '#0d0f11');
      if (k.x === 2) r(c, x, y + 3, 1, 9, k.slit);
      break;
    case 'desk_head':
      floor(c, x, y, FL, k); r(c, x, y + 4, 16, 9, '#3b3027'); r(c, x, y + 13, 16, 2, '#231c17');
      // 삼색이의 머리. 이 방에서 색이 있는 건 이것뿐이다.
      if (!k.headGone) {
        r(c, x + 4, y + 2, 8, 7, '#e6e1d6'); r(c, x + 9, y + 2, 3, 3, '#d9853b'); r(c, x + 4, y + 2, 3, 3, '#22201e');
        r(c, x + 4, y, 2, 2, '#e6e1d6'); r(c, x + 10, y + 1, 3, 1, '#d9853b');
      }
      break;
    case 'monitor':
      floor(c, x, y, FL, k); r(c, x, y + 4, 16, 9, '#3b3027'); r(c, x, y + 13, 16, 2, '#231c17');
      r(c, x + 3, y, 10, 8, '#0c0e10'); r(c, x + 4, y + 1, 8, 6, k.monitor ? '#7f9fd4' : '#14171b'); r(c, x + 7, y + 8, 2, 1, '#0c0e10');
      break;
    case 'trash': // 컵라면 용기의 탑
      floor(c, x, y, FL, k);
      r(c, x + 2, y + 9, 5, 5, '#b8b2a6'); r(c, x + 3, y + 5, 4, 4, '#a9a397'); r(c, x + 3, y + 2, 4, 3, '#c2bcb0');
      r(c, x + 9, y + 7, 3, 7, '#6f8f8a'); r(c, x + 12, y + 10, 3, 4, '#5d564b'); r(c, x + 2, y + 9, 5, 1, '#8c4a3a');
      break;
    case 'closet': r(c, x, y, 16, 16, '#2b241e'); r(c, x + 1, y + 1, 14, 13, '#3a3028'); r(c, x + 13, y + 7, 1, 3, '#8d8468'); r(c, x, y + 14, 16, 2, '#1b1612'); break;
    case 'closet_mirror': r(c, x, y, 16, 16, '#2b241e'); r(c, x + 1, y + 1, 14, 13, '#3a3028'); r(c, x + 2, y + 7, 1, 3, '#8d8468'); r(c, x, y + 14, 16, 2, '#1b1612'); break;
    case 'switch': wall(c, x, y); r(c, x + 2, y + 6, 3, 4, '#c9c5ba'); r(c, x + 3, y + 7, 1, 2, '#77736a'); break;
    case 'door_room': // 발로 차인 자국이 있다
      wall(c, x, y); r(c, x, y + 1, 5, 14, '#4a3d31'); r(c, x, y + 1, 5, 1, '#5b4c3e'); r(c, x + 1, y + 9, 3, 3, '#30271f'); r(c, x + 4, y + 7, 1, 2, '#8d8468');
      if (k.open) r(c, x, y + 1, 5, 14, '#000');
      break;
    case 'bed_head': floor(c, x, y, FL, k); r(c, x + 1, y + 1, 14, 15, '#4b4f57'); r(c, x + 3, y + 3, 10, 6, '#8e9299'); break;
    case 'bed_foot': floor(c, x, y, FL, k); r(c, x + 1, y, 14, 14, '#454a52'); r(c, x + 1, y + 2, 14, 1, '#3a3f46'); r(c, x + 1, y + 14, 14, 1, '#24272b'); break;
    case 'door_left': wall(c, x, y); r(c, x + 11, y + 1, 5, 14, '#4a3d31'); r(c, x + 11, y + 7, 1, 2, '#8d8468'); break;
    case 'door_bath': door(c, x, y, '#454b4f'); break;
    case 'door_anbang': door(c, x, y, '#4a3d31'); break;
    case 'door_yunseo': // 문이 열려 있다. 박스들이 천장까지 쌓여 있다.
      wall(c, x, y); r(c, x + 3, y + 1, 10, 15, '#0a0b0c');
      r(c, x + 4, y + 9, 5, 6, '#5d5140'); r(c, x + 8, y + 5, 4, 5, '#544938'); r(c, x + 4, y + 3, 4, 5, '#4a4032'); r(c, x + 9, y + 11, 2, 4, '#3f6b4a');
      break;
    case 'kitchen': wall(c, x, y); r(c, x, y + 6, 16, 10, '#4d5154'); r(c, x, y + 6, 16, 1, '#6a6f73'); r(c, x + 4, y + 8, 6, 4, '#2a2d30'); break;
    case 'table':
      floor(c, x, y, FL2, k); r(c, x, y + 2, 16, 12, '#4a3e33'); r(c, x, y + 13, 16, 2, '#2c241d');
      if (k.x === 4 && k.y === 2) { r(c, x + 5, y + 5, 7, 4, '#6f8d6a'); r(c, x + 7, y + 6, 3, 2, '#55704f'); } // 만 원
      break;
    case 'sofa': floor(c, x, y, FL2, k); r(c, x, y + 3, 16, 11, '#3d4148'); r(c, x, y + 3, 16, 4, '#4a4f57'); break;
    case 'tv': floor(c, x, y, FL2, k); r(c, x + 1, y + 3, 14, 9, '#0c0e10'); r(c, x + 2, y + 4, 12, 7, '#15181c'); r(c, x + 6, y + 12, 4, 2, '#0c0e10'); break;
    case 'mat': floor(c, x, y, FL2, k); r(c, x + 1, y + 2, 14, 12, '#2b2e31'); r(c, x + 3, y + 9, 4, 3, '#14161a'); r(c, x + 9, y + 5, 4, 3, '#4a3b2f'); break;
    case 'door_front': wall(c, x, y); r(c, x, y + 1, 6, 14, '#565c61'); r(c, x, y + 1, 6, 1, '#6c7378'); r(c, x + 1, y + 7, 2, 3, '#1c1f22'); r(c, x + 1, y + 8, 1, 1, '#7fd49a'); break;
    case 'apt_home': case 'apt_door': door(c, x, y, name === 'apt_home' ? '#5a6065' : '#4a4f54'); r(c, x + 6, y + 3, 4, 2, '#8d8468'); break;
    case 'apt_window': wall(c, x, y); r(c, x + 2, y + 4, 12, 7, '#0e1013'); r(c, x + 7, y + 4, 1, 7, '#23272c'); break;
    case 'apt_window_lit': wall(c, x, y); r(c, x + 2, y + 4, 12, 7, '#c9a35c'); r(c, x + 7, y + 4, 1, 7, '#23272c'); r(c, x + 2, y + 4, 5, 7, '#8fa5c4'); break;
    case 'railing': r(c, x, y, 16, 16, '#05070b'); r(c, x, y, 16, 2, '#4a4f54'); for (let i = 1; i < 16; i += 4) r(c, x + i, y + 2, 1, 5, '#3a3f44'); if ((k.x * 5) % 7 < 2) r(c, x + 9, y + 11, 1, 1, '#c9a35c'); break;
    case 'elevator': wall(c, x, y); r(c, x + 1, y + 1, 14, 15, '#6a7075'); r(c, x + 7, y + 1, 1, 15, '#3a3f44'); if (k.x % 2) r(c, x + 13, y + 6, 1, 2, '#d47f7f'); break;
    case 'stair_in': floor(c, x, y, CON, k); for (let i = 0; i < 4; i++) r(c, x + i * 4, y, 1, 16, '#2a2d30'); r(c, x + 3, y + 5, 10, 6, 'rgba(90,200,130,0.35)'); break;
    case 'step': r(c, x, y, 16, 16, '#30343a'); for (let i = 0; i < 4; i++) r(c, x, y + i * 4 + 3, 16, 1, '#1d2024'); break;
    case 'glass_door': r(c, x, y, 16, 16, '#1b1e22'); r(c, x + 2, y, 12, 16, 'rgba(226,150,64,0.55)'); r(c, x + 7, y, 1, 16, '#1b1e22'); break;
    case 'plant': floor(c, x, y, CON, k); r(c, x + 5, y + 9, 6, 5, '#6b4a38'); r(c, x + 7, y + 3, 1, 6, '#4a4436'); r(c, x + 5, y + 4, 2, 1, '#4a4436'); r(c, x + 9, y + 5, 2, 1, '#4a4436'); break;
    case 'lamp': floor(c, x, y, ASP, k); r(c, x + 7, y + 2, 2, 13, '#14161a'); r(c, x + 5, y, 6, 3, '#e8a65a'); r(c, x + 5, y + 14, 6, 2, '#0c0e10'); break;
    case 'fence': r(c, x, y, 16, 16, '#101214'); for (let i = 0; i < 16; i += 4) { r(c, x + i, y, 1, 16, '#3a3f44'); r(c, x, y + i, 16, 1, 'rgba(58,63,68,0.6)'); } break;
    case 'booth': r(c, x, y, 16, 16, '#3a3f44'); r(c, x + 2, y + 4, 12, 8, '#d9c88a'); r(c, x, y + 14, 16, 2, '#22262a'); break;
    case 'block': r(c, x, y, 16, 16, '#1d2126'); r(c, x + 2, y + 3, 5, 5, (k.x * 7) % 5 === 0 ? '#c9a35c' : '#0e1013'); r(c, x + 9, y + 3, 5, 5, '#0e1013'); r(c, x, y + 14, 16, 2, '#14171b'); break;
    case 'block_door': r(c, x, y, 16, 16, '#1d2126'); r(c, x + 2, y + 2, 12, 14, 'rgba(226,170,90,0.5)'); r(c, x + 7, y + 2, 1, 14, '#1d2126'); r(c, x + 4, y + 4, 8, 3, '#e6e1d6'); break;
    case 'tree': floor(c, x, y, ASP, k); r(c, x + 7, y + 9, 2, 6, '#2c241d'); r(c, x + 2, y + 1, 12, 9, '#1f2f26'); r(c, x + 4, y, 8, 2, '#1f2f26'); r(c, x + 4, y + 3, 3, 2, '#2a3d31'); break;
    case 'slide': floor(c, x, y, SAND, k); r(c, x, y + 3, 16, 8, k.x === 2 ? '#7b5f4a' : '#8a6a52'); r(c, x, y + 3, 16, 1, '#a07b5f'); if (k.x === 2) { r(c, x + 1, y + 11, 2, 5, '#3a3f44'); } else r(c, x + 13, y + 11, 2, 5, '#3a3f44'); break;
    case 'seesaw': floor(c, x, y, SAND, k); r(c, x, y + 8, 16, 2, '#6f7479'); if (k.x === 3) r(c, x, y + 10, 3, 4, '#3a3f44'); break;
    case 'swing': // 그네 줄과 앉는 자리
      floor(c, x, y, SAND, k); r(c, x, y, 16, 2, '#3a3f44'); r(c, x + 4, y + 2, 1, 9, '#55595e'); r(c, x + 11, y + 2, 1, 9, '#55595e'); r(c, x + 3, y + 11, 10, 2, '#1c1f22');
      break;
    case 'bench': floor(c, x, y, SAND, k); r(c, x + 1, y + 6, 14, 4, '#4a3e33'); r(c, x + 2, y + 10, 2, 4, '#2c241d'); r(c, x + 12, y + 10, 2, 4, '#2c241d'); break;
    case 'bin': floor(c, x, y, ASP, k); r(c, x + 2, y + 3, 12, 12, '#3f5a4c'); r(c, x + 1, y + 2, 14, 2, '#4d6d5c'); r(c, x + 5, y + 7, 6, 4, '#2c3f35'); break;
    case 'lowwall': r(c, x, y, 16, 16, '#2c3035'); r(c, x, y, 16, 2, '#3c4147'); r(c, x, y + 13, 16, 3, '#1c1f22'); break;
  }
}

// ── 사람 ── 도트는 src/art/chars.ts 에서 찍고, 여기서는 캔버스로 옮겨 그리기만 한다.
export type { Look } from './art/chars.ts';
const canvases = new WeakMap<Pix, HTMLCanvasElement>();
export function canvasOf(p: Pix): HTMLCanvasElement {
  let cv = canvases.get(p);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = p.w; cv.height = p.h;
    cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.d), p.w, p.h), 0, 0);
    canvases.set(p, cv);
  }
  return cv;
}
const BALLOON = sprite([
  '.ooooooooooo.',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'oWWWWWWWWWWWo',
  'owwwwwwwwwwwo',
  '.oooowwoooo..',
  '....owo......',
  '....oo.......',
], { o: '#2a1b29', W: '#fffaf0', w: '#e4d6cc' });
const ICONS: Record<string, [string[], Record<string, string>]> = {
  heart: [['.pp.pp.', 'pPppPpp', 'pppppqp', '.ppppq.', '..ppq..', '...q...'], { p: '#f0728c', P: '#ffc2cc', q: '#c0546f' }],
  tilt: [['.kkk.', 'k...k', '...k.', '..k..', '.....', '..k..'], { k: '#3a2c3a' }],
  wave: [['k.k.k', 'k.k.k', 'kkkkk', 'kPPPk', '.kkk.'], { k: '#3a2c3a', P: '#ffb0bf' }],
  curl: [['.....', '.....', 'k.k.k', '.....'], { k: '#3a2c3a' }],
  nod: [['..k..', '..k..', '..k..', '.....', '..k..'], { k: '#3a2c3a' }],
  shake: [['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'], { k: '#3a2c3a' }],
  laugh: [['k.k.k', '.....', 'kkkkk', '.kkk.'], { k: '#3a2c3a' }],
};

/** (x,y) 는 16×20 상자의 왼쪽 위 (타일 위쪽보다 6px 높다). 발바닥은 y+19 에 닿는다. step 0..3 은 걷는 동작. */
/** idle: 제자리에 서 있다 (걷는 중의 0번 박자와 구별한다). 그때만 꼬리를 흔들고 숨을 쉰다. */
export function drawChar(c: C, look: Look, x: number, y: number, dir: Dir, step: number, pose: string, emote: string, t: number, idle = false): void {
  if (pose === 'lie') { // 이불 밖으로 머리만 나온다. 베개 위.
    const h = trim(charFrame(look, dir, 0, 'lie')); // 돌아누우면 머리가 그쪽을 본다 (위 = 벽 쪽으로 등을 돌린다)
    c.drawImage(canvasOf(h.pix), Math.round(x + 15.5 - h.pix.w / 2), Math.round(y + 16 - h.pix.h / 2));
    return;
  }
  if (pose === 'lie_floor') { // 바닥에 모로 눕는다: 옆모습을 그대로 눕힌다 (90도라 점이 뭉개지지 않는다). 머리가 왼쪽.
    const f = charFrame(look, 'right', 0, 'stand', emote === 'hold' ? 'hold' : '');
    c.fillStyle = 'rgba(8,6,12,0.34)'; c.fillRect(Math.round(x - 16), Math.round(y + 19), 48, 3);
    c.save(); c.translate(Math.round(x + 8), Math.round(y + 14)); c.rotate(-Math.PI / 2);
    c.drawImage(canvasOf(f), -CX, -FOOT + 26); c.restore();
    return;
  }
  const live = emote && emote !== 'none' ? emote : '';
  const cat = look.kind === 'cat' || look.kind === 'cat_nohead' || look.kind === 'yunjae_cathead' || FUR_KINDS.has(look.kind);
  const ph = live ? (Math.sin(t * (live === 'wave' || live === 'laugh' ? 10 : live === 'nod' || live === 'shake' ? 12 : 5)) > 0 ? 1 : 0) : 0;
  // 꼬리는 4초 남짓에 한 번 천천히 오갔다가 쉰다. 숨은 3초에 한 번.
  const calm = idle && cat && !live && pose !== 'curl';
  const tp = (t * 0.9) % 4, tail = calm ? (tp < 1 ? 0 : tp < 1.6 ? 1 : tp < 2.6 ? 0 : tp < 3.2 ? -1 : 0) : 0;
  const br = calm && Math.sin(t * 2.1) > 0.35 ? 1 : 0;
  const f = charFrame(look, live && cat && !NOFACE.has(live) ? 'down' : dir, step, pose, live, ph, { tail, br });
  if (look.kind !== 'catreal') { c.fillStyle = 'rgba(8,6,12,0.34)'; c.fillRect(x + 1, y + 19, 14, 2); c.fillRect(x + 3, y + 18, 10, 4); }
  const dx = Math.round(x + 8 - CX), dy = Math.round(y + 19 - FOOT + (pose === 'sit' ? -3 : 0));
  c.drawImage(canvasOf(f), dx, dy);
  if (live && ICONS[live]) {
    const by = dy + topOf(f) - 13 + (Math.sin(t * 5) > 0 ? 0 : 1);
    const bx = dx + CX + 4;
    c.drawImage(canvasOf(BALLOON), bx, by);
    const ic = ICONS[live];
    if (ic) {
      let sp = iconCache.get(live);
      if (!sp) { sp = sprite(ic[0], ic[1]); iconCache.set(live, sp); }
      c.drawImage(canvasOf(sp), bx + Math.floor((13 - sp.w) / 2), by + 2);
    }
  }
}
const iconCache = new Map<string, Pix>();
const NOFACE = new Set(['shake', 'nod', 'laugh']); // 이 몸짓은 보던 쪽을 그대로 본다
const FUR_KINDS = new Set(['fox', 'rabbit', 'dog', 'bear', 'fox_nohead']);

/** 조사할 수 있는 물건 위에 뜨는 작은 표시 */
const MARK = sprite(['ooooooo', 'oWWWWWo', '.oWWWo.', '..oWo..', '...o...'], { o: '#2a1b29', W: '#fff3d0' });
export function drawMark(c: C, x: number, y: number, t: number): void {
  const b = Math.round(Math.sin(t * 4) * 1.2);
  c.drawImage(canvasOf(MARK), Math.round(x) + 5, y - 9 + b);
}
