const Team = require('../models/team');
const Task = require('../models/task');
const CodeAttempt = require('../models/codeAttempt');
const QuestState = require('../models/questState');
const QuestSettings = require('../models/questSetting');

// Проверка активности квеста
const isQuestActive = async () => {
  const questState = await QuestState.findOne();
  return questState && questState.isActive;
};

// Проверка корректности кода
const isCodeCorrect = (task, code) => {
  const normalizedCode = code.toLowerCase();
  const normalizedCorrectCode = task.correctCode.toLowerCase();

  if (normalizedCorrectCode === normalizedCode) {
    return true;
  }

  // Если код задан как регулярное выражение (в формате /pattern/)
  if (task.correctCode.startsWith('/') && task.correctCode.endsWith('/')) {
    const pattern = task.correctCode.slice(1, -1);
    return new RegExp(pattern, 'i').test(normalizedCode);
  }

  // Если код задан как множество через |, но не регуляркой
  if (normalizedCorrectCode.includes('|')) {
    const validCodes = normalizedCorrectCode.split('|').map(c => c.trim());
    return validCodes.includes(normalizedCode);
  }

  return false;
};

// Отправка кода
const handleCodeSubmission = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  
  try {
    if (!await isQuestActive()) {
      return bot.sendMessage(chatId, 'Квест не активен');
    }

    const [taskNum, code] = args.split(' ', 2);
    if (!taskNum || !code) {
      return bot.sendMessage(chatId, 'Неверный формат команды. Используйте: /code <номер> <код>');
    }

    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      return bot.sendMessage(chatId, 'Команда не найдена');
    }

    const task = await Task.findOne({where: { order: taskNum } });
    if (!task) {
      return bot.sendMessage(chatId, 'Нет задания с таким номером...');
    }

    const isCorrect = isCodeCorrect(task, code);
    await CodeAttempt.create({
      teamId: team.id,
      taskId: task.id,
      code,
      isCorrect
    });

    await bot.sendMessage(chatId, 'Код принят', { reply_to_message_id: msg.message_id });
  } catch (error) {
    console.error('Error submitting code:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при отправке кода');
  }
};

// Список заданий
const handleTaskList = async (bot, msg) => {
  const chatId = msg.chat.id;
  
  try {
    if (!await isQuestActive()) {
      return bot.sendMessage(chatId, 'Квест не активен');
    }

    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      return bot.sendMessage(chatId, 'Команда не найдена');
    }

    // Получаем настройки квеста
    const header = await QuestSettings.findOne({ where: { key: 'header' } });
    const footer = await QuestSettings.findOne({ where: { key: 'footer' } });

    // Получаем все задания
    const tasks = await Task.findAll({ 
      order: [['order', 'ASC']],
      include: [{
        model: CodeAttempt,
        where: { teamId: team.id },
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1
      }]
    });

    // Формируем текст сообщения
    let messageText = header && header.value === null ? '' : `${header.value}\n\n`;

    // Добавляем каждое задание
    for (const task of tasks) {
      messageText += `*${task.order}. ${task.title}*\n`;
      messageText += `${task.description}\n`;
      
      // Статус задания
      const lastAttempt = task.CodeAttempts?.[0];
      if (lastAttempt) {
        const code = lastAttempt.code.replace(/`/g, '\\`');
        messageText += `✍️ Принят код: \`${code}\`\n`;
      } else {
        messageText += '❌ Ещё не сдано\n';
      }
      messageText += '\n';
    }

    if (footer && footer.value !== null) {
      // Добавляем примечание
      messageText += `\n${footer.value}`;
    }
    
    await bot.sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting task list:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при получении списка заданий');
  }
};

module.exports = {
  handleCodeSubmission,
  handleTaskList
}; 