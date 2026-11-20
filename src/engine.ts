// 대본(ink)을 한 줄씩 꺼내서 태그대로 연출한다.
// 선택지에 "# at: 물건" 이 전부 붙어 있으면 메뉴 대신 맵을 걸어 다니게 한다.
import { Story } from 'inkjs';
import storyText from './story.json?raw';
import { ambient, blip, setMuffle, setSilent, sfx } from './audio.ts';
import { SceneView } from './scene.ts';
import { CUTS, SCENES, WARNS } from './tables.ts';
import { applyTag, newPres, parseTags, type Pres, type Tag } from './pres.ts';
import { World, type Bind } from './world.ts';
import type { Dir } from './maps.ts';
import type { Look } from './sprites.ts';
import * as ui from './ui.ts';
import { playGame, GAME_IDS } from './games.ts';

const SAVE_KEY = 'tal.save.v2';
const LOCK = '(잠김)';
const SHAKY = new Set(['door_kick', 'door_break', 'hit', 'crash']);

export type Start = { mode: 'load' } | { mode: 'chapter'; title: string };

export function savedChapter(): string | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw).pres?.chapter as string) || null : null;
  } catch { return null; }
}
const atOf = (tags: string[] | null | undefined): string => {
  for (const t of tags || []) { const m = /^at:\s*(\S+)/.exec(t.trim()); if (m) return m[1]; }
  return '';
};
/** 선택지의 "# game: 이름 결과" */
const gameOf = (tags: string[] | null | undefined): [string, string] | null => {
  for (const t of tags || []) { const m = /^game:\s*(\S+)(?:\s+(\S+))?/.exec(t.trim()); if (m) return [m[1], m[2] || '']; }
  return null;
};
/** 맵 위에서 하는 게임의 조작 안내 */
const WORLD_GAME_HINT: Record<string, string> = { crowd: '→ 계단까지 간다 · ↑↓ 로 사람 사이를 피한다 · 기둥 뒤에서 숨을 고른다' };

/** 선택지의 "# timer: 초" (at: timeout 과 함께 쓴다) */
const timerOf = (tags: string[] | null | undefined): number => {
  for (const t of tags || []) { const m = /^timer:\s*([\d.]+)/.exec(t.trim()); if (m) return Number(m[1]); }
  return 0;
};

export class Game {
  story = new Story(storyText);
  pres: Pres = newPres();
  private heard: { kind: string; text: string }[] = []; // 화면에 나온 최근 줄 (댓글 판이 그 말을 던진다). 저장하지 않는다.
  view: SceneView;
  world: World;
  private pending = false; // 앞줄을 읽을 시간을 줘야 하는가
  private walks = 0;
  private skipping = ''; // 넘기고 있는 장면 경고의 이름

  constructor(bg: HTMLCanvasElement, worldCanvas: HTMLCanvasElement) {
    this.view = new SceneView(bg, {
      spec: SCENES.black, suit: false, gaze: 0, eyes: false, cat: false, monitor: false, droopy: false,
    });
    this.world = new World(worldCanvas);
    this.world.onMoved = () => { ui.fadeWin(); };
  }

  private num(name: string): number {
    const v = this.story.variablesState[name] as unknown;
    return typeof v === 'number' ? v : 0;
  }

