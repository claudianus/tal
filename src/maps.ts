// 맵 데이터. 순수 데이터와 길 찾기만 둔다 (검사 도구가 Node 로 직접 읽는다).
// 한 글자가 타일 하나다. 타일은 16×16.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Pt = [number, number, Dir?];
/** 조사하거나(기본) 밟으면(touch) 대본의 선택지가 골라지는 자리. */
export type Obj = { id: string; x: number; y: number; w?: number; h?: number; touch?: boolean };
/** 맵 그림 위의 빛. 좌표는 맵의 픽셀 (맵 (0,0) 타일의 왼쪽 위가 0,0). fx: flicker 형광등, tv 텔레비전, blink 깜빡이는 표시등, dead 꺼진 등.
 *  when 이 있으면 그 때만 켜진다 (night: 낮이 아닐 때). mood 가 있으면 그 조명 분위기일 때만 켜진다. */
export type Light = { x: number; y: number; r: number; a: number; col?: string; fx?: 'flicker' | 'tv' | 'blink' | 'dead'; when?: 'night' | 'day'; tint?: number; mood?: string };
/** grid: 걷는 자리. top: 그림이 맵 위로 더 솟은 높이(px, 벽). view: 화면 세로에 담을 높이. painted: 타일이 아니라 한 장 그림으로 그린다 (src/art/places.ts). */
export type MapDef = { grid: string[]; points: Record<string, Pt>; objs: Obj[]; spawn: string; outdoor?: boolean; view?: number; top?: number; painted?: boolean; lights?: Light[] };

export const TILE = 16;

// 글자 → [타일 이름, 막혀 있는가]
export const LEGEND: Record<string, [string, boolean]> = {
  ' ': ['void', true], '#': ['wall', true],
  '.': ['floor', false], ',': ['floor2', false], '_': ['concrete', false], ':': ['asphalt', false], ';': ['sand', false],
  W: ['window', true], D: ['desk_head', true], M: ['monitor', true], T: ['trash', true], C: ['closet', true], c: ['closet_mirror', true],
  S: ['switch', true], R: ['door_room', true], b: ['bed_head', true], B: ['bed_foot', true],
  r: ['door_left', true], h: ['door_bath', true], k: ['kitchen', true], y: ['door_yunseo', true], a: ['door_anbang', true],
  t: ['table', true], o: ['sofa', true], v: ['tv', true], e: ['mat', false], F: ['door_front', true],
  H: ['apt_home', true], P: ['apt_door', true], Q: ['apt_window_lit', true], q: ['apt_window', true], '=': ['railing', true],
  E: ['elevator', true], X: ['stair_in', false], s: ['step', false], G: ['glass_door', true], p: ['plant', true],
  l: ['lamp', true], f: ['fence', true], g: ['booth', true], A: ['block', true], d: ['block_door', true], '%': ['tree', true],
  '~': ['slide', true], m: ['seesaw', true], w: ['swing', true], n: ['bench', true], x: ['bin', true], u: ['lowwall', true], Z: ['prop', true],
};

