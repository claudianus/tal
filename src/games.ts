// 미니게임. 장면 위에 반투명 판을 깔고 그 위에서 방향키와 Z 로 한다.
// 이기고 지는 게임이 아니다: 몸이 말을 안 듣는 감각을 손에 쥐여 주는 장치다. 실패해도 이야기는 끝나지 않는다.
// 결과는 문자열 하나다. 대본의 선택지가 "# game: <이름> <결과>" 로 그 결과를 받는다.
import { sfx } from './audio.ts';
import * as ui from './ui.ts';
import type { GameKey } from './ui.ts';
import { mirrorScene, videoPlayground, videoFace, groupPhoto } from './art/cuts.ts';
import { canvasOf } from './sprites.ts';

const W = 256, H = 144;
type GameOpt = { ghosts?: string[]; text?: string; droopy?: boolean; lines?: string[]; skin?: string; pov?: string };
type Keys = Record<GameKey, boolean>;
type Ctx = CanvasRenderingContext2D;
/** 한 판: 매 프레임 step 을 부르고, 결과가 나오면 문자열을 돌려준다. */
type Play = { step: (dt: number, t: number, k: Keys, hit: Set<GameKey>) => string | null; draw: (c: Ctx, t: number) => void; hint: string; scale?: number; peek?: () => Record<string, number> }; // peek: 시험용 (tools 에서 상태를 본다)

let cv: HTMLCanvasElement | null = null;
let autoPlay = false; // 검사용 (?auto): 판을 잠깐 보여 준 뒤 빠른 모드의 결과로 끝낸다
export function setGameAuto(b: boolean): void { autoPlay = b; }
function canvas(): HTMLCanvasElement {
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.id = 'game'; cv.width = W; cv.height = H;
  ui.el.stage.appendChild(cv);
  return cv;
}

// ── 작은 글씨 (숫자만, 3×5) ──
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
function num(c: Ctx, x: number, y: number, n: number, col: string, k = 1): void {
  c.fillStyle = col;
  for (const ch of String(Math.round(n))) {
    const g = DIG[Number(ch)];
    if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') c.fillRect(x + (i % 3) * k, y + Math.floor(i / 3) * k, k, k);
    x += 4 * k;
  }
}
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, col: string): void => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); c.fill(); };
const px = (c: Ctx, x: number, y: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };

/** 판을 띄우고 끝날 때까지 기다린다. */
export function playGame(id: string, opt: GameOpt = {}): Promise<string> {
  const mk = GAMES[id];
  if (!mk) return Promise.resolve('');
  if (ui.isFast()) return Promise.resolve(FAST[id] || '');
  const g = mk(opt);
  (window as unknown as { __play?: Play }).__play = g; // 시험용 손(testkit)이 그네 같은 판의 상태를 본다
  const el = canvas(), c = el.getContext('2d')!;
  const sc = g.scale || 1; // 글자를 쓰는 판은 칸을 잘게 나눠서 글씨가 뭉개지지 않게 한다. 좌표는 그대로 256×144.
  if (el.width !== W * sc) { el.width = W * sc; el.height = H * sc; }
  c.setTransform(sc, 0, 0, sc, 0, 0);
  c.imageSmoothingEnabled = false;
  const keys: Keys = { up: false, down: false, left: false, right: false, z: false };
  let hit = new Set<GameKey>();
  ui.setGameKeys((k, down, repeat) => { if (down && !repeat && !keys[k]) hit.add(k); keys[k] = down; });
  ui.hint(g.hint);
  ui.el.stage.classList.add('game');
  el.classList.add('on');
  return new Promise((res) => {
    let last = performance.now(), t = 0, done: string | null = null, out = 0;
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (done === null) { done = g.step(dt, t, keys, hit); hit = new Set(); if (done === null && autoPlay && t > 2.5) done = FAST[id] || ''; }
      else out += dt;
      c.clearRect(0, 0, W, H);
      g.draw(c, t);
      if (done !== null && out > 0.9) {
        el.classList.remove('on'); ui.setGameKeys(null); ui.hint(''); ui.el.stage.classList.remove('game');
        res(done);
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
const FAST: Record<string, string> = { dodge: 'held', zoom: 'seen', breath: 'calm', bill: 'done', coins: 'done', stitch: 'done', still: 'still', flood: 'off', type: 'sent', closet: 'hid', dial: 'call', gaze: 'looked', tilt: 'tilt', tug: 'torn', lurk: 'quiet', watch: 'end', leave: 'left', leaveall: 'left', swing: 'high', swing2: 'together', stillhot: 'still', photo: 'clear', catchb: 'caught', zip: 'zipped', knock: 'knocked', sleeve: 'bared', album: 'found', point: 'home', pills: 'taken', grab: 'gone', push: 'pushed', bag: 'given', beam: 'tail' };

// ═══════════ 숨 (넷을 들이쉬고, 넷을 멈추고, 넷을 내쉰다) ═══════════
// 가운데 원이 목표다. Z 를 누르고 있으면 내 숨(안의 원)이 차오르고, 떼면 빠진다. 목표를 따라가면 심장이 느려진다.
function breath(opt: { ghosts?: string[]; text?: string }): Play {
  const PH = 4, R0 = 10, R1 = 40;
  let mine = R0, bpm = 138, beat = 0, cycles = 0, lastPh = -1, off = 0, ghostAt = 0, calm = 0;
  const lines = opt.ghosts && opt.ghosts.length ? opt.ghosts : ['거 봐.', '이것도 못 해.', '다 보고 있어.'];
  let gi = 0;
  const target = (t: number): { r: number; ph: number } => {
    const k = t % (PH * 3), ph = Math.floor(k / PH), f = (k % PH) / PH;
    return { r: ph === 0 ? R0 + (R1 - R0) * f : ph === 1 ? R1 : R1 - (R1 - R0) * f, ph };
  };
  let tt = 0;
  return {
    hint: 'Z 를 누르고 있으면 들이쉰다 · 떼면 내쉰다 · 원을 따라간다',
    step(dt, _t, k) {
      tt += dt;
      const { r, ph } = target(tt);
      if (ph !== lastPh) { lastPh = ph; if (ph === 0 && tt > 1) cycles++; ui.hint(['들이쉰다 · Z 를 누르고 있는다', '멈춘다 · 그대로 누르고 있는다', '내쉰다 · Z 를 뗀다'][ph]); }
      mine += (k.z ? 1 : -1) * ((R1 - R0) / PH) * dt * 1.08;
      mine = Math.max(R0, Math.min(R1, mine));
      off = Math.abs(mine - r);
      const ok = off < 7;
      bpm += (ok ? -5.5 : 7) * dt;
      bpm = Math.max(64, Math.min(150, bpm));
      if (!ok && tt - ghostAt > 3.2 && bpm > 100) { ghostAt = tt; ui.ghost(lines[gi++ % lines.length]); }
      beat += dt * bpm / 60;
      if (beat >= 1) { beat -= 1; sfx(bpm > 100 ? 'heartbeat' : 'heartbeat_soft'); }
      if (bpm < 84) calm += dt; else calm = 0;
      if (calm > 2 || cycles >= 7) return 'calm';
      return null;
    },
    draw(c, t) {
      const { r, ph } = target(tt);
      const hot = Math.max(0, (bpm - 80) / 70);
      c.fillStyle = `rgba(4,5,8,${0.55 + hot * 0.2})`; c.fillRect(0, 0, W, H);
      // 가장자리가 좁아진다 (숨이 가쁠수록)
      const g = c.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, 150 - hot * 50);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${0.5 + hot * 0.4})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 - 4;
      // 목표: 점선 원
      c.fillStyle = ['#9fc2d8', '#d8d2a8', '#b8b0c8'][ph];
      for (let a = 0; a < 64; a++) { const th = (a / 64) * Math.PI * 2 + t * 0.2; if (a % 2) continue; c.fillRect(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), 1, 1); }
      // 내 숨
      ell(c, cx, cy, mine, mine, off < 7 ? 'rgba(160,200,220,0.35)' : 'rgba(220,120,110,0.35)');
      ell(c, cx, cy, Math.max(1, mine - 2), Math.max(1, mine - 2), off < 7 ? 'rgba(160,200,220,0.18)' : 'rgba(220,120,110,0.18)');
      // 박자: 세는 점 넷
      const k = Math.floor(((tt % 4) / 4) * 4);
      for (let i = 0; i < 4; i++) px(c, cx - 7 + i * 4, cy + R1 + 9, 2, 2, i <= k ? '#e8e4d8' : '#3a3c44');
      // 심장
      const pulse = Math.max(0, 1 - beat * 4);
      ell(c, 22, 20, 3 + pulse * 1.5, 3 + pulse * 1.5, '#c05860');
      num(c, 30, 18, bpm, bpm > 100 ? '#e08a84' : '#c8ccd0');
    },
  };
}

// ═══════════ 젤리 손 (편의점: 지폐를 집고, 동전은 못 집는다) ═══════════
function paw(from: 0 | 1): Play {
  let x = 60, y = 100, vx = 0, vy = 0, stage: number = from, tries = 0, slipT = 0, bill = { x: 80, y: 62 }, msg = 0, handT = -1, given = 0;
  const coins = [{ x: 150, y: 70, vx: 0, vy: 0 }, { x: 166, y: 76, vx: 0, vy: 0 }, { x: 158, y: 86, vx: 0, vy: 0 }, { x: 172, y: 64, vx: 0, vy: 0 }];
  let tt = 0;
  return {
    hint: from ? '거스름돈 · 방향키로 손을 움직인다 · Z 로 집는다' : '방향키로 손을 움직인다 · Z 로 지폐를 집는다',
    step(dt, _t, k, hit) {
      tt += dt;
      if (handT >= 0) { // 알바의 손이 동전을 하나씩 올려 준다
        handT += dt;
        if (handT > 0.9 + given * 0.8 && given < 4) { given++; sfx('coin'); }
        return handT > 4.6 ? 'done' : null;
      }
      const ax = (k.right ? 1 : 0) - (k.left ? 1 : 0), ay = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      vx += ax * 260 * dt; vy += ay * 260 * dt;
      vx *= Math.pow(0.18, dt); vy *= Math.pow(0.18, dt); // 미끄럽다: 늦게 멈춘다
      x = Math.max(16, Math.min(W - 16, x + vx * dt + Math.sin(tt * 3.1) * 0.12)); y = Math.max(24, Math.min(H - 14, y + vy * dt + Math.cos(tt * 2.3) * 0.1));
      if (slipT > 0) slipT -= dt;
      for (const c of coins) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.pow(0.1, dt); c.vy *= Math.pow(0.1, dt); c.x = Math.max(124, Math.min(W - 20, c.x)); c.y = Math.max(50, Math.min(H - 24, c.y)); }
      if (hit.has('z')) {
        if (stage === 0) {
          const over = Math.abs(x - bill.x) < 14 && Math.abs(y - (bill.y + 6)) < 10;
          if (!over) return null;
          tries++;
          if (tries < 3) { slipT = 0.5; sfx('slip'); bill = { x: bill.x + (Math.random() < 0.5 ? -10 : 10), y: bill.y + 3 }; ui.hint(tries === 1 ? '젤리 사이로 미끄러진다' : '한 번 더'); }
          else { sfx('coin'); return 'done'; }
        } else {
          const near = coins.find((c) => Math.abs(c.x - x) < 10 && Math.abs(c.y - (y + 6)) < 9);
          if (!near) return null;
          tries++; sfx('slip');
          near.vx = (Math.random() - 0.5) * 140; near.vy = (Math.random() - 0.3) * 80; // 굴러간다
          if (tries >= 3) { handT = 0; ui.hint('…'); }
          else ui.hint(['굴러간다', '또 굴러간다'][tries - 1]);
        }
      }
      if (stage === 1 && tt - msg > 12 && handT < 0) { handT = 0; ui.hint('…'); }
      return null;
    },
    draw(c) {
      c.fillStyle = 'rgba(4,5,8,0.6)'; c.fillRect(0, 0, W, H);
      // 계산대 위 (가까이서 본다)
      px(c, 20, 36, W - 40, H - 46, '#c8c6be'); px(c, 20, 36, W - 40, 2, '#e8e6de'); px(c, 20, H - 12, W - 40, 2, '#8a887e');
      for (let i = 0; i < 9; i++) px(c, 24 + i * 25, 40 + (i % 3) * 22, 14, 1, '#b8b6ae');
      px(c, 118, 44, 1, H - 58, '#a8a69e'); // 돈 놓는 쟁반의 경계
      px(c, 124, 48, 104, 70, '#b0aea6'); px(c, 124, 48, 104, 1, '#d8d6ce');
      // 지폐 (만 원)
      if (stage === 0) {
        const sx = bill.x - 18 + (slipT > 0 ? Math.sin(slipT * 60) * 2 : 0), sy = bill.y;
        px(c, sx, sy, 36, 16, '#9cbf9a'); px(c, sx, sy, 36, 1, '#c4dcc0'); px(c, sx + 3, sy + 3, 10, 10, '#7ea47e'); ell(c, sx + 26, sy + 8, 4, 5, '#86ad88'); px(c, sx + 16, sy + 11, 8, 1, '#5e845e');
      } else px(c, 132, 54, 36, 16, '#9cbf9a');
      // 동전
      if (stage === 1 && handT < 0) for (const k of coins) { ell(c, k.x, k.y, 5, 4, '#c0b490'); ell(c, k.x - 1, k.y - 1, 3, 2, '#e0d6b0'); }
      // 알바의 손 (얼굴 없이 소매와 손만)
      if (handT >= 0) {
        const hy = Math.min(40, -30 + handT * 120);
        px(c, x - 8, hy - 30, 16, 30, '#3a4250'); ell(c, x, hy + 2, 8, 6, '#d8b494'); px(c, x - 3, hy + 6, 6, 4, '#c8a484');
        for (let i = 0; i < Math.min(4, Math.floor(handT * 1.2)); i++) { ell(c, x - 4 + (i % 2) * 7, y + 2 + Math.floor(i / 2) * 4, 4, 3, '#c0b490'); ell(c, x - 5 + (i % 2) * 7, y + 1 + Math.floor(i / 2) * 4, 2, 1.5, '#e0d6b0'); }
      }
      // 고양이 손: 흰 털, 분홍 젤리 넷과 큰 젤리 하나
      const ox = Math.round(x), oy = Math.round(y);
      px(c, ox - 9, oy + 8, 18, 30, '#e8e2d8'); px(c, ox - 9, oy + 8, 1, 30, '#b8b0a8'); px(c, ox + 8, oy + 8, 1, 30, '#b8b0a8');
      px(c, ox - 9, oy + 20, 18, 6, '#e8843a'); // 주황 얼룩
      ell(c, ox, oy, 11, 10, '#f0ebe2'); ell(c, ox, oy + 2, 5, 4, '#e89aa8');
      for (const [dx, dy] of [[-7, -5], [-2, -8], [3, -8], [8, -5]]) ell(c, ox + dx, oy + dy, 2.2, 2, '#e89aa8');
      if (handT < 0) { c.strokeStyle = 'rgba(255,255,255,0.15)'; c.strokeRect(ox - 13.5, oy - 12.5, 27, 24); }
    },
  };
}

// ═══════════ 박음질 (뒤로 한 땀 가서 앞으로 두 땀) ═══════════
// 바늘이 솔기를 따라 오간다. 다음 땀 자리에 왔을 때 Z. 여덟 땀.
function stitch(): Play {
  const N = 8, X0 = 72, X1 = 184, Y = 76;
  let done = 0, pos = 0, dir = 1, miss = 0, flash = 0, tt = 0;
  const marks = Array.from({ length: N }, (_, i) => X0 + ((X1 - X0) / (N - 1)) * i);
  return {
    hint: '바늘이 땀 자리에 오면 Z',
    step(dt, _t, _k, hit) {
      tt += dt;
      const speed = 70 + done * 6;
      pos += dir * speed * dt;
      const lo = done > 0 ? marks[done - 1] - 10 : X0 - 14, hi = marks[Math.min(N - 1, done)] + 22;
      if (pos > hi) { pos = hi; dir = -1; } if (pos < lo) { pos = lo; dir = 1; }
      if (flash > 0) flash -= dt;
      if (hit.has('z')) {
        if (Math.abs(pos - marks[done]) < 4.5) { done++; sfx('stitch'); flash = 0.25; ui.hint(done % 2 ? '뒤로 한 땀' : '앞으로 두 땀'); }
        else { miss++; sfx('slip'); ui.hint('천천히'); }
      }
      return done >= N ? 'done' : null;
    },
    draw(c) {
      c.fillStyle = 'rgba(4,5,8,0.62)'; c.fillRect(0, 0, W, H);
      // 털 (주황과 흰 경계), 벌어진 솔기
      for (let y = 40; y < 112; y++) for (let x = 48; x < 208; x += 2) {
        const n = Math.sin(x * 0.7 + y * 1.3) * Math.sin(y * 0.4);
        c.fillStyle = y < 70 ? (n > 0.6 ? '#f09a50' : '#e07a30') : (n > 0.6 ? '#fbf6ee' : '#ece4d8');
        c.fillRect(x, y, 2, 1);
      }
      // 벌어진 틈: 아직 안 꿰맨 쪽만 벌어져 있다
      for (let x = 60; x < 196; x++) {
        const sewn = done > 0 && x < marks[done - 1] + 4;
        const gap = sewn ? 0 : 2 + Math.round(Math.sin(x * 0.3) * 0.8);
        c.fillStyle = '#2a1e1e'; c.fillRect(x, Y - gap / 2, 1, Math.max(1, gap));
      }
      // 꿰맨 땀: 주황 실
      for (let i = 0; i < done; i++) { const m = marks[i]; c.fillStyle = '#ff8a2a'; for (let k = -5; k <= 5; k++) c.fillRect(Math.round(m + k * 0.5), Y + k, 1, 1); c.fillStyle = '#ffd2a0'; c.fillRect(m, Y - 5, 1, 1); }
      // 다음 땀 자리
      if (done < N) { const m = marks[done]; c.fillStyle = flash > 0 ? '#ffffff' : '#ffd890'; c.fillRect(m - 1, Y - 9, 3, 1); c.fillRect(m - 1, Y + 9, 3, 1); }
      // 바늘과 실
      const nx = Math.round(pos);
      c.fillStyle = '#d8dce0'; c.fillRect(nx, Y - 16, 1, 12); c.fillStyle = '#ffffff'; c.fillRect(nx, Y - 16, 1, 2);
      c.fillStyle = '#ff8a2a'; for (let k = 0; k < 20; k++) c.fillRect(nx + Math.round(Math.sin(k * 0.3) * 3) + k, Y - 16 - k * 0.6, 1, 1);
      for (let i = 0; i < N; i++) px(c, 108 + i * 5, 122, 3, 3, i < done ? '#ff8a2a' : '#3a3c44');
    },
  };
}

