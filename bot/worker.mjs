// Telegram-бот агентства «Недвижимость Беларуси».
// Запуск: node bot/worker.mjs   (отдельный сервис Railway, Dockerfile.bot)
// Режимы: NBEL_BOT_MODE=check — только проверить токен и вывести username; poll — отвечать клиентам.
import http from 'node:http';
import path from 'node:path';
import {readFileSync, writeFileSync, mkdirSync, existsSync, renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wait = ms => new Promise(r => setTimeout(r, ms));

export function botConfig(env = process.env) {
  const token = env.NBEL_BOT_TOKEN || '';
  const mode = env.NBEL_BOT_MODE || 'check';
  if (!['check', 'poll'].includes(mode)) throw new Error('NBEL_BOT_MODE must be "check" or "poll".');
  if (!/^\d{5,15}:[A-Za-z0-9_-]{30,}$/.test(token)) throw new Error('NBEL_BOT_TOKEN: paste the bot token from @BotFather.');
  const origin = env.NBEL_PUBLIC_ORIGIN || '';
  let u; try { u = new URL(origin); } catch { throw new Error('NBEL_PUBLIC_ORIGIN: set the site address, e.g. https://name.up.railway.app'); }
  if (u.protocol !== 'https:' || u.origin !== origin) throw new Error('NBEL_PUBLIC_ORIGIN: exact HTTPS address without a trailing slash.');
  const dataDir = env.NBEL_BOT_DATA_DIR || '/data';
  if (!path.isAbsolute(dataDir)) throw new Error('NBEL_BOT_DATA_DIR must be an absolute path, e.g. /data');
  return {token, mode, origin, dataDir, enabled: env.NBEL_BOT_ENABLED === 'true', registerCommands: env.NBEL_BOT_REGISTER_COMMANDS === 'true', port: Number(env.PORT || 0)};
}

export function texts(site, origin) {
  const catalog = {text: '🏠 Открыть каталог', web_app: {url: origin}};
  const rows = [[catalog]];
  if (site.telegram) rows.push([{text: '📣 Наш Telegram-канал', url: site.telegram}]);
  const keyboard = {inline_keyboard: rows};
  const contacts = [`📞 ${site.phone}`, `📍 ${site.address}`, site.telegram ? `📣 ${site.telegram.replace('https://', '')}` : '', site.email ? `✉️ ${site.email}` : '', site.hours ? `🕘 ${site.hours}` : ''].filter(Boolean).join('\n');
  return {
    start: {text: `Здравствуйте! Это бот агентства «${site.name}».\n\nЗдесь можно посмотреть квартиры, дома и коммерческую недвижимость в Минске и области — с фотографиями, ценами и фильтрами, и записаться на просмотр.\n\nНажмите «Открыть каталог».\n\n${contacts}`, reply_markup: keyboard},
    catalog: {text: 'Каталог объектов агентства — нажмите кнопку ниже.', reply_markup: {inline_keyboard: [[catalog]]}},
    contacts: {text: `${site.legalName}\n${contacts}\nУНП ${site.unp}. Лицензия ${site.license}.`, reply_markup: keyboard},
    other: {text: `Спасибо за сообщение! Этот бот не ведёт переписку.\n\nОткройте каталог и оставьте заявку на понравившийся объект — менеджер свяжется с вами. Или позвоните: ${site.phone}.`, reply_markup: keyboard},
  };
}

export function createBot({token, origin, dataDir, site, fetchImpl = fetch, log = console}) {
  const T = texts(site, origin);
  const stateFile = path.join(dataDir, 'bot-state.json');
  let offset = 0;
  try { if (existsSync(stateFile)) offset = JSON.parse(readFileSync(stateFile, 'utf8')).offset || 0; } catch {}
  const saveOffset = () => { mkdirSync(dataDir, {recursive: true}); const tmp = stateFile + '.tmp'; writeFileSync(tmp, JSON.stringify({offset})); renameSync(tmp, stateFile); };

  async function api(method, params = {}, timeoutMs = 15000) {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(params), signal: AbortSignal.timeout(timeoutMs)});
    let body = {}; try { body = await res.json(); } catch {}
    if (!body.ok) { const e = new Error(`${method}: ${body.description || res.status}`); e.code = body.error_code || res.status; e.retryAfter = body.parameters && body.parameters.retry_after; throw e; }
    return body.result;
  }

  function reply(update) {
    const m = update.message;
    if (!m || !m.chat || m.chat.type !== 'private') return null;
    const cmd = (m.text || '').trim().split(/[\s@]/)[0].toLowerCase();
    const t = cmd === '/start' ? T.start : cmd === '/catalog' ? T.catalog : cmd === '/contacts' ? T.contacts : T.other;
    return {chat_id: m.chat.id, ...t, disable_web_page_preview: true};
  }

  async function check() {
    const me = await api('getMe');
    log.log(`NBEL bot check passed. username: ${me.username}`);
    if (site.bot && site.bot.toLowerCase() !== String(me.username).toLowerCase()) log.log(`Note: app/data.json "bot" is ${site.bot}, the token belongs to ${me.username}.`);
    const hook = await api('getWebhookInfo');
    if (hook.url) log.log('Warning: this bot has a webhook set by another service. Polling will not start until it is removed in that service.');
    return me;
  }

  async function register() {
    await api('setMyCommands', {commands: [{command: 'start', description: 'Начать'}, {command: 'catalog', description: 'Каталог объектов'}, {command: 'contacts', description: 'Контакты агентства'}]});
    await api('setChatMenuButton', {menu_button: {type: 'web_app', text: 'Каталог', web_app: {url: origin}}});
    log.log('NBEL bot commands and menu button registered.');
  }

  async function pollOnce() {
    const updates = await api('getUpdates', {offset, timeout: 25, allowed_updates: ['message']}, 35000);
    for (const u of updates) {
      const r = reply(u);
      if (r) { try { await api('sendMessage', r); } catch (e) { if (e.retryAfter) await wait(e.retryAfter * 1000); else log.error(`Reply failed: ${e.message}`); } }
      offset = u.update_id + 1;
      saveOffset();
    }
    return updates.length;
  }

  return {check, register, pollOnce, reply, api, get offset() { return offset; }};
}

