const express = require('express')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// ─────────────────────────────────────────────
// FILE PATHS
// ─────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data', 'notices.json')
const USERS_FILE = path.join(__dirname, 'data', 'users.json')

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.log('⚠️ Missing JWT_SECRET in .env')
}

// ─────────────────────────────────────────────
// CORS (manual)
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

app.use(express.json())
app.use(express.static('public'))

// ─────────────────────────────────────────────
// DATA SETUP
// ─────────────────────────────────────────────
const dataDir = path.join(__dirname, 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir)
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]))
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]))
}

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ─────────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' })
  }

  const hash = await bcrypt.hash(password, 10)

  const newUser = {
    id: Date.now(),
    username,
    password: hash
  }

  users.push(newUser)

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))

  res.json({ ok: true })
})

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))

  const user = users.find(u => u.username === username)

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const match = await bcrypt.compare(password, user.password)

  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token })
})

// ─────────────────────────────────────────────
// VERIFY TOKEN
// ─────────────────────────────────────────────
app.get('/api/verify', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user.username })
})

// ─────────────────────────────────────────────
// GET NOTICES
// ─────────────────────────────────────────────
app.get('/api/notices', requireAuth, (req, res) => {
  const notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  res.json(notices)
})

// ─────────────────────────────────────────────
// CREATE NOTICE
// ─────────────────────────────────────────────
app.post('/api/notices', requireAuth, (req, res) => {
  const { title, body, cat } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title required' })
  }

  const notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

  const newNotice = {
    id: Date.now(),
    title,
    body: body || '',
    cat: cat || 'update',
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  notices.unshift(newNotice)

  fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2))

  res.json(newNotice)
})

// ─────────────────────────────────────────────
// UPDATE NOTICE
// ─────────────────────────────────────────────
app.put('/api/notices/:id', requireAuth, (req, res) => {
  const { title, body, cat } = req.body

  let notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

  const idx = notices.findIndex(n => n.id === parseInt(req.params.id))

  if (idx === -1) {
    return res.status(404).json({ error: 'Notice not found' })
  }

  notices[idx] = {
    ...notices[idx],
    title,
    body: body || '',
    cat: cat || 'update'
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2))

  res.json(notices[idx])
})

// ─────────────────────────────────────────────
// DELETE NOTICE
// ─────────────────────────────────────────────
app.delete('/api/notices/:id', requireAuth, (req, res) => {
  let notices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

  notices = notices.filter(n => n.id !== parseInt(req.params.id))

  fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2))

  res.json({ ok: true })
})

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})