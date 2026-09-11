import express from 'express'
import { getDatabase } from '../adapters/index.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  normalizeCategory,
  normalizeTokenIds,
  normalizeTokenInput
} from '../utils/validation.js'

const router = express.Router()

// Keep the bulk endpoint ahead of /:id so DELETE /bulk is not treated as a
// request for a token literally named "bulk".
router.delete('/bulk', authenticate, asyncHandler(async (req, res) => {
  const tokenIds = normalizeTokenIds(req.body.tokenIds)

  const db = await getDatabase()
  await db.bulkDeleteTokens(req.user.id, tokenIds)

  res.json({
    message: `${tokenIds.length} tokens deleted successfully`,
    count: tokenIds.length
  })
}))

/**
 * GET /api/tokens
 * Get all tokens for current user
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const tokens = await db.getAllTokens(req.user.id)

  res.json({
    tokens,
    count: tokens.length
  })
}))

/**
 * GET /api/tokens/search/:query
 * Search tokens
 */
router.get('/search/:query', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const tokens = await db.searchTokens(req.user.id, req.params.query)

  res.json({
    tokens,
    count: tokens.length
  })
}))

/**
 * GET /api/tokens/category/:category
 * Get tokens by category
 */
router.get('/category/:category', authenticate, asyncHandler(async (req, res) => {
  const category = normalizeCategory(req.params.category)
  const db = await getDatabase()
  const tokens = await db.getTokensByCategory(req.user.id, category)

  res.json({
    tokens,
    count: tokens.length
  })
}))

/**
 * GET /api/tokens/:id
 * Get a specific token
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  const token = await db.getTokenById(req.user.id, req.params.id)

  if (!token) {
    return res.status(404).json({ error: 'Token not found' })
  }

  res.json({ token })
}))

/**
 * POST /api/tokens
 * Add a new token
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tokenData = normalizeTokenInput(req.body)

  const db = await getDatabase()
  const tokenId = await db.addToken(req.user.id, tokenData)

  const token = await db.getTokenById(req.user.id, tokenId)

  res.status(201).json({
    message: 'Token added successfully',
    token
  })
}))

/**
 * PUT /api/tokens/bulk/category
 * Bulk update category
 */
router.put('/bulk/category', authenticate, asyncHandler(async (req, res) => {
  const tokenIds = normalizeTokenIds(req.body.tokenIds)
  const category = normalizeCategory(req.body.category)

  const db = await getDatabase()
  await db.bulkUpdateCategory(req.user.id, tokenIds, category)

  res.json({
    message: `${tokenIds.length} tokens updated successfully`,
    count: tokenIds.length
  })
}))

/**
 * PUT /api/tokens/:id
 * Update a token
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const tokenData = normalizeTokenInput(req.body, { partial: true })

  const db = await getDatabase()

  // Check if token exists
  const existingToken = await db.getTokenById(req.user.id, req.params.id)
  if (!existingToken) {
    return res.status(404).json({ error: 'Token not found' })
  }

  // Update token
  await db.updateToken(req.user.id, req.params.id, tokenData)

  const updatedToken = await db.getTokenById(req.user.id, req.params.id)

  res.json({
    message: 'Token updated successfully',
    token: updatedToken
  })
}))

/**
 * DELETE /api/tokens/:id
 * Delete a token
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()

  // Check if token exists
  const token = await db.getTokenById(req.user.id, req.params.id)
  if (!token) {
    return res.status(404).json({ error: 'Token not found' })
  }

  await db.deleteToken(req.user.id, req.params.id)

  res.json({ message: 'Token deleted successfully' })
}))

/**
 * DELETE /api/tokens
 * Delete all tokens
 */
router.delete('/', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()
  await db.deleteAllTokens(req.user.id)

  res.json({ message: 'All tokens deleted successfully' })
}))

/**
 * POST /api/tokens/:id/use
 * Record token usage (for statistics)
 */
router.post('/:id/use', authenticate, asyncHandler(async (req, res) => {
  const db = await getDatabase()

  // Check if token exists
  const token = await db.getTokenById(req.user.id, req.params.id)
  if (!token) {
    return res.status(404).json({ error: 'Token not found' })
  }

  await db.updateTokenStats(req.user.id, req.params.id)

  res.json({ message: 'Token usage recorded' })
}))

/**
 * POST /api/tokens/bulk
 * Bulk add tokens (import)
 */
router.post('/bulk', authenticate, asyncHandler(async (req, res) => {
  const { tokens } = req.body

  if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > 1000) {
    return res.status(400).json({ error: 'Tokens must be a non-empty array of at most 1000 items' })
  }
  const normalizedTokens = tokens.map(token => normalizeTokenInput(token))

  const db = await getDatabase()
  const count = await db.bulkAddTokens(req.user.id, normalizedTokens)

  res.status(201).json({
    message: `${count} tokens imported successfully`,
    count
  })
}))

export default router
