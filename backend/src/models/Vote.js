const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vote = sequelize.define('Vote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('up', 'down'),
    defaultValue: 'up',
  },
  userId: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
    allowNull: false,
    onDelete: 'CASCADE',
  },
  problemId: {
    type: DataTypes.UUID,
    references: {
      model: 'Problems',
      key: 'id',
    },
    allowNull: false,
    onDelete: 'CASCADE',
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'problemId'] },
  ],
});

module.exports = Vote;
