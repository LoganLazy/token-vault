/**
 * API Client for Token Vault Backend
 * Handles authentication and token management API calls
 */

const API_URL = import.meta.env?.VITE_API_URL || '/api'

class APIClient {
  constructor() {
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken() {
    return this.token
  }

  isAuthenticated() {
    return !!this.token
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // ==================== Auth API ====================

  async register(email, password, name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    })
    this.setToken(data.token)
    return data
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    this.setToken(data.token)
    return data
  }

  async logout() {
    this.setToken(null)
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    })
  }

  // ==================== Tokens API ====================

  async getTokens() {
    return this.request('/tokens')
  }

  async addToken(tokenData) {
    return this.request('/tokens', {
      method: 'POST',
      body: JSON.stringify(tokenData)
    })
  }

  async updateToken(id, tokenData) {
    return this.request(`/tokens/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tokenData)
    })
  }

  async deleteToken(id) {
    return this.request(`/tokens/${id}`, {
      method: 'DELETE'
    })
  }

  async bulkImport(tokens) {
    return this.request('/tokens/bulk', {
      method: 'POST',
      body: JSON.stringify({ tokens })
    })
  }

  async bulkDelete(tokenIds) {
    return this.request('/tokens/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ tokenIds })
    })
  }

  async bulkUpdateCategory(tokenIds, category) {
    return this.request('/tokens/bulk/category', {
      method: 'PUT',
      body: JSON.stringify({ tokenIds, category })
    })
  }

  async searchTokens(query) {
    return this.request(`/tokens/search/${encodeURIComponent(query)}`)
  }

  async getTokensByCategory(category) {
    return this.request(`/tokens/category/${category}`)
  }

  async recordTokenUse(id) {
    return this.request(`/tokens/${id}/use`, {
      method: 'POST'
    })
  }

  // ==================== Stats API ====================

  async getStats() {
    return this.request('/stats')
  }

  async getTokenStats(id) {
    return this.request(`/stats/token/${id}`)
  }
}

export const api = new APIClient()
