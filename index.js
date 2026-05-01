require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

// --- ИНИЦИАЛИЗАЦИЯ БОТА ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- НАСТРОЙКИ (Секреты из Render / .env) ---
const ADMIN_ID = process.env.ADMIN_ID; 
const LOG_CHAT_ID = process.env.LOG_CHAT_ID; 
const MONGO_URI = process.env.MONGO_URI; 
const WEBAPP_URL = process.env.WEBAPP_URL;

// --- МОДЕЛЬ ДАННЫХ MONGODB ---
const OrderSchema = new mongoose.Schema({
  userId: String,
  username: String,
  stack: String,
  budget: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// Временное хранилище состояний опроса
const userStates = {}; 

// --- КОНФИГУРАЦИЯ ТЕКСТОВ ---
const TEXTS = {
  welcome: (name) => `Привет, ${name}! 👋\n\nДобро пожаловать в мой цифровой крипто-хаб. Здесь собраны все мои актуальные адреса кошельков, ссылки на проекты и контакты.`,
  instruction: `Нажми на кнопку ниже, чтобы открыть мою интерактивную визитку.`,
  projects: `Мои текущие проекты:\n\n🚀 *DeFi Ecosystem* — Разработка новых протоколов.\n🌐 *Web3 Portfolio* — Мои работы по блокчейну.\n💎 *NFT Art* — Коллекция цифрового искусства.`,
  contact: `Связаться со мной:\n\n✈️ Telegram: @allllbuquerque\n📧 Email: unnnacc@gmail.com\n🐙 GitHub: [github.com/unnnacc](https://github.com/unnnacc)`,
  order_start: `🛠 Давайте обсудим ваш проект!\n\nДля начала напишите, пожалуйста, какой стек технологий вам нужен? (например: React + Node.js или Fullstack)`,
  order_budget: `💰 Понял. Теперь подскажите примерный бюджет проекта или вилку цен?`,
  order_desc: `📝 И последнее: опишите задачу максимально подробно. Что именно нужно реализовать?`,
  order_success: `✅ Ваша заявка отправлена! Я изучу её и свяжусь с вами в ближайшее время.`,
  error: `Что-то пошло не так. Попробуй использовать команду /start снова.`
};

// --- ОБРАБОТКА КОМАНД (Должны быть ВЫШЕ общего обработчика текста) ---

bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Друг';
  ctx.reply(
    `${TEXTS.welcome(firstName)} ${TEXTS.instruction}`, 
    Markup.inlineKeyboard([
      [Markup.button.url('💳 Открыть визитку', WEBAPP_URL)],
      [Markup.button.callback('📝 Оставить заявку', 'start_order')]
    ])
  );
});

bot.command('projects', (ctx) => {
  ctx.reply(TEXTS.projects, { parse_mode: 'Markdown' });
});

bot.command('contact', (ctx) => {
  ctx.reply(TEXTS.contact, { parse_mode: 'Markdown' });
});

// Админ-команда: Рассылка
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const message = ctx.message.text.replace('/broadcast ', '');
  if (!message) return ctx.reply('Введите текст рассылки: /broadcast Привет всем!');
  
  try {
    const users = await Order.distinct('userId'); 
    let count = 0;
    for (const userId of users) {
      try { await bot.telegram.sendMessage(userId, message); count++; } catch (e) {}
    }
    ctx.reply(`✅ Рассылка завершена. Получили ${count} пользователей.`);
  } catch (e) {
    ctx.reply('Ошибка при выполнении рассылки.');
  }
});

// Админ-команда: Статистика
bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  try {
    const total = await Order.countDocuments();
    ctx.reply(`📊 Всего заявок в базе: ${total}`);
  } catch (e) {
    ctx.reply('Ошибка при получении статистики.');
  }
});

// Обработчик кнопки "Оставить заявку" (Запуск опроса)
bot.action('start_order', async (ctx) => {
  const userId = ctx.from.id.toString();
  userStates[userId] = { step: 'WAITING_FOR_STACK' };
  await ctx.reply(TEXTS.order_start);
});

// --- ГЛАВНЫЙ ОБРАБОТЧИК СООБЩЕНИЙ (Логика состояний) ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;

  // Если сообщение начинается со слэша, игнорируем его здесь (чтобы сработали команды выше)
  if (text.startsWith('/')) return;

  const state = userStates[userId];

  // Если пользователь НЕ в режиме опроса
  if (!state) {
    return ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть мою визитку, или /projects и /contact для быстрой информации.');
  }

  // ЛОГИКА ОПРОСА
  if (state.step === 'WAITING_FOR_STACK') {
    userStates[userId].stack = text;
    userStates[userId].step = 'WAITING_FOR_BUDGET';
    await ctx.reply(TEXTS.order_budget);
  } 
  else if (state.step === 'WAITING_FOR_BUDGET') {
    userStates[userId].budget = text;
    userStates[userId].step = 'WAITING_FOR_DESC';
    await ctx. // reply
    await ctx.reply(TEXTS.order_desc);
  } 
  else if (state.step === 'WAITING_FOR_DESC') {
    const finalData = {
      userId: userId,
      username: ctx.from.username || 'no_username',
      stack: state.stack,
      budget: state.budget,
      description: text,
    };

    try {
      await Order.create(finalData);
      const logMessage = `📦 *НОВАЯ ЗАЯВКА!*\n\n👤 @${finalData.username} [${finalData.userId}]\n🛠 Стек: ${finalData.stack}\n💰 Бюджет: ${finalData.budget}\n📝 Описание: ${finalData.description}`;
      await ctx.telegram.sendMessage(LOG_CHAT_ID, logMessage, { parse_mode: 'Markdown' });
      await ctx.reply(TEXTS.order_success);
    } catch (e) {
      console.error('DB Error:', e);
      await ctx.reply('Ошибка при сохранении заявки.');
    }
    delete userStates[userId]; // Завершаем опрос, удаляя состояние
  }
});

// --- ЗАПУСК СЕРВЕРА И БОТА ---

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    bot.launch()
      .then(() => console.log('🚀 Bot is online and listening!'))
      .catch((err) => console.error('Bot launch error:', err));
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// HTTP Сервер для Render (чтобы избежать Instance Failed)
const http = require('http');
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});