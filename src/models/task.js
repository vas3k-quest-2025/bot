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
    allowNull: false,
    field: 'correct_code'
  },
  cost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
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