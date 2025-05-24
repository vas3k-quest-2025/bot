const { DataTypes, Sequelize } = require('sequelize');
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
    allowNull: true,
    field: 'correct_code'
  },
  cost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  taskType: {
    type: DataTypes.ENUM('regular', 'agent', 'photo'),
    allowNull: false,
    defaultValue: 'regular',
    field: 'task_type'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'created_at',
    defaultValue: Sequelize.literal('NOW()'),
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'updated_at',
    defaultValue: Sequelize.literal('NOW()'),
  }
}, {
  tableName: 'task',
  timestamps: false,
  underscored: true
});

module.exports = task; 