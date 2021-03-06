const db = require('./lib/db')
const fs = require('fs')
const nlp = require('compromise')
const path = require('path')
const calculateNlpData = require('./lib/calculate-nlp-data')
const distinctTitles = require('./test/fixtures/distinct-titles.json')

play()
  .then(() => process.exit(0))
  .catch((err) => console.error(err) && process.exit(1))

async function play () {
  // console.time('-> removing "items" collection')
  // await db.get('items').remove({})
  // console.timeEnd('-> removing "items" collection')
  // console.time('-> inserting 50000 docs in "items" collection')
  // await db.get('items').insert(items50000)
  // console.timeEnd('-> inserting 50000 docs in "items" collection')
  console.log('calculating nlp data')
  distinctTitles.length = 1000
  const data = await calculateNlpData({ titles: distinctTitles })
  nlp(data.titles[0]).people().json()
  // console.log('data', data)
  fs.writeFileSync(path.resolve(__dirname, 'playground.json'), JSON.stringify(data, null, 2))
  console.log('created playground.json')
  // t.truthy(data)
  // t.true(Array.isArray(data.titles))
  // t.true(Array.isArray(data.titlesRank1))
  // console.log('-> data.nouns', JSON.stringify(data.nouns))
  // t.true(Array.isArray(data.nouns))
  // t.true(Array.isArray(data.numbers))
  // t.truthy(data.numbersOccurency)
}
