const Team = require('../models/team');
const TeamMember = require('../models/teamMember');
const Task = require('../models/task');
const CodeAttempt = require('../models/codeAttempt');
const QuestState = require('../models/questState');
const { Op } = require('sequelize');

// Проверка на админа
const isAdmin = (chatId) => chatId.toString() === process.env.ADMIN_CHAT_ID;

// Начало квеста
const handleStartQuest = async (bot, msg, args) => {
  if (!isAdmin(msg.chat.id)) return;

  console.log(args);

  try {
    // Если нет аргумента yes, запрашиваем подтверждение
    if (!args || args.toLowerCase() !== ' yes') {
      return bot.sendMessage(msg.chat.id, 'Подтвердите запуск квеста, введите /start_quest yes');
    }

    // Проверяем, не запущен ли уже квест
    const currentState = await QuestState.findOne();
    if (currentState && currentState.isActive) {
      return bot.sendMessage(msg.chat.id, 'Квест уже запущен!');
    }

    // Создаем или обновляем состояние квеста
    const [questState] = await QuestState.findOrCreate({
      where: {},
      defaults: {
        isActive: true,
        startedAt: new Date(),
        endedAt: null
      }
    });

    if (!questState.isActive) {
      await questState.update({
        isActive: true,
        startedAt: new Date(),
        endedAt: null
      });
    }

    // Сохраняем текущий состав всех команд
    const teams = await Team.findAll();
    
    for (const team of teams) {
      const chatMembers = await bot.getChatAdministrators(team.chatId);
      const members = chatMembers.map(member => ({
        teamId: team.id,
        userId: member.user.id.toString(),
        username: member.user.username,
        firstName: member.user.first_name,
        lastName: member.user.last_name,
        isInitialMember: true
      }));
      
      await TeamMember.bulkCreate(members);
    }

    await bot.sendMessage(msg.chat.id, 'Квест успешно начат!');
  } catch (error) {
    console.error('Error starting quest:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при запуске квеста');
  }
};

// Остановка квеста
const handleStopQuest = async (bot, msg, args) => {
  if (!isAdmin(msg.chat.id)) return;

  try {
    // Если нет аргумента yes, запрашиваем подтверждение
    if (!args || args.toLowerCase() !== ' yes') {
      return bot.sendMessage(msg.chat.id, 'Подтвердите остановку квеста, введите /stop_quest yes');
    }

    const questState = await QuestState.findOne();
    if (!questState || !questState.isActive) {
      return bot.sendMessage(msg.chat.id, 'Квест не был запущен!');
    }

    await questState.update({
      isActive: false,
      endedAt: new Date()
    });

    await bot.sendMessage(msg.chat.id, 'Квест остановлен');
  } catch (error) {
    console.error('Error stopping quest:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при остановке квеста');
  }
};

// Список команд
const handleListTeams = async (bot, msg) => {
  if (!isAdmin(msg.chat.id)) return;

  try {
    const teams = await Team.findAll({
      include: [{
        model: TeamMember,
        attributes: ['id']
      }]
    });
    
    const teamList = teams.map(team => {
      const memberCount = team.teamMembers.length;
      return `${team.id}. ${team.name} (${memberCount} игроков)`;
    }).join('\n');
    
    await bot.sendMessage(msg.chat.id, `Список команд:\n${teamList}`);
  } catch (error) {
    console.error('Error listing teams:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении списка команд');
  }
};

// Детали команды
const handleTeamDetails = async (bot, msg, teamId) => {
  if (!isAdmin(msg.chat.id)) return;

  try {
    const team = await Team.findByPk(teamId);
    if (!team) {
      return bot.sendMessage(msg.chat.id, 'Команда не найдена');
    }

    const members = await TeamMember.findAll({ where: { teamId } });
    const memberList = members.map(member => {
      const clubPresence = member.clubSlug !== null ? `[${member.clubName}](https://vas3k.club/user/${member.clubSlug})` : '🚨 не в клубе!'
      const name = `[${member.firstName} ${member.lastName}](tg://user?id=${member.userId})`;
      return `${name} (${clubPresence})${member.isInitialMember ? '✅' : '⚠️'}`;
    }).join('\n');

    await bot.sendMessage(msg.chat.id, `Команда: ${team.name}\n\nУчастники:\n${memberList}`, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error getting team details:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении информации о команде');
  }
};

// Широковещательное сообщение
const handleBroadcast = async (bot, msg, message) => {
  if (!isAdmin(msg.chat.id)) return;

  try {
    const teams = await Team.findAll();
    for (const team of teams) {
      await bot.sendMessage(team.chatId, message);
    }
    await bot.sendMessage(msg.chat.id, 'Сообщение отправлено всем командам');
  } catch (error) {
    console.error('Error broadcasting message:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при отправке сообщения');
  }
};

// Задания команды
const handleTeamTasks = async (bot, msg, teamId) => {
  if (!isAdmin(msg.chat.id)) return;

  try {
    const team = await Team.findByPk(teamId);
    if (!team) {
      return bot.sendMessage(msg.chat.id, 'Команда не найдена');
    }

    const tasks = await Task.findAll({ 
      order: [['order', 'ASC']],
      include: [{
        model: CodeAttempt,
        where: { teamId },
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1
      }]
    });

    let correctPoints = 0;
    let correctCount = 0;
    let lastCodeTime = null;

    const taskList = tasks.map(task => {
      const lastAttempt = task.codeAttempts?.[0];
      let line = `${task.order}. ${task.title}\nБаллы: ${task.cost}\n`;
      
      if (lastAttempt) {
        if (task.taskType === 'photo') {
          line += `📸 Принято фото/видео\n`;
        } else {
          const status = lastAttempt.isCorrect ? '✅' : '❌';
          const code = lastAttempt.code.replace(/`/g, '\\`');
          const correctCode = task.correctCode.replace(/`/g, '\\`');
          line += `${status} \`${code}\` / \`${correctCode}\``;
        
          if (lastAttempt.isCorrect) {
            correctCount++;
            correctPoints += task.cost;
          }
        }

        if (lastAttempt.createdAt > lastCodeTime) {
          lastCodeTime = lastAttempt.createdAt;
        }
      } else {
        const correctCode = task.correctCode?.replace(/`/g, '\\`');
        line += `🚫 не сдавали / \`${correctCode}\``;
      }
      
      return line;
    }).join('\n\n');


    const photosUrl = `https://${process.env.PHOTOS_DOMAIN}/${process.env.PHOTOS_SECRET_PATH}/${teamId}/`;
    const photosMessage = `\n📸 [Фотографии команды](${photosUrl})`;

    await bot.sendMessage(
      msg.chat.id,
      `*Задания команды «${team.name}»*\n\n${taskList}\n\n*Правильно выполнено:* ${correctCount}\n*Суммарный балл:* ${correctPoints}\nПоследняя сдача: ${lastCodeTime}\n${photosMessage}`,
      { parse_mode: 'Markdown' },
    );
  } catch (error) {
    console.error('Error getting team tasks:', error);
    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при получении информации о заданиях');
  }
};

module.exports = {
  handleStartQuest,
  handleStopQuest,
  handleListTeams,
  handleTeamDetails,
  handleBroadcast,
  handleTeamTasks
}; 