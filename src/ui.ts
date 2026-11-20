// 대화창, 선택창, 휴대폰·모니터 화면, 화면 구석. DOM 으로 그린다.
import { blip, sfx } from './audio.ts';
import { drawFrame } from './scene.ts';
import type { Dir } from './maps.ts';
import type { Pres } from './pres.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export const el = {
  stage: $('stage'), col: $('col'), head: $('dev-head'), flow: $('flow'), choices: $('choices'),
  ghosts: $('ghosts'), clock: $('clock'), views: $('views'), card: $('card'),
  gEnergy: $('g-energy'), gHeat: $('g-heat'), gGaze: $('g-gaze'), who: $('who'),
  menu: $('menu'), menuBtns: $('menu-btns'), pause: $('pausemenu'), menuBtn: $('menu-btn'),
  win: $('win'), winName: $('win-name'), winBody: $('win-body'), winChoices: $('winchoices'),
  pics: $('pics'), hint: $('hint'), bg: $('bg'),
};

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── 넘기기 ──
let fast = false;          // 빨리 감기 (확인용: Ctrl 을 누르고 있으면 켜진다)
let typing = false;        // 글자가 찍히는 중
let skipTyping = false;
let waiter: (() => void) | null = null;
let blocked = false;       // 메뉴가 떠 있다

export function setFast(f: boolean): void { fast = f; }
export function isFast(): boolean { return fast; }
export function setBlocked(b: boolean): void { blocked = b; }

function advance(): boolean {
  if (blocked) return false;
  if (typing) { skipTyping = true; return true; }
  if (waiter) { const w = waiter; waiter = null; el.stage.classList.remove('more'); w(); return true; }
  return false;
}
export function waitAdvance(): Promise<void> {
  if (fast) return sleep(8);
  el.stage.classList.add('more');
  return new Promise((r) => { waiter = r; });
}

// ── 선택창 ──
type Menu = { n: number; cur: number; pick: (i: number) => void; cancel: (() => void) | null; box: HTMLElement };
let menu: Menu | null = null;
function setCursor(i: number): void {
  if (!menu) return;
  menu.cur = (i + menu.n) % menu.n;
  [...menu.box.children].forEach((b, k) => b.classList.toggle('sel', k === menu!.cur));
  blip('type');
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};
export type Hooks = { onMenu: () => void; onDir: (d: Dir, down: boolean, repeat: boolean) => void; onAct: () => void };
/** 미니게임이 돌고 있으면 방향키와 Z 를 전부 가져간다 (누를 때와 뗄 때 모두). */
export type GameKey = Dir | 'z';
let gameKeys: ((k: GameKey, down: boolean, repeat: boolean) => void) | null = null;
export function setGameKeys(f: typeof gameKeys): void { gameKeys = f; }

export function bindInput(h: Hooks): void {
  el.stage.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('button') || t.closest('#menu') || t.closest('#pausemenu')) return;
    advance();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control') { fast = true; advance(); return; }
    if (e.key === 'Escape' && !(menu && menu.cancel)) { h.onMenu(); return; }
    if (blocked) return;
    const dir = KEY_DIR[e.key];
    const ok = e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z';
    if (dir || ok) e.preventDefault();
    if (gameKeys && !menu) { if (dir) gameKeys(dir, true, e.repeat); else if (ok) gameKeys('z', true, e.repeat); return; }
    if (menu) {
      if (dir === 'up') setCursor(menu.cur - 1);
      else if (dir === 'down') setCursor(menu.cur + 1);
      else if (ok && !e.repeat) menu.pick(menu.cur);
      else if ((e.key === 'x' || e.key === 'X' || e.key === 'Escape') && menu.cancel) menu.cancel();
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= menu.n) menu.pick(Number(e.key) - 1);
      return;
    }
    if (dir) { if (!typing && !waiter) h.onDir(dir, true, e.repeat); return; }
    if (ok && !e.repeat) { if (!advance()) h.onAct(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control') fast = false;
    const dir = KEY_DIR[e.key];
    if (gameKeys) { if (dir) gameKeys(dir, false, false); else if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') gameKeys('z', false, false); }
    if (dir) h.onDir(dir, false, false);
  });
  // 터치 화면: 방향 패드와 Z. 누르고 있는 동안 걷는다.
  document.querySelectorAll<HTMLButtonElement>('#pad [data-dir]').forEach((b) => {
    const d = b.dataset.dir as Dir;
    const up = (e: Event): void => { e.preventDefault(); b.classList.remove('on'); if (gameKeys) gameKeys(d, false, false); h.onDir(d, false, false); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (blocked) return;
      if (gameKeys && !menu) { b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } gameKeys(d, true, false); return; }
      if (typing || waiter) return;
      if (menu) { if (d === 'up') setCursor(menu.cur - 1); else if (d === 'down') setCursor(menu.cur + 1); return; }
      try { b.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ }
      b.classList.add('on'); h.onDir(d, true, false);
    });
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('click', (e) => e.stopPropagation());
  });
  const z = document.getElementById('pad-z');
  z?.addEventListener('pointerup', (e) => { e.preventDefault(); if (gameKeys) gameKeys('z', false, false); });
  z?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (blocked) return;
    if (gameKeys && !menu) { gameKeys('z', true, false); return; }
    if (menu) { menu.pick(menu.cur); return; }
    if (!advance()) h.onAct();
  });
  z?.addEventListener('click', (e) => e.stopPropagation());
}

