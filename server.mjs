import http from 'node:http';
import {existsSync, mkdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID, timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {loadData, CITIES, PHOTO_RE} from './scripts/validate-data.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(root, 'app');
const json = (res, status, body) => { res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}); res.end(JSON.stringify(body)); };
const text = (s, max) => typeof s === 'string' && s.trim().length <= max ? s.trim() : null;
const secretEqual = (a, b) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const ROOMS = ['Студия', '1', '2', '3', '4 и больше', 'Дом, коттедж', 'Коммерческое помещение'];
const KIND_RU = {owner: 'Собственник', viewing: 'Просмотр объекта'};
const MIME = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif'};
const STATIC_RE = /^(?:index\.html|admin\.html|style\.css|app\.js|admin\.js|theme\.js|data\.json|favicon\.svg|fonts\/[a-z0-9-]+\.woff2)$/;
const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://telegram.org; font-src 'self'; connect-src 'self'; frame-ancestors https://web.telegram.org https://*.telegram.org; base-uri 'none'; form-action 'self'; object-src 'none'";
const NOT_FOUND = '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена — Недвижимость Беларуси</title><link rel="stylesheet" href="/style.css"><main class="plain"><h1>Страница не найдена</h1><p class="mt16 muted">Возможно, объект уже продан или ссылка устарела.</p><p class="mt22"><a class="btn btn-primary" href="/">Перейти к каталогу</a></p></main></html>';

/** Sends a plain-text Telegram message. Returns nothing; throws on failure. */
export async function sendTelegram({token, chatId, text: body, fetchImpl = fetch}) {
  const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, text: body, disable_web_page_preview: true}), signal: AbortSignal.timeout(8000)});
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok || data.ok !== true) throw new Error(`Telegram API ${res.status}${data.description ? `: ${String(data.description).slice(0, 120)}` : ''}`);
}

export function leadMessage(id, lead, publicOrigin) {
  const lines = [`Новая заявка ${id}`, `Тип: ${KIND_RU[lead.kind] || lead.kind}`, `Имя: ${lead.name}`, `Телефон: ${lead.phone}`];
  if (lead.kind === 'owner') lines.push(`Хочет: ${lead.deal === 'rent' ? 'сдать' : 'продать'}`, `Город: ${lead.city || 'не указан'}`, `Объект: ${lead.rooms || 'не указано'}`);
  if (lead.listing) lines.push(`Объект: ${lead.listing.id}, ${lead.listing.city}, ${lead.listing.address}`, `Риелтор: ${lead.listing.agent}`);
  if (lead.listing && publicOrigin) lines.push(`${publicOrigin}/#obj-${lead.listing.id}`);
  if (lead.message) lines.push(`Комментарий: ${lead.message}`);
  return lines.join('\n');
}

