const connect = require('connect')
const monk = require('monk')
const db = monk(process.env.MONGO_URI || 'mongodb://localhost:27017/hackernews')
const fs = require('fs')
const path = require('path')
const itemsColl = db.get('items')
const http = require('http')
const logger = require('pino')()

module.exports = async function createServer ({ port = process.env.PORT || process.env.HTTP_PORT || 4000 } = {}) {
  const data = {}
  const log = []
  const app = connect()
  withRouter(app)
  const httpServer = http.createServer(app)
  httpServer.listen(port)

  logger.info(`listening on http://localhost:${port}`)
  return {
    update: (update = Function.prototype) => { update({ data, log }) },
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

    app.use('/nlp', (req, res) => {
      const accept = req.headers.accept || ''
      if (accept.indexOf('application/json') > 0 || accept.indexOf('*/*')) {
        res.setHeader('Content-Type', 'application/json')
        const nlpData = JSON.stringify({ foo: new Date().toISOString() })
        res.write(nlpData)
        return res.end()
      }

      res.setHeader('Content-Type', 'text/html')
      res.write(index())
      return res.end()
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
function index () {
  const filepath = path.join(__dirname, 'client', 'dist', 'index.html')
  return read(filepath)
}
function read (filepath, defaultValue = '') {
  try {
    return fs.readFileSync(filepath)
  } catch (err) {
    return defaultValue
  }
}