// ── 줄 ──
const TYPED = new Set(['narr', 'fail', 'voice', 'say', 'door', 'wall', 'call', 'draft']);
const NAMED = new Set(['msg', 'msg_me', 'say', 'door', 'wall', 'call', 'comment']);
let lastMsgWho = '';
let pageKey = '';

const onPhone = (): boolean => el.col.dataset.skin !== 'none';
function scrollDown(): void { el.flow.scrollTop = el.flow.scrollHeight; }
function uncur(root: HTMLElement): void { root.querySelectorAll('.cur').forEach((n) => n.classList.remove('cur')); }

export function clearFlow(): void {
  el.flow.querySelectorAll('.ln, .frame').forEach((n) => n.remove());
  el.winBody.innerHTML = ''; el.winName.textContent = ''; el.winName.classList.remove('on'); el.win.classList.remove('on');
  el.pics.innerHTML = '';
  lastMsgWho = ''; pageKey = '';
}
/** 걷기 시작하면 대화창이 물러난다 */
export function fadeWin(): void { el.win.classList.remove('on'); pageKey = ''; }

async function type(target: HTMLElement, body: string, kind: string, after: () => void): Promise<void> {
  if (!TYPED.has(kind) || fast) { target.textContent = body; after(); return; }
  typing = true; skipTyping = false;
  const step = kind === 'draft' ? 85 : kind === 'voice' ? 46 : 22;
  const chars = Array.from(body);
  for (let i = 0; i < chars.length; i++) {
    if (skipTyping || fast) { target.textContent = body; break; }
    target.textContent += chars[i];
    if (i % 6 === 0) after();
    if (kind === 'draft') blip('type');
    const ch = chars[i];
    await sleep(ch === '.' || ch === '…' || ch === '?' ? step * 7 : ch === ',' ? step * 4 : step);
  }
  typing = false; skipTyping = false;
  after();
}

export async function line(kind: string, text: string, opts: { instant?: boolean; me?: string } = {}): Promise<void> {
  let who = '';
  let body = text;
  if (NAMED.has(kind)) {
    const m = /^([^:：]{1,14}):\s?(.*)$/.exec(text);
    if (m) { who = m[1]; body = m[2]; }
  }
  const p = document.createElement('p');
  p.className = `ln ${kind} cur`;
  const k = opts.instant ? 'instant' : kind;

  if (onPhone()) {
    // 휴대폰·모니터 화면 안
    if (kind === 'call' && who && who === opts.me) p.classList.add('me');
    if (kind === 'msg') { if (who && who === lastMsgWho) p.classList.add('same'); lastMsgWho = who; } else lastMsgWho = '';
    if (who && kind !== 'msg_me') { const w = document.createElement('span'); w.className = 'who'; w.textContent = who; p.appendChild(w); }
    const target = p.appendChild(Object.assign(document.createElement('span'), { className: kind === 'msg' || kind === 'msg_me' ? 'bubble' : '' }));
    uncur(el.flow);
    el.flow.appendChild(p);
    const kids = el.flow.children;
    while (kids.length > 70) kids[1].remove(); // [0] 은 spacer
    if (kind === 'msg') blip('in'); else if (kind === 'msg_me') blip('out');
    await type(target, body, k, scrollDown);
    return;
  }

  // 대화창. 같은 사람의 말은 석 줄까지 쌓이고, 말하는 사람이 바뀌면 새 장이 된다.
  const key = who ? `${kind}:${who}` : kind === 'system' ? 'system' : 'narr';
  if (key !== pageKey) { el.winBody.innerHTML = ''; pageKey = key; }
  while (el.winBody.children.length >= 3) el.winBody.firstElementChild!.remove();
  el.winName.textContent = who ? who + (kind === 'door' ? ' · 문 너머' : kind === 'wall' ? ' · 벽 너머' : '') : '';
  el.winName.classList.toggle('on', !!who);
  el.win.dataset.kind = kind;
  uncur(el.winBody);
  const target = p.appendChild(document.createElement('span'));
  el.winBody.appendChild(p);
  el.win.classList.add('on');
  await type(target, body, k, () => {});
}

