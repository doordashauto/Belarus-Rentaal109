import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSite} from './server.mjs';
import {startBackups} from './scripts/backup.mjs';

export function runtimeConfig(env = process.env) {
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const dataDir = env.NBEL_DATA_DIR || '/data';
  if (!path.isAbsolute(dataDir)) throw new Error('NBEL_DATA_DIR must be an absolute persistent-volume path.');
  const publicOrigin = env.NBEL_PUBLIC_ORIGIN || '';
  if (publicOrigin) {
    let u; try { u = new URL(publicOrigin); } catch { throw new Error('NBEL_PUBLIC_ORIGIN: set a valid HTTPS origin.'); }
    if (u.protocol !== 'https:' || u.origin !== publicOrigin) throw new Error('NBEL_PUBLIC_ORIGIN: use the exact HTTPS origin, without path, query or trailing slash.');
  }
  const adminToken = env.NBEL_ADMIN_TOKEN || '';
  if (adminToken && adminToken.length < 24) throw new Error('NBEL_ADMIN_TOKEN must be at least 24 random characters.');
  const telegramToken = env.NBEL_TELEGRAM_BOT_TOKEN || '', telegramChatId = env.NBEL_TELEGRAM_CHAT_ID || '';
  if (!!telegramToken !== !!telegramChatId) throw new Error('Set both NBEL_TELEGRAM_BOT_TOKEN and NBEL_TELEGRAM_CHAT_ID, or neither.');
  if (telegramToken && !/^\d{5,15}:[A-Za-z0-9_-]{30,}$/.test(telegramToken)) throw new Error('NBEL_TELEGRAM_BOT_TOKEN does not look like a BotFather token.');
  if (telegramChatId && !/^-?\d{3,20}$/.test(telegramChatId)) throw new Error('NBEL_TELEGRAM_CHAT_ID must be a numeric chat ID.');
  return {port, dataDir, publicOrigin, adminToken, telegramToken, telegramChatId, allowIndexing: env.NBEL_ALLOW_INDEXING === 'true',
    previewKey: env.NBEL_PREVIEW_KEY || '', allowLocalOrigin: false, requireConfiguredOrigin: true, trustProxy: true};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {port, ...config} = runtimeConfig();
    const app = createSite(config);
    const stopBackups = startBackups(path.join(config.dataDir, 'leads.sqlite'));
    const retry = setInterval(() => app.deliverPending().catch(() => {}), 5 * 60e3); retry.unref();
    setTimeout(() => app.deliverPending().catch(() => {}), 10e3).unref();
    app.server.once('error', () => { try { app.db.close(); } catch {} console.error('NBEL could not start. Check the port and persistent-volume permissions.'); process.exitCode = 1; });
    app.server.listen(port, '0.0.0.0', () => console.log(`NBEL web service is listening. Manager delivery: ${app.managerDelivery ? 'Telegram' : 'not configured'}. Lead form: ${config.publicOrigin ? 'on' : 'off until NBEL_PUBLIC_ORIGIN is set'}.`));
    let stopping = false;
    const stop = () => { if (stopping) return; stopping = true; stopBackups(); clearInterval(retry); const deadline = setTimeout(() => process.exit(1), 10000); deadline.unref(); app.close().then(() => { clearTimeout(deadline); process.exit(0); }); app.server.closeIdleConnections(); };
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
