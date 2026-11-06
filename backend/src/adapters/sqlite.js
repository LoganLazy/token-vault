import initSqlJs from 'sql.js'
import { StorageAdapter } from './base.js'
import fs from 'fs'
import path from 'path'
// v1.5.0: the server stores opaque tv3: envelopes as-is (end-to-end
// encryption on the client). No server-side secret cipher any more.

export class SQLiteAdapter extends StorageAdapter {
  constructor(config) {
    super(config)
    this.db = null
    this.SQL = null
  }

  async connect() {
    try {
      // Ensure data directory exists
      const dir = path.dirname(this.config.filename)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Initialize sql.js
      this.SQL = await initSqlJs()

      // Load existing database or create new one
      if (fs.existsSync(this.config.filename)) {
        const buffer = fs.readFileSync(this.config.filename)
        this.db = new this.SQL.Database(buffer)
      } else {
        this.db = new this.SQL.Database()
      }

      this.connected = true

      // Enforce relational integrity for user/token ownership and cascades.
      this.db.run('PRAGMA foreign_keys = ON')

      // Initialize schema
      await this.initSchema()

      console.log('✅ SQLite connected:', this.config.filename)
    } catch (error) {
      if (this.db) {
        this.db.close()
        this.db = null
      }
      this.connected = false
      console.error('❌ SQLite connection failed:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.db) {
      this.save()
      this.db.close()
      this.connected = false
      console.log('✅ SQLite disconnected')
    }
  }

  save() {
    if (this.db) {
      const data = this.db.export()
      const buffer = Buffer.from(data)
      // Replace the database atomically so an interrupted write cannot leave a
      // partially written vault file behind.
      const temporaryFilename = `${this.config.filename}.tmp`
      fs.writeFileSync(temporaryFilename, buffer)
      fs.renameSync(temporaryFilename, this.config.filename)
      this.db.run('PRAGMA foreign_keys = ON')
    }
  }

  async healthCheck() {
    try {
      const result = this.db.exec('SELECT 1 as health')
      const healthy = result[0]?.values[0]?.[0] === 1
      return { healthy, database: 'sqlite' }
    } catch (error) {
      return { healthy: false, database: 'sqlite', error: error.message }
    }
  }

  initSchema() {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // Safe migration for pre-1.5.0 databases (fresh DB is required for
    // secrets, but existing user rows keep working).
    const userColumns = this._getAll('PRAGMA table_info(users)').map(c => c.name)
    if (!userColumns.includes('token_version')) {
      this.db.run('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0')
    }

    // Tokens table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        issuer TEXT NOT NULL,
        account TEXT NOT NULL,
        secret TEXT NOT NULL,
        algorithm TEXT DEFAULT 'SHA1',
        digits INTEGER DEFAULT 6,
        period INTEGER DEFAULT 30,
        category TEXT DEFAULT 'personal',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used INTEGER,
        use_count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tokens_category ON tokens(category)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_tokens_issuer ON tokens(issuer)`)

    this.save()
    console.log('✅ SQLite schema initialized')
  }

  // Helper to get first row
  _getOne(query, params = []) {
    const result = this.db.exec(query, params)
    if (result.length === 0 || result[0].values.length === 0) return null

    const columns = result[0].columns
    const values = result[0].values[0]
    const row = {}
    columns.forEach((col, idx) => {
      row[col] = values[idx]
    })
    return row
  }

  // Helper to get all rows
  _getAll(query, params = []) {
    const result = this.db.exec(query, params)
    if (result.length === 0) return []

    const columns = result[0].columns
    return result[0].values.map(values => {
      const row = {}
      columns.forEach((col, idx) => {
        row[col] = values[idx]
      })
      return row
    })
  }

  // Helper to run a statement
  _run(query, params = []) {
    this.db.run(query, params)
    this.save()
  }

  _insert(query, params = []) {
    this.db.run(query, params)
    const result = this._getOne('SELECT last_insert_rowid() as id')
    this.save()
    return result.id
  }

  _runTransaction(callback) {
    this.db.run('BEGIN')
    let committed = false
    try {
      callback()
      this.db.run('COMMIT')
      committed = true
      this.save()
    } catch (error) {
      if (!committed) {
        this.db.run('ROLLBACK')
      }
      throw error
    }
  }

  // User Management
  async createUser(userData) {
    const now = Date.now()
    return this._insert(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userData.email, userData.passwordHash, userData.name || null, now, now]
    )

  }

  async getUserByEmail(email) {
    return this._getOne('SELECT * FROM users WHERE email = ?', [email])
  }

  async getUserById(id) {
    return this._getOne('SELECT * FROM users WHERE id = ?', [id])
  }

  async updateUser(id, userData) {
    const fields = []
    const values = []

    if (userData.name !== undefined) {
      fields.push('name = ?')
      values.push(userData.name)
    }
    if (userData.passwordHash !== undefined) {
      fields.push('password_hash = ?')
      values.push(userData.passwordHash)
    }
    if (userData.tokenVersion !== undefined) {
      fields.push('token_version = ?')
      values.push(userData.tokenVersion)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    this._run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  async deleteUser(id) {
    this._run('DELETE FROM users WHERE id = ?', [id])
  }

  // Token Management
  async addToken(userId, tokenData) {
    const now = Date.now()
    return this._insert(
      `INSERT INTO tokens (
        user_id, issuer, account, secret, algorithm, digits, period, category,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tokenData.issuer,
        tokenData.account,
        tokenData.secret,
        tokenData.algorithm || 'SHA1',
        tokenData.digits || 6,
        tokenData.period || 30,
        tokenData.category || 'personal',
        now,
        now
      ]
    )

  }