export const MAPS: Record<string, MapDef> = {
  // 윤재의 방. 세 걸음이면 끝난다.
  room: {
    grid: [
      '#WW########',
      '#...DDMTCc#',
      '#bb.......S',
      '#bb.......R',
      '#BB.......#',
      '#.........#',
      '###########',
    ],
    spawn: 'up', view: 150, top: 16, // 좁은 방은 가까이서 본다. 벽 그림이 위로 한 칸 더 솟아 있다.
    points: {
      bed: [1, 2, 'down'], up: [3, 2, 'down'], desk: [4, 2, 'up'], closet_front: [8, 2, 'up'],
      mirror_front: [9, 2, 'up'], door_in: [9, 3, 'right'], center: [5, 4, 'down'], doorway: [10, 3, 'left'],
      brace: [6, 3, 'right'], fa_near: [7, 3, 'left'], // 3장: 문이 부서진 밤. 아버지는 father_face 컷에서 문간(doorway)에 선다
      floor_door: [10, 3, 'left'], mom_up: [10, 3, 'left'],
    },
    objs: [
      { id: 'window', x: 1, y: 0, w: 2 }, { id: 'head', x: 4, y: 1, w: 2 }, { id: 'monitor', x: 6, y: 1 },
      { id: 'trash', x: 7, y: 1 }, { id: 'closet', x: 8, y: 1 }, { id: 'mirror', x: 9, y: 1 },
      { id: 'switch', x: 10, y: 2 }, { id: 'door', x: 10, y: 3 }, { id: 'bed', x: 1, y: 2, w: 2, h: 3 },
    ],
  },
  // 거실. 열일곱 걸음짜리. 왼쪽 벽이 내 방 문, 오른쪽 벽이 현관문. 뒷벽에 화장실, 부엌, 윤서 방, 안방.
  living: {
    grid: [
      '##hh#kkk##yy#aa###',
      '#,,,,,,,vv,,,,,SS#',
      '#,,,,tt,,,,,,,,ee#',
      'r,,,,tt,,,,,,,,eeF',
      '#,,,,,,,,,,,,,,ee#',
      '#,,,,,,,ooo,,,,ZZ#',
      '##################',
    ],
    spawn: 'from_room', painted: true, top: 56, view: 196,
    points: { from_room: [1, 3, 'right'], entry: [16, 3, 'right'], table_side: [4, 3, 'right'], mom_shoes: [16, 3, 'right'] },
    objs: [
      { id: 'z_table', x: 3, y: 1, h: 5, touch: true }, { id: 'z_yunseo', x: 10, y: 1, h: 5, touch: true },
      { id: 'z_anbang', x: 13, y: 1, h: 5, touch: true }, { id: 'z_entry', x: 15, y: 2, h: 3, touch: true },
      { id: 'frontdoor', x: 17, y: 3 },
    ],
    lights: [
      { x: 104, y: -26, r: 34, a: 0.7, col: 'rgba(240,190,120,A)', when: 'night' },  // 엄마가 켜 두고 간 가스레인지 후드 등
      { x: 92, y: 40, r: 40, a: 0.45, col: 'rgba(240,190,120,A)', when: 'night' },   // 그 빛이 식탁까지 닿는다
      { x: 156, y: 0, r: 5, a: 0.6, col: 'rgba(255,60,60,A)', fx: 'blink' },          // TV 대기 등
      { x: 224, y: 15, r: 12, a: 0.3, col: 'rgba(200,190,160,A)', when: 'night' },   // 안방 문틈
      { x: 270, y: 46, r: 9, a: 0.6, col: 'rgba(127,212,154,A)' },                  // 도어록
      { x: 176, y: -22, r: 24, a: 0.4, col: 'rgba(110,130,180,A)', when: 'night' },  // 윤서 방 창으로 든 빛이 박스 틈으로
      { x: 60, y: 92, r: 54, a: 0.35, col: 'rgba(90,110,160,A)', when: 'night' },     // 베란다 창으로 든 가로등 빛
      { x: 190, y: 92, r: 54, a: 0.35, col: 'rgba(90,110,160,A)', when: 'night' },
      { x: 60, y: 80, r: 90, a: 0.6, col: 'rgba(170,185,200,A)', when: 'day' },      // 비 오는 아침
      { x: 200, y: 80, r: 90, a: 0.6, col: 'rgba(170,185,200,A)', when: 'day' },
    ],
  },
  // 털날림 주의보 정모. 골목 안쪽 건물 삼 층의 파티룸. 왼쪽 끝은 계단참과 현관문,
  // 가운데는 본방(소파, 접이식 테이블, 사진 찍는 벽), 오른쪽은 갈아입고 머리를 벗는 작은 방.
  party: {
    grid: [
      '########################',
      '#___#,,,,,,,,ZZZZ#ZZ,ZZ#',
      '#___#,,,,,,,,,,,,#,,,,,#',
      '#___#,,,,,,,ZZZ,,,,,,,,#',
      'X___F,,,,,,,,,,,,#,,,,,#',
      '#___#,,,,Z,,,,,,,#,,ZZZ#',
      '########################',
    ],
    spawn: 'from_stairs', painted: true, top: 56, view: 200, // 넓은 방이라 벽 장식과 바닥이 한 화면에 다 들어오게
    points: {
      from_stairs: [1, 4, 'right'], door_front: [3, 4, 'right'], hw_out: [3, 3, 'down'],
      inside: [5, 4, 'right'], hw_in: [6, 3, 'right'], my_seat: [14, 2, 'down'],
      seat_moka: [13, 2, 'down'], seat_gom: [15, 3, 'left'], seat_sil: [13, 4, 'up'], seat_hw: [11, 3, 'right'],
      changing: [20, 3, 'down'], moka_zip: [21, 3, 'left'],
      room_mid: [12, 4, 'right'], small_in: [18, 3, 'left'], fox_greet: [13, 4, 'left'],
      bear_wave: [10, 4, 'right'], seat_sofa: [15, 1, 'down'], dog_spot: [9, 3, 'right'],
      bear_photo: [7, 1, 'down'], photo_left: [5, 2, 'down'], photo_center: [7, 2, 'down'], photo_right: [9, 2, 'down'], photo_dog: [11, 2, 'down'], // 한 칸씩 띄워 서야 고양이가 안 가린다
      lounge_me: [19, 4, 'right'], lounge_door: [18, 3, 'right'], lounge_stand: [21, 4, 'left'], seat_bench: [21, 5, 'left'],
    },
    objs: [
      { id: 'frontdoor', x: 4, y: 4 }, { id: 'table', x: 12, y: 3, w: 3 },
      { id: 'z_center', x: 7, y: 2, touch: true }, { id: 'z_edge', x: 13, y: 2, touch: true }, // 끝: 강아지 너머, 프레임에서 반쯤 나가는 자리
    ],
    lights: [
      { x: 40, y: -48, r: 40, a: 0.6, col: 'rgba(205,220,205,A)', fx: 'flicker' },  // 계단참 형광등
      { x: 40, y: 40, r: 46, a: 0.5, col: 'rgba(196,210,200,A)' },
      { x: 100, y: -26, r: 64, a: 0.8, col: 'rgba(222,236,246,A)' },                // 오후 세 시의 창
      { x: 112, y: 32, r: 66, a: 0.55, col: 'rgba(230,238,244,A)' },
      { x: 176, y: 44, r: 112, a: 0.82, col: 'rgba(255,210,150,A)' },              // 본방
      { x: 236, y: 30, r: 78, a: 0.6, col: 'rgba(255,214,160,A)' },
      { x: 96, y: -40, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },     // 꼬마전구
      { x: 128, y: -36, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },
      { x: 160, y: -38, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },
      { x: 200, y: -40, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },
      { x: 232, y: -36, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },
      { x: 262, y: -40, r: 20, a: 0.5, col: 'rgba(255,196,104,A)', tint: 0.4 },
      { x: 255, y: -36, r: 4, a: 0.6, col: 'rgba(127,227,154,A)', fx: 'blink' },  // 에어컨 표시등
      { x: 152, y: 70, r: 9, a: 0.5, col: 'rgba(120,160,230,A)' },                 // 삼각대의 휴대폰
      { x: 344, y: -42, r: 30, a: 0.75, col: 'rgba(255,220,160,A)' },              // 작은 방 백열등
      { x: 334, y: 40, r: 62, a: 0.55, col: 'rgba(240,200,140,A)' },
    ],
  },
  // 11층 복도. 복도식 아파트. 한쪽은 집집의 문과 부엌 창, 한쪽은 난간 너머 밤이다.
  // 집마다 문 두 칸, 창 두 칸. 1106호가 우리 집, 1107호가 벽 하나 건너 옆집. 끝에 엘리베이터와 계단.
  corridor: {
    grid: [
      '#HHqq#PPQQ#PPqq#PPqq#EE##XX#',
      '#__________________________#',
      '#__________________________#',
      '============================',
    ],
    spawn: 'home', outdoor: true, painted: true, top: 56, view: 150,
    points: { home: [2, 1, 'right'], past_1107: [11, 1, 'right'], at_1107: [6, 1, 'left'], lift: [21, 1, 'up'], from_lift: [21, 1, 'left'], at_door: [2, 1, 'up'] },
    objs: [
      { id: 'z_light', x: 5, y: 1, h: 2, touch: true }, { id: 'z_1107', x: 7, y: 1, h: 2, touch: true },
      { id: 'z_end', x: 19, y: 1, h: 2, touch: true }, { id: 'elevator', x: 21, y: 0, w: 2 }, { id: 'stairs_in', x: 25, y: 0, w: 2, touch: true },
    ],
    lights: [
      { x: 72, y: 4, r: 64, a: 0.78, col: 'rgba(205,220,205,A)', fx: 'flicker', when: 'night' },  // 복도 천장등. 하나는 늘 떨린다
      { x: 232, y: 4, r: 62, a: 0.74, col: 'rgba(205,220,205,A)', when: 'night' },
      { x: 312, y: 4, r: 40, a: 0.2, fx: 'dead', when: 'night' },                                  // 나간 등
      { x: 392, y: 4, r: 60, a: 0.72, col: 'rgba(205,220,205,A)', when: 'night' },
      { x: 144, y: -20, r: 30, a: 0.75, col: 'rgba(236,196,128,A)', when: 'night' },              // 1107호 부엌 창. 새벽에도 불이 켜져 있다
      { x: 146, y: -18, r: 18, a: 0.5, col: 'rgba(120,160,240,A)', fx: 'tv', when: 'night' },      // 커튼 틈의 TV
      { x: 39, y: -10, r: 6, a: 0.6, col: 'rgba(120,230,150,A)', fx: 'blink' },                  // 우리 집 도어록
      { x: 352, y: -46, r: 12, a: 0.7, col: 'rgba(240,90,70,A)' },                               // 엘리베이터 층 표시
      { x: 375, y: -16, r: 6, a: 0.6, col: 'rgba(240,200,120,A)' },
      { x: 416, y: -48, r: 18, a: 0.75, col: 'rgba(90,220,130,A)' },                             // 비상구
      { x: 120, y: 60, r: 70, a: 0.2, col: 'rgba(80,100,160,A)', when: 'night' },                 // 난간 너머 도시의 밤빛
      { x: 64, y: -22, r: 28, a: 0.8, col: 'rgba(120,160,240,A)', fx: 'tv', mood: 'glass', tint: 0.5 },      // 우리 집 창: TV 소리가 크다
      { x: 330, y: 60, r: 70, a: 0.2, col: 'rgba(80,100,160,A)', when: 'night' },
    ],
  },
  // 집에서 역까지 (한낮). 단지 정문(왼쪽)에서 동네 상가를 지나 지하철 입구(28-29칸)까지. 1-2줄이 보도, 3-4줄은 연석과 차도.
  road: {
    grid: [
      '############################XX##',
      '________________________________',
      '________________________________',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
    ],
    spawn: 'start', outdoor: true, painted: true, top: 80, view: 200,
    points: { start: [2, 1, 'right'] },
    objs: [{ id: 'z_station', x: 28, y: 0, w: 2, touch: true }],
  },
  // 역 앞 거리. 파티룸에서 역까지. 2층짜리 상가가 줄지어 있고, 오른쪽 끝에 지하철 입구(25-26칸)가 있다.
  // 1-2줄은 보도, 3-4줄은 연석과 젖은 차도 (막혀 있다).
  street: {
    grid: [
      '#########################XX###',
      '______________________________',
      '______________________________',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
    ],
    spawn: 'start', outdoor: true, painted: true, top: 80, view: 200,
    points: {
      start: [2, 2, 'right'], hw_start: [3, 1, 'right'], hw_walk: [15, 1, 'left'], // 현우는 반 걸음 앞에서, 말할 때는 돌아본다
      me_gate: [23, 1, 'right'], hw_down: [25, 0, 'up'],
    },
    objs: [{ id: 'z_walk', x: 13, y: 1, h: 2, touch: true }, { id: 'station', x: 25, y: 0, w: 2 }],
    lights: [
      { x: 40, y: -14, r: 50, a: 0.85, col: 'rgba(220,240,236,A)', tint: 0.25 }, { x: 40, y: 22, r: 46, a: 0.6, col: 'rgba(220,240,236,A)', tint: 0.15 }, // 편의점
      { x: 120, y: -14, r: 44, a: 0.8, col: 'rgba(240,170,90,A)', tint: 0.35 }, { x: 120, y: 22, r: 40, a: 0.5, col: 'rgba(240,170,90,A)', tint: 0.2 },   // 치킨집
      { x: 154, y: -52, r: 22, a: 0.8, col: 'rgba(240,90,200,A)', fx: 'blink', tint: 0.5 },                                                          // 노래방 세로 간판
      { x: 120, y: -52, r: 26, a: 0.55, col: 'rgba(170,110,240,A)', tint: 0.4 },
      { x: 192, y: -52, r: 28, a: 0.6, col: 'rgba(220,232,244,A)', tint: 0.2 },                                                                       // 2층 학원
      { x: 236, y: -50, r: 18, a: 0.9, col: 'rgba(90,230,120,A)', tint: 0.55 },                                                                      // 약국 십자
      { x: 268, y: -14, r: 44, a: 0.8, col: 'rgba(232,246,240,A)', tint: 0.2 }, { x: 268, y: 22, r: 40, a: 0.5, col: 'rgba(232,246,240,A)', tint: 0.15 },
      { x: 344, y: -16, r: 34, a: 0.55, col: 'rgba(240,190,120,A)', tint: 0.3 },                                                                      // 문 닫는 카페
      { x: 416, y: -30, r: 32, a: 0.85, col: 'rgba(210,232,240,A)', tint: 0.2 }, { x: 404, y: -46, r: 14, a: 0.8, col: 'rgba(110,220,140,A)', tint: 0.5 }, // 지하철 입구
      { x: 416, y: 18, r: 44, a: 0.6, col: 'rgba(210,232,240,A)', tint: 0.15 },
      { x: 136, y: -36, r: 16, a: 0.9, col: 'rgba(250,240,220,A)' }, { x: 136, y: 28, r: 70, a: 0.75, col: 'rgba(240,230,210,A)', tint: 0.15 },          // 가로등 둘
      { x: 344, y: -36, r: 16, a: 0.9, col: 'rgba(250,240,220,A)' }, { x: 344, y: 28, r: 70, a: 0.75, col: 'rgba(240,230,210,A)', tint: 0.15 },
      { x: 40, y: 62, r: 26, a: 0.35, col: 'rgba(220,240,236,A)' }, { x: 120, y: 62, r: 24, a: 0.35, col: 'rgba(240,170,90,A)' },                    // 젖은 차도에 번진 간판
      { x: 236, y: 62, r: 20, a: 0.35, col: 'rgba(90,230,120,A)' }, { x: 416, y: 62, r: 24, a: 0.3, col: 'rgba(210,232,240,A)' },
    ],
  },
  // 계단. 11층에서 1층까지. 층마다 계단참이 있고, 한 층 내려갈 때마다 좌우가 바뀐다. 지나가는 층은 건너뛴다.
  stairs: {
    grid: [
      '#__________#',
      '#########ss#',
      '#########ss#',
      '#########ss#',
      '#__________#',
      '#ss#########',
      '#ss#########',
      '#ss#########',
      '#__________#',
      '#########ss#',
      '#########ss#',
      '#########ss#',
      '#__________#',
      '#ss#########',
      '#ss#########',
      '#ss#########',
      'G__________#',
      '############',
    ],
    spawn: 'top', painted: true, top: 48, view: 160,
    points: { top: [2, 0, 'right'], bottom: [1, 16, 'right'] },
    objs: [
      { id: 'z_9', x: 9, y: 4, w: 2, touch: true }, { id: 'z_7', x: 1, y: 8, w: 2, touch: true },
      { id: 'z_4', x: 9, y: 12, w: 2, touch: true }, { id: 'z_1', x: 1, y: 16, w: 2, touch: true },
      { id: 'glassdoor', x: 0, y: 16 },
    ],
    lights: [
      { x: 160, y: -36, r: 10, a: 0.6, col: 'rgba(90,220,130,A)' },  // 층마다 비상구 등
      { x: 24, y: 28, r: 10, a: 0.6, col: 'rgba(90,220,130,A)' },
      { x: 160, y: 92, r: 10, a: 0.6, col: 'rgba(90,220,130,A)' },
      { x: 24, y: 156, r: 10, a: 0.6, col: 'rgba(90,220,130,A)' },
      { x: 4, y: 262, r: 46, a: 0.85, col: 'rgba(232,170,90,A)' },  // 1층 유리문 밖 가로등
      { x: 40, y: 200, r: 30, a: 0.3, col: 'rgba(80,100,150,A)', when: 'night' }, // 계단 창
    ],
  },
  // 단지 안. 위쪽에 우리 108동의 아래층과 현관, 경비실, 그리고 철조망 너머 '센트럴 파크뷰'. 가로등의 주황색 원과 원 사이는 어둡다.
  complex: {
    grid: [
      'AAAAddAAAAAAAA%%gg%%ffffffffff',
      'p::::::::::::::::::::::::::::f',
      'p::::::::::::::::::::::::::::f',
      'p:::::::l::::::::::::::::::::f',
      'p::::::::::::::::::::::::::::f',
      'p::::::::::::::::::::l:::::::f',
      'p:::::ZZZ::::::::::::::::::%:f',
      'p::%::ZZZ::::::::::::::::::::f',
      'p::::::::::::::::::::::::::::f',
      'pppppppppppppppppppppp:::ppppp',
    ],
    spawn: 'from_home', outdoor: true, painted: true, top: 72, view: 200,
    points: { from_home: [4, 1, 'down'], from_play: [23, 8, 'up'] },
    objs: [
      { id: 'z_lamp', x: 9, y: 1, h: 8, touch: true }, { id: 'z_fence', x: 19, y: 1, h: 8, touch: true },
      { id: 'z_play', x: 22, y: 9, w: 3, touch: true }, { id: 'z_guard', x: 15, y: 1, h: 8, touch: true },
      { id: 'homedoor', x: 4, y: 0, w: 2 },
    ],
    lights: [
      { x: 136, y: 58, r: 78, a: 0.92, col: 'rgba(232,150,70,A)', tint: 0.5 },  // 가로등 둘. 나트륨등의 주황 원.
      { x: 344, y: 90, r: 78, a: 0.92, col: 'rgba(232,150,70,A)', tint: 0.5 },
      { x: 126, y: -32, r: 16, a: 0.8, col: 'rgba(255,200,120,A)' }, { x: 334, y: 0, r: 16, a: 0.8, col: 'rgba(255,200,120,A)' }, // 등머리
      { x: 80, y: -10, r: 42, a: 0.8, col: 'rgba(232,170,90,A)' },    // 108동 현관 불빛
      { x: 272, y: -24, r: 30, a: 0.75, col: 'rgba(220,200,140,A)' }, // 경비실 창
      { x: 40, y: -58, r: 12, a: 0.6, col: 'rgba(230,190,120,A)' }, { x: 184, y: -48, r: 10, a: 0.5, col: 'rgba(230,190,120,A)' }, // 108동에 켜진 창 둘
      { x: 380, y: -56, r: 26, a: 0.55, col: 'rgba(170,200,240,A)' }, { x: 440, y: -40, r: 24, a: 0.5, col: 'rgba(170,200,240,A)' }, // 파크뷰는 밤에도 환하다
      { x: 410, y: -16, r: 30, a: 0.45, col: 'rgba(150,220,200,A)' },
      { x: 452, y: -62, r: 4, a: 0.9, col: 'rgba(255,170,90,A)', fx: 'blink' },                        // 그 창의 작은 불빛
    ],
  },
  // 모래 놀이터. 미끄럼틀, 시소, 그네 두 개. 왼쪽 화단, 왼쪽 아래로 분리수거장 가는 길.
  playground: {
    grid: [
      'ffffffff:::fffffffff',
      '%;;;;;;;;;;;;;;;;;;f',
      '%;~~~;;;;;;;;;l;;;;f',
      '%;~~~;;;;;;;;;;nn;;f',
      '%;;;;;;;;;;;;;;;;;;f',
      '%;;;;;;;;;;;;;;;;;;f',
      '%;;;;;;;wwwww;;;;;;f',
      ';;;;;;;;;;;;;;;;;;;f',
      ';;;mmm;;;;;;;;;;;;;f',
      ';;;;;;;;;;;;;;;;;;;f',
      'p;;;;;;;;;;;;;;;;;;f',
      'ffffffffffffffffffff',
    ],
    spawn: 'in', outdoor: true, painted: true, top: 56, view: 200,
    points: {
      in: [9, 1, 'down'], swing1: [9, 6, 'down'], swing2: [11, 6, 'down'], swing_front: [9, 7, 'up'],
      edge: [16, 10, 'left'], near: [13, 8, 'left'], slide_under: [3, 4, 'down'], away: [0, 4, 'left'],
    },
    objs: [
      { id: 'swing1', x: 9, y: 6 }, { id: 'z_recycle', x: 0, y: 7, h: 3, touch: true },
    ],
    lights: [
      { x: 232, y: 40, r: 84, a: 0.9, col: 'rgba(232,150,70,A)', tint: 0.5 },
      { x: 222, y: -36, r: 14, a: 0.8, col: 'rgba(255,200,120,A)' },
      { x: 120, y: -48, r: 40, a: 0.35, col: 'rgba(230,180,110,A)' },  // 단지 쪽 불빛이 담 너머로
      { x: 40, y: -40, r: 10, a: 0.5, col: 'rgba(230,190,120,A)' }, { x: 290, y: -44, r: 10, a: 0.5, col: 'rgba(230,190,120,A)' },
    ],
  },
  // 분리수거장 뒤. 가로등 빛이 벽에 잘려 반만 들어온다. 오른쪽 아래가 트여 있다.
  recycle: {
    grid: [
      'uuuuuuuuuuuuuu',
      'u:xx:xx:xxx::u',
      'u::::::::::::u',
      'u::::::::::::u',
      'u:::::::::::::',
      'u:::::::::::::',
      'uuuuuuuuuuuuuu',
    ],
    spawn: 'in', outdoor: true, painted: true, top: 40, view: 150,
    points: { in: [11, 4, 'left'], hide: [1, 2, 'down'], gate: [13, 4, 'left'] },
    objs: [],
    lights: [
      { x: 250, y: 70, r: 110, a: 0.85, col: 'rgba(232,150,70,A)', tint: 0.45 },  // 벽 밖의 가로등. 원의 반쪽만 들어온다.
      { x: 120, y: -26, r: 22, a: 0.3, col: 'rgba(120,140,190,A)' },
    ],
  },
};

