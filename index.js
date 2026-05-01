require('dotenv').config();
const { Telegraf, Markup, Scenes } = require('telegraf');
const mongoose = require('mongoose');

// --- ИНИЦИАЛИЗАЦИЯ БОТА ---
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- НАСТРОЙКИ (Данные берутся из переменных окружения Render / .env) ---
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

// --- КОНФИГУРАЦИЯ ТЕКСТОВ ---
const TEXTS = {
  welcome: (name) => `Привет, ${name}! 👋\n\nДобро пожаловать в мой цифровой крипто-хаб. Здесь собраны все мои актуальные адреса кошельков, ссылки на проекты и контакты.`,
  instruction: `Нажми на кнопку ниже, чтобы открыть мою интерактивную визитку.`,
  projects: `Мои текущие проекты:\n\n🚀 DeFi Ecosystem — Разработка новых протоколов.\n🌐 Web3 Portfolio — Мои работы по блокчейну.\n💎 NFT Art — Коллекция цифрового искусства.`,
  contact: `Связаться со мной:\n\n✈️ Telegram: @allllbuquerque\n📧 Email: unnnacc@gmail.com\n🐙 GitHub: github.com/unnnacc`,
  order_start: `🛠 Давайте обсудим ваш проект!\n\nДля начала напишите, пожалуйста, какой стек технологий вам нужен? (например: React + Node.js или Fullstack)`,
  order_budget: `💰 Понял. Теперь подскажите примерный бюджет проекта или вилку цен?`,
  order_desc: `📝 И последнее: опишите задачу максимально подробно. Что именно нужно реализовать?`,
  order_success: `✅ Ваша заявка отправлена! Я изучу её и свяжусь с вами в ближайшее время.`,
  error: `Что-то пошло не так. Попробуй использовать команду /start снова.`
};

// --- СЦЕНА ЗАЯВКИ (Пошаговый опрос) ---
const orderScene = new Scenes.WizardScene(
  'ORDER_SCENE',
  // Шаг 1: Стек
  async (ctx) => {
    await ctx.reply(TEXTS.order_start);
    return await ctx.wizard.next();
  },
  // Шаг 2: Бюджет
  async (ctx) => {
    ctx.wizard.state.stack = ctx.message.text;
    await ctx.reply(TEXTS.order_budget);
    return await ctx.wizard.next();
  },
  // Шаг 3: Описание
  async (ctx) => {
    ctx.wizard.state.budget = ctx.message.text;
    await ctx.reply(TEXTS.order_desc);
    return await ctx.wizard.next();
  },
  // Шаг 4: Сохранение и уведомление
  async (ctx) => {
    const orderData = {
      userId: ctx.from.id.toString(),
      username: ctx.from.username || 'no_username',
      stack: ctx.wizard.state.stack,
      budget: ctx.wizard.state.budget,
      description: ctx.message.text,
    };

    try {
      // 1. Сохраняем в БД
      await Order.create(orderData);

      // 2. Формируем сообщение для вашего лог-чата
      const logMessage = `📦 *НОВАЯ ЗАЯВКА!*\n\n` +
        `👤 Пользователь: @${orderData.username} [${orderData.userId}]\n` +
        `🛠 Стек: ${orderData.stack}\n` +
        `💰 Бюджет: ${orderData.budget}\n` +
        `📝 Описание: ${orderData.description}`;

      await ctx.telegram.sendMessage(LOG_CHAT_ID, logMessage, { parse_mode: 'Markdown' });

      await ctx.reply(TEXTS.order_success);
    } catch (error) {
      console.error('Ошибка при сохранении заявки:', error);
      await ctx.reply('Произошла ошибка при сохранении заявки. Попробуйте позже.');
    }
    return await ctx.scene.leave();
  }
);

// --- РЕГИСТРАЦИЯ СЦЕН ---
const stage = new Scenes.Stage([orderScene]);
bot.use(stage);

// --- ОБРАБОТКА КОМАНД ---

// Команда /start
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Друг';
  
  ctx.reply(
    `${TEXTS.welcome(firstName)} ${TEXTS.instruction}`, 
    Markup.inlineKeyboard([
      [Markup.button.webApp('💳 Открыть визитку', WEBAPP_URL)],
      [Markup.button.callback('📝 Оставить заявку', 'start_order')]
    ])
  );
});

// Запуск сценария заявки
bot.action('start_order', (ctx) => ctx.scene.enter('ORDER_SCENE'));

// Команда /projects
bot.command('projects', (ctx) => {
  ctx.reply(TEXTS.projects);
});

// Команда /contact
bot.command('contact', (ctx) => {
  ctx.reply(TEXTS.contact);
});

// --- АДМИН-ПАНЕЛЬ ---

// Рассылка всем пользователям из БД
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  
  const message = ctx.message.text.replace('/broadcast ', '');
  if (!message) return ctx.reply('Введите текст рассылки: /broadcast Привет всем!');

  const users = await Order.distinct('userId'); 
  let count = 0;

  for (const userId of users) {
    try {
      await bot.telegram.sendMessage(userId, message);
      count++;
    } catch (e) { console.log(`User ${userId} blocked bot`); }
  }
  ctx.reply(`✅ Рассылка завершена. Получили ${count} пользователей.`);
});

// Статистика заявок
bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const totalOrders = await Order.countDocuments();
  ctx.reply(`📊 Всего заявок в базе: ${totalOrders}`);
});

// Обработка любого другого текста
bot.on('text', (ctx) => {
  ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть мою визитку, или /projects и /contact для быстрой информации.');
});

// --- ЗАПУСК СЕРВЕРА И БОТА ---

// Подключение к MongoDB и запуск
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    bot.launch()
      .then(() => console.log('🚀 Bot is online and listening!'))
      .catch((err) => console.error('Bot launch error:', err));
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); // Остановить процесс, если БД не доступна
  });

// Грациозная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// HTTP Сервер для Render (чтобы избежать Instance Failed)
const http = require('http');
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
}).listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});