import { h, header, ICONS, toast } from '../ui.js';
import { go } from '../nav.js';
import { settings, setSetting, exportJSON, resetAll } from '../store.js';
import { bell, canSpeak, speak, unlockAudio } from '../audio.js';
import { applyTheme } from '../theme.js';

function toggle(id, label, key, note, after) {
  const input = h('input', {
    type: 'checkbox',
    id,
    checked: !!settings()[key],
    onchange: (e) => {
      setSetting(key, e.target.checked);
      after?.(e.target.checked);
    },
  });
  return h('label', { class: 'pref', for: id }, h('span', { class: 'pref-text' }, h('span', { class: 'pref-label' }, label), note ? h('span', { class: 'pref-note' }, note) : null), input);
}

function choice(id, label, key, options, after) {
  const sel = h(
    'select',
    {
      id,
      onchange: (e) => {
        const raw = e.target.value;
        const v = typeof options[0][0] === 'number' ? Number(raw) : raw;
        setSetting(key, v);
        after?.(v);
      },
    },
    options.map(([v, t]) => h('option', { value: v, selected: settings()[key] === v }, t)),
  );
  return h('label', { class: 'pref', for: id }, h('span', { class: 'pref-text' }, h('span', { class: 'pref-label' }, label)), sel);
}

/** #prefs 設定。 */
export function prefsView(root) {
  root.append(header('設定', null, h('button', { class: 'icon-btn', 'aria-label': 'いまに戻る', onclick: () => go('home'), svg: ICONS.close })));

  const vol = h('input', {
    type: 'range',
    id: 'pf-volume',
    min: '0',
    max: '1',
    step: '0.05',
    value: String(settings().volume),
    onchange: (e) => {
      setSetting('volume', Number(e.target.value));
      unlockAudio();
      bell('soft');
    },
  });

  const confirmBox = h('div', { class: 'confirm', hidden: true });
  const exportOut = h('pre', { class: 'export', hidden: true });

  root.append(
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, '音と声'),
      h(
        'div',
        { class: 'prefs' },
        toggle('pf-bell', '鐘の音', 'bell', 'マナーモードでは鳴らない端末があります'),
        h('label', { class: 'pref', for: 'pf-volume' }, h('span', { class: 'pref-text' }, h('span', { class: 'pref-label' }, '鐘の音量')), vol),
        h('div', { class: 'pref' }, h('span', { class: 'pref-text' }, h('span', { class: 'pref-label' }, '鐘を試す')), h('button', { class: 'btn btn-small btn-quiet', onclick: () => (unlockAudio(), bell('bowl')) }, '鳴らす')),
        toggle('pf-voice', '声のガイド', 'voice', canSpeak() ? '端末の読み上げ機能を使います' : 'この端末では使えません'),
        choice('pf-rate', '声の速さ', 'voiceRate', [[0.75, 'ゆっくり'], [0.9, 'ふつう'], [1.05, 'すこし速く']], () => speak('いま、ここに。')),
        toggle('pf-haptics', '振動', 'haptics', '対応する端末（主にAndroid）のみ'),
      ),
    ),
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, '表示'),
      h(
        'div',
        { class: 'prefs' },
        choice('pf-theme', 'テーマ', 'theme', [['auto', '端末に合わせる'], ['dark', '夜'], ['light', '朝']], applyTheme),
        toggle('pf-minimal', 'ミニマルモード', 'minimal', 'ホームを呼吸の円と問いだけにします。慣れてきたら、こちらへ。'),
      ),
    ),
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, '記録'),
      h(
        'div',
        { class: 'prefs' },
        choice('pf-fade', '星が消えるまで', 'fadeDays', [[1, '1日'], [7, '7日'], [30, '30日']]),
        toggle('pf-counts', '星の数を表示する', 'showCounts', '既定では数えません'),
      ),
    ),
    h(
      'section',
      { class: 'group' },
      h('h2', { class: 'group-title' }, 'データ', h('span', { class: 'group-note' }, 'すべてこの端末の中だけにあります')),
      h(
        'div',
        { class: 'daily-actions' },
        h(
          'button',
          {
            class: 'btn btn-quiet',
            onclick: () => {
              const json = exportJSON();
              exportOut.textContent = json;
              exportOut.hidden = false;
              try {
                const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                const a = h('a', { href: url, download: 'ma-export.json' });
                document.body.append(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
              } catch {
                /* 表示だけでも残す */
              }
            },
          },
          '書き出す',
        ),
        h(
          'button',
          {
            class: 'btn btn-quiet btn-danger',
            onclick: () => {
              confirmBox.hidden = false;
              confirmBox.replaceChildren(
                h('p', null, '星、句、鐘の記録、設定をすべて消します。元に戻せません。'),
                h(
                  'div',
                  { class: 'daily-actions' },
                  h('button', { class: 'btn btn-quiet', onclick: () => (confirmBox.hidden = true) }, 'やめる'),
                  h(
                    'button',
                    {
                      class: 'btn btn-danger-solid',
                      onclick: () => {
                        resetAll();
                        applyTheme();
                        toast('すべて消去しました');
                        go('home');
                      },
                    },
                    '消去する',
                  ),
                ),
              );
            },
          },
          'すべて消去',
        ),
      ),
      confirmBox,
      exportOut,
    ),
    h(
      'section',
      { class: 'group note-block' },
      h('h2', { class: 'group-title' }, 'このアプリについて'),
      h('p', { class: 'body-text' }, '「間（ま）」は、思考と思考のあいだの静けさを思い出すための、小さな鐘です。アカウントも解析もなく、何も送信しません。'),
      h('p', { class: 'body-text' }, 'エックハルト・トールの教えに着想を得ていますが、トール氏および関係団体とは関係のない非公式のアプリです。教えの要約はすべて私たちの言葉による解釈です。'),
      h('div', { class: 'daily-actions' }, h('button', { class: 'btn btn-quiet', onclick: () => go('learn') }, '教えの地図'), h('button', { class: 'btn btn-quiet', onclick: () => go('sky') }, '夜空'), h('button', { class: 'btn btn-quiet', onclick: () => go('welcome') }, 'はじめの体験')),
      h(
        'details',
        { class: 'howto' },
        h('summary', null, 'ホーム画面に追加する'),
        h('ul', null, h('li', null, 'iPhone: Safariで開き、共有ボタンから「ホーム画面に追加」。'), h('li', null, 'Android: Chromeのメニューから「ホーム画面に追加」または「アプリをインストール」。')),
      ),
    ),
  );
}
