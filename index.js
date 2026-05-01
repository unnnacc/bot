require('dotenv').config();
const { Telegraf, Markup, Scenes } = require('telegraf');
const mongoose = require('mongoose');

// --- ИНИЦИАЛИЗАЦИЯ БОТА ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- НАСТРОЙКИ (Секреты берутся из Render / .env) ---
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

// --- КОНФИГУРАЦИЯ ТЕКСТОВ (Ваши данные уже здесь) ---
const TEXTS = {
  welcome: (name) => `Привет, ${name}! 👋\n\nДобро пожаловать в мой цифровой крипто-хаб. Здесь собраны все мои актуальные адреса кошельков, ссылки на проекты и контакты.`,
  instruction: `Нажми на кнопку ниже, чтобы открыть мою интерактивную визитку.`,
  projects: `Мои текущие проекты:\n\n🚀 *DeFi Ecosystem* — Разработка новых протоколов.\n🌐 *Web3 Portfolio* — Мои работы по блокчейну.\n💎 *NFT Art* — Коллекция цифрового искусства.`,
  // Ссылка на GitHub теперь оформлена как гиперссылка [Текст](ссылка)
  contact: `Связаться со мной:\n\n✈️ Telegram: @allllbuquerque\n📧 Email: unnnacc@gmail.com\n🐙 GitHub: [github.com/unnnacc](https://github.com/unnnacc)`,
  order_start: `🛠 Давайте обсудим ваш проект!\n\nДля начала напишите, пожалуйста, какой стек технологий вам нужен? (например: React + Node.js или Fullstack)`,
  order_budget: `💰 Понял. Теперь подскажите примерный бюджет проекта или вилку цен?`,
  order_desc: `📝 И последнее: опишите задачу максимально подробно. Что именно нужно реализовать?`,
  order_success: `✅ Ваша заявка отправлена! Я изучу её и свяжусь с вами в ближайшее время.`,
  error: `Что-то пошло не так. Попробуй использовать команду /start снова.`
};

// --- СЦЕНА ЗАЯВКИ (Пошаговый опрос) ---
const orderScene = new Scenes.WizardScene(
  'ORDER_SCENE',
  async (ctx) => {
    await ctx.reply(TEXTS.order_start);
    return await ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.stack = ctx.message.text;
    await ctx.reply(TEXTS.order_budget);
    return await ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.budget = ctx.message.text;
    await ctx.reply(TEXTS.order_desc);
    return await ctx.wizard.next();
  },
  async (ctx) => {
    const orderData = {
      userId: ctx.from.id.toString(),
      username: ctx.from.username || 'no_username',
      stack: ctx.wizard.state.stack,
      budget: ctx.wizard.state.budget,
      description: ctx.message.text,
    };

    try {
      await Order.create(orderData);
      const logMessage = `📦 *НОВАЯ ЗАЯВКА!*\n\n` +
        `👤 Пользователь: @${orderData.username} [${orderData.userId}]\n` +
        `🛠 Стек: ${orderData.stack}\n` +
        `💰 Бюджет: ${orderData.budget}\n` +
        `📝 Описание: ${orderData.description}`;

      await ctx.telegram.sendMessage(LOG_CHAT_ID, logMessage, { parse_mode: 'Markdown' });
      await ctx.reply(TEXTS.order_success);
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      await ctx.reply('Произошла ошибка при сохранении заявки.');
    }
    return await ctx.scene.leave();
  }
);

// --- РЕГИСТРАЦИЯ СЦЕН ---
const stage = new Scenes.Stage([orderScene]);
bot.use(stage);

// --- ОБРАБОТКА КОМАНД ---

bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Друг';
  
  ctx.reply(
    `${TEXTS.welcome(firstName)} ${TEXTS.instruction}`, 
    Markup.inlineKeyboard([
      // Заменяем .webApp на .url. Это работает стабильнее всего.
      [Markup.button.url('💳 Открыть визитку', WEBAPP_URL)], 
      [Markup.button.callback('📝 Оставить заявку', 'start_order')]
    ])
  );
});
// Обработчик кнопки "Оставить заявку"
bot.action('start_order', async (ctx) => {
  console.log('Callback start_order received'); 
  
  // Проверяем, подключены ли сцены к контексту
  if (ctx.scene) {
    try {
      await ctx.scene.enter('ORDER_SCENE');
    } catch (e) {
      console.error('Scene enter error:', e);
      await ctx.reply('Ошибка при запуске опроса. Попробуйте снова.');
    }
  } else {
    console.error('CRITICAL: Scenes are not registered in the bot!');
    await ctx.reply('Ошибка: Система опроса не инициализирована. Пожалуйста, свяжитесь с администратором.');
  }
});

// Используем parse_mode: 'Markdown' для красивой ссылки на GitHub
bot.command('projects', (ctx) => {
  ctx.reply(TEXTS.projects, { parse_mode: 'Markdown' });
});

bot.command('contact', (ctx) => {
  ctx.reply(TEXTS.contact, { parse_mode: 'Markdown' });
});

// --- АДМИН-ПАНЕЛЬ ---

bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const message = ctx.message.text.replace('/broadcast ', '');
  if (!message) return ctx.reply('Введите текст рассылки.');
  const users = await Order.distinct('userId'); 
  let count = 0;
  for (const userId of users) {
    try { await bot.telegram.sendMessage(userId, message); count++; } catch (e) {}
  }
  ctx.reply(`✅ Рассылка завершена. Получили ${count} пользователей.`);
});

bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const total = await Order.countDocuments();
  ctx.reply(`📊 Всего заявок в базе: ${total}`);
});

bot.on('text', (ctx) => {
  ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть мою визитку.');
});

// --- ЗАПУСК ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    bot.launch().then(() => console.log('🚀 Bot Online!'));
  })
  .catch(err => {
    console.error('❌ DB Error:', err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const http = require('http');
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200); res.end('OK');
}).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});