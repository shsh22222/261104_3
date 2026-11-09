import { h, header, ICONS, chip, closeButton, exitRitual } from '../ui.js';
import { go, back } from '../nav.js';
import { SAMU_TASKS, MODES } from '../content.js';
import { bell, haptic, keepAwake, unlockAudio } from '../audio.js';
import { addMoment } from '../store.js';
import { mmss } from '../lib/day.js';

const DURATIONS = [3, 5, 10, 15, 20];

/** #samu 作務。日常の行為を、始まりと終わりの鐘で区切る。 */
export function samuView(root) {
  const pick = { task: SAMU_TASKS[0], min: 5, mode: 'accept' };
  let timer = null;
  let tick = null;
  let release = () => {};
  let exitEl = null;
  let alive = true;

  function setup() {
    document.body.classList.remove('immersive');
    root.replaceChildren(header('作務', '特別な時間をつくらず、ふだんの行為をそのまま修行にします。', h('button', { class: 'icon-btn', 'aria-label': '戻る', onclick: () => go('daily'), svg: ICONS.close })));
    const tasks = h('div', { class: 'chips' });
    const durs = h('div', { class: 'chips' });
    const modes = h('div', { class: 'modes' });
    const draw = () => {
      tasks.replaceChildren(...SAMU_TASKS.map((t) => chip(t, { selected: pick.task === t, onclick: () => ((pick.task = t), draw()) })));
      durs.replaceChildren(...DURATIONS.map((m) => chip(`${m}分`, { selected: pick.min === m, onclick: () => ((pick.min = m), draw()) })));
      modes.replaceChildren(
        ...MODES.map((m) =>
          h('button', { class: 'mode' + (pick.mode === m.id ? ' is-on' : ''), 'aria-pressed': String(pick.mode === m.id), onclick: () => ((pick.mode = m.id), draw()) }, h('strong', null, m.title), h('span', null, m.note)),
        ),
      );
    };
    draw();
    root.append(
      h(
        'div',
        { class: 'page' },
        h('section', { class: 'group' }, h('h2', { class: 'group-title' }, '何をしますか'), tasks),
        h('section', { class: 'group' }, h('h2', { class: 'group-title' }, 'どのくらい'), durs),
        h('section', { class: 'group' }, h('h2', { class: 'group-title' }, 'どの質で行いますか', h('span', { class: 'group-note' }, '目覚めた行為の三つの質')), modes),
        h('button', { class: 'btn btn-primary btn-wide', onclick: run }, 'はじめの鐘を鳴らす'),
      ),
    );
  }

  async function run() {
    unlockAudio();
    document.body.classList.add('immersive');
    const mode = MODES.find((m) => m.id === pick.mode);
    const time = h('p', { class: 'session-time' }, '0:00');
    root.replaceChildren(
      h('div', { class: 'immersive-top' }, closeButton(finish, '終える')),
      h(
        'div',
        { class: 'stage session' },
        h('p', { class: 'eyebrow' }, `${mode.title}　${mode.note}`),
        h('h1', { class: 'samu-title', tabindex: '-1' }, `ただ、${pick.task}をする。`),
        h('p', { class: 'samu-note' }, '手の感覚、音、匂い。考えが来たら、手に戻ります。'),
        time,
        h('button', { class: 'btn btn-quiet', onclick: finish }, '終える'),
      ),
    );
    bell('bowl');
    haptic([20, 60, 20]);
    const started = Date.now();
    tick = setInterval(() => (time.textContent = mmss(Date.now() - started)), 1000);
    timer = setTimeout(finish, pick.min * 60000);
    const r = await keepAwake();
    if (alive) release = r;
    else r();
  }

  function stopTimers() {
    clearTimeout(timer);
    clearInterval(tick);
    release();
    release = () => {};
  }

  function finish() {
    stopTimers();
    bell('bowl');
    addMoment('samu', { label: pick.task });
    exitEl = exitRitual({
      title: 'おかえりなさい。',
      lines: ['終えたあとの数秒も、', 'そのまま感じていてください。'],
      actions: [h('button', { class: 'btn', onclick: back }, '閉じる')],
    });
    root.replaceChildren(h('div', { class: 'stage' }, exitEl));
  }

  setup();
  return () => {
    alive = false;
    stopTimers();
    exitEl?._cleanup?.();
  };
}
