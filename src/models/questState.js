const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const questState = sequelize.define('questState', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_active'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ended_at'
  }
}, {
  tableName: 'quest_state',
  timestamps: true,
  underscored: true
});

module.exports = questState; 