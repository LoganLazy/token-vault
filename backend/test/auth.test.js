import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

// Each test file runs in its own process, so these env vars apply to the
// config module imported below.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-vault-auth-'))
process.env.NODE_ENV = 'test'
process.env.DB_TYPE = 'sqlite'
process.env.SQLITE_FILENAME = path.join(directory, 'vault.db')
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-0123456789'
process.env.JWT_EXPIRES_IN = '12h'
// Registration closed by default; only the invite code opens it.
process.env.REGISTRATION_ENABLED = 'false'
process.env.REGISTRATION_INVITE_CODE = 'invite-code-for-tests'

const { app } = await import('../src/index.js')
const { closeDatabase } = await import('../src/adapters/index.js')

const server = app.listen(0, '127.0.0.1')
await new Promise((resolve, reject) => {
  server.once('listening', resolve)
  server.once('error', reject)
})
const baseUrl = `http://127.0.0.1:${server.address().port}`

test.after(async () => {
  await new Promise(resolve => server.close(resolve))
  await closeDatabase()
  fs.rmSync(directory, { recursive: true, force: true })
})

async function post(pathname, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  return { response, data: await response.json().catch(() => ({})) }
}

async function authed(pathname, token, method = 'GET', body) {
  const headers = { Authorization: `Bearer ${token}` }
  if (body) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  return { response, data: await response.json().catch(() => ({})) }
}

async function register(email, inviteCode) {
  return post('/api/auth/register', {
    email,
    password: 'ReleasePass123',
    name: 'Auth Test',
    inviteCode
  })
}

test('registration is closed without an invite code and opens with one', async () => {
  const closed = await register('closed@example.com')
  assert.equal(closed.response.status, 403)

  const wrong = await register('wrong@example.com', 'not-the-code')
  assert.equal(wrong.response.status, 403)

  const ok = await register('invited@example.com', 'invite-code-for-tests')
  assert.equal(ok.response.status, 201)
  assert.ok(ok.data.token)
})

test('logout revokes all sessions and password change revokes old tokens', async () => {
  const { data: registration } = await register('revoke@example.com', 'invite-code-for-tests')
  const firstToken = registration.token

  const login = await post('/api/auth/login', {
    email: 'revoke@example.com',
    password: 'ReleasePass123'
  })
  assert.equal(login.response.status, 200)
  const secondToken = login.data.token

  // Both tokens work before logout.
  assert.equal((await authed('/api/auth/me', firstToken)).response.status, 200)
  assert.equal((await authed('/api/auth/me', secondToken)).response.status, 200)

  // Logout with the first token revokes both sessions.
  const logout = await post('/api/auth/logout', {}, firstToken)
  assert.equal(logout.response.status, 200)
  assert.equal((await authed('/api/auth/me', firstToken)).response.status, 401)
  assert.equal((await authed('/api/auth/me', secondToken)).response.status, 401)

  // A fresh login works again.
  const relogin = await post('/api/auth/login', {
    email: 'revoke@example.com',
    password: 'ReleasePass123'
  })
  assert.equal(relogin.response.status, 200)
  const thirdToken = relogin.data.token
  assert.equal((await authed('/api/auth/me', thirdToken)).response.status, 200)

  // Changing the password revokes the token used to change it.
  const changed = await authed('/api/auth/password', thirdToken, 'PUT', {
    currentPassword: 'ReleasePass123',
    newPassword: 'NewReleasePass123'
  })
  assert.equal(changed.response.status, 200)
  assert.equal((await authed('/api/auth/me', thirdToken)).response.status, 401)

  const afterChange = await post('/api/auth/login', {
    email: 'revoke@example.com',
    password: 'NewReleasePass123'
  })
  assert.equal(afterChange.response.status, 200)
})

test('account deletion removes the user and their tokens', async () => {
  const { data: registration } = await register('delete@example.com', 'invite-code-for-tests')
  const token = registration.token
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const added = await fetch(`${baseUrl}/api/tokens`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      issuer: 'Example',
      account: 'delete@example.com',
      secret: 'tv3:delete-envelope'
    })
  })
  assert.equal(added.status, 201)

  const deleted = await authed('/api/auth/me', token, 'DELETE')
  assert.equal(deleted.response.status, 200)

  // The token is revoked and the account can no longer log in.
  assert.equal((await authed('/api/auth/me', token)).response.status, 401)
  const login = await post('/api/auth/login', {
    email: 'delete@example.com',
    password: 'ReleasePass123'
  })
  assert.equal(login.response.status, 401)
})
