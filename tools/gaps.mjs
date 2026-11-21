// 걷기(at)나 미니게임(game) 없이 이어지는 줄 수. 화면 종류(맵·휴대폰·컷)와 메뉴 선택은 따지지 않는다.
// 메뉴만 고르며 그림 위로 글이 흐르는 구간도 '소설 모드'로 센다.  node tools/gaps.mjs [판 수]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const root = new URL('..', import.meta.url).pathname;
const { newPres, parseTags, applyTag } = await import(root + 'src/pres.ts');
const { SCENES, CUTS } = await import(root + 'src/tables.ts');
// 걸으며 듣기: 지도가 떠 있고, 앱·컷이 없고, 서 있으면 대사 중에도 방향키로 걷는다 (engine.roamable 과 같은 조건)
const roam = (p, cut) => !!SCENES[p.scene]?.map && p.skin === 'none' && !cut; // 누우면 돌아눕고, 앉으면 고개를 돌리고, 엔딩 C 에선 떠돈다
const require = createRequire(root + 'package.json');
const { Story } = require('inkjs');
const json = fs.readFileSync(root + 'src/story.json', 'utf8');
const runs = Number(process.argv[2] || 200);
const act = (c) => (c.tags || []).some((t) => /^(at|game):/.test(t.trim()));
const worst = new Map(), ends = new Map(), chMax = new Map(), acts = new Map(), lines = new Map();
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres(); let run = 0, key = '', start = '', last = '', frame = false;
  const close = () => { if (run > (worst.get(key) || 0)) { worst.set(key, run); ends.set(key, last); } if (run > (chMax.get(p.chapter) || 0)) chMax.set(p.chapter, run); run = 0; };
  for (let steps = 0; steps < 3000; steps++) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      for (const d of parseTags(s.currentTags).dirs) { applyTag(p, d); if (d.name === 'cut' && CUTS[d.val]?.k === 'frame') frame = true; }
      if (!text) continue;
      lines.set(p.chapter, (lines.get(p.chapter) || 0) + 1);
      if (!run) key = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} «${text.slice(0, 18)}»`;
      const cut = p.cine > 0; if (p.cine > 0) p.cine--; const framed = frame; if (p.cine === 0) frame = false;
      if (!process.env.NOROAM && roam(p, cut)) { close(); acts.set(p.chapter, (acts.get(p.chapter) || 0) + 1); continue; }
      // 엔진과 같은 조건으로 손이 살아 있는 줄: 휴대폰 화면은 ↓ 로 내린다 (컷이 떠도), 통화는 ←→ 로 귀에서 뗀다, 컷 그림은 방향키로 들여다본다
      // 그림이 있는 컷은 들여다보고, 그림 없는 컷은 지도 위에서 눈을 돌린다 (지도도 그림도 없으면 손이 없다)
      const hand = ['messenger', 'kakao', 'browser'].includes(p.skin) || p.skin === 'call' || (cut && p.skin === 'none' && (framed || !!SCENES[p.scene]?.map));
      if (hand && !process.env.NOHAND) { close(); acts.set(p.chapter, (acts.get(p.chapter) || 0) + 1); continue; }
      run++; last = `${(s.state.currentPathString || '').split('.')[0]} «${text.slice(0, 14)}»`;
    }
    const ch = s.currentChoices; if (!ch.length) break;
    if (ch.some(act)) { close(); acts.set(p.chapter, (acts.get(p.chapter) || 0) + 1); }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    s.ChooseChoiceIndex((open.length ? open : ch)[Math.floor(Math.random() * (open.length || ch.length))].index);
  }
  close();
}
console.log('장별: 줄/판 · 행동/판 · 행동 하나당 줄 · 가장 긴 무행동 구간');
for (const [c, n] of lines) console.log(`  ${c.padEnd(14)} ${(n / runs).toFixed(0).padStart(4)} ${((acts.get(c) || 0) / runs).toFixed(1).padStart(6)} ${(n / Math.max(1, acts.get(c) || 0)).toFixed(1).padStart(6)} ${String(chMax.get(c) || 0).padStart(5)}`);
console.log('가장 긴 무행동 구간'); [...worst.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[3] || 20)).forEach(([k, n]) => console.log(String(n).padStart(4), k, process.env.END ? '→ ' + ends.get(k) : ''));
