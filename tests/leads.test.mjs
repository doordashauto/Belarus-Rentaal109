import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {start, owner, post, wait} from './helpers.mjs';

test('saves an owner lead, is idempotent and rejects a changed retry', async () => {
  const t = await start();
  try {
    const body = owner();
    const r1 = await post(t.base, body); assert.equal(r1.status, 201);
    const {id} = await r1.json(); assert.match(id, /^L-[0-9A-F]{8}$/);
    const r2 = await post(t.base, body); assert.equal(r2.status, 200); assert.equal((await r2.json()).id, id);
    assert.equal((await post(t.base, {...body, name: 'Другое имя'})).status, 409);
    const row = t.app.db.prepare('SELECT kind,delivery FROM leads WHERE id=?').get(id);
    assert.deepEqual({...row}, {kind: 'owner', delivery: 'not_configured'});
  } finally { await t.stop(); }
});

test('viewing request is tied to a real listing', async () => {
  const t = await start();
  try {
    const ok = await post(t.base, {kind: 'viewing', listingId: 'PR-0032', name: 'Тест', phone: '+375291234567', consent: true, requestKey: randomUUID()});
    assert.equal(ok.status, 201);
    const saved = JSON.parse(t.app.db.prepare('SELECT payload FROM leads').get().payload);
    assert.equal(saved.listing.address, 'ул. Березовая роща');
    assert.equal((await post(t.base, {kind: 'viewing', listingId: 'PR-0031', name: 'Тест', phone: '+375291234567', consent: true, requestKey: randomUUID()})).status, 201);
    assert.equal((await post(t.base, owner({rooms: 'Коммерческое помещение'}))).status, 201);
    assert.equal((await post(t.base, {kind: 'viewing', listingId: 'PR-9999', name: 'Тест', phone: '+375291234567', consent: true, requestKey: randomUUID()})).status, 400);
  } finally { await t.stop(); }
});

test('validates phone, consent, fields and origin', async () => {
  const t = await start();
  try {
    for (const bad of [owner({phone: '123'}), owner({phone: 'call me'}), owner({consent: false}), owner({city: 'Москва'}), owner({deal: 'swap'}), owner({kind: 'other'}), owner({message: 'x'.repeat(1001)}), owner({requestKey: 'nope'})])
      assert.equal((await post(t.base, bad)).status, 400, JSON.stringify(bad).slice(0, 80));
    assert.equal((await post(t.base, owner(), {Origin: 'https://evil.example'})).status, 403);
    assert.equal((await post(t.base, owner(), {'Sec-Fetch-Site': 'cross-site'})).status, 403);
    const noJson = await fetch(`${t.base}/api/leads`, {method: 'POST', headers: {Origin: t.base, 'Content-Type': 'text/plain'}, body: 'x'});
    assert.equal(noJson.status, 415);
  } finally { await t.stop(); }
});

test('cloud mode refuses leads until the public origin is configured', async () => {
  const t = await start({requireConfiguredOrigin: true, allowLocalOrigin: false});
  try { assert.equal((await post(t.base, owner())).status, 503); } finally { await t.stop(); }
});

test('rate limit stops floods', async () => {
  const t = await start({rateLimit: 3});
  try {
    for (let i = 0; i < 3; i++) assert.equal((await post(t.base, owner())).status, 201);
    const r = await post(t.base, owner()); assert.equal(r.status, 429); assert.equal(r.headers.get('retry-after'), '600');
  } finally { await t.stop(); }
});

test('admin export requires the token', async () => {
  const token = 'T'.repeat(30);
  const t = await start({adminToken: token});
  try {
    await post(t.base, owner());
    assert.equal((await fetch(`${t.base}/api/admin/leads`)).status, 401);
    assert.equal((await fetch(`${t.base}/api/admin/leads`, {headers: {Authorization: 'Bearer wrong'}})).status, 401);
    const r = await fetch(`${t.base}/api/admin/leads`, {headers: {Authorization: `Bearer ${token}`}});
    assert.equal(r.status, 200);
    const {leads} = await r.json(); assert.equal(leads.length, 1); assert.equal(leads[0].phone, '+375 29 000-00-00');
  } finally { await t.stop(); }
});

test('manager notification: sent, failed, then retried without losing the lead', async () => {
  const sent = []; let fail = true;
  const t = await start({notify: async msg => { if (fail) throw new Error('offline'); sent.push(msg); }});
  try {
    const {id} = await (await post(t.base, owner())).json();
    await wait(50);
    assert.equal(t.app.db.prepare('SELECT delivery FROM leads WHERE id=?').get(id).delivery, 'failed');
    fail = false;
    assert.equal(await t.app.deliverPending(), 1);
    const row = t.app.db.prepare('SELECT delivery,delivery_attempts FROM leads WHERE id=?').get(id);
    assert.equal(row.delivery, 'sent'); assert.equal(row.delivery_attempts, 2);
    assert.match(sent[0], new RegExp(`Новая заявка ${id}`)); assert.match(sent[0], /Телефон: \+375 29 000-00-00/);
    assert.equal(await t.app.deliverPending(), 0);
  } finally { await t.stop(); }
});
