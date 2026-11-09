import { h, closeButton, exitRitual } from '../ui.js';
import { back, go } from '../nav.js';
import { addMoment } from '../store.js';
import { bell, unlockAudio } from '../audio.js';

/** #evening 今日を手放す。書いた一行は、崩れて消えていく。 */
export function eveningView(root) {
  const stage = h('div', { class: 'stage evening' });
  root.append(h('div', { class: 'immersive-top' }, closeButton(back)), stage);
  let exitEl = null;
  const timers = [];

  const input = h('textarea', { id: 'evening-text', rows: '2', maxlength: '120', placeholder: '例: 夕方、湯気の向こうの子どもの声' });

  stage.append(
    h('p', { class: 'eyebrow' }, '今日を手放す'),
    h('h1', { class: 'sos-q', tabindex: '-1' }, '今日、ほんとうに「在った」一瞬はありましたか。'),
    h('label', { class: 'field wide', for: 'evening-text' }, h('span', { class: 'field-label' }, '一行だけ'), input),
    h('div', { class: 'exit-actions' }, h('button', { class: 'btn btn-quiet', onclick: () => release('') }, '書かずに手放す'), h('button', { class: 'btn btn-primary', onclick: () => release(input.value.trim()) }, '夜空に置いて、手放す')),
    h('p', { class: 'fine' }, '反省会ではありません。思い出せなくても大丈夫です。'),
  );

  function release(text) {
    unlockAudio();
    if (text) addMoment('evening', { text });
    const line = h('p', { class: 'dissolve', 'aria-label': text || '今日' }, [...(text || '今日という日')].map((ch, k) => h('span', { style: { '--dx': `${(Math.random() - 0.5) * 80}px`, '--dy': `${-20 - Math.random() * 60}px`, '--delay': `${600 + k * 70}ms` } }, ch)));
    stage.replaceChildren(line);
    bell('deep');
    requestAnimationFrame(() => line.classList.add('go'));
    timers.push(
      setTimeout(() => {
        exitEl = exitRitual({
          title: '今日は、終わりました。',
          lines: ['明日のことは、', '明日の「いま」に。'],
          actions: [h('button', { class: 'btn btn-quiet', onclick: () => go('play-sleep') }, '眠る前の実践へ'), h('button', { class: 'btn', onclick: back }, '閉じる')],
        });
        stage.replaceChildren(exitEl);
      }, 3200 + (text || '今日という日').length * 70),
    );
  }

  return () => {
    timers.forEach(clearTimeout);
    exitEl?._cleanup?.();
  };
}
