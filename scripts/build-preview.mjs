// claude.ai のアーティファクトなど、1ファイルで動かすためのプレビュー版をつくる。
// 本番の PWA（app/）はビルド不要。これは試用のためだけのもの。
// 使い方: node scripts/build-preview.mjs [出力先.html]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(process.argv[2] || `${ROOT}/dist/preview.html`);

const html = await readFile(`${ROOT}/app/index.html`, 'utf8');
const body = html.split('<!-- app:start -->')[1].split('<!-- app:end -->')[0].trim();
const css = await readFile(`${ROOT}/app/styles.css`, 'utf8');
const fonts = (html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/) || [])[1];

// esbuild で ES モジュールを1本にまとめる（開発時のみ使う。版は固定）
const js = execFileSync('npx', ['--yes', 'esbuild@0.24.2', `${ROOT}/app/js/main.js`, '--bundle', '--format=iife', '--minify', '--target=es2020'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});

// アーティファクトの外枠が上下の安全領域を確保するので、本体側の上下余白は0にする
const previewCss = `\n/* preview */\n:root{--view-safe-top:0px;--view-safe-bottom:0px}\n`;

const page = `<title>間 MA</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts ? `<link rel="stylesheet" href="${fonts}">` : ''}
<style>
${css}${previewCss}</style>
${body}
<script>window.__MA_PREVIEW = true;</script>
<script>
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;

await mkdir(dirname(out), { recursive: true });
await writeFile(out, page);
console.log(`preview → ${out} (${(page.length / 1024).toFixed(1)} KB)`);
