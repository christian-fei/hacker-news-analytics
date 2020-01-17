const db = require('./db')

module.exports = async function () {
  const titles = await db.get('items').distinct('title', {}, { limit: 10000 })
  const titlesRank1 = await db.get('items').distinct('title', { rank: 1 }, { limit: 10000 })
  return {
    titles,
    titlesRank1
  }
}
