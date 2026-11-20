// '그림 한 장에 글만' 검사. 줄마다 화면이 걸어 다니는 맵인지(map), 휴대폰·모니터·컷·맵 없는 장면인지(still) 가른다.
// 1) 메뉴만 있는 선택지 묶음(at·game 이 하나도 없는 것)을 전부 적는다.
// 2) still 화면에서 게임 없이 이어진 줄 수 (가장 긴 것)를 장마다 센다.
// 3) 행동을 걷기(at: 물건) · 누르기(at: wait/move/timeout) · 게임으로 나눠 센다.
// node tools/screens.mjs [판 수] [목록 개수]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const root = new URL('..', import.meta.url).pathname;
const { newPres, parseTags, applyTag } = await import(root + 'src/pres.ts');
const { SCENES } = await import(root + 'src/tables.ts');
const require = createRequire(root + 'package.json');
const { Story } = require('inkjs');
const json = fs.readFileSync(root + 'src/story.json', 'utf8');
const runs = Number(process.argv[2] || 200), top = Number(process.argv[3] || 30);
const kindOf = (c) => { for (const t of c.tags || []) { const m = /^(at|game):\s*(\S+)/.exec(t.trim()); if (m) return m[1] === 'game' ? 'game' : /^(wait|move|timeout)$/.test(m[2]) ? 'press' : /^(up|down|left|right)$/.test(m[2]) ? 'gesture' : 'walk'; } return ''; };
const per = new Map(); // 장 → { lines, still, walk, press, game, maxStill }
const plain = new Map(); // 메뉴만 있는 묶음 → { ch, n }
const stillRuns = new Map(); // 시작 자리 → 가장 긴 still 줄 수
const mixed = new Map(); // 방향키 몸짓과 물건이 섞인 묶음
const get = (c) => { if (!per.has(c)) per.set(c, { lines: 0, still: 0, walk: 0, gesture: 0, press: 0, game: 0, maxStill: 0 }); return per.get(c); };
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres(); let run = 0, key = '';
  const close = () => { if (run) { const st = get(p.chapter); if (run > st.maxStill) st.maxStill = run; if (run > (stillRuns.get(key) || 0)) stillRuns.set(key, run); } run = 0; };
  for (let steps = 0; steps < 3000; steps++) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      for (const d of parseTags(s.currentTags).dirs) applyTag(p, d);
      if (!text) continue;
      const cut = p.cine > 0; if (p.cine > 0) p.cine--; // 엔진처럼: 컷은 다섯 줄 동안만 남는다
      const st = get(p.chapter); st.lines++;
      const onMap = p.skin === 'none' && !cut && !!SCENES[p.scene]?.map;
      if (onMap) { close(); continue; }
      // 휴대폰(메신저·카톡·브라우저)은 줄마다 엄지로 ↓ 를 내려야 넘어간다: 그림 위의 글이 아니라 스크롤이다
      if (['messenger', 'kakao', 'browser'].includes(p.skin) && !cut) { st.scroll = (st.scroll || 0) + 1; close(); continue; }
      st.still++;
      if (!run) key = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} «${text.slice(0, 16)}» (${p.skin !== 'none' ? p.skin : cut ? 'cut' : 'no-map:' + p.scene})`;
      run++;
    }
    const ch = s.currentChoices; if (!ch.length) break;
    // 실제로 키·걷기로 고를 수 있는지: 맵이 있는 장면이어야 하고, 휴대폰·모니터를 든 채라면 키 하나짜리(몸짓·Z)만 된다
    const KEYED = /^(move|wait|timeout|up|down|left|right)$/;
    const ats = ch.map((c) => { for (const t of c.tags || []) { const m = /^at:\s*(\S+)/.exec(t.trim()); if (m) return m[1]; } return ''; });
    const hasMap = !!SCENES[p.scene]?.map;
    const walkable = ats.every((a) => a) && new Set(ats).size === ats.length && hasMap && (p.skin === 'none' || ats.every((a) => KEYED.test(a)));
    // 걸어 다니는 맵에서 방향키·move 몸짓과 물건이 한 묶음이면, 물건으로 걸어가려고 누른 방향키가 몸짓으로 먼저 잡힌다
    if (walkable && p.skin === 'none' && ats.some((a) => /^(move|up|down|left|right)$/.test(a)) && ats.some((a) => !KEYED.test(a))) { const id = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} : ${ch.map((c, i) => c.text.slice(0, 12) + '@' + ats[i]).join(' / ')}`; mixed.set(id, (mixed.get(id) || 0) + 1); }
    const kinds = ch.map(kindOf);
    const k = kinds.includes('game') ? 'game' : walkable ? kinds.find((x) => x) : '';
    if (k) { close(); get(p.chapter)[k]++; }
    else { const id = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} : ${ch.map((c) => c.text.slice(0, 14)).join(' / ')}`; const o = plain.get(id) || { ch: p.chapter, n: 0, texts: ch.map((c) => c.text), scene: p.scene, skin: p.skin }; o.n++; plain.set(id, o); }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    s.ChooseChoiceIndex((open.length ? open : ch)[Math.floor(Math.random() * (open.length || ch.length))].index);
  }
  close();
}
console.log('장            줄/판  ↓스크롤줄  still줄/판  걷기  몸짓  Z·시간  게임  (판당)  가장 긴 still');
for (const [c, v] of per) console.log(`  ${c.padEnd(14)} ${(v.lines / runs).toFixed(0).padStart(4)} ${((v.scroll || 0) / runs).toFixed(0).padStart(8)} ${(v.still / runs).toFixed(0).padStart(8)} ${(v.walk / runs).toFixed(1).padStart(6)} ${(v.gesture / runs).toFixed(1).padStart(5)} ${(v.press / runs).toFixed(1).padStart(6)} ${(v.game / runs).toFixed(1).padStart(5)} ${String(v.maxStill).padStart(12)}`);
const pl = [...plain.keys()];
console.log(`\n메뉴만 있는 선택지 묶음: ${pl.length}개`);
pl.slice(0, top).forEach((k) => console.log('  ' + k));
console.log(`\n방향키 몸짓과 물건이 섞인 묶음: ${mixed.size}개`);
[...mixed.keys()].slice(0, top).forEach((k) => console.log('  ' + k));
console.log('\n가장 긴 still 구간');
[...stillRuns.entries()].sort((a, b) => b[1] - a[1]).slice(0, top).forEach(([k, n]) => console.log(String(n).padStart(4), k));
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify([...plain.values()], null, 1));
