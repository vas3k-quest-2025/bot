const sequelize = require('./database');
const team = require('../models/team');
const teamMember = require('../models/teamMember');
const task = require('../models/task');
const codeAttempt = require('../models/codeAttempt');
const questState = require('../models/questState');
const questSettings = require('../models/questSetting');

// Определение связей между моделями
const defineRelations = () => {
  // Связи для Team
  team.hasMany(teamMember, { foreignKey: 'teamId' });
  teamMember.belongsTo(team, { foreignKey: 'teamId' });

  // Связи для Task
  task.hasMany(codeAttempt, { foreignKey: 'taskId' });
  codeAttempt.belongsTo(task, { foreignKey: 'taskId' });

  // Связи для Team
  team.hasMany(codeAttempt, { foreignKey: 'teamId' });
  codeAttempt.belongsTo(team, { foreignKey: 'teamId' });
};

// Инициализация базы данных
const initDatabase = async () => {
  try {
    // Определяем связи между моделями
    defineRelations();

    // Синхронизируем модели с базой данных
    await team.sync();
    await task.sync();
    await teamMember.sync();
    await codeAttempt.sync();
    await questState.sync();
    await questSettings.sync();

    // Создаем начальное состояние квеста, если его нет
    const initQuestState = await questState.findOne();
    if (!initQuestState) {
      await questState.create({
        isActive: false,
        startedAt: null,
        endedAt: null
      });
    }

    // Создаем дефолтные хедер и футер для квеста, если их нет
    const headerSetting = await questSettings.findOne({ where: { key: 'header' } });
    if (!headerSetting) {
      await questSettings.create({
        key: 'header',
        value: `🎮 *Квест*\n\nДобро пожаловать в квест! Здесь вы найдете список всех заданий.`,        
      });
    }

    const footerSetting = await questSettings.findOne({ where: { key: 'footer' } });
    if (!footerSetting) {
      await questSettings.create({
        key: 'footer',
        value: `_Галочка в задании означает, что код принят, даже если он неверный. Правильные ответы будут опубликованы после конца квеста и всех уточнений._`,
      });
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = initDatabase; 