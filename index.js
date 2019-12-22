#!/usr/bin/env node

const { browser: { createBrowser, preparePage, takeScreenshot }, queue: { createQueue }, createServer } = require('mega-scraper')

main()

async function main () {
  const browser = await createBrowser({ headless: true, incognito: false })
  const queue = createQueue('hackernews')
  await run()
  setInterval(async () => {
    await run()
  }, 1000 * 60 * 1)
  queue.on('stalled', async (job) => {
    console.log('discard stalled job', job)
    await job.discard()
  })
  queue.process(5, async (job, done) => {
    console.log(job.id, job.data)
    job.progress(10)
    let page = await browser.newPage(job.data.url, { reusePage: false })
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
    await takeScreenshot(page, job.data)
    await page.close()
    console.log('success', job.data)
    await job.progress(100)
    done()
  })

  setInterval(async () => {
    const failed = await queue.getFailed()
    for (const job of failed) {
      console.log('retrying', job.id)
      await job.retry()
    }
  }, 10000)

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
