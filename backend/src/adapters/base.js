/* eslint-disable no-unused-vars -- method parameters document the adapter contract */

/**
 * Base Storage Adapter Interface
 * All database adapters must implement these methods
 */
export class StorageAdapter {
  constructor(config) {
    this.config = config
    this.connected = false
  }

  // Connection Management
  async connect() {
    throw new Error('connect() must be implemented by subclass')
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass')
  }

  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass')
  }

  // User Management
  async createUser(userData) {
    throw new Error('createUser() must be implemented by subclass')
  }

  async getUserByEmail(email) {
    throw new Error('getUserByEmail() must be implemented by subclass')
  }

  async getUserById(id) {
    throw new Error('getUserById() must be implemented by subclass')
  }

  async updateUser(id, userData) {
    throw new Error('updateUser() must be implemented by subclass')
  }

  async deleteUser(id) {
    throw new Error('deleteUser() must be implemented by subclass')
  }

  // Token Management
  async addToken(userId, tokenData) {
    throw new Error('addToken() must be implemented by subclass')
  }

  async getAllTokens(userId) {
    throw new Error('getAllTokens() must be implemented by subclass')
  }

  async getTokenById(userId, tokenId) {
    throw new Error('getTokenById() must be implemented by subclass')
  }

  async updateToken(userId, tokenId, tokenData) {
    throw new Error('updateToken() must be implemented by subclass')
  }

  async deleteToken(userId, tokenId) {
    throw new Error('deleteToken() must be implemented by subclass')
  }

  async deleteAllTokens(userId) {
    throw new Error('deleteAllTokens() must be implemented by subclass')
  }

  async searchTokens(userId, query) {
    throw new Error('searchTokens() must be implemented by subclass')
  }

  async getTokensByCategory(userId, category) {
    throw new Error('getTokensByCategory() must be implemented by subclass')
  }

  // Statistics
  async updateTokenStats(userId, tokenId) {
    throw new Error('updateTokenStats() must be implemented by subclass')
  }

  async getTokenStats(userId, tokenId) {
    throw new Error('getTokenStats() must be implemented by subclass')
  }

  async getUserStats(userId) {
    throw new Error('getUserStats() must be implemented by subclass')
  }

  // Batch Operations
  async bulkAddTokens(userId, tokens) {
    throw new Error('bulkAddTokens() must be implemented by subclass')
  }

  async bulkDeleteTokens(userId, tokenIds) {
    throw new Error('bulkDeleteTokens() must be implemented by subclass')
  }

  async bulkUpdateCategory(userId, tokenIds, category) {
    throw new Error('bulkUpdateCategory() must be implemented by subclass')
  }
}
