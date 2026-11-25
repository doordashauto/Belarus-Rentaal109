// Служебные команды администратора. Запуск внутри сервиса (Railway → Shell) или локально:
//   node scripts/data.mjs export        — все заявки в JSON (в stdout)
//   node scripts/data.mjs export --csv  — то же в CSV
//   node scripts/data.mjs backup        — создать проверенную копию базы сейчас
//   node scripts/data.mjs check         — проверить целостность базы
//   node scripts/validate-data.mjs      — проверить app/data.json после правки объектов
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {runBackup} from './backup.mjs';

const dir = process.env.NBEL_DATA_DIR || path.resolve('private');
const file = path.join(dir, 'leads.sqlite');
const [cmd, flag] = process.argv.slice(2);
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };

if (!existsSync(file)) { console.error(`База не найдена: ${file}. Укажите NBEL_DATA_DIR.`); process.exit(1); }
if (cmd === 'export') {
  const db = new DatabaseSync(file, {readOnly: true});
  const rows = db.prepare('SELECT id,created_at,kind,payload,delivery FROM leads ORDER BY created_at').all().map(r => ({id: r.id, createdAt: r.created_at, delivery: r.delivery, ...JSON.parse(r.payload)}));
  db.close();
  if (flag === '--csv') {
    const cols = ['id', 'createdAt', 'kind', 'name', 'phone', 'deal', 'city', 'rooms', 'listing', 'message', 'delivery'];
    console.log(cols.join(';'));
    for (const r of rows) console.log(cols.map(c => csvCell(c === 'listing' ? (r.listing ? `${r.listing.id} ${r.listing.city}, ${r.listing.address}` : '') : r[c])).join(';'));
  } else console.log(JSON.stringify(rows, null, 2));
} else if (cmd === 'backup') {
  const m = await runBackup(file); console.log(`Копия создана и проверена: ${m.file} (${m.leads} заявок, SHA-256 ${m.sha256}).`);
} else if (cmd === 'check') {
  const db = new DatabaseSync(file, {readOnly: true}); const r = db.prepare('PRAGMA integrity_check').get(); db.close();
  console.log(`integrity_check: ${Object.values(r)[0]}`);
} else {
  console.log('Команды: export [--csv] | backup | check');
}
