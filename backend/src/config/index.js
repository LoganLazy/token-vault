import crypto from 'node:crypto'
import dotenv from 'dotenv'
dotenv.config()

const environment = process.env.NODE_ENV || 'development'
// JWT_SECRET is required in every environment except NODE_ENV=test, where a
// test-only fallback is allowed so the test suite can run without a real
// secret. The test fallback must never be used outside tests.
const jwtSecret = process.env.JWT_SECRET
  || (environment === 'test' ? 'test-only-jwt-secret-do-not-use-in-production-0123456789' : null)
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('change-in-production')) {
  throw new Error('JWT_SECRET must be set to a unique value of at least 32 characters')
}
const databaseType = (process.env.DB_TYPE || 'sqlite').toLowerCase()
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)

// Registration control (v1.5.0): closed by default for a 5–10 person
// self-hosted deployment. When REGISTRATION_ENABLED is not "true",
// POST /api/auth/register requires body.inviteCode to match
// REGISTRATION_INVITE_CODE (constant-time compare); with no invite code
// configured, all registrations are rejected.
const registrationEnabled = process.env.REGISTRATION_ENABLED === 'true'
const registrationInviteCode = process.env.REGISTRATION_INVITE_CODE || ''

if (environment === 'production') {
  if (databaseType === 'memory') {
    throw new Error('The memory database is not allowed in production')
  }
  if (corsOrigins.length === 0 || corsOrigins.some(origin => !origin.startsWith('https://'))) {
    throw new Error('CORS_ORIGIN must contain HTTPS origins in production')
  }
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 12 || bcryptRounds > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 12 and 15 in production')
  }
  if (!registrationEnabled && !registrationInviteCode) {
    // Not fatal: registration is simply closed. Warn loudly so the
    // operator notices instead of wondering why nobody can sign up.
    console.warn('⚠️  Registration is closed: REGISTRATION_ENABLED is not true and no REGISTRATION_INVITE_CODE is set.')
  }
}

export function inviteCodeMatches(candidate) {
  if (!registrationInviteCode) return false
  if (typeof candidate !== 'string') return false
  const expected = Buffer.from(registrationInviteCode, 'utf8')
  const actual = Buffer.from(candidate, 'utf8')
  if (actual.length !== expected.length) {
    // Still run a constant-time compare on the expected value so the
    // timing does not leak the length difference.
    crypto.timingSafeEqual(expected, expected)
    return false
  }
  return crypto.timingSafeEqual(actual, expected)
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
    expiresIn: process.env.JWT_EXPIRES_IN || '12h'
  },

  // Registration
  registrationEnabled,
  registrationInviteCodeSet: Boolean(registrationInviteCode),

  // Security
  bcryptRounds,

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // CORS
  corsOrigins,
  corsOrigin: corsOrigins.join(',')
  // NOTE (v1.5.0): there is no DATA_ENCRYPTION_KEY any more. Sync is
  // end-to-end encrypted on the client with the user's master password;
  // the server stores opaque tv3: envelopes and cannot decrypt them.
}