export function frame(art: string, label?: string): void {
  const d = document.createElement('div'); d.className = ['group', 'video', 'video_face', 'thumbnail', 'bear', 'album', 'portrait'].includes(art) ? 'frame px' : 'frame'; // 도트 그림은 흐리지 않게 키운다
  const cv = document.createElement('canvas'); cv.width = 480; cv.height = art === 'paper' || art === 'card' ? 300 : 270;
  d.appendChild(cv); drawFrame(cv, art);
  if (label) { const l = document.createElement('span'); l.className = 'lbl'; l.textContent = label; d.appendChild(l); }
  if (onPhone()) { el.flow.appendChild(d); scrollDown(); } else { el.pics.innerHTML = ''; el.pics.appendChild(d); }
}

const LOCK = '(잠김)';
/** 선택창. cancel 이 켜져 있으면 X 로 물러날 수 있고, 그때는 -1 을 돌려준다. */
export function choose(texts: string[], opts: { cancel?: boolean } = {}): Promise<number> {
  return new Promise((resolve) => {
    const box = onPhone() ? el.choices : el.winChoices;
    box.innerHTML = '';
    el.stage.classList.remove('more');
    let done = false;
    const end = (i: number): void => { menu = null; box.innerHTML = ''; box.classList.remove('on'); resolve(i); };
    const pick = (i: number): void => {
      if (done || blocked) return;
      done = true;
      const b = box.children[i] as HTMLElement;
      if (b.classList.contains('locked')) { b.classList.add('nope'); blip('lock'); setTimeout(() => end(i), 340); }
      else { blip('in'); end(i); }
    };
    texts.forEach((raw, i) => {
      const locked = raw.startsWith(LOCK);
      const b = document.createElement('button');
      b.className = 'ch' + (locked ? ' locked' : '');
      if (locked) b.appendChild(Object.assign(document.createElement('span'), { className: 'lk' }));
      b.appendChild(document.createTextNode(locked ? raw.slice(LOCK.length).trim() : raw));
      b.setAttribute('aria-disabled', String(locked));
      b.addEventListener('click', (e) => { e.stopPropagation(); pick(i); });
      b.addEventListener('mouseenter', () => { if (menu && menu.cur !== i) { menu.cur = i; [...box.children].forEach((x, n) => x.classList.toggle('sel', n === i)); } });
      box.appendChild(b);
    });
    box.classList.add('on');
    menu = { n: texts.length, cur: 0, pick, cancel: opts.cancel ? () => { if (!done) { done = true; end(-1); } } : null, box };
    (box.children[0] as HTMLElement).classList.add('sel');
    scrollDown(); requestAnimationFrame(scrollDown);
  });
}

export function hint(text: string): void {
  el.hint.textContent = text;
  el.hint.classList.toggle('on', !!text);
}

// ── '목소리' ──
export function ghost(text: string): void {
  const g = document.createElement('span');
  g.className = 'ghost'; g.textContent = text;
  const left = Math.random() < 0.5;
  g.style.top = `${6 + Math.random() * 56}%`;
  g.style[left ? 'left' : 'right'] = `${1 + Math.random() * 22}%`;
  g.style.fontSize = `${18 + Math.random() * 20}px`;
  g.style.transform = `rotate(${(Math.random() * 6 - 3).toFixed(1)}deg)`;
  el.ghosts.appendChild(g);
  while (el.ghosts.children.length > 9) el.ghosts.firstElementChild!.remove();
  setTimeout(() => g.remove(), 26000);
}
export function clearGhosts(): void { el.ghosts.innerHTML = ''; }

