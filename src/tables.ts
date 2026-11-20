// 대본 태그 값 → 연출. 순수 데이터만 둔다 (tools/check-tags.mjs 가 Node 로 직접 읽는다).
// 지금은 자리 표시용이다. 장면은 '가족'별로 묶어서 빛과 실루엣만 그린다.

// map 이 있으면 걸어 다니는 맵으로, 없으면 그림 한 장으로 보여 준다. lit 은 맵의 조명 분위기.
/** past: 지난 기억 속 장면. 3장 뒤의 다친 자세(posture)를 그리지 않는다. */
export type SceneSpec = { f: string; mood: string; amb: string; map?: string; lit?: string; rain?: boolean; past?: boolean };

export const SCENES: Record<string, SceneSpec> = {
  black: { f: 'black', mood: 'night', amb: 'room' },
  inside_head: { f: 'black', mood: 'night', amb: 'room', map: 'room', lit: 'inside' }, // 탈 안: 방은 거의 안 보이고, 눈구멍만큼만 보인다
  room_black: { f: 'black', mood: 'night', amb: 'room', map: 'room', lit: 'black' },
  room_night: { f: 'room', mood: 'night', amb: 'room', map: 'room', lit: 'night' },
  room_dark: { f: 'room', mood: 'dark', amb: 'room', map: 'room', lit: 'dark' },
  room_day: { f: 'room', mood: 'day', amb: 'room', map: 'room', lit: 'day' },
  room_day_bright: { f: 'room', mood: 'bright', amb: 'room', map: 'room', lit: 'bright' },
  room_day_rain: { f: 'room', mood: 'rain', amb: 'rain_in', map: 'room', lit: 'rain' },
  room_dusk: { f: 'room', mood: 'dusk', amb: 'room', map: 'room', lit: 'dusk' },
  room_door_open: { f: 'room', mood: 'open', amb: 'room', map: 'room', lit: 'open' },
  door_shadow: { f: 'door', mood: 'night', amb: 'room', map: 'room', lit: 'doorshadow' },
  mirror: { f: 'mirror', mood: 'night', amb: 'room' },
  mirror_morning: { f: 'room', mood: 'day', amb: 'room', map: 'room', lit: 'day' }, // 3장 다음 날: 거울 앞을 지나간다. 부서진 문은 한 뼘 열려 있다 (room: ajar)
  corridor_night: { f: 'corridor', mood: 'night', amb: 'night', map: 'corridor', lit: 'night' },
  corridor_night_glass: { f: 'corridor', mood: 'night', amb: 'night', map: 'corridor', lit: 'glass' }, // 2장 끝: 현관 앞에 깨진 병
  corridor_day: { f: 'corridor', mood: 'day', amb: 'day', map: 'corridor', lit: 'day' },
  stairs: { f: 'stairs', mood: 'night', amb: 'still', map: 'stairs', lit: 'dark' },
  playground_night: { f: 'playground', mood: 'night', amb: 'night', map: 'playground', lit: 'night' },
  complex_night: { f: 'complex', mood: 'night', amb: 'night', map: 'complex', lit: 'night' },
  recycle_back: { f: 'recycle', mood: 'night', amb: 'night', map: 'recycle', lit: 'night' },
  under_slide: { f: 'slide', mood: 'rain', amb: 'rain_out', map: 'playground', lit: 'rainnight', rain: true },
  subway: { f: 'subway', mood: 'day', amb: 'subway', map: 'subway', lit: 'bright' },
  transfer_crowd: { f: 'crowd', mood: 'day', amb: 'crowd', map: 'concourse', lit: 'bright' },
  station_gate: { f: 'gate', mood: 'day', amb: 'crowd', map: 'concourse', lit: 'bright' },
  platform_bench: { f: 'platform', mood: 'day', amb: 'subway', map: 'platform', lit: 'bright' },
  street_day: { f: 'street', mood: 'day', amb: 'day', map: 'road', lit: 'bright' },
  street_evening_wet: { f: 'street', mood: 'dusk', amb: 'rain_out', map: 'street', lit: 'evening' },
  partyroom: { f: 'party', mood: 'warm', amb: 'party', map: 'party', lit: 'party' },
  partyroom_warm: { f: 'party', mood: 'warm', amb: 'party', map: 'party', lit: 'party' },
  partyroom_door: { f: 'party', mood: 'door', amb: 'still', map: 'party', lit: 'party' },
  partyroom_lounge: { f: 'party', mood: 'warm', amb: 'party', map: 'party', lit: 'party' },
  partyroom_changing: { f: 'party', mood: 'dim', amb: 'still', map: 'party', lit: 'party' },
  partyroom_restroom: { f: 'mirror', mood: 'bright', amb: 'still', map: 'restroom', lit: 'bright' },
  livingroom_day: { f: 'living', mood: 'day', amb: 'room', map: 'living', lit: 'day' },
  livingroom_dark: { f: 'living', mood: 'dark', amb: 'room', map: 'living', lit: 'dark' },
  livingroom_morning_rain: { f: 'living', mood: 'rain', amb: 'rain_in', map: 'living', lit: 'rain' },
  convenience_store: { f: 'store', mood: 'bright', amb: 'store', map: 'store', lit: 'bright' },
  campus_cafeteria: { f: 'campus', mood: 'bright', amb: 'crowd', map: 'cafeteria', lit: 'bright' },
  campus_bench: { f: 'campus', mood: 'day', amb: 'day', map: 'campus', lit: 'day' },
  dorm_night: { f: 'dorm', mood: 'dark', amb: 'still', map: 'dorm', lit: 'dark' },
  dorm_stairwell: { f: 'stairs', mood: 'day', amb: 'still', map: 'stairs', lit: 'day' },
  // 4장
  room_dark_rain: { f: 'room', mood: 'dark', amb: 'rain_in', map: 'room', lit: 'dark' },
  grandma_house: { f: 'grandma', mood: 'color', amb: 'day', map: 'grandma', lit: 'color', past: true },   // 이 게임에서 유일하게 색이 있는 장면
  funeral_front: { f: 'funeral', mood: 'night', amb: 'still', map: 'funeral', lit: 'night', past: true },
  funeral_front_c: { f: 'funeral', mood: 'night', amb: 'still', map: 'funeral', lit: 'few' }, // 엔딩 C: 화환이 둘
  er_ceiling: { f: 'er', mood: 'white', amb: 'still', map: 'er', lit: 'white' },
  dinner_past: { f: 'living', mood: 'dim', amb: 'room', map: 'living', lit: 'tv', past: true },
};

