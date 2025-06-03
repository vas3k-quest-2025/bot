const Team = require('../models/team');
const Task = require('../models/task');
const CodeAttempt = require('../models/codeAttempt');
const QuestState = require('../models/questState');
const QuestSettings = require('../models/questSetting');
const fs = require('fs');
const path = require('path');

// Проверка активности квеста
const isQuestActive = async () => {
  const questState = await QuestState.findOne();
  return questState && questState.isActive;
};

// Проверка корректности кода
const isCodeCorrect = (task, code) => {
  // Если у задания нет правильного кода, считаем что код верный
  if (!task.correctCode) {
    return true;
  }

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
      return bot.sendMessage(chatId, 'Квест не активен', { reply_to_message_id: msg.message_id });
    }

    const [taskNum, ...codeparts] = args.split(' ');
    const code = codeparts.join(" ");
    if (!taskNum || !code) {
      return bot.sendMessage(chatId, 'Неверный формат команды. Используйте: /code <номер> <код>', { reply_to_message_id: msg.message_id });
    }

    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      return bot.sendMessage(chatId, 'Команда не найдена');
    }

    const task = await Task.findOne({where: { order: taskNum } });
    if (!task) {
      return bot.sendMessage(chatId, 'Нет задания с таким номером...', { reply_to_message_id: msg.message_id });
    }

    if (task.taskType === 'photo') {
      return bot.sendMessage(chatId, 'Для фотозаданий нельзя сдавать код. Отправьте фотографию в чат с номером задания в подписи.', { reply_to_message_id: msg.message_id });
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
    await bot.sendMessage(chatId, 'Произошла ошибка при отправке кода', { reply_to_message_id: msg.message_id });
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
      messageText += '⚖️ ' + points(task.cost) + " | ";
      
      // Добавляем тип задания
      const taskTypeEmoji = {
        'regular': '🔑',
        'agent': '🕵️',
        'photo': '📸'
      };
      const taskTypeText = {
        'regular': 'Обычное',
        'agent': 'Агентское',
        'photo': 'Фото'
      };
      messageText += `${taskTypeEmoji[task.taskType]} ${taskTypeText[task.taskType]}\n`;
      
      messageText += `${task.description}\n`;
      
      // Статус задания
      const lastAttempt = task.codeAttempts?.[0];
      if (lastAttempt) {
        if (task.taskType === 'photo') {
          messageText += `📸 Принято фото/видео\n`;
        } else {
          const code = lastAttempt.code.replace(/`/g, '\\`');
          messageText += `✍️ Принят код: \`${code}\`\n`;
        }
      } else {
        messageText += '❌ Ещё не сдано\n';
      }
      messageText += '\n';
    }

    if (footer && footer.value !== null) {
      // Добавляем примечание
      messageText += `${footer.value}`;
    }
    
    await bot.sendMessage(chatId, messageText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting task list:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при получении списка заданий');
  }
};

const points = (cost) => {
  if (cost >= 5 && cost <= 20) {
    return cost + ' баллов';
  }

  const lastCostDigit = cost % 10;
  if (lastCostDigit === 1) {
    return cost + ' балл';
  }

  if (lastCostDigit >= 2 && lastCostDigit <= 4) {
    return cost + ' балла';
  }

  return cost + ' баллов';
}

const handlePhoto = async (bot, msg) => {
  const chatId = msg.chat.id;
  
  try {
    if (!await isQuestActive()) {
      return bot.sendMessage(chatId, 'Квест не активен');
    }

    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      return bot.sendMessage(chatId, 'Команда не найдена');
    }

    if (!msg.caption) {
      return bot.sendMessage(chatId, 'Добавьте номер задания в подпись к фото/видео');
    }

    const taskNum = msg.caption.trim();
    const task = await Task.findOne({ where: { order: taskNum } });
    if (!task) {
      return bot.sendMessage(chatId, 'Нет задания с таким номером...');
    }

    if (task.taskType !== 'photo') {
      return bot.sendMessage(chatId, 'Это задание не является фотозаданием');
    }

    let file;
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      file = await bot.getFile(photo.file_id);
    } else if (msg.video) {
      file = await bot.getFile(msg.video.file_id);
    } else if (
      msg.document && msg.document.mime_type.startsWith('image/')
      || msg.document.mime_type.startsWith('video/')
    ) {
      file = await bot.getFile(msg.document.file_id);
    } else {
      return bot.sendMessage(chatId, 'Отправьте фотографию или видео');
    }

    const teamDir = path.join('/app/user_files', team.id.toString());
    if (!fs.existsSync(teamDir)) {
      fs.mkdirSync(teamDir, { recursive: true });
    }

    const date = new Date(msg.date * 1000);
    const timestamp = date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');
    const messageId = msg.message_id;
    const ext = path.extname(file.file_path) || '.jpg';
    const filename = `${taskNum}-${timestamp}-${messageId}${ext}`;
    const filepath = path.join(teamDir, filename);

    const response = await fetch(`https://api.telegram.org/file/bot${bot.token}/${file.file_path}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);

    // Создаем запись о попытке
    await CodeAttempt.create({
      teamId: team.id,
      taskId: task.id,
      code: messageId.toString(),
      isCorrect: true
    });

    await bot.sendMessage(chatId, 'Фото/видео принято', { reply_to_message_id: msg.message_id });
  } catch (error) {
    console.error('Error handling photo:', error);
    await bot.sendMessage(chatId, 'Произошла ошибка при обработке фото/видео');
  }
};

module.exports = {
  handleCodeSubmission,
  handleTaskList,
  handlePhoto
}; 