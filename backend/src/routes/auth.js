import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config, inviteCodeMatches } from '../config/index.js'
import { getDatabase } from '../adapters/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import {
  normalizeDisplayName,
  normalizeEmail,
  validateAccountPassword
} from '../utils/validation.js'

const router = express.Router()

function signToken(user) {
  const version = typeof user.token_version === 'number' ? user.token_version : 0
  return jwt.sign({ userId: user.id, v: version }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
}

async function revokeAllSessions(db, userId) {
  const user = await db.getUserById(userId)
  const current = typeof user?.token_version === 'number' ? user.token_version : 0
  await db.updateUser(userId, { tokenVersion: current + 1 })
}

/**
 * POST /api/auth/register
 * Register a new user.
 * v1.5.0 — registration is closed by default (REGISTRATION_ENABLED=false).
 * When closed, a valid inviteCode is required; with no invite code
 * configured, all registrations are rejected.
 */
router.post('/register', asyncHandler(async (req, res) => {
  if (!config.registrationEnabled && !inviteCodeMatches(req.body?.inviteCode)) {
    return res.status(403).json({ error: 'Registration is closed' })
  }

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
  const token = signToken({ id: userId, token_version: 0 })

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
  const token = signToken(user)

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
 * DELETE /api/auth/me
 * Delete the current account and all of its tokens (cascade).
 * v1.5.0. This does not delete the user's local vault or other devices'
 * copies; it only removes the server-side account.
 */
router.delete('/me', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  await db.deleteUser(req.user.id)
  res.json({ message: 'Account deleted successfully' })
}))

/**
 * POST /api/auth/logout
 * Revoke all sessions for the current user (increments token_version).
 * v1.5.0. The client should still discard its local token.
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  await revokeAllSessions(db, req.user.id)
  res.json({ message: 'Logged out successfully' })
}))

/**
 * PUT /api/auth/password
 * Change password — also revokes all existing sessions.
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

  // Update password and revoke all sessions issued before the change.
  await db.updateUser(req.user.id, { passwordHash })
  await revokeAllSessions(db, req.user.id)

  res.json({ message: 'Password updated successfully' })
}))

export default router