// 효과음: 합성 방식(k)과 인자.
export type SfxSpec = { k: string; [key: string]: number | string | number[] | undefined };

export const SFX: Record<string, SfxSpec> = {
  doorlock_beep_open: { k: 'seq', wave: 'square', notes: [1568, 1568, 1568, 1568, 2093, 2637], dur: 0.07, gap: 0.11, vol: 0.12 },
  doorlock_beep_wrong: { k: 'seq', wave: 'square', notes: [1568, 1568, 1568, 1568, 311, 311, 311], dur: 0.08, gap: 0.12, vol: 0.13 },
  ringback: { k: 'seq', wave: 'sine', notes: [450, 450], dur: 1.0, gap: 0.02, vol: 0.06 }, // 통화 연결음
  door_chime: { k: 'seq', wave: 'sine', notes: [1319, 1047], dur: 0.35, gap: 0.3, vol: 0.12 },
  subway_announce: { k: 'seq', wave: 'sine', notes: [784, 988, 1175, 1568], dur: 0.3, gap: 0.26, vol: 0.09 },
  phone_buzz: { k: 'buzz', n: 2, vol: 0.2 },
  camera_shutter: { k: 'click', n: 2, vol: 0.25, bright: 1 },
  switch_on: { k: 'click', n: 1, vol: 0.2, bright: 1 },
  switch_off: { k: 'click', n: 1, vol: 0.18, bright: 0 },
  flashlight_click: { k: 'click', n: 1, vol: 0.14, bright: 1 },
  door_kick: { k: 'thud', f: 70, dur: 0.5, noise: 0.5, vol: 0.9 },
  door_break: { k: 'thud', f: 55, dur: 1.1, noise: 1, vol: 1, crack: 1 },
  hit: { k: 'thud', f: 95, dur: 0.22, noise: 0.35, vol: 0.8 },
  crash: { k: 'thud', f: 80, dur: 0.8, noise: 0.9, vol: 0.85, crack: 1 },
  door_slam_far: { k: 'thud', f: 60, dur: 0.6, noise: 0.2, vol: 0.3 },
  door_open: { k: 'creak', dur: 0.7, vol: 0.12, f: 180 },
  door_open_soft: { k: 'creak', dur: 0.5, vol: 0.06, f: 150 },
  water_run: { k: 'wash', dur: 3, lp: 3200, hp: 700, vol: 0.14, attack: 0.15 },
  tv_laugh: { k: 'wash', dur: 2.2, lp: 1400, hp: 280, vol: 0.12, attack: 0.3 },
  heartbeat: { k: 'thud', f: 46, dur: 0.16, noise: 0.04, vol: 0.55 },
  heartbeat_soft: { k: 'thud', f: 44, dur: 0.14, noise: 0.02, vol: 0.28 },
  coin: { k: 'click', n: 1, vol: 0.16, bright: 1 },
  slip: { k: 'creak', dur: 0.25, vol: 0.05, f: 300 },
  stitch: { k: 'click', n: 1, vol: 0.08, bright: 0 },
  notify: { k: 'seq', wave: 'sine', notes: [1760, 2349], dur: 0.06, gap: 0.07, vol: 0.06 },
  bump: { k: 'thud', f: 120, dur: 0.12, noise: 0.5, vol: 0.35 },
  tap: { k: 'click', n: 1, vol: 0.05, bright: 1 },
  bang: { k: 'thud', f: 60, dur: 0.35, noise: 0.6, vol: 0.55 }, // 옷장 밖에서 문이 울린다 (멀고 두껍다)
  swing_creak: { k: 'creak', dur: 1.4, vol: 0.1, f: 520, swing: 1 },
  footsteps_near: { k: 'steps', n: 5, gap: 0.55, jitter: 0.05, from: 0.25, to: 0.6 },
  footsteps_away: { k: 'steps', n: 6, gap: 0.55, jitter: 0.05, from: 0.5, to: 0.05 },
  footsteps_fast: { k: 'steps', n: 8, gap: 0.24, jitter: 0.03, from: 0.4, to: 0.5 },
  footsteps_drunk: { k: 'steps', n: 6, gap: 0.6, jitter: 0.3, from: 0.3, to: 0.65 },
  footsteps_paw: { k: 'steps', n: 5, gap: 0.5, jitter: 0.04, from: 0.12, to: 0.12, soft: 1 },
  footsteps_stop: { k: 'steps', n: 3, gap: 0.5, jitter: 0.05, from: 0.5, to: 0.7 },
  rain_start: { k: 'wash', dur: 4, lp: 5000, hp: 800, vol: 0.12, attack: 2.5 },
  rain_sudden: { k: 'wash', dur: 4, lp: 7000, hp: 600, vol: 0.2, attack: 0.3 },
  rain_on_metal: { k: 'wash', dur: 4, lp: 9000, hp: 2500, vol: 0.12, attack: 0.8 },
  shower: { k: 'wash', dur: 4, lp: 8000, hp: 1500, vol: 0.14, attack: 0.4 },
  crowd_loud: { k: 'wash', dur: 3.5, lp: 1800, hp: 300, vol: 0.3, attack: 0.6 },
  train_arrive: { k: 'wash', dur: 4.5, lp: 900, hp: 60, vol: 0.4, attack: 2.2 },
  subway_rumble: { k: 'wash', dur: 5, lp: 300, hp: 40, vol: 0.45, attack: 1.5 },
  tv_volume_up: { k: 'wash', dur: 3, lp: 2600, hp: 500, vol: 0.14, attack: 0.5 },
  fabric_tear: { k: 'tear', dur: 0.9, vol: 0.45 },
  breath_inside: { k: 'breath', n: 3, rate: 1.6, vol: 0.16 },
  breath_fast: { k: 'breath', n: 6, rate: 0.55, vol: 0.2 },
  snore: { k: 'breath', n: 2, rate: 2.4, vol: 0.12, low: 1 },
  ringing_ear: { k: 'tone', f: 6200, dur: 5, vol: 0.06, duck: 1 },
  fridge_hum: { k: 'tone', f: 58, dur: 5, vol: 0.12, wave: 'triangle' },
  fluorescent_flicker: { k: 'flicker', n: 5, vol: 0.06 },
  cicada_night: { k: 'cicada', dur: 5, vol: 0.05 },
};

