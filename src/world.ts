// 걸어 다니는 세계. 타일맵, 사람, 빛.
import { DELTA, MAPS, TILE, LEGEND, flood, inObj, pathTo, routeTo, tileAt, type Dir, type MapDef, type Obj } from './maps.ts';
import { canvasOf, drawChar, drawMark, drawTile, type Look } from './sprites.ts';
import { paintRoom, ROOM_OY } from './art/room.ts';
import { paintPlace, type Prop } from './art/places.ts';

type Actor = {
  id: string; look: Look; x: number; y: number; px: number; py: number; dir: Dir;
  path: [number, number][]; walked: number; pose: string; emote: string; emoteUntil: number;
  speed: number; onArrive: (() => void) | null;
};
export type Bind = { at: string; idx: number };

const SPECIAL = new Set(['move', 'wait']);
const SEAT = /^(swing|seat)/; // 이 이름의 자리에 놓인 사람은 앉는다
const poseAt = (where: string): string => (/^floor/.test(where) ? 'floor' : SEAT.test(where) ? 'sit' : 'stand'); // floor… 자리에서는 바닥에 주저앉는다
const HAEUN_EYES: Look = { kind: 'haeun', eyes: true };
const NPC_LOOK: Record<string, Look> = {
  police: { kind: 'police' }, haeun: { kind: 'haeun' }, father: { kind: 'father' }, guard: { kind: 'guard' }, catreal: { kind: 'catreal' },
  hyunwoo: { kind: 'hyunwoo' }, moka: { kind: 'moka' }, gombyo: { kind: 'gombyo' }, silbap: { kind: 'silbap' },
  fox: { kind: 'fox' }, rabbit: { kind: 'rabbit' }, dog: { kind: 'dog' }, bear: { kind: 'bear' }, hyunwoo_fox: { kind: 'fox_nohead' }, hyunwoo_case: { kind: 'hyunwoo', case: true }, mother: { kind: 'mother' },
};
// 분위기 → [어둠의 세기, 낮인가, 커튼 틈의 색]
const MOOD: Record<string, [number, boolean, string]> = {
  black: [0.965, false, '#2e3e58'], night: [0.8, false, '#2e3e58'], dark: [0.9, false, '#2e3e58'], doorshadow: [0.93, false, '#2e3e58'],
  open: [0.82, false, '#2e3e58'], day: [0.34, true, '#aab2ac'], bright: [0.16, true, '#e2e4d6'], rain: [0.42, true, '#78868f'],
  dusk: [0.5, true, '#c48454'],
  party: [0.5, false, '#2e3e58'], // 파티룸: 꼬마전구와 백열등이 군데군데 밝힌다
  evening: [0.66, false, '#3a3858'], // 비 갠 저녁 거리: 간판 불빛이 밝힌다
  glass: [0.8, false, '#2e3e58'],    // 2장 끝의 복도. 밤과 같고, 현관 앞에 깨진 병이 있다
};

function actor(id: string, look: Look, x: number, y: number, dir: Dir): Actor {
  return { id, look, x, y, px: x * TILE, py: y * TILE, dir, path: [], walked: 0, pose: 'stand', emote: '', emoteUntil: 0, speed: 66, onArrive: null };
}

