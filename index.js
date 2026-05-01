require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

const bot = new Telegraf(process.env.BOT_TOKEN);

const ADMIN_ID = process.env.ADMIN_ID; 
const LOG_CHAT_ID = process.env.LOG_CHAT_ID; 
const MONGO_URI = process.env.MONGO_URI; 
const WEBAPP_URL = process.env.WEBAPP_URL;

// --- МОДЕЛЬ ДАННЫХ ---
const OrderSchema = new mongoose.Schema({
  userId: String,
  username: String,
  stack: String,
  budget: String,
  description: String,
  status: { type: String, default: 'completed' }, // Для отслеживания этапа
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// Временное хранилище для пользователей, которые прямо сейчас проходят опрос
// (В идеале это можно перенести в MongoDB, но для скорости используем объект)
const userStates = {}; 

const TEXTS = {
  welcome: (name) => `Привет, ${name}! 👋\n\nДобро пожаловать в мой цифровой крипто-хаб.`,
  instruction: `Нажми на кнопку ниже, чтобы открыть мою интерактивную визитку.`,
  order_start: `🛠 Давайте обсудим ваш проект!\n\nДля начала напишите, какой стек технологий вам нужен?`,
  order_budget: `💰 Понял. Теперь подскажите примерный бюджет проекта или вилку цен?`,
  order_desc: `📝 И последнее: опишите задачу максимально подробно.`,
  order_success: `✅ Ваша заявка отправлена! Я свяжусь с вами в ближайшее время.`,
  projects: `Мои текущие проекты:\n\n🚀 DeFi Ecosystem\n🌐 Web3 Portfolio\n💎 NFT Art`,
  contact: `Связаться со мной:\n\n✈️ Telegram: @allllbuquerque\n📧 Email: unnnacc@gmail.com\n🐙 GitHub: [github.com/unnnacc](https://github.com/unnnacc)`,
};

// --- ОБРАБОТКА КОМАНД ---

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

// ЗАПУСК ОПРОСА
bot.action('start_order', async (ctx) => {
  const userId = ctx.from.id.toString();
  userStates[userId] = { step: 'WAITING_FOR_STACK' };
  await ctx.reply(TEXTS.order_start);
});

// ГЛАВНЫЙ ОБРАБОТЧИК СООБЩЕНИЙ (Логика состояний)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const state = userStates[userId];

  // Если пользователь не в режиме опроса, обрабатываем обычные команды
  if (!state) {
    if (ctx.message.text === '/projects') return ctx.reply(TEXTS.projects);
    if (ctx.message.text === '/contact') return ctx.reply(TEXTS.contact, { parse_mode: 'Markdown' });
    return ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть мою визитку.');
  }

  // ЛОГИКА ОПРОСА
  if (state.step === 'WAITING_FOR_STACK') {
    userStates[userId].stack = ctx.message.text;
    userStates[userId].step = 'WAITING_FOR_BUDGET';
    await ctx.reply(TEXTS.order_budget);
  } 
  else if (state.step === 'WAITING_FOR_BUDGET') {
    userStates[userId].budget = ctx.message.text;
    userStates[userId].step = 'WAITING_FOR_DESC';
    await ctx.reply(TEXTS.order_desc);
  } 
  else if (state.step === 'WAITING_FOR_DESC') {
    const finalData = {
      userId: userId,
      username: ctx.from.username || 'no_username',
      stack: state.stack,
      budget: state.budget,
      description: ctx.message.text,
    };

    try {
      await Order.create(finalData);
      const logMessage = `📦 *НОВАЯ ЗАЯВКА!*\n\n👤 @${finalData.username}\n🛠 ${finalData.stack}\n💰 ${finalData.budget}\n📝 ${finalData.description}`;
      await ctx.telegram.sendMessage(LOG_CHAT_ID, logMessage, { parse_mode: 'Markdown' });
      await ctx.reply(TEXTS.order_success);
    } catch (e) {
      await ctx.reply('Ошибка при сохранении.');
    }
    delete userStates[userId]; // Завершаем опрос
  }
});

// АДМИНКА
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const msg = ctx.message.text.replace('/broadcast ', '');
  const users = await Order.distinct('userId'); 
  let count = 0;
  for (const id of users) { try { await bot.telegram.sendMessage(id, msg); count++; } catch (e) {} }
  ctx.reply(`✅ Рассылка завершена. Получили ${count} пользователей.`);
});

bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const total = await Order.countDocuments();
  ctx.reply(`📊 Всего заявок в базе: ${total}`);
});

// ЗАПУСК
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    bot.launch().then(() => console.log('🚀 Bot Online!'));
  })
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);