// ── 카드 ──
export async function card(title: string, sub = '', big = false): Promise<void> {
  if (fast) return;
  el.card.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = title; if (big) h.className = 'big';
  el.card.appendChild(h);
  if (sub) { const p = document.createElement('p'); p.textContent = sub; el.card.appendChild(p); }
  el.card.classList.add('on');
  await sleep(big ? 3600 : 2800);
  el.card.classList.remove('on');
  await sleep(900);
}
// ── 끝 화면: 크레딧, 도움 창구, '이 게임에서 사실인 것' ──
export function endCard(title: string, lines: string[]): void {
  el.card.innerHTML = '';
  el.card.classList.add('end');
  const h = document.createElement('h2'); h.textContent = title; el.card.appendChild(h);
  for (const t of lines) { const p = document.createElement('p'); p.textContent = t; el.card.appendChild(p); }
  const cr = document.createElement('dl'); cr.className = 'credits';
  for (const [k, v] of CREDITS) { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; cr.append(dt, dd); }
  el.card.appendChild(cr);
  const hp = document.createElement('div'); hp.className = 'helpline';
  for (const t of HELP_LINES) { const p = document.createElement('p'); p.textContent = t; hp.appendChild(p); }
  el.card.appendChild(hp);
  const row = document.createElement('div'); row.className = 'endbtns';
  const f = document.createElement('button'); f.className = 'cont'; f.textContent = '이 게임에서 사실인 것';
  f.addEventListener('click', (e) => { e.stopPropagation(); facts(); });
  const b = document.createElement('button'); b.className = 'cont'; b.textContent = '처음 화면으로';
  b.addEventListener('click', () => location.reload());
  // 사실 화면은 사람이 원문과 다시 대조할 때까지 개발 서버에서만 보인다 (기획서 0-12)
  if (import.meta.env.DEV) row.append(f, b); else row.append(b);
  el.card.appendChild(row);
  el.card.classList.add('on'); el.card.style.pointerEvents = 'auto';
  el.card.scrollTop = 0;
}

const CREDITS: [string, string][] = [
  ['대본 · 그림 · 소리 · 코드', 'Claude (Anthropic의 AI)'],
  ['기획 · 방향', 'rumadomo'],
  ['도구', 'ink (inkle) · Vite · TypeScript · Web Audio · Canvas'],
  ['그림과 소리', '이미지·음성 생성 모델 없이, 코드로 한 점씩 그리고 만들었습니다.'],
];

