import * as preact from '/preact.js'
const { Component, h } = preact

export default class App extends Component {
  constructor () {
    super()
    this.state = {
      data: {},
      isStats: /\/stats/.test(window.location.pathname)
    }
    const eventSource = new window.EventSource('/sse' + window.location.pathname)

    eventSource.onmessage = (message) => {
      if (!message || !message.data) return console.error('skipping empty message')
      message = safeJSONparse(message.data, {})
      const data = message.data || {}
      console.log('data', data)
      this.setState({ data, isStats: /\/stats/.test(window.location.pathname) })
    }
  }

  componentDidUpdate () {
    // this.messagesEl.scrollTop = this.messagesEl.scrollHeight + 400
  }

  render () {
    const data = this.state.data
    const pages = Object.keys(data).sort((a, b) => +a > +b)
    if (!data || Object.keys(data).length === 0) {
      return h('div', null, 'loading...')
    }

    if (this.state.isStats) {
      const chartHeight = 100

      const scores = data.map(d => d.score).reverse()
      const maxScore = Math.max(...scores)
      const minScore = Math.min(...scores)
      const normalizedScores = scores.map(score => ((score - minScore) / (maxScore - minScore)) * chartHeight)
      const comments = data.map(d => d.commentCount).reverse()
      const maxComments = Math.max(...comments)
      const minComments = Math.min(...comments)
      const normalizedComments = comments.map(comment => ((comment - minComments) / (maxComments - minComments)) * chartHeight)
      return h('div', null, [
        h('div', null, [
          h('h4', null, 'score over time'),
          h('br', null, []),
          h('svg', { width: '600px', height: `${chartHeight}px` }, normalizedScores.map((n, i) => h('rect', { width: `${100 / normalizedScores.length}%`, x: 0, y: chartHeight - n, height: n, transform: `translate(${600 / normalizedScores.length * i}, 0)` }))),
          h('h4', null, 'comments over time'),
          h('br', null, []),
          h('svg', { width: '600px', height: `${chartHeight}px` }, normalizedComments.map((n, i) => h('rect', { width: `${100 / normalizedComments.length}%`, x: 0, y: chartHeight - n, height: n, transform: `translate(${600 / normalizedComments.length * i}, 0)` }))),
          h('h4', null, 'changes over time'),
          h('br', null, []),
          h('table', null, [
            h('tr', null, [
              h('th', null, 'rank'),
              h('th', null, 'age'),
              h('th', null, 'score'),
              h('th', null, 'comments'),
              h('th', null, 'title'),
              h('th', null, 'updated')
            ]),
            data.map(item => h('tr', { id: item.id, onClick: (e) => { if (!this.state.isStats) window.location.href = window.location.href.replace(/$/, `stats/${item.id}`) } }, [
              h('td', null, '#' + item.rank),
              h('td', null, item.age),
              h('td', null, `${item.score}`),
              h('td', null, `${item.commentCount}`),
              h('td', null, h('a', { href: item.link, target: '_blank' }, item.title)),
              h('td', null, item.updated)
            ]))
          ])
        ])
      ])
    }

    return h('div', null, [
      pages.map(p => {
        return h('div', null, [
          h('h1', null, `page ${p}`),
          h('table', null, [
            h('tr', null, [
              h('th', null, 'rank'),
              h('th', null, 'age'),
              h('th', null, 'score'),
              h('th', null, 'comments'),
              h('th', null, 'title')
            ]),
            data[p].map(item => h('tr', { id: item.id, onClick: (e) => { window.location.href = window.location.href.replace(/$/, `stats/${item.id}`) } }, [
              h('td', null, '#' + item.rank),
              h('td', null, item.age),
              h('td', null, `${item.score}`),
              h('td', null, `${item.commentCount}`),
              h('td', null, h('a', { href: item.link, target: '_blank' }, item.title))
            ])
            )
          ])
        ])
      }),
      h('pre', null, safeJSONstringify(data))
    ])
  }
}

function safeJSONparse (str, fallback = []) {
  try {
    return JSON.parse(str)
  } catch (err) { return fallback }
}

function safeJSONstringify (str, fallback = '') {
  try {
    return JSON.stringify(str, null, 2)
  } catch (err) { return fallback }
}
