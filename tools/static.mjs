// 게임성 검사: 맵 없는 그림(정지 화면)에서 나오는 줄, 그리고 조작 없이 Z 만 누르는 가장 긴 구간을 센다.
// 정지 화면이라도 미니게임(# game:)이 걸려 있는 선택지 묶음은 조작으로 친다. 폰 화면(skin)도 따로 센다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { newPres, parseTags, applyTag } from '../src/pres.ts';
import { SCENES } from '../src/tables.ts';
const require = createRequire(import.meta.url);
const { Story } = require('inkjs');
const json = fs.readFileSync(new URL('../src/story.json', import.meta.url), 'utf8');
const runs = Number(process.argv[2] || 200);
const still = new Map(); // scene → 줄 수 (평균)
const runLen = new Map(); // knot → 가장 긴 Z 구간
const atOf = (c) => (c.tags || []).some((t) => /^(at|game):/.test(t.trim()));
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres(); let steps = 0; let run = 0, runKnot = '';
  for (;;) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      const { dirs } = parseTags(s.currentTags);
      for (const d of dirs) applyTag(p, d);
      if (!text) continue;
      const spec = SCENES[p.scene];
      if (!spec?.map && p.skin === 'none') { const k = `[${p.chapter}] ${p.scene}`; still.set(k, (still.get(k) || 0) + 1); }
      if (!run) runKnot = `[${p.chapter}] ${(s.state.currentPathString || '').split('.')[0]} «${text.slice(0, 24)}»`;
      run++;
    }
    const ch = s.currentChoices;
    if (!ch.length) break;
    const interactive = ch.some(atOf) || ch.length > 1;
    if (interactive) { if (run > (runLen.get(runKnot) || 0)) runLen.set(runKnot, run); run = 0; }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    const pick = (open.length ? open : ch)[Math.floor(Math.random() * (open.length || ch.length))];
    s.ChooseChoiceIndex(pick.index);
    if (++steps > 3000) break;
  }
  if (run > (runLen.get(runKnot) || 0)) runLen.set(runKnot, run);
}
let tot = 0;
console.log('== 정지 그림에서 나오는 줄 (판당 평균) ==');
[...still.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => { tot += n / runs; console.log((n / runs).toFixed(1).padStart(6), k); });
console.log('합계', tot.toFixed(1));
console.log('== 조작 없이 이어지는 가장 긴 구간 (줄) 상위 25 ==');
[...runLen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(String(n).padStart(5), k));
