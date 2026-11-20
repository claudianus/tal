import './style.css';
import { setGameAuto } from './games.ts';
import { audioInit, isMuted, setMuted } from './audio.ts';
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

if (q.has('auto') || q.has('test')) (window as unknown as { talBegin: typeof begin }).talBegin = begin; // 검사용: 원하는 장/엔딩에서 바로 시작

// ── 시작 화면 ──
ui.setBlocked(true);
const btns = ui.el.menuBtns;
btns.appendChild(button('처음부터', () => begin({ mode: 'chapter', title: CHAPTERS[0] })));
const saved = savedChapter();
if (saved) btns.appendChild(button(`이어하기 · ${saved.split(' — ')[0]}`, () => begin({ mode: 'load' })));
const lab = document.createElement('div');
lab.className = 'lab';
lab.textContent = '장 고르기 (앞 장의 선택은 무작위로 채워집니다)';
btns.appendChild(lab);
const row = document.createElement('div');
row.className = 'row';
CHAPTERS.forEach((c) => row.appendChild(button(c.split(' — ')[0], () => begin({ mode: 'chapter', title: c }))));
btns.appendChild(row);
// 엔딩 바로가기는 결말을 미리 알려 준다. 개발 서버(npm run dev)에서만 보인다. 배포 빌드에는 없다.
if (import.meta.env.DEV) {
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
  else if (act === 'mute') {
    setMuted(!isMuted());
    (e.target as HTMLElement).textContent = isMuted() ? '소리 켜기' : '소리 끄기';
  } else if (act === 'warn') { ui.setWarnOn(!ui.warnOn()); paintWarn(); }
  else if (act === 'title') location.reload();
});
ui.bindInput({
  onMenu: togglePause,
  onDir: (d, down, repeat) => game.world.key(d, down, repeat),
  onAct: () => { game.world.act(); },
});