// 본편에는 통계를 넣지 않는다. 끝난 뒤, 넘길 수 있는 한 화면에 출처와 함께 싣는다 (기획서 0-7).
// 원문과 대조한 항목만 싣는다. 수치의 기준이 불분명한 것은 뺐다.
const FACTS: { t: string; src: string; url: string }[] = [
  { t: '여러 표본에서, 퍼리와 퍼리가 아닌 사람 사이에 삶의 만족도와 자존감은 의미 있는 차이가 없었습니다. 신체 건강, 심리적 건강, 인간관계의 질도 그랬습니다.', src: 'Furscience 11.1', url: 'https://furscience.com/research-findings/wellness-dysfunction/11-1-wellness/' },
  { t: '불안장애 진단율은 일반 인구보다 높지 않았고, 우울을 겪을 가능성도 다른 사람들과 다르지 않았습니다.', src: 'Furscience 11.2', url: 'https://furscience.com/research-findings/wellness-dysfunction/11-2-psychological-conditions/' },
  { t: '예외도 있습니다. 2018년 조사에서 11.7%가 자폐 스펙트럼 진단을 받았다고 답했습니다. 일반 인구보다 뚜렷이 높습니다.', src: 'Furscience 11.2', url: 'https://furscience.com/research-findings/wellness-dysfunction/11-2-psychological-conditions/' },
  { t: '참여하는 이유로는 소속감이 다른 팬덤보다 강했습니다. 주관식 답에서 가장 흔한 이유는 커뮤니티, 그림, 친구의 권유였습니다.', src: 'Furscience 2.10', url: 'https://furscience.com/research-findings/fandom-participation/2-10-furry-motivation/' },
  { t: '약 3분의 1은 성적 끌림이 참여 동기가 된다고 답했고, 약 4분의 1은 전혀 상관없다고 답했습니다. 그 점수는 척도의 중간에도 못 미치고, 소속감이나 즐거움보다 훨씬 낮았습니다. 전부 성적이라는 것도, 전혀 아니라는 것도 사실이 아닙니다.', src: 'Furscience 2.10', url: 'https://furscience.com/research-findings/fandom-participation/2-10-furry-motivation/' },
  { t: '연구진은 대부분의 퍼리에게 심한 괴롭힘을 당한 이력이 있다고 적습니다. 그런데도 건강 지표에 차이가 없는 이유로 연구진은 커뮤니티의 지지를 듭니다. 이것은 가설이고, 검증된 결론은 아닙니다.', src: 'Furscience 11.1', url: 'https://furscience.com/research-findings/wellness-dysfunction/11-1-wellness/' },
];
const FACT_LIMITS = [
  '전부 한 연구팀(국제 의인화 연구 프로젝트)이 자기 사이트에 정리한 내용입니다. 독립된 검증이 아닙니다.',
  '조사 시기는 2011~2018년이고, 표본은 북미 컨벤션 참가자와 온라인 응답자입니다. 한국 퍼리에 대한 조사는 찾지 못했습니다.',
  '윤재는 지어낸 사람입니다. 이 숫자들이 윤재를 설명하지는 않습니다.',
];
function facts(): void {
  el.card.innerHTML = '';
  el.card.classList.remove('end'); el.card.classList.add('facts');
  const h = document.createElement('h3'); h.textContent = '이 게임에서 사실인 것'; el.card.appendChild(h);
  const ul = document.createElement('ul');
  for (const f of FACTS) {
    const li = document.createElement('li'); li.textContent = f.t + ' ';
    const a = document.createElement('a'); a.href = f.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `(${f.src})`;
    li.appendChild(a); ul.appendChild(li);
  }
  el.card.appendChild(ul);
  const lh = document.createElement('h4'); lh.textContent = '이 자료의 한계'; el.card.appendChild(lh);
  const ul2 = document.createElement('ul'); ul2.className = 'limits';
  for (const t of FACT_LIMITS) { const li = document.createElement('li'); li.textContent = t; ul2.appendChild(li); }
  el.card.appendChild(ul2);
  const b = document.createElement('button'); b.className = 'cont'; b.textContent = '처음 화면으로';
  b.addEventListener('click', () => location.reload());
  el.card.appendChild(b);
  el.card.scrollTop = 0;
}

// ── 장면 경고 (기획서 2장 '콘텐츠 설정') ──
// 켜 두면 폭력·시도 장면 직전에 한 줄 경고가 뜬다. 넘길 수 있는 장면은 요약으로 대신하고, 이야기와 변수는 그대로 잇는다.
const WARN_KEY = 'tal.warn';
/** 걷는 조작의 이름. 손가락으로 하는 기기에서는 화면의 패드다. */
export const DIR_KEY = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? '패드' : '방향키';
export function warnOn(): boolean { try { return localStorage.getItem(WARN_KEY) === '1'; } catch { return false; } }
export function setWarnOn(on: boolean): void { try { if (on) localStorage.setItem(WARN_KEY, '1'); else localStorage.removeItem(WARN_KEY); } catch { /* 저장이 막힌 브라우저 */ } }
export async function warn(text: string, canSkip: boolean): Promise<'go' | 'skip'> {
  if (!warnOn()) return 'go';
  clearFlow();
  inHelp = true;
  el.card.innerHTML = '';
  el.card.classList.add('help');
  const p = document.createElement('p'); p.textContent = text; el.card.appendChild(p);
  const row = document.createElement('div'); row.className = 'endbtns';
  const go = document.createElement('button'); go.className = 'cont'; go.textContent = '계속 본다';
  row.appendChild(go);
  let sk: HTMLButtonElement | null = null;
  if (canSkip) { sk = document.createElement('button'); sk.className = 'cont'; sk.textContent = '이 장면 넘기기'; row.appendChild(sk); }
  el.card.appendChild(row);
  el.card.classList.add('on'); el.card.style.pointerEvents = 'auto';
  const r = await new Promise<'go' | 'skip'>((res) => {
    go.addEventListener('click', (e) => { e.stopPropagation(); res('go'); }, { once: true });
    sk?.addEventListener('click', (e) => { e.stopPropagation(); res('skip'); }, { once: true });
  });
  el.card.classList.remove('on', 'help'); el.card.style.pointerEvents = '';
  inHelp = false;
  await sleep(urlFast ? 0 : 700);
  return r;
}

