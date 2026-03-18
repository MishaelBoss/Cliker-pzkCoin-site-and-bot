import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Настройка путей для ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_FILE = path.join(__dirname, '../stats.json');

// 2. Конфигурация
const BOT_TOKEN = '7685117804:AAH7TwiEjqpbHprCDpO-0-DI8yL52fDFndk';
const WEB_APP_URL = 'https://mishaelboss.github.io/test_bot/'; 

// 3. Инициализация Express (API для Django)
const app = express();
app.use(express.json());

// 4. Инициализация Telegram-бота
const bot = new Telegraf(BOT_TOKEN);

// --- Логика Бота ---

bot.command('start', (ctx) => {
  ctx.reply(
    '👋 Добро пожаловать в PzkClicker! Нажимай на монетку, зарабатывай PzkCoins и покупай бусты.',
    Markup.inlineKeyboard([
      Markup.button.webApp('🚀 Открыть игру', WEB_APP_URL)
    ])
  );
});

bot.on(message('web_app_data'), async (ctx) => {
  const data = ctx.webAppData.data;
  console.log('Получены данные из WebApp:', data);
  await ctx.reply('✅ Данные получены! Спасибо за игру.');
});

// --- API Эндпоинт для Django ---

app.post('/api/deduct-coins', (req, res) => {
    const { telegram_id, amount, secret_key } = req.body;
    const userId = String(telegram_id);

    if (secret_key !== BOT_TOKEN) return res.status(403).json({ error: 'Forbidden' });

    try {
        let stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
        let userEntry = null;

        // ПРОВЕРКА ФОРМАТА:
        if (Array.isArray(stats)) {
            // Если stats.json — это массив [ {id: 123, coins: 10}, ... ]
            userEntry = stats.find(u => String(u.id) === userId || String(u.telegram_id) === userId);
        } else {
            // Если stats.json — это объект { "123": {coins: 10}, ... }
            userEntry = stats[userId];
        }

        if (userEntry) {
            const oldBalance = userEntry.coins || 0;
            userEntry.coins = oldBalance - amount;

            // Сохраняем изменения обратно в файл
            fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

            console.log(`✅ [Shop] Списано ${amount} у ${userId}. Было: ${oldBalance}, Стало: ${userEntry.coins}`);
            
            // Уведомление в ТГ
            bot.telegram.sendMessage(userId, `💳 С вашего баланса списано ${amount} PZK за покупку на сайте!`).catch(() => {});

            return res.json({ success: true, new_balance: userEntry.coins });
        } else {
            // Если не нашли — выведем в консоль, что вообще есть в файле, чтобы понять ошибку
            console.log(`❌ Юзер ${userId} не найден. Доступные ключи/ID в файле:`, 
                Array.isArray(stats) ? stats.map(u => u.id || u.telegram_id) : Object.keys(stats)
            );
            return res.status(404).json({ error: "User not found in stats.json" });
        }
    } catch (err) {
        console.error("Ошибка обработки stats.json:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// --- Запуск ---

// Запускаем бота
bot.launch().then(() => {
  console.log('🚀 Бот PzkClicker запущен!');
});

// Запускаем API сервер на порту 3001
app.listen(3001, '0.0.0.0', () => {
    console.log('🔗 API для Django работает на http://localhost:3001');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));