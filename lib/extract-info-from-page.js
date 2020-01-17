module.exports = async function extractInfoFromPage (page) {
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
