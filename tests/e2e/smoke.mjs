// 実ブラウザで主要な流れを一通り動かすスモークテスト。
// 使い方: node tests/e2e/smoke.mjs [スクリーンショットの保存先]
// Playwright が必要です（npm i -D playwright && npx playwright install chromium）。
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { start } from '../../scripts/serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SHOTS = process.argv[2] || null;
const port = 5000 + Math.floor(Math.random() * 3000);
const server = await start(port);
const base = `http://localhost:${port}/`;
const errors = [];
let step = '';
const log = (s) => {
  step = s;
  console.log('•', s);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, acceptDownloads: true, colorScheme: 'dark', locale: 'ja-JP' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${step}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text() + (m.location()?.url || ''))) errors.push(`[${step}] console: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const shot = async (name) => {
    if (!SHOTS) return;
    await mkdir(SHOTS, { recursive: true });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  };
  const expectText = async (text) => {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 4000 });
  };

  await page.clock.install({ time: new Date('2026-11-09T07:30:00') });

  log('はじめの案内');
  await page.goto(base);
  await expectText('思考と思考のあいだには');
  if ((await page.textContent('#view')).includes('null')) throw new Error('画面に "null" が表示されている');
  await shot('01-welcome');
  await page.click('#welcome-next');
  await page.click('#welcome-next');
  await expectText('記録は、星になって');
  await page.click('#welcome-start');

  log('一呼吸');
  await expectText('ただ、一つの呼吸を感じます');
  await page.clock.runFor(5500);
  await expectText('吐いて');
  await shot('02-breath');
  await page.clock.runFor(6500);
  await expectText('おかえりなさい');
  await page.locator('.exit-actions .btn', { hasText: '閉じる' }).last().click();

  log('ホーム（朝）');
  await expectText('今日の問い');
  await expectText('山茶始開');
  await expectText('今日の鐘');
  await shot('03-home');
  await page.getByRole('button', { name: 'いま感じた' }).first().click();
  await expectText('夜空に星が一つ');

  log('実践の一覧');
  await page.click('a[data-tab="practice"]');
  await expectText('思考を見守る');
  await shot('04-practice');

  log('実践プレイヤー');
  await page.getByRole('button', { name: /名前のない世界/ }).click();
  await expectText('近くにあるものを一つ');
  await page.click('#pv-start');
  await page.clock.runFor(3000);
  await expectText('コップ、植物、自分の手');
  await shot('05-player');
  await page.getByRole('button', { name: '画面を暗くする' }).click();
  await shot('06-void');
  await page.click('.void');
  await page.getByRole('button', { name: '一時停止' }).click();
  await page.clock.runFor(60000);
  await expectText('コップ、植物、自分の手');
  await page.getByRole('button', { name: '再開' }).click();
  await page.clock.runFor(100000);
  await expectText('おかえりなさい');
  await page.clock.runFor(15000);
  if (!(await page.locator('.exit.resting').count())) throw new Error('退出の儀式で画面が静かにならない');
  await page.waitForTimeout(3200);
  await shot('07-exit-resting');
  await page.mouse.click(195, 400);
  await page.locator('.exit-actions .btn', { hasText: '閉じる' }).last().click();
  await expectText('教えの地図');

  log('教えの地図');
  await page.getByRole('button', { name: /教えの地図/ }).click();
  await page.getByText('ペインボディ').click();
  await expectText('過去の感情的な痛み');
  await shot('08-learn');

  log('日常');
  await page.click('a[data-tab="daily"]');
  await expectText('スマホを開く瞬間を、鐘に');
  await shot('09-daily');

  log('ゲート');
  await page.getByRole('button', { name: 'ゲートを試す' }).click();
  await expectText('一呼吸だけ、ここに');
  await page.clock.runFor(11500);
  await expectText('いま、何を求めていますか');
  await shot('10-gate');
  await page.getByRole('button', { name: /なんとなく/ }).click();
  await page.getByRole('button', { name: 'スマホを置く' }).click();
  await expectText('スマホを置きましょう');
  await page.locator('.exit-actions .btn', { hasText: '閉じる' }).last().click();

  log('アンカーを選ぶ');
  await page.getByRole('button', { name: /日常の鐘を選びなおす/ }).click();
  await page.getByRole('button', { name: /階段を上り下り/ }).click();
  await expectText('3つまでにしましょう');
  await page.getByRole('button', { name: /ドアを通るとき/ }).click();
  await page.getByRole('button', { name: /階段を上り下り/ }).click();
  await shot('11-anchors');
  await page.getByRole('button', { name: '日常に戻る' }).click();
  await expectText('階段を上り下りするとき');

  log('今の一句');
  await page.getByRole('button', { name: '書く', exact: true }).click();
  await page.fill('#haiku-text', '最悪だ、明日もどうせ雨');
  const notes = await page.locator('.mirror-note').count();
  if (notes !== 3) throw new Error(`評価の気づきが3つではない: ${notes}`);
  await shot('12-haiku');
  await page.fill('#haiku-text', '湯気がゆれる　窓の外で鳥の声');
  await expectText('感覚の言葉が、そのまま生きています');
  await page.getByRole('button', { name: '夜空に置く' }).click();
  await expectText('まだ消えていない句');

  log('ランダムな鐘（カレンダー書き出し）');
  await page.goto(base + '#bells');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'カレンダーファイルをつくる' }).click()]);
  const ics = await readFile(await dl.path(), 'utf8');
  if (!ics.startsWith('BEGIN:VCALENDAR') || (ics.match(/BEGIN:VEVENT/g) || []).length < 30) throw new Error('ICS が不正');
  if (!ics.includes(`URL:${base}#bell`)) throw new Error('ICS に鐘のリンクがない');
  await expectText('回の鐘をつくりました');
  await shot('13-bells');

  log('鐘に応える');
  await page.goto(base + '#bell');
  await expectText('その瞬間、あなたはどこにいましたか');
  await page.getByRole('button', { name: '思考の中に' }).click();
  await expectText('その瞬間、あなたはもう思考の外に');
  await page.clock.runFor(12000);
  await page.locator('.exit-actions .btn', { hasText: '閉じる' }).last().click();

  log('開いている間の鐘');
  await page.goto(base + '#bell-session');
  await expectText('鐘を待っています');
  await page.clock.runFor(31 * 60000);
  await expectText('その瞬間、あなたはどこにいましたか');
  await page.getByRole('button', { name: 'いま、ここに' }).click();
  await page.clock.runFor(12000);
  await page.getByRole('button', { name: '作業に戻る' }).click();
  await expectText('鐘を待っています');
  await page.getByRole('button', { name: 'やめる' }).click();

  log('いま、揺れている');
  await page.goto(base + '#sos');
  await expectText('足の裏を感じてください');
  await page.clock.runFor(12000);
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await page.getByRole('button', { name: '不安', exact: true }).click();
  await page.clock.runFor(600);
  await expectText('その不安は、体のどこに');
  await page.getByRole('button', { name: '胸', exact: true }).click();
  await page.clock.runFor(600);
  await expectText('胸に、そっと注意を向けます');
  await shot('14-sos-witness');
  await page.clock.runFor(45000);
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await page.getByRole('button', { name: /^離れる/ }).click();
  await expectText('揺れの中で、在ることができました');

  log('相談窓口');
  await page.goto(base + '#crisis');
  await expectText('0570-064-556');
  await shot('15-crisis');

  log('作務');
  await page.goto(base + '#samu');
  await page.getByRole('button', { name: 'お茶をいれる' }).click();
  await page.getByRole('button', { name: '3分', exact: true }).click();
  await page.getByRole('button', { name: /楽しみ/ }).click();
  await shot('16-samu');
  await page.getByRole('button', { name: 'はじめの鐘を鳴らす' }).click();
  await expectText('ただ、お茶をいれるをする');
  await page.clock.runFor(3 * 60000 + 1000);
  await expectText('終えたあとの数秒も');
  await page.locator('.exit-actions .btn', { hasText: '閉じる' }).last().click();

  log('今日を手放す');
  await page.goto(base + '#evening');
  await page.fill('#evening-text', '夕方の湯気');
  await page.getByRole('button', { name: '夜空に置いて、手放す' }).click();
  await page.clock.runFor(5000);
  await expectText('今日は、終わりました');

  log('夜空');
  await page.goto(base + '#sky');
  const label = await page.locator('.sky-canvas').getAttribute('aria-label');
  const n = Number((label.match(/(\d+)個/) || [])[1]);
  if (!(n >= 8)) throw new Error(`星が少ない: ${label}`);
  await page.clock.runFor(500);
  await expectText('夕方の湯気');
  await shot('17-sky');

  log('設定とテーマ');
  await page.goto(base + '#prefs');
  await page.selectOption('#pf-theme', 'light');
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'light') throw new Error('テーマが変わらない');
  await shot('18-prefs-light');
  await page.goto(base + '#home');
  await page.clock.runFor(500);
  await shot('19-home-light');
  await page.goto(base + '#sky');
  await page.clock.runFor(500);
  await shot('20-sky-light');
  await page.goto(base + '#prefs');
  await page.selectOption('#pf-theme', 'auto');
  await page.check('#pf-minimal');
  await page.goto(base + '#home');
  await expectText('閉じて、いまへ');
  await shot('21-home-minimal');

  log('すべて消去');
  await page.goto(base + '#prefs');
  await page.getByRole('button', { name: 'すべて消去' }).click();
  await page.getByRole('button', { name: '消去する' }).click();
  await expectText('今日の問い');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ma.v1')));
  if (stored.moments.length !== 0 || stored.settings.minimal) throw new Error('消去されていない');

  log('横幅のはみ出し');
  for (const r of ['home', 'practice', 'daily', 'sky', 'prefs', 'bells', 'haiku', 'samu', 'learn', 'anchors']) {
    await page.goto(base + '#' + r);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) throw new Error(`#${r} が横にはみ出している: ${over}px`);
  }

  if (errors.length) throw new Error('ブラウザのエラー:\n' + errors.join('\n'));
  console.log('\nOK すべての流れが動きました');
} catch (e) {
  console.error(`\nNG (${step})`, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
