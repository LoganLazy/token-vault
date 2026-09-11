import { StorageAdapter } from './base.js'

/**
 * Memory Storage Adapter (for testing/development)
 * All data stored in memory - lost on restart
 */
export class MemoryAdapter extends StorageAdapter {
  constructor(config) {
    super(config)
    this.users = new Map()
    this.tokens = new Map()
    this.userIdCounter = 1
    this.tokenIdCounter = 1
  }

  async connect() {
    this.connected = true
    console.log('✅ Memory storage connected')
  }

  async disconnect() {
    this.users.clear()
    this.tokens.clear()
    this.connected = false
    console.log('✅ Memory storage disconnected')
  }

  async healthCheck() {
    return { healthy: true, database: 'memory' }
  }

  // User Management
  async createUser(userData) {
    const id = this.userIdCounter++
    const now = Date.now()

    // Check if email exists
    for (const user of this.users.values()) {
      if (user.email === userData.email) {
        throw new Error('User already exists')
      }
    }

    const user = {
      id,
      email: userData.email,
      password_hash: userData.passwordHash,
      name: userData.name || null,
      created_at: now,
      updated_at: now
    }

    this.users.set(id, user)
    return id
  }

  async getUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async getUserById(id) {
    return this.users.get(id) || null
  }

  async updateUser(id, userData) {
    const user = this.users.get(id)
    if (!user) throw new Error('User not found')

    if (userData.name !== undefined) user.name = userData.name
    if (userData.passwordHash !== undefined) user.password_hash = userData.passwordHash
    user.updated_at = Date.now()

    this.users.set(id, user)
  }

  async deleteUser(id) {
    this.users.delete(id)
    // Delete all user's tokens
    for (const [tokenId, token] of this.tokens.entries()) {
      if (token.user_id === id) {
        this.tokens.delete(tokenId)
      }
    }
  }

  // Token Management
  async addToken(userId, tokenData) {
    const id = this.tokenIdCounter++
    const now = Date.now()

    const token = {
      id,
      user_id: userId,
      issuer: tokenData.issuer,
      account: tokenData.account,
      secret: tokenData.secret,
      algorithm: tokenData.algorithm || 'SHA1',
      digits: tokenData.digits || 6,
      period: tokenData.period || 30,
      category: tokenData.category || 'personal',
      created_at: now,
      updated_at: now,
      last_used: null,
      use_count: 0
    }

    this.tokens.set(id, token)
    return id
  }

  async getAllTokens(userId) {
    const tokens = []
    for (const token of this.tokens.values()) {
      if (token.user_id === userId) {
        tokens.push(token)
      }
    }
    return tokens.sort((a, b) => b.created_at - a.created_at)
  }

  async getTokenById(userId, tokenId) {
    const token = this.tokens.get(parseInt(tokenId))
    if (token && token.user_id === userId) {
      return token
    }
    return null
  }

  async updateToken(userId, tokenId, tokenData) {
    const token = this.tokens.get(parseInt(tokenId))
    if (!token || token.user_id !== userId) {
      throw new Error('Token not found')
    }

    if (tokenData.issuer !== undefined) token.issuer = tokenData.issuer
    if (tokenData.account !== undefined) token.account = tokenData.account
    if (tokenData.secret !== undefined) token.secret = tokenData.secret
    if (tokenData.category !== undefined) token.category = tokenData.category
    if (tokenData.algorithm !== undefined) token.algorithm = tokenData.algorithm
    if (tokenData.digits !== undefined) token.digits = tokenData.digits
    if (tokenData.period !== undefined) token.period = tokenData.period
    token.updated_at = Date.now()

    this.tokens.set(parseInt(tokenId), token)
  }

  async deleteToken(userId, tokenId) {
    const token = this.tokens.get(parseInt(tokenId))
    if (token && token.user_id === userId) {
      this.tokens.delete(parseInt(tokenId))
    }
  }

  async deleteAllTokens(userId) {
    for (const [tokenId, token] of this.tokens.entries()) {
      if (token.user_id === userId) {
        this.tokens.delete(tokenId)
      }
    }
  }

  async searchTokens(userId, query) {
    const tokens = []
    const searchLower = query.toLowerCase()

    for (const token of this.tokens.values()) {
      if (token.user_id === userId) {
        if (
          token.issuer.toLowerCase().includes(searchLower) ||
          token.account.toLowerCase().includes(searchLower)
        ) {
          tokens.push(token)
        }
      }
    }
    return tokens.sort((a, b) => b.created_at - a.created_at)
  }

  async getTokensByCategory(userId, category) {
    const tokens = []
    for (const token of this.tokens.values()) {
      if (token.user_id === userId && token.category === category) {
        tokens.push(token)
      }
    }
    return tokens.sort((a, b) => b.created_at - a.created_at)
  }

  // Statistics
  async updateTokenStats(userId, tokenId) {
    const token = this.tokens.get(parseInt(tokenId))
    if (token && token.user_id === userId) {
      token.use_count++
      token.last_used = Date.now()
      this.tokens.set(parseInt(tokenId), token)
    }
  }

  async getTokenStats(userId, tokenId) {
    const token = this.tokens.get(parseInt(tokenId))
    if (token && token.user_id === userId) {
      return {
        use_count: token.use_count,
        last_used: token.last_used,
        created_at: token.created_at
      }
    }
    return null
  }

  async getUserStats(userId) {
    const categoryBreakdown = {}
    let totalTokens = 0
    let totalUses = 0

    for (const token of this.tokens.values()) {
      if (token.user_id === userId) {
        totalTokens++
        totalUses += token.use_count

        if (!categoryBreakdown[token.category]) {
          categoryBreakdown[token.category] = {
            category: token.category,
            count_per_category: 0
          }
        }
        categoryBreakdown[token.category].count_per_category++
      }
    }

    return {
      totalTokens,
      totalUses,
      categoryBreakdown: Object.values(categoryBreakdown)
    }
  }

  // Batch Operations
  async bulkAddTokens(userId, tokens) {
    for (const tokenData of tokens) {
      await this.addToken(userId, tokenData)
    }
    return tokens.length
  }

  async bulkDeleteTokens(userId, tokenIds) {
    for (const tokenId of tokenIds) {
      await this.deleteToken(userId, tokenId)
    }
  }

  async bulkUpdateCategory(userId, tokenIds, category) {
    for (const tokenId of tokenIds) {
      const token = this.tokens.get(parseInt(tokenId))
      if (token && token.user_id === userId) {
        token.category = category
        token.updated_at = Date.now()
        this.tokens.set(parseInt(tokenId), token)
      }
    }
  }
}
