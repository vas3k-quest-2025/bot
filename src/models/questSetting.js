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
  introText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'intro_text'
  },
  footerText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'footer_text'
  }
}, {
  tableName: 'quest_setting',
  timestamps: true,
  underscored: true
});

module.exports = questSetting; 