// ── 도움 창구 안내 ──
// 기획서 9장의 문구 그대로. long 은 엔딩 C 뒤: 10초 동안 넘길 수 없다. Ctrl(빨리 감기)도 듣지 않는다.
// 검사용 주소(?fast)에서만 짧게 줄인다.
let urlFast = false;
let inHelp = false;
export function helpOpen(): boolean { return inHelp; }
export function setUrlFast(f: boolean): void { urlFast = f; }
export const AFTER_C = 'tal.afterC';
const HELP_LINES = [
  '마음이 힘들 때는 자살예방상담전화 109(24시간, 국번 없이) 또는 카카오톡 상담 \'마들랜\'에서 이야기를 들어줍니다.',
  '가정폭력은 112 또는 여성긴급전화 1366(24시간)으로 도움을 요청할 수 있습니다.',
];
export async function help(long: boolean): Promise<void> {
  const lines = [...HELP_LINES];
  if (long) lines.unshift('윤재의 이야기는 지어낸 것입니다. 그 밤의 조용함은 지어낸 것이 아닙니다.', '그 조용함이 지금 당신의 방에도 있다면, 혼자 들고 있지 않아도 됩니다.');
  if (long) lines.push('아이의 몸에서 멍을 봤다면 112로 신고할 수 있습니다.');
  if (long) { try { localStorage.setItem(AFTER_C, '1'); } catch { /* 저장이 막혀도 안내는 나온다 */ } }
  inHelp = true;
  clearFlow();
  el.card.innerHTML = '';
  el.card.classList.add('help');
  for (const t of lines) { const p = document.createElement('p'); p.textContent = t; el.card.appendChild(p); }
  const b = document.createElement('button'); b.className = 'cont'; b.textContent = '계속'; b.disabled = true;
  el.card.appendChild(b);
  el.card.classList.add('on'); el.card.style.pointerEvents = 'auto';
  const lock = long ? (urlFast ? 300 : 10000) : (urlFast ? 50 : 2500);
  await sleep(lock);
  b.disabled = false; b.focus();
  await new Promise<void>((r) => {
    const key = (e: KeyboardEvent): void => { // 키보드로 하는 사람도 넘어갈 수 있게
      if (e.repeat || !['z', 'Z', 'Enter', ' '].includes(e.key)) return;
      e.preventDefault(); e.stopPropagation(); done();
    };
    const done = (): void => { window.removeEventListener('keydown', key, true); r(); };
    window.addEventListener('keydown', key, true);
    b.addEventListener('click', (e) => { e.stopPropagation(); done(); }, { once: true });
  });
  el.card.classList.remove('on', 'help'); el.card.style.pointerEvents = '';
  inHelp = false;
  await sleep(urlFast ? 0 : 900);
}

export function fx(name: 'shake' | 'panic', ms: number): void {
  el.stage.classList.add(name);
  setTimeout(() => el.stage.classList.remove(name), ms);
}

// ── 조회수: 한번 뜨면 계속 오른다 ──
// 대본이 새 숫자를 줄 때마다 다시 빨라지고, 그 뒤로는 점점 느려진다 (4장: 세상은 다음 걸로 넘어갔다).
let viewsShown = 0, viewsTarget = 0, viewsAt = 0;
setInterval(() => {
  if (!viewsTarget) return;
  const cool = 1 / (1 + (performance.now() - viewsAt) / 20000);
  if (Math.random() < cool) viewsTarget += Math.max(1, Math.round(viewsTarget * (0.00002 + Math.random() * 0.00008) * cool));
  viewsShown += Math.ceil((viewsTarget - viewsShown) * 0.25);
  el.views.textContent = `조회수 ${viewsShown.toLocaleString('ko-KR')}`;
}, 400);

