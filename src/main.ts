import './style.css';
import { setGameAuto, playGame } from './games.ts';
import { audioInit, setVolume } from './audio.ts';
import { Game, savedChapter, type Start } from './engine.ts';
import * as ui from './ui.ts';

const CHAPTERS = ['프롤로그 — 방', '1장 — 탈', '2장 — 무리', '3장 — 들킴', '막간 — 윤서', '4장 — 바닥'];
const ENDINGS: [string, string][] = [['A', '에필로그 — 전화'], ['B', '에필로그 — 탈'], ['C', '에필로그 — 남겨진 방']];

const game = new Game(document.getElementById('bg') as HTMLCanvasElement, document.getElementById('world') as HTMLCanvasElement);
(window as unknown as { tal: Game }).tal = game;
const q = new URLSearchParams(location.search);
if (q.has('fast')) { ui.setFast(true); ui.setUrlFast(true); }
if (q.has('auto')) { game.world.autopilot = true; setGameAuto(true); } // 검사용: 맵에서 알아서 걸어가 고른다

function begin(start: Start): void {
  audioInit();
  ui.el.menu.hidden = true;
  ui.setBlocked(false);
  game.run(start).catch((e) => { console.error(e); });
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

if (q.has('auto') || q.has('test')) Object.assign(window, { talBegin: begin, talGame: playGame });
if (q.has('test')) void import('./testkit.ts').then((m) => m.installKeyboardKit()); // 검사용: 원하는 장/엔딩에서 바로 시작

// 손가락으로 하는 기기: 키보드 안내 대신 화면의 패드와 Z 를 알려 준다
if (ui.DIR_KEY === '패드') {
  const note = document.querySelector('#menu .note');
  if (note) note.textContent = '화면을 누르면 넘어가고, 아래 패드로 걷고, Z 로 조사합니다 · 헤드폰을 권합니다' + (matchMedia('(orientation: portrait)').matches ? ' · 가로로 들면 그림이 더 크게 보입니다' : '');
}

// ── 시작 화면 ──
ui.setBlocked(true);
const btns = ui.el.menuBtns;
btns.appendChild(button('처음부터', () => begin({ mode: 'chapter', title: CHAPTERS[0] })));
const saved = savedChapter();
if (saved) btns.appendChild(button(`이어하기 · ${saved.split(' — ')[0]}`, () => begin({ mode: 'load' })));
// 장 고르기·엔딩 바로가기는 이야기를 미리 알려 준다. 개발 서버(npm run dev)에서만 보인다. 배포 빌드에는 없다.
if (import.meta.env.DEV) {
  const lab = document.createElement('div');
  lab.className = 'lab';
  lab.textContent = '장 고르기 (개발용)';
  btns.appendChild(lab);
  const row = document.createElement('div');
  row.className = 'row';
  CHAPTERS.forEach((c) => row.appendChild(button(c.split(' — ')[0], () => begin({ mode: 'chapter', title: c }))));
  btns.appendChild(row);
  const erow = document.createElement('div');
  erow.className = 'row';
  ENDINGS.forEach(([k, c]) => erow.appendChild(button(`엔딩 ${k}`, () => begin({ mode: 'chapter', title: c }))));
  btns.appendChild(erow);
}
// 엔딩 C 를 본 다음 한 번만 (기획서 10장)
try {
  if (localStorage.getItem(ui.AFTER_C)) {
    localStorage.removeItem(ui.AFTER_C);
    const once = document.createElement('p');
    once.className = 'once';
    once.textContent = '윤재에게는 닿지 않았던 것들이, 다시 하면 닿을 수도 있습니다.';
    btns.prepend(once);
  }
} catch { /* 저장이 막힌 브라우저 */ }

// ── 장면 경고 (시작 화면과 일시정지 메뉴 어디서든 켜고 끈다) ──
const warnBtns = [document.getElementById('warn-toggle'), ui.el.pause.querySelector('[data-act="warn"]')] as HTMLElement[];
function paintWarn(): void { for (const b of warnBtns) if (b) b.textContent = ui.warnOn() ? '장면 경고: 켜짐' : '장면 경고: 꺼짐'; }
document.getElementById('warn-toggle')?.addEventListener('click', () => { ui.setWarnOn(!ui.warnOn()); paintWarn(); });
paintWarn();

// ── 소리 크기: 보통 → 크게 → 끔 → 작게 → 보통 ──
const VOLS: [string, number][] = [['보통', 1], ['크게', 1.6], ['끔', 0], ['작게', 0.5]];
let vol = 0;
try { vol = Math.max(0, Math.min(VOLS.length - 1, Number(localStorage.getItem('tal.vol')) || 0)); } catch { /* */ }
function paintVol(): void { setVolume(VOLS[vol][1]); const b = ui.el.pause.querySelector('[data-act="mute"]'); if (b) b.textContent = `소리: ${VOLS[vol][0]}`; }
paintVol();

// ── 일시정지 ──
function togglePause(): void {
  if (!ui.el.menu.hidden || ui.helpOpen()) return; // 도움 안내 중에는 메뉴로 빠져나가지 못한다
  const open = ui.el.pause.hidden;
  ui.el.pause.hidden = !open;
  ui.setBlocked(open);
}
ui.el.menuBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePause(); });
ui.el.pause.addEventListener('click', (e) => {
  const act = (e.target as HTMLElement).closest('button')?.dataset.act;
  if (act === 'resume') togglePause();
  else if (act === 'mute') { vol = (vol + 1) % VOLS.length; paintVol(); try { localStorage.setItem('tal.vol', String(vol)); } catch { /* 저장이 막힌 브라우저 */ } } else if (act === 'warn') { ui.setWarnOn(!ui.warnOn()); paintWarn(); }
  else if (act === 'title') location.reload();
});
ui.bindInput({
  onMenu: togglePause,
  onDir: (d, down, repeat) => game.world.key(d, down, repeat),
  onAct: () => { game.world.act(); },
});
