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
        const chartHeight = 100
        const scores = data.map(d => d.score).reverse()
        const maxScore = Math.max(...scores)
        const minScore = Math.min(...scores)
        const normalizedScores = scores.map(score => ((score - minScore) / (maxScore - minScore)) * chartHeight)
        const comments = data.map(d => d.commentCount).reverse()
        const maxComments = Math.max(...comments)
        const minComments = Math.min(...comments)
        const normalizedComments = comments.map(comment => ((comment - minComments) / (maxComments - minComments)) * chartHeight)
        chartSection.push(...[
          <div>
            <div style='display: inline-block;width: 50%;'>
              <h4>score over time</h4>
              <br />
              <svg width='300px' height={`${chartHeight}px`}>
                {normalizedScores.map((n, i) =>
                  <rect width={`${100 / normalizedScores.length}%`} x={0} y={chartHeight - n} height={n} transform={`translate(${300 / normalizedScores.length * i}, 0)`} />
                )}
              </svg>
              <div style='display: inline-block;width: 50%;'>
                <h4>comments over time</h4>
                <br />
                <svg width='600px' height={`${chartHeight}px`}>
                  {normalizedComments.map((n, i) =>
                    <rect width={`${100 / normalizedComments.length}%`} x={0} y={chartHeight - n} height={n} transform={`translate(${300 / normalizedComments.length * i}, 0)`} />
                  )}
                </svg>
              </div>
            </div>
            <div>
              <Chart
                chartType='ScatterChart'
                data={[['Age', 'Weight'], [4, 5.5], [8, 12]]}
                width='100%'
                height='400px'
                legendToggle />
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
          {/* {...chartSection} */}
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