/** 남아 있는 상태를 화면에 그대로 옮긴다. */
export function render(p: Pres, vars: { energy: number; heat: number; gaze: number }, hasMap: boolean): void {
  const c = el.stage.classList;
  c.toggle('suit', p.suit);
  c.toggle('walk', hasMap);
  c.toggle('quiet', p.quiet && p.pov === 'yunjae');
  c.toggle('cine', p.cine > 0);
  c.toggle('pov-yunseo', p.pov === 'yunseo');
  c.toggle('pov-yunjae', p.pov === 'yunjae');
  c.toggle('pov-world', p.pov === 'world');
  c.toggle('has-map', hasMap);
  c.toggle('color', p.scene === 'grandma_house'); // 4장 할머니 집: 이 게임에서 유일하게 색이 있는 장면
  if (el.col.dataset.skin !== p.skin) {
    el.col.dataset.skin = p.skin;
    if (p.skin !== 'none') { el.win.classList.remove('on'); pageKey = ''; }
  }
  if (p.cine === 0 && el.pics.children.length) el.pics.innerHTML = '';

  const heads: Record<string, string> = {
    messenger: p.server ? `${p.server}` : '메신저',
    kakao: '카카오톡', browser: '', call: p.pov === 'yunseo' ? '엄마 · 통화 중' : '통화 중', none: '',
  };
  let html = `<span>${heads[p.skin] || ''}</span>`;
  if (p.skin === 'messenger' && p.channels) {
    html += '<span class="chan"><span># 잡담</span><span># 그림</span><span># 제작 질문</span><span># 완성 자랑</span><span># 정모 공지</span><span class="lock">인증 필요</span></span>';
  }
  if (el.head.innerHTML !== html) el.head.innerHTML = html;
  el.who.textContent = p.pov === 'yunseo' ? '윤서' : '';

  el.clock.textContent = p.time;
  if (p.views) {
    if (!viewsTarget) viewsShown = Math.round(p.views * 0.97);
    if (p.views > viewsTarget) { viewsTarget = p.views; viewsAt = performance.now(); }
    el.views.classList.add('on');
  } else { viewsTarget = 0; el.views.classList.remove('on'); }

  el.gEnergy.classList.toggle('on', p.energy);
  el.gHeat.classList.toggle('on', p.heat);
  el.gGaze.classList.toggle('on', p.gaze);
  if (p.energy) {
    const n = Math.max(0, Math.min(6, vars.energy));
    el.gEnergy.querySelector('b')!.innerHTML = Array.from({ length: 6 }, (_, i) => `<s class="${i < n ? 'f' : ''}"></s>`).join('');
  }
  (el.gHeat.querySelector('u') as HTMLElement).style.width = `${Math.min(100, vars.heat)}%`;
  (el.gGaze.querySelector('u') as HTMLElement).style.width = `${Math.min(100, vars.gaze)}%`;
  el.stage.style.setProperty('--gaze', p.gaze && !p.suit ? String(Math.min(1, vars.gaze / 100)) : '0');
  el.stage.style.setProperty('--heat', p.heat ? String(Math.min(1, Math.max(0, (vars.heat - 40) / 60))) : '0');
}

// ── 시간 제한 (선택지가 저절로 골라지기까지) ──
let timerEl: HTMLElement | null = null;
/** secs 초 동안 줄이 줄어들고 심장 소리가 빨라진다. 다 되면 onEnd. 돌려주는 함수로 멈춘다. */
export function timer(secs: number, onEnd: () => void): () => void {
  if (!timerEl) { timerEl = document.createElement('div'); timerEl.id = 'timer'; timerEl.innerHTML = '<u></u>'; el.stage.appendChild(timerEl); }
  const bar = timerEl.firstElementChild as HTMLElement;
  const t0 = performance.now();
  let beat = 0, last = t0, stopped = false;
  timerEl.classList.add('on');
  const tick = (now: number): void => {
    if (stopped) return;
    const f = Math.min(1, (now - t0) / (secs * 1000));
    bar.style.transform = `scaleX(${1 - f})`;
    beat += ((now - last) / 1000) * (1.6 + f * 2.4); last = now;
    if (beat >= 1) { beat -= 1; sfx(f > 0.6 ? 'heartbeat' : 'heartbeat_soft'); }
    if (f >= 1) { stop(); onEnd(); return; }
    requestAnimationFrame(tick);
  };
  const stop = (): void => { stopped = true; timerEl?.classList.remove('on'); };
  requestAnimationFrame(tick);
  return stop;
}
