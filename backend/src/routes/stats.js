import express from 'express'
import { getDatabase } from '../adapters/index.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/stats
 * Get user statistics
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const stats = await db.getUserStats(req.user.id)

  res.json({
    stats
  })
}))

/**
 * GET /api/stats/token/:id
 * Get specific token statistics
 */
router.get('/token/:id', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()

  // Check if token exists
  const token = await db.getTokenById(req.user.id, req.params.id)
  if (!token) {
    return res.status(404).json({ error: 'Token not found' })
  }

  const stats = await db.getTokenStats(req.user.id, req.params.id)

  res.json({
    stats: {
      ...stats,
      issuer: token.issuer,
      account: token.account
    }
  })
}))

export default router
