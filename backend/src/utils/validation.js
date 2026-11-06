const ALGORITHMS = new Set(['SHA1', 'SHA256', 'SHA512'])
const DIGITS = new Set([6, 7, 8])
const CATEGORIES = new Set([
  'work', 'personal', 'finance', 'social', 'dev', 'gaming', 'other'
])

export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
  }
}

function requiredString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required`)
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`)
  }
  return normalized
}

export function normalizeEmail(value) {
  const email = requiredString(value, 'Email', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Email is invalid')
  }
  return email
}

export function validateAccountPassword(password, field = 'Password') {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new ValidationError(`${field} must be between 12 and 128 characters`)
  }
  return password
}

export function normalizeDisplayName(value) {
  if (value === undefined || value === null || value === '') return null
  return requiredString(value, 'Name', 100)
}

export function normalizeTokenInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Token payload is invalid')
  }

  const result = {}
  const assignString = (field, label, maxLength) => {
    if (!partial || input[field] !== undefined) {
      result[field] = requiredString(input[field], label, maxLength)
    }
  }

  assignString('issuer', 'Issuer', 255)
  assignString('account', 'Account', 255)

  if (!partial || input.secret !== undefined) {
    // v1.5.0 — end-to-end encrypted sync: the sync API accepts ONLY an
    // opaque tv3: envelope produced by the client (PBKDF2 + AES-256-GCM,
    // see src/utils/syncCrypto.js). Plaintext Base32 secrets are rejected
    // here so the server can never receive a usable TOTP secret.
    // A single encrypted secret is a few hundred characters; 2048 leaves
    // ample headroom without allowing unbounded payloads.
    const secret = requiredString(input.secret, 'Secret', 2048)
    if (!secret.startsWith('tv3:')) {
      throw new ValidationError('Secret must be a tv3: encrypted envelope')
    }
    result.secret = secret
  }

  if (!partial || input.algorithm !== undefined) {
    const algorithm = String(input.algorithm || 'SHA1').toUpperCase()
    if (!ALGORITHMS.has(algorithm)) throw new ValidationError('Algorithm is invalid')
    result.algorithm = algorithm
  }

  if (!partial || input.digits !== undefined) {
    const digits = Number(input.digits ?? 6)
    if (!DIGITS.has(digits)) throw new ValidationError('Digits must be 6, 7, or 8')
    result.digits = digits
  }

  if (!partial || input.period !== undefined) {
    const period = Number(input.period ?? 30)
    if (!Number.isInteger(period) || period < 15 || period > 120) {
      throw new ValidationError('Period must be an integer between 15 and 120')
    }
    result.period = period
  }

  if (!partial || input.category !== undefined) {
    const category = String(input.category || 'personal')
    if (!CATEGORIES.has(category)) throw new ValidationError('Category is invalid')
    result.category = category
  }

  return result
}

export function normalizeTokenIds(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1000) {
    throw new ValidationError('Token IDs must be a non-empty array of at most 1000 items')
  }
  return [...new Set(value.map(id => {
    const normalized = Number(id)
    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new ValidationError('Token IDs must be positive integers')
    }
    return normalized
  }))]
}

export function normalizeCategory(value) {
  const category = String(value || '')
  if (!CATEGORIES.has(category)) throw new ValidationError('Category is invalid')
  return category
}
