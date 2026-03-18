import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';

// --- Конфигурация (ЗАМЕНИ НА СВОИ ДАННЫЕ) ---
const BOT_TOKEN = '7685117804:AAH7TwiEjqpbHprCDpO-0-DI8yL52fDFndk'; // Вставь свой токен
// !!! ВАЖНО: После деплоя фронтенда вставь сюда ссылку на GitHub Pages !!!
const WEB_APP_URL = 'https://mishaelboss.github.io/Cliker-pzkCoin-site-and-bot/'; 
// Например: 'https://ivan-ivanov.github.io/pzk-clicker-tma'

// --- Инициализация бота ---
const bot = new Telegraf(BOT_TOKEN);

// --- Обработка команды /start ---
bot.command('start', (ctx) => {
  ctx.reply(
    '👋 Добро пожаловать в PzkClicker! Нажимай на монетку, зарабатывай PzkCoins и покупай бусты.',
    Markup.inlineKeyboard([
      // Кнопка для открытия мини-приложения
      Markup.button.webApp('🚀 Открыть игру', WEB_APP_URL)
    ])
  );
});

// --- Обработка данных из WebApp (необязательно, но добавим для обратной связи) ---
bot.on(message('web_app_data'), async (ctx) => {
  const data = ctx.webAppData.data;
  console.log('Получены данные из WebApp:', data);
  // Здесь можно обработать данные, например, сохранить рекорд в БД
  await ctx.reply('✅ Данные получены! Спасибо за игру.');
});

// --- Запуск бота ---
bot.launch().then(() => {
  console.log('Бот PzkClicker запущен!');
});

// --- Graceful stop ---
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));