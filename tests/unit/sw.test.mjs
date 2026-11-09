// service worker のキャッシュ一覧に、アプリのファイルが漏れなく入っているか。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../../app', import.meta.url));

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

test('sw.js: すべての js / アイコンがキャッシュ対象に入っている', async () => {
  const sw = await readFile(join(APP, 'sw.js'), 'utf8');
  const files = (await walk(APP)).map((p) => './' + relative(APP, p).split('\\').join('/')).filter((p) => p !== './sw.js');
  const missing = files.filter((f) => !sw.includes(`'${f}'`));
  assert.deepEqual(missing, []);
});
