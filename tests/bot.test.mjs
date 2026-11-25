import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {botConfig, createBot} from '../bot/worker.mjs';
import {loadData} from '../scripts/validate-data.mjs';

const TOKEN = '123456:' + 'a'.repeat(35), ORIGIN = 'https://belarus-production.up.railway.app';
const quiet = {log() {}, error() {}};
const reply = result => new Response(JSON.stringify({ok: true, result}), {status: 200});

test('bot configuration mirrors the Railway variables', () => {
  const c = botConfig({NBEL_BOT_TOKEN: TOKEN, NBEL_PUBLIC_ORIGIN: ORIGIN});
  assert.equal(c.mode, 'check'); assert.equal(c.enabled, false); assert.equal(c.dataDir, '/data');
  assert.equal(botConfig({NBEL_BOT_TOKEN: TOKEN, NBEL_PUBLIC_ORIGIN: ORIGIN, NBEL_BOT_MODE: 'poll', NBEL_BOT_ENABLED: 'true'}).enabled, true);
  assert.throws(() => botConfig({NBEL_BOT_TOKEN: 'токен', NBEL_PUBLIC_ORIGIN: ORIGIN}), /BotFather/);
  assert.throws(() => botConfig({NBEL_BOT_TOKEN: TOKEN, NBEL_PUBLIC_ORIGIN: ORIGIN + '/'}), /HTTPS/);
  assert.throws(() => botConfig({NBEL_BOT_TOKEN: TOKEN, NBEL_PUBLIC_ORIGIN: ORIGIN, NBEL_BOT_MODE: 'webhook'}), /check/);
});

test('check prints the username; polling answers /start with the catalog button and keeps the offset', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'nbel-bot-'));
  const calls = []; const logs = [];
  const fetchImpl = async (url, init) => {
    const method = url.split('/').pop(); const body = JSON.parse(init.body); calls.push({method, body});
    if (method === 'getMe') return reply({username: 'Rent100_bot'});
    if (method === 'getWebhookInfo') return reply({url: ''});
    if (method === 'getUpdates') return reply(body.offset ? [] : [
      {update_id: 10, message: {chat: {id: 5, type: 'private'}, text: '/start'}},
      {update_id: 11, message: {chat: {id: 5, type: 'private'}, text: 'Здравствуйте, есть квартира?'}},
      {update_id: 12, message: {chat: {id: -100, type: 'group'}, text: '/start'}}]);
    return reply(true);
  };
  try {
    const bot = createBot({token: TOKEN, origin: ORIGIN, dataDir: dir, site: loadData().site, fetchImpl, log: {log: m => logs.push(m), error() {}}});
    await bot.check();
    assert.match(logs[0], /username: Rent100_bot/);
    assert.equal(await bot.pollOnce(), 3);
    const sent = calls.filter(c => c.method === 'sendMessage');
    assert.equal(sent.length, 2, 'groups are ignored');
    assert.match(sent[0].body.text, /Недвижимость Беларуси/);
    assert.equal(sent[0].body.reply_markup.inline_keyboard[0][0].web_app.url, ORIGIN);
    assert.match(sent[1].body.text, /не ведёт переписку/);
    assert.equal(JSON.parse(readFileSync(path.join(dir, 'bot-state.json'), 'utf8')).offset, 13);
    const again = createBot({token: TOKEN, origin: ORIGIN, dataDir: dir, site: loadData().site, fetchImpl, log: quiet});
    assert.equal(again.offset, 13);
    await again.register();
    assert.equal(calls.find(c => c.method === 'setChatMenuButton').body.menu_button.web_app.url, ORIGIN);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