// ═══════════ 가만히 있는다 (미끄럼틀 밑, 아이가 기대어 잠들었다) ═══════════
// 아무것도 누르지 않고 버틴다. 탈 안이 데워지고, 눈구멍 가장자리가 하얗게 뜬다. 누르면 아이를 깨운다.
function still(rain = true): Play {
  let heat = 0.35, tt = 0, said = 0;
  return {
    hint: '가만히 있는다 · 아무것도 누르지 않는다',
    step(dt, _t, _k, hit) {
      tt += dt; heat = Math.min(1, heat + dt * 0.045);
      if (tt > 4 && said === 0) { said = 1; ui.hint('덥다'); }
      if (tt > 9 && said === 1) { said = 2; ui.hint('팔이 저린다 · 그래도'); }
      if (tt > 14 && said === 2) { said = 3; ui.hint('…'); }
      if (hit.size) return 'wake';
      return tt > 17 ? 'still' : null;
    },
    draw(c, t) {
      // 탈의 눈구멍으로 본 세상: 바깥은 까맣고, 두 구멍 가장자리가 열을 받아 하얗게 뜬다
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out';
      for (const ex of [W / 2 - 40, W / 2 + 40]) ell(c, ex, H / 2 - 6, 34, 22, '#000');
      c.globalCompositeOperation = 'source-over';
      for (const ex of [W / 2 - 40, W / 2 + 40]) {
        const g = c.createRadialGradient(ex, H / 2 - 6, 8, ex, H / 2 - 6, 36);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(250,248,240,${0.15 + heat * 0.7})`);
        c.fillStyle = g; c.beginPath(); c.ellipse(ex, H / 2 - 6, 34, 22, 0, 0, Math.PI * 2); c.fill();
      }
      // 빗줄기
      c.fillStyle = 'rgba(180,196,214,0.35)';
      if (rain) for (let i = 0; i < 40; i++) { const x = (i * 37 + t * 40) % W, y = (i * 53 + t * 160) % H; c.fillRect(Math.round(x), Math.round(y), 1, 4); }
      // 더위
      px(c, W / 2 - 40, H - 14, 80, 3, '#2a2c34'); px(c, W / 2 - 40, H - 14, Math.round(80 * heat), 3, heat > 0.85 ? '#e8e4dc' : '#d8884a');
      // 잠든 숨: 작은 점이 천천히 오르내린다
      const b = Math.sin(t * 1.4) * 1.5; px(c, W / 2 - 1, H / 2 + 26 + b, 2, 2, 'rgba(240,236,228,0.6)');
    },
  };
}

// ═══════════ 알림 (3장: 영상이 퍼진 날들) ═══════════
// 알림이 쏟아진다. 좌우로 밀어서 지우지만, 지우는 것보다 빨리 온다. 결국 화면을 끈다.
function flood(opt: { ghosts?: string[]; text?: string }): Play {
  const lines = opt.ghosts && opt.ghosts.length ? opt.ghosts : ['새 댓글', '새 댓글', '공유됨'];
  type N = { y: number; x: number; vx: number; text: number; born: number };
  const ns: N[] = []; let tt = 0, next = 0.6, cleared = 0, gone = 0, off = -1;
  return {
    hint: '← → 로 알림을 밀어 지운다 · Z 로 화면을 끈다',
    step(dt, _t, _k, hit) {
      tt += dt;
      if (off >= 0) { off += dt; return off > 1 ? 'off' : null; }
      next -= dt;
      if (next <= 0) { ns.unshift({ y: -18, x: 0, vx: 0, text: Math.floor(Math.random() * lines.length), born: tt }); sfx('notify'); next = Math.max(0.18, 1.1 - tt * 0.06); if (Math.random() < 0.3) ui.ghost(lines[Math.floor(Math.random() * lines.length)]); }
      ns.forEach((n, i) => { n.y += (8 + i * 20 - n.y) * Math.min(1, dt * 8); n.x += n.vx * dt; });
      if ((hit.has('left') || hit.has('right')) && ns.length) { const top = ns.find((n) => n.vx === 0); if (top) { top.vx = hit.has('left') ? -600 : 600; cleared++; } }
      for (let i = ns.length - 1; i >= 0; i--) if (Math.abs(ns[i].x) > 200) { ns.splice(i, 1); gone++; }
      if (hit.has('z') || tt > 24) { off = 0; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.7)'; c.fillRect(0, 0, W, H);
      // 휴대폰
      const X = W / 2 - 44, Y = 6;
      px(c, X - 3, Y - 3, 94, H - 6, '#0e0f13'); px(c, X, Y, 88, H - 12, off >= 0 ? '#000' : '#151821');
      if (off >= 0) return;
      c.save(); c.beginPath(); c.rect(X, Y, 88, H - 12); c.clip();
      for (const n of ns) {
        const nx = X + 4 + n.x, ny = Y + 4 + n.y;
        if (ny > Y + H) continue;
        px(c, nx, ny, 80, 17, '#e8eaee'); px(c, nx, ny, 80, 1, '#ffffff');
        px(c, nx + 3, ny + 3, 9, 9, ['#e05050', '#4a88e0', '#e0a040'][n.text % 3]);
        for (let k = 0; k < 2; k++) px(c, nx + 15, ny + 4 + k * 5, 40 + ((n.text * 13 + k * 7) % 22), 2, '#6a6e78');
      }
      c.restore();
      // 쌓인 수
      num(c, X + 66, Y + H - 22, ns.length + gone - cleared, '#e05050');
      void t;
    },
  };
}


// ═══════════ 타자 (막간: 윤서가 그 문장을 친다) ═══════════
// 한 번 누를 때마다 한 글자. 화는 손가락보다 빠르다. 다 치면 Z 로 보낸다. 안 보내는 길은 없다.
const TYPED_YS = '제발 죽든지, 그런 짓 좀 하지 말든지 해.'; // 막간: 윤서가 오빠에게
function type(opt: GameOpt): Play {
  const ghosts = opt.ghosts || [];
  const TYPED = opt.text || TYPED_YS; // 선택지에 "…" 로 적힌 말이 있으면 그 말을 친다
  const form = opt.skin === 'browser'; // 웹 양식에 적는다
  const srv = !!opt.text && opt.skin !== 'kakao' && !form; // 카톡 창이 아니면 퍼리 서버 창이다 (어두운 화면, 방금 붙인 사진)
  let n = 0, sent = -1, key = -1, keyT = 0, said = 0;
  return {
    scale: 3,
    hint: '아무 키나 누르면 한 글자씩 써진다',
    step(dt, _t, _k, hit) {
      keyT -= dt;
      if (sent >= 0) { sent += dt; return sent > 1.1 ? 'sent' : null; }
      if (n >= TYPED.length) { if (hit.has('z')) { sent = 0; sfx('notify'); ui.hint(''); } return null; }
      if (hit.size) {
        n++; key = Math.floor(Math.random() * 30); keyT = 0.12; sfx('tap');
        if (n >= TYPED.length) ui.hint('다 썼다   ·   Z 를 누르면 보낸다');
        if (ghosts.length && n % 6 === 0) ui.ghost(ghosts[(said++) % ghosts.length]);
      }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.72)'; c.fillRect(0, 0, W, H);
      const X = W / 2 - 46, Y = 4, PW = 92, PH = H - 8;
      px(c, X - 3, Y - 3, PW + 6, PH + 6, '#0e0f13'); px(c, X, Y, PW, PH, srv ? '#30333b' : '#b9c3cf');
      px(c, X, Y, PW, 9, srv ? '#25272d' : '#a3afbc'); px(c, X + 4, Y + 3, 22, 3, srv ? '#8e94a8' : '#59626e'); // 위 칸: 오빠 / 채널 이름
      if (srv && /완성/.test(TYPED)) { // 퍼리 서버: 방금 붙인 사진 한 장 (거울 앞의 고양이)
        px(c, X + PW - 40, Y + 12, 36, 16, '#1d1f24'); px(c, X + PW - 30, Y + 14, 14, 12, '#f2ece2'); px(c, X + PW - 30, Y + 14, 5, 5, '#ee9440'); px(c, X + PW - 20, Y + 14, 4, 4, '#3a2c3a'); px(c, X + PW - 26, Y + 20, 2, 2, '#4a9a5a'); px(c, X + PW - 21, Y + 20, 2, 2, '#4a9a5a');
      } else if (!srv && !form) {
        // 지난 말풍선: '나 이번에 안 내려감' (내 것, 오른쪽, 노랑)
        px(c, X + PW - 46, Y + 14, 42, 9, '#f4e04a'); px(c, X + PW - 42, Y + 17, 30, 2, '#6e6420');
        px(c, X + PW - 54, Y + 20, 6, 2, '#59626e'); // 읽음 시각
      }
      // 지금 치는 말풍선: 친 글자가 그대로 보인다 (한 줄 16자 남짓에서 접는다)
      const TF = '600 5px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
      c.font = TF; c.textBaseline = 'middle';
      if (form) { // 웹 양식 (병원 예약): 흰 종이에 칸이 있고, 친 글자는 칸 안에 들어간다
        px(c, X, Y, PW, PH - 50, '#f3f4f6'); px(c, X, Y, PW, 9, '#2f6fd0'); px(c, X + 4, Y + 3, 26, 3, '#dfe9fb');
        const field = /\s/.test(TYPED) || TYPED.length > 5; // 이름은 한 줄, 증상은 큰 칸
        px(c, X + 4, Y + 13, field ? 30 : 10, 2, '#7a808c'); // 칸 이름
        const FY = Y + 18, FH = field ? 30 : 10;
        px(c, X + 4, FY, PW - 8, FH, '#ffffff'); px(c, X + 4, FY, PW - 8, 1, sent >= 0 ? '#2f6fd0' : '#b9bec8'); px(c, X + 4, FY + FH - 1, PW - 8, 1, sent >= 0 ? '#2f6fd0' : '#b9bec8');
        px(c, X + 4, FY, 1, FH, sent >= 0 ? '#2f6fd0' : '#b9bec8'); px(c, X + PW - 5, FY, 1, FH, sent >= 0 ? '#2f6fd0' : '#b9bec8');
        const rows: string[] = []; let cur = '';
        for (const ch of TYPED.slice(0, n)) { if (c.measureText(cur + ch).width > PW - 16) { rows.push(cur); cur = ch; } else cur += ch; }
        rows.push(cur);
        c.fillStyle = '#20242c'; rows.forEach((r, i) => c.fillText(r, X + 7, FY + 5 + i * 7));
        const last = rows[rows.length - 1];
        if (n < TYPED.length && Math.sin(t * 8) > 0) px(c, X + 7 + Math.ceil(c.measureText(last).width), FY + 2 + (rows.length - 1) * 7, 1, 5, '#20242c');
        px(c, X + 4, Y + PH - 74, PW - 8, 9, n >= TYPED.length ? '#2f6fd0' : '#9db8e6'); px(c, X + PW / 2 - 10, Y + PH - 71, 20, 3, '#eef3fd'); // 다음 · 예약하기
      } else if (n > 0) {
        const shown = TYPED.slice(0, n), rows: string[] = [];
        let cur = '';
        for (const ch of shown) { if (c.measureText(cur + ch).width > 58) { rows.push(cur); cur = ch; } else cur += ch; }
        rows.push(cur);
        const tw = Math.max(...rows.map((r) => c.measureText(r).width));
        const bw = Math.ceil(tw) + 8, bh = 4 + rows.length * 7;
        const by = Y + 30, bx = X + PW - 4 - bw;
        px(c, bx, by, bw, bh, srv ? (sent >= 0 ? '#5865c8' : '#454c78') : sent >= 0 ? '#f4e04a' : '#efe7a8');
        c.fillStyle = srv ? '#eef0fa' : '#3a3410';
        rows.forEach((r, i) => c.fillText(r, bx + 4, by + 5.5 + i * 7));
        if (sent > 0.4 && !srv) px(c, bx - 5, by + bh - 4, 3, 3, '#e8c020'); // 숫자 1 이 사라진 자리
      }
      // 입력창과 자판
      const KY = Y + PH - 50;
      px(c, X, KY - 10, PW, 9, '#e9edf1');
      const inField = sent >= 0 || form ? '' : TYPED.slice(0, n);
      let tail = inField; while (tail && c.measureText(tail).width > PW - 22) tail = tail.slice(1);
      c.fillStyle = '#2a2e36'; c.fillText(tail, X + 3, KY - 5.5);
      const cx = X + 4 + Math.ceil(c.measureText(tail).width);
      if (n < TYPED.length && Math.sin(t * 8) > 0) px(c, cx, KY - 8, 1, 5, '#2a2e36');
      px(c, X + PW - 14, KY - 9, 12, 7, n >= TYPED.length ? '#f4e04a' : '#c9cfd6');
      px(c, X, KY, PW, 50, '#d3d9df');
      for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) {
        const id = r * 10 + k, kx = X + 3 + k * 9, ky = KY + 4 + r * 11;
        px(c, kx, ky, 8, 9, id === key && keyT > 0 ? '#8f9aa6' : '#fbfcfd'); px(c, kx, ky + 8, 8, 1, '#a9b2bc');
      }
      px(c, X + 21, KY + 38, 50, 9, '#fbfcfd');
    },
  };
}

// ═══════════ 옷장 (막간: 윤서의 기억) ═══════════
// 옷장 안. 문틈의 빛을 오빠의 등이 막고 있다. 밖에서 문이 울린다. 숨을 참는다(Z 를 누르고 있는다).
// 숨이 모자라 내쉬면 소리가 난다. 그때마다 등이 문에 더 세게 붙는다. 들킨 적은 없다. 오빠가 안 비켰으니까.
function closet(opt: { ghosts?: string[]; text?: string }): Play {
  const ghosts = opt.ghosts || [];
  let air = 1, tt = 0, bangs = 0, nextBang = 3.2, warn = 0, shake = 0, press = 0, gasp = 0, said = 0;
  return {
    hint: 'Z 를 누르고 있으면 숨을 참는다 · 발소리가 오면',
    step(dt, _t, k) {
      tt += dt; shake = Math.max(0, shake - dt * 3); gasp = Math.max(0, gasp - dt * 2);
      if (k.z) air = Math.max(0, air - dt * 0.16);
      else { if (air < 0.98 && Math.random() < dt * 3) gasp = 1; air = Math.min(1, air + dt * 0.5); }
      if (k.z && air <= 0) { gasp = 1; air = 0.25; sfx('breath_fast'); }
      nextBang -= dt;
      if (nextBang < 1.4 && warn === 0) { warn = 1; sfx('footsteps_near'); }
      if (nextBang <= 0) {
        bangs++; warn = 0; nextBang = 2.6 + Math.random() * 1.8; shake = 1; sfx('bang');
        if (!k.z) { press = Math.min(1, press + 0.34); sfx('heartbeat'); } // 내 숨소리 대신 등이 문을 민다
        if (ghosts.length && Math.random() < 0.7) ui.ghost(ghosts[(said++) % ghosts.length]);
        if (bangs === 3) ui.hint('등은 안 비킨다');
      }
      return bangs >= 6 && nextBang < 1.8 ? 'hid' : null;
    },
    draw(c, t) {
      c.fillStyle = '#050405'; c.fillRect(0, 0, W, H);
      const sx = Math.round(W / 2 + Math.sin(t * 60) * 2 * shake);
      // 문틈: 위에서 아래로 가는 한 줄의 빛
      const g = c.createLinearGradient(sx - 14, 0, sx + 14, 0);
      g.addColorStop(0, 'rgba(214,190,140,0)'); g.addColorStop(0.5, 'rgba(214,190,140,0.18)'); g.addColorStop(1, 'rgba(214,190,140,0)');
      c.fillStyle = g; c.fillRect(sx - 14, 6, 28, H - 12);
      px(c, sx - 1, 6, 4, H - 12, '#d6be8c'); px(c, sx, 6, 2, H - 12, '#f0dcae');
      // 등: 문 너머에서 문틈에 등을 붙이고 있다. 틈으로 새는 빛이 어깨와 등의 둥근 윤곽을 따라 휜다.
      // 숨소리가 날 때마다 더 세게 붙어서, 막힌 자리가 넓어진다.
      const top = 30 - Math.round(press * 6), bot = 108 + Math.round(press * 6), mid = (top + bot) / 2, rx = 4 + press * 2, ry = (bot - top) / 2;
      px(c, sx - 2, top, 6, bot - top, '#050405');
      for (let y = top; y <= bot; y++) { // 윤곽에 걸린 빛: 틈 양옆으로 한 픽셀씩 번진다
        const e = Math.sqrt(Math.max(0, 1 - ((y - mid) / ry) ** 2)), w = Math.round(rx * e);
        const a = 0.18 + 0.25 * (1 - e);
        px(c, sx - 2 - w, y, 1, 1, `rgba(214,190,140,${a})`); px(c, sx + 3 + w, y, 1, 1, `rgba(214,190,140,${a})`);
      }
      // 등 한가운데, 셔츠 주름에 걸린 빛 한 줄 (숨 쉴 때 오르내린다)
      px(c, sx, Math.round(mid - 10 + Math.sin(t * 1.6) * 2), 2, 1, 'rgba(214,190,140,0.35)');
      // 발소리가 오면 아래 틈의 빛이 두 군데 끊긴다
      px(c, 30, H - 10, W - 60, 1, 'rgba(214,190,140,0.25)');
      if (warn) { const fx = W / 2 - 40 + Math.sin(t * 3) * 30; px(c, fx, H - 10, 8, 1, '#050405'); px(c, fx + 14, H - 10, 8, 1, '#050405'); }
      // 옷: 걸린 옷자락들의 윤곽
      for (let i = 0; i < 6; i++) { const ox = 18 + i * 16 + (i > 2 ? 130 : 0); px(c, ox, 0, 12, 40 + (i * 13) % 30, '#0c0a0c'); px(c, ox, 0, 1, 40 + (i * 13) % 30, '#151215'); }
      // 숨: 참을수록 가운데 아래의 띠가 줄어든다. 내쉬면 하얀 김이 아주 조금.
      px(c, 20, H - 22, 50, 2, '#1a171a'); px(c, 20, H - 22, Math.round(50 * air), 2, air < 0.25 ? '#c45050' : '#8a8078');
      if (gasp > 0) ell(c, 44, H - 34 - gasp * 6, 3 + (1 - gasp) * 4, 2, `rgba(220,214,206,${0.25 * gasp})`);
    },
  };
}

// ═══════════ 다이얼 (에필로그 A: 112) ═══════════
// 떨리는 손가락으로 세 자리를 누른다. 손끝이 저절로 미끄러진다. 잘못 누르면 지우고 다시. 다 누르면 통화.
function dial(opt: { ghosts?: string[]; text?: string }): Play {
  const ghosts = opt.ghosts || [];
  const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const goal = opt.text && /^\d{3}$/.test(opt.text) ? opt.text : '112'; // 엔딩 A 의 두 번째 전화는 109
  const spaced = goal.split('').join(' ');
  let typed = '', cx = 1, cy = 1, jx = 0, jy = 0, tt = 0, flash = -1, flashT = 0, calling = -1, said = 0, wrong = 0;
  return {
    hint: `방향키로 손가락을 옮기고 Z 로 누른다 · ${spaced}`,
    step(dt, _t, _k, hit) {
      tt += dt; flashT -= dt;
      if (calling >= 0) { calling += dt; return calling > 1.3 ? 'call' : null; }
      // 떨림: 가끔 손끝이 옆 칸으로 밀린다 (처음 몇 초가 제일 심하다)
      const shake = Math.max(0.25, 1 - tt / 20);
      jx = Math.sin(tt * 17) * 2.5 * shake + Math.sin(tt * 5.3) * 1.5 * shake; jy = Math.cos(tt * 13) * 2 * shake;
      if (Math.random() < dt * 0.5 * shake && typed.length < 3) { const d = Math.random() < 0.5 ? -1 : 1; if (Math.random() < 0.5) cx = Math.max(0, Math.min(2, cx + d)); else cy = Math.max(0, Math.min(4, cy + d)); }
      if (hit.has('left')) cx = Math.max(0, cx - 1);
      if (hit.has('right')) cx = Math.min(2, cx + 1);
      if (hit.has('up')) cy = Math.max(0, cy - 1);
      if (hit.has('down')) cy = Math.min(typed.length >= 3 ? 4 : 3, cy + 1);
      if (hit.has('z')) {
        if (cy === 4) { if (typed === goal) { calling = 0; sfx('ringback'); ui.hint(''); } return null; }
        const d = PAD[cy * 3 + cx]; flash = cy * 3 + cx; flashT = 0.15; sfx('tap');
        if (typed.length < 3) {
          typed += d;
          if (!goal.startsWith(typed)) { // 틀렸다: 지우고 다시
            wrong++; typed = '';
            if (ghosts.length) ui.ghost(ghosts[(said++) % ghosts.length]);
            ui.hint(wrong > 1 ? `천천히. ${spaced}` : '틀렸다. 지우고 다시');
          } else if (typed === goal) ui.hint('↓ 통화');
        }
      }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.72)'; c.fillRect(0, 0, W, H);
      const X = W / 2 - 40, Y = 4, PW = 80, PH = H - 8;
      px(c, X - 3, Y - 3, PW + 6, PH + 6, '#0e0f13'); px(c, X, Y, PW, PH, '#14171d');
      // 누른 번호
      if (typed) num(c, X + PW / 2 - typed.length * 6 + 1, Y + 8, Number(typed), '#e8eaee', 3);
      if (!typed && Math.sin(t * 6) > 0) px(c, X + PW / 2, Y + 8, 1, 15, '#e8eaee');
      // 자판
      for (let i = 0; i < 12; i++) {
        const kx = X + 8 + (i % 3) * 22, ky = Y + 30 + Math.floor(i / 3) * 19;
        px(c, kx, ky, 20, 16, i === flash && flashT > 0 ? '#5a6474' : '#262b34');
        const d = PAD[i];
        if (/\d/.test(d)) num(c, kx + 8, ky + 4, Number(d), '#cfd4dc', 1);
        else px(c, kx + 8, ky + 7, 4, 1, '#8a909a');
      }
      // 통화 버튼
      const ready = typed === goal;
      ell(c, X + PW / 2, Y + PH - 14, 9, 9, calling >= 0 ? '#2fa75a' : ready ? '#3cc46a' : '#25352b');
      px(c, X + PW / 2 - 4, Y + PH - 15, 8, 2, ready ? '#eafff0' : '#4a5a50');
      // 손끝 (떨린다)
      const fx = cy === 4 ? X + PW / 2 : X + 8 + cx * 22 + 10, fy = cy === 4 ? Y + PH - 14 : Y + 30 + cy * 19 + 8;
      ell(c, fx + jx, fy + jy + 3, 6, 7, 'rgba(232,200,176,0.55)'); ell(c, fx + jx, fy + jy + 1, 3, 3, 'rgba(255,236,220,0.6)');
      if (calling >= 0) { px(c, X, Y, PW, PH, `rgba(20,30,24,${Math.min(0.6, calling)})`); }
    },
  };
}

// ═══════════ 거울 (프롤로그: 사 년 만에 보는 얼굴) ═══════════
// 눈길이 자꾸 아래로, 옆으로 미끄러진다. ↑ 로 고개를 들어 거울 속 얼굴(위 가운데)에 눈길을 붙들어 둔다.
// 벗어나면 목소리가 커진다. 다 본 뒤에야(붙든 시간이 쌓이면) 끝난다. 끝까지 못 봐도 시간이 지나면 끝난다.
function gaze(opt: { ghosts?: string[]; text?: string }): Play {
  const ghosts = opt.ghosts || [];
  const FX = W / 2, FY = 40; // 거울 속 얼굴 자리
  let x = FX - 30, y = H - 30, held = 0, tt = 0, said = 0, lastGhost = 0, done = -1;
  return {
    hint: '방향키로 눈길을 거울 속 얼굴에 둔다 · 피하지 않는다',
    step(dt, _t, k) {
      tt += dt;
      if (done >= 0) { done += dt; return done > 0.8 ? 'looked' : null; }
      // 피하는 힘: 시간이 갈수록 세다. 아래로, 그리고 얼굴에서 먼 쪽으로.
      const push = 26 + tt * 1.6;
      const dx = x - FX, dy = y - FY, d = Math.hypot(dx, dy) || 1;
      x += (dx / d) * push * 0.5 * dt + Math.sin(tt * 1.7) * 14 * dt; y += push * dt * 0.8;
      const sp = 90;
      if (k.up) y -= sp * dt; if (k.down) y += sp * dt; if (k.left) x -= sp * dt; if (k.right) x += sp * dt;
      x = Math.max(8, Math.min(W - 8, x)); y = Math.max(8, Math.min(H - 8, y));
      const on = Math.hypot(x - FX, y - FY) < 18;
      if (on) held += dt;
      else if (ghosts.length && tt - lastGhost > 1.6) { lastGhost = tt; ui.ghost(ghosts[(said++) % ghosts.length]); }
      if (held > 6 || tt > 28) { done = 0; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 거울 그림은 아래에 그대로 둔다. 눈길이 닿은 자리만 밝고, 나머지는 어둡다.
      const on = Math.hypot(x - FX, y - FY) < 18;
      const g = c.createRadialGradient(x, y, 6, x, y, 70);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${on ? 0.55 : 0.8})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 눈길: 가는 점선 고리
      c.fillStyle = on ? 'rgba(236,228,214,0.9)' : 'rgba(200,190,180,0.6)';
      for (let a = 0; a < 20; a++) { if (a % 2) continue; const th = (a / 20) * Math.PI * 2 + t * 0.6; c.fillRect(Math.round(x + Math.cos(th) * 7), Math.round(y + Math.sin(th) * 7), 1, 1); }
      // 붙든 시간
      px(c, W / 2 - 24, H - 8, 48, 2, 'rgba(30,28,30,0.8)'); px(c, W / 2 - 24, H - 8, Math.round(48 * Math.min(1, held / 6)), 2, '#d8cfc0');
    },
  };
}

// ═══════════ 거울 속 고양이 (프롤로그) ═══════════
// 처음 쓴 탈로 거울을 본다. 방향키로 고개를 기울이면 거울 속 고양이가 기울인다. 반 박자 늦게.
// 양쪽으로 한 번씩 기울여 보면 끝난다. 그게 나라는 걸 손으로 안다.
function tilt(opt: GameOpt): Play {
  const STEP = 0.07, MAX = 4; // 한 칸이 0.07 라디안. 거울 그림은 칸마다 한 번만 그린다.
  let want = 0, cur = 0, lag = 0, tt = 0, left = 0, right = 0, done = -1, quiet = 1.4;
  const pics = new Map<number, HTMLCanvasElement>();
  const pic = (n: number): HTMLCanvasElement => {
    let c = pics.get(n);
    if (!c) { c = canvasOf(mirrorScene({ cat: true, bright: false, droopy: !!opt.droopy, tilt: n * STEP })); pics.set(n, c); }
    return c;
  };
  return {
    hint: '고양이가 있다   ·   ← → 고개를 기울인다',
    step(dt, _t, k) {
      tt += dt;
      if (done >= 0) { done += dt; return done > 1.2 ? 'tilt' : null; }
      if (tt < quiet) return null; // 처음에는 그냥 본다
      want = k.left ? -MAX : k.right ? MAX : 0;
      if (want < 0 && cur <= -MAX + 1) left += dt;
      if (want > 0 && cur >= MAX - 1) right += dt;
      lag += dt;
      if (lag > 0.09) { lag = 0; if (cur !== want) { cur += Math.sign(want - cur); if (cur === want && want) sfx('tap'); } }
      if ((left > 0.5 && right > 0.5) || tt > 22) { done = 0; ui.hint(''); }
      return null;
    },
    draw(c) {
      const im = pic(-cur); // 거울이라 좌우가 바뀐다
      const kk = Math.max(W / im.width, H / im.height);
      c.fillStyle = '#07080c'; c.fillRect(0, 0, W, H);
      c.drawImage(im, Math.round((W - im.width * kk) / 2), Math.round((H - im.height * kk) * 0.25), Math.ceil(im.width * kk), Math.ceil(im.height * kk));
      // 양쪽을 다 기울여 봤는지: 아래 가장자리의 두 점
      px(c, W / 2 - 6, H - 6, 3, 3, left > 0.5 ? '#d8cfc0' : 'rgba(80,76,72,0.8)');
      px(c, W / 2 + 3, H - 6, 3, 3, right > 0.5 ? '#d8cfc0' : 'rgba(80,76,72,0.8)');
    },
  };
}


// ═══════════ 댓글 (3장·막간·4장: 글자가 날아온다) ═══════════
// 휴대폰 화면 안에 내가 있다. 작은 고양이 머리 하나 (윤서 차례에는 작은 하트 하나).
// 방금 읽은 댓글이 글자째로 화면을 가로질러 온다. 방향키로 피한다. 닿으면 기력이 하나 깎이고, 그 말이 머릿속에 남는다.
// 이길 수 없다. 댓글은 끝나지 않는다. 시간이 지나야 엄지가 화면을 끈다.
// 본 대로 쓴 한 줄(밝은 줄)에 닿으면 하나 낫는다. 그 줄만 유난히 빨리 밀려 내려간다.
const DODGE_FALLBACK = ['ㅋㅋㅋㅋㅋㅋ', '역겹다 진짜', '살아서 뭐 함', '저런 건 죽어야 함', '부모는 뭐 하냐', '108동이래', '변태 아님?', '신상 털렸네'];
function dodge(opt: GameOpt): Play {
  const raw = (opt.lines && opt.lines.length ? opt.lines : DODGE_FALLBACK).map((l) => l.replace(/^[^:]{1,8}:\s*/, '').trim()).filter(Boolean);
  const kindRe = /우유 두 개|조용한 손님|본 대로|만나 봤어요|밥은 먹었어요/;
  const hate = raw.filter((l) => !kindRe.test(l));
  const kind = raw.filter((l) => kindRe.test(l));
  const lines = hate.length ? hate : DODGE_FALLBACK;
  const cut = (l: string): string => (l.length > 15 ? l.slice(0, 14) + '…' : l);
  const BX = 76, BY = 18, BW = 104, BH = 100; // 휴대폰 화면 (싸우는 칸)
  const ys = opt.pov === 'yunseo';
  type B = { x: number; y: number; vx: number; vy: number; t: string; w: number; h: number; kind: 0 | 1 | 2; hit: boolean };
  const bs: B[] = [];
  let x = BX + BW / 2 - 4, y = BY + BH / 2 - 4, hp = 5, inv = 0, shake = 0, tt = 0, spawn = 0.4, li = 0, kindDone = false, end = -1, out = '', said = 0, beat = 0;
  const DUR = 17;
  let mc: CanvasRenderingContext2D | null = null;
  const measure = (t: string, f: string): number => { if (!mc) mc = document.createElement('canvas').getContext('2d'); mc!.font = f; return mc!.measureText(t).width; };
  const F = '600 5px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const strip = (kindLine: boolean): void => {
    const t = kindLine ? cut(kind[0]) : cut(lines[li++ % lines.length]);
    const w = Math.ceil(measure(t, F)) + 6, h = 8;
    const fromL = Math.random() < 0.5, sp = kindLine ? 70 : 24 + Math.random() * 14 + tt * 1.5;
    // 절반은 내가 있는 줄을 겨눈다. 가만히 있으면 맞는다.
    const aim = !kindLine && Math.random() < 0.4;
    const yy = aim ? Math.max(BY + 1, Math.min(BY + BH - h - 1, y - 1 + (Math.random() - 0.5) * 6)) : BY + 2 + Math.random() * (BH - h - 4);
    bs.push({ x: fromL ? BX - w : BX + BW, y: yy, vx: fromL ? sp : -sp, vy: kindLine ? 18 : 0, t, w, h, kind: kindLine ? 1 : 0, hit: false });
  };
  const laugh = (): void => { // ㅋ 가 비처럼 떨어진다
    const n = 3 + Math.floor(tt / 5);
    const gap = Math.floor(Math.random() * (n + 1));
    for (let i = 0; i < n + 1; i++) if (i !== gap) bs.push({ x: BX + 4 + i * ((BW - 12) / n), y: BY - 8, vx: 0, vy: 30 + tt * 2.2, t: 'ㅋ', w: 7, h: 7, kind: 2, hit: false });
  };
  return {
    scale: 4,
    hint: '방향키로 피한다 · 댓글에 닿으면 기력이 깎인다',
    step(dt, _t, k) {
      tt += dt; inv -= dt; shake -= dt;
      if (end >= 0) { end += dt; return end > 1.3 ? out : null; }
      const sp = 58;
      if (hp > 0) {
        x += ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * sp * dt;
        y += ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * sp * dt;
        x = Math.max(BX + 1, Math.min(BX + BW - 9, x)); y = Math.max(BY + 1, Math.min(BY + BH - 8, y));
      }
      spawn -= dt;
      if (spawn <= 0) {
        if (tt > 5 && Math.random() < 0.22) laugh(); else strip(false);
        if (tt > 9 && Math.random() < 0.25) strip(false);
        spawn = Math.max(0.55, 1.25 - tt * 0.04);
      }
      if (kind.length && !kindDone && tt > 8) { kindDone = true; strip(true); }
      for (const b of bs) { b.x += b.vx * dt; b.y += b.vy * dt; }
      for (let i = bs.length - 1; i >= 0; i--) { const b = bs[i]; if (b.x > BX + BW + 140 || b.x + b.w < BX - 140 || b.y > BY + BH + 10) bs.splice(i, 1); }
      // 닿았는지: 내 칸 8×7
      for (const b of bs) {
        if (b.hit || x + 8 < b.x || x > b.x + b.w || y + 7 < b.y || y > b.y + b.h) continue;
        if (b.kind === 1) { b.hit = true; hp = Math.min(5, hp + 1); sfx('coin'); continue; }
        if (inv > 0) continue;
        b.hit = true; hp--; inv = 1.1; shake = 0.25; sfx('hit');
        if (b.kind === 0 && said++ < 6) ui.ghost(b.t.replace('…', ''));
        if (hp <= 0) { end = 0; out = 'hit'; ui.hint(''); sfx('heartbeat'); }
      }
      if (hp > 0 && hp <= 2) { beat += dt; if (beat > 0.7) { beat = 0; sfx('heartbeat_soft'); } }
      if (end < 0 && tt > DUR) { end = 0; out = hp >= 3 ? 'held' : 'hit'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.78)'; c.fillRect(0, 0, W, H);
      const sx = shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
      c.save(); c.translate(sx, sy);
      // 휴대폰: 테두리, 위 칸(주소창), 화면
      px(c, BX - 5, BY - 12, BW + 10, BH + 26, '#0c0d11'); px(c, BX - 4, BY - 11, BW + 8, 1, '#24262e');
      px(c, BX, BY - 9, BW, 7, '#1b1e26'); px(c, BX + 3, BY - 7, BW - 22, 3, '#323744'); px(c, BX + BW - 16, BY - 7, 13, 3, '#5a2c30');
      px(c, BX, BY, BW, BH, end >= 0 && out === 'hit' ? '#140608' : '#12141a');
      for (let r = 0; r < BH; r += 11) px(c, BX, BY + r, BW, 1, '#181b23'); // 지나간 댓글 줄
      c.beginPath(); c.rect(BX, BY, BW, BH); c.clip();
      c.font = F; c.textBaseline = 'middle';
      for (const b of bs) {
        if (b.kind === 2) { c.fillStyle = b.hit ? 'rgba(200,90,90,0.4)' : '#d8574e'; c.fillText(b.t, b.x, b.y + 4); continue; }
        const nasty = /죽|변태|역겹|병|소름|신고|꼬시/.test(b.t);
        px(c, b.x, b.y, b.w, b.h, b.kind === 1 ? '#cfe6cf' : b.hit ? 'rgba(90,40,44,0.7)' : nasty ? '#e9d4d2' : '#dcdfe4');
        px(c, b.x, b.y, 1, b.h, b.kind === 1 ? '#6aa86a' : nasty ? '#c0403a' : '#8a8f99');
        c.fillStyle = b.kind === 1 ? '#2d5a30' : nasty ? '#7a1c18' : '#22262e';
        c.fillText(b.t, b.x + 3, b.y + b.h / 2 + 0.5);
      }
      // 나: 깜빡이는 동안은 맞지 않는다
      if (!(inv > 0 && Math.floor(t * 14) % 2)) {
        const X = Math.round(x), Y = Math.round(y);
        if (ys) { // 작은 하트
          px(c, X + 1, Y + 1, 2, 2, '#e8606a'); px(c, X + 5, Y + 1, 2, 2, '#e8606a'); px(c, X, Y + 2, 8, 2, '#e8606a'); px(c, X + 1, Y + 4, 6, 1, '#e8606a'); px(c, X + 2, Y + 5, 4, 1, '#e8606a'); px(c, X + 3, Y + 6, 2, 1, '#e8606a'); px(c, X + 2, Y + 2, 1, 1, '#ffb0b4');
        } else { // 삼색이 머리: 왼쪽 귀 주황, 오른쪽 귀는 처졌다
          px(c, X, Y + 2, 8, 5, '#f2ece2'); px(c, X, Y + 2, 3, 3, '#ee9440'); px(c, X + 5, Y + 2, 3, 2, '#3a2c3a');
          px(c, X, Y, 2, 2, '#ee9440'); px(c, X + 6, Y + 1, 3, 1, '#3a2c3a');
          px(c, X + 2, Y + 4, 1, 1, '#4a9a5a'); px(c, X + 5, Y + 4, 1, 1, '#4a9a5a'); px(c, X + 3, Y + 6, 2, 1, '#e8a0a0');
        }
      }
      c.restore();
      // 기력: 아래 칸 다섯
      for (let i = 0; i < 5; i++) px(c, BX + BW / 2 - 17 + i * 7, BY + BH + 6, 5, 4, i < hp ? (hp <= 2 ? '#e0605a' : '#d8cfc0') : '#2a2c34');
      // 남은 시간: 화면 꺼지기까지
      const left = Math.max(0, 1 - tt / DUR);
      px(c, BX, BY + BH + 1, Math.round(BW * left), 1, '#4a4e5c');
      if (end >= 0) { c.fillStyle = `rgba(0,0,0,${Math.min(0.9, end)})`; c.fillRect(BX, BY, BW, BH); }
    },
  };
}

// ═══════════ 영상 키우기 (3장: 위에서 찍은 영상 속에서 나를 찾는다) ═══════════
// 흔들리는 영상. 방향키로 손가락을 옮기고 Z 로 두 손가락을 벌린다. 다 키우면 거기 있는 건 나다.
function zoom(opt: GameOpt): Play {
  const pic = videoPlayground(!!opt.droopy);
  const VW = 240, VH = 135, CAT = { x: 82, y: 64 }; // 고양이 얼굴 (두 눈 사이)
  let fx = VW * 0.62, fy = VH * 0.42, z = 1, tt = 0, end = -1, hold = 0;
  return {
    scale: 2,
    hint: '방향키로 손가락을 옮긴다 · Z 를 누르고 있으면 영상을 키운다',
    step(dt, _t, k) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 1.6 ? 'seen' : null; }
      const sp = 70 / z;
      fx += ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * sp * dt; fy += ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * sp * dt;
      fx = Math.max(0, Math.min(VW, fx)); fy = Math.max(0, Math.min(VH, fy));
      const near = Math.hypot(fx - CAT.x, fy - CAT.y) < 26 / z + 8;
      if (k.z) { z = Math.min(4, z + dt * (near ? 1.4 : 0.9)); if (!near && z > 2.2) z = 2.2; hold += dt; } else z = Math.max(1, z - dt * 0.8);
      if (k.z && Math.random() < dt * 3) sfx('tap');
      if ((z >= 3.9 && near) || tt > 24) { end = 0; ui.hint(''); sfx('ringing_ear'); fx = CAT.x; fy = CAT.y; z = 4; }
      void hold;
      return null;
    },
    draw(c, t) {
      c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H);
      const PW = 200, PH = 112, PX = (W - PW) / 2, PY = 10;
      px(c, PX - 4, PY - 4, PW + 8, PH + 18, '#0c0d11');
      c.save(); c.beginPath(); c.rect(PX, PY, PW, PH); c.clip();
      const jx = Math.sin(t * 7.3) * 1.2 + Math.sin(t * 2.1) * 0.8, jy = Math.cos(t * 5.1) * 1; // 끝까지 당긴 손떨림
      const k = (PW / VW) * z;
      const ox = PX + PW / 2 - fx * k + jx * z, oy = PY + PH / 2 - fy * k + jy * z;
      c.imageSmoothingEnabled = false;
      c.drawImage(canvasOf(pic), ox, oy, VW * k, VH * k);
      c.restore();
      // 손가락 자리 (키우는 중심)
      if (end < 0) {
        const cx = PX + PW / 2, cy = PY + PH / 2, r = 6 + (z - 1) * 3;
        c.fillStyle = 'rgba(255,255,255,0.55)';
        for (let a = 0; a < 20; a++) { if (a % 2) continue; const th = (a / 20) * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r), 1, 1); }
      } else { // 다 키웠다: 화면이 멈추고, 그 자리에 빨간 동그라미가 그려진다 (섬네일이 될 동그라미)
        const cx = PX + PW / 2, cy = PY + PH / 2, r = 22 * Math.min(1, end * 1.5);
        c.fillStyle = '#e03030';
        for (let a = 0; a < 90; a++) { const th = (a / 90) * Math.PI * 2 * Math.min(1, end * 1.5); c.fillRect(Math.round(cx + Math.cos(th) * r), Math.round(cy + Math.sin(th) * r * 0.9), 2, 2); }
      }
      // 아래: 재생 막대와 시각
      px(c, PX, PY + PH + 4, PW, 2, '#2a2c34'); px(c, PX, PY + PH + 4, Math.round(PW * ((tt % 41) / 41)), 2, '#d03a3a');
      num(c, PX + PW - 22, PY + PH + 8, 41, '#8a8e98');
      num(c, PX + 2, PY + 2, Math.round(z * 10) / 10 * 10, 'rgba(230,230,230,0.6)');
    },
  };
}


// ═══════════ 붙잡기 (3장: 아버지가 삼색이를 잡아당긴다) ═══════════
// 내 손은 꼬리를, 아버지 손은 몸통을 잡고 있다. Z 를 연타하면 당겨 온다. 당길수록 솔기가 버티지 못한다.
// 가만히 있으면 금방 끊어진다. 붙잡으면 조금 더 버틴다. 아버지는 점점 세게 잡아챈다. 어느 쪽이든 끊어진다.
function tug(): Play {
  const N = 9; // 꼬리 솔기의 땀 수
  let tt = 0, popped = 0, strain = 0, mine = 0, pull = 0, yank = 0, end = -1, shake = 0, presses = 0;
  const fluff: { x: number; y: number; vx: number; vy: number; l: number }[] = [];
  return {
    scale: 2,
    hint: 'Z 를 연타해서 붙잡는다',
    step(dt, _t, _k, hit) {
      tt += dt; shake = Math.max(0, shake - dt * 4); pull = Math.max(0, pull - dt * 3); yank = Math.max(0, yank - dt * 2.5);
      for (const f of fluff) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 30 * dt; f.l -= dt; }
      for (let i = fluff.length - 1; i >= 0; i--) if (fluff[i].l <= 0) fluff.splice(i, 1);
      if (end >= 0) { end += dt; return end > 1.6 ? 'torn' : null; }
      if (hit.has('z')) { presses++; pull = 1; mine = Math.min(1, mine + 0.12); strain = Math.max(popped / N, strain - 0.018); sfx('tap'); }
      mine = Math.max(0, mine - dt * 0.35);
      // 아버지는 몇 박자마다 잡아챈다
      if (Math.random() < dt * (tt > 2 ? 1.2 : 0.5)) { yank = 1; strain += 0.1 + tt * 0.012; shake = 1; sfx('bump'); }
      strain += dt * 0.08;
      if (strain >= 1 / N * (popped + 1) * 1.0 + 0.02) {
        popped++; shake = 0.7; sfx('hit');
        const sx = 150, sy = 62 + (popped * 20) / N;
        for (let i = 0; i < 4; i++) fluff.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 20, l: 1 + Math.random() });
        if (popped === 3) ui.hint('놓지 않는다');
        if (popped >= N) { end = 0; ui.hint(''); sfx('fabric_tear'); }
      }
      void presses;
      return null;
    },
    draw(c, t) {
      // 반 칸(실제 1px) 단위로 그린다. 판은 두 배로 키워져 있다.
      const q = (x: number, y: number, w: number, h: number, col: string): void => { c.fillStyle = col; c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h); };
      c.fillStyle = '#060508'; c.fillRect(0, 0, W, H);
      const vg = c.createRadialGradient(W / 2, 70, 20, W / 2, 70, 150);
      vg.addColorStop(0, 'rgba(60,40,36,0.35)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
      if (shake > 0.6) { c.fillStyle = `rgba(120,20,20,${((shake - 0.6) * 0.5).toFixed(2)})`; c.fillRect(0, 0, W, H); }
      // 바닥 장판 줄
      for (let y = 104; y < H; y += 7) q(0, y, W, 0.5, 'rgba(70,58,48,0.35)');
      const sh = Math.round(Math.sin(t * 70) * 2 * shake);
      const gap = end >= 0 ? Math.min(46, end * 90) : 0;
      const Y = 64; // 꼬리 가운데 높이
      const seamX = 150 + sh;
      const myX = 40 - (mine * 8 + pull * 3) - gap * 0.6 + sh; // 내 손 (꼬리 끝)
      const bodyX = seamX + gap * 0.4;
      const faX = bodyX + 22 + yank * 6;
      // ── 몸통: 등판 한 자락. 흰 바탕에 주황·검정 얼룩, 털결과 음영 ──
      const BW = 44, BT = Y - 26, BH = 58;
      q(bodyX, BT, BW, BH, '#efe8dc');
      for (let y = BT; y < BT + BH; y += 1) { const e = Math.sin(y * 0.9) * 0.8; q(bodyX - 1 + e, y, 1, 1, '#f7f2ea'); } // 왼쪽 가장자리 털끝
      q(bodyX + 4, BT, 22, 16, '#e3843a'); q(bodyX + 6, BT + 16, 14, 4, '#e3843a'); q(bodyX + 8, BT + 2, 10, 2, '#f19a52');
      q(bodyX + 26, BT + 34, 18, 24, '#2c282e'); q(bodyX + 30, BT + 30, 12, 4, '#2c282e'); q(bodyX + 28, BT + 36, 6, 1, '#454048');
      for (let y = BT + 2; y < BT + BH; y += 3) for (let x = bodyX + 2; x < bodyX + BW; x += 5) q(x + ((y * 7) % 3), y, 1, 0.5, 'rgba(0,0,0,0.07)'); // 털결
      q(bodyX, BT + BH - 4, BW, 4, 'rgba(0,0,0,0.18)'); q(bodyX + BW - 3, BT, 3, BH, 'rgba(0,0,0,0.15)');
      // ── 아버지 손: 몸통을 위에서 움켜쥔다. 굵은 마디, 거무스름한 손등, 소매 ──
      const fy = Y - 16;
      q(faX + 14, fy - 4, 40, 34, '#2f2b2e'); q(faX + 14, fy - 4, 3, 34, '#1f1c1f'); q(faX + 16, fy + 4, 38, 1, '#3b3639'); // 점퍼 소매
      q(faX, fy, 18, 26, '#7a5a48'); q(faX + 2, fy + 2, 12, 2, '#8e6c58'); // 손등
      for (let i = 0; i < 4; i++) { // 몸통을 파고든 손가락 넷
        const fx = faX - 9 + (i % 2), fyy = fy + 2 + i * 6;
        q(fx, fyy, 11, 5, '#7a5a48'); q(fx, fyy + 4, 11, 1, '#4e382d'); q(fx, fyy, 2, 5, '#5e4335'); q(fx + 7, fyy + 1, 1, 3, '#5e4335');
        q(fx - 1, fyy + 1, 2, 3, 'rgba(60,40,30,0.5)'); // 털을 누른 자국
      }
      q(faX + 5, fy + 6, 1, 8, '#5e4335'); q(faX + 9, fy + 4, 1, 10, '#5e4335'); // 힘줄
      // ── 꼬리: 굵은 털 관. 주황·흰·검 줄무늬, 위는 밝고 아래는 어둡다. 끝으로 갈수록 가늘다 ──
      const x0 = myX + 16, x1 = seamX - gap * 0.6;
      for (let x = x0; x < x1; x += 0.5) {
        const u = (x - x0) / Math.max(1, x1 - x0); // 0 = 끝, 1 = 뿌리
        const r = 4.5 + u * 2.5;
        const wob = Math.sin(x * 0.35 + t * 28) * yank * 1.1;
        const band = Math.floor((x - x0 + 3) / 11) % 3;
        const base = band === 0 ? ['#f19a52', '#e3843a', '#b8622a'] : band === 1 ? ['#fbf7f0', '#e9e1d4', '#bfb5a6'] : ['#4a444c', '#2c282e', '#18161a'];
        const cy = Y + wob;
        q(x, cy - r, 0.5, 1.5, base[0]); q(x, cy - r + 1.5, 0.5, r * 2 - 3, base[1]); q(x, cy + r - 1.5, 0.5, 1.5, base[2]);
        if (Math.sin(x * 2.3) > 0.7) { q(x, cy - r - 0.5, 0.5, 0.5, base[0]); } // 위로 삐친 털
        if (Math.sin(x * 1.7 + 1) > 0.8) { q(x, cy + r, 0.5, 0.5, base[2]); }
      }
      // ── 솔기: 꼬리와 몸통 사이 주황 실. 끊어진 땀은 벌어지고 흰 폼이 드러난다 ──
      for (let i = 0; i < N; i++) {
        const sy = Y - 6 + (i * 12) / (N - 1);
        if (i < N - popped) { q(seamX - 1.5, sy, 3.5, 1, '#ff9a3c'); q(seamX - 1.5, sy + 1, 3.5, 0.5, '#b8601c'); }
        else { q(seamX - 2 - gap * 0.1, sy, 1, 1, '#ff9a3c'); q(seamX + 1.5 + gap * 0.1, sy, 1, 1, '#ff9a3c'); q(seamX - 0.5, sy - 0.5, 1.5, 1.5, '#ece6d4'); }
      }
      // ── 내 손: 꼬리 끝을 쥔 하얀 손. 손가락이 꼬리를 감고, 힘을 주면 마디가 질린다 ──
      const my = Y - 9;
      q(myX - 34, my - 2, 34, 22, '#25272d'); q(myX - 4, my - 2, 4, 22, '#1b1c21'); q(myX - 34, my + 2, 30, 0.5, '#33363e'); // 긴소매
      q(myX, my, 16, 18, '#c9ab92'); q(myX + 1, my + 1, 12, 1.5, '#dcc0a8'); q(myX, my + 16, 16, 2, '#9c7f68');
      for (let i = 0; i < 4; i++) { // 꼬리를 위에서 감싼 손가락
        const gx = myX + 14, gy = my + 1 + i * 4.2;
        q(gx, gy, 6, 3.5, '#c9ab92'); q(gx + 5, gy + 0.5, 1, 2.5, '#9c7f68'); q(gx, gy + 3, 6, 0.5, '#8a6e58');
        if (mine > 0.35) q(gx + 2, gy + 1, 2, 1, '#efe2d6'); // 질린 마디
      }
      q(myX + 10, my - 3, 7, 4, '#c9ab92'); q(myX + 10, my - 3, 7, 1, '#dcc0a8'); // 엄지
      for (const f of fluff) q(f.x, f.y, 1.5, 1.5, 'rgba(236,230,212,' + Math.max(0, Math.min(1, f.l)).toFixed(2) + ')');
      // 아래: 남은 땀
      for (let i = 0; i < N; i++) { const x = W / 2 - N * 3 + i * 6; q(x, H - 13, 4, 3, i < N - popped ? '#ff9a3c' : '#2a2224'); if (i >= N - popped) q(x + 1, H - 12, 2, 1, '#5a4a40'); }
    },
  };
}

// ═══════════ 엄지 (3장: 서른 명이 보는 입력창) ═══════════
// 손이 떨려서 엄지가 자꾸 자판 쪽으로 내려간다. ↑ 를 눌러 엄지를 띄운다.
// 자판에 닿으면 '입력 중…' 이 뜨고, 서른 명이 그 한 줄을 본다.
function lurk(opt: GameOpt): Play {
  const chat = (opt.lines && opt.lines.length ? opt.lines : ['곰표: 저는 삼색이님 만나 봤어요']).slice(-5).map((l) => {
    const m = /^([^:]{1,8}):\s*(.*)$/.exec(l); return m ? { who: m[1], t: m[2] } : { who: '', t: l };
  });
  const BX = 72, BY = 10, BW = 112, BH = 124;
  const KY = BY + BH - 34; // 자판 윗줄
  let p = 0.35, tt = 0, jerk = 1.6, end = -1, out = '', said = 0, seen = 1, lift = 0, slip = 0, slips = 0;
  const DUR = 14;
  let mc: CanvasRenderingContext2D | null = null;
  const F = '600 5px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  const fit = (t: string, w: number): string => { if (!mc) mc = document.createElement('canvas').getContext('2d'); mc!.font = F; let s = t; while (s.length > 1 && mc!.measureText(s).width > w) s = s.slice(0, -2) + '…'; return s; };
  return {
    scale: 4,
    hint: '↑ 를 눌러 엄지를 띄운다 · 너무 들면 휴대폰이 미끄러진다',
    step(dt, _t, _k, hit) {
      tt += dt; lift -= dt;
      if (end >= 0) { end += dt; return end > 1.6 ? out : null; }
      seen = Math.min(30, seen + dt * 4.2);
      p += dt * (0.065 + tt * 0.006) + Math.sin(tt * 23) * dt * 0.05 * (1 + tt / 6);
      jerk -= dt;
      if (jerk <= 0) { p += 0.07 + Math.random() * 0.06; jerk = 1.2 + Math.random() * 1.6; sfx('heartbeat_soft'); }
      if (hit.has('up') && slip <= 0) {
        p -= 0.09; lift = 0.18;
        // 너무 세게 들면 쥔 손이 풀려서 휴대폰이 미끄러진다. 엄지가 오히려 자판 쪽으로 쏠린다.
        if (p < 0.04) { p = 0.62; slip = 0.7; slips++; sfx('hit'); ui.hint(slips >= 2 ? '한 번 더 미끄러지면 놓친다' : '너무 들었다 · 휴대폰이 미끄러진다'); if (slips >= 3) p = 1; }
      }
      slip -= dt;
      p = Math.max(0, p);
      if (tt > 4 && said === 0) { said = 1; ui.hint('손이 떨린다 · 엄지를 띄운다'); }
      if (tt > 9 && said === 1) { said = 2; ui.hint('서른 명이 보고 있다'); }
      if (p >= 1) { end = 0; out = 'typing'; ui.hint(''); sfx('hit'); }
      else if (tt > DUR) { end = 0; out = 'quiet'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.8)'; c.fillRect(0, 0, W, H);
      const shake = slip > 0 ? Math.round((Math.random() - 0.5) * 5) : Math.round(Math.sin(t * 31) * (p > 0.7 ? 1 : 0));
      c.save(); c.translate(shake, 0);
      // 휴대폰
      px(c, BX - 5, BY - 4, BW + 10, BH + 10, '#0c0d11'); px(c, BX - 4, BY - 3, BW + 8, 1, '#262830');
      px(c, BX, BY, BW, BH, '#14161c');
      // 위 칸: 채널 이름, 보는 사람 수
      px(c, BX, BY, BW, 11, '#1c1f28'); px(c, BX, BY + 11, BW, 1, '#2a2e3a');
      c.font = F; c.textBaseline = 'middle';
      c.fillStyle = '#8a92a6'; c.fillText('#', BX + 4, BY + 6); c.fillStyle = '#e6e8ee'; c.fillText('잡담', BX + 10, BY + 6);
      // 보는 사람: 얼굴 없는 동그라미 서른 개 중 켜진 만큼
      for (let i = 0; i < 10; i++) { const on = i < Math.round(seen / 3); ell(c, BX + BW - 46 + i * 3.4, BY + 6, 1.2, 1.2, on ? '#c8ccd6' : '#3a3e4a'); }
      num(c, BX + BW - 10, BY + 4, Math.round(seen), '#c8ccd6');
      // 대화
      let y = BY + 14;
      for (const m of chat) {
        ell(c, BX + 7, y + 5, 3, 3, m.who === '곰표' ? '#8a6a4a' : '#4a5060');
        c.fillStyle = m.who === '곰표' ? '#c8a07a' : '#8a92a6'; c.fillText(m.who, BX + 13, y + 2.5);
        c.fillStyle = '#dfe2e8'; c.fillText(fit(m.t, BW - 18), BX + 13, y + 8.5);
        y += 12;
      }
      // 입력 중
      if (out === 'typing') {
        px(c, BX, KY - 17, BW, 7, '#14161c'); c.fillStyle = '#e6e8ee'; c.fillText('삼색이님이 입력 중', BX + 5, KY - 13.5);
        for (let i = 0; i < 3; i++) ell(c, BX + 58 + i * 4, KY - 13.5, 1.2, 1.2, (Math.floor(t * 4) % 3) === i ? '#ffffff' : '#6a7080');
      }
      // 입력창과 커서
      px(c, BX + 3, KY - 9, BW - 6, 7, '#20232c'); px(c, BX + 3, KY - 9, BW - 6, 1, '#2c303c');
      if (Math.floor(t * 2) % 2 === 0) px(c, BX + 6, KY - 7, 1, 4, '#e6e8ee');
      // 자판
      px(c, BX, KY, BW, BH - (KY - BY), '#1a1c22');
      const kw = 10, rows = [10, 9, 7];
      const thumbX = BX + BW - 40 + Math.sin(t * 1.3) * 6, thumbY = BY + 24 + p * (KY - BY - 18);
      rows.forEach((n, r) => {
        const ox = BX + (BW - n * (kw + 1)) / 2;
        for (let i = 0; i < n; i++) {
          const kx = ox + i * (kw + 1), ky = KY + 3 + r * 9;
          const under = Math.abs(kx + kw / 2 - thumbX) < kw / 2 + 0.5 && r === 0;
          px(c, kx, ky, kw, 7, under && p > 0.75 ? '#4a4f60' : '#2c2f38'); px(c, kx, ky + 7, kw, 1, '#101116');
        }
      });
      // 엄지: 아래 오른쪽에서 올라온 손가락. 끝이 자판에 가까울수록 그림자가 짙다
      const tipY = Math.round(thumbY);
      const sh = Math.max(0, p - 0.5) * 2;
      if (sh > 0) ell(c, thumbX, KY + 5, 6 * sh + 1, 2 * sh + 0.5, 'rgba(0,0,0,' + (0.25 + sh * 0.4).toFixed(2) + ')');
      c.fillStyle = '#c9ab92';
      c.beginPath(); c.moveTo(thumbX - 7, tipY + 2); c.quadraticCurveTo(thumbX - 7, tipY - 6, thumbX, tipY - 6); c.quadraticCurveTo(thumbX + 7, tipY - 6, thumbX + 8, tipY + 2);
      c.lineTo(BX + BW + 22, H + 4); c.lineTo(BX + BW - 6, H + 4); c.closePath(); c.fill();
      px(c, thumbX - 4, tipY - 5, 7, 4, '#e2cdb8'); px(c, thumbX - 3, tipY - 4, 5, 2, '#efe2d6'); // 손톱
      px(c, thumbX + 6, tipY + 1, 1, 5, '#9c7f68'); // 엄지 옆 그늘
      if (lift > 0) { px(c, thumbX - 1, tipY - 10 - (0.18 - lift) * 20, 2, 2, 'rgba(240,236,228,0.5)'); }
      c.restore();
      // 아래: 얼마나 내려갔는지
      // 왼쪽 세로 막대: 엄지가 자판에서 얼마나 떨어졌는지. 위 끝은 너무 들었다, 아래 끝은 닿았다.
      const GX = BX - 16, GY = BY + 20, GH = 90;
      px(c, GX, GY, 3, GH, '#2a2c34'); px(c, GX, GY, 3, 4, '#5a3a30'); px(c, GX, GY + GH - 14, 3, 14, '#4a2226');
      const gy = GY + Math.round(Math.min(1, p) * (GH - 3));
      px(c, GX - 2, gy, 7, 3, p > 0.8 || p < 0.08 ? '#d8574e' : '#e6e8ee');
      for (let i = 0; i < 3 - slips; i++) ell(c, GX + 1.5, GY + GH + 6 + i * 5, 1.5, 1.5, '#8a92a6'); // 남은 손아귀 힘
    },
  };
}

// ═══════════ 영상 (3장: 구독자 사십만 채널) ═══════════
// 내가 나오는 영상을 본다. Z 를 누르면 끈다. 안 누르면 끝까지 간다. 보는 동안 숫자가 오른다.
const WATCH_SUB = [
  "여러분, 이게 '퍼리'라는 건데요.",
  '쉽게 말해서 동물 탈을 쓰고',
  '성적 만족을 얻는 사람들입니다.',
  '해외에서는 이미 심각한 사회 문제고요.',
  '문제는 이 남성이 한 달 동안 새벽마다',
  '초등학생 아이와 단둘이 있었다는 겁니다.',
  '전문가들은 이런 성향이',
  '범죄로 이어질 수 있다고 경고합니다.',
  '제보에 따르면 이십 대 중반, 무직.',
  '사 년째 집 밖으로 나오지 않았다고 합니다.',
  '영상이 유익하셨다면 구독과 좋아요 부탁드립니다.',
];
function watch(opt: GameOpt): Play {
  const face = canvasOf(videoFace(!!opt.droopy)), play = canvasOf(videoPlayground(!!opt.droopy));
  const PER = 1.7, DUR = WATCH_SUB.length * PER + 0.6;
  let tt = 0, end = -1, out = '', views = 412700, said = 0;
  const F = '600 5px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  return {
    scale: 4,
    hint: 'Z 를 누르면 끈다',
    step(dt, _t, _k, hit) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 1.2 ? out : null; }
      views += dt * (3 + Math.random() * 9);
      if (tt > 7 && said === 0) { said = 1; ui.hint('Z 를 누르면 끈다 · 숫자가 오른다'); }
      if (hit.has('z')) { end = 0; out = 'off'; ui.hint(''); sfx('tap'); }
      else if (tt > DUR) { end = 0; out = 'end'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H);
      const VX = 24, VY = 8, VW = 208, VH = 117;
      const cur = Math.min(WATCH_SUB.length - 1, Math.floor(tt / PER));
      c.save(); c.beginPath(); c.rect(VX, VY, VW, VH); c.clip();
      c.imageSmoothingEnabled = false;
      // 장면: 처음엔 옆얼굴(빨간 동그라미), 아이 얘기에서 놀이터, 다시 옆얼굴로 당긴다
      const usePlay = cur >= 4 && cur <= 6;
      const zoom = 1 + (usePlay ? 0 : Math.min(0.5, (tt % 5) * 0.06));
      const iw = VW * zoom, ih = VH * zoom;
      c.drawImage(usePlay ? play : face, VX + (VW - iw) * 0.4, VY + (VH - ih) * 0.4, iw, ih);
      if (!usePlay) { // 빨간 동그라미가 깜빡인다
        if (Math.floor(t * 3) % 2 === 0) { c.strokeStyle = '#ff2a2a'; c.lineWidth = 2; c.beginPath(); c.ellipse(VX + 112 * zoom - (iw - VW) * 0.4, VY + 44 * zoom - (ih - VH) * 0.4, 26, 30, 0, 0, 7); c.stroke(); }
      } else { // 아이 쪽에 노란 화살표
        c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(VX + 150, VY + 40); c.lineTo(VX + 160, VY + 34); c.lineTo(VX + 158, VY + 46); c.fill();
      }
      if (end >= 0 && out === 'off') { c.fillStyle = 'rgba(0,0,0,' + Math.min(1, end * 2).toFixed(2) + ')'; c.fillRect(VX, VY, VW, VH); }
      c.restore();
      // 자막: 흰 글씨에 검은 테
      if (!(end >= 0 && out === 'off')) {
        c.font = F; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        c.lineWidth = 2; c.strokeStyle = '#000'; c.fillStyle = '#fff';
        c.strokeText(WATCH_SUB[cur], VX + VW / 2, VY + VH - 9); c.fillText(WATCH_SUB[cur], VX + VW / 2, VY + VH - 9);
        c.textAlign = 'left';
        // 기계로 바꾼 목소리: 왼쪽 위의 파형
        for (let i = 0; i < 12; i++) { const a = Math.abs(Math.sin(t * 13 + i * 1.7)) * 4 + 1; px(c, VX + 6 + i * 2, VY + 8 - a / 2, 1, a, 'rgba(255,255,255,0.7)'); }
      }
      // 아래 막대: 재생 위치, 조회수
      px(c, VX, VY + VH + 2, VW, 2, '#2a2c34'); px(c, VX, VY + VH + 2, Math.round(VW * Math.min(1, tt / DUR)), 2, '#e8302a');
      ell(c, VX + VW * Math.min(1, tt / DUR), VY + VH + 3, 2, 2, '#e8302a');
      c.font = F; c.fillStyle = '#9aa2b4'; c.textBaseline = 'middle'; c.fillText('조회수', VX, VY + VH + 10);
      c.fillStyle = '#e6e8ee'; c.fillText(Math.floor(views).toLocaleString('ko-KR') + '회', VX + 22, VY + VH + 10);
      c.fillStyle = '#9aa2b4'; c.fillText('구독자 40만', VX + VW - 46, VY + VH + 10);
    },
  };
}

// ═══════════ 나가기 (4장: 대화방을 하나씩) ═══════════
// Z 를 누르면 '나가기', 한 번 더 누르면 정말 나간다. 위에서부터. 마지막 방에서는 손이 멈춘다.
const ROOMS = ['털날림 주의보 · 잡담', '털날림 주의보 · 정모 공지', '털날림 주의보 · 탈 만들기', '털날림 주의보 · 그림 자랑', '굿즈 공동구매 3차', '탈 재료 나눔방', '108동 택배 알림', '토토'];
function leave(all = false): Play {
  const rooms = ROOMS.map((n) => ({ n, gone: 0 }));
  let tt = 0, ask = false, idx = 0, end = -1, idle = 0;
  const LAST = all ? rooms.length : rooms.length - 1; // 닿은 사람이 있으면 토토 방에서 손이 멈춘다. 아무도 없으면 그 방도 나간다
  const F = '600 5px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  return {
    scale: 4,
    hint: 'Z 를 누르면 나간다',
    step(dt, _t, _k, hit) {
      tt += dt; idle += dt;
      for (const r of rooms) if (r.gone > 0) r.gone += dt;
      if (end >= 0) { end += dt; return end > 2.4 ? 'left' : null; }
      if (hit.has('z') && idx < LAST) {
        idle = 0;
        if (!ask) { ask = true; sfx('tap'); } else { ask = false; rooms[idx].gone = 0.01; idx++; sfx('tap'); }
      }
      if (idle > 9 && idx < LAST) { idle = 6.5; rooms[idx].gone = 0.01; idx++; ask = false; sfx('tap'); } // 손이 저절로 한다
      if (idx === LAST) { end = 0; ui.hint('…'); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.82)'; c.fillRect(0, 0, W, H);
      const BX = 72, BY = 8, BW = 112, BH = 128;
      px(c, BX - 5, BY - 4, BW + 10, BH + 8, '#0c0d11');
      px(c, BX, BY, BW, BH, '#14161c'); px(c, BX, BY, BW, 11, '#1c1f28');
      c.font = F; c.textBaseline = 'middle'; c.fillStyle = '#e6e8ee'; c.fillText('대화', BX + 5, BY + 6);
      let y = BY + 15;
      rooms.forEach((r, i) => {
        if (r.gone > 0.6) return;
        const a = r.gone > 0 ? 1 - r.gone / 0.6 : 1, off = r.gone > 0 ? r.gone * 60 : 0;
        c.globalAlpha = a;
        const sel = i === idx && end < 0;
        px(c, BX + 2 - off, y, BW - 4, 14, sel ? '#232734' : '#181a21');
        ell(c, BX + 9 - off, y + 7, 4, 4, '#4a5060');
        c.fillStyle = '#dfe2e8'; c.fillText(r.n, BX + 16 - off, y + 5);
        c.fillStyle = '#6a7080'; c.fillText(i === ROOMS.length - 1 ? (all ? '…' : '긴 메시지') : i < 4 ? '읽지 않음 ' + (30 + i * 17) : '…', BX + 16 - off, y + 11);
        if (sel && ask) { px(c, BX + BW - 26, y + 3, 22, 9, '#c0403a'); c.fillStyle = '#fff'; c.fillText('나가기', BX + BW - 23, y + 7.5); }
        c.globalAlpha = 1;
        y += 16;
      });
      // 엄지 그늘
      if (end >= 0 && all) { c.fillStyle = '#6a7080'; c.textAlign = 'center'; c.fillText('대화방이 없습니다', BX + BW / 2, BY + BH / 2); c.textAlign = 'left'; }
      if (end >= 0 && !all) { // 마지막 방 위에서 엄지가 멈춘다
        const ty = BY + 15 + 7; px(c, BX + BW - 30, ty - 2 + Math.sin(t * 9) * 0.6, 8, 6, '#c9ab92'); px(c, BX + BW - 29, ty - 1, 4, 2, '#efe2d6');
      }
    },
  };
}

// ═══════════ 그네 (1장: 처음 나온 밤) ═══════════
// 앞으로 갈 때 → , 뒤로 올 때 ← . 박자가 맞으면 높아지고, 어긋나면 줄어든다.
// together: 옆 그네의 아이 높이에 맞춰 타면, 두 그네의 박자가 저절로 같아진다.
function swing(together: boolean): Play {
  const OM = 2.15; // 흔들리는 빠르기 (라디안/초)
  let A = 0.08, ph = 0, tt = 0, high = 0, end = -1, out = '', sync = 0, said = 0, kick = 0, lastHalf = -1;
  let hph = Math.PI * 0.9; const HA = 0.34; // 아이 그네
  const stars = Array.from({ length: 34 }, (_, i) => [((i * 73) % 256), ((i * 41) % 60), (i % 3) + 1]);
  return {
    scale: 2,
    peek: () => ({ A, ph, hph, sync, v: Math.cos(ph) }),
    hint: together ? '아이 그네 높이에 맞춰 탄다 · 앞으로 갈 때 → 뒤로 올 때 ←' : '앞으로 갈 때 → · 뒤로 올 때 ← · 박자를 맞춰 발을 구른다',
    step(dt, _t, _k, hit) {
      tt += dt; kick -= dt;
      if (end >= 0) { end += dt; A = Math.max(0, A - dt * 0.05); ph += OM * dt; hph += OM * dt; return end > 1.8 ? out : null; }
      ph += OM * dt; hph += OM * dt;
      const v = Math.cos(ph); // + 면 앞으로 간다
      const push = (dir: number): void => {
        const half = Math.floor((ph + Math.PI / 2) / Math.PI); // 한 번 갔다 오는 사이의 반쪽마다 한 번만 구를 수 있다
        if (half === lastHalf) return;
        lastHalf = half;
        if (dir * v > 0.25) { A = Math.min(0.95, A + (together ? 0.09 : 0.13) * (1 - A)); kick = 0.3; sfx('swing_creak'); }
        else A = Math.max(0.03, A - 0.04); // 거꾸로 구르면 그네가 멈칫한다
      };
      if (hit.has('right')) push(1);
      if (hit.has('left')) push(-1);
      A = Math.max(0.03, A - dt * 0.016);
      if (!together) {
        if (A > 0.6) high += dt;
        if (A > 0.4 && said === 0) { said = 1; ui.hint('조금 더'); }
        if (A > 0.6 && said === 1) { said = 2; ui.hint('발끝이 가로등에 닿을 것 같다'); }
        if (high > 3) { end = 0; out = 'high'; ui.hint(''); }
        else if (tt > 22) { end = 0; out = A > 0.45 ? 'high' : 'low'; ui.hint(''); }
      } else {
        const near = Math.abs(A - HA) < 0.1;
        if (near) { // 높이가 맞으면 박자가 서로 끌려 같아진다
          let d = ((hph - ph) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
          ph += d * Math.min(1, dt * 0.9);
          d = ((hph - ph) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
          if (Math.abs(d) < 0.5) sync += dt;
        }
        if (A > HA + 0.18 && said === 0) { said = 1; ui.hint('너무 높다 · 아이가 고개를 든다'); }
        if (sync > 2.5 && said < 2) { said = 2; ui.hint('박자가 같아진다'); }
        if (sync > 7) { end = 0; out = 'together'; ui.hint(''); }
        else if (tt > 28) { end = 0; out = 'apart'; ui.hint(''); }
      }
      return null;
    },
    draw(c, t) {
      // 밤하늘과 단지 불빛
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05070d'); g.addColorStop(0.7, '#0d1220'); g.addColorStop(1, '#161a22');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (const [x, y, k] of stars) if ((Math.floor(t * 0.7 + x) % 7) !== 0) px(c, x, y, 1, 1, k === 1 ? '#3a4258' : '#5a6480');
      for (let b = 0; b < 5; b++) { // 단지 동들: 실루엣과 몇 개 남은 불 켜진 창
        const bx = 4 + b * 52, bh = 62 + (b % 2) * 16, by = H - 30 - bh;
        c.fillStyle = '#10141f'; c.fillRect(bx, by, 44, bh); c.fillStyle = '#151a28'; c.fillRect(bx, by, 44, 1); c.fillStyle = '#0c0f18'; c.fillRect(bx + 40, by, 4, bh);
        for (let wy = 0; wy < bh - 10; wy += 6) for (let wx = 3; wx < 38; wx += 5) { const on = ((wx * 7 + wy * 13 + b * 5) % 23) === 0; c.fillStyle = on ? '#c89a52' : '#161b29'; c.fillRect(bx + wx, by + 5 + wy, 2, 2); }
        c.fillStyle = '#2a3040'; c.font = '600 5px sans-serif'; c.fillText(String(105 + b), bx + 16, by + 8);
      }
      // 가로등
      const lg = c.createRadialGradient(214, 30, 2, 214, 30, 70); lg.addColorStop(0, 'rgba(255,214,140,0.5)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = lg; c.fillRect(140, 0, 116, 110); px(c, 213, 30, 2, H - 60, '#2a2a30'); px(c, 208, 28, 12, 3, '#e8d2a0');
      // 모래
      px(c, 0, H - 30, W, 30, '#2a2620'); for (let i = 0; i < 60; i++) px(c, (i * 37) % W, H - 28 + ((i * 11) % 26), 1, 1, '#3a342a');
      // 그네 틀 (옆에서)
      const TX = together ? 100 : 128, TY = 26;
      px(c, TX - 52, TY, 104, 3, '#4a4038'); px(c, TX - 52, TY + 3, 104, 1, '#2a241e');
      c.strokeStyle = '#4a4038'; c.lineWidth = 3; c.beginPath(); c.moveTo(TX - 50, TY); c.lineTo(TX - 66, H - 30); c.moveTo(TX + 50, TY); c.lineTo(TX + 66, H - 30); c.stroke();
      const L = 64;
      const rider = (ox: number, ang: number, me: boolean, kicking: boolean): void => {
        const sx = ox + Math.sin(ang) * L, sy = TY + Math.cos(ang) * L;
        c.strokeStyle = '#8a8f99'; c.lineWidth = 1; c.beginPath(); c.moveTo(ox, TY + 2); c.lineTo(sx, sy); c.stroke();
        px(c, sx - 7, sy, 14, 2, '#6a4a30');
        const fx = Math.cos(ang), fy = -Math.sin(ang); // 진행 방향
        if (me) {
          // 삼색이: 등은 사슬 쪽, 다리는 앞으로. 몸통 진회색 후드, 꼬리는 뒤로 처진다
          const leg = kicking ? 9 : 6;
          c.strokeStyle = '#2c2c34'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx + 2, sy); c.lineTo(sx + 2 + fx * leg + 3, sy + 6 - fy * 2); c.stroke();
          px(c, sx - 5, sy - 13, 9, 13, '#34343e'); px(c, sx - 5, sy - 13, 2, 13, '#26262e');
          // 꼬리
          c.strokeStyle = '#e07a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - 5, sy - 1); c.quadraticCurveTo(sx - 12 - fx * 4, sy + 2, sx - 10 - fx * 6, sy + 8); c.stroke();
          px(c, Math.round(sx - 11 - fx * 6), Math.round(sy + 7), 2, 2, '#1a1a1a');
          // 고양이 머리: 크림 바탕에 주황·검정 얼룩, 처진 귀
          const hx = sx - 6, hy = sy - 25;
          px(c, hx, hy, 12, 11, '#efe6d6'); px(c, hx, hy, 5, 5, '#e07a2a'); px(c, hx + 8, hy + 1, 4, 4, '#1c1c20');
          px(c, hx - 1, hy - 2, 3, 3, '#e07a2a'); px(c, hx + 10, hy - 1, 3, 2, '#1c1c20');
          px(c, hx + 8 + (fx > 0 ? 1 : -1), hy + 5, 2, 2, '#2a3a2a'); px(c, hx + 9, hy + 8, 2, 1, '#e89aa0');
        } else {
          // 하은: 작은 몸, 잠옷 바지, 슬리퍼. 얼굴은 그리지 않는다
          const leg = 5 + Math.max(0, Math.sin(hph * 1)) * 2;
          c.strokeStyle = '#8aa6c8'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + 1, sy); c.lineTo(sx + 1 + fx * leg, sy + 5); c.stroke();
          px(c, Math.round(sx + fx * leg), sy + 5, 3, 1, '#e8c0d0');
          px(c, sx - 3, sy - 9, 6, 9, '#e8e4dc'); px(c, sx - 3, sy - 9, 1, 9, '#c8c4bc');
          px(c, sx - 3, sy - 15, 6, 6, '#2a2220'); px(c, sx - 2, sy - 13, 4, 4, '#c9a48a');
        }
      };
      if (together) rider(TX + 40, Math.sin(hph) * HA, false, false);
      rider(TX - (together ? 20 : 0), Math.sin(ph) * A, true, kick > 0);
      // 높이 눈금: 혼자일 때는 가로등까지, 같이일 때는 아이 높이 표시
      const bx = 18, by = 30, bh = 80;
      px(c, bx, by, 3, bh, '#1e2230');
      if (together) { const hy = by + bh - Math.round(bh * HA / 0.95); px(c, bx - 2, hy - 4, 7, 9, 'rgba(232,192,208,0.25)'); }
      else px(c, bx - 2, by + bh - Math.round(bh * 0.6 / 0.95), 7, 1, '#e8d2a0');
      px(c, bx - 1, by + bh - Math.round(bh * A / 0.95), 5, 2, '#efe6d6');
      if (together) { const k = Math.min(1, sync / 7); px(c, W - 26, by + bh - Math.round(bh * k), 3, Math.round(bh * k), '#e8c0d0'); px(c, W - 26, by, 3, 1, '#4a4a58'); }
    },
  };
}

// ═══════════ 단체 사진 (2장: 타이머 십 초) ═══════════
// Z 를 누르고 있으면 하트를 만든 채로 버틴다. 곰이 끌어안을수록 덥고 팔이 떨린다. 셔터 전에 놓으면 나만 흔들린다.
function photo(opt: GameOpt): Play {
  let tt = 0, heat = 0.35, shake = 0, held = 0, end = -1, out = '', said = 0;
  const T = 10.5;
  const pic = canvasOf(groupPhoto(!!opt.droopy)); // 3장에 퍼지는 바로 그 사진
  const IX = 8, IY = 4, CX = 124, CY = 40; // 사진 속 삼색이 자리 (cuts.ts groupPhoto)
  return {
    scale: 2,
    peek: () => ({ shake, tt }),
    hint: 'Z 를 누르고 있는다 · 셔터까지 그대로 버틴다',
    step(dt, _t, k) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 2.2 ? out : null; }
      const hug = tt > 2.2 ? 1 : 0; // 곰이 뒤에서 끌어안는다
      heat = Math.min(1, heat + dt * (0.03 + hug * 0.05));
      if (k.z) { held += dt; shake = Math.min(1, shake + dt * (0.05 + heat * 0.12)); } else { held = 0; shake = Math.max(0, shake - dt * 0.6); }
      if (tt > 4 && said === 0) { said = 1; ui.hint('곰이 끌어안는다 · 덥다'); }
      if (shake > 0.62 && said < 3) { said = 3; ui.hint('팔이 떨린다 · 잠깐 풀었다가 다시 만든다'); }
      if (tt > 7.4 && said !== 4 && said !== 0) { said = 4; ui.hint('삼. 이. 일.'); }
      if (tt > T) { end = 0; out = k.z && shake < 0.85 ? 'clear' : 'blur'; ui.hint(''); sfx('camera_shutter'); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = '#120e0c'; c.fillRect(0, 0, W, H);
      c.imageSmoothingEnabled = false;
      const frozen = end >= 0;
      // 화면: 휴대폰 타이머 미리보기. 아직 찍히기 전이라 살짝 어둡고, 찍히는 순간 밝게 굳는다
      c.globalAlpha = frozen ? 1 : 0.9; c.drawImage(pic, IX, IY); c.globalAlpha = 1;
      // 나만 움직인다: 버티지 않거나 팔이 떨리면 사진 속 내 자리만 흔들린다
      const still = held > 0 || (frozen && out === 'clear');
      const jx = frozen ? (out === 'blur' ? 2 : 0) : !still ? Math.round(Math.sin(t * 9) * 2) : shake > 0.35 ? Math.round((Math.random() - 0.5) * shake * 4) : 0;
      if (jx) { c.globalAlpha = 0.55; c.drawImage(pic, CX - 22, CY, 44, 70, IX + CX - 22 + jx, IY + CY, 44, 70); c.globalAlpha = 1; }
      // 더위: 가장자리가 하얗게 든다 (탈 안에서 보는 것처럼)
      const hg = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 150); hg.addColorStop(0, 'rgba(255,250,240,0)'); hg.addColorStop(1, 'rgba(255,248,236,' + (heat * 0.5).toFixed(2) + ')');
      c.fillStyle = hg; c.fillRect(0, 0, W, H);
      // 미리보기 테두리와 타이머
      if (!frozen) {
        c.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [x, y, dx, dy] of [[14, 10, 1, 1], [W - 14, 10, -1, 1], [14, H - 10, 1, -1], [W - 14, H - 10, -1, -1]] as const) { c.fillRect(Math.min(x, x + dx * 12), y, 12, 1); c.fillRect(x, Math.min(y, y + dy * 12), 1, 12); }
        const left = Math.max(0, Math.ceil(10 - tt * (10 / T)));
        c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(W - 46, 12, 30, 16);
        if (Math.floor(t * 2) % 2 === 0) { c.fillStyle = '#e8302a'; c.beginPath(); c.arc(W - 40, 20, 2.5, 0, 7); c.fill(); }
        num(c, W - 34, 15, left, '#ffffff', 2);
        // 팔 떨림
        c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(16, H - 34, 7, 22);
        c.fillStyle = '#2a2224'; c.fillRect(18, H - 32, 3, 18); c.fillStyle = shake > 0.7 ? '#d8574e' : '#efe6d6'; c.fillRect(18, H - 14 - Math.round(18 * shake), 3, Math.round(18 * shake));
      } else { const f = Math.max(0, 1 - end * 1.6); c.fillStyle = 'rgba(255,255,255,' + f.toFixed(2) + ')'; c.fillRect(0, 0, W, H); }
    },
  };
}

// ═══════════ 물병 (2장: 머리를 벗는 방) ═══════════
// 현우가 물병을 던진다. 손 앞에 왔을 때 Z.
function catchb(): Play {
  let tt = 0, end = -1, out = '', tried = false, at = -1;
  const FLY = 1.15, START = 0.9;
  return {
    scale: 2,
    peek: () => ({ f: (tt - START) / FLY }),
    hint: '물병이 손 앞에 오면 Z',
    step(dt, _t, _k, hit) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 1.4 ? out : null; }
      const f = (tt - START) / FLY;
      if (hit.has('z') && !tried && f > 0) { tried = true; at = f; if (f > 0.84 && f < 1.04) { end = 0; out = 'caught'; sfx('tap'); } }
      if (f > 1.3) { end = 0; out = 'dropped'; sfx('bump'); }
      return null;
    },
    draw(c) {
      // 뒤에 휴게실 맵이 비친다. 앞에는 내 두 손만 크게 (머리는 벗었고, 몸은 아직 삼색이다)
      c.fillStyle = 'rgba(8,8,12,0.38)'; c.fillRect(0, 0, W, H);
      const f = Math.max(0, Math.min(1.3, (tt - START) / FLY));
      const hx = 112, hy = 112;
      const paw = (x: number, y: number, flip: number): void => {
        c.fillStyle = '#26262e'; c.fillRect(x - 12, y + 8, 24, 40); c.fillStyle = '#34343e'; c.fillRect(x - 11, y + 8, 22, 40); // 소매(몸통 털)
        c.fillStyle = '#1a1a20'; c.beginPath(); c.ellipse(x, y + 2, 14, 12, 0, 0, 7); c.fill();
        c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(x, y + 2, 13, 11, 0, 0, 7); c.fill();
        c.fillStyle = '#d8ccba'; c.beginPath(); c.ellipse(x + flip * 4, y + 6, 8, 5, 0, 0, 7); c.fill();
        if (flip < 0) { c.fillStyle = '#e07a2a'; c.beginPath(); c.ellipse(x - 5, y - 3, 6, 5, 0.4, 0, 7); c.fill(); }
        c.fillStyle = '#e89aa0'; c.beginPath(); c.ellipse(x, y + 4, 5, 4, 0, 0, 7); c.fill(); // 큰 젤리
        for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x - 7.5 + i * 5, y - 4 - (i === 1 || i === 2 ? 1.5 : 0), 2, 2.4, 0, 0, 7); c.fill(); } // 발가락 젤리
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x - 1, y + 2, 2, 1);
      };
      const reach = end >= 0 && out === 'caught' ? 0 : f > 0.5 ? Math.min(1, (f - 0.5) * 2) * 4 : 0;
      paw(hx - 18 + reach, hy - reach, -1); paw(hx + 18 - reach, hy - reach, 1);
      // 물병: 오른쪽 위(현우 쪽)에서 포물선
      const bottle = (x: number, y: number, r: number): void => {
        c.save(); c.translate(x, y); c.rotate(r);
        c.fillStyle = 'rgba(160,205,240,0.85)'; c.fillRect(-4, -9, 8, 18); c.fillStyle = 'rgba(120,170,215,0.9)'; c.fillRect(-4, -2, 8, 5);
        c.fillStyle = '#2a6ac0'; c.fillRect(-3, -12, 6, 3); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-3, -7, 1, 12);
        c.restore();
      };
      if (tt > START && !(end >= 0 && out === 'caught')) {
        const sx = 214, sy = 30, ex = hx, ey = hy - 10;
        const bx = sx + (ex - sx) * f, by = sy + (ey - sy) * f - Math.sin(Math.min(1, f) * Math.PI) * 36 + (f > 1 ? (f - 1) * 140 : 0);
        bottle(bx, by, f * 8);
      } else if (tt <= START) { c.fillStyle = 'rgba(255,240,200,' + (0.4 + Math.sin(tt * 12) * 0.2).toFixed(2) + ')'; c.font = '600 6px sans-serif'; c.fillText('현우: 받아요!', 186, 26); }
      if (end >= 0 && out === 'caught') bottle(hx, hy - 10, 0);
      // 받는 자리: 두 손 사이 (물병이 오면 밝아진다)
      c.strokeStyle = f > 0.8 && f < 1.05 ? 'rgba(255,240,200,0.95)' : 'rgba(255,240,200,0.22)'; c.lineWidth = 1; c.beginPath(); c.arc(hx, hy - 10, 11, 0, 7); c.stroke();
      void at;
    },
  };
}

// ═══════════ 지퍼 (2장: 1호선) ═══════════
// → 를 누르고 있으면 지퍼가 올라간다. 털이 삐져나온 자리에서 걸린다. 걸린 자리에서 Z 로 털을 밀어 넣는다.
// 시선이 쌓일수록 손이 떨려서 지퍼가 뒤로 밀린다.
function zip(): Play {
  const X0 = 40, X1 = 216, TY = 74;
  const tufts = [78, 128, 176].map((x) => ({ x, in: 0 }));
  let zx = X0, tt = 0, stare = 0.2, end = -1, out = '', snag = 0, slipT = 1.2, said = 0;
  return {
    scale: 2,
    peek: () => ({ zx, snag: snag > 0 ? 1 : 0, stare }),
    hint: '→ 를 누르고 있으면 지퍼가 올라간다 · 털에 걸리면 Z 로 밀어 넣는다',
    step(dt, _t, k, hit) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 1.4 ? out : null; }
      stare = Math.min(1, stare + dt * 0.07);
      const ahead = tufts.find((f) => f.in < 1 && f.x > zx - 2 && f.x - zx < 9);
      snag = ahead ? 1 : 0;
      if (k.right && !ahead) zx += dt * 38;
      if (hit.has('z')) { const near = tufts.find((f) => f.in < 1 && Math.abs(f.x - zx) < 14); if (near) { near.in = Math.min(1, near.in + 0.34); sfx('tap'); } }
      slipT -= dt;
      if (slipT <= 0) { slipT = 1.9 - stare * 0.8 + Math.random() * 0.6; zx = Math.max(X0, zx - (5 + stare * 9)); sfx('bump'); if (said < 2) { said++; ui.hint(said === 1 ? '손이 떨린다 · 지퍼가 헛돈다' : '아이 엄마가 이쪽을 본다'); } }
      if (zx >= X1) { end = 0; out = 'zipped'; ui.hint(''); sfx('coin'); }
      else if (tt > 15) { end = 0; out = 'fumbled'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = '#1a1c22'; c.fillRect(0, 0, W, H);
      // 가방 윗면: 군용 가방. 국방색 천, 박음질, 손잡이 끈
      c.fillStyle = '#3e4430'; c.fillRect(24, 40, W - 48, 74); c.fillStyle = '#343a28'; c.fillRect(24, 40, W - 48, 3); c.fillRect(24, 111, W - 48, 3);
      c.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 28; x < W - 28; x += 3) { c.fillRect(x, 44, 1, 1); c.fillRect(x, 108, 1, 1); }
      c.fillStyle = '#2a2e20'; c.fillRect(W / 2 - 20, 94, 40, 4); c.fillRect(W / 2 - 22, 92, 4, 8); c.fillRect(W / 2 + 18, 92, 4, 8);
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(30 + ((i * 53) % (W - 60)), 46 + ((i * 29) % 60), 1, 1); }
      // 지퍼 이빨: 닫힌 쪽(왼쪽)은 맞물리고, 열린 쪽은 벌어져 안이 보인다
      for (let x = X0; x < X1 + 6; x += 2) {
        const closed = x < zx;
        c.fillStyle = '#8a8c92'; c.fillRect(x, TY - (closed ? 1 : 3), 1, 2); c.fillRect(x + 1, TY + (closed ? 0 : 2), 1, 2);
        if (!closed) { c.fillStyle = '#0a0a0e'; c.fillRect(x, TY - 1, 2, 3); }
      }
      // 삐져나온 털
      for (const f of tufts) {
        if (f.in >= 1) continue;
        const n = Math.round(9 * (1 - f.in));
        for (let i = 0; i < n; i++) { c.fillStyle = i % 3 === 0 ? '#f4a050' : '#e07a2a'; c.fillRect(f.x - 4 + (i % 5) * 2, TY - 3 - (i % 4) * 2 - Math.sin(t * 6 + i) * 0.6, 1, 3 + (i % 3)); }
        if (f.in < 1 && Math.abs(f.x - zx) < 14) { c.strokeStyle = 'rgba(255,240,200,0.5)'; c.beginPath(); c.arc(f.x, TY - 4, 8, 0, 7); c.stroke(); }
      }
      // 지퍼 손잡이 (떨린다)
      const j = (Math.random() - 0.5) * stare * 2;
      c.fillStyle = '#b8bac0'; c.fillRect(zx - 3 + j, TY - 4, 6, 8); c.fillStyle = '#d8dade'; c.fillRect(zx - 2 + j, TY + 4, 4, 9); c.fillStyle = '#5a5c62'; c.fillRect(zx - 1 + j, TY + 6, 2, 5);
      // 손가락: 엄지와 검지로 손잡이를 집는다
      c.fillStyle = '#b8987e'; c.beginPath(); c.ellipse(zx + j, TY + 16, 7, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(zx - 1 + j, TY + 14, 6, 4, -0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(zx + 4 + j, TY + 11, 3, 4, 0.2, 0, 7); c.fill();
      c.fillStyle = '#e2cdb8'; c.fillRect(zx + 3 + j, TY + 8, 2, 2);
      if (snag) { c.fillStyle = '#e8302a'; c.fillRect(zx + 6, TY - 9, 1, 3); c.fillRect(zx + 6, TY - 5, 1, 1); }
      // 위: 맞은편 좌석. 얼굴 없는 사람들. 휴대폰 불빛이 꺼지면서 고개가 든다
      c.fillStyle = '#20304a'; c.fillRect(8, 22, W - 16, 10); c.fillStyle = '#2a3c5a'; c.fillRect(8, 22, W - 16, 2);
      for (let i = 0; i < 7; i++) {
        const up = stare > (i * 0.11 + 0.18), x = 24 + i * 32, hy = up ? 6 : 9;
        c.fillStyle = ['#3a3a44', '#4a3a34', '#2e3a44', '#3e3a30', '#443440', '#2a3a34', '#3a3440'][i];
        c.beginPath(); c.ellipse(x, 24, 11, 8, 0, Math.PI, 0); c.fill(); c.fillRect(x - 11, 24, 22, 8); // 어깨와 몸
        c.fillStyle = '#5a4a44'; c.beginPath(); c.arc(x, hy + 5, 5, 0, 7); c.fill(); c.fillStyle = '#1e1a1a'; c.beginPath(); c.arc(x, hy + 4, 5, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillRect(x - 5, hy + 2, 10, 2); // 머리 (얼굴은 그리지 않는다)
        if (!up) { c.fillStyle = 'rgba(170,200,255,0.7)'; c.fillRect(x - 3, 21, 6, 4); c.fillStyle = 'rgba(170,200,255,0.12)'; c.fillRect(x - 6, 13, 12, 9); }
      }
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 32, W, 4);
    },
  };
}

// ═══════════ 노크 (2장: 파티룸 문 앞) ═══════════
// Z 를 누르고 있으면 손이 올라간다. 위에서 → 로 두드린다. 손을 든 동안 무서움이 찬다. 다 차면 손이 내려간다.
function knock(): Play {
  let hand = 0, dread = 0, knocks = 0, tt = 0, end = -1, out = '', drop = 0, hitT = 0, said = 0;
  const T = 14;
  return {
    scale: 2,
    peek: () => ({ hand, dread, knocks, drop }),
    hint: 'Z 를 누르고 있으면 손이 올라간다 · 위에서 → 로 두드린다',
    step(dt, _t, k, hit) {
      tt += dt; hitT -= dt;
      if (end >= 0) { end += dt; return end > 2 ? out : null; }
      drop -= dt;
      if (k.z && drop <= 0) { hand = Math.min(1, hand + dt * 1.1); dread = Math.min(1, dread + dt * (0.3 + hand * 0.35)); }
      else { hand = Math.max(0, hand - dt * 1.6); dread = Math.max(0, dread - dt * 0.3); }
      if (dread >= 1 && drop <= 0) { drop = 1.4; dread = 0.7; sfx('heartbeat'); if (said < 1) { said = 1; ui.hint('내렸다 · 다시'); } }
      if (drop > 0) hand = Math.max(0, hand - dt * 2.5);
      if (hit.has('right') && hand > 0.85 && drop <= 0) { knocks++; hitT = 0.25; hand = 0.45; dread = Math.min(1, dread + 0.26); sfx('bump'); if (knocks >= 3) { end = 0; out = 'knocked'; ui.hint(''); } }
      if (end < 0 && tt > T) { end = 0; out = 'opened'; ui.hint(''); sfx('door_open'); }
      return null;
    },
    draw(c, t) {
      c.fillStyle = '#2c2a28'; c.fillRect(0, 0, W, H);
      // 문: 철문, 종이, 발바닥 도장
      const DX = 92, DY = 10, DW = 84, DH = 134;
      const op = end >= 0 && out === 'opened' ? Math.min(1, end) : 0;
      c.fillStyle = '#5a6068'; c.fillRect(DX, DY, DW, DH); c.fillStyle = '#4a5058'; c.fillRect(DX, DY, 4, DH); c.fillStyle = '#6a7078'; c.fillRect(DX + DW - 4, DY, 4, DH);
      if (op > 0) { c.fillStyle = 'rgba(255,230,180,' + (op * 0.8).toFixed(2) + ')'; c.fillRect(DX + DW - op * 30, DY, op * 30, DH); }
      c.fillStyle = '#efe8d8'; c.fillRect(DX + 22, DY + 26, 40, 30); c.fillStyle = '#3a3a3a'; for (let i = 0; i < 4; i++) c.fillRect(DX + 26, DY + 31 + i * 6, 32 - (i % 2) * 10, 1);
      c.fillStyle = '#e07a2a'; c.beginPath(); c.arc(DX + 52, DY + 49, 3, 0, 7); c.fill(); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(DX + 48 + i * 4, DY + 44, 1.4, 0, 7); c.fill(); }
      c.fillStyle = '#c8b070'; c.fillRect(DX + 8, DY + 70, 8, 3);
      // 문 아래 틈의 빛과 웃음
      c.fillStyle = 'rgba(255,220,160,0.6)'; c.fillRect(DX + 4, DY + DH - 2, DW - 8, 2);
      if (Math.floor(t * 1.3) % 3 === 0) { c.fillStyle = 'rgba(255,230,200,0.5)'; c.font = '600 6px sans-serif'; c.fillText('하하', DX + DW + 6 + Math.sin(t) * 2, 40 + (Math.floor(t * 1.3) % 2) * 20); }
      // 손: 맨손 주먹. 왼쪽 아래에서 팔이 올라와 문 앞에 선다
      const hy = 128 - hand * 66, hx = DX - 10 + (hitT > 0 ? 7 : 0);
      const tr = dread > 0.5 ? (Math.random() - 0.5) * dread * 3 : 0;
      c.fillStyle = '#1e1e26'; c.beginPath(); c.moveTo(hx - 12 + tr, hy + 8); c.lineTo(hx + 4 + tr, hy + 10); c.lineTo(hx - 18, H + 4); c.lineTo(hx - 44, H + 4); c.closePath(); c.fill(); // 소매
      c.fillStyle = '#2a2a34'; c.beginPath(); c.moveTo(hx - 12 + tr, hy + 8); c.lineTo(hx - 6 + tr, hy + 9); c.lineTo(hx - 34, H + 4); c.lineTo(hx - 44, H + 4); c.closePath(); c.fill();
      c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(hx - 2 + tr, hy, 9, 10, 0, 0, 7); c.fill(); // 주먹
      c.fillStyle = '#b8987e'; for (let i = 0; i < 4; i++) c.fillRect(hx + 3 + tr, hy - 7 + i * 4, 4, 3); // 마디
      c.fillStyle = '#e2cdb8'; for (let i = 0; i < 4; i++) c.fillRect(hx + 5 + tr, hy - 7 + i * 4, 2, 1);
      c.fillStyle = '#a88a72'; c.fillRect(hx - 8 + tr, hy - 2, 8, 3); // 엄지
      if (hitT > 0) { c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) c.fillRect(DX + 2, hy - 8 + i * 6, 4, 1); }
      // 무서움: 화면 가장자리가 좁아진다
      const v = c.createRadialGradient(W / 2, H / 2, 60 - dread * 30, W / 2, H / 2, 150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.35 + dread * 0.55).toFixed(2) + ')');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
      // 시계와 두드린 수
      const min = 47 + Math.floor(tt / 4);
      num(c, 12, 10, 14, '#c8ccd6'); c.fillStyle = '#c8ccd6'; c.fillRect(21, 11, 1, 1); c.fillRect(21, 13, 1, 1); num(c, 23, 10, min, '#c8ccd6');
      for (let i = 0; i < 3; i++) { c.fillStyle = i < knocks ? '#efe6d6' : '#4a4a52'; c.fillRect(12 + i * 6, 20, 4, 4); }
      c.fillStyle = '#2a2224'; c.fillRect(W - 18, 30, 3, 80); c.fillStyle = dread > 0.75 ? '#d8574e' : '#8a92a6'; c.fillRect(W - 18, 110 - Math.round(80 * dread), 3, Math.round(80 * dread));
    },
  };
}

// ═══════════ 소매 (3장: 물류센터 조회 시간) ═══════════
// 반장의 장갑이 소매를 걷으려 한다. Z 를 연타해 소매 끝을 손안에 말아 쥔다. 기억이라서, 결국 걷힌다.
// 팔은 보여 주지 않는다. 걷히는 순간 하얗게 끊는다.
function sleeve(): Play {
  let tt = 0, cuff = 0, mine = 0, end = -1, said = 0, yank = 0;
  const ring = Array.from({ length: 22 }, (_, i) => ({ a: (i / 22) * Math.PI * 2, d: 0.85 + ((i * 37) % 10) / 40, v: (i * 13) % 4 }));
  return {
    scale: 2,
    peek: () => ({ cuff, tt }),
    hint: 'Z 를 연타해서 소매 끝을 쥔다',
    step(dt, _t, _k, hit) {
      tt += dt; yank -= dt;
      if (end >= 0) { end += dt; return end > 2.4 ? 'bared' : null; }
      mine = Math.max(0, mine - dt * 1.5);
      if (hit.has('z')) { cuff = Math.max(0, cuff - 0.028); mine = Math.min(1, mine + 0.14); sfx('tap'); }
      cuff += dt * (0.05 + tt * 0.012);
      if (Math.random() < dt * (tt < 3 ? 0.5 : 1.3)) { cuff += 0.08 + tt * 0.01; yank = 0.2; sfx('bump'); }
      if (tt > 3 && said === 0) { said = 1; ui.hint('사십 명이 보고 있다'); }
      if (tt > 6 && said === 1) { said = 2; ui.hint('놓지 않는다'); }
      if (cuff >= 1) { end = 0; ui.hint(''); sfx('ringing_ear'); }
      return null;
    },
    draw(c, t) {
      // 물류센터 바닥: 노란 선, 형광등, 반팔 입은 사람들의 둥근 줄
      c.fillStyle = '#2a2c30'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#3a3c40'; c.fillRect(0, 70, W, H - 70);
      c.fillStyle = '#c8a830'; c.fillRect(0, 96, W, 2); c.fillRect(0, 128, W, 2);
      for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(230,240,255,0.5)'; c.fillRect(20 + i * 64, 6, 36, 2); }
      for (const r of ring) { // 얼굴 없는 사람들. 형광 조끼
        const x = W / 2 + Math.cos(r.a) * 120 * r.d, y = 58 + Math.sin(r.a) * 18 * r.d;
        if (y > 66 && Math.abs(x - W / 2) < 70) continue;
        const k = 0.7 + (y - 40) / 80;
        c.fillStyle = '#1c1c22'; c.beginPath(); c.arc(x, y - 14 * k, 4 * k, 0, 7); c.fill();
        c.fillStyle = r.v === 0 ? '#c8d040' : '#3a3e48'; c.fillRect(x - 5 * k, y - 10 * k, 10 * k, 14 * k);
        c.fillStyle = '#b8987e'; c.fillRect(x - 7 * k, y - 9 * k, 2 * k, 6 * k); c.fillRect(x + 5 * k, y - 9 * k, 2 * k, 6 * k); // 반팔 밖의 팔
      }
      // 시선이 좁혀 온다
      const v = c.createRadialGradient(W / 2, 100, 30, W / 2, 100, 150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.3 + Math.min(1, cuff) * 0.5).toFixed(2) + ')');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
      // 내 팔: 긴소매 회색 작업복이 아래 왼쪽에서 나온다. 손은 소매 끝을 말아 쥐었다
      const sh = yank > 0 ? (Math.random() - 0.5) * 3 : 0;
      const cy = 112 - Math.min(1, cuff) * 10 + sh;
      c.fillStyle = '#4a4e58'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, 118); c.lineTo(130, cy - 8); c.lineTo(138, cy + 10); c.lineTo(30, H); c.closePath(); c.fill();
      c.fillStyle = '#3a3e48'; c.beginPath(); c.moveTo(0, 130); c.lineTo(132, cy + 4); c.lineTo(138, cy + 10); c.lineTo(30, H); c.closePath(); c.fill();
      for (let i = 0; i < 5; i++) { c.fillStyle = '#353842'; c.fillRect(20 + i * 22, 128 - i * 3.5 + (cy - 112) * (i / 5), 10, 1); } // 주름
      // 소매 끝: 반장이 잡은 만큼 위로 말려 올라간다 (안은 보여 주지 않는다)
      c.fillStyle = '#5a5e68'; c.fillRect(126, cy - 10, 14, 22);
      // 내 손: 소매 끝을 손바닥 안에 말아 쥔다. 세게 쥘수록 마디가 하얗다
      c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(146, cy + 2, 10, 11, 0, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { c.fillStyle = '#b8987e'; c.fillRect(151, cy - 6 + i * 4, 5, 3); if (mine > 0.4) { c.fillStyle = '#efe2d6'; c.fillRect(153, cy - 6 + i * 4, 2, 1); } }
      // 반장의 장갑: 오른쪽 위에서 소매를 쥐고 당긴다
      const gx = 150 + Math.min(1, cuff) * 6, gy = cy - 18 - Math.min(1, cuff) * 8 + sh;
      c.fillStyle = '#5a5248'; c.fillRect(gx + 10, gy - 30, 18, 34); // 팔뚝 (반팔 위 토시)
      c.fillStyle = '#8a8070'; c.beginPath(); c.ellipse(gx + 8, gy + 2, 13, 9, -0.4, 0, 7); c.fill(); // 목장갑
      c.fillStyle = '#c84a3a'; for (let i = 0; i < 4; i++) c.fillRect(gx - 2 + i * 4, gy + 6, 3, 2); // 장갑의 빨간 고무 코팅
      c.fillStyle = '#6a6256'; for (let i = 0; i < 4; i++) c.fillRect(gx - 4 + i * 4, gy - 4, 1, 8);
      // 막대: 소매가 얼마나 걷혔는지
      c.fillStyle = '#2a2224'; c.fillRect(W - 18, 30, 3, 80); c.fillStyle = cuff > 0.75 ? '#d8574e' : '#8a92a6'; c.fillRect(W - 18, 110 - Math.round(80 * Math.min(1, cuff)), 3, Math.round(80 * Math.min(1, cuff)));
      if (end >= 0) { c.fillStyle = 'rgba(250,250,248,' + Math.min(1, end * 3).toFixed(2) + ')'; c.fillRect(0, 0, W, H); }
    },
  };
}

// ═══════════ 졸업앨범 (1장: 3학년 4반) ═══════════
// 얼굴 없는 반 아이들 사이에서 내 사진을 찾는다. 찾으면, 누가 볼펜으로 그려 둔 수염과 귀가 있다.
function album(): Play {
  const COLS = 6, ROWS = 4, me = 7 + Math.floor(Math.random() * 11); // 둘째·셋째 줄 어딘가 (아래 줄이면 글씨가 화면 밖으로 나간다)
  let cx = 0, cy = 0, tt = 0, end = -1, wrong = 0, wrongT = 0, said = 0;
  const hair = ['#1a1614', '#2a201a', '#141418', '#3a2a20', '#201814'];
  return {
    scale: 2,
    peek: () => ({ cx, cy, me }),
    hint: '방향키로 휴대폰 불빛을 옮긴다 · Z 로 짚는다 · 내 사진을 찾는다',
    step(dt, _t, _k, hit) {
      tt += dt; wrongT -= dt;
      if (end >= 0) { end += dt; return end > 2.6 ? 'found' : null; }
      if (hit.has('left')) cx = (cx + COLS - 1) % COLS; if (hit.has('right')) cx = (cx + 1) % COLS;
      if (hit.has('up')) cy = (cy + ROWS - 1) % ROWS; if (hit.has('down')) cy = (cy + 1) % ROWS;
      if (hit.size && !hit.has('z')) sfx('tap');
      if (hit.has('z')) { if (cy * COLS + cx === me) { end = 0; ui.hint(''); sfx('ringing_ear'); } else { wrong++; wrongT = 0.4; sfx('bump'); } }
      if (wrong >= 3 && said === 0) { said = 1; ui.hint('그날도 소매를 내리고 있었다'); }
      if (tt > 30 && end < 0) { cx = me % COLS; cy = Math.floor(me / COLS); end = 0; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 앨범 한 면: 누렇게 바랜 종이, 반 이름
      c.fillStyle = '#1a1612'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#e8e0cc'; c.fillRect(20, 4, W - 40, H - 8); c.fillStyle = '#d8ceb6'; c.fillRect(20, 4, 2, H - 8); c.fillRect(W - 22, 4, 2, H - 8);
      c.fillStyle = '#4a3a2a'; c.font = '600 7px "Pretendard", sans-serif'; c.fillText('3학년 4반', 30, 15);
      const PW = 26, PH = 28, GX = 46, GY = 22, SX = 30, SY = 30;
      for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
        const i = r * COLS + k, x = GX + k * SX, y = GY + r * SY;
        c.fillStyle = '#9aa8b8'; c.fillRect(x, y, PW, PH - 6); // 파란 배경 증명사진
        const long = i === me; // 나만 긴소매
        c.fillStyle = long ? '#3a3e5a' : '#f2f2ee'; c.fillRect(x + 4, y + 16, PW - 8, 6); // 교복: 다들 하복 흰 셔츠
        if (!long) { c.fillStyle = '#d8d8d4'; c.fillRect(x + 11, y + 16, 4, 3); }
        c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(x + PW / 2, y + 10, 6, 7, 0, 0, 7); c.fill(); // 얼굴 (그리지 않는다)
        c.fillStyle = hair[(i * 7) % hair.length]; c.beginPath(); c.ellipse(x + PW / 2, y + 6, 7, 4.5, 0, Math.PI, 0); c.fill(); c.fillRect(x + PW / 2 - 7, y + 5, 14, 2);
        if (i === me) { // 볼펜 수염과 세모 귀
          c.strokeStyle = '#2a3aa8'; c.lineWidth = 0.6; c.beginPath();
          for (const s2 of [-1, 1]) for (let w = -1; w <= 1; w++) { c.moveTo(x + PW / 2 + s2 * 2, y + 11 + w); c.lineTo(x + PW / 2 + s2 * 9, y + 10 + w * 2); }
          c.moveTo(x + PW / 2 - 6, y + 4); c.lineTo(x + PW / 2 - 4, y - 1); c.lineTo(x + PW / 2 - 1, y + 3);
          c.moveTo(x + PW / 2 + 1, y + 3); c.lineTo(x + PW / 2 + 4, y - 1); c.lineTo(x + PW / 2 + 6, y + 4); c.stroke();
        }
        c.fillStyle = '#6a5a48'; c.fillRect(x + 6, y + PH - 4, PW - 12, 1); // 이름 자리
      }
      // 침대 밑: 휴대폰 불빛 하나. 찾으면 천천히 페이지 전체가 보인다
      const x = GX + cx * SX, y = GY + cy * SY, sh = wrongT > 0 ? Math.round(Math.sin(t * 60) * 2) : 0;
      const lx = x + PW / 2 + Math.sin(t * 1.3) * 1.5, ly = y + PH / 2, open = end >= 0 ? Math.min(1, end * 0.6) : 0;
      const dark = c.createRadialGradient(lx, ly, 8 + open * 120, lx, ly, 34 + open * 200);
      dark.addColorStop(0, 'rgba(4,3,2,0)'); dark.addColorStop(0.55, 'rgba(4,3,2,0.55)'); dark.addColorStop(1, 'rgba(4,3,2,0.97)');
      c.fillStyle = dark; c.fillRect(0, 0, W, H);
      c.strokeStyle = end >= 0 ? '#c84a3a' : '#2a2a2a'; c.lineWidth = 1; c.strokeRect(x - 2 + sh + 0.5, y - 2 + 0.5, PW + 3, PH + 1);
      if (end >= 0) { // 찾았다: 그 밑의 글씨
        c.fillStyle = 'rgba(232,224,204,' + Math.min(1, end * 2).toFixed(2) + ')'; c.fillRect(x - 4, y + PH, PW + 20, 10);
        c.fillStyle = 'rgba(42,58,168,' + Math.min(1, end * 2).toFixed(2) + ')'; c.font = '600 6px "Pretendard", sans-serif'; c.fillText('임대 고양이', x - 2, y + PH + 7);
      }
    },
  };
}

// ═══════════ 가리키기 (1장: 107동) ═══════════
// 아래에서 올려다본 다섯 동. 젤리 손이 창문들을 훑는다. 불 켜진 창 앞에서 오래 머물면 누가 커튼을 연다.
function point(): Play {
  const B = 5, BW = 46, GAP = 5;
  let x = 30, moved = false, tt = 0, end = -1, out = '', stare = 0, wrong = 0, said = 0, who = -1, whoT = 0;
  const bx = (b: number): number => 3 + b * (BW + GAP);
  const lit = (b: number, wx: number, wy: number): boolean => ((Math.imul(wx + 3, 73856093) ^ Math.imul(wy + 7, 19349663) ^ Math.imul(b + 11, 83492791)) >>> 0) % 9 === 0;
  return {
    scale: 2,
    peek: () => ({ x, target: bx(2) + BW / 2, stare }),
    hint: '← → 로 손을 옮긴다 · Z 로 가리킨다 · 아이 집이 있는 107동',
    step(dt, _t, k, hit) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 2.2 ? out : null; }
      if (k.left || k.right) moved = true; if (k.left) x -= dt * 70; if (k.right) x += dt * 70; x = Math.max(6, Math.min(W - 6, x));
      const b = Math.floor((x - 3) / (BW + GAP));
      // 불 켜진 창 쪽에 손이 오래 머물면 누가 내려다본다
      const onLit = b >= 0 && b < B && b !== 2 && Math.abs(((x - 3) % (BW + GAP)) - BW / 2) < 14;
      if (moved) stare = Math.max(0, Math.min(1, stare + (onLit ? dt * 0.3 : -dt * 0.1))); // 손을 움직이기 전에는 아무도 안 본다
      if (stare > 0.5 && who < 0) { who = b; whoT = 0; sfx('bump'); }
      if (who >= 0) whoT += dt;
      if (hit.has('z')) {
        if (b === 2) { end = 0; out = stare > 0.5 ? 'seen' : 'home'; ui.hint(''); sfx('tap'); }
        else { wrong++; stare = Math.min(1, stare + 0.2); sfx('bump'); if (said < 1) { said = 1; ui.hint('하은: 거기 아닌데요'); } }
      }
      if (tt > 25) { end = 0; out = 'seen'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04060b'); g.addColorStop(1, '#121724'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let b = 0; b < B; b++) { // 아래에서 올려다본 동: 위로 갈수록 좁아진다
        const X = bx(b), top = 4 + (b % 2) * 10;
        c.fillStyle = '#0e121c'; c.fillRect(X, top, BW, H - top); c.fillStyle = '#0a0d15'; c.fillRect(X + BW - 4, top, 4, H - top);
        for (let wy = 0; wy < 15; wy++) for (let wx = 0; wx < 7; wx++) {
          const yy = top + 12 + wy * 8, xx = X + 4 + wx * 6;
          if (yy > H - 10) continue;
          let col = lit(b, wx, wy) ? '#c89a52' : '#161b29';
          if (b === 2 && wx === 3 && wy === 9) col = '#161b29'; // 아이 집: 불이 꺼져 있다
          c.fillStyle = col; c.fillRect(xx, yy, 3, 4);
        }
        c.fillStyle = b === 2 ? '#4a5470' : '#262c3c'; c.font = '600 6px sans-serif'; c.fillText(String(105 + b), X + 15, top + 9);
      }
      // 내려다보는 사람: 창 하나에 불이 들어오고, 커튼이 걷히고, 머리와 어깨가 창을 채운다
      if (who >= 0) {
        const X = bx(who) + 4 + 3 * 6 - 2, Y = 4 + (who % 2) * 10 + 12 + 5 * 8, a = Math.min(1, whoT * 1.2), cur = Math.max(0, Math.round(3 - whoT * 3));
        c.fillStyle = '#e8c070'; c.fillRect(X, Y, 7, 12);
        c.fillStyle = '#b08a48'; c.fillRect(X, Y, cur, 12); c.fillRect(X + 7 - cur, Y, cur, 12);
        c.fillStyle = 'rgba(12,10,14,' + a.toFixed(2) + ')';
        c.beginPath(); c.ellipse(X + 3.5, Y + 5, 2, 2.4, 0, 0, 7); c.fill(); c.fillRect(X + 1, Y + 8, 5, 4);
        c.fillStyle = '#3a3428'; c.fillRect(X - 1, Y + 12, 9, 1);
      }
      // 아래쪽 어둠과 내 팔: 화면 아래 가운데에서 손이 있는 쪽으로 뻗는다
      const gg = c.createLinearGradient(0, H - 40, 0, H); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.85)'); c.fillStyle = gg; c.fillRect(0, H - 40, W, 40);
      const hx = Math.round(x), hy = H - 40 + (end >= 0 ? -8 : Math.round(Math.sin(t * 2) * 1) + Math.round(stare * Math.sin(t * 40)));
      const sx = W / 2 + (hx - W / 2) * 0.35, ang = Math.atan2(hy - H, hx - sx);
      c.strokeStyle = '#34343e'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx, H + 6); c.lineTo(hx - Math.cos(ang) * 6, hy - Math.sin(ang) * 6); c.stroke();
      c.strokeStyle = '#26262e'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx + 4, H + 6); c.lineTo(hx - Math.cos(ang) * 6 + 4, hy - Math.sin(ang) * 6); c.stroke(); c.lineCap = 'butt';
      c.save(); c.translate(hx, hy); c.rotate(ang + Math.PI / 2);
      c.fillStyle = '#efe6d6'; c.beginPath(); c.ellipse(0, 0, 6, 7, 0, 0, 7); c.fill(); // 손등 (털)
      c.fillStyle = '#e07a2a'; c.beginPath(); c.ellipse(2, 2, 3, 3, 0, 0, 7); c.fill(); // 주황 얼룩
      c.fillStyle = '#c8bca8'; c.fillRect(-3, -6, 1, 3); c.fillRect(0, -7, 1, 3); c.fillRect(3, -6, 1, 3); // 발가락 사이 골
      c.restore();
      // 내려다봄
      if (stare > 0.05) { c.fillStyle = '#1a1e2a'; c.fillRect(8, H - 8, 60, 3); c.fillStyle = '#c84a3a'; c.fillRect(8, H - 8, Math.round(60 * stare), 3); }
    },
  };
}

// ═══════════ 약봉지 (3장: 영수증) ═══════════
// 아침마다 한 봉지. 날이 점점 빨리 간다. 뜯을수록 창이 밝아진다. 석 달째, 띠째 사라진다.
function pills(): Play {
  const DAYS = 72, PW = 24; // 석 달째 중간에 끝난다
  let tt = 0, fumble = 0, pos = 0, taken = 0, L = 0, gone = -1, end = -1, lastDay = -1, said = 0;
  const torn = new Set<number>(), dropped = new Set<number>();
  const speed = (t: number): number => Math.min(3.6, 1.4 + t * 0.45); // 하루에 몇 봉지 지나가나
  return {
    scale: 2,
    peek: () => ({ pos, taken, gone }),
    hint: 'Z · 봉지가 가운데 오면 뜯는다 · 하루에 한 봉지',
    step(dt, _t, _k, hit) {
      tt += dt;
      if (end >= 0) { end += dt; L = Math.max(0, L - dt * 0.6); return end > 2.4 ? 'taken' : null; }
      if (gone >= 0) { gone += dt; if (gone > 1.6 && end < 0) { end = 0; sfx('water_run'); ui.hint(''); } return null; }
      pos += speed(tt) * dt;
      const day = Math.round(pos);
      if (day !== lastDay) { lastDay = day; if (day % 7 === 0 && day > 0) sfx('tap'); }
      fumble -= dt;
      if (hit.has('z') && fumble <= 0) {
        const near = Math.abs(pos - day) < 0.3 && !torn.has(day) && !dropped.has(day) && day < DAYS;
        if (near) { torn.add(day); taken++; sfx('fabric_tear'); }
        else { fumble = 0.4; const nd = Math.round(pos); if (!torn.has(nd) && !dropped.has(nd) && nd < DAYS) { dropped.add(nd); sfx('bump'); } } /* 서두르면 손이 미끄러져 그날 봉지를 떨어뜨린다 */
      }
      L += ((taken / DAYS) * 1.4 - L) * Math.min(1, dt * 0.8); L = Math.min(1, L);
      if (taken > 18 && said === 0) { said = 1; ui.hint('아침이 조금 덜 무겁다'); }
      if (pos >= DAYS - 4) { gone = 0; sfx('door_open'); ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 방: 창으로 드는 아침빛이 먹은 날만큼 밝다
      const lv = Math.min(1, L);
      c.fillStyle = 'rgb(' + Math.round(14 + lv * 30) + ',' + Math.round(14 + lv * 28) + ',' + Math.round(18 + lv * 24) + ')'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgb(' + Math.round(30 + lv * 170) + ',' + Math.round(34 + lv * 150) + ',' + Math.round(46 + lv * 100) + ')'; c.fillRect(24, 10, 56, 40);
      c.fillStyle = '#1a1a20'; c.fillRect(51, 10, 2, 40); c.fillRect(24, 29, 56, 2);
      if (lv > 0.05) { c.fillStyle = 'rgba(255,230,180,' + (lv * 0.12).toFixed(3) + ')'; c.beginPath(); c.moveTo(24, 50); c.lineTo(80, 50); c.lineTo(140, H); c.lineTo(40, H); c.fill(); }
      // 문틈: 열리면 어둠 속에 붉은 눈 두 개
      c.fillStyle = '#0c0c10'; c.fillRect(W - 40, 8, 30, H - 30);
      const gap = gone >= 0 ? Math.min(14, gone * 30) : 0;
      c.fillStyle = '#2a2420'; c.fillRect(W - 40, 8, 30 - gap, H - 30); c.fillStyle = '#3a322a'; c.fillRect(W - 14 - gap, 50, 2, 3);
      if (gone > 0.4) { const a = Math.min(1, (gone - 0.4) * 2); c.fillStyle = 'rgba(200,40,30,' + a.toFixed(2) + ')'; c.fillRect(W - 15, 34, 2, 1); c.fillRect(W - 11, 34, 2, 1); }
      // 약봉지 띠: 가운데 표시 위로 흘러간다
      const cx = W / 2 - 20, y = 70;
      const yank = gone >= 0 ? gone * gone * 200 : 0;
      c.save(); c.translate(yank, -yank * 0.2); if (gone >= 0) c.rotate(Math.min(0.5, gone * 0.4));
      for (let d = Math.floor(pos) - 6; d <= Math.floor(pos) + 8; d++) {
        if (d < 0 || d >= DAYS) continue;
        if (dropped.has(d)) { const x0 = cx + (d - pos) * PW; c.fillStyle = '#2a2e34'; c.fillRect(Math.round(x0) - PW / 2 + 1, y, PW - 2, 30); continue; }
        const x = cx + (d - pos) * PW;
        c.fillStyle = torn.has(d) ? '#cfd6d8' : '#e8eef0'; c.fillRect(Math.round(x) - PW / 2 + 1, y, PW - 2, 30);
        c.fillStyle = '#b8c4c8'; c.fillRect(Math.round(x) + PW / 2 - 1, y, 1, 30);
        c.fillStyle = '#4a6a8a'; c.font = '600 5px sans-serif'; const m = 9 + Math.floor(d / 30), dd = (d % 30) + 1; c.fillText(m + '/' + dd, Math.round(x) - 7, y + 7);
        if (torn.has(d)) { c.fillStyle = '#a8b0b4'; c.fillRect(Math.round(x) - 9, y, 18, 2); }
        else { c.fillStyle = '#f4f4f0'; c.beginPath(); c.ellipse(x - 3, y + 19, 3, 2, 0, 0, 7); c.fill(); c.fillStyle = '#e8b8a0'; c.beginPath(); c.ellipse(x + 4, y + 20, 2.5, 2.5, 0, 0, 7); c.fill(); }
      }
      c.restore();
      if (gone < 0) { c.fillStyle = '#c84a3a'; c.fillRect(cx - 1, y - 6, 2, 4); c.fillRect(cx - 1, y + 32, 2, 4); }
      // 날수
      c.fillStyle = '#6a7080'; c.font = '600 6px sans-serif'; c.fillText(Math.min(DAYS, Math.max(0, Math.round(pos))) + '일째 · 먹은 날 ' + taken, 8, H - 8);
    },
  };
}

// ═══════════ 공책 (1장: 교탁 앞) ═══════════
// 정민이가 공책을 들고 읽는다. 따라가서 손을 뻗으면 다른 애한테 던진다. 한 장씩 찢어진다.
function grab(): Play {
  const SEATS = [[40, 62], [84, 66], [172, 66], [216, 62], [60, 92], [128, 96], [196, 92]];
  let x = 128, tt = 0, holder = -1, toss = -1, from = -1, end = -1, reach = 0, flips = 0, pageT = 0, said = 0;
  const pages: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
  const laughs: { x: number; y: number; t: number }[] = [];
  const holdPos = (h: number): [number, number] => (h < 0 ? [128, 30] : [SEATS[h][0], SEATS[h][1] - 14]);
  const laugh = (): void => { for (let i = 0; i < 4; i++) { const s2 = SEATS[(Math.floor(tt * 10) + i * 3) % SEATS.length]; laughs.push({ x: s2[0] + (i % 2) * 4, y: s2[1] - 12, t: 0 }); } sfx('tv_laugh'); };
  const tear = (px2: number, py: number): void => { pages.push({ x: px2, y: py, vx: (Math.random() - 0.5) * 30, vy: -10, r: Math.random() * 3 }); sfx('fabric_tear'); };
  return {
    scale: 2,
    peek: () => { const [hx] = holdPos(holder); return { x, hx, toss: toss >= 0 ? 1 : 0, flips }; },
    hint: '← → 로 따라간다 · ↑ 로 손을 뻗는다 · 공책을 되찾는다',
    step(dt, _t, k, hit) {
      tt += dt; reach = Math.max(0, reach - dt * 3); pageT += dt;
      for (const p of pages) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy = Math.min(14, p.vy + 20 * dt); p.vx *= 0.98; if (p.y > H - 14) { p.y = H - 14; p.vy = 0; p.vx = 0; } }
      for (const l of laughs) l.t += dt;
      while (laughs.length && laughs[0].t > 1.4) laughs.shift();
      if (end >= 0) { end += dt; return end > 2.4 ? 'gone' : null; }
      if (k.left) x -= dt * 60; if (k.right) x += dt * 60; x = Math.max(16, Math.min(W - 16, x));
      if (hit.has('up')) reach = 1;
      if (toss >= 0) { toss += dt * 1.6; if (toss >= 1) { toss = -1; laugh(); } }
      else {
        const [hx, hy] = holdPos(holder);
        if (reach > 0.7 && Math.abs(hx - x) < 18) { // 닿기 직전에 던진다
          from = holder; let n = holder; while (n === holder || Math.abs(holdPos(n)[0] - x) < 30) n = Math.floor(Math.random() * SEATS.length);
          holder = n; toss = 0; flips++; tear(hx, hy); reach = 0;
          if (flips === 2 && said === 0) { said = 1; ui.hint('닿을 것 같으면 다른 데로 간다'); }
        }
        if (pageT > 2.6) { pageT = 0; laugh(); } // 그 사이에도 한 장씩 넘기며 읽는다
      }
      if (flips >= 4 || tt > 16) { end = 0; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 교실 앞: 칠판, 교탁, 얼굴 없는 반 아이들
      c.fillStyle = '#2a2622'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#26402e'; c.fillRect(30, 6, W - 60, 34); c.fillStyle = '#5a4430'; c.fillRect(28, 40, W - 56, 3);
      c.fillStyle = 'rgba(220,220,210,0.25)'; c.fillRect(44, 14, 22, 1); c.fillRect(44, 20, 30, 1); c.fillRect(170, 16, 26, 1);
      px(c, 0, H - 14, W, 14, '#3a3028');
      for (const [sx, sy] of SEATS) {
        px(c, sx - 12, sy + 6, 24, 4, '#7a5a3a'); px(c, sx - 11, sy + 10, 2, 8, '#4a3a2a'); px(c, sx + 9, sy + 10, 2, 8, '#4a3a2a');
        px(c, sx - 6, sy - 4, 12, 10, '#f0f0ea'); // 하복 셔츠
        // 칠판 쪽을 보고 앉았다: 뒤통수와 귀만 보인다. 웃을 때는 고개가 반쯤 돌아온다
        const turn = laughs.some((l) => Math.abs(l.x - sx) < 6 && l.t < 1) ? 2 : 0;
        c.fillStyle = '#c9ab92'; c.fillRect(sx - 6 + turn, sy - 10, 12, 4);
        c.fillStyle = '#1e1a18'; c.beginPath(); c.ellipse(sx - turn, sy - 10, 5.5, 6, 0, 0, 7); c.fill();
      }
      // 정민: 교탁 뒤에 서 있다
      px(c, 110, 44, 36, 20, '#6a4a30'); px(c, 110, 44, 36, 2, '#8a6a48');
      px(c, 120, 26, 16, 18, '#f0f0ea'); c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(128, 20, 6, 7, 0, 0, 7); c.fill(); c.fillStyle = '#141210'; c.beginPath(); c.ellipse(128, 16, 7, 4.5, 0, Math.PI, 0); c.fill();
      // 공책
      let nx: number, ny: number;
      if (toss >= 0) { const [ax, ay] = holdPos(from), [bx2, by] = holdPos(holder); nx = ax + (bx2 - ax) * toss; ny = ay + (by - ay) * toss - Math.sin(toss * Math.PI) * 30; }
      else { [nx, ny] = holdPos(holder); ny += Math.sin(t * 3) * 1; }
      c.save(); c.translate(nx, ny); c.rotate(toss >= 0 ? toss * 6 : -0.1);
      px(c, -7, -5, 14, 10, '#d8d0b8'); px(c, -7, -5, 1, 10, '#8a8070'); px(c, -4, -2, 4, 3, '#6a6a6a'); px(c, 1, -1, 4, 1, '#8a8a8a');
      c.restore();
      for (const p of pages) { c.save(); c.translate(p.x, p.y); c.rotate(p.r + (p.vy ? t * 3 : 0)); px(c, -4, -3, 8, 6, '#e8e0cc'); px(c, -2, -1, 3, 2, '#8a8a8a'); c.restore(); }
      for (const l of laughs) { c.fillStyle = 'rgba(232,224,204,' + Math.max(0, 1 - l.t / 1.4).toFixed(2) + ')'; c.font = '600 7px "Pretendard", sans-serif'; c.fillText('ㅋ', l.x, l.y - l.t * 12); }
      // 나: 뒤에서 본 열다섯 살. 혼자 긴소매
      const by2 = H - 4;
      px(c, x - 7, by2 - 22, 14, 22, '#2e3450'); c.fillStyle = '#1a1614'; c.beginPath(); c.ellipse(x, by2 - 27, 6, 6, 0, 0, 7); c.fill();
      const ry = by2 - 20 - reach * 26;
      c.strokeStyle = '#2e3450'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 5, by2 - 18); c.lineTo(x + 8, ry); c.stroke();
      px(c, x + 6, Math.round(ry) - 3, 4, 3, '#c9ab92');
    },
  };
}

// ═══════════ 그네 밀어 주기 (1장: 하은) ═══════════
function push(): Play {
  const OM = 2.2, TX = 120, TY = 24, L = 66;
  let A = 0.05, ph = -Math.PI / 2, tt = 0, good = 0, end = -1, lunge = 0, said = 0, lock = 0;
  return {
    scale: 2,
    peek: () => ({ A, back: Math.sin(ph), good }),
    hint: 'Z · 그네가 내 앞으로 돌아왔을 때 민다',
    step(dt, _t, _k, hit) {
      tt += dt; lunge = Math.max(0, lunge - dt * 3); lock -= dt;
      ph += OM * dt; A = Math.max(0.04, A - dt * 0.012);
      if (end >= 0) { end += dt; return end > 1.8 ? 'pushed' : null; }
      if (hit.has('z') && lock <= 0) {
        lunge = 1;
        if (Math.sin(ph) < -0.8 && Math.cos(ph) > -0.4) { A = Math.min(0.62, A + 0.1 * (1 - A)); good++; sfx('swing_creak'); if (good === 2) ui.hint('하은: 더요! 더!'); }
        else { A = Math.max(0.04, A - 0.03); lock = 1.2; sfx('bump'); /* 허공을 밀면 몸이 앞으로 쏠린다 */ if (said === 0) { said = 1; ui.hint('그네가 멀리 있을 때 밀면 허공을 민다'); } }
      }
      if (good >= 5 || tt > 16) { end = 0; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05070d'); g.addColorStop(1, '#161a22'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const lg = c.createRadialGradient(200, 24, 2, 200, 24, 80); lg.addColorStop(0, 'rgba(255,214,140,0.45)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = lg; c.fillRect(110, 0, 146, 120);
      px(c, 199, 24, 2, H - 54, '#2a2a30'); px(c, 194, 22, 12, 3, '#e8d2a0');
      px(c, 0, H - 30, W, 30, '#2a2620'); for (let i = 0; i < 50; i++) px(c, (i * 37) % W, H - 28 + ((i * 11) % 26), 1, 1, '#3a342a');
      px(c, TX - 50, TY, 100, 3, '#4a4038'); c.strokeStyle = '#4a4038'; c.lineWidth = 3; c.beginPath(); c.moveTo(TX - 48, TY); c.lineTo(TX - 64, H - 30); c.moveTo(TX + 48, TY); c.lineTo(TX + 64, H - 30); c.stroke();
      const ang = Math.sin(ph) * A, sx = TX + Math.sin(ang) * L, sy = TY + Math.cos(ang) * L;
      c.strokeStyle = '#8a8f99'; c.lineWidth = 1; c.beginPath(); c.moveTo(TX, TY + 2); c.lineTo(sx, sy); c.stroke();
      px(c, sx - 7, sy, 14, 2, '#6a4a30');
      // 하은: 잠옷, 슬리퍼, 얼굴은 그리지 않는다. 앞으로 갈 때 다리를 편다
      const fwd = Math.cos(ph) > 0 ? 1 : 0;
      c.strokeStyle = '#8aa6c8'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + 1, sy); c.lineTo(sx + 3 + fwd * 3, sy + 5 - fwd * 2); c.stroke();
      px(c, Math.round(sx + 3 + fwd * 3), Math.round(sy + 5 - fwd * 2), 3, 1, '#e8c0d0');
      px(c, sx - 3, sy - 9, 6, 9, '#e8e4dc'); px(c, sx - 3, sy - 15, 6, 6, '#2a2220'); px(c, sx - 2, sy - 13, 4, 4, '#c9a48a');
      // 삼색이: 그네 뒤에 서서 두 손을 내민다
      const mx = TX - 28, my = H - 30;
      px(c, mx - 6, my - 26, 12, 26, '#34343e'); px(c, mx - 6, my - 26, 2, 26, '#26262e');
      c.strokeStyle = '#e07a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(mx - 6, my - 4); c.quadraticCurveTo(mx - 16, my - 2, mx - 14, my - 12); c.stroke();
      const hx = mx - 7, hy = my - 40;
      px(c, hx, hy, 14, 13, '#efe6d6'); px(c, hx, hy, 6, 6, '#e07a2a'); px(c, hx + 9, hy + 1, 5, 4, '#1c1c20'); px(c, hx - 1, hy - 2, 3, 3, '#e07a2a'); px(c, hx + 12, hy - 1, 3, 2, '#1c1c20');
      px(c, hx + 11, hy + 6, 2, 2, '#2a3a2a');
      const ax = mx + 6 + lunge * 8;
      c.strokeStyle = '#34343e'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx + 4, my - 20); c.lineTo(ax, my - 22); c.stroke(); px(c, Math.round(ax), my - 24, 4, 4, '#efe6d6');
    },
  };
}

// ═══════════ 가방 건네기 (2장: 모임방 문 앞) ═══════════
// 토토가 손을 내민다. 끈을 쥔 손가락을 하나씩 편다. 토토가 내 얼굴 쪽을 볼 때 펴고 있으면 도로 오므라든다.
function bag(): Play {
  let open = 0, lock = 0, tt = 0, end = -1, out = '', look = 0, nextLook = 2.2, snaps = 0, said = 0, flinch = 0;
  return {
    scale: 2,
    peek: () => ({ open, look: look > 0 ? 1 : 0, danger: look > 0 && look < 0.85 ? 1 : 0 }),
    hint: 'Z 를 누르고 있으면 손가락이 펴진다 · 이쪽을 볼 때는 뗀다',
    step(dt, _t, k) {
      tt += dt; lock -= dt; flinch = Math.max(0, flinch - dt * 2.5);
      if (end >= 0) { end += dt; return end > 2 ? out : null; }
      // 토토가 가끔 내 얼굴 쪽으로 고개를 든다 (0.9초)
      if (look > 0) look -= dt; else if (tt > nextLook) { look = 1.3; nextLook = tt + 1.3 + 1.5 + Math.random() * 1.4; sfx('tap'); } // 앞의 0.4초는 고개가 움찔하는 예고
      if (k.z) {
        if (look > 0 && look < 0.85) { open = Math.max(0, Math.floor(open) - 1); lock = 1.2; flinch = 1; look = 0; snaps++; sfx('bump'); if (said === 0) { said = 1; ui.hint('눈이 마주칠 것 같으면 손이 먼저 오므라든다'); } }
        else if (lock <= 0) open += dt * 0.7;
      }
      if (open >= 4) { end = 0; out = 'given'; sfx('fabric_tear'); ui.hint(''); }
      else if (tt > 16) { end = 0; out = 'kept'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 계단참 형광등 빛, 문틀
      c.fillStyle = '#1c2024'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#2a3034'; c.fillRect(150, 0, 106, H); c.fillStyle = '#3a3428'; c.fillRect(146, 0, 4, H);
      c.fillStyle = 'rgba(255,200,140,0.12)'; c.fillRect(150, 0, 106, H);
      // 토토: 흰 셔츠, 넥타이를 주머니에 꽂았다. 얼굴은 그리지 않는다. 볼 때는 고개가 든다
      const up = look > 0.9 ? 0.25 + Math.sin(t * 40) * 0.1 : look > 0 ? Math.min(1, look * 6) : 0;
      c.fillStyle = '#eef0f2'; c.fillRect(176, 40, 54, H - 40); c.fillStyle = '#d4d8dc'; c.fillRect(176, 40, 4, H - 40);
      c.fillStyle = '#c9ab92'; c.fillRect(198, 36, 12, 6); // 목
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(194, 40); c.lineTo(204, 50); c.lineTo(198, 52); c.lineTo(192, 42); c.fill(); c.beginPath(); c.moveTo(214, 40); c.lineTo(204, 50); c.lineTo(210, 52); c.lineTo(216, 42); c.fill(); // 깃 (단추를 하나 풀었다)
      c.fillStyle = '#c8ccd2'; for (let yy = 56; yy < H; yy += 9) c.fillRect(204, yy, 1, 1); // 단추
      c.fillStyle = '#dde0e4'; c.fillRect(186, 60, 1, 30); c.fillRect(222, 70, 1, 24); c.fillRect(190, 100, 10, 1); // 주름
      c.fillStyle = '#1e2a4a'; c.fillRect(214, 74, 5, 12); c.fillStyle = '#2a3a60'; c.fillRect(214, 74, 5, 1); c.fillStyle = '#9aa0a8'; c.fillRect(196, 50, 1, 26); c.fillStyle = '#3a6ab0'; c.fillRect(194, 76, 5, 7); // 넥타이 끝, 사원증 줄과 카드
      c.fillStyle = '#c9ab92'; c.beginPath(); c.ellipse(204, 26 - up * 4, 13, 15, 0, 0, 7); c.fill(); c.fillStyle = '#b8987e'; c.fillRect(190, 24 - up * 4, 2, 6); c.fillRect(216, 24 - up * 4, 2, 6); // 귀
      c.fillStyle = '#1a1612'; c.beginPath(); c.ellipse(204 - up * 2, 16 - up * 5, 14, 9, 0, Math.PI, 0); c.fill(); c.fillRect(190, 14 - up * 5, 28, 5);
      if (up > 0.3) { c.fillStyle = 'rgba(200,74,58,' + (up * 0.5).toFixed(2) + ')'; c.fillRect(0, 0, W, 2); c.fillRect(0, H - 2, W, 2); }
      // 가방 끈: 내 손과 토토의 손 사이
      const SY = 92;
      c.fillStyle = '#3e4430'; c.fillRect(20, SY + 14, 120, H - SY - 14); c.fillStyle = '#343a28'; c.fillRect(20, SY + 14, 120, 3);
      c.strokeStyle = '#2a2e20'; c.lineWidth = 5; c.beginPath(); c.moveTo(60, SY + 16); c.quadraticCurveTo(100, SY - 10 + (end >= 0 && out === 'given' ? -20 : 0), 150, SY + 2); c.stroke();
      // 토토의 손: 손바닥을 위로, 기다린다
      c.fillStyle = '#eef0f2'; c.fillRect(174, SY - 3, 16, 14); c.fillStyle = '#c8ccd2'; c.fillRect(174, SY - 3, 1, 14); c.fillRect(180, SY + 4, 1, 1); // 소맷부리, 단추
      c.fillStyle = '#c9ab92'; c.fillRect(152, SY + 1, 22, 7); c.fillStyle = '#b8987e'; c.fillRect(152, SY + 7, 22, 1);
      for (let i = 0; i < 4; i++) { c.fillStyle = '#c9ab92'; c.fillRect(146 - i, SY + 1 + i * 2, 8, 2); c.fillStyle = '#b8987e'; c.fillRect(146 - i, SY + 2 + i * 2, 1, 1); } // 펴서 내민 손가락
      c.fillStyle = '#d6b8a0'; c.fillRect(166, SY - 2, 6, 3); // 엄지
      // 내 손: 회색 소매, 손가락 네 개가 끈을 감았다. 편 만큼 끈에서 떨어진다
      const fx = 82 + Math.sin(t * 30) * flinch * 2;
      c.fillStyle = '#4a4a52'; c.fillRect(0, SY - 6, fx - 14, 22); c.fillStyle = '#3a3a42'; c.fillRect(0, SY + 12, fx - 14, 4);
      c.fillStyle = '#c4a28a'; c.fillRect(fx - 16, SY - 4, 14, 18); c.fillStyle = '#ac8a72'; c.fillRect(fx - 16, SY + 12, 14, 2); c.fillRect(fx - 6, SY - 4, 1, 16); // 손등 그늘, 마디
      c.fillStyle = '#d0b098'; c.fillRect(fx - 12, SY - 6, 8, 3); // 끈 위로 감은 엄지
      for (let i = 0; i < 4; i++) {
        const o = Math.max(0, Math.min(1, open - i)); // 집게손가락부터 하나씩
        const yy = SY - 4 + i * 4.5;
        if (o < 1) { c.fillStyle = '#b8967e'; c.fillRect(fx - 2, yy, 6 - o * 2, 4); c.fillStyle = '#c4a28a'; c.fillRect(fx + 2 - o * 2, yy + 1, 3, 3 - o * 2); }
        else { c.fillStyle = '#c4a28a'; c.fillRect(fx - 2, yy, 12, 3); }
      }
      c.fillStyle = '#6a7080'; c.font = '600 6px sans-serif'; c.fillText('현우: 무겁죠 이거.', 158, 136);
    },
  };
}

// ═══════════ 손전등 (1장: 분리수거장 뒤) ═══════════
// 빛이 바닥을 훑는다. 떨리는 몸 때문에 꼬리가 그늘 밖으로 밀려 나간다. ← 로 끌어당기면 천이 바스락거린다.
function beam(): Play {
  const SH = 112, GY = 120; // 그늘 끝, 바닥 높이
  let len = 6, rustle = 0, tt = 0, bx = 250, end = -1, out = '', snap = -1, twitch = 1.4;
  const path = (t: number): number => { // 오른쪽에서 왼쪽으로, 멈칫, 되돌아 다시
    if (t < 3.2) return 250 - t * 38;
    if (t < 4.2) return 128 + Math.sin((t - 3.2) * 6) * 4;
    if (t < 6.4) return 128 + (t - 4.2) * 50;
    if (t < 9.6) return 238 - (t - 6.4) * 36;
    return 123 + (t - 9.6) * 60;
  };
  return {
    scale: 2,
    peek: () => ({ tip: 96 + len, bx, rustle }),
    hint: '← 를 누르면 꼬리를 끌어당긴다 · 너무 오래 당기면 바스락거린다',
    step(dt, _t, k) {
      tt += dt;
      if (end >= 0) { end += dt; return end > 2.2 ? out : null; }
      twitch -= dt; if (twitch < 0) { twitch = 1.1 + Math.random() * 1.2; len += 7 + Math.random() * 6; } // 무릎이 떨려서 꼬리가 밀려 나간다
      len += dt * 5;
      if (k.left) { len -= dt * 34; rustle += dt * 0.75; } else rustle = Math.max(0, rustle - dt * 0.45);
      len = Math.max(0, Math.min(70, len));
      bx = snap >= 0 ? bx + (Math.max(84, 96 + len) - bx) * Math.min(1, dt * 4) : path(tt);
      if (rustle >= 1 && snap < 0) { snap = 0; sfx('bump'); ui.hint('박씨: 거기 누구 있소?'); }
      if (snap >= 0) snap += dt;
      const tip = 96 + len;
      if (tip > SH && Math.abs(bx - tip) < 10) { end = 0; out = 'tail'; sfx('heartbeat'); ui.hint(''); }
      else if (snap > 1.2) { end = 0; out = 'tail'; sfx('heartbeat'); ui.hint(''); } // 소리를 듣고 온 빛은 그늘 안까지 들어온다
      else if (tt > 11.5) { end = 0; out = 'hidden'; ui.hint(''); }
      return null;
    },
    draw(c, t) {
      // 분리수거장 벽: 벽돌, 그 앞에 수거함과 마대. 왼쪽은 그늘
      c.fillStyle = '#0e1013'; c.fillRect(0, 0, W, H);
      for (let y = 8; y < GY; y += 6) for (let x = ((y / 6) % 2) * 6 - 6; x < W; x += 12) { c.fillStyle = ((x * 7 + y * 3) % 5) ? '#1c1e24' : '#202228'; c.fillRect(x, y, 11, 5); }
      c.fillStyle = '#1e1c18'; c.fillRect(0, GY, W, H - GY); for (let i = 0; i < 40; i++) { c.fillStyle = '#26241e'; c.fillRect((i * 41) % W, GY + 3 + ((i * 13) % 20), 2, 1); }
      // 수거함: 초록 플라스틱, 흰 글씨 칸
      c.fillStyle = '#24402c'; c.fillRect(14, 72, 42, 48); c.fillStyle = '#2e5038'; c.fillRect(14, 72, 42, 3); c.fillStyle = '#1a3020'; c.fillRect(52, 75, 4, 45);
      c.fillStyle = '#c8ccc4'; c.fillRect(22, 86, 24, 7); c.fillStyle = '#5a6a5e'; c.fillRect(25, 88, 18, 1); c.fillRect(25, 90, 12, 1);
      // 마대: 묶은 주둥이, 삐져나온 페트병, 결
      c.fillStyle = '#5a5240'; c.beginPath(); c.moveTo(150, GY); c.quadraticCurveTo(146, GY - 26, 166, GY - 30); c.quadraticCurveTo(190, GY - 28, 192, GY); c.fill();
      c.fillStyle = '#4a4434'; for (let yy = GY - 26; yy < GY; yy += 3) c.fillRect(152, yy, 38, 1);
      c.fillStyle = '#6a624e'; c.fillRect(164, GY - 34, 6, 5); c.fillStyle = '#8ab0c8'; c.fillRect(176, GY - 36, 4, 9); c.fillStyle = '#c84a3a'; c.fillRect(176, GY - 37, 4, 2);
      // 그늘: 가장자리가 번진다
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, SH - 6, H);
      for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,' + (0.6 - i * 0.1).toFixed(2) + ')'; c.fillRect(SH - 6 + i, 0, 1, H); }
      // 나: 벽에 등을 붙이고 무릎을 세웠다. 헤드를 무릎과 가슴 사이에 끌어안았다
      const sh2 = Math.round(Math.sin(t * 22) * 0.6);
      c.fillStyle = '#2c2c34'; c.fillRect(66 + sh2, 88, 22, 32); // 몸통
      c.fillStyle = '#34343e'; c.beginPath(); c.moveTo(84 + sh2, 120); c.lineTo(98 + sh2, 100); c.lineTo(104 + sh2, 104); c.lineTo(96 + sh2, 120); c.fill(); // 세운 무릎
      c.fillStyle = '#1a1614'; c.beginPath(); c.ellipse(76 + sh2, 82, 8, 8, 0, 0, 7); c.fill(); c.fillStyle = '#c4a28a'; c.fillRect(81 + sh2, 82, 3, 4); // 머리카락, 땀 젖은 옆얼굴 한 귀퉁이
      c.fillStyle = '#efe6d6'; c.fillRect(78 + sh2, 92, 15, 13); c.fillStyle = '#e07a2a'; c.fillRect(78 + sh2, 92, 6, 5); c.fillStyle = '#1c1c20'; c.fillRect(89 + sh2, 93, 4, 4); c.fillStyle = '#2a3a2a'; c.fillRect(86 + sh2, 98, 2, 2); // 품에 안은 헤드
      c.fillStyle = '#2c2c34'; c.fillRect(72 + sh2, 95, 6, 6); c.fillStyle = '#c4a28a'; c.fillRect(76 + sh2, 96, 4, 4); // 손 파츠를 뺐다. 소매를 끝까지 내린 맨손
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(60, 72, 50, 50);
      // 꼬리: 엉덩이에서 바닥으로, 그늘 밖으로 밀려 나간다. 주황 바탕에 검은 끝
      const tip = 96 + len;
      c.strokeStyle = '#e07a2a'; c.lineWidth = 4; c.beginPath(); c.moveTo(86, GY - 1); c.quadraticCurveTo((86 + tip) / 2, GY + 3 + Math.sin(t * 9) * 1, tip, GY); c.stroke();
      c.strokeStyle = '#efe6d6'; c.lineWidth = 1; c.beginPath(); c.moveTo(88, GY); c.quadraticCurveTo((86 + tip) / 2, GY + 4, tip - 3, GY + 1); c.stroke();
      c.fillStyle = '#1a1a1a'; c.fillRect(Math.round(tip) - 3, GY - 2, 5, 4);
      // 손전등 빛
      const r = 18;
      const g = c.createRadialGradient(bx, GY - 4, 2, bx, GY - 4, r + 8); g.addColorStop(0, 'rgba(255,246,210,0.55)'); g.addColorStop(0.7, 'rgba(255,240,200,0.25)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(bx, GY - 4, r + 8, 16, 0, 0, 7); c.fill();
      // 바스락거림
      if (rustle > 0.05) { c.fillStyle = '#1a1e2a'; c.fillRect(8, H - 8, 60, 3); c.fillStyle = rustle > 0.7 ? '#c84a3a' : '#8a8f99'; c.fillRect(8, H - 8, Math.round(60 * Math.min(1, rustle)), 3); }
    },
  };
}

const GAMES: Record<string, (opt: GameOpt) => Play> = { dodge, zoom, breath, bill: () => paw(0), coins: () => paw(1), stitch, still: () => still(true), stillhot: () => still(false), flood, type, closet, dial, gaze, tilt, tug, lurk, watch, leave: () => leave(false), leaveall: () => leave(true), swing: () => swing(false), swing2: () => swing(true), photo, catchb, zip, knock, sleeve, album, point, pills, grab, push, bag, beam };
export const GAME_IDS = Object.keys(GAMES);
/** 시험용 (tools/games-sim.mjs) */
export const _GAMES = GAMES;
