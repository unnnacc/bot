require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- КОНФИГУРАЦИЯ ТЕКСТОВ ---
const TEXTS = {
  welcome: (name) => `*Привет, ${name}!* 👋\n\nДобро пожаловать в мой цифровой крипто-хаб. Здесь собраны все мои актуальные адреса кошельков, ссылки на проекты и контакты.`,
  instruction: `Нажми на кнопку ниже, чтобы открыть мою интерактивную визитку.`,
  projects: `*Мои текущие проекты:*\n\n🚀 *DeFi Ecosystem* — Разработка новых протоколов.\n🌐 *Web3 Portfolio* — Мои работы по блокчейну.\n💎 *NFT Art* — Коллекция цифрового искусства.`,
  contact: `*Связаться со мной:*\n\n✈️ Telegram: @ваш_ник\n📧 Email: your@email.com\n🐙 GitHub: github.com/ваш_ник`,
  error: `Что-то пошло не так. Попробуй использовать команду /start снова.`
};

// --- ОБРАБОТКА КОМАНД ---

// Команда /start
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Друг';
  
  ctx.replyWithMarkdownV2(
    `${TEXTS.welcome(firstName).replace(/\./g, '\\.')} ${TEXTS.instruction.replace(/\./g, '\\.')}`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть визитку', process.env.WEBAPP_URL)]
    ])
  );
});

// Команда /projects
bot.command('projects', (ctx) => {
  ctx.replyWithMarkdownV2(TEXTS.projects.replace(/\./g, '\\.'));
});

// Команда /contact
bot.command('contact', (ctx) => {
  ctx.replyWithMarkdownV2(TEXTS.contact.replace(/\./g, '\\.'));
});

// Обработка любого другого сообщения (чтобы бот не молчал)
bot.on('text', (ctx) => {
  ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть мою визитку, или /projects и /contact для быстрой информации.');
});

// Запуск бота
bot.launch()
  .then(() => console.log('🚀 Бот запущен и готов к работе!'))
  .catch((err) => console.error('Ошибка при запуске бота:', err));

// Грациозная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Добавьте это в самый конец файла index.js
const http = require('http');
const port = process.env.PORT || 8080;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});