  /** 남아 있는 상태를 화면·맵·소리에 옮긴다. */
  sync(): void {
    const p = this.pres, w = this.world;
    const vars = { energy: this.num('energy'), heat: this.num('heat'), gaze: this.num('gaze') };
    const spec = SCENES[p.scene] || SCENES.black;
    const droopy = (this.story.variablesState['eye_shape'] as unknown) === 'droopy';
    ui.render(p, vars, w.active);
    Object.assign(this.view.state, { spec, suit: p.suit, gaze: p.gaze ? vars.gaze : 0, eyes: p.eyes, cat: p.cat, monitor: p.monitor, droopy });
    w.flags.monitor = p.monitor; w.flags.eyes = p.eyes; w.flags.lampOff = p.lampOff; w.flags.headGone = (p.suit || p.suitFull || p.carry === 'head' || p.carry === 'bag' || p.headAt === 'held') && !(p.dressing && !p.suit && p.carry !== 'head'); w.flags.headAt = p.headAt === 'bed' || p.headAt === 'floor' ? p.headAt : ''; w.flags.ajar = !!p.ajar; w.flags.pile = p.pile || ''; w.flags.closet = p.closet || ''; w.flags.siren = !!p.siren; w.flags.door = p.door || ''; w.flags.headDone = p.headDone; w.flags.mark = p.mark || ''; w.flags.box = p.box || ''; w.flags.tidy = !!p.tidy; w.ghost = p.pov === 'world'; w.haeunEyes = p.pov === 'yunjae' && !/^(프롤로그|1장)/.test(p.chapter); // 윤재가 본 사람이라서. 윤재가 없는 엔딩 C 에는 없다
    const look: Look = { kind: p.pov === 'yunseo' ? 'yunseo' : p.suitFull ? (p.suit ? 'cat' : 'cat_nohead') : p.suit ? 'yunjae_cathead' : 'yunjae', droopy, bare: p.bare, bag: p.carry === 'bag' && !p.suit && !p.suitFull, hold: p.suitFull && !p.suit ? !p.dressing : p.carry === 'head' && !p.suit, parts: p.suitFull && !p.suit && p.dressing ? p.dressing : undefined, mark: p.mark || '' };
    w.posture = spec.past ? '' : p.posture || '';
    w.setLook(look);
    w.setPose(p.pose);
    w.swings = p.swings || {};
    w.rain = !!spec.rain;
    w.fast = ui.isFast();
    ambient(spec.amb);
    setMuffle(p.suit);
  }

  /** 맵을 지금 상태(pres)대로 통째로 다시 놓는다. 불러오기와 장 건너뛰기에서 쓴다. */
  private restoreWorld(): void {
    const p = this.pres, w = this.world;
    const spec = SCENES[p.scene] || SCENES.black;
    if (!spec.map) { w.hide(); return; }
    w.show(spec.map, spec.lit || 'night', false);
    if (p.pos) w.setPos(p.pos);
    if (p.px !== undefined && p.py !== undefined) w.setTile(p.px, p.py, (p.pdir as Dir) || 'down');
    if (p.face) w.setFace(p.face as Dir);
    for (const [id, where] of Object.entries(p.npcs)) void w.npc(id, where, false);
  }