export class World {
  canvas: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  private dark = document.createElement('canvas');
  private dc: CanvasRenderingContext2D;
  private W = 320; private H = 180;
  mapId = ''; map: MapDef | null = null; mood = 'night';
  player: Actor = actor('player', { kind: 'yunjae' }, 0, 0, 'down');
  npcs = new Map<string, Actor>();
  haeunEyes = false; // 2장부터 하은에게 희미한 눈이 생긴다
  flags = { monitor: false, eyes: false, lampOff: false, headGone: false, headDone: true, mark: '' as '' | 'torn' | 'sewn', box: '' as '' | 'shut' | 'open', tidy: false };
  fast = false; autopilot = false;
  onMoved: () => void = () => {};
  private held: Dir[] = [];
  private binds: Bind[] | null = null;
  private resolveWalk: ((idx: number[]) => void) | null = null;
  private last = performance.now();
  private t = 0;
  private lagX = 0; private lagY = 0; // 센서등은 한 박자 늦게 켜진다
  private shakeUntil = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d')!;
    this.dc = this.dark.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('click', (e) => this.click(e));
    // 화면이 가려져 있어도 걸음은 시간대로 간다
    setInterval(() => this.tick(), 30);
    const loop = (): void => { this.tick(); this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  get active(): boolean { return !!this.map; }
  get walking(): boolean { return !!this.binds; }

  private resize(): void {
    const st = this.canvas.parentElement!.getBoundingClientRect();
    if (!st.width || !st.height) return; // 화면이 아직 안 보이면 (크기 0) 건너뛴다: 0 크기 캔버스를 그리면 그리기 루프가 죽는다
    const k = Math.max(1, Math.floor(st.height / (this.map?.view || 172)));
    this.W = Math.ceil(st.width / k); this.H = Math.ceil(st.height / k);
    this.canvas.width = this.dark.width = this.W; this.canvas.height = this.dark.height = this.H;
    this.canvas.style.width = `${this.W * k}px`; this.canvas.style.height = `${this.H * k}px`;
  }

  // ── 장면 ──
  show(mapId: string, mood: string, keep: boolean): void {
    const m = MAPS[mapId];
    if (!m) { this.hide(); return; }
    const same = this.mapId === mapId && keep;
    const zoomed = (this.map?.view || 172) !== (m.view || 172);
    this.map = m; this.mapId = mapId; this.mood = mood;
    if (zoomed) this.resize();
    this.canvas.style.display = 'block';
    if (!same) { this.npcs.clear(); this.place(this.player, m.spawn); this.player.pose = 'stand'; this.player.path = []; }
    this.lagX = this.player.px; this.lagY = this.player.py;
  }
  hide(): void { this.map = null; this.mapId = ''; this.canvas.style.display = 'none'; this.cancelWalk(); }

  private point(name: string): [number, number, Dir] {
    const p = this.map?.points[name];
    return p ? [p[0], p[1], p[2] || 'down'] : [this.player.x, this.player.y, this.player.dir];
  }
  private place(a: Actor, name: string): void {
    const [x, y, d] = this.point(name);
    a.x = x; a.y = y; a.px = x * TILE; a.py = y * TILE; a.dir = d; a.path = []; a.onArrive = null;
  }
  setPos(name: string): void { if (this.map) this.place(this.player, name); }
  setTile(x: number, y: number, dir: Dir): void { const a = this.player; a.x = x; a.y = y; a.px = x * TILE; a.py = y * TILE; a.dir = dir; a.path = []; }
  setPose(p: string): void { this.player.pose = p; }
  snap(): void { this.lagX = this.player.px; this.lagY = this.player.py; } // 카메라가 따라오지 않고 바로 그 자리를 비춘다
  setFace(d: Dir): void { this.player.dir = d; }
  setLook(l: Look): void { this.player.look = l; this.player.speed = l.kind === 'cat' || l.kind === 'cat_nohead' ? 54 : 66; }
  emote(name: string, who?: string): void { const a = who ? this.npcs.get(who) : this.player; if (a) { a.emote = name; a.emoteUntil = this.t + 1.8; } }
  shake(ms = 500): void { this.shakeUntil = performance.now() + ms; }

  /** 이름 붙은 자리까지 걸어간다. 길이 없으면 그냥 옮겨 놓는다. */
  go(name: string, who: Actor = this.player): Promise<void> {
    if (!this.map) return Promise.resolve();
    const [x, y, d] = this.point(name);
    let path: [number, number][] | null = null;
    if (!this.fast) {
      const prev = flood(this.map, [who.x, who.y]);
      path = pathTo(prev, x, y);
      if (!path) for (const [dx, dy] of Object.values(DELTA)) { // 막힌 칸(그네)이면 옆 칸까지 걸어가서 올라앉는다
        const q = pathTo(prev, x + dx, y + dy);
        if (q && (!path || q.length + 1 < path.length)) path = [...q, [x, y]];
      }
    }
    if (!path || path.length < 2) { who.x = x; who.y = y; who.px = x * TILE; who.py = y * TILE; who.dir = d; return Promise.resolve(); }
    return new Promise((res) => {
      who.path = path.slice(1);
      const mine = (): void => { who.dir = d; res(); };
      who.onArrive = mine;
      // 6초 안에 못 오면 옮겨 놓는다. 이 걸음의 도착 처리일 때만: 이미 도착해 다음 걸음이 시작됐으면 건드리지 않는다.
      setTimeout(() => { if (who.onArrive === mine) { who.path = []; who.onArrive = null; who.x = x; who.y = y; who.px = x * TILE; who.py = y * TILE; mine(); } }, 6000);
    });
  }
  npc(id: string, where: string, walk: boolean): Promise<void> {
    if (!this.map) return Promise.resolve();
    if (where === 'off') { this.npcs.delete(id); return Promise.resolve(); }
    let a = this.npcs.get(id);
    if (!a) {
      a = actor(id, NPC_LOOK[id] || { kind: 'person' }, 0, 0, 'down'); a.speed = id === 'catreal' ? 70 : id === 'hyunwoo_case' ? 62 : 40; // 같이 걷는 현우는 내 걸음에 맞춘다
      this.place(a, where); this.npcs.set(id, a);
      a.pose = poseAt(where);
      return Promise.resolve();
    }
    const b = a;
    const sit = (): void => { b.pose = poseAt(where); };
    if (walk) { b.pose = 'stand'; return this.go(where, b).then(sit); }
    this.place(b, where); sit();
    return Promise.resolve();
  }

  // ── 걷기 ──
  private solid(x: number, y: number): boolean {
    if (!this.map || tileAt(this.map, x, y)[1]) return true;
    for (const n of this.npcs.values()) if (n.x === x && n.y === y && n.look.kind !== 'catreal') return true;
    return false;
  }
  private obj(id: string): Obj | undefined { return this.map?.objs.find((o) => o.id === id); }
  hasTarget(at: string): boolean { return SPECIAL.has(at) || !!this.obj(at); }
  isTouch(at: string): boolean { return !!this.obj(at)?.touch; }

  waitChoice(binds: Bind[]): Promise<number[]> {
    return new Promise((res) => {
      this.binds = binds; this.resolveWalk = res; this.held = [];
      if (this.checkTouch()) return;
      if (this.autopilot) setTimeout(() => this.auto(), this.fast ? 0 : 300);
    });
  }
  private cancelWalk(): void { this.binds = null; this.resolveWalk = null; }
  private resolve(at: string): boolean {
    if (!this.binds || !this.resolveWalk) return false;
    const idx = this.binds.filter((b) => b.at === at).map((b) => b.idx);
    if (!idx.length) return false;
    const r = this.resolveWalk; this.cancelWalk(); this.player.path = []; this.player.onArrive = null;
    r(idx);
    return true;
  }
  private checkTouch(): boolean {
    if (!this.binds || !this.map) return false;
    const p = this.player;
    for (const o of this.map.objs) if (o.touch && inObj(o, p.x, p.y) && this.resolve(o.id)) return true;
    return false;
  }
  private auto(): void { // 검사용: 묶인 선택지 중 하나를 골라 걸어가서 고른다
    if (!this.binds || !this.map) return;
    const ats = [...new Set(this.binds.map((b) => b.at))];
    const at = ats[Math.floor(Math.random() * ats.length)];
    if (SPECIAL.has(at)) { this.resolve(at); return; }
    this.walkTo(this.obj(at)!);
  }
  private walkTo(o: Obj): void {
    if (!this.map) return;
    const p = this.player;
    const rt = routeTo(this.map, [p.x, p.y], o, (x, y) => this.solid(x, y));
    if (!rt) return;
    const done = (): void => { p.dir = rt.face; if (!this.resolve(o.id)) this.checkTouch(); };
    if (this.fast || rt.path.length < 2) {
      const [x, y] = rt.path[rt.path.length - 1]; this.setTile(x, y, rt.face); done(); return;
    }
    p.path = rt.path.slice(1); p.onArrive = done;
  }

  key(dir: Dir, down: boolean, repeat: boolean): void {
    if (!down) { this.held = this.held.filter((d) => d !== dir); return; }
    if (!this.binds) return;
    if (!repeat && this.resolve('move')) return; // 일어나려는 시도. 꾹 누르고 있어도 한 번만 센다.
    if (this.player.pose === 'lie') return; // 누운 채로는 걷지 않는다 (머리만 미끄러져 간다)
    if (!this.held.includes(dir)) this.held.push(dir);
    this.player.path = []; this.player.onArrive = null;
  }
  act(): boolean {
    if (!this.binds || !this.map) return false;
    const p = this.player;
    if (p.px !== p.x * TILE || p.py !== p.y * TILE) return false;
    const [dx, dy] = DELTA[p.dir];
    for (const o of this.map.objs) {
      if (o.touch) continue;
      if ((inObj(o, p.x + dx, p.y + dy) || inObj(o, p.x, p.y)) && this.resolve(o.id)) return true;
    }
    return this.resolve('wait');
  }
  private click(e: MouseEvent): void {
    if (!this.binds || !this.map) return;
    if (this.player.pose === 'lie') { this.resolve('move'); return; } // 누워 있을 때 화면을 누르면 일어나려는 시도. 걸어가지 않는다.
    const rc = this.canvas.getBoundingClientRect();
    const [cx, cy] = this.camera();
    const tx = Math.floor(((e.clientX - rc.left) / rc.width * this.W + cx) / TILE);
    const ty = Math.max(0, Math.floor(((e.clientY - rc.top) / rc.height * this.H + cy) / TILE)); // 벽에 그린 문은 맵 위로 솟아 있다: 그 위를 눌러도 벽 칸으로 친다
    const o = this.map.objs.find((q) => inObj(q, tx, ty) && this.binds!.some((b) => b.at === q.id));
    if (o) { this.walkTo(o); return; }
    const p = this.player;
    const path = pathTo(flood(this.map, [p.x, p.y], (x, y) => this.solid(x, y)), tx, ty);
    if (path && path.length > 1) { p.path = path.slice(1); p.onArrive = null; }
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min(1, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    if (!this.map) return;
    const all = [this.player, ...this.npcs.values()];
    for (const a of all) {
      let left = a.speed * dt;
      for (let guard = 0; guard < 40 && left > 0; guard++) {
        const tx = a.x * TILE, ty = a.y * TILE;
        const d = Math.abs(tx - a.px) + Math.abs(ty - a.py);
        if (d > 0) {
          const s = Math.min(left, d);
          a.px += Math.sign(tx - a.px) * s; a.py += Math.sign(ty - a.py) * s;
          a.walked += s; left -= s;
          if (s < d) break;
          if (a === this.player) { if (this.checkTouch()) break; }
          continue;
        }
        // 한 칸에 도착했다. 다음 칸을 정한다.
        if (a.path.length) {
          const [nx, ny] = a.path[0];
          if (a === this.player && this.solid(nx, ny)) { a.path = []; a.onArrive = null; break; }
          a.path.shift(); this.turn(a, nx, ny); a.x = nx; a.y = ny;
          if (a === this.player) this.onMoved();
          continue;
        }
        if (a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); break; }
        if (a === this.player && this.binds && this.held.length && a.pose === 'stand') {
          const dir = this.held[this.held.length - 1];
          a.dir = dir;
          const [dx, dy] = DELTA[dir];
          if (this.solid(a.x + dx, a.y + dy)) break;
          a.x += dx; a.y += dy; this.onMoved();
          continue;
        }
        break;
      }
      if (a.emote && this.t > a.emoteUntil) a.emote = '';
    }
    this.lagX += (this.player.px - this.lagX) * Math.min(1, dt * 2.2);
    this.lagY += (this.player.py - this.lagY) * Math.min(1, dt * 2.2);
  }
  private turn(a: Actor, nx: number, ny: number): void {
    a.dir = nx > a.x ? 'right' : nx < a.x ? 'left' : ny > a.y ? 'down' : 'up';
  }

  // ── 그리기 ──
  private camera(): [number, number] {
    const m = this.map!;
    const top = m.top || 0; // 그림이 맵 위로 더 솟은 만큼
    const mw = m.grid[0].length * TILE, mh = m.grid.length * TILE + top;
    const viewH = this.H * 0.74; // 아래쪽은 대화창이 가린다
    const cx = mw <= this.W ? (mw - this.W) / 2 : Math.max(0, Math.min(mw - this.W, this.player.px + 8 - this.W / 2));
    // 사람은 키가 크고 볼 것은 벽에 있다: 발이 화면 위에서 2/3 쯤에 오게 해서 머리 위를 더 보여 준다
    const cy = (mh <= viewH + 4 ? (mh - viewH) / 2 : Math.max(-8, Math.min(mh - viewH + 8, this.player.py + 13 + top - viewH * 0.64))) - top;
    return [Math.round(cx), Math.round(cy)];
  }
  private lights(): { x: number; y: number; r: number; a: number; col?: string; tint?: number }[] {
    const m = this.map!, out: { x: number; y: number; r: number; a: number; col?: string; tint?: number }[] = [];
    const p = this.player, t = this.t, mood = this.mood;
    out.push({ x: p.px + 8, y: p.py + 8, r: 26, a: 0.5 });
    const flick = Math.sin(t * 31) * Math.sin(t * 7.3) > 0.9 ? 0.55 : 1;
    if (this.mapId === 'stairs') out.push({ x: this.lagX + 8, y: this.lagY - 4, r: 58, a: 0.82, col: 'rgba(200,210,200,A)' }); // 센서등: 한 박자 늦게 켜진다
    if (m.lights) { // 그림으로 그린 맵: 빛도 맵에 적혀 있다
      const day = (MOOD[mood] || MOOD.night)[1];
      for (const l of m.lights) {
        if ((l.when === 'night' && day) || (l.when === 'day' && !day)) continue;
        if (l.mood && l.mood !== mood) continue;
        let a = l.a;
        if (l.fx === 'flicker') a *= Math.sin(t * 23 + l.x) * Math.sin(t * 5.1) > 0.82 ? 0.25 : 1;
        else if (l.fx === 'tv') a *= 0.55 + 0.45 * Math.abs(Math.sin(t * 3.7) * Math.sin(t * 1.3 + 1));
        else if (l.fx === 'blink') a *= Math.sin(t * 2.4) > 0.6 ? 1 : 0.35;
        out.push({ x: l.x, y: l.y, r: l.r, a, col: l.col, tint: l.tint });
      }
      const g0 = this.npcs.get('guard');
      if (g0) out.push({ x: g0.px - 26 + Math.sin(t * 1.3) * 22, y: g0.py + 2 + Math.cos(t * 0.9) * 8, r: 30, a: 0.95, col: 'rgba(240,235,210,A)' });
      return out;
    }
    if (this.mapId === 'room') {
      if ((mood === 'night' && !this.flags.lampOff) || mood === 'open') out.push({ x: 88, y: 52, r: 118, a: 0.9 * flick, col: 'rgba(190,205,200,A)' });
      if (this.flags.monitor && mood !== 'black') out.push({ x: 103, y: 8, r: 50, a: 0.8, col: 'rgba(110,145,210,A)' });
      if (mood === 'doorshadow' || mood === 'dark' || mood === 'black') out.push({ x: 160, y: 56, r: 11, a: 0.32, col: 'rgba(214,190,140,A)' });
      if (mood === 'open') out.push({ x: 166, y: 56, r: 46, a: 0.85, col: 'rgba(214,190,140,A)' });
      out.push({ x: 32, y: 2, r: 16, a: 0.4 });                                        // 커튼 틈
      if (!this.flags.headGone && mood !== 'black') out.push({ x: 76, y: 2, r: 15, a: 0.55 }); // 얼룩이의 머리는 어둠 속에서도 조금 보인다
    }
    for (let y = 0; y < m.grid.length; y++) for (let x = 0; x < m.grid[y].length; x++) {
      const n = LEGEND[m.grid[y][x]]?.[0];
      const cx = x * TILE + 8, cy = y * TILE + 8;
      if (n === 'lamp') out.push({ x: cx, y: cy + 10, r: 62, a: 0.92, col: 'rgba(232,160,80,A)' });
      else if (n === 'apt_window_lit') out.push({ x: cx, y: cy + 8, r: 26, a: 0.7, col: 'rgba(210,180,120,A)' });
      else if (n === 'booth') out.push({ x: cx, y: cy + 6, r: 24, a: 0.7, col: 'rgba(220,200,140,A)' });
      else if (n === 'block_door' || n === 'glass_door') out.push({ x: cx, y: cy + 6, r: 34, a: 0.8, col: 'rgba(232,170,90,A)' });
      else if (n === 'apt_door' && x % 8 === 5) out.push({ x: cx, y: cy + 14, r: 30, a: 0.55 * (Math.sin(t * 9 + x) > 0.95 ? 0.4 : 1), col: 'rgba(200,214,205,A)' });
      else if (n === 'door_front') out.push({ x: cx - 8, y: cy, r: 12, a: 0.4, col: 'rgba(127,212,154,A)' });
      else if (n === 'stair_in') out.push({ x: cx, y: cy, r: 18, a: 0.5, col: 'rgba(90,200,130,A)' });
    }
    if (this.mapId === 'recycle') out.push({ x: 150, y: 50, r: 60, a: 0.6, col: 'rgba(232,160,80,A)' });
    const g = this.npcs.get('guard');
    if (g) out.push({ x: g.px - 26 + Math.sin(t * 1.3) * 22, y: g.py + 2 + Math.cos(t * 0.9) * 8, r: 30, a: 0.95, col: 'rgba(240,235,210,A)' });
    return out;
  }
  private draw(): void {
    const m = this.map;
    if (!m) return;
    const c = this.c, W = this.W, H = this.H, t = this.t;
    let [cx, cy] = this.camera();
    if (performance.now() < this.shakeUntil) { cx += Math.round(Math.sin(t * 90) * 3); cy += Math.round(Math.cos(t * 70) * 2); }
    const [darkA, day, slit] = MOOD[this.mood] || MOOD.night;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    let props: Prop[] = [];
    const k = { t, monitor: this.flags.monitor, day, slit, x: 0, y: 0, open: this.mood === 'open', headGone: this.flags.headGone };
    if (this.mapId === 'room') {
      const lie = this.player.pose === 'lie';
      const room = paintRoom({ monitor: this.flags.monitor, headGone: this.flags.headGone, headDone: this.flags.headDone, open: this.mood === 'open', slit, day, lie, mark: this.flags.mark, box: this.flags.box, tidy: this.flags.tidy });
      c.drawImage(canvasOf(room), -cx, -cy - ROOM_OY);
      if (this.mood === 'doorshadow' || this.mood === 'dark' || this.mood === 'black') { // 문틈 아래로 거실 불빛이 샌다
        c.fillStyle = '#d6be8c'; c.fillRect(159 - cx, 49 - cy, 1, 14);
        if (this.mood === 'doorshadow') { c.fillStyle = '#16121a'; c.fillRect(159 - cx, 52 - cy, 1, 3); c.fillRect(159 - cx, 58 - cy, 1, 3); } // 두 군데 끊긴다. 발 두 개다.
      }
    } else if (m.painted) {
      const pl = paintPlace(this.mapId, { day, mood: this.mood });
      if (pl) { c.drawImage(canvasOf(pl.base), -cx, -cy - (m.top || 0)); props = pl.props; }
    } else for (let y = 0; y < m.grid.length; y++) for (let x = 0; x < m.grid[y].length; x++) {
      const sx = x * TILE - cx, sy = y * TILE - cy;
      if (sx < -TILE || sy < -TILE || sx > W || sy > H) continue;
      k.x = x; k.y = y;
      drawTile(c, LEGEND[m.grid[y][x]]?.[0] || 'void', sx, sy, k);
    }
    // 사람과 앞을 가리는 물건(가로등 기둥, 난간, 나무)을 발 위치 순서로 그린다. 사람의 발은 py+13.
    const pl = this.player;
    const behind = (q: Prop): boolean => q.fade === true && pl.py + 13 < q.foot && pl.px + 24 > q.x && pl.px - 8 < q.x + q.pix.w && pl.py - 34 < q.y + q.pix.h && pl.py + 13 > q.y;
    const drawn: { foot: number; draw: () => void }[] = props.map((q) => ({ foot: q.foot, draw: () => {
      c.globalAlpha = behind(q) ? 0.45 : 1; // 나무 뒤에 서면 잎이 비친다
      c.drawImage(canvasOf(q.pix), Math.round(q.x - cx), Math.round(q.y - cy));
      c.globalAlpha = 1;
    } }));
    for (const a of [this.player, ...this.npcs.values()]) if (a.pose !== 'gone') drawn.push({ foot: a.py + 13, draw: () => {
      const moving = a.px !== a.x * TILE || a.py !== a.y * TILE;
      const step = moving ? Math.floor(a.walked / 6) % 4 : 0;
      drawChar(c, a.look.kind === 'haeun' && this.haeunEyes ? HAEUN_EYES : a.look, Math.round(a.px - cx), Math.round(a.py - cy - 6), a.dir, step, a.pose, a.emote, t, !moving);
    } });
    drawn.sort((a, b) => a.foot - b.foot).forEach((d) => d.draw());
    // 어둠을 덮고, 빛이 닿는 자리만 걷어 낸다
    const d = this.dc, ls = this.lights();
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(3,5,9,${darkA})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    for (const l of ls) {
      const g = d.createRadialGradient(l.x - cx, l.y - cy, 0, l.x - cx, l.y - cy, l.r);
      g.addColorStop(0, `rgba(0,0,0,${l.a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(l.x - cx - l.r, l.y - cy - l.r, l.r * 2, l.r * 2);
    }
    c.drawImage(this.dark, 0, 0);
    c.globalCompositeOperation = 'lighter';
    for (const l of ls) {
      if (!l.col) continue;
      const g = c.createRadialGradient(l.x - cx, l.y - cy, 0, l.x - cx, l.y - cy, l.r);
      g.addColorStop(0, l.col.replace('A', String((l.tint ?? 0.2) * l.a))); g.addColorStop(1, l.col.replace('A', '0'));
      c.fillStyle = g; c.fillRect(l.x - cx - l.r, l.y - cy - l.r, l.r * 2, l.r * 2);
    }
    c.globalCompositeOperation = 'source-over';
    // 조사할 수 있는 물건 표시 (어둠 위에 그린다)
    if (this.binds) for (const o of m.objs) {
      if (!this.binds.some((b) => b.at === o.id)) continue;
      if (o.touch) { // 지나갈 자리: 바닥에 옅은 점
        const a = 0.16 + 0.12 * Math.sin(t * 3);
        c.fillStyle = `rgba(240,237,230,${a})`;
        for (let y = o.y; y < o.y + (o.h || 1); y++) for (let x = o.x; x < o.x + (o.w || 1); x++) {
          if (!tileAt(m, x, y)[1]) c.fillRect(x * TILE - cx + 7, y * TILE - cy + 8, 2, 2);
        }
        continue;
      }
      drawMark(c, (o.x + ((o.w || 1) - 1) / 2) * TILE - cx, o.y * TILE - cy + 4, t);
    }
  }
}
