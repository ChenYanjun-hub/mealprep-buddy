// Local development server for API functions
// Run with: node api-server.js

import http from 'http'
import { handler as recommendHandler } from './api/recommend.js'

const PORT = 3001

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/api/recommend' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', async () => {
      const mockReq = {
        method: 'POST',
        body: JSON.parse(body),
        headers: req.headers,
      }
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            res.writeHead(code, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(data))
          },
        }),
        json: (data) => {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        },
      }
      await recommendHandler(mockReq, mockRes)
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
