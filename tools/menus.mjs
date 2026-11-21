// 몸짓(↑↓←→·Z 한 키) 선택지가 지도 없는 장면에 떨어져 메뉴로 뜨는 곳을 찾는다.  node tools/menus.mjs [판 수]
// engine.choose 와 같은 조건: 지도가 떠 있어야 키로 고르고, 아니면 메뉴가 뜬다 (게임 선택지는 지도 없이도 된다).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const root = new URL('..', import.meta.url).pathname;
const { newPres, parseTags, applyTag } = await import(root + 'src/pres.ts');
const { SCENES } = await import(root + 'src/tables.ts');
const { Story } = createRequire(root + 'package.json')('inkjs');
const json = fs.readFileSync(root + 'src/story.json', 'utf8');
const KEYED = new Set(['move', 'wait', 'timeout', 'up', 'down', 'left', 'right']);
const atOf = (c) => (c.tags || []).map((t) => /^at:\s*(\S+)/.exec(t.trim())?.[1]).find(Boolean);
const game = (c) => (c.tags || []).some((t) => /^game:/.test(t.trim()));
const bad = new Map(); const runs = Number(process.argv[2] || 200);
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres();
  for (let steps = 0; steps < 3000; steps++) {
    while (s.canContinue) { s.Continue(); for (const d of parseTags(s.currentTags).dirs) applyTag(p, d); }
    const ch = s.currentChoices; if (!ch.length) break;
    if (!ch.some(game) && ch.every((c) => KEYED.has(atOf(c))) && !SCENES[p.scene]?.map) {
      const k = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} «${ch.map((c) => c.text).join(' / ')}» scene=${p.scene}`;
      bad.set(k, (bad.get(k) || 0) + 1);
    }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    s.ChooseChoiceIndex((open.length ? open : ch)[Math.floor(Math.random() * (open.length || ch.length))].index);
  }
}
for (const [k, n] of bad) console.log(String(n).padStart(4), k);
console.log(`지도 없는 몸짓: ${bad.size} 곳`);