  async getAllTokens(userId) {
    return this._getAll(
      'SELECT * FROM tokens WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
  }

  async getTokenById(userId, tokenId) {
    return this._getOne(
      'SELECT * FROM tokens WHERE id = ? AND user_id = ?',
      [tokenId, userId]
    )
  }

  async updateToken(userId, tokenId, tokenData) {
    const fields = []
    const values = []

    if (tokenData.issuer !== undefined) {
      fields.push('issuer = ?')
      values.push(tokenData.issuer)
    }
    if (tokenData.account !== undefined) {
      fields.push('account = ?')
      values.push(tokenData.account)
    }
    if (tokenData.secret !== undefined) {
      fields.push('secret = ?')
      values.push(tokenData.secret)
    }
    if (tokenData.category !== undefined) {
      fields.push('category = ?')
      values.push(tokenData.category)
    }
    if (tokenData.algorithm !== undefined) {
      fields.push('algorithm = ?')
      values.push(tokenData.algorithm)
    }
    if (tokenData.digits !== undefined) {
      fields.push('digits = ?')
      values.push(tokenData.digits)
    }
    if (tokenData.period !== undefined) {
      fields.push('period = ?')
      values.push(tokenData.period)
    }

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(tokenId)
    values.push(userId)

    this._run(
      `UPDATE tokens SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )
  }

  async deleteToken(userId, tokenId) {
    this._run('DELETE FROM tokens WHERE id = ? AND user_id = ?', [tokenId, userId])
  }

  async deleteAllTokens(userId) {
    this._run('DELETE FROM tokens WHERE user_id = ?', [userId])
  }

  async searchTokens(userId, query) {
    const searchPattern = `%${query}%`
    return this._getAll(
      `SELECT * FROM tokens
       WHERE user_id = ? AND (issuer LIKE ? OR account LIKE ?)
       ORDER BY created_at DESC`,
      [userId, searchPattern, searchPattern]
    )
  }

  async getTokensByCategory(userId, category) {
    return this._getAll(
      'SELECT * FROM tokens WHERE user_id = ? AND category = ? ORDER BY created_at DESC',
      [userId, category]
    )
  }

  // Statistics
  async updateTokenStats(userId, tokenId) {
    this._run(
      `UPDATE tokens
       SET use_count = use_count + 1, last_used = ?
       WHERE id = ? AND user_id = ?`,
      [Date.now(), tokenId, userId]
    )
  }

  async getTokenStats(userId, tokenId) {
    return this._getOne(
      'SELECT use_count, last_used, created_at FROM tokens WHERE id = ? AND user_id = ?',
      [tokenId, userId]
    )
  }

  async getUserStats(userId) {
    const categoryStats = this._getAll(
      `SELECT
        category,
        COUNT(*) as count_per_category
       FROM tokens
       WHERE user_id = ?
       GROUP BY category`,
      [userId]
    )

    const total = this._getOne(
      `SELECT
        COUNT(*) as total_tokens,
        SUM(use_count) as total_uses
       FROM tokens
       WHERE user_id = ?`,
      [userId]
    ) || { total_tokens: 0, total_uses: 0 }

    return {
      totalTokens: total.total_tokens || 0,
      totalUses: total.total_uses || 0,
      categoryBreakdown: categoryStats
    }
  }

  // Batch Operations
  async bulkAddTokens(userId, tokens) {
    if (!tokens.length) return 0
    const now = Date.now()

    this._runTransaction(() => {
      for (const token of tokens) {
        this.db.run(
        `INSERT INTO tokens (
          user_id, issuer, account, secret, algorithm, digits, period, category,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          token.issuer,
          token.account,
          token.secret,
          token.algorithm || 'SHA1',
          token.digits || 6,
          token.period || 30,
          token.category || 'personal',
          now,
          now
        ]
        )
      }
    })

    return tokens.length
  }

  async bulkDeleteTokens(userId, tokenIds) {
    if (!tokenIds.length) return
    const placeholders = tokenIds.map(() => '?').join(',')
    this._run(
      `DELETE FROM tokens WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...tokenIds]
    )
  }

  async bulkUpdateCategory(userId, tokenIds, category) {
    if (!tokenIds.length) return
    const placeholders = tokenIds.map(() => '?').join(',')
    this._run(
      `UPDATE tokens SET category = ?, updated_at = ?
       WHERE user_id = ? AND id IN (${placeholders})`,
      [category, Date.now(), userId, ...tokenIds]
    )
  }
}
