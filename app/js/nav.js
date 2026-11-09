// ハッシュによる画面遷移。ルート名は英数字とハイフンのみ（#home, #play-watcher など）。

export const TABS = ['home', 'practice', 'daily', 'sky'];

let lastTab = 'home';
let renderHook = () => {};

export function setRenderHook(fn) {
  renderHook = fn;
}

export function currentRoute() {
  const raw = location.hash.replace(/^#/, '').split('?')[0];
  return raw || 'home';
}

export function rememberTab(name) {
  if (TABS.includes(name) || name === 'learn' || name === 'prefs') lastTab = name;
}

export function go(name) {
  if (currentRoute() === name) renderHook();
  else location.hash = name;
}

/** 没入画面から、元いたタブに戻る。 */
export function back() {
  go(lastTab);
}
