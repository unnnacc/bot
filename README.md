# [Crypto Card](https://github.com/unnnacc/my-crypto-app) & Lead Gen Bot 🚀

Собрал полноценный хаб для репрезентации и сбора лидов - Связка из живого фронта на React и бэкенда на Node.js, которая сама складывает заказы в базу и пушит уведомления в админ-чат.

## 🛠 Стек
- **Frontend:** React + Vite + Tailwind CSS v4. Задизайнил в стиле «стекло» с кастомными анимациями, чтобы выглядело дорого.
- **Backend:** Node.js + Telegraf.
- **DB:** MongoDB Atlas (Mongoose). Храню тут всех лидов и стейты пользователей.
- **Infrastructure:** Vercel (для фронта) + Render (для бота).
*Все за бесплатно))*

## 🏗 Что внутри (Технический разбор)
Пара моментов по архитектуре, чтобы не было вопросов:

- **State Machine вместо Сцен:** Забил на стандартные `Scenes` в Telegraf, так как они иногда ведут себя непредсказуемо. Реализовал свой механизм стейтов через объект, чтобы опрос по заявкам не падал и работал как часы.
- **Lead-пайплайн:** Сделал полноценный флоу: `Юзер` $\rightarrow$ `Валидация` $\rightarrow$ `Монга` $\rightarrow$ `Лог-канал`. Теперь все заявки падают в один чат, не теряются в личке.
- **API интеграция:** Прикрутил CoinGecko для лайв-курсов валют. Сделал так, чтобы тикер обновлялся в реальном времени без лишних ререндеров.
- **UX/UI:** Подцепил Telegram WebApp SDK, добавил хаптик-отклик (вибрацию), чтобы приложение ощущалось нативным.

## 🚀 Фичи
- **Интерактивная визитка:** Все контакты, соцсети и актуальные адреса кошельков в одном месте.
- **Сбор заказов:** Пошаговый квиз (Стек $\rightarrow$ Бюджет $\rightarrow$ ТЗ).
- **Админский функционал:** Есть команды для рассылки по базе `/broadcast` и чека общей статы `/stats`.
- **Live Ticker:** Бегущая строка с курсами крипты прямо в приложении.

## ⚙️ Как завести
1. Клонируем репо.
2. Настраиваем `.env` (токен бота, админ-айди, ссылка на Монгу и URL визитки).
3. `npm install` $\rightarrow$ `npm start`.

_Профит! Всё работает, деплой настроен._


# Crypto Card & Lead Gen Bot 🚀

Built a professional hub for personal branding and lead gen - full-stack combo: a slick React frontend (Mini App) and a Node.js backend that handles lead collection and pushes alerts to an admin chat.

## 🛠 Tech Stack
- **Frontend:** React + Vite + Tailwind CSS v4. Glassmorphism UI with custom animations for that premium feel.
- **Backend:** Node.js + Telegraf.
- **DB:** MongoDB Atlas (Mongoose). Storing all leads and user states here.
- **Infrastructure:** Vercel (Frontend) & Render (Backend).
  *for free))*

## 🏗 Tech Specs & Decisions
A few notes on why I did it this way:

- **Custom State Machine:** Skipped Telegraf's built-in `Scenes` because they can be flaky. Implemented a manual state-tracking system to keep the multi-step lead form rock-solid.
- **Lead Pipeline:** Built a clean flow: `User` $\rightarrow$ `Validation` $\rightarrow$ `Mongo` $\rightarrow$ `Log Channel`. No more digging through DMs to find a client.
- **API Integration:** Integrated CoinGecko API for real-time crypto rates. Optimized the ticker to avoid unnecessary re-renders.
- **UX/UI:** Leveraged Telegram WebApp SDK and added haptic feedback for a native app experience.

## 🚀 Features
- **Interactive Card:** All socials, contacts, and active crypto wallets in one place.
- **Lead Gen Wizard:** Step-by-step flow (Tech Stack $\rightarrow$ Budget $\rightarrow$ Scope).
- **Admin Suite:** Built-in commands for DB broadcasting (`/broadcast`) and quick analytics (`/stats`).
- **Live Ticker:** Real-time currency rates integrated into the frontend.

## ⚙️ Quick Start
1. Clone the repo.
2. Fill in your `.env` (BOT_TOKEN, ADMIN_ID, LOG_CHAT_ID, MONGO_URI, WEBAPP_URL).
3. `npm install` $\rightarrow$ `npm start`.

_Done. Deployed and ready to go._
