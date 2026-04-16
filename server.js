const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'data', 'notices.json')

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})
app.use(express.json())
app.use(express.static('public'))

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'))
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]))
}

app.get('/api/notices', (req, res) => {
  const notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  res.json(notices)
})

app.post('/api/notices', (req, res) => {
  const { title, body, cat } = req.body
  if (!title) return res.status(400).json({ error: 'Title required' })
  const notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const newNotice = {
    id: Date.now(),
    title, body: body || '', cat: cat || 'update',
    date: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }
  notices.unshift(newNotice)
  fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2))
  res.json(newNotice)
})

app.delete('/api/notices/:id', (req, res) => {
  let notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  notices = notices.filter(n => n.id !== parseInt(req.params.id))
  fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2))
  res.json({ ok: true })
})

app.listen(PORT, () => console.log(`Running on port ${PORT}`))