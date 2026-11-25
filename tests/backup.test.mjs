import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {runBackup} from '../scripts/backup.mjs';
import {start, owner, post} from './helpers.mjs';

test('backup of a live database is consistent, verified and rotated', async () => {
  const t = await start();
  try {
    await post(t.base, owner()); await post(t.base, owner());
    const file = path.join(t.dataDir, 'leads.sqlite'), dir = path.join(t.dataDir, 'backups');
    const m = await runBackup(file, {dir, keep: 2});
    assert.equal(m.leads, 2); assert.equal(m.integrity, 'ok');
    assert.equal(createHash('sha256').update(readFileSync(path.join(dir, m.file))).digest('hex'), m.sha256);
    await post(t.base, owner());
    const snap = new DatabaseSync(path.join(dir, m.file), {readOnly: true});
    assert.equal(snap.prepare('SELECT COUNT(*) n FROM leads').get().n, 2); snap.close();
    await new Promise(r => setTimeout(r, 5)); await runBackup(file, {dir, keep: 2});
    await new Promise(r => setTimeout(r, 5)); await runBackup(file, {dir, keep: 2});
    const files = readdirSync(dir);
    assert.equal(files.filter(f => f.endsWith('.sqlite')).length, 2);
    assert.equal(files.filter(f => f.endsWith('.json')).length, 2);
  } finally { await t.stop(); }
});
