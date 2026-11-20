// 미니게임. 장면 위에 반투명 판을 깔고 그 위에서 방향키와 Z 로 한다.
// 이기고 지는 게임이 아니다: 몸이 말을 안 듣는 감각을 손에 쥐여 주는 장치다. 실패해도 이야기는 끝나지 않는다.
// 결과는 문자열 하나다. 대본의 선택지가 "# game: <이름> <결과>" 로 그 결과를 받는다.
import { sfx } from './audio.ts';
import * as ui from './ui.ts';
import type { GameKey } from './ui.ts';

const W = 256, H = 144;
type Keys = Record<GameKey, boolean>;
type Ctx = CanvasRenderingContext2D;
/** 한 판: 매 프레임 step 을 부르고, 결과가 나오면 문자열을 돌려준다. */
type Play = { step: (dt: number, t: number, k: Keys, hit: Set<GameKey>) => string | null; draw: (c: Ctx, t: number) => void; hint: string };

let cv: HTMLCanvasElement | null = null;
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
export function playGame(id: string, opt: { ghosts?: string[] } = {}): Promise<string> {
  const mk = GAMES[id];
  if (!mk) return Promise.resolve('');
  if (ui.isFast()) return Promise.resolve(FAST[id] || '');
  const g = mk(opt);
  const el = canvas(), c = el.getContext('2d')!;
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
      if (done === null) { done = g.step(dt, t, keys, hit); hit = new Set(); }
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
const FAST: Record<string, string> = { breath: 'calm', bill: 'done', coins: 'done', stitch: 'done', still: 'still', flood: 'off', type: 'sent', closet: 'hid', dial: 'call', gaze: 'looked' };

// ═══════════ 숨 (넷을 들이쉬고, 넷을 멈추고, 넷을 내쉰다) ═══════════
// 가운데 원이 목표다. Z 를 누르고 있으면 내 숨(안의 원)이 차오르고, 떼면 빠진다. 목표를 따라가면 심장이 느려진다.
function breath(opt: { ghosts?: string[] }): Play {
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
function flood(opt: { ghosts?: string[] }): Play {
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
const TYPED = '제발 죽든지, 그런 짓 좀 하지 말든지 해.';
function type(opt: { ghosts?: string[] }): Play {
  const ghosts = opt.ghosts || [];
  let n = 0, sent = -1, key = -1, keyT = 0, said = 0;
  return {
    hint: '아무 키나 누르면 한 글자씩 써진다',
    step(dt, _t, _k, hit) {
      keyT -= dt;
      if (sent >= 0) { sent += dt; return sent > 1.1 ? 'sent' : null; }
      if (n >= TYPED.length) { if (hit.has('z')) { sent = 0; sfx('notify'); ui.hint(''); } return null; }
      if (hit.size) {
        n++; key = Math.floor(Math.random() * 30); keyT = 0.12; sfx('tap');
        ui.hint(TYPED.slice(0, n) + (n < TYPED.length ? '▍' : '   ·   Z 전송'));
        if (ghosts.length && n % 6 === 0) ui.ghost(ghosts[(said++) % ghosts.length]);
      }
      return null;
    },
    draw(c, t) {
      c.fillStyle = 'rgba(4,5,8,0.72)'; c.fillRect(0, 0, W, H);
      const X = W / 2 - 46, Y = 4, PW = 92, PH = H - 8;
      px(c, X - 3, Y - 3, PW + 6, PH + 6, '#0e0f13'); px(c, X, Y, PW, PH, '#b9c3cf');
      px(c, X, Y, PW, 9, '#a3afbc'); px(c, X + 4, Y + 3, 22, 3, '#59626e'); // 위 칸: 오빠
      // 지난 말풍선: '나 이번에 안 내려감' (내 것, 오른쪽, 노랑)
      px(c, X + PW - 46, Y + 14, 42, 9, '#f4e04a'); px(c, X + PW - 42, Y + 17, 30, 2, '#6e6420');
      px(c, X + PW - 54, Y + 20, 6, 2, '#59626e'); // 읽음 시각
      // 지금 치는 말풍선: 글자 수만큼 자란다
      if (n > 0) {
        const lines = Math.ceil(n / 11), last = n - (lines - 1) * 11;
        const bw = lines > 1 ? 66 : 10 + last * 5, bh = 5 + lines * 6;
        const by = Y + 30;
        px(c, X + PW - 4 - bw, by, bw, bh, sent >= 0 ? '#f4e04a' : '#efe7a8');
        for (let i = 0; i < lines; i++) { const w = i < lines - 1 ? 58 : Math.max(2, last * 5 - 2); px(c, X + PW - 4 - bw + 4, by + 3 + i * 6, Math.min(w, bw - 8), 2, '#6e6420'); }
        if (sent > 0.4) px(c, X + PW - 4 - bw - 5, by + bh - 4, 3, 3, '#e8c020'); // 숫자 1 이 사라진 자리
      }
      // 입력창과 자판
      const KY = Y + PH - 50;
      px(c, X, KY - 10, PW, 9, '#e9edf1'); px(c, X + 3, KY - 7, Math.min(PW - 20, n * 2), 3, '#2a2e36');
      if (n < TYPED.length && Math.sin(t * 8) > 0) px(c, X + 4 + Math.min(PW - 20, n * 2), KY - 8, 1, 5, '#2a2e36');
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
function closet(opt: { ghosts?: string[] }): Play {
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
function dial(opt: { ghosts?: string[] }): Play {
  const ghosts = opt.ghosts || [];
  const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const goal = '112';
  let typed = '', cx = 1, cy = 1, jx = 0, jy = 0, tt = 0, flash = -1, flashT = 0, calling = -1, said = 0, wrong = 0;
  return {
    hint: '방향키로 손가락을 옮기고 Z 로 누른다 · 1 1 2',
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
            ui.hint(wrong > 1 ? '천천히. 1 1 2' : '틀렸다. 지우고 다시');
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
function gaze(opt: { ghosts?: string[] }): Play {
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

const GAMES: Record<string, (opt: { ghosts?: string[] }) => Play> = { breath, bill: () => paw(0), coins: () => paw(1), stitch, still, flood, type, closet, dial, gaze };
export const GAME_IDS = Object.keys(GAMES);
/** 시험용 (tools/games-sim.mjs) */
export const _GAMES = GAMES;
