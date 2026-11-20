import fs from 'node:fs';
import { createRequire } from 'node:module';
const root='/Users/modumaru/Desktop/code/furrygame/';
const { newPres, parseTags, applyTag } = await import(root+'src/pres.ts');
const require = createRequire(root+'package.json');
const { Story } = require('inkjs');
const json = fs.readFileSync(root+'src/story.json', 'utf8');
const runs = 100;
const perCh = new Map(); const longest = new Map();
const gameOf = (c) => (c.tags || []).some((t) => /^(at|game):/.test(t.trim()));
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres(); let run = 0, key = '';
  for (let steps=0; steps<3000; steps++) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      for (const d of parseTags(s.currentTags).dirs) applyTag(p, d);
      if (!text) continue;
      if (p.skin !== 'none' && p.skin) { perCh.set(p.chapter, (perCh.get(p.chapter)||0)+1); if (!run) key = `[${p.chapter}] ${p.skin} ${(s.state.currentPathString||'').split('.')[0]} «${text.slice(0,20)}»`; run++; }
      else { if (run > (longest.get(key)||0)) longest.set(key, run); run = 0; }
    }
    const ch = s.currentChoices; if (!ch.length) break;
    if (ch.some(gameOf)) { if (run > (longest.get(key)||0)) longest.set(key, run); run = 0; }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    s.ChooseChoiceIndex((open.length?open:ch)[Math.floor(Math.random()*(open.length||ch.length))].index);
  }
}
console.log('phone lines per run by chapter'); for (const [k,v] of perCh) console.log((v/runs).toFixed(1).padStart(6), k);
console.log('longest phone runs w/o at/game'); [...longest.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([k,n])=>console.log(String(n).padStart(4),k));
