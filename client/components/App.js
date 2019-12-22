import * as preact from '/preact.js'
const { Component, h } = preact

export default class App extends Component {
  constructor () {
    super()
    this.state = {
      data: {}
    }
    const eventSource = new window.EventSource('/sse')

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
    if (!data || Object.keys(data).length === 0) {
      return h('div', null, 'loading...')
    }
    return h('div', null, [
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
