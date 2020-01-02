import * as React from 'react'
import { Chart } from 'react-google-charts'

export default class App extends React.Component {
  constructor () {
    super()
    this.state = {
      data: {},
      log: [],
      isStats: /\/stats/.test(window.location.pathname)
    }
    const eventSource = new window.EventSource('/sse' + window.location.pathname)

    eventSource.onmessage = (message) => {
      if (!message || !message.data) return console.error('skipping empty message')
      message = safeJSONparse(message.data, {})
      const data = message.data || {}
      const log = message.log || {}
      console.log('data', data)
      this.setState({ data, log, isStats: /\/stats/.test(window.location.pathname) })
    }
  }

  render () {
    const data = this.state.data
    const log = this.state.log
    const all = Object.keys(data).reduce((acc, key) => acc.concat(data[key]), [])

    if (!data || Object.keys(data).length === 0) {
      return <div>loading...</div>
    }

    if (this.state.isStats) {
      const enoughDataForCharts = data.length > 3
      const chartSection = []

      if (enoughDataForCharts) {
        const scores = data.map(d => d.score)
        const comments = data.map(d => d.commentCount)
        chartSection.push(...[
          <div>
            <div class='half'>
              <h4>score over time</h4>
              <Chart
                chartType='Line'
                data={[['Date', 'Score'], ...scores.map((score, index) => [new Date(data[index].updated), score])]}
                width='100%'
                height='200px'
                options={{ legend: { position: 'none' } }} />
            </div>
            <div class='half'>
              <h4>comments over time</h4>
              <Chart
                chartType='Line'
                data={[['Date', 'Comments'], ...comments.map((comments, index) => [new Date(data[index].updated), comments])]}
                width='100%'
                height='200px'
                options={{ legend: { position: 'none' } }} />
            </div>
          </div>
        ])
      }

      return <div>
        <div>
          <h1>
            <a href='/'>hacker news analytics</a>
            <span>&nbsp; - &nbsp;</span>
            <a href='https://github.com/christian-fei/hacker-news-analytics' target='_blank'>⑂ fork on github</a>
          </h1>
          <p>changes of a single post over time.</p>
          {chartSection}
          <br />
          <h4>changes over time</h4>
          <table>
            <tr>
              <th>rank'</th>
              <th>score'</th>
              <th>comments'</th>
              <th>title'</th>
              <th class='updated'>updated</th>
            </tr>
            {data.map((item, index) =>
              <tr id={item.id} onClick={(e) => { if (!this.state.isStats) window.location.href = window.location.href.replace(/$/, `stats/${item.id}`) }}>
                <td>{`#${item.rank} ${(index < data.length - 1) ? `(${item.rank - (data[index + 1] && data[index + 1].rank)})` : ''}`}</td>
                <td>{`${item.score} ${(index < data.length - 1) ? `(${item.score - (data[index + 1] && data[index + 1].score)})` : ''}`}</td>
                <td>{`${item.commentCount} ${(index < data.length - 1) ? `(${item.commentCount - (data[index + 1] && data[index + 1].commentCount)})` : ''}`}</td>
                <td><a href={item.link} target='_blank'>{item.title}</a></td>
                <td>{item.updated}</td>
              </tr>
            )}
          </table>
        </div>
      </div>
    }

    return <div>
      <h1>
        <a href='/'>hacker news analytics</a>
        <span>&nbsp; - &nbsp;</span>
        <a href='https://github.com/christian-fei/hacker-news-analytics' target='_blank'>⑂ fork on github</a>
      </h1>
      <p>a small tool to monitor the performance of a hacker news post over time.</p>
      <p>data collected: rank, score and comment count.</p>
      <h5>status log</h5>
      <pre>{log.join('\n')}</pre>
      <div>
        <table class='clickable'>
          <tr>
            <th>rank</th>
            <th>score</th>
            <th>comments</th>
            <th>title</th>
          </tr>
          {all.map(item =>
            <tr id={item.id} onClick={(e) => { window.location.href = window.location.href.replace(/$/, `stats/${encodeURIComponent(item.title)}`) }}>
              <td>{'#' + item.rank}</td>
              <td>{item.score}</td>
              <td>{item.commentCount}</td>
              <td><a href={item.link} target='_blank'>{item.title}</a></td>
            </tr>
          )}
        </table>
      </div>
    </div>
  }
}

function safeJSONparse (str, fallback = []) {
  try {
    return JSON.parse(str)
  } catch (err) { return fallback }
}
