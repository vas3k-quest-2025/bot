const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const team = sequelize.define('team', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chatId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'chat_id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_active'
  }
}, {
  tableName: 'team',
  timestamps: true,
  underscored: true
});

module.exports = team; 