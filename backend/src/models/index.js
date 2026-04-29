const User = require('./User');
const Category = require('./Category');
const Problem = require('./Problem');
const Image = require('./Image');
const Vote = require('./Vote');

// Associações
User.hasMany(Problem, {
  foreignKey: 'userId',
  as: 'problems',
  onDelete: 'CASCADE',
});

Problem.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author',
});

Category.hasMany(Problem, {
  foreignKey: 'categoryId',
  as: 'problems',
});

Problem.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

Problem.hasMany(Image, {
  foreignKey: 'problemId',
  as: 'images',
  onDelete: 'CASCADE',
});

Image.belongsTo(Problem, {
  foreignKey: 'problemId',
});

User.hasMany(Vote, {
  foreignKey: 'userId',
  as: 'votes',
  onDelete: 'CASCADE',
});

Vote.belongsTo(User, {
  foreignKey: 'userId',
});

Problem.hasMany(Vote, {
  foreignKey: 'problemId',
  as: 'voteRecords',
  onDelete: 'CASCADE',
});

Vote.belongsTo(Problem, {
  foreignKey: 'problemId',
});

module.exports = {
  User,
  Category,
  Problem,
  Image,
  Vote,
};
