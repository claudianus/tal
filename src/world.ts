// 걸어 다니는 세계. 타일맵, 사람, 빛.
import { DELTA, MAPS, TILE, LEGEND, flood, inObj, pathTo, routeTo, tileAt, type Dir, type MapDef, type Obj } from './maps.ts';
import { canvasOf, drawChar, drawMark, drawTile, type Look } from './sprites.ts';
import { paintRoom, ROOM_OY } from './art/room.ts';
import { paintPlace, type Prop } from './art/places.ts';
import { ART } from './art/kit.ts';
import type { Pix } from './art/pix.ts';
import { sfx } from './audio.ts';

/** 맵 위를 지나가는 사람 (환승 통로의 인파). 칸에 묶이지 않고 픽셀로 움직인다. */
type Walker = { look: Look; x: number; y: number; vx: number; lane: number; walked: number; hitAt: number };
/** 다른 그림 파일이 채워 넣는 그림: 승강장의 열차, 커튼 밑의 발 */
const TRAIN_STOP = 16; // 이 자리에 서면 열차 둘째 문(x 120+16)이 승강장 'door' 칸(8,4) 가운데에 온다

type Actor = {
  id: string; look: Look; x: number; y: number; px: number; py: number; dir: Dir;
  path: [number, number][]; walked: number; pose: string; emote: string; emoteUntil: number;
  speed: number; onArrive: (() => void) | null; dest?: [number, number] | null;
};
export type Bind = { at: string; idx: number };

