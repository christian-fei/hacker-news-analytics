const db = require('./db')
const nlp = require('compromise')
nlp.extend(require('compromise-numbers'))

module.exports = async function () {
  const titles = await db.get('items').distinct('title', {}, { limit: 10000 })
  const titlesRank1 = await db.get('items').distinct('title', { rank: 1 }, { limit: 10000 })

  const nouns = titles.map(title => nlp(title).nouns().json().map(d => d.normal))
  const numbers = titles.map(title => nlp(title).numbers().json().map(d => d.number || d.normal))
  const numbersOccurency = numbers.reduce((acc, curr) => {
    return acc[curr] ? Object.assign(acc, { [curr]: acc[curr] + 1 }) : Object.assign(acc, { [curr]: 1 })
  }, {})

  return {
    titles,
    titlesRank1,
    nouns,
    numbers,
    numbersOccurency
  }
}
