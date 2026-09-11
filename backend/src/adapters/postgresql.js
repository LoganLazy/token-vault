import pg from 'pg'
import { StorageAdapter } from './base.js'
import { SecretCipher } from '../utils/secretCipher.js'

const { Pool } = pg

export class PostgreSQLAdapter extends StorageAdapter {
  constructor(config) {
    super(config)
    this.pool = null
    this.secretCipher = new SecretCipher(config.encryptionKey)
  }

  async connect() {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })

      this.connected = true

      // Initialize schema
      await this.initSchema()
      await this.migratePlaintextSecrets()

      console.log('✅ PostgreSQL connected:', this.config.host)
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      this.connected = false
      console.log('✅ PostgreSQL disconnected')
    }
  }

  async healthCheck() {
    try {
      const result = await this.pool.query('SELECT 1 as health')
      return { healthy: result.rows[0].health === 1, database: 'postgresql' }
    } catch (error) {
      return { healthy: false, database: 'postgresql', error: error.message }
    }
  }

  async initSchema() {
    const client = await this.pool.connect()

    try {
      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255),
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `)

      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')

      // Tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          issuer VARCHAR(255) NOT NULL,
          account VARCHAR(255) NOT NULL,
          secret TEXT NOT NULL,
          algorithm VARCHAR(10) DEFAULT 'SHA1',
          digits INTEGER DEFAULT 6,
          period INTEGER DEFAULT 30,
          category VARCHAR(50) DEFAULT 'personal',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          last_used BIGINT,
          use_count INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)

      await client.query('CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id)')
      await client.query('CREATE INDEX IF NOT EXISTS idx_tokens_category ON tokens(category)')
      await client.query('CREATE INDEX IF NOT EXISTS idx_tokens_issuer ON tokens(issuer)')

      console.log('✅ PostgreSQL schema initialized')
    } finally {
      client.release()
    }
  }

  async migratePlaintextSecrets() {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT id, secret FROM tokens')
      const plaintextTokens = result.rows.filter(token => !this.secretCipher.isEncrypted(token.secret))
      if (plaintextTokens.length === 0) return

      await client.query('BEGIN')
      for (const token of plaintextTokens) {
        await client.query(
          'UPDATE tokens SET secret = $1, updated_at = $2 WHERE id = $3',
          [this.secretCipher.encrypt(token.secret), Date.now(), token.id]
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // User Management
  async createUser(userData) {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userData.email, userData.passwordHash, userData.name || null, Date.now(), Date.now()]
    )
    return result.rows[0].id
  }

  async getUserByEmail(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email])
    return result.rows[0]
  }

  async getUserById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id])
    return result.rows[0]
  }

  async updateUser(id, userData) {
    const fields = []
    const values = []
    let paramIndex = 1

    if (userData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(userData.name)
    }
    if (userData.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`)
      values.push(userData.passwordHash)
    }

    fields.push(`updated_at = $${paramIndex++}`)
    values.push(Date.now())
    values.push(id)

    const result = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
    return result
  }

  async deleteUser(id) {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1', [id])
    return result
  }

  // Token Management
  async addToken(userId, tokenData) {
    const result = await this.pool.query(
      `INSERT INTO tokens (
        user_id, issuer, account, secret, algorithm, digits, period, category,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        userId,
        tokenData.issuer,
        tokenData.account,
        this.secretCipher.encrypt(tokenData.secret),
        tokenData.algorithm || 'SHA1',
        tokenData.digits || 6,
        tokenData.period || 30,
        tokenData.category || 'personal',
        Date.now(),
        Date.now()
      ]
    )
    return result.rows[0].id
  }

  async getAllTokens(userId) {
    const result = await this.pool.query(
      'SELECT * FROM tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows.map(token => this.secretCipher.decryptToken(token))
  }

  async getTokenById(userId, tokenId) {
    const result = await this.pool.query(
      'SELECT * FROM tokens WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    )
    return this.secretCipher.decryptToken(result.rows[0])
  }

  async updateToken(userId, tokenId, tokenData) {
    const fields = []
    const values = []
    let paramIndex = 1

    if (tokenData.issuer !== undefined) {
      fields.push(`issuer = $${paramIndex++}`)
      values.push(tokenData.issuer)
    }
    if (tokenData.account !== undefined) {
      fields.push(`account = $${paramIndex++}`)
      values.push(tokenData.account)
    }
    if (tokenData.secret !== undefined) {
      fields.push(`secret = $${paramIndex++}`)
      values.push(this.secretCipher.encrypt(tokenData.secret))
    }
    if (tokenData.category !== undefined) {
      fields.push(`category = $${paramIndex++}`)
      values.push(tokenData.category)
    }
    if (tokenData.algorithm !== undefined) {
      fields.push(`algorithm = $${paramIndex++}`)
      values.push(tokenData.algorithm)
    }
    if (tokenData.digits !== undefined) {
      fields.push(`digits = $${paramIndex++}`)
      values.push(tokenData.digits)
    }
    if (tokenData.period !== undefined) {
      fields.push(`period = $${paramIndex++}`)
      values.push(tokenData.period)
    }

    fields.push(`updated_at = $${paramIndex++}`)
    values.push(Date.now())
    values.push(tokenId)
    values.push(userId)

    const result = await this.pool.query(
      `UPDATE tokens SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      values
    )
    return result
  }

  async deleteToken(userId, tokenId) {
    const result = await this.pool.query(
      'DELETE FROM tokens WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    )
    return result
  }

  async deleteAllTokens(userId) {
    const result = await this.pool.query('DELETE FROM tokens WHERE user_id = $1', [userId])
    return result
  }

  async searchTokens(userId, query) {
    const result = await this.pool.query(
      `SELECT * FROM tokens
       WHERE user_id = $1 AND (issuer ILIKE $2 OR account ILIKE $2)
       ORDER BY created_at DESC`,
      [userId, `%${query}%`]
    )
    return result.rows.map(token => this.secretCipher.decryptToken(token))
  }

  async getTokensByCategory(userId, category) {
    const result = await this.pool.query(
      'SELECT * FROM tokens WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC',
      [userId, category]
    )
    return result.rows.map(token => this.secretCipher.decryptToken(token))
  }

  // Statistics
  async updateTokenStats(userId, tokenId) {
    const result = await this.pool.query(
      `UPDATE tokens SET use_count = use_count + 1, last_used = $1 WHERE id = $2 AND user_id = $3`,
      [Date.now(), tokenId, userId]
    )
    return result
  }

  async getTokenStats(userId, tokenId) {
    const result = await this.pool.query(
      'SELECT use_count, last_used, created_at FROM tokens WHERE id = $1 AND user_id = $2',
      [tokenId, userId]
    )
    return result.rows[0]
  }

  async getUserStats(userId) {
    const categoryResult = await this.pool.query(
      `SELECT category, COUNT(*) as count_per_category
       FROM tokens WHERE user_id = $1 GROUP BY category`,
      [userId]
    )

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total_tokens, COALESCE(SUM(use_count), 0) as total_uses
       FROM tokens WHERE user_id = $1`,
      [userId]
    )

    return {
      totalTokens: parseInt(totalResult.rows[0].total_tokens) || 0,
      totalUses: parseInt(totalResult.rows[0].total_uses) || 0,
      categoryBreakdown: categoryResult.rows
    }
  }

  // Batch Operations
  async bulkAddTokens(userId, tokens) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const now = Date.now()
      for (const token of tokens) {
        await client.query(
          `INSERT INTO tokens (
            user_id, issuer, account, secret, algorithm, digits, period, category,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            userId,
            token.issuer,
            token.account,
            this.secretCipher.encrypt(token.secret),
            token.algorithm || 'SHA1',
            token.digits || 6,
            token.period || 30,
            token.category || 'personal',
            now,
            now
          ]
        )
      }

      await client.query('COMMIT')
      return tokens.length
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async bulkDeleteTokens(userId, tokenIds) {
    const placeholders = tokenIds.map((_, i) => `$${i + 2}`).join(',')
    const result = await this.pool.query(
      `DELETE FROM tokens WHERE user_id = $1 AND id IN (${placeholders})`,
      [userId, ...tokenIds]
    )
    return result
  }

  async bulkUpdateCategory(userId, tokenIds, category) {
    const placeholders = tokenIds.map((_, i) => `$${i + 4}`).join(',')
    const result = await this.pool.query(
      `UPDATE tokens SET category = $1, updated_at = $2 WHERE user_id = $3 AND id IN (${placeholders})`,
      [category, Date.now(), userId, ...tokenIds]
    )
    return result
  }
}