// 연출 컷: bars(검은 띠만), frame(글 사이에 끼는 사진·영상·종이), fx(화면 효과)
export type CutSpec = { k: 'bars' | 'frame' | 'fx' | 'title'; art?: string; label?: string };

export const CUTS: Record<string, CutSpec> = {
  title: { k: 'title' },
  pov_shake: { k: 'fx', art: 'shake' },
  father_face: { k: 'fx', art: 'eyes' },
  mirror_cat: { k: 'fx', art: 'cat' },
  haeun_appears: { k: 'bars' },
  haeun_arm: { k: 'bars' },
  wrist: { k: 'bars' },
  mother_door: { k: 'bars' },
  server_photo_bear: { k: 'frame', art: 'bear' },
  group_photo: { k: 'frame', art: 'group' },
  yearbook_photo: { k: 'frame', art: 'portrait' },
  album: { k: 'frame', art: 'album' },
  video_playground: { k: 'frame', art: 'video', label: '00:41' },
  video_full: { k: 'frame', art: 'video', label: '00:41' },
  video_face: { k: 'frame', art: 'video_face', label: '00:38' },
  video_clip_short: { k: 'frame', art: 'video', label: '00:15' },
  thumbnail: { k: 'frame', art: 'thumbnail', label: '08:12' },
  kakao_capture: { k: 'frame', art: 'capture' },
  closet_dates: { k: 'frame', art: 'tally' },
  tuition_bill: { k: 'frame', art: 'paper' },
  discharge_card: { k: 'frame', art: 'card' },
  clinic_receipt: { k: 'frame', art: 'paper' },
  access_card: { k: 'frame', art: 'card' },
  grandma_photo: { k: 'frame', art: 'grandma' },
  silbap_note: { k: 'frame', art: 'paper' },
  er_receipt: { k: 'frame', art: 'paper' },
  father_photo: { k: 'bars' },
  yunjae_face: { k: 'fx', art: 'face' }, // 엔딩 A: 맨얼굴의 윤재에게 처음으로 얼굴이 생긴다
};

