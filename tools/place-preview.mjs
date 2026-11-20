// 걷는 맵 그림 미리보기: node tools/place-preview.mjs <맵> <분위기> <낮 0|1> <out.png> [--grid] [look:dir:pose@점이름 ...]
// 그림(base)과 앞에 서는 것(props)과 사람을 발 순서대로 그린다. 빛과 어둠은 빼고 칠한 색 그대로 본다.
import { paintPlace } from '../src/art/places.ts';
import { MAPS } from '../src/maps.ts';
import { charFrame, CX, FOOT } from '../src/art/chars.ts';
import { Pix } from '../src/art/pix.ts';
import { writePng } from './png.mjs';
const [id, mood = 'night', day = '0', out = `/tmp/${id}.png`, ...rest] = process.argv.slice(2);
const m = MAPS[id]; if (!m) throw new Error('no map ' + id);
const pl = paintPlace(id, { day: day === '1', mood });
if (!pl) throw new Error('no painter for ' + id);
const top = m.top || 0, T = 16;
const img = new Pix(pl.base.w, pl.base.h);
img.blit(pl.base, 0, 0);
const items = pl.props.map((q) => ({ foot: q.foot, draw: () => img.blit(q.pix, q.x, q.y + top) }));
for (const a of rest.filter((r) => r.includes('@'))) {
  const [spec, where] = a.split('@'); const [kind, dir = 'down', pose = 'stand'] = spec.split(':');
  const pt = m.points[where]; if (!pt) { console.warn('no point', where); continue; }
  const f = charFrame({ kind }, dir, 0, pose);
  const bx = pt[0] * T, by = pt[1] * T - 6 + top;
  items.push({ foot: pt[1] * T + 13, draw: () => img.blit(f, bx + 8 - CX, by + 19 - FOOT + (pose === 'sit' ? -3 : 0)) });
}
items.sort((a, b) => a.foot - b.foot).forEach((d) => d.draw());
if (rest.includes('--grid')) for (let y = 0; y < m.grid.length; y++) for (let x = 0; x < m.grid[y].length; x++) {
  const blocked = m.grid[y][x] !== '.' && m.grid[y][x] !== ',' && m.grid[y][x] !== '_' && m.grid[y][x] !== ':' && m.grid[y][x] !== ';';
  for (let k = 0; k < T; k++) { img.set(x * T + k, y * T + top, blocked ? '#ff3030' : '#30ff60', 0.35); img.set(x * T, y * T + top + k, blocked ? '#ff3030' : '#30ff60', 0.35); }
}
writePng(out, img, 3);
console.log('wrote', out, img.w + 'x' + img.h);
