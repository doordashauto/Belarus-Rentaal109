import {DatabaseSync, backup} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Makes one consistent snapshot through the SQLite backup API, checks it and records its SHA-256. */
export async function runBackup(dbFile, {dir = path.join(path.dirname(dbFile), 'backups'), keep = 14, prefix = 'leads'} = {}) {
  if (!existsSync(dbFile)) throw new Error('Database file not found.');
  mkdirSync(dir, {recursive: true});
  const name = `${prefix}-${stamp()}`;
  const tmp = path.join(dir, `.${name}.sqlite.tmp`), final = path.join(dir, `${name}.sqlite`);
  const src = new DatabaseSync(dbFile, {readOnly: true});
  try { await backup(src, tmp); } finally { src.close(); }
  const check = new DatabaseSync(tmp, {readOnly: true});
  let result, count;
  try { result = check.prepare('PRAGMA integrity_check').get(); count = check.prepare('SELECT COUNT(*) AS n FROM leads').get().n; } finally { check.close(); }
  const verdict = result && Object.values(result)[0];
  if (verdict !== 'ok') { rmSync(tmp, {force: true}); throw new Error('Backup integrity check failed.'); }
  renameSync(tmp, final);
  const sha256 = createHash('sha256').update(readFileSync(final)).digest('hex');
  const meta = {file: path.basename(final), createdAt: new Date().toISOString(), bytes: statSync(final).size, sha256, leads: count, integrity: 'ok'};
  writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(meta, null, 2) + '\n');
  const snaps = readdirSync(dir).filter(f => f.startsWith(`${prefix}-`) && f.endsWith('.sqlite')).sort();
  for (const old of snaps.slice(0, Math.max(0, snaps.length - keep))) { rmSync(path.join(dir, old), {force: true}); rmSync(path.join(dir, old.replace(/\.sqlite$/, '.json')), {force: true}); }
  return meta;
}

/** Runs a backup at start and every intervalMs while the process lives. Returns a stop function. */
export function startBackups(dbFile, {enabled = process.env.NBEL_BACKUPS_ENABLED === 'true', intervalMs = 24 * 3600e3, log = console, ...opts} = {}) {
  if (!enabled) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try { const m = await runBackup(dbFile, opts); log.log(`NBEL backup verified: ${m.file}, ${m.leads} leads.`); }
    catch (e) { log.error(`NBEL backup failed: ${e.message}`); }
    finally { running = false; }
  };
  const first = setTimeout(tick, 5000); first.unref();
  const timer = setInterval(tick, intervalMs); timer.unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
