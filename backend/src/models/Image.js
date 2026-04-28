const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mimetype: {
    type: DataTypes.STRING,
  },
  size: {
    type: DataTypes.INTEGER,
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
});

module.exports = Image;
