import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { getDatabase } from '../adapters/index.js'

/**
 * Authentication Middleware
 * Validates JWT token and attaches user to request
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret)

    // Get user from database
    const db = await getDatabase()
    const user = await db.getUserById(decoded.userId)

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Attach user to request (exclude password hash)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, config.jwt.secret)

      const db = await getDatabase()
      const user = await db.getUserById(decoded.userId)

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    }
    next()
  } catch {
    // Continue without user
    next()
  }
}