const SPECIAL = new Set(['move', 'wait', 'timeout', 'up', 'down', 'left', 'right']); // up·down·left·right: 그 방향키 하나에 묶인 몸짓
const SEAT = /^(swing|seat)/; // 이 이름의 자리에 놓인 사람은 앉는다
const poseAt = (where: string): string => (/^floor/.test(where) ? 'floor' : SEAT.test(where) ? 'sit' : 'stand'); // floor… 자리에서는 바닥에 주저앉는다
const HAEUN_EYES: Look = { kind: 'haeun', eyes: true };
// 놀이터 그네: 앉는 자리(맵 칸), 쇠사슬이 매달린 높이와 길이 (places.ts 의 그네 틀과 맞춘다)
const SWING_SEATS = [{ id: 'swing1', x: 9, y: 6, ph: 0 }, { id: 'swing2', x: 11, y: 6, ph: 1.9 }];
const SWING_TOP = 46, SWING_L = 54;
const NPC_LOOK: Record<string, Look> = {
  police: { kind: 'police' }, haeun: { kind: 'haeun' }, father: { kind: 'father' }, guard: { kind: 'guard' }, catreal: { kind: 'catreal' },
  hyunwoo: { kind: 'hyunwoo' }, moka: { kind: 'moka' }, gombyo: { kind: 'gombyo' }, silbap: { kind: 'silbap' },
  fox: { kind: 'fox' }, rabbit: { kind: 'rabbit' }, dog: { kind: 'dog' }, bear: { kind: 'bear' }, hyunwoo_fox: { kind: 'fox_nohead' }, hyunwoo_case: { kind: 'hyunwoo', case: true }, mother: { kind: 'mother' },
  clerk: { kind: 'clerk' }, grandma: { kind: 'grandma' }, nabi: { kind: 'nabi' }, kid: { kind: 'kid' }, yunseo: { kind: 'yunseo' },
  mom: { kind: 'person', v: 1 }, neighbor: { kind: 'person', v: 2 }, mourner: { kind: 'person', v: 3 }, police2: { kind: 'police' },
  pa: { kind: 'person', v: 0 }, pb: { kind: 'person', v: 1 }, pc: { kind: 'person', v: 2 }, pd: { kind: 'person', v: 3 }, pe: { kind: 'person', v: 4 },
  pf: { kind: 'person', v: 5 }, pg: { kind: 'person', v: 6 }, ph: { kind: 'person', v: 7 }, pi: { kind: 'person', v: 8 }, pj: { kind: 'person', v: 9 },
};
// 분위기 → [어둠의 세기, 낮인가, 커튼 틈의 색]
const MOOD: Record<string, [number, boolean, string]> = {
  black: [0.965, false, '#2e3e58'], night: [0.8, false, '#2e3e58'], dark: [0.9, false, '#2e3e58'], doorshadow: [0.93, false, '#2e3e58'],
  open: [0.82, false, '#2e3e58'], day: [0.34, true, '#aab2ac'], bright: [0.16, true, '#e2e4d6'], rain: [0.42, true, '#78868f'],
  dusk: [0.5, true, '#c48454'],
  party: [0.5, false, '#2e3e58'], // 파티룸: 꼬마전구와 백열등이 군데군데 밝힌다
  evening: [0.66, false, '#3a3858'], // 비 갠 저녁 거리: 간판 불빛이 밝힌다
  glass: [0.8, false, '#2e3e58'],    // 2장 끝의 복도. 밤과 같고, 현관 앞에 깨진 병이 있다
  rainnight: [0.84, false, '#2e3e58'], // 소나기 내리는 밤의 놀이터
  color: [0.0, true, '#aab2ac'],     // 할머니 집: 여름 한낮, 색이 있다
  white: [0.03, true, '#e2e4d6'],    // 응급실 천장
  few: [0.8, false, '#2e3e58'],      // 엔딩 C 의 장례식장 (밤, 화환이 둘)
  tv: [0.9, false, '#2e3e58'],       // 4장의 기억: 불 꺼진 거실, TV 빛만
  inside: [0.55, false, '#2e3e58'],  // 탈 안에서 본 방: 눈구멍 밖은 검게 덮는다
  openday: [0.4, true, '#aab2ac'],   // 3장 다음 날 아침: 부서진 문이 한 뼘 열려 있다
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
  private mask: HTMLCanvasElement | null = null; // 탈 안 시점의 눈구멍 가림막
  mapId = ''; map: MapDef | null = null; mood = 'night';
  player: Actor = actor('player', { kind: 'yunjae' }, 0, 0, 'down');
  npcs = new Map<string, Actor>();
  haeunEyes = false; // 2장부터 하은에게 희미한 눈이 생긴다
  swings: Record<string, string> = {}; // 그네 자리 → still / gentle / high
  flags = { monitor: false, eyes: false, lampOff: false, headGone: false, headDone: true, mark: '' as '' | 'torn' | 'sewn', box: '' as '' | 'shut' | 'open', tidy: false, ajar: false, headAt: '' as '' | 'bed' | 'floor', pile: '' as '' | 'torn' | 'folded', closet: '' as '' | 'left' | 'mirror', siren: false, door: '' as '' | 'front' | '1107' };
  fast = false; autopilot = false;
  /** 걸으며 듣기: 고를 것이 없어도 대사가 흐르는 동안 방향키로 걷는다. 누워 있으면 뒤척이고, 앉아 있으면 고개만 돌린다. */
  roam = false;
  tossAt = -9; // 마지막으로 뒤척인 때
  rain = false; // 바깥 맵에 비가 내린다
  train = { state: '' as '' | 'arrive' | 'stop' | 'open' | 'leave' | 'gone', x: 0, v: 0, done: null as (() => void) | null };
  private patrol: { t: number; meter: number; game: boolean; end: (o: string) => void } | null = null;
  private sneak: { t: number; meter: number; snore: boolean; phase: number; lx: number; ly: number; game: boolean; end: (o: string) => void } | null = null;
  private crowd: { walkers: Walker[]; meter: number; t: number; spawn: number; game: boolean; hitAt: number; end: (o: string) => void } | null = null;
  onMoved: (free?: boolean) => void = () => {}; // free: 고를 것 없이 걸으며 듣는 걸음 (대화창을 치우지 않는다)
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
    if (!same) { this.npcs.clear(); this.place(this.player, m.spawn); this.player.pose = 'stand'; this.player.path = []; this.crowd = null; this.train.state = ''; }
    this.lagX = this.player.px; this.lagY = this.player.py;
  }
  hide(): void { this.map = null; this.mapId = ''; this.canvas.style.display = 'none'; this.cancelWalk(); this.crowd = null; }

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
  /** 엔딩 C: 윤재가 없다. 걷는 것은 보이지 않고, 빈자리의 희미한 테두리만 남는다. */
  ghost = false;
  /** 3장 뒤 윤재의 자세 (arm / back / leg). 걸음이 느려지고 몸이 기운다. */
  posture = '';
  setLook(l: Look): void { this.player.look = l; this.player.speed = (l.kind === 'cat' || l.kind === 'cat_nohead' ? 54 : 66) * ({ leg: 0.5, back: 0.65, arm: 0.85 }[this.posture] || 1); }
  emote(name: string, who?: string): void { const a = who ? this.npcs.get(who) : this.player; if (a) { a.emote = name === 'none' ? '' : name; a.emoteUntil = name === 'hold' ? Infinity : this.t + 1.8; } } // 잡은 것(hold)은 놓을 때까지(none) 들고 있다
  shake(ms = 500): void { this.shakeUntil = performance.now() + ms; }

  /** 이름 붙은 자리까지 걸어간다. 길이 없으면 그냥 옮겨 놓는다. */
  go(name: string, who: Actor = this.player): Promise<void> {
    if (!this.map) return Promise.resolve();
    const [x, y, d] = this.point(name);
    let path: [number, number][] | null = null;
    if (!this.fast) {
      // 사람을 피해서 돌아가는 길을 먼저 찾는다. 없으면 사람을 무시한 길 (걸어가다 막히면 그 자리로 옮겨 놓는다)
      const others = (bx: number, by: number): boolean => !(bx === x && by === y) && [this.player, ...this.npcs.values()].some((n) => n !== who && n.x === bx && n.y === by && n.look.kind !== 'catreal');
      for (const blocked of [others, undefined]) {
        const prev = flood(this.map, [who.x, who.y], blocked);
        path = pathTo(prev, x, y);
        if (!path) for (const [dx, dy] of Object.values(DELTA)) { // 막힌 칸(그네)이면 옆 칸까지 걸어가서 올라앉는다
          const q = pathTo(prev, x + dx, y + dy);
          if (q && (!path || q.length + 1 < path.length)) path = [...q, [x, y]];
        }
        if (path) break;
      }
    }
    if (!path || path.length < 2) { who.x = x; who.y = y; who.px = x * TILE; who.py = y * TILE; who.dir = d; return Promise.resolve(); }
    return new Promise((res) => {
      who.path = path.slice(1);
      let done = false;
      const mine = (): void => { if (done) return; done = true; who.dir = d; res(); };
      who.onArrive = mine; who.dest = [x, y];
      // 걸어서 걸릴 시간보다 한참 늦으면(최소 6초) 옮겨 놓는다. 이 걸음이 아직 끝나지 않았을 때만: 이미 도착해 다음 걸음이 시작됐으면 건드리지 않는다.
      const limit = Math.max(6000, (path.length * TILE / Math.max(10, who.speed)) * 1000 * 1.6 + 1500);
      setTimeout(() => { if (!done) { if (who.onArrive === mine) { who.path = []; who.onArrive = null; } who.x = x; who.y = y; who.px = x * TILE; who.py = y * TILE; who.dest = null; mine(); } }, limit);
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

  // ── 맵 위의 게임 ──
  /** 환승 통로: 인파를 거슬러 계단까지 간다. 부딪칠 때마다 밀리고 숨이 찬다. 숨이 다 차면 인파에 떠밀린다. */
  runGame(id: string): Promise<string> {
    if (id === 'patrol') return this.patrolGame();
    if (id === 'sneak') return this.sneakGame();
    if (id !== 'crowd' || !this.map) return Promise.resolve('');
    if (this.fast) return Promise.resolve('made');
    return new Promise((res) => {
      const end = (o: string): void => { const cr = this.crowd; if (!cr || !cr.game) return; cr.game = false; cr.meter = 0; this.cancelWalk(); res(o); };
      if (!this.crowd) this.crowdOn(true);
      Object.assign(this.crowd!, { game: true, meter: 0.15, t: 0, hitAt: -9, end });
      void this.waitChoice([{ at: 'z_down', idx: 0 }]).then(() => end('made'));
    });
  }
  /** 단지의 밤 순찰: 경비가 손전등을 들고 정해진 길을 돈다. 빛을 피해 108동 현관까지 간다. 빛에 오래 닿으면 들킨다. */
  private patrolGame(): Promise<string> {
    const g0 = this.npcs.get('guard');
    if (!this.map || !g0) return Promise.resolve('');
    if (this.fast) return Promise.resolve('made');
    return new Promise((res) => {
      const pts = ['pat_a', 'pat_b', 'pat_c', 'pat_d'];
      const st = { t: 0, meter: 0, game: true, end: (o: string): void => { if (!st.game) return; st.game = false; this.patrol = null; this.cancelWalk(); res(o); } };
      this.patrol = st;
      const loop = async (i: number): Promise<void> => {
        const g = this.npcs.get('guard');
        if (!st.game || !g) return;
        await this.go(pts[i % pts.length], g);
        if (!st.game) return;
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 900)); // 모퉁이에서 서서 훑는다
        void loop(i + 1);
      };
      void loop(0);
      void this.waitChoice([{ at: 'homedoor', idx: 0 }]).then(() => st.end('made'));
    });
  }
  /** 새벽 세 시의 거실: 안방에서 코 고는 소리가 날 때만 걷는다. 소리가 끊긴 동안 움직이면 발소리가 그 빈자리로 들어간다. */
  private sneakGame(): Promise<string> {
    if (!this.map) return Promise.resolve('');
    if (this.fast) return Promise.resolve('passed');
    return new Promise((res) => {
      const p = this.player, speed0 = p.speed;
      p.speed = speed0 * 0.5; // 발끝으로 걷는다
      const st = { t: 0, meter: 0, snore: true, phase: 0.9, lx: p.px, ly: p.py, game: true, end: (o: string): void => { if (!st.game) return; st.game = false; this.sneak = null; p.speed = speed0; this.cancelWalk(); res(o); } };
      this.sneak = st;
      sfx('snore');
      void this.waitChoice([{ at: 'z_entry', idx: 0 }]).then(() => st.end('passed'));
    });
  }
  private sneakTick(dt: number): void {
    const st = this.sneak, p = this.player;
    if (!st || !st.game) return;
    st.t += dt; st.phase -= dt;
    if (st.phase <= 0) {
      st.snore = !st.snore;
      // 코 고는 동안은 길고, 끊기는 동안은 짧다. 끊기는 박자가 매번 다르다.
      st.phase = st.snore ? 1.6 + Math.random() * 1.8 : 1.1 + Math.random() * 1.4;
      if (st.snore) sfx('snore');
    }
    const moved = Math.abs(p.px - st.lx) + Math.abs(p.py - st.ly) > 0.01;
    st.lx = p.px; st.ly = p.py;
    if (!st.snore && moved) {
      st.meter = Math.min(1, st.meter + dt * 1.6);
      if (Math.floor(st.t * 3) !== Math.floor((st.t - dt) * 3)) sfx(st.meter > 0.5 ? 'heartbeat' : 'heartbeat_soft');
    } else st.meter = Math.max(0, st.meter - dt * 0.12);
    if (st.meter >= 1) { sfx('bump'); this.shake(260); st.end('stirred'); }
  }
  private patrolTick(dt: number): void {
    const st = this.patrol, g = this.npcs.get('guard');
    if (!st || !st.game || !g) return;
    st.t += dt;
    const b = this.beam(g, this.t), p = this.player;
    const lit = Math.hypot(p.px + 8 - b.x, p.py + 6 - b.y) < b.r * 0.72 || Math.hypot(p.px - g.px, p.py - g.py) < 18;
    st.meter = Math.max(0, Math.min(1, st.meter + (lit ? dt * 1.15 : -dt * 0.3)));
    if (lit && Math.floor(st.t * 4) !== Math.floor((st.t - dt) * 4)) sfx(st.meter > 0.6 ? 'heartbeat' : 'heartbeat_soft');
    if (st.meter >= 1) { sfx('bump'); this.shake(220); st.end('seen'); }
  }
  /** 인파만 지나가게 한다 (게임 없이). off 면 치운다. */
  crowdOn(on: boolean): void {
    if (!on || !this.map) { this.crowd = null; return; }
    if (this.crowd) return;
    this.crowd = { walkers: [], meter: 0, t: 0, spawn: 0, game: false, hitAt: -9, end: () => {} };
    for (let i = 0; i < 10; i++) this.spawnWalker(true);
  }
  private spawnWalker(anywhere = false): void {
    const cr = this.crowd, m = this.map;
    if (!cr || !m) return;
    const mw = m.grid[0].length * TILE, fromLeft = Math.random() < 0.28;
    const lane = 2 + Math.floor(Math.random() * 3);
    const x = anywhere ? 8 * TILE + Math.random() * (mw - 9 * TILE) : fromLeft ? 7 * TILE : mw + 8;
    cr.walkers.push({ look: { kind: 'person', v: Math.floor(Math.random() * 7) }, x, y: lane * TILE, vx: (fromLeft ? 1 : -1) * (52 + Math.random() * 34), lane, walked: Math.random() * 20, hitAt: -9 });
  }
  private crowdTick(dt: number): void {
    const cr = this.crowd, m = this.map;
    if (!cr || !m) return;
    cr.t += dt; cr.spawn -= dt;
    if (cr.spawn <= 0) { this.spawnWalker(); cr.spawn = cr.game ? 0.4 + Math.random() * 0.35 : 0.22 + Math.random() * 0.3; } // 게임 중에는 틈이 보일 만큼만
    const p = this.player, mw = m.grid[0].length * TILE;
    const pillar = (x: number): boolean => [6, 9, 13, 17, 21].some((k) => Math.abs(x - k * TILE) < 22);
    for (const w of cr.walkers) {
      w.x += w.vx * dt; w.walked += Math.abs(w.vx) * dt;
      const ty = w.lane !== 3 && pillar(w.x) ? 3 * TILE : w.lane * TILE;
      w.y += Math.sign(ty - w.y) * Math.min(Math.abs(ty - w.y), 46 * dt);
      if (Math.abs(w.x - p.px) < 11 && Math.abs(w.y - p.py) < 9 && cr.t - w.hitAt > 0.8 && cr.t - cr.hitAt > 0.7) { // 어깨가 부딪친다 (한 번 밀리면 잠깐은 다시 안 밀린다)
        w.hitAt = cr.t; cr.hitAt = cr.t;
        const dx = Math.sign(w.vx);
        if (!this.solid(p.x + dx, p.y)) { p.x += dx; p.path = []; }
        if (cr.game) { cr.meter += 0.07; sfx('bump'); this.shake(160); }
      }
    }
    cr.walkers = cr.walkers.filter((w) => w.x > 6 * TILE && w.x < mw + 20);
    if (!cr.game) return;
    cr.meter = Math.max(0, cr.meter + dt * (0.006 - (cr.t - cr.hitAt > 1.5 ? 0.025 : 0) - (p.x >= 22 ? 0.03 : 0))); // 안 부딪히고 버티면 숨이 조금 돌아온다
    if (Math.floor(cr.t * (1 + cr.meter * 2)) !== Math.floor((cr.t - dt) * (1 + cr.meter * 2))) sfx(cr.meter > 0.6 ? 'heartbeat' : 'heartbeat_soft');
    if (cr.meter >= 1 || cr.t > 45) cr.end('pushed');
  }
  /** 승강장의 열차: arrive(들어와 선다) open(문이 열린다) close leave(떠난다). 끝나면 돌아온다. */
  trainGo(how: string): Promise<void> {
    const tr = this.train, m = this.map;
    if (!m || this.mapId !== 'platform') return Promise.resolve();
    const mw = m.grid[0].length * TILE;
    if (how === 'open') { tr.state = 'open'; return Promise.resolve(); }
    if (how === 'close') { tr.state = 'stop'; return Promise.resolve(); }
    if (how === 'gone') { tr.state = ''; return Promise.resolve(); }
    if (this.fast) { tr.state = how === 'arrive' ? 'stop' : ''; tr.x = TRAIN_STOP; return Promise.resolve(); }
    return new Promise((res) => {
      if (how === 'arrive') { tr.state = 'arrive'; tr.x = mw + 40; tr.v = -260; }
      else { tr.state = 'leave'; tr.v = 0; }
      tr.done = res;
    });
  }
  private trainTick(dt: number): void {
    const tr = this.train;
    if (tr.state === 'arrive') {
      tr.v = -Math.max(18, Math.min(260, Math.sqrt(Math.max(0, tr.x - TRAIN_STOP) * 2 * 160)));
      tr.x += tr.v * dt;
      if (tr.x <= TRAIN_STOP) { tr.x = TRAIN_STOP; tr.state = 'stop'; const f = tr.done; tr.done = null; f?.(); }
    } else if (tr.state === 'leave') {
      tr.v -= 110 * dt; tr.x += tr.v * dt;
      if (tr.x < -2 * (ART.train?.w || 340) - 20) { tr.state = ''; const f = tr.done; tr.done = null; f?.(); }
    }
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
  /** 밖에서 선택을 끝낸다 (시간 제한) */
  pickAt(at: string): boolean { return this.resolve(at); }
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
    const ats = [...new Set(this.binds.map((b) => b.at))].filter((a) => a !== 'timeout');
    if (!ats.length) return;
    const at = ats[Math.floor(Math.random() * ats.length)];
    if (SPECIAL.has(at)) { this.resolve(at); return; }
    this.walkTo(this.obj(at)!);
  }
  routeFor(at: string): { path: [number, number][]; face: Dir } | null { // 검사용: 키보드로 걸어갈 길
    const o = this.obj(at);
    return this.map && o ? routeTo(this.map, [this.player.x, this.player.y], o, (x, y) => this.solid(x, y)) : null;
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
    p.path = rt.path.slice(1); p.onArrive = done; p.dest = null;
  }

  key(dir: Dir, down: boolean, repeat: boolean): void {
    if (!down) { this.held = this.held.filter((d) => d !== dir); return; }
    if (!this.binds) { this.roamKey(dir, repeat); return; }
    if (!repeat && (this.resolve(dir) || this.resolve('move'))) return; // 일어나려는 시도. 꾹 누르고 있어도 한 번만 센다.
    if (this.player.pose !== 'stand' && this.player.pose !== 'stoop' && this.player.pose !== 'lie') { if (!repeat) this.player.dir = dir; return; } // 앉은 채로는 고개만 돌린다 (걸으며 듣는 동안 돌린 고개를 되돌릴 수 있게)
    if (this.player.pose === 'lie') {
      // 누운 채로는 걷지 않는다. 다만 이번 선택이 물건까지 걸어가야 하는 것뿐이면, 방향키가 몸을 일으킨다.
      if (!this.binds.some((b) => b.at && !SPECIAL.has(b.at))) return;
      this.player.pose = 'stand';
    }
    if (!this.held.includes(dir)) this.held.push(dir);
    this.player.path = []; this.player.onArrive = null;
  }
  private roamKey(dir: Dir, repeat: boolean): void {
    const p = this.player;
    if (!this.roam || !this.map || p.onArrive || p.path.length || p.pose === 'gone') return; // 대본이 시킨 걸음은 끊지 않는다
    if (p.pose === 'stand' || p.pose === 'stoop') { if (!this.held.includes(dir)) this.held.push(dir); return; }
    if (repeat) return;
    if (p.pose === 'lie' && p.dir !== dir) this.tossAt = this.t; // 이불이 들썩인다
    p.dir = dir; // 누운 채 돌아눕거나, 앉은 채 고개를 돌린다
  }
  /** 걸으며 듣는 동안 밟으면 안 되는 칸: 밟는 순간 다음 선택이 저절로 골라지는 자리 (문턱·출구) */
  private touchTile(x: number, y: number): boolean { return !!this.map?.objs.some((o) => o.touch && inObj(o, x, y)); }
  act(): boolean {
    if (!this.binds || !this.map) return false;
    const p = this.player;
    if (p.px !== p.x * TILE || p.py !== p.y * TILE) return false;
    const [dx, dy] = DELTA[p.dir];
    for (const o of this.map.objs) {
      if (o.touch) continue;
      if ((inObj(o, p.x + dx, p.y + dy) || inObj(o, p.x, p.y)) && this.resolve(o.id)) return true;
    }
    if (p.pose !== 'stand' && p.pose !== 'stoop') { // 앉거나 누운 채로는 몸을 돌릴 수 없으니, 손 닿는 네 칸 어디든 된다
      for (const [ex, ey] of Object.values(DELTA)) for (const o of this.map.objs) if (!o.touch && inObj(o, p.x + ex, p.y + ey) && this.resolve(o.id)) return true;
    }
    return this.resolve('wait');
  }
  private click(e: MouseEvent): void {
    if (!this.binds || !this.map) return;
    if (this.player.pose === 'lie') { // 누워 있을 때 화면을 누르면 일어나려는 시도. 물건까지 걸어가야 하는 선택이면 일어나서 간다.
      if (this.resolve('move') || !this.binds.some((b) => b.at && !SPECIAL.has(b.at))) return;
      this.player.pose = 'stand';
    }
    const rc = this.canvas.getBoundingClientRect();
    const [cx, cy] = this.camera();
    const tx = Math.floor(((e.clientX - rc.left) / rc.width * this.W + cx) / TILE);
    const ty = Math.max(0, Math.floor(((e.clientY - rc.top) / rc.height * this.H + cy) / TILE)); // 벽에 그린 문은 맵 위로 솟아 있다: 그 위를 눌러도 벽 칸으로 친다
    const o = this.map.objs.find((q) => inObj(q, tx, ty) && this.binds!.some((b) => b.at === q.id));
    if (o) { this.walkTo(o); return; }
    const p = this.player;
    const path = pathTo(flood(this.map, [p.x, p.y], (x, y) => this.solid(x, y)), tx, ty);
    if (path && path.length > 1) { p.path = path.slice(1); p.onArrive = null; p.dest = null; }
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min(1, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    if (!this.map) return;
    this.crowdTick(dt); this.trainTick(dt); this.patrolTick(dt); this.sneakTick(dt);
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
          if (a === this.player && this.solid(nx, ny)) {
            // 대본이 시킨 걸음(go)이 사람에게 막혔다: 기다리는 대본이 멈추지 않게 도착한 것으로 친다
            if (a.onArrive && a.dest) { const [dx2, dy2] = a.dest; a.path = []; a.x = dx2; a.y = dy2; a.px = dx2 * TILE; a.py = dy2 * TILE; a.dest = null; const f = a.onArrive; a.onArrive = null; f(); break; }
            a.path = []; a.onArrive = null; break;
          }
          a.path.shift(); this.turn(a, nx, ny); a.x = nx; a.y = ny;
          if (a === this.player) this.onMoved();
          continue;
        }
        if (a.onArrive) { const f = a.onArrive; a.onArrive = null; f(); break; }
        if (a === this.player && (this.binds || this.roam) && this.held.length && (a.pose === 'stand' || a.pose === 'stoop')) {
          const dir = this.held[this.held.length - 1];
          a.dir = dir;
          const [dx, dy] = DELTA[dir];
          if (this.solid(a.x + dx, a.y + dy) || (!this.binds && this.touchTile(a.x + dx, a.y + dy))) break;
          a.x += dx; a.y += dy; this.onMoved(!this.binds);
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
      if (g0) out.push(this.beam(g0, t));
      for (const id of ['police', 'police2']) { const a = this.npcs.get(id); if (a) out.push(this.beam(a, t + (id === 'police2' ? 2.1 : 0))); }
      if (this.flags.door === 'front' && this.mapId === 'living') { // 현관문이 열렸다: 복도의 낮빛이 현관 타일을 타고 들어온다
        out.push({ x: 276, y: 56, r: 64, a: 0.95, col: 'rgba(250,244,226,A)', tint: 0.45 });
        out.push({ x: 286, y: 56, r: 12, a: 1, col: 'rgba(255,255,245,A)' });
      }
      if (this.flags.door === '1107' && this.mapId === 'corridor') { // 1107호 문이 열렸다: 집 안의 노란 불빛이 복도로 쏟아진다
        out.push({ x: 112, y: 10, r: 40, a: 0.9, col: 'rgba(240,200,140,A)', tint: 0.4 });
      }
      if (this.flags.siren) { // 담 너머 순찰차: 파랑과 빨강이 번갈아 미끄럼틀까지 묻는다
        const ph = Math.floor(t * 2.6) % 2, k = 0.55 + 0.45 * Math.abs(Math.sin(t * 8.2));
        out.push({ x: 150, y: -8, r: 120, a: 0.75 * k, col: ph ? 'rgba(70,110,255,A)' : 'rgba(255,60,60,A)', tint: 0.6 });
        out.push({ x: 150, y: -14, r: 14, a: 0.95, col: ph ? 'rgba(150,180,255,A)' : 'rgba(255,140,140,A)' });
      }
      return out;
    }
    if (this.mapId === 'room') {
      if ((mood === 'night' || mood === 'open') && !this.flags.lampOff) out.push({ x: 88, y: 52, r: 118, a: 0.9 * flick, col: 'rgba(190,205,200,A)' });
      if (this.flags.monitor && mood !== 'black') out.push({ x: 103, y: 8, r: 50, a: 0.8, col: 'rgba(110,145,210,A)' });
      if (mood === 'doorshadow' || mood === 'dark' || mood === 'black') out.push({ x: 160, y: 56, r: 11, a: 0.32, col: 'rgba(214,190,140,A)' });
      if (mood === 'open' || mood === 'openday') out.push({ x: 166, y: 56, r: 46, a: mood === 'open' ? 0.85 : 0.5, col: 'rgba(214,190,140,A)' });
      else if (this.flags.ajar && mood !== 'black') out.push({ x: 162, y: 58, r: 26, a: mood === 'day' || mood === 'bright' || mood === 'rain' ? 0.25 : 0.5, col: 'rgba(214,190,140,A)' }); // 부서진 문이 한 뼘 열려 있다
      out.push({ x: 32, y: 2, r: 16, a: 0.4 });                                        // 커튼 틈
      if (!this.flags.headGone && mood !== 'black') out.push({ x: 76, y: 2, r: 15, a: 0.55 }); // 삼색이의 머리는 어둠 속에서도 조금 보인다
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
    if (g) out.push(this.beam(g, t));
    return out;
  }
  /** 경비의 손전등: 보는 쪽을 천천히 훑는다. 겨누면(emote point) 나에게 멈춘다. */
  private beam(g: Actor, t: number): { x: number; y: number; r: number; a: number; col: string } {
    if (g.emote === 'point') { const p = this.player; return { x: p.px + 8 + Math.sin(t * 7) * 1.5, y: p.py + 4, r: 22, a: 1, col: 'rgba(250,246,226,A)' }; }
    const [dx, dy] = DELTA[g.dir], sx = dx === 0 ? 1 : 0, sy = dy === 0 ? 1 : 0;
    const sw = Math.sin(t * 1.3) * 22, sw2 = Math.cos(t * 0.9) * 8;
    return { x: g.px + 8 + dx * 34 + sx * sw, y: g.py + 2 + dy * 30 + sy * sw2 * 2, r: 30, a: 0.95, col: 'rgba(240,235,210,A)' };
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
    const k = { t, monitor: this.flags.monitor, day, slit, x: 0, y: 0, open: this.mood === 'open' || this.mood === 'openday', headGone: this.flags.headGone };
    if (this.mapId === 'room') {
      const lie = this.player.pose === 'lie';
      const room = paintRoom({ monitor: this.flags.monitor, headGone: this.flags.headGone, headDone: this.flags.headDone, open: this.mood === 'open' || this.mood === 'openday', slit, day, lie, mark: this.flags.mark, box: this.flags.box, tidy: this.flags.tidy, ajar: this.flags.ajar, headAt: this.flags.headAt, pile: this.flags.pile, closet: this.flags.closet });
      c.drawImage(canvasOf(room), -cx, -cy - ROOM_OY);
      if (this.mood === 'doorshadow' || this.mood === 'dark' || this.mood === 'black') { // 문틈 아래로 거실 불빛이 샌다
        c.fillStyle = '#d6be8c'; c.fillRect(159 - cx, 49 - cy, 1, 14);
        if (this.mood === 'doorshadow') { c.fillStyle = '#16121a'; c.fillRect(159 - cx, 52 - cy, 1, 3); c.fillRect(159 - cx, 58 - cy, 1, 3); } // 두 군데 끊긴다. 발 두 개다.
      }
    } else if (m.painted) {
      const pl = paintPlace(this.mapId, { day, mood: this.mood, door: this.flags.door });
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
    // 그네: 앉은 사람과 함께 앞뒤로 흔들린다. 위에서 내려다보는 화면이라 앞으로 나오면 아래로, 높이 오르면 위로 간다.
    const ride = new Map<Actor, number>();
    if (this.mapId === 'playground') for (const s of SWING_SEATS) {
      const rider = [this.player, ...this.npcs.values()].find((a) => a.x === s.x && a.y === s.y && (a.pose === 'sit' || a.pose === 'curl') && a.px === a.x * TILE && a.py === a.y * TILE);
      const how = this.swings[s.id] || (rider ? 'gentle' : '');
      const amp = how === 'high' ? 0.5 : how === 'gentle' ? 0.16 : how === 'still' ? 0 : 0.02; // 빈 그네는 바람에 조금
      const th = amp * Math.sin(t * 2.2 + s.ph);
      const fwd = SWING_L * Math.sin(th), rise = SWING_L * (1 - Math.cos(th));
      const dy = Math.round(fwd * 0.42 - rise * 0.85);
      if (rider) ride.set(rider, dy);
      const sx = s.x * TILE + 8, sy = SWING_TOP + SWING_L + dy;
      drawn.push({ foot: s.y * TILE + 12.5, draw: () => { // 앉는 판 (사람 밑)
        c.fillStyle = '#2a2c30'; c.fillRect(sx - 8 - cx, sy - cy, 16, 3); c.fillStyle = '#4a4c54'; c.fillRect(sx - 8 - cx, sy - cy, 16, 1);
      } });
      drawn.push({ foot: s.y * TILE + 13.5, draw: () => { // 쇠사슬: 손으로 잡은 자리라 사람 앞을 지난다
        for (const ox of [-6, 5]) for (let k = 0; k <= SWING_L + dy; k++) {
          const y = SWING_TOP + k; c.fillStyle = k % 2 ? '#5a5e64' : '#8a8e94'; c.fillRect(sx + ox - cx, y - cy, 1, 1);
        }
      } });
    }
    if (this.crowd) for (const w of this.crowd.walkers) drawn.push({ foot: w.y + 13, draw: () => {
      drawChar(c, w.look, Math.round(w.x - cx), Math.round(w.y - cy - 6), w.vx < 0 ? 'left' : 'right', Math.floor(w.walked / 6) % 4, 'stand', '', t, false);
    } });
    if (this.mapId === 'platform' && this.train.state && ART.train) { // 열차는 선로 위, 사람 앞을 지난다
      const img = this.train.state === 'open' && ART.trainOpen ? ART.trainOpen : ART.train;
      const ty = 7 * TILE - img.h - 2;
      drawn.push({ foot: 7 * TILE, draw: () => { for (let k = -1; k < 2; k++) c.drawImage(canvasOf(img), Math.round(this.train.x + k * img.w - cx), ty - cy); } });
    }
    const er = this.mapId === 'er' || this.ghost; // 응급실 천장: 나는 보이지 않고, 눈길만 있다. 엔딩 C 도 그렇다
    for (const a of [this.player, ...this.npcs.values()]) if (a.pose !== 'gone' && !(er && a === this.player) && !(this.mood === 'inside' && a === this.player)) drawn.push({ foot: a.py + 13, draw: () => {
      if (this.mapId === 'er' && a.id.startsWith('feet')) { const f = ART.feet?.[a.id.includes('white') ? 'sneakers' : a.id.includes('slip') ? 'slippers' : 'shoes']; if (f) c.drawImage(canvasOf(f), Math.round(a.px + 2 - cx), Math.round(116 - cy)); return; }
      const moving = a.px !== a.x * TILE || a.py !== a.y * TILE;
      const step = moving ? Math.floor(a.walked / 6) % 4 : 0;
      const toss = a === this.player && a.pose === 'lie' && t - this.tossAt < 0.4 ? -Math.round(Math.sin((t - this.tossAt) / 0.4 * Math.PI) * 2) : 0; // 뒤척이면 이불째 들썩인다
      const ax = Math.round(a.px - cx), ay = Math.round(a.py - cy - 6 + (ride.get(a) || 0) + toss);
      const pst = a === this.player && a.pose === 'stand' ? this.posture : '';
      if (pst) { // 3장 뒤의 몸: 허리는 굽고, 다리는 절고, 팔은 몸통에 붙인다
        c.save();
        const lean = a.dir === 'left' ? 1 : a.dir === 'right' ? -1 : 0;
        if (pst === 'back') { c.translate(ax + 8, ay + 19); c.transform(1, 0, -0.16 * (lean || 0.5), 1, 0, 0); c.translate(-(ax + 8), -(ay + 19) + 2); }
        else if (pst === 'leg') { if (step === 1 || step === 3) c.translate(lean, 2); }
        else if (pst === 'arm') { c.translate(ax + 8, ay + 19); c.transform(1, 0, 0.06, 1, 0, 0); c.translate(-(ax + 8), -(ay + 19)); }
        drawChar(c, a.look, ax, ay, a.dir, pst === 'leg' && moving ? (step === 3 ? 1 : step) : step, a.pose, a.emote, t, !moving);
        c.restore();
      } else drawChar(c, a.look.kind === 'haeun' && this.haeunEyes ? HAEUN_EYES : a.look, ax, ay, a.dir, step, a.pose, a.emote, t, !moving);
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
    // 비: 바깥 맵에서. 굵은 줄기와 바닥에 튀는 물방울.
    if (this.rain && m.outdoor) {
      c.fillStyle = 'rgba(170,186,206,0.42)';
      for (let i = 0; i < 160; i++) {
        const x = (i * 97.3 + t * 30) % (W + 20) - 10, y = (i * 61.7 + t * 260 * (0.8 + (i % 5) * 0.08)) % (H + 20) - 10;
        c.fillRect(Math.round(x), Math.round(y), 1, 5 + (i % 3));
      }
      c.fillStyle = 'rgba(200,214,230,0.5)';
      for (let i = 0; i < 26; i++) { const k = Math.floor(t * 9 + i * 7.1); const x = (k * 131.7 + i * 53) % W, y = (k * 71.3 + i * 37) % H; c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); }
    }
    // 엔딩 C: 아무도 없는 자리. 사람 키만 한 희미한 윤곽이 숨 쉬듯 옅어졌다 짙어진다.
    if (this.ghost && this.player.pose !== 'gone') {
      const gx = this.player.px + 8 - cx, gy = this.player.py + 4 - cy, br = 0.08 + 0.05 * Math.sin(t * 1.3);
      c.fillStyle = `rgba(220,226,236,${br})`;
      for (let a = 0; a < 28; a++) { if (a % 2) continue; const th = (a / 28) * Math.PI * 2; c.fillRect(Math.round(gx + Math.cos(th) * 6), Math.round(gy + Math.sin(th) * 11), 1, 1); }
    }
    // 탈 안 (inside): 폼과 털 너머로는 아무것도 안 보인다. 눈구멍 두 개만큼만 방이 보인다. 숨 따라 조금씩 흔들린다.
    if (this.mood === 'inside') {
      const [fx, fy] = DELTA[this.player.dir]; // 보는 쪽으로 한 칸 앞이 눈구멍 너머다
      const bx = this.player.px + 8 - cx + fx * 22 + Math.sin(t * 0.9) * 1.5, by = this.player.py - 6 - cy + fy * 22 + Math.sin(t * 2.1) * 1;
      const m = this.mask || (this.mask = document.createElement('canvas')); if (m.width !== W || m.height !== H) { m.width = W; m.height = H; } const q = m.getContext('2d')!;
      q.globalCompositeOperation = 'source-over'; q.fillStyle = '#050407'; q.fillRect(0, 0, W, H);
      q.globalCompositeOperation = 'destination-out';
      for (const dx of [-17, 17]) {
        const g = q.createRadialGradient(bx + dx, by, 3, bx + dx, by, 15);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        q.fillStyle = g; q.beginPath(); q.ellipse(bx + dx, by, 15, 11, 0, 0, Math.PI * 2); q.fill();
      }
      c.drawImage(m, 0, 0);
      c.fillStyle = 'rgba(232,140,60,0.10)'; c.fillRect(0, 0, W, H); // 털 사이로 드는 주황빛
    }
    // 눈길: 응급실 천장을 훑는 시선
    if (this.mapId === 'er') {
      const ex = this.player.px + 8 - cx, ey = this.player.py + 8 - cy;
      c.fillStyle = 'rgba(40,60,60,0.35)';
      for (let a = 0; a < 24; a++) { const th = (a / 24) * Math.PI * 2; if (a % 2) continue; c.fillRect(Math.round(ex + Math.cos(th) * 9), Math.round(ey + Math.sin(th) * 9), 1, 1); }
      c.fillRect(Math.round(ex), Math.round(ey), 1, 1);
    }
    // 들킴: 손전등 빛에 닿아 있는 만큼 찬다
    if (this.patrol?.game) {
      const k = this.patrol.meter, pulse = Math.sin(t * (6 + k * 10)) > 0 ? 1 : 0;
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(W / 2 - 31, 22, 62, 6);
      c.fillStyle = k > 0.6 ? `rgba(240,226,170,${0.8 + pulse * 0.2})` : 'rgba(200,196,180,0.8)'; c.fillRect(W / 2 - 30, 23, Math.round(60 * k), 4);
      if (k > 0.3) { c.fillStyle = `rgba(250,246,226,${(k - 0.3) * 0.35})`; c.fillRect(0, 0, W, H); }
    }
    // 코 고는 소리: 안방 문틈 위로 숨이 오르내린다. 끊기면 문틈만 남는다. 아래 띠는 끊긴 동안 낸 발소리.
    if (this.sneak?.game) {
      const st = this.sneak, ax = 224 - cx, ay = 6 - cy;
      if (st.snore) for (let i = 0; i < 3; i++) { // 문틈 위로 z 가 오른다 (3×3 글자)
        const u = (t * 0.6 + i / 3) % 1, zx = Math.round(ax + 6 + u * 10 + Math.sin(u * 6 + i) * 2), zy = Math.round(ay + 8 - u * 22);
        c.fillStyle = `rgba(226,214,180,${0.75 * (1 - u)})`; c.fillRect(zx, zy, 3, 1); c.fillRect(zx + 1, zy + 1, 1, 1); c.fillRect(zx, zy + 2, 3, 1);
      }
      else { c.fillStyle = `rgba(240,226,200,${0.5 + Math.sin(t * 14) * 0.2})`; c.fillRect(Math.round(ax) - 4, Math.round(ay) + 6, 9, 1); }
      const k = st.meter;
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(8, 8, 62, 6);
      c.fillStyle = k > 0.5 ? 'rgba(230,140,110,0.95)' : 'rgba(200,196,180,0.8)'; c.fillRect(9, 9, Math.round(60 * k), 4);
      if (!st.snore) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, W, H); }
    }
    // 숨: 인파 속에서 차오른다
    if (this.crowd?.game) {
      const k = this.crowd.meter, pulse = Math.sin(t * (6 + k * 10)) > 0 ? 1 : 0;
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(8, 8, 62, 6);
      c.fillStyle = k > 0.7 ? `rgba(230,110,100,${0.8 + pulse * 0.2})` : 'rgba(220,200,180,0.85)'; c.fillRect(9, 9, Math.round(60 * Math.min(1, k)), 4);
      if (k > 0.5) { const g = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * (0.9 - k * 0.35)); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${(k - 0.5) * 1.6})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    }
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
