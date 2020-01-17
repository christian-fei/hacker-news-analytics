const test = require('ava')
const db = require('../lib/db')
const items50000 = require('./fixtures/items.50000.json')
const calculateNlpDate = require('../lib/calculate-nlp-data')

test.beforeEach(async () => {
  console.time('-> removing "items" collection')
  await db.get('items').remove({})
  console.timeEnd('-> removing "items" collection')
  console.time('-> inserting 50000 docs in "items" collection')
  await db.get('items').insert(items50000)
  console.timeEnd('-> inserting 50000 docs in "items" collection')
})

test('contains titles', async t => {
  const data = await calculateNlpDate()
  t.truthy(data)
  t.true(Array.isArray(data.titles))
  t.true(Array.isArray(data.titlesRank1))
  console.log('-> data.nouns', JSON.stringify(data.nouns))
  t.true(Array.isArray(data.nouns))
  t.true(Array.isArray(data.numbers))
  t.truthy(data.numbersOccurency)
})
