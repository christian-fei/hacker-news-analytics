import * as preact from '/preact.js'
const { Component, h } = preact

export default class App extends Component {
  constructor () {
    super()
    this.state = {
      data: {}
    }
    const eventSource = new window.EventSource('/sse' + window.location.pathname)

    eventSource.onmessage = (message) => {
      if (!message || !message.data) return console.error('skipping empty message')
      message = safeJSONparse(message.data, {})
      const data = message.data || {}
      console.log('data', data)
      this.setState({ data })
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

    if (/\/stats/.test(window.location.pathname)) {
      return h('div', null, 'stats ' + window.location.pathname.replace(/\/stats\//, ''))
    }

    return h('div', null, [
      pages.map(p => {
        return h('div', null, [
          h('h1', null, `page ${p}`),
          h('table', null, [
            h('tr', null, [
              h('th', null, 'rank'),
              h('th', null, 'score'),
              h('th', null, 'age'),
              h('th', null, 'comments'),
              h('th', null, 'title')
            ]),
            data[p].map(item => h('tr', { id: item.id, onClick: (e) => { window.location.href = window.location.href.replace(/$/, `stats/${item.id}`) } }, [
              h('td', null, '#' + item.rank),
              h('td', null, `${item.score} upvotes`),
              h('td', null, item.age),
              h('td', null, `${item.commentCount} comments`),
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
