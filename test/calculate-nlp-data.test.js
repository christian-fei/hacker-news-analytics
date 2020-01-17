const test = require('ava')
const db = require('../lib/db')
const items50000 = require('./fixtures/items.50000.json')
const calculateNlpDate = require('../lib/calculate-nlp-data')

test.beforeEach(async () => {
  console.log('removing "items" collection')
  await db.get('items').remove({})
  console.log('inserting 50000 docs in "items" collection')
  await db.get('items').insert(items50000)
})

test('contains titles', async t => {
  const data = await calculateNlpDate()
  console.log('data', data)
  t.truthy(data)
  t.true(Array.isArray(data.titles))
  t.true(Array.isArray(data.titlesRank1))
})
