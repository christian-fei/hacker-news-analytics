#!/usr/bin/env node

const { browser: { createBrowser, preparePage, takeScreenshot }, queue: { createQueue } } = require('mega-scraper')
const path = require('path')
const fs = require('fs').promises

main()

async function main () {
  const browser = await createBrowser({ headless: true, incognito: true })
  const queue = createQueue('hackernews')
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
    console.log(job.id, job.data)
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
    await takeScreenshot(page, job.data)
    await job.progress(90)
    // const titles = await page.$$eval('.storylink', el => el && el.innerText)
    const titles = await page.evaluate(() => [...document.querySelectorAll('.storylink')].map(el => el.innerText))
    const links = await page.evaluate(() => [...document.querySelectorAll('.storylink')].map(el => el.href))
    const scores = await page.evaluate(() => [...document.querySelectorAll('.score')].map(el => +el.innerText.replace(/\D/gi, '')))
    const ages = await page.evaluate(() => [...document.querySelectorAll('.age a')].map(el => el.innerText))
    const commentCounts = await page.evaluate(() => [...document.querySelectorAll('.athing + tr a:last-child')].map(el => +(el.innerText.replace(/\D/gi, ''))))
    // console.log({ titles, links, scores, ages, commentCounts })
    await page.close()
    console.log('success', job.id, job.data.url)
    const items = titles.map((_, i) => ({
      title: titles[i],
      link: links[i],
      score: scores[i],
      age: ages[i],
      commentCount: commentCounts[i],
      updated: new Date().toISOString()
    }))
    // console.log(JSON.stringify(items))
    await fs.mkdir(path.resolve(__dirname, 'data'), { recursive: true })
    await fs.mkdir(path.resolve(__dirname, 'data', job.data.url, '..'), { recursive: true })
    await fs.writeFile(path.resolve(__dirname, 'data', `${job.data.url}.json`), JSON.stringify(items, null, 2))

    await job.progress(100)
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
