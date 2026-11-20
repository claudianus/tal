// 무작위 플레이 N회. 끝까지 가는지, 4장 끝의 연결·남은 힘 분포, 엔딩 비율, 핵심 줄이 보인 비율을 센다.
// node tools/sim.mjs 3000 [policy]   policy: random(기본) / withdraw / reach / spent
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Story } = require('inkjs');
const json = fs.readFileSync(new URL('../src/story.json', import.meta.url), 'utf8');
const runs = Number(process.argv[2] || 300), policy = process.argv[3] || 'random';
const KEYS = { // 4장에서 반드시 보여야 하는 줄
  photo: '문옥례.', er: '동네 쪽팔리게.', table: '넷 다 안다. 넷 다 한 번도 말한 적 없다.', father: '아버지가 할머니를 엄마라고 부른다.',
  father2: '아버지가 누군가를 엄마라고 부른다.', toto: '나도 매일 아침에 출근하는 게 기적이야', box: '삼색이.', gom: '곰표: 월요일에 자리를 옮겼어요. 창구 말고 안쪽 자리',
  note: '꿰맨 자리가 제일 튼튼해요. — 실밥', sew: '박음질은 그때 배웠다.', son: '나: 나비 아들이요.', bank: '이백팔십만 원이었다.', reveal: '처음부터 같은 목소리였다.',
  haeun: '그네 하나가 흔들린다. 작은 그림자가 앉아 있다.', typing: '입력 중…',
};
const EKEYS = { // 에필로그: 그 엔딩에서 반드시 보여야 하는 줄
  A: { yes: '나: 응.', name: '나: 남윤재요.', book: '예약이 완료되었습니다', ring: '신호가 간다.' },
  B: { thread: '등을 따라 주황 실이 지나간다', toto: '토토: 삼색이님은 밤에 나가요?', loop: '그 자리에서 또 뒤로 한 땀.' },
  C: { name: '故 남윤재', money: '만 원을 다시 집는다', one: '1이 그대로 있다.', tie: '넥타이를 고친다', gom: '한 글자씩 지운다.', wave: '하은이 빈 그네 쪽으로 손을 흔든다.', room: '책상 위의 머리. 처진 한쪽 귀.' },
};
const eseen = { A: {}, B: {}, C: {} };
let cBad = 0, noHelp = 0;
const seen = Object.fromEntries(Object.keys(KEYS).map((k) => [k, 0]));
const conn = [], str = [], end = { A: 0, B: 0, C: 0 };
let used = new Map(); globalThis.__inCh4 = false;
const pickBy = (s, cs) => {
  const txt = cs.map((c) => c.text);
  const want = (re) => txt.findIndex((t) => re.test(t) && !t.startsWith('(잠김)') && (used.get(t) || 0) < 3);
  if (policy !== 'random') {
    const inCh4 = String(s.variablesState.energy) === '2' || true;
    if (policy === 'withdraw') { const i = want(/화면을 끈다|엎어 둔다|눕는다|누워 있는다|그냥 둔다|읽기만|보내지 않는다|읽음만|화면을 끈|닫는다/); if (i >= 0) return i; }
    if (policy === 'reach') { const i = want(/답장|보낸다|^연다|상자를 연다|꿰맨다|먹는다|일어난다|놀이터|열어|씻|나간다|간다/); if (i >= 0) return i; }
    if (policy === 'spent') { // 사람에게는 닿지만 몸은 움직이지 않는다
      let i = want(/답장|보낸다|^연다|다시 편다|창을 닫는다/); if (i >= 0) return i;
      i = want(/눕는다|누워 있는다|그냥 둔다|머리를 본다/); if (i >= 0) return i;
    }
  }
  const ok = cs.map((c, i) => i).filter((i) => !txt[i].startsWith('(잠김)'));
  const pool = ok.length ? ok : cs.map((c, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
};
let fails = 0;
for (let r = 0; r < runs; r++) {
  const s = new Story(json); let steps = 0, text = ''; used = new Map();
  const got = new Set(); let inC = false, helped = false;
  try {
    for (;;) {
      while (s.canContinue) {
        const line = s.Continue().trim(); globalThis.__last = (globalThis.__last || []).slice(-3).concat(line); if ((s.currentTags || []).some((t) => t.includes('4장 — 바닥'))) globalThis.__inCh4 = true;
        for (const [k, v] of Object.entries(KEYS)) if (line.includes(v)) got.add(k);
        const tg = s.currentTags || [];
        if (tg.some((t) => t.includes('에필로그 — 남겨진 방'))) inC = true;
        if (tg.some((t) => /^\s*help:/.test(t))) helped = true;
        if (inC && tg.some((t) => t.trim() === 'voice')) { cBad++; console.error('C voice:', line); }
        for (const e of Object.values(EKEYS)) for (const [k, v] of Object.entries(e)) if (line.includes(v)) got.add('e_' + k + '_' + v);
        if (line.includes('곰표의 창에는')) {}
      }
      if (s.currentChoices.length === 0) break;
      // 엔딩 C 에는 고르는 일이 없다. 빈자리의 시선이 다가가는 것(장소 하나에 묶인 선택지 하나)만 있다.
      if (inC && !(s.currentChoices.length === 1 && (s.currentChoices[0].tags || []).some((t) => /^\s*at:/.test(t)))) { cBad++; console.error('C choice:', s.currentChoices.map((c) => c.text)); }
      if (++steps > 20000) throw new Error('loop');
      // 4장 마지막 선택 직전의 값
      if (s.currentChoices.some((c) => c.text.includes('놀이터에 간다')) && !got.has('_final')) { got.add('_final'); conn.push(s.variablesState.connection); str.push(s.variablesState.strength); }
      { const i = pickBy(s, s.currentChoices); const t = s.currentChoices[i].text; used.set(t, (used.get(t) || 0) + 1); s.ChooseChoiceIndex(i); }
    }
    if (!got.has('_final')) { conn.push(s.variablesState.connection); str.push(s.variablesState.strength); }
    const en = s.variablesState.ending || 'C';
    end[en]++;
    if (!helped) noHelp++;
    for (const [k, v] of Object.entries(EKEYS[en])) if (got.has('e_' + k + '_' + v)) eseen[en][k] = (eseen[en][k] || 0) + 1;
    for (const k of got) if (k in seen) seen[k]++;
  } catch (e) { fails++; if (fails < 3) console.error('FAIL after', JSON.stringify(globalThis.__last), String(e.message).slice(0, 200)); }
}
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const desc = (a) => `최소 ${Math.min(...a)} · 하위10% ${q(a, 0.1)} · 중앙값 ${q(a, 0.5)} · 상위10% ${q(a, 0.9)} · 최대 ${Math.max(...a)}`;
console.log(`runs ${runs} (${policy}) · 실패 ${fails}`);
console.log('연결   ', desc(conn));
console.log('남은 힘', desc(str));
console.log('엔딩    A', end.A, ' B', end.B, ' C', end.C);
console.log('보인 비율', Object.entries(seen).map(([k, v]) => `${k} ${Math.round((v / (runs - fails)) * 100)}%`).join(' · '));
for (const en of ['A', 'B', 'C']) if (end[en]) console.log(`엔딩 ${en} 줄`, Object.keys(EKEYS[en]).map((k) => `${k} ${Math.round(((eseen[en][k] || 0) / end[en]) * 100)}%`).join(' · '));
console.log(`엔딩 C 안의 목소리·선택지 ${cBad} · 도움 안내 없이 끝난 판 ${noHelp}`);
