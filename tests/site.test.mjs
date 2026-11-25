import test from 'node:test';
import assert from 'node:assert/strict';
import {start} from './helpers.mjs';

test('serves the site with strict security headers and blocks private files', async () => {
  const t = await start();
  try {
    const home = await fetch(`${t.base}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Недвижимость Беларуси/);
    assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
    assert.match(home.headers.get('content-security-policy'), /frame-ancestors https:\/\/web\.telegram\.org/);
    assert.equal(home.headers.get('x-robots-tag'), 'noindex, nofollow');
    for (const p of ['/images/pr-0031-1.webp', '/images/pr-0032-6.webp', '/style.css', '/app.js', '/data.json', '/favicon.svg', '/fonts/unbounded-cyrillic-500-normal.woff2', '/admin'])
      assert.equal((await fetch(t.base + p)).status, 200, p);
    for (const p of ['/server.mjs', '/../package.json', '/%2e%2e/server.mjs', '/images/README.md', '/leads.sqlite', '/fonts/../data.json.bak'])
      assert.equal((await fetch(t.base + p)).status, 404, p);
    assert.deepEqual(await (await fetch(`${t.base}/api/health`)).json(), {ok: true});
    assert.equal((await (await fetch(`${t.base}/api/config`)).json()).bot, 'Rental108_bot');
    assert.match(home.headers.get('content-security-policy'), /script-src 'self' https:\/\/telegram\.org/);
    assert.match(await (await fetch(`${t.base}/robots.txt`)).text(), /Disallow: \//);
  } finally { await t.stop(); }
});

test('indexing can be enabled for the public launch', async () => {
  const t = await start({allowIndexing: true, publicOrigin: 'https://nbel.example'});
  try {
    const r = await fetch(`${t.base}/`);
    assert.equal(r.headers.get('x-robots-tag'), null);
    assert.match(await (await fetch(`${t.base}/robots.txt`)).text(), /Sitemap: https:\/\/nbel\.example\/sitemap\.xml/);
    assert.equal((await fetch(`${t.base}/admin`)).headers.get('x-robots-tag'), 'noindex, nofollow');
  } finally { await t.stop(); }
});

test('private preview key hides the site until the full link is opened', async () => {
  const key = 'a'.repeat(20) + 'B_c-' + 'd'.repeat(12);
  const t = await start({previewKey: key});
  try {
    assert.equal((await fetch(`${t.base}/`)).status, 401);
    assert.equal((await fetch(`${t.base}/api/health`)).status, 200);
    const r = await fetch(`${t.base}/?preview=${key}`, {redirect: 'manual'});
    assert.equal(r.status, 303);
    const cookie = r.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(`${t.base}/`, {headers: {cookie}})).status, 200);
  } finally { await t.stop(); }
});
