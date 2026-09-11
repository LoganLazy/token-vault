import { config } from '../config/index.js'
import { MemoryAdapter } from './memory.js'
import { MySQLAdapter } from './mysql.js'
import { PostgreSQLAdapter } from './postgresql.js'
import { SQLiteAdapter } from './sqlite.js'

/**
 * Database Factory - Creates the appropriate database adapter based on configuration
 */
export class DatabaseFactory {
  static createAdapter() {
    const dbType = config.database.type.toLowerCase()

    if (!['sqlite', 'memory', 'mysql', 'postgresql', 'postgres'].includes(dbType)) {
      throw new Error(`Unsupported database type: ${dbType}`)
    }

    switch (dbType) {
      case 'sqlite':
        return new SQLiteAdapter({
          ...config.database.sqlite,
          encryptionKey: config.dataEncryptionKey
        })

      case 'memory':
        return new MemoryAdapter(config.database)

      case 'mysql':
        return new MySQLAdapter({
          ...config.database.mysql,
          encryptionKey: config.dataEncryptionKey
        })

      case 'postgresql':
      case 'postgres':
        return new PostgreSQLAdapter({
          ...config.database.postgres,
          encryptionKey: config.dataEncryptionKey
        })

      default:
        // Default to memory if type is invalid
        console.warn(`⚠️  Unknown database type: ${dbType}, using memory storage`)
        return new MemoryAdapter(config.database)
    }
  }
}

// Singleton instance
let dbInstance = null

export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = DatabaseFactory.createAdapter()
    await dbInstance.connect()
  }
  return dbInstance
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.disconnect()
    dbInstance = null
  }
}
