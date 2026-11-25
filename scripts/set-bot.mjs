// Подключить сайт к другому Telegram-боту:  node scripts/set-bot.mjs ИмяБота
// Меняет site.bot в app/data.json и проверяет файл. Токен бота задаётся отдельно в Railway (NBEL_TELEGRAM_BOT_TOKEN).
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateData} from './validate-data.mjs';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/data.json');
const name = String(process.argv[2] || '').replace(/^@/, '').replace(/^https:\/\/t\.me\//, '');
if (!/^[A-Za-z][A-Za-z0-9_]{3,30}bot$/i.test(name)) { console.error('Укажите имя бота, например: node scripts/set-bot.mjs Rent100_bot'); process.exit(1); }
const data = JSON.parse(readFileSync(file, 'utf8'));
data.site.bot = name;
const errors = validateData(data);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
console.log(`Готово: сайт подключён к @${name}. Закоммитьте изменения в GitHub.`);
