const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Problem = sequelize.define('Problem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'open',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  votes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verifiedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id',
    },
    allowNull: true,
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
  categoryId: {
    type: DataTypes.UUID,
    references: {
      model: 'Categories',
      key: 'id',
    },
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['latitude', 'longitude'] },
    { fields: ['status'] },
    { fields: ['userId'] },
    { fields: ['categoryId'] },
  ],
});

module.exports = Problem;
