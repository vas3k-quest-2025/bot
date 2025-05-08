const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const codeAttempt = sequelize.define('codeAttempt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'team_id'
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'task_id'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'is_correct'
  }
}, {
  tableName: 'code_attempt',
  timestamps: true,
  underscored: true
});

module.exports = codeAttempt; 