import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { pathToFileURL } from 'node:url'
import { config } from './config/index.js'
import { getDatabase, closeDatabase } from './adapters/index.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

// Import routes
import authRoutes from './routes/auth.js'
import tokensRoutes from './routes/tokens.js'
import statsRoutes from './routes/stats.js'

export const app = express()
if (config.env === 'production') app.set('trust proxy', 1)

// Middleware
app.use(helmet()) // Security headers
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS'))
  }
}))
app.use(compression()) // Response compression
app.use(express.json({ limit: '256kb' }))
app.use(express.urlencoded({ extended: true, limit: '256kb' }))

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later' }
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' }
})
app.use('/api/', limiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// Health check (simple text response)
app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase()
    const health = await db.healthCheck()
    if (!health.healthy) return res.status(503).send('ERROR')
    return res.send('OK')
  } catch {
    res.status(503).send('ERROR')
  }
})

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Token Vault API',
    version: '1.0.0',
    description: 'Multi-database TOTP token management API',
    endpoints: {
      auth: '/api/auth',
      tokens: '/api/tokens',
      stats: '/api/stats'
    }
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tokens', tokensRoutes)
app.use('/api/stats', statsRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

// Start server
export async function start() {
  try {
    // Initialize database
    await getDatabase()
    console.log(`✅ Database initialized: ${config.database.type}`)

    // Start server
    const server = app.listen(config.port, config.host, () => {
      console.log(`
🚀 Token Vault Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment:  ${config.env}
Server:       http://${config.host}:${config.port}
Database:     ${config.database.type}
CORS Origin:  ${config.corsOrigin}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Endpoints:
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me
  PUT    /api/auth/password

  GET    /api/tokens
  POST   /api/tokens
  GET    /api/tokens/:id
  PUT    /api/tokens/:id
  DELETE /api/tokens/:id
  POST   /api/tokens/bulk
  DELETE /api/tokens/bulk

  GET    /api/stats
  GET    /api/stats/token/:id

  GET    /health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `)
    })
    return server
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⏳ SIGTERM received, shutting down gracefully...')
  await closeDatabase()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n⏳ SIGINT received, shutting down gracefully...')
  await closeDatabase()
  process.exit(0)
})

// Start the server only when this module is the process entry point. Tests can
// import the Express app without opening a second listener.
const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url

if (isMainModule) {
  start()
}