function healthServer(port) {
  if (!port) return null;
  const s = http.createServer((req, res) => { res.writeHead(req.url === '/api/health' ? 200 : 404, {'Content-Type': 'application/json'}); res.end(req.url === '/api/health' ? '{"ok":true}' : '{}'); });
  s.listen(port, '0.0.0.0');
  return s;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let cfg;
  try { cfg = botConfig(); } catch (e) { console.error(e.message); healthServer(Number(process.env.PORT || 0)); setInterval(() => {}, 1 << 30); }
  if (cfg) {
    healthServer(cfg.port);
    const site = JSON.parse(readFileSync(path.join(root, 'app/data.json'), 'utf8')).site;
    const bot = createBot({...cfg, site});
    let stop = false;
    process.on('SIGTERM', () => { stop = true; setTimeout(() => process.exit(0), 1000).unref(); });
    process.on('SIGINT', () => { stop = true; setTimeout(() => process.exit(0), 1000).unref(); });
    (async () => {
      try { await bot.check(); } catch (e) { console.error(`NBEL bot check failed: ${e.message}`); }
      if (cfg.mode !== 'poll') { console.log('Mode: check. Set NBEL_BOT_MODE=poll and NBEL_BOT_ENABLED=true to start answering clients.'); return; }
      if (!cfg.enabled) { console.log('Mode: poll, but NBEL_BOT_ENABLED is not true. The bot is idle.'); return; }
      if (cfg.registerCommands) { try { await bot.register(); } catch (e) { console.error(`Register failed: ${e.message}`); } }
      console.log('NBEL bot is polling. Clients get the catalog button.');
      while (!stop) {
        try { await bot.pollOnce(); }
        catch (e) {
          if (e.code === 409) { console.error('Another process is already receiving updates for this bot (409). Stop it or use a different bot. Retrying in 60 s.'); await wait(60000); }
          else if (e.retryAfter) await wait(e.retryAfter * 1000);
          else { console.error(`Polling error: ${e.message}`); await wait(5000); }
        }
      }
    })();
    setInterval(() => {}, 1 << 30);
  }
}
