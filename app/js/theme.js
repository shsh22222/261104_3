import { settings } from './store.js';

/** テーマ: auto のときは data-theme を外し、端末の設定に従う。 */
export function applyTheme() {
  const t = settings().theme;
  const root = document.documentElement;
  if (t === 'dark' || t === 'light') root.dataset.theme = t;
  else delete root.dataset.theme;
}
