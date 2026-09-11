import mysql from 'mysql2/promise'
import { StorageAdapter } from './base.js'
import { SecretCipher } from '../utils/secretCipher.js'

export class MySQLAdapter extends StorageAdapter {
  constructor(config) {
    super(config)
    this.pool = null
    this.secretCipher = new SecretCipher(config.encryptionKey)
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      })

      this.connected = true

      // Initialize schema
      await this.initSchema()
      await this.migratePlaintextSecrets()

      console.log('✅ MySQL connected:', this.config.host)
    } catch (error) {
      console.error('❌ MySQL connection failed:', error)
      throw error
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end()
      this.connected = false
      console.log('✅ MySQL disconnected')
    }
  }

  async healthCheck() {
    try {
      const [rows] = await this.pool.query('SELECT 1 as health')
      return { healthy: rows[0].health === 1, database: 'mysql' }
    } catch (error) {
      return { healthy: false, database: 'mysql', error: error.message }
    }
  }

  async initSchema() {
    const connection = await this.pool.getConnection()

    try {
      // Users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255),
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      // Tokens table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          issuer VARCHAR(255) NOT NULL,
          account VARCHAR(255) NOT NULL,
          secret TEXT NOT NULL,
          algorithm VARCHAR(10) DEFAULT 'SHA1',
          digits INT DEFAULT 6,
          period INT DEFAULT 30,
          category VARCHAR(50) DEFAULT 'personal',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          last_used BIGINT,
          use_count INT DEFAULT 0,
          INDEX idx_user_id (user_id),
          INDEX idx_category (category),
          INDEX idx_issuer (issuer),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)

      console.log('✅ MySQL schema initialized')
    } finally {
      connection.release()
    }
  }

  async migratePlaintextSecrets() {
    const connection = await this.pool.getConnection()
    try {
      const [tokens] = await connection.query('SELECT id, secret FROM tokens')
      const plaintextTokens = tokens.filter(token => !this.secretCipher.isEncrypted(token.secret))
      if (plaintextTokens.length === 0) return

      await connection.beginTransaction()
      for (const token of plaintextTokens) {
        await connection.query(
          'UPDATE tokens SET secret = ?, updated_at = ? WHERE id = ?',
          [this.secretCipher.encrypt(token.secret), Date.now(), token.id]
        )
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // User Management
  async createUser(userData) {
    const [result] = await this.pool.query(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userData.email, userData.passwordHash, userData.name || null, Date.now(), Date.now()]
    )
    return result.insertId
  }

  async getUserByEmail(email) {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE email = ?', [email])
    return rows[0]
  }

  async getUserById(id) {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id])
    return rows[0]
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

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const [result] = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return result
  }

  async deleteUser(id) {
    const [result] = await this.pool.query('DELETE FROM users WHERE id = ?', [id])
    return result
  }

  // Token Management
  async addToken(userId, tokenData) {
    const [result] = await this.pool.query(
      `INSERT INTO tokens (
        user_id, issuer, account, secret, algorithm, digits, period, category,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return result.insertId
  }

  async getAllTokens(userId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM tokens WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    return rows.map(token => this.secretCipher.decryptToken(token))
  }

  async getTokenById(userId, tokenId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM tokens WHERE id = ? AND user_id = ?',
      [tokenId, userId]
    )
    return this.secretCipher.decryptToken(rows[0])
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
      values.push(this.secretCipher.encrypt(tokenData.secret))
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

    const [result] = await this.pool.query(
      `UPDATE tokens SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )
    return result
  }

  async deleteToken(userId, tokenId) {
    const [result] = await this.pool.query(
      'DELETE FROM tokens WHERE id = ? AND user_id = ?',
      [tokenId, userId]
    )
    return result
  }

  async deleteAllTokens(userId) {
    const [result] = await this.pool.query('DELETE FROM tokens WHERE user_id = ?', [userId])
    return result
  }

  async searchTokens(userId, query) {
    const [rows] = await this.pool.query(
      `SELECT * FROM tokens
       WHERE user_id = ? AND (issuer LIKE ? OR account LIKE ?)
       ORDER BY created_at DESC`,
      [userId, `%${query}%`, `%${query}%`]
    )
    return rows.map(token => this.secretCipher.decryptToken(token))
  }

  async getTokensByCategory(userId, category) {
    const [rows] = await this.pool.query(
      'SELECT * FROM tokens WHERE user_id = ? AND category = ? ORDER BY created_at DESC',
      [userId, category]
    )
    return rows.map(token => this.secretCipher.decryptToken(token))
  }

  // Statistics
  async updateTokenStats(userId, tokenId) {
    const [result] = await this.pool.query(
      `UPDATE tokens SET use_count = use_count + 1, last_used = ? WHERE id = ? AND user_id = ?`,
      [Date.now(), tokenId, userId]
    )
    return result
  }

  async getTokenStats(userId, tokenId) {
    const [rows] = await this.pool.query(
      'SELECT use_count, last_used, created_at FROM tokens WHERE id = ? AND user_id = ?',
      [tokenId, userId]
    )
    return rows[0]
  }

  async getUserStats(userId) {
    const [categoryStats] = await this.pool.query(
      `SELECT category, COUNT(*) as count_per_category
       FROM tokens WHERE user_id = ? GROUP BY category`,
      [userId]
    )

    const [total] = await this.pool.query(
      `SELECT COUNT(*) as total_tokens, SUM(use_count) as total_uses FROM tokens WHERE user_id = ?`,
      [userId]
    )

    return {
      totalTokens: total[0].total_tokens || 0,
      totalUses: total[0].total_uses || 0,
      categoryBreakdown: categoryStats
    }
  }

  // Batch Operations
  async bulkAddTokens(userId, tokens) {
    const values = tokens.map(token => [
      userId,
      token.issuer,
      token.account,
      this.secretCipher.encrypt(token.secret),
      token.algorithm || 'SHA1',
      token.digits || 6,
      token.period || 30,
      token.category || 'personal',
      Date.now(),
      Date.now()
    ])

    const [result] = await this.pool.query(
      `INSERT INTO tokens (
        user_id, issuer, account, secret, algorithm, digits, period, category,
        created_at, updated_at
      ) VALUES ?`,
      [values]
    )
    return result.affectedRows
  }

  async bulkDeleteTokens(userId, tokenIds) {
    const placeholders = tokenIds.map(() => '?').join(',')
    const [result] = await this.pool.query(
      `DELETE FROM tokens WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...tokenIds]
    )
    return result
  }

  async bulkUpdateCategory(userId, tokenIds, category) {
    const placeholders = tokenIds.map(() => '?').join(',')
    const [result] = await this.pool.query(
      `UPDATE tokens SET category = ?, updated_at = ? WHERE user_id = ? AND id IN (${placeholders})`,
      [category, Date.now(), userId, ...tokenIds]
    )
    return result
  }
}
