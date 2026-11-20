// 대본에 쓰인 모든 태그 값이 src/tables.ts 에 있는지 확인한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as T from '../src/tables.ts';
import { MAPS } from '../src/maps.ts';

const allPoints = new Set(Object.values(MAPS).flatMap((m) => Object.keys(m.points)));
const allObjs = new Set(Object.values(MAPS).flatMap((m) => m.objs.map((o) => o.id)));

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'script');
const bad = [];
let n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ink'))) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//')) return;
    for (const raw of line.split('#').slice(1)) {
      const tag = raw.trim().replace(/\].*$/, '').trim(); // "[모니터를 본다 # at: monitor]" 의 닫는 괄호 뒤는 버린다
      if (!tag) continue;
      n++;
      const c = tag.indexOf(':');
      const name = (c < 0 ? tag : tag.slice(0, c)).trim();
      const val = c < 0 ? '' : tag.slice(c + 1).trim();
      const where = `${f}:${i + 1}  # ${tag}`;
      if (T.LINE_KINDS.includes(name)) continue;
      if (name === 'at') { if (!(val === 'move' || val === 'wait' || val === 'timeout' || allObjs.has(val))) bad.push(where + '  (맵에 없는 물건)'); continue; }
      if (!T.DIRECTIVES.includes(name)) { bad.push(where + '  (모르는 태그)'); continue; }
      const ok =
        name === 'scene' ? val in T.SCENES :
        name === 'sfx' ? val in T.SFX :
        name === 'cut' ? val in T.CUTS :
        name === 'ui' ? T.UI_TAGS.includes(val) || val.startsWith('server:') :
        name === 'emote' ? val.split(/\s+/)[0] in T.EMOTES :
        name === 'help' ? ['short', 'long'].includes(val) :
        name === 'suit' ? T.SUIT.includes(val) :
        name === 'posture' ? T.POSTURE.includes(val) :
        name === 'pov' ? T.POV.includes(val) :
        name === 'pos' || name === 'go' ? allPoints.has(val) :
        name === 'npc' ? (val.split(/\s+/)[1] === 'off' || allPoints.has(val.split(/\s+/)[1])) :
        name === 'pose' ? T.POSES.includes(val) :
        name === 'swing' ? allPoints.has(val.split(/\s+/)[0]) && T.SWINGS.includes(val.split(/\s+/)[1]) :
        name === 'carry' ? T.CARRY.includes(val) :
        name === 'room' ? T.ROOM_MARKS.includes(val) :
        name === 'warn' ? val === 'end' || val in T.WARNS :
        name === 'face' ? T.FACES.includes(val) :
        name === 'pause' ? !Number.isNaN(Number(val)) :
        name === 'timer' ? !Number.isNaN(Number(val)) :
        name === 'crowd' ? ['on', 'off'].includes(val) :
        name === 'train' ? ['arrive', 'open', 'close', 'leave', 'gone'].includes(val) :
        name === 'game' ? T.GAMES.includes(val.split(/\s+/)[0]) :
        name === 'views' ? /^[\d,]+$/.test(val) :
        true;
      if (!ok) bad.push(where + '  (표에 없는 값)');
    }
  });
}
// 자리 이름은 아무 맵에나 있으면 안 되고, 그 줄에서 보이는 장면의 맵에 있어야 한다.
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.ink'))) {
  let map = '';
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
    if (line.trim().startsWith('//')) return;
    const sc = line.match(/#\s*scene:\s*(\S+)/); if (sc) map = T.SCENES[sc[1]]?.map || '';
    const m = line.match(/#\s*(pos|go|npc):\s*(.+?)\s*$/); if (!m || !map) return;
    let v = m[2]; if (m[1] === 'npc') { v = v.split(/\s+/)[1]; if (v === 'off') return; }
    if (!MAPS[map].points[v]) bad.push(`${f}:${i + 1}  # ${m[1]}: ${v}  (${map} 맵에 없는 자리)`);
  });
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(`tags ok (${n})`);