export function tileAt(m: MapDef, x: number, y: number): [string, boolean] {
  const row = m.grid[y];
  if (!row || x < 0 || x >= row.length) return ['void', true];
  return LEGEND[row[x]] || ['void', true];
}
export function inObj(o: Obj, x: number, y: number): boolean {
  return x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1);
}
const DIRS: [Dir, number, number][] = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
export const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** from 에서 걸어서 닿는 모든 칸까지의 길 (너비 우선). blocked 는 사람이 서 있는 칸. */
export function flood(m: MapDef, from: [number, number], blocked: (x: number, y: number) => boolean = () => false): Map<string, string | null> {
  const prev = new Map<string, string | null>();
  const key = (x: number, y: number): string => `${x},${y}`;
  prev.set(key(from[0], from[1]), null);
  const q: [number, number][] = [[from[0], from[1]]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [, dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (prev.has(k) || tileAt(m, nx, ny)[1] || blocked(nx, ny)) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return prev;
}
export function pathTo(prev: Map<string, string | null>, x: number, y: number): [number, number][] | null {
  let k: string | null = `${x},${y}`;
  if (!prev.has(k)) return null;
  const out: [number, number][] = [];
  while (k) { const [a, b] = k.split(',').map(Number); out.unshift([a, b]); k = prev.get(k) ?? null; }
  return out;
}

/** 물건 o 를 쓰려면 설 수 있는 칸들: 밟는 자리면 그 칸, 조사하는 물건이면 맞닿은 칸과 바라볼 방향. */
export function standTiles(m: MapDef, o: Obj): [number, number, Dir][] {
  const out: [number, number, Dir][] = [];
  for (let y = o.y; y < o.y + (o.h || 1); y++) for (let x = o.x; x < o.x + (o.w || 1); x++) {
    if (o.touch) { if (!tileAt(m, x, y)[1]) out.push([x, y, 'down']); continue; }
    for (const [d, dx, dy] of DIRS) {
      const sx = x - dx, sy = y - dy; // (sx,sy) 에 서서 d 방향을 보면 (x,y) 를 본다
      if (!tileAt(m, sx, sy)[1] && !inObj(o, sx, sy)) out.push([sx, sy, d]);
    }
  }
  return out;
}

/** from 에서 물건 o 까지 가는 가장 짧은 길. 못 가면 null. */
export function routeTo(m: MapDef, from: [number, number], o: Obj, blocked?: (x: number, y: number) => boolean): { path: [number, number][]; face: Dir } | null {
  const prev = flood(m, from, blocked);
  let best: { path: [number, number][]; face: Dir } | null = null;
  for (const [x, y, d] of standTiles(m, o)) {
    const p = pathTo(prev, x, y);
    if (p && (!best || p.length < best.path.length)) best = { path: p, face: d };
  }
  return best;
}
