/* eslint-disable no-console */
// Первичная настройка Uptime Kuma: администратор, уведомление в Telegram, мониторы API
// и фронтенда, публичная статус-страница. Повторный запуск ничего не дублирует.
// Выполняется внутри контейнера uptime-kuma (использует его socket.io-client):
//   docker compose -f docker-compose.prod.yml exec -T \
//     -e KUMA_USER -e KUMA_PASS -e TELEGRAM_BOT_TOKEN -e TELEGRAM_CHAT_ID \
//     uptime-kuma node - < deploy/uptime-kuma-setup.js
const { io } = require('/app/node_modules/socket.io-client');

const DOMAIN = process.env.APP_DOMAIN || 'gtd.cloudyyy.tech';
const SLUG = 'gtd';
const socket = io('http://127.0.0.1:3001', { transports: ['websocket'] });

let monitorList = null;
let notificationList = null;
socket.on('monitorList', (list) => { monitorList = list; });
socket.on('notificationList', (list) => { notificationList = list; });
socket.on('connect_error', (error) => console.error('connect_error', error.message));
setTimeout(() => { console.error('timeout'); process.exit(1); }, 60000);

const call = (event, ...args) => new Promise((resolve, reject) => {
  socket.emit(event, ...args, (res) => (res && res.ok === false ? reject(new Error(`${event}: ${res.msg}`)) : resolve(res)));
});
const waitFor = async (read) => {
  for (let i = 0; i < 50 && !read(); i += 1) await new Promise((r) => setTimeout(r, 100));
  return read();
};

const MONITORS = [
  {
    name: 'GTD API (/health/ready)',
    url: `https://api.${DOMAIN}/health/ready`,
    // ответ должен подтверждать доступность базы данных
    keyword: '"database":{"status":"up"',
  },
  { name: 'GTD Web (фронтенд)', url: `https://${DOMAIN}/`, keyword: '<div id="root">' },
];

const monitorPayload = ({ name, url, keyword }, notificationId) => ({
  type: 'keyword', name, url, keyword, invertKeyword: false, method: 'GET', active: true,
  interval: 60, retryInterval: 20, maxretries: 2, timeout: 20, resendInterval: 0,
  accepted_statuscodes: ['200-299'], maxredirects: 5, ignoreTls: false, expiryNotification: true,
  notificationIDList: notificationId ? { [notificationId]: true } : {},
  conditions: [], kafkaProducerBrokers: [], kafkaProducerSaslOptions: {}, rabbitmqNodes: [],
});

async function ensureTelegram() {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env;
  if (!token || !chatId) {
    console.log('telegram: переменные не заданы, уведомление пропущено');
    return null;
  }
  const list = (await waitFor(() => notificationList)) || [];
  const existing = list.find((n) => n.name === 'Telegram (GTD)');
  const res = await call('addNotification', {
    name: 'Telegram (GTD)', type: 'telegram', isDefault: true, applyExisting: true,
    telegramBotToken: token, telegramChatID: chatId, telegramSendSilently: false,
    telegramProtectContent: false,
  }, existing ? existing.id : null);
  console.log('telegram notification', res.id);
  return res.id;
}

socket.once('connect', async () => {
  try {
    if (await new Promise((r) => socket.emit('needSetup', r))) {
      await call('setup', process.env.KUMA_USER, process.env.KUMA_PASS);
      console.log('admin created');
    }
    await call('login', { username: process.env.KUMA_USER, password: process.env.KUMA_PASS, token: '' });
    const notificationId = await ensureTelegram();

    const existing = Object.values((await waitFor(() => monitorList)) || {});
    const ids = [];
    for (const m of MONITORS) {
      const found = existing.find((x) => x.name === m.name);
      if (found) {
        await call('editMonitor', { ...found, ...monitorPayload(m, notificationId), id: found.id });
        ids.push(found.id);
      } else {
        ids.push((await call('add', monitorPayload(m, notificationId))).monitorID);
      }
    }
    console.log('monitors', ids);

    await call('addStatusPage', 'GTD Task Service', SLUG).catch(() => {});
    await call('saveStatusPage', SLUG, {
      slug: SLUG, title: 'GTD Task Service — доступность', description: 'Состояние REST API и веб-клиента сервиса планирования задач',
      autoRefreshInterval: 60, theme: 'auto', showTags: false, showPoweredBy: false, showCertificateExpiry: true,
      footerText: 'Проверка каждые 60 секунд', customCSS: '', analyticsType: null, analyticsId: null,
      analyticsScriptUrl: null, domainNameList: [],
    }, '/icon.svg', [{ name: 'Сервисы', monitorList: ids.map((id) => ({ id })) }]);
    console.log(`status page: /status/${SLUG}`);
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
});
