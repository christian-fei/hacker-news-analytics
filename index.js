#!/usr/bin/env node

const { browser: { createBrowser, preparePage, takeScreenshot }, queue: { createQueue } } = require('mega-scraper')
const path = require('path')
const monk = require('monk')
const db = monk(process.env.MONGO_URI || 'mongodb://localhost:27017/hackernews')
const itemsColl = db.get('items')
const fs = require('fs')
const fsp = require('fs').promises
const connect = require('connect')
const http = require('http')

main()

async function main () {
  const browser = await createBrowser({ headless: true, incognito: true })
  const queue = createQueue('hackernews')
  const server = await createServer({ port: +process.env.PORT || +process.env.HTTP_PORT || 5000 })

  console.log('creating index')
  await itemsColl.createIndex({
    id: 1,
    title: 1,
    page: 1,
    rank: 1,
    link: 1,
    score: 1,
    age: 1,
    commentCount: 1
  }, { unique: true })

  await run()
  setInterval(async () => {
    console.log('running')
    await run()
  }, 1000 * 60)
  queue.on('stalled', async (job) => {
    console.log('discard stalled job', job.id, job.data)
    await job.discard()
  })
  queue.process(4, processJob)

  setInterval(async () => {
    console.log('checking failed')
    const failed = await queue.getFailed()
    for (const job of failed) {
      console.log('retrying', job.id)
      await job.retry()
    }
  }, 10000)

  async function processJob (job, done) {
    console.log('processing', job.id, job.data)
    job.progress(10)
    let page = await browser.newPage(job.data.url, { reusePage: false })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    job.progress(20)
    page = await preparePage(page, { proxy: true, blocker: true, images: true, stylesheets: true, javascript: true })
    job.progress(30)

    // await page.goto(job.data.url, { timeout: 10000 })
    await page.waitForSelector('table')
    job.progress(50)

    const content = await page.content()
    job.progress(70)

    if (/not able to serve your/gi.test(content)) {
      await page.close()
      await job.progress(100)
      await job.moveToFailed(new Error('blocked'))
      throw new Error('blocked')
    }

    job.progress(80)
    // await takeScreenshot(page, job.data)
    await job.progress(90)
    // const titles = await page.$$eval('.storylink', el => el && el.innerText)
    const ids = await page.evaluate(() => [...document.querySelectorAll('.athing')].map(el => el.getAttribute('id')))
    const titles = await page.evaluate(() => [...document.querySelectorAll('.storylink')].map(el => el.innerText))
    const links = await page.evaluate(() => [...document.querySelectorAll('.storylink')].map(el => el.href))
    const scores = await page.evaluate(() => [...document.querySelectorAll('.score')].map(el => +el.innerText.replace(/\D/gi, '')))
    const ages = await page.evaluate(() => [...document.querySelectorAll('.age a')].map(el => el.innerText))
    const ranks = await page.evaluate(() => [...document.querySelectorAll('.athing .rank')].map(el => +(el.innerText.replace(/\D/gi, ''))))
    const commentCounts = await page.evaluate(() => [...document.querySelectorAll('.athing + tr td > a:last-child')].map(el => +(el.innerText.replace(/\D/gi, ''))))
    // console.log({ titles, links, scores, ages, commentCounts })
    await page.close()
    console.log('success', job.id, job.data.url)
    const pageNumber = +job.data.url.replace(/\D/gi, '')
    const items = titles.map((_, i) => ({
      id: ids[i],
      title: titles[i],
      page: pageNumber,
      rank: ranks[i],
      link: links[i],
      score: scores[i],
      age: ages[i],
      commentCount: commentCounts[i],
      updated: new Date().toISOString()
    }))
    // console.log(JSON.stringify(items))
    await fsp.mkdir(path.resolve(__dirname, 'data'), { recursive: true })
    await fsp.mkdir(path.resolve(__dirname, 'data', job.data.url, '..'), { recursive: true })
    await fsp.writeFile(path.resolve(__dirname, 'data', `${job.data.url}.json`), JSON.stringify(items, null, 2))

    await job.progress(100)

    server.update(data => {
      data[pageNumber] = items
    })

    for (const item of items) {
      await itemsColl.insert(item)
        .then(() => {
          console.log('inserted', item.title, item.url)
        })
        .catch((err) => {
          if (err) { console.error(err.message) }
          console.log('unchanged', item.title, item.url)
        })
    }
    done(null, items)
  }

  async function run () {
    await queue.add({ url: 'https://news.ycombinator.com/news?p=1' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=2' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=3' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=4' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=5' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=6' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=7' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=8' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=9' }, { attempts: 3 })
    await queue.add({ url: 'https://news.ycombinator.com/news?p=10' }, { attempts: 3 })
  }
}

async function createServer ({ port = process.env.PORT || process.env.HTTP_PORT || 4000 } = {}) {
  const data = {}
  const app = connect()
  withRouter(app)
  const httpServer = http.createServer(app)
  httpServer.listen(port)

  console.log(`listening on http://localhost:${port}`)
  return {
    update: (cb = Function.prototype) => { cb(data) },
    address: async () => {
      const address = httpServer.address()
      if (address) return `http://localhost:${address.port}`
      return new Promise((resolve) => {
        const handle = setInterval(() => {
          const address = httpServer.address()
          if (!address) return
          clearInterval(handle)
          resolve(`http://localhost:${address.port}`)
        }, 200)
      })
    }
  }

  function withRouter (app) {
    console.log('with router')
    app.use('/favicon.ico', (req, res) => {
      return res.end()
    })

    app.use('/sse', (req, res) => {
      console.log('sse', req.url)
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      })

      writeSSE()
      const handle = setInterval(writeSSE, 1000)

      async function writeSSE () {
        if (/\/stats\//gi.test(req.url)) {
          res.write('event: message\n')
          const id = req.url.replace(/\/stats\//gi, '')
          console.log('finding items', { id })
          const data = await itemsColl.find({ id }, { limit: 60 * 24, sort: { updated: -1 } })
          res.write('event: message\n')
          res.write(`data: ${JSON.stringify({ time: new Date().toISOString(), data })}\n`)
          return res.write('\n\n')
        }

        res.write('event: message\n')
        res.write(`data: ${JSON.stringify({ time: new Date().toISOString(), data })}\n`)
        res.write('\n\n')
      }

      return res.on('close', () => {
        clearInterval(handle)
        try { res.end() } catch (_) {}
        console.log('sse connection closed')
      })
    })

    app.use((req, res) => {
      console.log('middleware', req.url)
      let filename = 'index.html'
      let contentType = 'text/html'

      if (/\/stats/.test(req.url)) {
        res.setHeader('Content-Type', contentType)
        res.write(read(path.join(__dirname, 'client', filename)) || index())
        return res.end()
      }

      if (req.url !== '/') {
        // console.log('unhandled', req.url)
        filename = req.url.replace(/^\//, '')
        contentType = filename.includes('css') ? 'text/css' : 'text/javascript'
      }
      // console.log('guessed', filename, contentType, 'for', req.url)
      res.setHeader('Content-Type', contentType)
      res.write(read(path.join(__dirname, 'client', filename)) || index())
      return res.end()
    })
  }
}

function read (filepath, defaultValue = '') {
  try {
    return fs.readFileSync(filepath)
  } catch (err) {
    return defaultValue
  }
}

function index () {
  const filepath = path.join(__dirname, 'client', 'index.html')
  return read(filepath)
}
