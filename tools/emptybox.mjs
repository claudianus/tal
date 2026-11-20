// 걷는 선택지가 떴는데 글 상자가 비어 있는 자리 (앱 창을 닫은 직후, 장면이 바뀐 직후)를 찾는다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { newPres, parseTags, applyTag } from '../src/pres.ts';
const require = createRequire(import.meta.url);
const { Story } = require('inkjs');
const json = fs.readFileSync(new URL('../src/story.json', import.meta.url), 'utf8');
const hits = new Map();
const atOf = (c) => (c.tags || []).some((t) => /^at:/.test(t.trim()));
for (let r = 0; r < 150; r++) {
  const s = new Story(json); const p = newPres(); let since = 0, why = '';
  for (let k = 0; k < 3000; k++) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      const { dirs } = parseTags(s.currentTags);
      for (const d of dirs) { const before = p.skin + '|' + p.scene; applyTag(p, d); if (p.skin + '|' + p.scene !== before) { since = 0; why = d.name + ':' + d.val; } }
      if (text) since++;
    }
    const ch = s.currentChoices; if (!ch.length) break;
    if (ch.every(atOf) && since === 0) { const key = why + ' :: ' + ch.map((c) => c.text).join(' / '); hits.set(key, (hits.get(key) || 0) + 1); }

    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    s.ChooseChoiceIndex((open.length ? open : ch)[Math.floor(Math.random() * (open.length || ch.length))].index);
  }
}
for (const [k, n] of hits) console.log(String(n).padStart(4), k);
console.log('empty-box walk choices:', hits.size);
