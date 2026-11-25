import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const CITIES = ['Минск', 'Минский р-н', 'Минская обл.', 'Витебская обл.', 'Брестская обл.', 'Гродненская обл.', 'Гомельская обл.', 'Могилёвская обл.', 'Брест', 'Гродно', 'Гомель', 'Витебск', 'Могилёв'];
export const HOUSE_TYPES = ['Дом', 'Коттедж', 'Дача', 'Таунхаус', 'Блокированный дом', 'Часть дома'];
export const COMMERCIAL_TYPES = ['Офис', 'Склад', 'Торговое помещение', 'Здание', 'Помещение свободного назначения', 'Готовый бизнес'];
export const PHOTO_RE = /^images\/[A-Za-z0-9_-]{1,80}\.(?:webp|jpg|jpeg|png|avif)$/;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const str = (v, max = 300) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/** Returns a list of human-readable problems. An empty list means data.json is valid. */
export function validateData(data, {appDir = path.join(root, 'app')} = {}) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  if (!data || typeof data !== 'object') return ['data.json: ожидается объект {site, agents, listings}'];
  const {site, agents, listings} = data;

  if (!site || typeof site !== 'object') err('site', 'нет раздела site');
  else {
    for (const k of ['name', 'legalName', 'unp', 'license', 'address', 'phone']) if (!str(site[k])) err(`site.${k}`, 'заполните строку');
    for (const k of ['email', 'hours', 'telegram', 'insurance']) if (site[k] != null && typeof site[k] !== 'string') err(`site.${k}`, 'строка или пусто');
    if (site.telegram && !/^https:\/\/t\.me\/[A-Za-z0-9_]{4,40}$/.test(site.telegram)) err('site.telegram', 'ссылка вида https://t.me/имя');
    if (site.bot !== undefined && site.bot !== '' && !/^[A-Za-z][A-Za-z0-9_]{3,30}bot$/i.test(site.bot)) err('site.bot', 'имя бота без @, оканчивается на bot, например Rent100_bot');
    if (!(Number(site.bynPerUsd) > 0)) err('site.bynPerUsd', 'укажите курс BYN за 1 USD, например 2.95');
  }

  const agentIds = new Set();
  if (!Array.isArray(agents) || !agents.length) err('agents', 'нужен хотя бы один риелтор');
  else agents.forEach((a, i) => {
    const w = `agents[${i}]`;
    if (!int(a.id, 1, 100000)) err(w, 'id — целое число');
    else if (agentIds.has(a.id)) err(w, `id ${a.id} повторяется`);
    else agentIds.add(a.id);
    if (!str(a.name, 80)) err(w, 'нет имени');
    if (!str(a.phone, 30)) err(w, 'нет телефона');
    if (!str(a.initials, 3)) err(w, 'initials — 1–3 буквы');
    if (a.color && !/^#[0-9a-f]{6}$/i.test(a.color)) err(w, 'color — формат #RRGGBB');
  });

  const ids = new Set();
  if (!Array.isArray(listings)) err('listings', 'ожидается список объектов');
  else listings.forEach((o, i) => {
    const w = `listings[${i}]${o && o.id ? ` (${o.id})` : ''}`;
    if (!o || typeof o !== 'object') return err(w, 'ожидается объект');
    if (typeof o.id !== 'string' || !/^PR-\d{4}$/.test(o.id)) err(w, 'id в формате PR-0001');
    else if (ids.has(o.id)) err(w, 'id повторяется');
    else ids.add(o.id);
    if (o.deal !== 'sale' && o.deal !== 'rent') err(w, 'deal — "sale" или "rent"');
    if (!CITIES.includes(o.city)) err(w, `city — один из: ${CITIES.join(', ')}`);
    if (!str(o.district, 60)) err(w, 'нет района');
    if (!str(o.address, 120)) err(w, 'нет адреса');
    const cat = o.category || 'apartment';
    if (!['apartment', 'house', 'commercial'].includes(cat)) err(w, 'category — "apartment", "house" или "commercial"');
    if (cat === 'commercial') {
      if (!COMMERCIAL_TYPES.includes(o.type)) err(w, `type — один из: ${COMMERCIAL_TYPES.join(', ')}`);
      if (!int(o.rooms, 1, 200)) err(w, 'rooms — количество помещений, 1 … 200');
      if (o.landSotka !== undefined && !(typeof o.landSotka === 'number' && o.landSotka > 0)) err(w, 'landSotka — площадь участка в сотках');
    } else if (cat === 'house') {
      if (!HOUSE_TYPES.includes(o.type)) err(w, `type — один из: ${HOUSE_TYPES.join(', ')}`);
      if (o.rooms !== undefined && !int(o.rooms, 1, 30)) err(w, 'rooms — количество комнат, 1 … 30 (можно не указывать)');
      if (o.landSotka !== undefined && !(typeof o.landSotka === 'number' && o.landSotka > 0)) err(w, 'landSotka — площадь участка в сотках');
    } else if (!int(o.rooms, 0, 10)) err(w, 'rooms — 0 (студия) … 10');
    if (!((o.category === 'house' && o.area === undefined) || (typeof o.area === 'number' && o.area > 5 && o.area < 100000))) err(w, 'area — площадь в м² (для домов можно не указывать)');
    if (!int(o.floors, 1, 120) || !int(o.floor, -2, 120) || o.floor > o.floors) err(w, 'floor/floors — этаж не больше этажности');
    if (o.year !== undefined && !int(o.year, 1800, 2100)) err(w, 'year — год постройки (можно не указывать)');
    if (o.status !== undefined && o.status !== 'active' && o.status !== 'withdrawn') err(w, 'status — "active" или "withdrawn" (снят с продажи)');
    if (!(typeof o.priceUsd === 'number' && o.priceUsd > 0)) err(w, 'priceUsd — цена в долларах');
    if (o.priceByn !== undefined && !(typeof o.priceByn === 'number' && o.priceByn > 0)) err(w, 'priceByn — цена в рублях (необязательно)');
    if (!agentIds.has(o.agent)) err(w, `agent ${o.agent} нет в списке agents`);
    if (!str(o.description, 2000)) err(w, 'нет описания');
    if (o.photos !== undefined) {
      if (!Array.isArray(o.photos) || o.photos.length > 30) err(w, 'photos — список до 30 файлов');
      else o.photos.forEach(p => {
        if (typeof p !== 'string' || !PHOTO_RE.test(p)) err(w, `фото "${p}" — имя вида images/pr-0001-1.webp (латиница, цифры, - и _)`);
        else if (!existsSync(path.join(appDir, p))) err(w, `файл app/${p} не найден`);
      });
    }
  });
  return errors;
}

export function loadData(appDir = path.join(root, 'app')) {
  const data = JSON.parse(readFileSync(path.join(appDir, 'data.json'), 'utf8'));
  const errors = validateData(data, {appDir});
  if (errors.length) throw new Error(`app/data.json содержит ошибки:\n- ${errors.join('\n- ')}`);
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const d = loadData(); console.log(`data.json в порядке: ${d.listings.length} объектов, ${d.agents.length} риелторов.`); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
