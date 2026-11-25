import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createSite} from '../server.mjs';

export const quiet = {log() {}, error() {}};
export async function start(opts = {}) {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'nbel-test-'));
  const app = createSite({dataDir, log: quiet, ...opts});
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return {app, base, dataDir, stop: async () => { await app.close(); rmSync(dataDir, {recursive: true, force: true}); }};
}
export const owner = (extra = {}) => ({kind: 'owner', deal: 'sale', name: 'Тестовый Клиент', phone: '+375 29 000-00-00', city: 'Минск', rooms: '2', message: 'ТЕСТ', consent: true, requestKey: randomUUID(), ...extra});
export const post = (base, body, headers = {}) => fetch(`${base}/api/leads`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: base, ...headers}, body: JSON.stringify(body)});
export const wait = ms => new Promise(r => setTimeout(r, ms));