  private save(): void {
    const w = this.world, p = this.pres;
    if (w.active) { p.px = w.player.x; p.py = w.player.y; p.pdir = w.player.dir; }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ink: this.story.state.ToJson(), pres: p }));
    } catch { /* 저장이 막힌 브라우저에서도 게임은 돌아가야 한다 */ }
  }

  /** 태그 하나: 상태를 바꾸고, 한 번 지나가는 연출을 한다. */
  private async direct(d: Tag, ahead: Tag[] = []): Promise<void> {
    const p = this.pres, w = this.world;
    const quiet = !!this.skipping; // 장면 경고에서 '넘기기'를 골랐다: 상태만 옮기고 연출은 건너뛴다
    const prevScene = p.scene, prevPov = p.pov, prevSkin = p.skin;
    const prevMap = SCENES[prevScene]?.map || '';
    applyTag(p, d);
    switch (d.name) {
      case 'chapter':
        ui.clearFlow(); ui.hint('');
        this.sync();
        await ui.card(d.val.replace(' — ', '  ·  '));
        break;
      case 'scene':
        if (prevScene !== p.scene) {
          const spec = SCENES[p.scene] || SCENES.black;
          ui.clearFlow();
          if (spec.map) {
            w.show(spec.map, spec.lit || 'night', spec.map === prevMap);
            // 같은 묶음에 자리·자세가 있으면 첫 그림부터 그 모습으로 놓는다 (기본 자리에 서 있다가 눕는 일이 없게)
            for (const t of ahead) {
              if (t.name === 'scene') break;
              if (t.name === 'pos') { applyTag(p, t); w.setPos(t.val); }
              else if (t.name === 'pose' || t.name === 'face') { applyTag(p, t); if (t.name === 'face') w.setFace(t.val as Dir); }
            }
            w.snap();
          } else { w.hide(); this.view.cut(); }
          this.sync();
          if (!ui.isFast() && spec.map !== prevMap) await ui.sleep(350);
        }
        break;
      case 'train': await w.trainGo(d.val); break;
      case 'crowd': w.crowdOn(d.val === 'on'); break;
      case 'pos': w.setPos(d.val); break;
      case 'go': if (quiet) w.setPos(d.val); else await w.go(d.val); break;
      case 'face': w.setFace(d.val as Dir); break;
      case 'npc': {
        const [id, where, how] = d.val.split(/\s+/);
        if (id && where) await w.npc(id, where, how === 'walk' && !quiet);
        break;
      }
      case 'sfx': if (quiet) break; sfx(d.val); if (SHAKY.has(d.val)) { w.shake(450); ui.fx('shake', 450); } break;
      case 'voice_stop': ui.clearGhosts(); break;
      case 'pov':
        if (prevPov !== p.pov) { ui.clearFlow(); ui.clearGhosts(); }
        break;
      case 'emote': { if (quiet) break; const [e, who] = d.val.split(/\s+/); w.emote(e, who); break; }
      case 'turn': { const [who, dir] = d.val.split(/\s+/); const a = w.npcs.get(who); if (a) a.dir = dir as Dir; break; } // 사람이 고개를 돌린다 (자리에 선 채)
      case 'help': await ui.help(d.val === 'long'); break;
      case 'warn': {
        if (d.val === 'end') {
          if (!this.skipping) break;
          const sum = WARNS[this.skipping]?.skip || [];
          this.skipping = '';
          ui.clearFlow();
          for (const t of sum) { if (this.pending) { await ui.waitAdvance(); this.pending = false; } await this.say('narr', t); }
          break;
        }
        const wv = WARNS[d.val];
        if (!wv || quiet) break;
        if ((await ui.warn(wv.line, !!wv.skip)) === 'skip' && wv.skip) { this.skipping = d.val; ui.clearFlow(); }
        break;
      }
      case 'pause': if (quiet) break; await ui.sleep(ui.isFast() ? 12 : Number(d.val) * 1000); break;
      case 'chapter_end': this.save(); break;
      case 'ui':
        if (p.skin !== prevSkin && p.skin !== 'none') ui.clearFlow(); // 다른 앱을 열면 앞 앱의 글은 남지 않는다
        if (d.val === 'panic') { ui.fx('shake', 600); ui.fx('panic', 6000); w.shake(700); }
        break;
      case 'cut': {
        const c = CUTS[d.val];
        if (!c || (quiet && c.k !== 'fx')) break;
        if (quiet && (c.art === 'shake')) break;
        if (c.k === 'title') await ui.card('탈', '고양이 탈을 쓰지 않으면 방 밖에 나갈 수 없는 나는', true);
        else if (c.k === 'frame') ui.frame(c.art || 'paper', c.label);
        else if (c.k === 'fx') {
          if (c.art === 'shake') { ui.fx('shake', 600); w.shake(600); }
          else if (c.art === 'eyes') { p.eyes = true; if (w.active) { void w.npc('father', 'doorway', false); const f = w.npcs.get('father'); if (f) { f.look = { kind: 'father', eyes: true }; f.dir = 'left'; } } }
          else if (c.art === 'cat') p.cat = true;
          else if (c.art === 'face') p.bare = true;
        }
        break;
      }
    }
    this.sync();
  }

  private async say(kind: string, text: string): Promise<void> {
    const p = this.pres;
    this.sync(); // 이 줄에서 기력·더위·시선이 바뀌었을 수 있다
    if (kind === 'voice') ui.ghost(text);
    ui.hint('');
    await ui.line(kind, text, { me: p.pov === 'yunseo' ? '윤서' : p.pov === 'yunjae' ? '나' : '' });
    p.tail.push({ kind, text });
    if (p.tail.length > 3) p.tail.shift();
    this.heard.push({ kind, text }); if (this.heard.length > 24) this.heard.shift();
    if (p.cine > 0 && --p.cine === 0) this.sync();
    this.pending = true;
  }

  private async show(text: string, tags: string[] | null): Promise<void> {
    const { kind, dirs } = parseTags(tags);
    if (!text && !dirs.length) return;
    if (this.pending && !this.skipping) { await ui.waitAdvance(); this.pending = false; }
    for (let k = 0; k < dirs.length; k++) await this.direct(dirs[k], dirs.slice(k + 1));
    if (text && !this.skipping) await this.say(kind, text);
  }

  /** 선택지를 고르게 한다. 전부 맵의 물건에 묶여 있으면 걸어 다니게 하고, 아니면 선택창을 띄운다. */
  private async pick(): Promise<number> {
    const ch = this.story.currentChoices;
    const texts = ch.map((c) => c.text);
    const w = this.world;
    // 미니게임: 결과에 맞는 선택지를 고른다. 장면 경고로 넘기는 중이면 첫 선택지(정해진 결과).
    const games = ch.map((c) => gameOf(c.tags));
    const gi = games.findIndex((g) => g);
    if (gi >= 0) {
      const id = games[gi]![0];
      const ghosts = this.pres.tail.filter((t) => t.kind === 'voice').map((t) => t.text);
      if (!GAME_IDS.includes(id)) ui.hint(WORLD_GAME_HINT[id] || '');
      const said = /"(.+)"/.exec(texts[gi]); // 선택지 글에 따옴표로 적은 말 (타자 게임이 그 말을 친다)
      const lines = this.heard.filter((t) => t.kind === 'comment' || t.kind === 'msg' || t.kind === 'caption').map((t) => t.text).slice(-14); // 댓글 판: 방금 읽은 말이 날아온다
      const out = GAME_IDS.includes(id) ? await playGame(id, { ghosts: ghosts.length ? ghosts : undefined, text: said ? said[1] : undefined, droopy: (this.story.variablesState['eye_shape'] as unknown) === 'droopy', lines, skin: this.pres.skin, pov: this.pres.pov }) : await w.runGame(id);
      ui.hint('');
      const k = games.findIndex((g) => g && g[1] === out);
      return k >= 0 ? k : gi;
    }
    const binds: Bind[] = ch.map((c, i) => ({ at: atOf(c.tags), idx: i }));
    const walkable = w.active && this.pres.skin === 'none' && binds.every((b) => b.at && w.hasTarget(b.at));
    if (!walkable) return ui.choose(texts);

    // 조작 안내: 처음 몇 번, 그리고 방향키·Z 에 직접 묶인 선택지가 있을 때
    const sp = binds.filter((b) => b.at === 'move' || b.at === 'wait');
    if (sp.length) ui.hint(sp.map((b) => `${b.at === 'move' ? ui.DIR_KEY : 'Z'}  ${texts[b.idx].replace(LOCK, '').trim()}`).join('   ·   '));
    else if (binds.every((b) => w.isTouch(b.at)) && new Set(binds.map((b) => b.at)).size === binds.length) ui.hint(texts.join('   ·   ')); // 갈 곳
    else if (ui.boxEmpty()) ui.hint(texts.map((t) => t.replace(LOCK, '').trim()).join('   ·   ')); // 글 상자가 비었으면 할 일을 위에 적어 둔다
    else if (this.walks++ < 3) ui.hint(`${ui.DIR_KEY}로 걷는다   ·   Z 로 조사한다`);
    // 시간 제한: 'timeout' 에 묶인 선택지는 시간이 다 되면 저절로 골라진다
    const ti = binds.findIndex((b) => b.at === 'timeout');
    const secs = ti >= 0 ? timerOf(ch[ti].tags) || 6 : 0;
    const stopTimer = secs && !ui.isFast() ? ui.timer(secs, () => w.pickAt('timeout')) : () => {};
    for (;;) {
      const idx = await w.waitChoice(binds);
      stopTimer();
      ui.hint('');
      if (idx.length === 1) { if (texts[idx[0]].startsWith(LOCK)) blip('lock'); return idx[0]; }
      const touch = w.isTouch(binds[idx[0]].at);
      const sub = await ui.choose(idx.map((i) => texts[i]), { cancel: !touch });
      if (sub >= 0) return idx[sub];
    }
  }

  /** 소리와 연출 없이 그 장의 첫 줄까지 감는다. 앞 장의 선택은 무작위로 채운다. */
  private skipTo(title: string): { text: string; tags: string[] | null } | null {
    setSilent(true);
    try {
      for (let guard = 0; guard < 5000; guard++) {
        while (this.story.canContinue) {
          const text = (this.story.Continue() || '').trim();
          const tags = this.story.currentTags;
          const { dirs } = parseTags(tags);
          if (dirs.some((d) => d.name === 'chapter' && d.val === title)) return { text, tags };
          dirs.forEach((d) => applyTag(this.pres, d));
        }
        const ch = this.story.currentChoices;
        if (!ch.length) return null;
        const open = ch.filter((c) => !c.text.startsWith(LOCK));
        const from = open.length ? open : ch;
        this.story.ChooseChoiceIndex(from[Math.floor(Math.random() * from.length)].index);
      }
      return null;
    } finally { setSilent(false); }
  }

  async run(start: Start): Promise<void> {
    if (start.mode === 'load') {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this.story.state.LoadJson(s.ink);
        this.pres = { ...newPres(), ...s.pres };
        this.restoreWorld();
        this.sync();
        for (const t of this.pres.tail) await ui.line(t.kind, t.text, { instant: true });
      }
    } else {
      // 엔딩은 앞 장의 무작위 선택으로 갈린다. 원하는 엔딩이 나올 때까지 처음부터 다시 감는다.
      let first = this.skipTo(start.title);
      for (let k = 0; !first && k < 400; k++) { this.story.ResetState(); this.pres = newPres(); first = this.skipTo(start.title); }
      this.pres.tail = [];
      this.restoreWorld();
      if (first) await this.show(first.text, first.tags);
    }
    for (;;) {
      while (this.story.canContinue) {
        const text = (this.story.Continue() || '').trim();
        await this.show(text, this.story.currentTags);
      }
      const ch = this.story.currentChoices;
      if (!ch.length) break;
      this.sync();
      // 장면 경고에서 넘기는 중이면 묻지 않고 첫 선택지를 고른다 (맞는 방법을 고르라고 하지 않는다). 저장도 하지 않는다.
      const auto = this.skipping ? Math.max(0, ch.findIndex((c) => !c.text.startsWith(LOCK))) : -1;
      if (auto < 0) this.save();
      const i = auto >= 0 ? auto : await this.pick();
      this.story.ChooseChoiceIndex(ch[i].index);
      this.pending = false;
    }
    if (this.pending) await ui.waitAdvance();
    const ending = String(this.story.variablesState['ending'] ?? '');
    ui.endCard('탈', [
      '고양이 탈을 쓰지 않으면 방 밖에 나갈 수 없는 나는',
      ending ? '' : '여기까지입니다.',
    ].filter(Boolean)); // 크레딧과 도움 창구는 endCard 가 붙인다
  }
}