export function createSite({
  dataDir = process.env.NBEL_DATA_DIR || path.join(root, 'private'),
  publicOrigin = process.env.NBEL_PUBLIC_ORIGIN || '',
  adminToken = process.env.NBEL_ADMIN_TOKEN || '',
  previewKey = process.env.NBEL_PREVIEW_KEY || '',
  allowIndexing = process.env.NBEL_ALLOW_INDEXING === 'true',
  telegramToken = process.env.NBEL_TELEGRAM_BOT_TOKEN || '',
  telegramChatId = process.env.NBEL_TELEGRAM_CHAT_ID || '',
  notify = null,
  allowLocalOrigin = true, requireConfiguredOrigin = false, trustProxy = false,
  rateLimit = 10, log = console,
} = {}) {
  if (previewKey && !/^[A-Za-z0-9_-]{32,128}$/.test(previewKey)) throw new Error('NBEL_PREVIEW_KEY: нужен случайный URL-safe ключ длиной 32–128 символов.');
  const data = loadData(appDir);
  const listings = new Map(data.listings.map(o => [o.id, o]));
  const agents = new Map(data.agents.map(a => [a.id, a]));
  const photos = new Set(data.listings.flatMap(o => o.photos || []));
  const deliver = notify || (telegramToken && telegramChatId ? (msg => sendTelegram({token: telegramToken, chatId: telegramChatId, text: msg})) : null);

  mkdirSync(dataDir, {recursive: true});
  const db = new DatabaseSync(path.join(dataDir, 'leads.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL,
      delivery TEXT NOT NULL DEFAULT 'not_configured', delivery_attempts INTEGER NOT NULL DEFAULT 0, delivery_error TEXT, delivered_at TEXT);
    CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);`);

  const markSent = db.prepare("UPDATE leads SET delivery='sent', delivered_at=?, delivery_error=NULL, delivery_attempts=delivery_attempts+1 WHERE id=?");
  const markFailed = db.prepare("UPDATE leads SET delivery='failed', delivery_error=?, delivery_attempts=delivery_attempts+1 WHERE id=?");
  const inFlight = new Set();
  async function deliverOne(id, payload) {
    if (!deliver || inFlight.has(id)) return;
    inFlight.add(id);
    try { await deliver(leadMessage(id, JSON.parse(payload), publicOrigin)); markSent.run(new Date().toISOString(), id); }
    catch (e) { markFailed.run(String(e && e.message || e).slice(0, 300), id); log.error(`Lead ${id}: manager notification failed; it will be retried.`); }
    finally { inFlight.delete(id); }
  }
  /** Retries notifications that were not delivered (max 5 attempts, last 48 hours). */
  async function deliverPending() {
    if (!deliver) return 0;
    const since = new Date(Date.now() - 48 * 3600e3).toISOString();
    const rows = db.prepare("SELECT id,payload FROM leads WHERE delivery IN ('pending','failed') AND delivery_attempts<5 AND created_at>=? ORDER BY created_at LIMIT 50").all(since);
    for (const r of rows) await deliverOne(r.id, r.payload);
    return rows.length;
  }

  const limits = new Map();
  const clientIp = req => (trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';

  async function readJson(req, res) {
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) { json(res, 415, {error: 'Ожидается JSON.'}); return null; }
    if (Number(req.headers['content-length'] || 0) > 16384) { json(res, 413, {error: 'Слишком большой запрос.'}); return null; }
    const chunks = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 16384) { json(res, 413, {error: 'Слишком большой запрос.'}); return null; } chunks.push(chunk); }
    try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (body && typeof body === 'object' && !Array.isArray(body)) return body; } catch {}
    json(res, 400, {error: 'Некорректный запрос.'}); return null;
  }

  function validateLead(b) {
    const name = text(b.name, 80), phone = text(b.phone, 30), requestKey = text(b.requestKey, 80);
    if (!name || !phone || !requestKey || !/^[a-f0-9-]{36}$/i.test(requestKey)) return {error: 'Укажите имя и телефон.'};
    if (!/^[+\d\s().-]+$/.test(phone)) return {error: 'Телефон может содержать только цифры, пробелы, +, -, ( ).'};
    const digits = phone.replace(/\D/g, '').length;
    if (digits < 9 || digits > 15) return {error: 'Проверьте номер телефона, например +375 29 123-45-67.'};
    if (b.consent !== true) return {error: 'Нужно согласие на обработку персональных данных.'};
    if (b.kind === 'owner') {
      const message = text(b.message ?? '', 1000);
      if (b.deal !== 'sale' && b.deal !== 'rent') return {error: 'Выберите: продать или сдать.'};
      if (b.city !== '' && b.city != null && !CITIES.includes(b.city)) return {error: 'Выберите город из списка.'};
      if (b.rooms != null && b.rooms !== '' && !ROOMS.includes(b.rooms)) return {error: 'Выберите количество комнат из списка.'};
      if (message === null) return {error: 'Комментарий слишком длинный (до 1000 символов).'};
      return {requestKey, lead: {kind: 'owner', name, phone, deal: b.deal, city: b.city || '', rooms: b.rooms || '', message, consent: true}};
    }
    if (b.kind === 'viewing') {
      const o = typeof b.listingId === 'string' ? listings.get(b.listingId) : null;
      if (!o) return {error: 'Объект не найден. Обновите страницу.'};
      const agent = agents.get(o.agent);
      return {requestKey, lead: {kind: 'viewing', name, phone, consent: true,
        listing: {id: o.id, deal: o.deal, city: o.city, address: o.address, priceUsd: o.priceUsd, agent: agent ? agent.name : ''}}};
    }
    return {error: 'Неизвестный тип заявки.'};
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', CSP);
    if (publicOrigin.startsWith('https://')) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    let url; try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, {error: 'Некорректный адрес.'}); }
    const route = url.pathname;
    if (!allowIndexing || previewKey || route.startsWith('/admin') || route.startsWith('/api/')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      if (req.method === 'GET' && route === '/api/health') return json(res, 200, {ok: true});
      if (previewKey) {
        const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('nbel_preview='))?.slice('nbel_preview='.length) || '';
        if (req.method === 'GET' && route === '/' && secretEqual(url.searchParams.get('preview') || '', previewKey)) {
          const secure = publicOrigin.startsWith('https://');
          res.writeHead(303, {'Location': '/', 'Cache-Control': 'no-store', 'Set-Cookie': `nbel_preview=${previewKey}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure ? '; Secure' : ''}`}); res.end(); return;
        }
        if (!secretEqual(cookie, previewKey)) {
          if (route.startsWith('/api/')) return json(res, 401, {error: 'Откройте полную ссылку закрытого просмотра.'});
          res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
          res.end('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Недвижимость Беларуси — закрытый просмотр</title><h1>Недвижимость Беларуси</h1><p>Сайт в режиме закрытого просмотра. Откройте полную ссылку, которую прислал владелец.</p></html>'); return;
        }
      }
      if (req.method === 'GET' && route === '/api/config') return json(res, 200, {leads: !(requireConfiguredOrigin && !publicOrigin), managerDelivery: !!deliver, bot: data.site.bot || ''});

      if (route === '/api/admin/leads') {
        const supplied = req.headers.authorization || '', expected = `Bearer ${adminToken}`;
        if (!adminToken || adminToken.length < 24 || !secretEqual(supplied, expected)) return json(res, 401, {error: 'Неверный ключ доступа.'});
        if (req.method !== 'GET') return json(res, 405, {error: 'Метод не поддерживается.'});
        const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 300));
        const rows = db.prepare('SELECT id,created_at,kind,payload,delivery,delivery_error,delivered_at FROM leads ORDER BY created_at DESC LIMIT ?').all(limit);
        return json(res, 200, {leads: rows.map(r => ({id: r.id, createdAt: r.created_at, delivery: r.delivery, deliveryError: r.delivery_error, deliveredAt: r.delivered_at, ...JSON.parse(r.payload)}))});
      }

      if (route === '/api/leads') {
        if (req.method !== 'POST') return json(res, 405, {error: 'Метод не поддерживается.'});
        if (requireConfiguredOrigin && !publicOrigin) return json(res, 503, {error: 'Приём заявок ещё не настроен.'});
        const origin = req.headers.origin, expectedOrigin = publicOrigin || `http://${req.headers.host}`;
        const localOrigin = allowLocalOrigin && /^(?:127\.0\.0\.1|localhost):\d+$/.test(req.headers.host || '') ? `http://${req.headers.host}` : '';
        if (!origin || (origin !== expectedOrigin && origin !== localOrigin) || req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, {error: 'Заявку можно отправить только с сайта.'});
        const body = await readJson(req, res); if (!body) return;
        const v = validateLead(body); if (v.error) return json(res, 400, {error: v.error});
        const payload = JSON.stringify(v.lead);
        const existing = db.prepare('SELECT id,payload FROM leads WHERE request_key=?').get(v.requestKey);
        if (existing) { if (existing.payload !== payload) return json(res, 409, {error: 'Заявка изменилась. Отправьте её ещё раз.'}); return json(res, 200, {id: existing.id, status: 'saved'}); }
        const ip = clientIp(req), now = Date.now();
        if (limits.size > 1000) for (const [k, c] of limits) if (now - c.start > 600000) limits.delete(k);
        const cur = limits.get(ip), counter = !cur || now - cur.start > 600000 ? {start: now, count: 0} : cur;
        if (counter.count >= rateLimit) { res.setHeader('Retry-After', '600'); return json(res, 429, {error: 'Слишком много заявок подряд. Попробуйте через 10 минут.'}); }
        counter.count++; limits.set(ip, counter);
        const id = `L-${randomUUID().slice(0, 8).toUpperCase()}`;
        db.prepare('INSERT INTO leads (id,request_key,kind,payload,created_at,delivery) VALUES (?,?,?,?,?,?)').run(id, v.requestKey, v.lead.kind, payload, new Date().toISOString(), deliver ? 'pending' : 'not_configured');
        json(res, 201, {id, status: 'saved'});
        deliverOne(id, payload);
        return;
      }
      if (route.startsWith('/api/')) return json(res, 404, {error: 'Не найдено.'});
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, {error: 'Метод не поддерживается.'});

      if (route === '/robots.txt') {
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache'});
        return res.end(allowIndexing && !previewKey ? `User-agent: *\nDisallow: /admin\nDisallow: /api/\n${publicOrigin ? `Sitemap: ${publicOrigin}/sitemap.xml\n` : ''}` : 'User-agent: *\nDisallow: /\n');
      }
      if (route === '/sitemap.xml' && allowIndexing && publicOrigin) {
        res.writeHead(200, {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache'});
        return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicOrigin}/</loc></url></urlset>\n`);
      }
      const relative = route === '/' ? 'index.html' : route === '/admin' ? 'admin.html' : route.slice(1);
      const isPhoto = PHOTO_RE.test(relative) && photos.has(relative);
      const file = path.join(appDir, relative);
      if ((!STATIC_RE.test(relative) && !isPhoto) || !existsSync(file)) {
        res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}); return res.end(req.method === 'HEAD' ? undefined : NOT_FOUND);
      }
      const cache = relative.startsWith('fonts/') ? 'public, max-age=31536000, immutable' : isPhoto ? 'public, max-age=86400' : 'no-cache';
      res.writeHead(200, {'Content-Type': MIME[path.extname(file)], 'Cache-Control': cache});
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch (e) {
      log.error('Request failed:', e && e.code || 'error');
      if (!res.headersSent) json(res, 500, {error: 'Не удалось обработать запрос. Попробуйте ещё раз.'}); else res.end();
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  const close = () => new Promise(resolve => server.close(() => { try { db.close(); } catch {} resolve(); }));
  return {server, db, deliverPending, close, managerDelivery: !!deliver};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.NBEL_HOST || '127.0.0.1', port = Number(process.env.NBEL_PORT || process.argv[2] || 4300);
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error('Локальный просмотр запускается только на localhost. Для сервера используйте cloud.mjs.');
  const app = createSite();
  app.server.once('error', e => { app.db.close(); console.error(e.code === 'EADDRINUSE' ? `Порт ${port} занят. Попробуйте: node server.mjs ${port + 1}` : 'Не удалось запустить локальный просмотр.'); process.exitCode = 1; });
  app.server.listen(port, host, () => console.log(`Недвижимость Беларуси — локальный просмотр: http://${host}:${port}`));
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => app.close().then(() => process.exit(0)));
}
