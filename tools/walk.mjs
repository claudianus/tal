// 무작위로 여러 번 플레이하면서, 줄의 종류와 그때 열려 있는 화면(메신저·카톡·브라우저·통화)이 맞는지 본다.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { newPres, parseTags, applyTag } from '../src/pres.ts';
import { SCENES } from '../src/tables.ts';
import { MAPS, routeTo, tileAt, inObj, flood } from '../src/maps.ts';
const require = createRequire(import.meta.url);
const { Story } = require('inkjs');
const json = fs.readFileSync(new URL('../src/story.json', import.meta.url), 'utf8');

const want = { msg: ['messenger', 'kakao'], msg_me: ['messenger', 'kakao'], comment: ['browser'], call: ['call'], draft: ['kakao', 'messenger'] };
const odd = new Map();
const skinNarr = { none: 0, messenger: 0, kakao: 0, browser: 0, call: 0 };
const runs = Number(process.argv[2] || 300);
// 걸어 다니는 맵: 묶인 물건마다 지금 선 자리에서 걸어서 닿는지 본다.
const unreachable = new Map(); let walkSets = 0, menuOnMap = new Map();
const atOf = (c) => { for (const t of c.tags || []) { const m = /^at:\s*(\S+)/.exec(t.trim()); if (m) return m[1]; } return ''; };
for (let r = 0; r < runs; r++) {
  const s = new Story(json); const p = newPres(); let steps = 0;
  let mapId = '', pos = [0, 0];
  for (;;) {
    while (s.canContinue) {
      const text = s.Continue().trim();
      const { kind, dirs } = parseTags(s.currentTags);
      for (const d of dirs) {
        applyTag(p, d);
        const m = MAPS[SCENES[p.scene]?.map || ''];
        const id = SCENES[p.scene]?.map || '';
        if (id !== mapId) { mapId = id; if (m) pos = m.points[m.spawn].slice(0, 2); }
        if (m && (d.name === 'pos' || d.name === 'go') && m.points[d.val]) pos = m.points[d.val].slice(0, 2);
      }
      if (!text) continue;
      skinNarr[p.skin]++;
      if (want[kind] && !want[kind].includes(p.skin)) {
        const k = `[${p.chapter}] ${kind} @ skin=${p.skin} scene=${p.scene}: ${text.slice(0, 40)}`;
        odd.set(k, (odd.get(k) || 0) + 1);
      }
      if (kind === 'caption' && p.skin === 'none') { const k = `[${p.chapter}] caption @ none: ${text.slice(0, 40)}`; odd.set(k, (odd.get(k) || 0) + 1); }
    }
    const ch = s.currentChoices;
    if (!ch.length) break;
    const map = MAPS[mapId];
    if (map && p.skin === 'none') {
      const ats = ch.map(atOf);
      const ok = ats.every((a) => a && (a === 'move' || a === 'wait' || a === 'timeout' || map.objs.some((o) => o.id === a)));
      if (ok) {
        walkSets++;
        const blocked = (x, y) => Object.entries(p.npcs).some(([id, w]) => id !== 'catreal' && map.points[w] && map.points[w][0] === x && map.points[w][1] === y);
        for (const a of ats) {
          if (a === 'move' || a === 'wait' || a === 'timeout') continue;
          const rt = routeTo(map, pos, map.objs.find((o) => o.id === a), blocked);
          if (!rt) { const k = `[${p.chapter}] ${mapId} (${pos}) → ${a}`; unreachable.set(k, (unreachable.get(k) || 0) + 1); }
        }
      } else if (ats.some((a) => a)) { const k = `[${p.chapter}] ${mapId}: ${ats.join(',')}`; menuOnMap.set(k, (menuOnMap.get(k) || 0) + 1); }
    }
    const open = ch.filter((c) => !c.text.startsWith('(잠김)'));
    const pick = (open.length && Math.random() < 0.85 ? open : ch)[Math.floor(Math.random() * (open.length && Math.random() < 0.85 ? open.length : ch.length))] || ch[0];
    if (map && p.skin === 'none') { const a = atOf(pick); const o = map.objs.find((q) => q.id === a); if (o) { const rt = routeTo(map, pos, o); if (rt) pos = rt.path[rt.path.length - 1]; } }
    s.ChooseChoiceIndex(pick.index);
    if (++steps > 3000) { console.log('LOOP'); break; }
  }
}
console.log('lines per skin', skinNarr);
console.log('mismatches', odd.size);
[...odd.entries()].sort().forEach(([k, n]) => console.log(String(n).padStart(4), k));

console.log('walk-mode choice sets', walkSets, '· unreachable', unreachable.size, '· at-tags that fell back to a menu', menuOnMap.size);
[...unreachable.entries(), ...menuOnMap.entries()].sort().forEach(([k, n]) => console.log(String(n).padStart(4), k));
// 길목(z_ 로 시작하는 밟는 자리)은 맵을 둘로 갈라야 한다. 안 그러면 옆으로 돌아가서 대본을 건너뛴다.
// 맵 끝의 도착 자리(DEST)는 가를 필요가 없다.
const DEST = new Set(['playground.z_recycle', 'complex.z_play', 'party.z_center', 'party.z_edge', 'road.z_station', 'playground.z_slide', 'subway.z_corner', 'subway.z_seat', 'concourse.z_down', 'platform.z_line', 'restroom.z_out', 'funeral.z_back', 'store.z_out', 'grandma.z_gate']); // 사진 자리 둘은 가르지 않고 고르기만 한다
const leaks = [];
for (const [id, m] of Object.entries(MAPS)) for (const o of m.objs) {
  if (!o.touch || !o.id.startsWith('z_') || DEST.has(`${id}.${o.id}`)) continue;
  const sp = m.points[m.spawn];
  const prev = flood(m, [sp[0], sp[1]], (x, y) => inObj(o, x, y));
  let walk = 0;
  for (let y = 0; y < m.grid.length; y++) for (let x = 0; x < m.grid[y].length; x++) if (!tileAt(m, x, y)[1] && !inObj(o, x, y)) walk++;
  if (prev.size >= walk) leaks.push(`${id}.${o.id} 이 맵을 가르지 않는다 (돌아갈 수 있다)`);
}
console.log('gate leaks', leaks.length); leaks.forEach((l) => console.log('  ', l));
if (unreachable.size || leaks.length) process.exit(1);
