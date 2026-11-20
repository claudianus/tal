// 미니게임. 장면 위에 반투명 판을 깔고 그 위에서 방향키와 Z 로 한다.
// 이기고 지는 게임이 아니다: 몸이 말을 안 듣는 감각을 손에 쥐여 주는 장치다. 실패해도 이야기는 끝나지 않는다.
// 결과는 문자열 하나다. 대본의 선택지가 "# game: <이름> <결과>" 로 그 결과를 받는다.
import { sfx } from './audio.ts';
import * as ui from './ui.ts';
import type { GameKey } from './ui.ts';
import { mirrorScene, videoPlayground } from './art/cuts.ts';
import { canvasOf } from './sprites.ts';

const W = 256, H = 144;
type GameOpt = { ghosts?: string[]; text?: string; droopy?: boolean; lines?: string[]; skin?: string; pov?: string };
type Keys = Record<GameKey, boolean>;
type Ctx = CanvasRenderingContext2D;
/** 한 판: 매 프레임 step 을 부르고, 결과가 나오면 문자열을 돌려준다. */
type Play = { step: (dt: number, t: number, k: Keys, hit: Set<GameKey>) => string | null; draw: (c: Ctx, t: number) => void; hint: string; scale?: number };

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
const FAST: Record<string, string> = { dodge: 'held', zoom: 'seen', breath: 'calm', bill: 'done', coins: 'done', stitch: 'done', still: 'still', flood: 'off', type: 'sent', closet: 'hid', dial: 'call', gaze: 'looked', tilt: 'tilt', tug: 'torn' };

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
function still(): Play {
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
      for (let i = 0; i < 40; i++) { const x = (i * 37 + t * 40) % W, y = (i * 53 + t * 160) % H; c.fillRect(Math.round(x), Math.round(y), 1, 4); }
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

const GAMES: Record<string, (opt: GameOpt) => Play> = { dodge, zoom, breath, bill: () => paw(0), coins: () => paw(1), stitch, still, flood, type, closet, dial, gaze, tilt, tug };
export const GAME_IDS = Object.keys(GAMES);
/** 시험용 (tools/games-sim.mjs) */
export const _GAMES = GAMES;
