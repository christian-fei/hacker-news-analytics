const db = require('./db')

module.exports = () => db.get('items').createIndex({
  id: 1,
  title: 1,
  page: 1,
  rank: 1,
  link: 1,
  score: 1,
  age: 1,
  commentCount: 1
}, { unique: true })
