// server/index.js
require('dotenv').config()
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { routesInit } = require('./routes/config_routes')
const app = express()

// ===== Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // כדי לאפשר הצגת תמונות מ-/uploads
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' })) // מאפשר Base64
app.use(cookieParser())
// CORS with whitelist and proper preflight handling
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // allow non-browser requests
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Explicitly handle preflight
app.options('*', cors())

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ===== DB
const MONGO_URI = process.env.MONGO_URI
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('✅ MongoDB connected')

      try {
        const Category = require('./models/Category')
        const indexes = await Category.collection.indexes()
        const hasSlugIdx = indexes.some(ix => ix.name === 'slug_1')
        if (hasSlugIdx) {
          await Category.collection.dropIndex('slug_1')
          console.log('🧹 Dropped legacy Category index: slug_1')
        }
      } catch (err) {
        // אם אין אינדקס כזה – נתעלם
        if (err?.codeName !== 'IndexNotFound') {
          console.warn('Index cleanup warning:', err.message)
        }
      }
    })
    .catch((e) => console.error('Mongo error', e))
} else {
  console.warn('⚠️  MONGO_URI is not set. Skipping MongoDB connection. Set it in your .env file.')
}

// ===== Routes
routesInit(app);
// ===== Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Server Error' })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`))
