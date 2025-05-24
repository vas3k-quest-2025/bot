const Tgfancy = require("tgfancy");
const sequelize = require('./config/database');
const initDatabase = require('./config/initDb');
const { handleStartQuest, handleStopQuest, handleListTeams, handleTeamDetails, handleBroadcast, handleTeamTasks } = require('./handlers/adminHandlers');
const { handleCodeSubmission, handleTaskList, handlePhoto } = require('./handlers/teamHandlers');
const { handleNewChatMember, handleChatTitleUpdate, handleMessage } = require('./handlers/chatHandlers');
const { isGroupChat } = require('./utils/chatUtils');

// Инициализация бота
const bot = new Tgfancy(
  process.env.BOT_TOKEN,
  {
    polling: true,
    tgfancy: {
      textPaging: true,
      ratelimiting: {
        maxRetries: 10,
        timeout: 1000 * 60,
      },
      emojification: false,
      orderedSending: false,
    }
  }
);

// Подключение к базе данных и инициализация таблиц
const startBot = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    await initDatabase();
    console.log('Database tables synchronized successfully.');
    
    console.log('Bot started...');
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

// Обработка команд админа
bot.onText(/\/start_quest(.*)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleStartQuest(bot, msg, match[1]);
});

bot.onText(/\/stop_quest(.*)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleStopQuest(bot, msg, match[1]);
});

bot.onText(/\/list_teams/, (msg) => {
  if (!isGroupChat(msg.chat)) return;
  handleListTeams(bot, msg);
});

bot.onText(/\/team (.+)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleTeamDetails(bot, msg, match[1]);
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleBroadcast(bot, msg, match[1]);
});

bot.onText(/\/team_tasks (.+)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleTeamTasks(bot, msg, match[1]);
});

// Обработка команд команд
bot.onText(/\/code (.+)/, (msg, match) => {
  if (!isGroupChat(msg.chat)) return;
  handleCodeSubmission(bot, msg, match[1]);
});

bot.onText(/\/tasks/, (msg) => {
  if (!isGroupChat(msg.chat)) return;
  handleTaskList(bot, msg);
});

// Обработка новых участников
bot.on('new_chat_members', (msg) => {
  if (!isGroupChat(msg.chat)) return;
  
  handleNewChatMember(bot, msg);
});

// Обработка переименования чата
bot.on('new_chat_title', (msg) => {
  if (!isGroupChat(msg.chat)) return;
  handleChatTitleUpdate(bot, msg);
});

// Обработка всех сообщений
bot.on('message', (msg) => {
  if (!isGroupChat(msg.chat)) return;
  handleMessage(bot, msg);
});

// Обработка фотографий
bot.on('photo', (msg) => {
  if (!isGroupChat(msg.chat)) return;
  handlePhoto(bot, msg);
});

// Обработка документов (для изображений)
bot.on('document', (msg) => {
  if (!isGroupChat(msg.chat)) return;
  if (msg.document.mime_type.startsWith('image/')) {
    handlePhoto(bot, msg);
  }
});

// Обработка команды help
bot.onText(/\/help/, (msg) => {
  if (!isGroupChat(msg.chat)) {
    return bot.sendMessage(msg.chat.id, 'Я работаю только в групповых чатах. Добавьте меня в группу для участия в квесте.');
  }

  const chatId = msg.chat.id;
  const isAdminChat = chatId.toString() === process.env.ADMIN_CHAT_ID;
  
  let helpText = 'Доступные команды:\n\n';
  
  if (isAdminChat) {
    helpText += '/start\\_quest - Начать квест\n' +
                '/stop\\_quest - Остановить квест\n' +
                '/list\\_teams - Показать список команд\n' +
                '`/team` <id> - Показать состав команды\n' +
                '`/team_tasks` <id> - Показать задания команды\n' +
                '`/broadcast` <сообщение> - Отправить сообщение всем командам\n';
  } else {
    helpText += '`/code` <номер задания> <код> - Отправить код (например `/code 1 секретныйкод`)\n' +
                '/tasks - Посмотреть список заданий\n';
  }
  
  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Запуск бота
startBot(); 