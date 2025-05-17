const Team = require('../models/team');
const TeamMember = require('../models/teamMember');
const QuestState = require('../models/questState');
const fetch = require('node-fetch');

// Обработка новых участников
const handleNewChatMember = async (bot, msg) => {
  const chatId = msg.chat.id;
  console.log(msg);
  
  try {
    // Игнорируем добавление участников в админский чат
    if (msg.chat.id.toString() === process.env.ADMIN_CHAT_ID) {
      return;
    }

    // Получаем ID бота из токена (формат токена: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz")
    const botId = parseInt(bot.token.split(':')[0]);
    
    
    //Сначала проверяем, есть ли в пачке юзеров наш бот
    for (const newMember of msg.new_chat_members) {
      if (newMember.id === botId) {
        // Бот добавлен в чат - находим/создаем команду
        let team = await Team.findOne({ where: { chatId: chatId.toString() } });
        if (team) {
          const oldTitle = team.name;
          await team.update({name: msg.chat.title});

          // Отправляем уведомление в админский чат
          const adminMessage = `✍🏼 Команда "${oldTitle}" переименовалась в ${msg.chat.title}`;
          await bot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage);

          continue;
        }

        team = await Team.create({
          chatId: chatId.toString(),
          name: msg.chat.title,
          isActive: false
        });

        // Получаем список администраторов чата
        // Telegram Bot API не позволяет получить полный список участников группы,
        // поэтому мы добавляем администраторов как изначальных участников
        const admins = await bot.getChatAdministrators(chatId);
        
        // Добавляем всех администраторов как изначальных членов команды
        for (const admin of admins) {
          if (admin.user.is_bot) continue;

          const initialMember = await TeamMember.findOne({
            where: {
              teamId: team.id,
              userId: newMember.id.toString()
            }
          });

          if (initialMember) {
            continue;
          }
          
          await TeamMember.create({
            teamId: team.id,
            userId: admin.user.id.toString(),
            username: admin.user.username,
            firstName: admin.user.first_name,
            lastName: admin.user.last_name,
            isInitialMember: true
          });
        }

        await bot.sendMessage(chatId, 'Привет! Я бот для проведения квеста. Используйте /help для просмотра доступных команд.');
        return;
      }
    }

    // И затем обрабатываем всех юзеров в пачке
    for (const newMember of msg.new_chat_members) {
      // Пропускаем всех ботов
      if (newMember.is_bot) continue;

      // Добавляем нового участника используя общую функцию
      await addTeamMember(bot, chatId, newMember);
    }
  } catch (error) {
    console.error('Error handling new chat member:', error);
  }
};

// Обработка переименования чата
const handleChatTitleUpdate = async (bot, msg) => {
  const chatId = msg.chat.id;
  const newTitle = msg.new_chat_title;

  try {
    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      console.error(`Chat ${chatId} has no team associated, but renamed to ${newTitle}.`);
    }

    const oldTitle = team.name;
    await team.update({ name: newTitle });
    console.log(`Team name updated for chat ${chatId}: ${newTitle}`);
    
    // Отправляем уведомление в админский чат
    const adminMessage = `✍🏼 Команда «${oldTitle}» переименовалась в «${newTitle}»`;
    await bot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage);
  } catch (error) {
    console.error('Error updating team name:', error);
  }
};

const addTeamMember = async (bot, chatId, user) => {
  try {
    // Находим команду по id чата
    const team = await Team.findOne({ where: { chatId: chatId.toString() } });
    if (!team) {
      console.error(`Chat ${chatId} has no team associated`);
      return;
    }

    // Проверяем, есть ли в команде такой пользователь
    const existingMember = await TeamMember.findOne({
      where: {
        teamId: team.id,
        userId: user.id.toString()
      }
    });

    // Если пользователь уже есть, выходим
    if (existingMember) {
      return;
    }

    // Проверяем, активен ли квест
    const questState = await QuestState.findOne();
    const isQuestActive = questState && questState.isActive;
    const { clubName, clubSlug } = await fetchClubUserData(user.id);

    // Добавляем нового участника
    await TeamMember.create({
      teamId: team.id,
      userId: user.id.toString(),
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      isInitialMember: !isQuestActive,
      clubName: clubName,
      clubSlug: clubSlug
    });

    const isClubMember = clubSlug !== null;
    const clubPresence = isClubMember ? `[${clubName}](https://vas3k.club/user/${clubSlug})` : '🚨 Не из клуба!';

    // Если квест активен, отправляем уведомления
    if (isQuestActive) {
      // Отправляем уведомление в чат команды
      const memberName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name}`;
      await bot.sendMessage(chatId, `⚠️ Внимание! ${memberName} (${clubPresence}) не был в команде на момент начала квеста.`, { parse_mode: 'Markdown' });

      // Отправляем уведомление в админский чат
      const adminMessage = `⚠️ В команду «${team.name}» вступил новый участник [${memberName}](tg://user?id=${user.id}) ${clubPresence}`;
      await bot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, { parse_mode: 'Markdown' });
    }

    return;
  } catch (error) {
    console.error('Error adding team member:', error);
  }

  if (!isClubMember) {
    const memberName = user.username ? `@${user.username}` : `${user.first_name} ${user.last_name}`;
    await bot.sendMessage(chatId, `⚠️ Внимание! ${memberName} (${clubPresence}) не состоит в клубе!`);

    const adminMessage = `⚠️ В команде «${team.name}» новый участник [${memberName}](tg://user?id=${user.id}), не состоящий в клубе!`;
    await bot.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage, { parse_mode: 'Markdown' });
  }
};

const handleMessage = async (bot, msg) => {
  const chatId = msg.chat.id;
  
  // Игнорируем сообщения из админского чата
  if (chatId.toString() === process.env.ADMIN_CHAT_ID) {
    return;
  }

  // Игнорируем сообщения без отправителя (например, системные сообщения)
  if (!msg.from) {
    return;
  }

  // Игнорируем сообщения от ботов
  if (msg.from.is_bot) {
    return;
  }

  try {
    await addTeamMember(bot, chatId, msg.from);
  } catch (error) {
    console.error('Error handling message:', error);
  }
};

const fetchClubUserData = async (telegramId) => {
  let clubName = null;
  let clubSlug = null;

  try {
    const response = await fetch(`https://vas3k.club/user/by_telegram_id/${telegramId}.json`, {
      headers: {
        'X-Service-Token': process.env.VAS3K_TOKEN
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log(userData);
      clubName = userData.user.full_name || null;
      clubSlug = userData.user.slug || null;
    } else if (response.status !== 404) {
      console.error(`Error fetching user data from Club API: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling Club API:', error);
  }

  return { clubName, clubSlug };
};

module.exports = {
  handleNewChatMember,
  handleChatTitleUpdate,
  handleMessage
}; 