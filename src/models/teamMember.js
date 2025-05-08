const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const teamMember = sequelize.define('teamMember', {
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
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_id'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_name'
  },
  isInitialMember: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_initial_member'
  }
}, {
  tableName: 'team_member',
  timestamps: true,
  underscored: true
});

module.exports = teamMember; 