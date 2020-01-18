const db = require('./db')
const nlp = require('compromise')
nlp.extend(require('compromise-numbers'))

module.exports = async function ({ titles } = {}) {
  titles = titles || await db.get('items').distinct('title', {}, { limit: 1000 })

  console.log(`processing ${titles.length} titles`)

  console.time('extract people')
  const people = extractPeople(titles)
  console.timeEnd('extract people')

  console.time('extract nouns')
  const nouns = extractNouns(titles)
  console.timeEnd('extract nouns')

  console.time('extract nounsOccurency')
  const nounsOccurency = nouns.reduce(countByKey, {})
  console.timeEnd('extract nounsOccurency')

  console.time('extract numbers')
  const numbers = extractNumbers(titles)
  console.timeEnd('extract numbers')

  console.time('extract numbersOccurency')
  const numbersOccurency = numbers.reduce(countByKey, {})
  console.timeEnd('extract numbersOccurency')

  return {
    titles,
    nouns,
    people,
    nounsOccurency,
    numbers,
    numbersOccurency
  }
}

function countByKey (acc, curr) { return Object.assign(acc, { [curr]: ++acc[curr] || 1 }) }

function cleanText (text = '') {
  return text
    .replace(/,/, ' ')
    .replace(/\(/, ' ')
    .replace(/\)/, ' ')
    .trim()
}

function extractNouns (texts = []) {
  return texts
    .map(title => nlp(title).nouns().json().reduce((acc, curr) => acc.concat(...curr.normal.split(' ')), []))
    .reduce((acc, curr) => acc.concat(curr), [])
    .filter(Boolean)
    .map(cleanText)
    .filter(s => s.length > 1)
}

function extractPeople (texts = []) {
  return texts
    .map(title => nlp(title).people().json().map(d => d.text))
    .reduce((acc, curr) => acc.concat(curr), [])
    .filter(Boolean)
    .filter(s => typeof s === 'string')
    .map(cleanText)
    .filter(s => s.length > 1)
}

function extractNumbers (texts = []) {
  return texts.map(title => nlp(title).numbers().json().map(d => d.number || d.normal))
    .reduce((acc, curr) => acc.concat(curr), [])
    .filter(Boolean)
    .filter(s => typeof s === 'string')
    .map(cleanText)
}
