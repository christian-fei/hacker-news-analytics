#!/usr/bin/env node

const { browser: { createBrowser, preparePage }, queue: { createQueue } } = require('mega-scraper')
const logger = require('pino')()
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

  logger.info('creating index')
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
    logger.info('running')
    await run()
  }, 1000 * 60 * 2)
  queue.on('stalled', async (job) => {
    logger.info('discard stalled job', job.id, job.data)
    await job.discard()
  })
  queue.process(4, processJob)

  async function processJob (job, done) {
    logger.info('processing', job.id, job.data)
    job.progress(10)
    let page = await browser.newPage(job.data.url, { reusePage: false })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    job.progress(20)
    page = await preparePage(page, { proxy: true, blocker: true, images: true, stylesheets: true, javascript: true })
    job.progress(30)

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

    await job.progress(80)

    const { ids, titles, links, scores, ages, ranks, commentCounts } = await extract(page)

    await page.close()

    logger.info('success', job.id, job.data.url)
    const pageNumber = +job.data.url.replace(/\D/gi, '')
    logger.info('pageNunber', pageNumber)
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

    await fsp.mkdir(path.resolve(__dirname, 'data'), { recursive: true })
    await fsp.mkdir(path.resolve(__dirname, 'data', job.data.url, '..'), { recursive: true })
    await fsp.writeFile(path.resolve(__dirname, 'data', `${job.data.url}.json`), JSON.stringify(items, null, 2))

    await job.progress(100)

    server.update(({ data, log }) => {
      data[pageNumber] = items
      if (log.length >= 10) log.splice(0, 1)
      log.push(`scraped content on page ${pageNumber}\t @ ${new Date().toISOString()}`)
    })

    for (const item of items) {
      await itemsColl.insert(item)
        .then(() => logger.info('inserted', item.title, item.url))
        .catch((err) => logger.info('unchanged', item.title, item.url, err.message))
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
  const log = []
  const app = connect()
  withRouter(app)
  const httpServer = http.createServer(app)
  httpServer.listen(port)

  logger.info(`listening on http://localhost:${port}`)
  return {
    update: (cb = Function.prototype) => { cb({ data, log }) },
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
    logger.info('with router')
    app.use('/favicon.ico', (req, res) => {
      return res.end()
    })

    app.use('/sse', (req, res) => {
      logger.info('sse', req.url)
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      })

      writeSSE()
      const handle = setInterval(writeSSE, 2000)

      return res.on('close', () => {
        clearInterval(handle)
        try { res.end() } catch (_) {}
        logger.info('sse connection closed')
      })

      async function writeSSE () {
        if (/\/stats\//gi.test(req.url)) {
          res.write('event: message\n')
          let title = req.url.replace(/\/stats\//gi, '')
          title = decodeURIComponent(title)
          logger.info('finding items', { title })
          const data = await itemsColl.find({ title }, { sort: { updated: -1 } })
          res.write('event: message\n')
          res.write(`data: ${JSON.stringify({ time: new Date().toISOString(), data, log })}\n`)
          return res.write('\n\n')
        }

        res.write('event: message\n')
        res.write(`data: ${JSON.stringify({ time: new Date().toISOString(), data, log })}\n`)
        res.write('\n\n')
      }
    })

    app.use((req, res) => {
      logger.info('handle', req.url)

      if (/\/stats/.test(req.url)) {
        res.setHeader('Content-Type', 'text/html')
        res.write(index())
        return res.end()
      }

      let filename = 'index.html'
      let contentType = 'text/html'
      if (req.url !== '/') {
        filename = req.url.replace(/^\//, '')
        contentType = filename.includes('css') ? 'text/css' : 'text/javascript'
      }
      res.setHeader('Content-Type', contentType)
      res.write(read(path.join(__dirname, 'client', 'dist', filename)) || index())
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
  const filepath = path.join(__dirname, 'client', 'dist', 'index.html')
  return read(filepath)
}

async function extract (page) {
  const ids = await page.evaluate(() => [...document.querySelectorAll('.athing')].map(el => el.getAttribute('id')))
  const titles = await page.evaluate(() => [...document.querySelectorAll('.athing')].map(el => el.querySelector('.storylink').innerText))
  const links = await page.evaluate(() => [...document.querySelectorAll('.athing')].map(el => el.querySelector('.storylink').getAttribute('href')))
  const scores = await page.evaluate(() => [...document.querySelectorAll('.athing + tr')].map(el => +(el.querySelector('.score') || { innerText: '' }).innerText.replace(/\D/gi, '')))
  const ages = await page.evaluate(() => [...document.querySelectorAll('.athing + tr')].map(el => el.querySelector('.age a').innerText))
  const ranks = await page.evaluate(() => [...document.querySelectorAll('.athing')].map(el => +el.querySelector('.rank').innerText.replace(/\D/gi, '')))
  const commentCounts = await page.evaluate(() => [...document.querySelectorAll('.athing + tr td > a:last-child')].map(el => +(el.innerText.replace(/\D/gi, ''))))

  return {
    ids,
    titles,
    links,
    scores,
    ages,
    ranks,
    commentCounts
  }
}