export const UI_TAGS = [
  'messenger_open', 'phone_open', 'messenger_close', 'kakao_open', 'kakao_close', 'browser_open', 'browser_close',
  'call_open', 'call_close', 'channel_list', 'monitor_off', 'panic',
  'energy_show', 'energy_hide', 'heat_show', 'heat_hide', 'gaze_show', 'gaze_hide',
  'emote_show', 'emote_hide',
];

export const EMOTES: Record<string, string> = {
  wave: '손을 흔든다', heart: '하트', tilt: '갸웃', curl: '웅크린다', nod: '끄덕',
  shake: '고개를 젓는다', laugh: '웃는다', give: '내민다', reach: '손을 뻗는다', point: '가리킨다', eat: '먹는 시늉', cover_mouth: '입을 가린다', block: '팔로 막는다', hold: '두 손으로 든다', none: '(몸짓을 그친다)',
};

export const SUIT = ['on', 'off', 'body', 'body_bare', 'body_feet', 'body_hands', 'head_on', 'head_off'];
export const POSTURE = ['arm', 'back', 'leg'];
export const POV = ['yunseo', 'yunjae', 'world']; // world: 엔딩 C. 아무도 말하지 않는다. 보이는 것만 적는다

// 줄 끝 태그 (그 줄을 어떻게 보여줄지)
export const LINE_KINDS = [
  'voice', 'fail', 'msg', 'msg_me', 'wall', 'door', 'say', 'system', 'comment', 'caption', 'call', 'draft',
];
// 혼자 서는 태그 (연출 지시)
export const DIRECTIVES = [
  'chapter', 'scene', 'sfx', 'suit', 'voice_stop', 'voice_back', 'ui', 'emote', 'cut', 'time', 'turn',
  'pause', 'views', 'posture', 'pov', 'chapter_end',
  'help',  // help: short / long   도움 창구 안내. long 은 엔딩 C 뒤, 10초 동안 넘길 수 없다
  // 걸어 다니는 맵에서 쓰는 것
  'pos',   // pos: 자리 이름      윤재를 그 자리에 놓는다
  'go',    // go: 자리 이름       윤재가 그 자리까지 걸어간다
  'npc',   // npc: 누구 자리 [walk]   다른 사람을 놓거나(off 면 치운다) 걷게 한다
  'crowd', // crowd: on / off   환승 통로의 인파가 지나간다
  'train', // train: arrive / open / close / leave   승강장 열차 (끝날 때까지 기다린다)
  'game',  // 선택지에만: game: 이름 결과   미니게임의 결과가 그 선택지를 고른다
  'timer', // 선택지에만: timer: 초   at: timeout 선택지가 시간이 다 되면 골라진다
  'swing', // swing: swing1 high   그네 (놀이터). 앉은 사람과 함께 흔들린다. still 이면 멈춘다
  'pose',  // pose: stand / lie / sit / curl
  'face',  // face: up / down / left / right
  'carry', // carry: bag / off      윤재가 등에 멘 것 (탈을 쓰면 저절로 벗는다)
  'warn',  // warn: 경고 이름 / end   장면 경고 (설정에서 켰을 때만). 넘기면 end 까지 감고 요약을 보여 준다
  'room',  // room: torn / sewn / box / box_open / tidy / ajar / head_bed|floor|held|desk / suit_torn|folded|none   방에 남는 자국
];
export const ROOM_MARKS = ['torn', 'sewn', 'box', 'box_open', 'tidy', 'ajar', 'head_bed', 'head_floor', 'head_held', 'head_desk', 'suit_torn', 'suit_folded', 'suit_none', 'closet_open', 'mirror_open', 'closet_shut', 'siren', 'front_open', 'door_1107', 'door_shut'];
// 선택지에 붙는 태그. "[모니터를 본다 # at: monitor]" → 맵의 그 물건을 조사하면 골라진다.
// at: move 는 방향키, at: wait 는 아무것도 없는 데서 누르는 Z 다.
export const CHOICE_TAGS = ['at'];
export const POSES = ['stand', 'lie', 'sit', 'curl', 'floor', 'gone', 'stoop', 'lie_floor']; // lie_floor: 침대가 아닌 바닥에 모로 눕는다 // stoop: 허리와 고개를 숙인다 (숙인 채로 걸을 수 있다)
export const SWINGS = ['still', 'gentle', 'high']; // swing: 자리 세기   그네가 흔들리는 정도 // gone: 윤재가 화면에 없다 (엔딩 C)
export const CARRY = ['bag', 'head', 'off']; // head: 맨몸으로 삼색이 머리를 안았다
export const FACES = ['up', 'down', 'left', 'right'];

