require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- НАСТРОЙКИ ---
const ADMIN_ID = process.env.ADMIN_ID; 
const LOG_CHAT_ID = process.env.LOG_CHAT_ID; 
const MONGO_URI = process.env.MONGO_URI; 
const WEBAPP_URL = process.env.WEBAPP_URL;
const BANNER_URL = 'https://cdn.pixabay.com/photo/2021/08/25/1 la-high-tech-6264115_1280.jpg'; // Замените на свое фото/лого

// --- МОДЕЛЬ ДАННЫХ ---
const OrderSchema = new mongoose.Schema({
  userId: String,
  username: String,
  stack: String,
  budget: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const userStates = {}; 

// --- ВИЗУАЛЬНЫЕ КОНСТАНТЫ ---
const UI = {
  line: '━━━━━━━━━━━━━━━━━━━━',
  bullet: '🔹',
  star: '🌟',
  check: '✅'
};

const TEXTS = {
  welcome: (name) => `*${UI.star} ПРИВЕТСТВУЮ, ${name.toUpperCase()}! ${UI.star}*\n\nДобро пожаловать в мой цифровой крипто-хаб. Я твой персональный ассистент. Здесь собрано всё: от моих кошельков до профессионального бэкенда.`,
  main_menu: `Что ты хочешь сделать сейчас? Выбери вариант в меню ниже:`,
  projects: `*${UI.star} МОИ ПРОЕКТЫ ${UI.star}*\n${UI.line}\n\n${UI.bullet} *DeFi Ecosystem* — Разработка инновационных протоколов.\n${UI.bullet} *Web3 Portfolio* — Кейсы по блокчейну и смарт-контрактам.\n${UI.bullet} *NFT Art* — Коллекция цифрового искусства.\n\n${UI.line}\n_Все проекты созданы с применением современных Fullstack технологий._`,
  contact: `*${UI.star} КОНТАКТЫ ${UI.star}*\n${UI.line}\n\n✈️ *Telegram:* @allllbuquerque\n📧 *Email:* unnnacc@gmail.com\n🐙 *GitHub:* [github.com/unnnacc](https://github.com/unnnacc)\n\n${UI.line}\n_Пишите, буду рад сотрудничеству!_`,
  order_start: `🛠 *ЗАЯВКА НА РАЗРАБОТКУ*\n${UI.line}\n\nДля начала напишите, пожалуйста, какой *стек технологий* вам нужен? (например: React + Node.js)`,
  order_budget: `💰 *БЮДЖЕТ*\n${UI.line}\n\nПодскажите примерный бюджет проекта или вилку цен?`,
  order_desc: `📝 *ДЕТАЛИ ЗАДАЧИ*\n${UI.line}\n\nОпишите задачу максимально подробно. Что именно нужно реализовать?`,
  order_success: `*${UI.check} ЗАЯВКА ПРИНЯТА!*\n\nЯ получил все данные и приступлю к изучению. Свяжусь с вами в ближайшее время!`,
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const sendMainMenu = (ctx) => {
  return ctx.reply(TEXTS.main_menu, Markup.inlineKeyboard([
    [Markup.button.url('💳 Моя Визитка', WEBAPP_URL)],
    [Markup.button.callback('🚀 Мои проекты', 'show_projects'), Markup.button.callback('✉️ Контакты', 'show_contacts')],
    [Markup.button.callback('📝 Оставить заявку', 'start_order')]
  ]));
};

// --- ОБРАБОТКА КОМАНД ---

bot.start(async (ctx) => {
  const firstName = ctx.from.first_name || 'Друг';
  
  // Отправляем красивый баннер
  await ctx.sendPhoto(BANNER_URL, { 
    caption: `${TEXTS.welcome(firstName)}`, 
    parse_mode: 'Markdown' 
  });
  
  // Сразу под баннером выводим меню
  await sendMainMenu(ctx);
});

// Обработка кнопок меню
bot.action('show_projects', (ctx) => {
  ctx.reply(TEXTS.projects, { parse_mode: 'Markdown' });
  ctx.answerCbQuery(); // Убирает «часики» на кнопке
});

bot.action('show_contacts', (ctx) => {
  ctx.reply(TEXTS.contact, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

bot.action('start_order', async (ctx) => {
  const userId = ctx.from.id.toString();
  userStates[userId] = { step: 'WAITING_FOR_STACK' };
  await ctx.reply(TEXTS.order_start, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

// --- ЛОГИКА ОПРОСА (State Machine) ---
bot.on('text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;

  if (text.startsWith('/')) return;

  // ПАСХАЛКИ
  const greetings = ['привет', 'hi', 'hello', 'хай'];
  if (greetings.includes(text.toLowerCase())) {
    return ctx.reply('Привет! 🖖 Я вижу, ты настроен на общение. Чтобы перейти к делу, используй /start');
  }

  const state = userStates[userId];

  if (!state) {
    return ctx.reply('Я пока только учусь! 🤖\n\nИспользуй /start чтобы открыть главное меню.');
  }

  if (state.step === 'WAITING_FOR_STACK') {
    userStates[userId].stack = text;
    userStates[userId].step = 'WAITING_FOR_BUDGET';
    await ctx.reply(TEXTS.order_budget, { parse_mode: 'Markdown' });
  } 
  else if (state.step === 'WAITING_FOR_BUDGET') {
    userStates[userId].budget = text;
    userStates[userId].step = 'WAITING_FOR_DESC';
    await ctx.reply(TEXTS.order_desc, { parse_mode: 'Markdown' });
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
      const logMessage = `📦 *НОВАЯ ЗАЯВКА!*\n${UI.line}\n\n` +
        `👤 *Клиент:* @${finalData.username}\n` +
        `🛠 *Стек:* ${finalData.stack}\n` +
        `💰 *Бюджет:* ${finalData.budget}\n` +
        `📝 *Описание:* ${finalData.description}\n\n` +
        `${UI.line}\n_Заявка сохранена в БД_`;
      
      await ctx.telegram.sendMessage(LOG_CHAT_ID, logMessage, { parse_mode: 'Markdown' });
      await ctx.reply(TEXTS.order_success, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error(e);
      await ctx.reply('Ошибка при сохранении заявки.');
    }
    delete userStates[userId];
  }
});

// --- АДМИНКА ---
bot.command('broadcast', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const message = ctx.message.text.replace('/broadcast ', '');
  if (!message) return ctx.reply('Введите текст рассылки.');
  const users = await Order.distinct('userId'); 
  let count = 0;
  for (const id of users) { try { await bot.telegram.sendMessage(id, message); count++; } catch (e) {} }
  ctx.reply(`✅ Рассылка завершена. Получили ${count} пользователей.`);
});

bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const total = await Order.countDocuments();
  ctx.reply(`📊 Всего заявок в базе: ${total}`);
});

// --- ЗАПУСК ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    bot.launch().then(() => console.log('🚀 Bot Online!'));
  })
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const http = require('http');
const port = process.env.PORT || 8080;
http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});