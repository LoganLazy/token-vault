import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { getDatabase } from '../adapters/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import {
  normalizeDisplayName,
  normalizeEmail,
  validateAccountPassword
} from '../utils/validation.js'

const router = express.Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const password = validateAccountPassword(req.body.password)
  const name = normalizeDisplayName(req.body.name)

  const db = await getDatabase()

  // Check if user already exists
  const existingUser = await db.getUserByEmail(email)
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' })
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds)

  // Create user
  const userId = await db.createUser({
    email,
    passwordHash,
    name: name || null
  })

  // Generate JWT
  const token = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: userId,
      email,
      name: name || null
    }
  })
}))

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email)
  const { password } = req.body
  if (typeof password !== 'string' || password.length > 128) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const db = await getDatabase()

  // Get user
  const user = await db.getUserByEmail(email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // Generate JWT
  const token = jwt.sign({ userId: user.id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  })
}))

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    user: req.user
  })
}))

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (typeof currentPassword !== 'string' || currentPassword.length > 128) {
    return res.status(400).json({ error: 'Current password is invalid' })
  }
  validateAccountPassword(newPassword, 'New password')

  const db = await getDatabase()

  // Get user with password hash
  const user = await db.getUserById(req.user.id)

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds)

  // Update password
  await db.updateUser(req.user.id, { passwordHash })

  res.json({ message: 'Password updated successfully' })
}))

export default router
