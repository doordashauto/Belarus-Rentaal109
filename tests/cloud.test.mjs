import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeConfig} from '../cloud.mjs';
import {sendTelegram, leadMessage} from '../server.mjs';

test('cloud configuration checks variables before start', () => {
  const c = runtimeConfig({PORT: '8080', NBEL_PUBLIC_ORIGIN: 'https://nbel.up.railway.app'});
  assert.equal(c.dataDir, '/data'); assert.equal(c.requireConfiguredOrigin, true); assert.equal(c.allowLocalOrigin, false);
  assert.throws(() => runtimeConfig({NBEL_PUBLIC_ORIGIN: 'https://nbel.up.railway.app/'}), /exact HTTPS origin/);
  assert.throws(() => runtimeConfig({NBEL_PUBLIC_ORIGIN: 'http://nbel.by'}), /exact HTTPS origin/);
  assert.throws(() => runtimeConfig({NBEL_DATA_DIR: 'data'}), /absolute/);
  assert.throws(() => runtimeConfig({NBEL_ADMIN_TOKEN: 'short'}), /24/);
  assert.throws(() => runtimeConfig({NBEL_TELEGRAM_BOT_TOKEN: '123456:' + 'a'.repeat(35)}), /both/);
  assert.throws(() => runtimeConfig({NBEL_TELEGRAM_BOT_TOKEN: 'bad', NBEL_TELEGRAM_CHAT_ID: '123'}), /BotFather/);
  assert.ok(runtimeConfig({NBEL_TELEGRAM_BOT_TOKEN: '123456:' + 'a'.repeat(35), NBEL_TELEGRAM_CHAT_ID: '-1001234567890'}).telegramToken);
});

test('Telegram request is plain text to the configured chat, without calling the network', async () => {
  let call;
  await sendTelegram({token: '1:x', chatId: '42', text: 'Привет', fetchImpl: async (url, init) => { call = {url, body: JSON.parse(init.body)}; return new Response(JSON.stringify({ok: true}), {status: 200}); }});
  assert.equal(call.url, 'https://api.telegram.org/bot1:x/sendMessage');
  assert.deepEqual(call.body, {chat_id: '42', text: 'Привет', disable_web_page_preview: true});
  await assert.rejects(sendTelegram({token: '1:x', chatId: '42', text: 'x', fetchImpl: async () => new Response(JSON.stringify({ok: false, description: 'chat not found'}), {status: 400})}), /chat not found/);
  const msg = leadMessage('L-1', {kind: 'viewing', name: 'А', phone: '+375', listing: {id: 'PR-0001', city: 'Минск', address: 'ул. Немига, 40', agent: 'Дмитрий Жук'}}, 'https://nbel.example');
  assert.match(msg, /https:\/\/nbel\.example\/#obj-PR-0001/);
});
