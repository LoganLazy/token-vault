import dotenv from 'dotenv'
dotenv.config()

const environment = process.env.NODE_ENV || 'development'
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const dataEncryptionKey = process.env.DATA_ENCRYPTION_KEY
  || 'dev-encryption-key-change-in-production'
const databaseType = (process.env.DB_TYPE || 'sqlite').toLowerCase()
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)

if (environment === 'production') {
  if (jwtSecret.length < 32 || jwtSecret.includes('change-in-production')) {
    throw new Error('JWT_SECRET must be a unique value of at least 32 characters in production')
  }
  if (!/^[a-fA-F0-9]{64}$/.test(dataEncryptionKey)) {
    throw new Error('DATA_ENCRYPTION_KEY must be exactly 64 hexadecimal characters in production')
  }
  if (databaseType === 'memory') {
    throw new Error('The memory database is not allowed in production')
  }
  if (corsOrigins.length === 0 || corsOrigins.some(origin => !origin.startsWith('https://'))) {
    throw new Error('CORS_ORIGIN must contain HTTPS origins in production')
  }
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 12 || bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 12 and 15 in production')
  }
}

export const config = {
  // Server
  env: environment,
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: {
    type: databaseType,

    // SQLite
    sqlite: {
      filename: process.env.SQLITE_FILENAME || './data/totp.db'
    },

    // MySQL
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'totp_vault'
    },

    // PostgreSQL
    postgres: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT) || 5432,
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || '',
      database: process.env.PG_DATABASE || 'totp_vault'
    }
  },

  // JWT
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Security
  bcryptRounds,

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // CORS
  corsOrigins,
  corsOrigin: corsOrigins.join(', '),

  // Encryption
  dataEncryptionKey
}
