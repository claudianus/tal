// 화면에 '남아 있는' 상태. 태그가 이 상태를 바꾸고, 화면은 이 상태를 그대로 그린다.
// DOM 을 건드리지 않는 순수 로직이라 저장·불러오기·빨리 감기·검사 도구가 같이 쓴다.
import { LINE_KINDS, SCENES } from './tables.ts';

export type Skin = 'none' | 'messenger' | 'kakao' | 'browser' | 'call';

export type Pres = {
  chapter: string;
  scene: string;
  skin: Skin;
  server: string;
  channels: boolean;
  suit: boolean;       // 머리를 쓰고 있다
  suitFull: boolean;   // 몸까지 입었다
  lampOff: boolean;    // 형광등을 껐다
  headDone: boolean;   // 삼색이의 머리에 눈을 붙였다
  pov: 'yunjae' | 'yunseo' | 'world';
  quiet: boolean;      // '목소리'가 멈췄다
  time: string;
  views: number;       // 0 이면 안 보인다
  energy: boolean; heat: boolean; gaze: boolean; emote: boolean;
  monitor: boolean;
  eyes: boolean; cat: boolean;
  bare: boolean;       // 엔딩 A: 맨얼굴의 윤재에게 얼굴이 생겼다
  cine: number;        // 검은 띠가 남아 있을 줄 수
  posture: string;
  tail: { kind: string; text: string }[]; // 마지막 몇 줄 (불러왔을 때 다시 보여 준다)
  // 맵 위의 자리
  pos: string;                  // 마지막으로 놓인 자리 이름 ('' 이면 그 맵의 기본 자리)
  pose: string; face: string;
  carry?: string;               // 등에 멘 것 ('bag' = 삼색이가 든 의류대)
  mark?: '' | 'torn' | 'sewn';  // 삼색이 머리: 3장에서 귀가 뜯기고, 4장에서 꿰맨다
  box?: '' | 'shut' | 'open';   // 엄마가 문 앞에 둔 실밥의 상자
  tidy?: boolean;               // 위기의 밤에 쓰레기를 치웠다
  ajar?: boolean;               // 3장 뒤: 부서진 방문이 한 뼘 열려 있다
  headAt?: '' | 'bed' | 'floor' | 'held'; // 삼색이 머리가 받침대 밖에 있다 (held: 아버지 손에)
  pile?: '' | 'torn' | 'folded'; // 삼색이 몸: 바닥에 찢긴 채 / 개어 둔 채
  closet?: '' | 'left' | 'mirror'; // 옷장 문 (장이 바뀌면 닫힌다)
  npcs: Record<string, string>; // 누가 어느 자리에 있는가
  swings?: Record<string, string>; // 그네 자리 → still / gentle / high
  px?: number; py?: number; pdir?: string; // 저장할 때의 실제 칸
};

export function newPres(): Pres {
  return {
    chapter: '', scene: 'black', skin: 'none', server: '', channels: false,
    suit: false, suitFull: false, lampOff: false, headDone: false, pov: 'yunjae', quiet: false, time: '', views: 0,
    energy: false, heat: false, gaze: false, emote: false, monitor: false,
    eyes: false, cat: false, bare: false, cine: 0, posture: '', tail: [],
    pos: '', pose: 'stand', face: '', npcs: {},
  };
}

export type Tag = { name: string; val: string };

export function parseTags(tags: string[] | null): { kind: string; dirs: Tag[] } {
  let kind = 'narr';
  const dirs: Tag[] = [];
  for (const raw of tags || []) {
    const t = raw.trim();
    const c = t.indexOf(':'); // 첫 번째 쌍점에서만 자른다 ("ui: server: 털날림 주의보")
    const name = (c < 0 ? t : t.slice(0, c)).trim();
    const val = c < 0 ? '' : t.slice(c + 1).trim();
    if (LINE_KINDS.includes(name)) kind = name;
    else dirs.push({ name, val });
  }
  return { kind, dirs };
}

