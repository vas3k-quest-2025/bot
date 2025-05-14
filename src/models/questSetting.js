const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const questSetting = sequelize.define('questSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'value'
  }
}, {
  tableName: 'quest_setting',
  timestamps: true,
  underscored: true
});

module.exports = questSetting; 