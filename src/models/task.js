const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const task = sequelize.define('task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  correctCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'correct_code'
  }
}, {
  tableName: 'task',
  timestamps: true,
  underscored: true
});

module.exports = task; 