// 장면 경고 (기획서 2장 '콘텐츠 설정'). skip 이 있는 장면은 넘길 수 있고, 넘기면 이 요약이 대신 나온다.
// 장면 안의 선택지는 그대로 고른다. 이야기와 변수는 그대로 이어진다.
export const WARNS: Record<string, { line: string; skip?: string[] }> = {
  violence: {
    line: '이어지는 장면에는 가정폭력이 직접 나옵니다. 30초쯤 걸립니다.',
    skip: [
      '아버지가 손을 들었다. 윤재는 맞았다.',
      '아버지는 삼색이를 찢었다. 등 솔기와 왼팔이 뜯겼고, 처진 귀는 실 두 가닥에 매달렸다.',
      '말리던 엄마도 맞았다. 아버지는 안방으로 들어갔다.',
    ],
  },
  attempt: {
    line: '이어지는 회상에는 스물두 살 때의 자살 사고가 나옵니다. 방법은 나오지 않습니다.',
    skip: ['할머니를 보내고 돌아온 그 주, 윤재는 이 방에서 혼자 무너졌다.', '그리고 병원에서 깨어났다.'],
  },
  crisis: { line: '이제부터 자살 사고가 이어지는 밤입니다. 이 장면은 넘길 수 없습니다. 방법은 나오지 않습니다. 왼쪽 위 메뉴(≡)에서 언제든 쉬어 갈 수 있습니다.' },
  ending_c: { line: '이 결말에서 윤재는 죽습니다. 죽는 장면은 나오지 않습니다. 끝나고 나면 도움 창구 안내가 나옵니다.' },
};

// 미니게임 이름 (games.ts 의 판, world.ts 의 맵 위 게임)
export const GAMES = ['dodge', 'zoom', 'breath', 'bill', 'coins', 'stitch', 'still', 'flood', 'crowd', 'type', 'closet', 'dial', 'gaze', 'tilt', 'tug', 'lurk', 'watch', 'leave', 'leaveall', 'swing', 'swing2', 'stillhot', 'photo', 'catchb', 'zip', 'knock', 'sleeve', 'album', 'point', 'pills', 'grab', 'push', 'bag', 'beam', 'history', 'longmsg', 'buzz', 'lining', 'headoff', 'tape', 'swing3', 'book', 'bookok', 'erase', 'dates', 'leak', 'react'];