/** 태그 하나를 상태에 반영한다. 소리·카드 같은 '한 번 지나가는' 연출은 여기서 다루지 않는다. */
export function applyTag(p: Pres, { name, val }: Tag): void {
  switch (name) {
    case 'chapter': p.chapter = val; p.tail = []; p.closet = ''; p.bare = false; p.lampOff = false; p.carry = ''; if (!val.startsWith('프롤로그')) p.headDone = true; break;
    case 'sfx': if (val === 'switch_off') p.lampOff = true; else if (val === 'switch_on') p.lampOff = false; break;
    case 'scene':
      if ((SCENES[p.scene]?.map || '') !== (SCENES[val]?.map || '')) { p.pos = ''; p.pose = 'stand'; p.face = ''; p.npcs = {}; p.swings = {}; }
      p.px = undefined; p.py = undefined;
      p.scene = val; p.eyes = false; p.cat = false; p.cine = 0;
      if (p.skin === 'browser' || p.skin === 'call') p.skin = 'none';
      break;
    case 'room':
      if (val === 'torn' || val === 'sewn') p.mark = val;
      else if (val === 'box') p.box = p.box || 'shut';
      else if (val === 'box_open') p.box = 'open';
      else if (val === 'tidy') p.tidy = true;
      else if (val === 'ajar') p.ajar = true;
      else if (val === 'head_bed' || val === 'head_floor' || val === 'head_held') p.headAt = val.slice(5) as 'bed' | 'floor' | 'held';
      else if (val === 'head_desk') p.headAt = '';
      else if (val === 'suit_torn' || val === 'suit_folded') p.pile = val.slice(5) as 'torn' | 'folded';
      else if (val === 'suit_none') p.pile = '';
      else if (val === 'closet_open') p.closet = 'left';
      else if (val === 'mirror_open') p.closet = 'mirror';
      else if (val === 'closet_shut') p.closet = '';
      break;
    case 'suit':
      p.headDone = true;
      if (val === 'on' || val === 'head_on') p.headAt = ''; // 쓰면 머리는 내 머리 위에 있다. 벗으면 받침대(또는 품)로 간다
      if (val === 'on') { p.suit = true; p.suitFull = true; }
      else if (val === 'off') { p.suit = false; p.suitFull = false; }
      else if (val === 'body') { p.suit = false; p.suitFull = true; }
      else if (val === 'head_on') p.suit = true;
      else if (val === 'head_off') p.suit = false;
      break;
    case 'voice_stop': p.quiet = true; break;
    case 'voice_back': p.quiet = false; break;
    case 'time': p.time = val; break;
    case 'views': p.views = Number(val.replace(/,/g, '')) || 0; break;
    case 'posture': p.posture = val; break;
    case 'pos': case 'go': p.pos = val; p.face = ''; p.px = undefined; p.py = undefined; break;
    case 'pose': p.pose = val; break;
    case 'swing': { const [seat, how] = val.split(/\s+/); p.swings = { ...(p.swings || {}), [seat]: how }; break; }
    case 'carry': p.carry = val === 'off' ? '' : val; break;
    case 'face': p.face = val; break;
    case 'npc': {
      const [id, where] = val.split(/\s+/);
      if (where === 'off') delete p.npcs[id]; else if (id && where) p.npcs[id] = where;
      break;
    }
    case 'pov':
      p.pov = val === 'yunseo' ? 'yunseo' : val === 'world' ? 'world' : 'yunjae';
      if (p.pov !== 'yunjae') { p.quiet = true; p.energy = false; p.heat = false; p.gaze = false; p.emote = false; p.suit = false; p.suitFull = false; p.views = 0; }
      else p.quiet = false;
      break;
    case 'cut': p.cine = 5; break;
    case 'ui':
      if (val.startsWith('server:')) { p.server = val.slice(7).trim(); break; }
      switch (val) {
        case 'messenger_open': p.skin = 'messenger'; p.monitor = true; break;
        case 'phone_open': p.skin = 'messenger'; break; // 같은 메신저를 휴대폰으로 본다. 책상의 모니터는 켜지지 않는다
        case 'messenger_close': if (p.skin === 'messenger') p.skin = 'none'; p.channels = false; break;
        case 'monitor_off': p.monitor = false; p.channels = false; if (p.skin === 'messenger') p.skin = 'none'; break;
        case 'kakao_open': p.skin = 'kakao'; break;
        case 'kakao_close': if (p.skin === 'kakao') p.skin = 'none'; break;
        case 'browser_open': p.skin = 'browser'; break;
        case 'browser_close': if (p.skin === 'browser') p.skin = 'none'; break;
        case 'call_open': p.skin = 'call'; break;
        case 'call_close': if (p.skin === 'call') p.skin = 'none'; break;
        case 'channel_list': p.channels = true; break;
        case 'energy_show': p.energy = true; break;
        case 'energy_hide': p.energy = false; break;
        case 'heat_show': p.heat = true; break;
        case 'heat_hide': p.heat = false; break;
        case 'gaze_show': p.gaze = true; break;
        case 'gaze_hide': p.gaze = false; break;
        case 'emote_show': p.emote = true; break;
        case 'emote_hide': p.emote = false; break;
      }
      break;
  }
}
