import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { SQLiteAdapter } from '../src/adapters/sqlite.js'

test('production configuration rejects weak secrets', () => {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', "import('./src/config/index.js')"],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'short',
        DATA_ENCRYPTION_KEY: 'a'.repeat(64)
      }
    }
  )

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /JWT_SECRET must be a unique value/)
})

test('SQLite adapter persists users and tokens across reconnects', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-vault-'))
  const filename = path.join(directory, 'vault.db')
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))

  const firstConnection = new SQLiteAdapter({ filename })
  await firstConnection.connect()

  const userId = await firstConnection.createUser({
    email: 'test@example.com',
    passwordHash: 'hash',
    name: 'Test User'
  })
  const tokenId = await firstConnection.addToken(userId, {
    issuer: 'Example',
    account: 'test@example.com',
    secret: 'JBSWY3DPEHPK3PXP'
  })
  const storedToken = firstConnection._getOne(
    'SELECT secret FROM tokens WHERE id = ?',
    [tokenId]
  )
  assert.notEqual(storedToken.secret, 'JBSWY3DPEHPK3PXP')
  assert.match(storedToken.secret, /^enc:v1:/)

  await firstConnection.disconnect()

  const secondConnection = new SQLiteAdapter({ filename })
  await secondConnection.connect()
  const token = await secondConnection.getTokenById(userId, tokenId)

  assert.equal(token.issuer, 'Example')
  assert.equal(token.account, 'test@example.com')
  assert.equal(token.secret, 'JBSWY3DPEHPK3PXP')

  await secondConnection.updateToken(userId, tokenId, { secret: 'NEWSECRET' })
  assert.equal(
    (await secondConnection.getTokenById(userId, tokenId)).secret,
    'NEWSECRET'
  )

  await secondConnection.deleteUser(userId)
  assert.deepEqual(await secondConnection.getAllTokens(userId), [])
  await secondConnection.disconnect()
})

test('SQLite bulk inserts are committed together', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-vault-'))
  const filename = path.join(directory, 'vault.db')
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))

  const database = new SQLiteAdapter({ filename })
  await database.connect()
  const userId = await database.createUser({
    email: 'bulk@example.com',
    passwordHash: 'hash'
  })

  const count = await database.bulkAddTokens(userId, [
    { issuer: 'One', account: 'one@example.com', secret: 'AAAA' },
    { issuer: 'Two', account: 'two@example.com', secret: 'BBBB' }
  ])

  assert.equal(count, 2)
  const tokens = await database.getAllTokens(userId)
  assert.equal(tokens.length, 2)
  assert.deepEqual(tokens.map(token => token.secret).sort(), ['AAAA', 'BBBB'])
  await database.disconnect()
})

test('SQLite migrates plaintext secrets and rejects the wrong key', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-vault-migration-'))
  const filename = path.join(directory, 'vault.db')
  const encryptionKey = 'a'.repeat(64)
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))

  const legacyDatabase = new SQLiteAdapter({ filename, encryptionKey })
  await legacyDatabase.connect()
  const userId = await legacyDatabase.createUser({
    email: 'legacy@example.com',
    passwordHash: 'hash'
  })
  const now = Date.now()
  legacyDatabase._run(
    `INSERT INTO tokens (
      user_id, issuer, account, secret, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Legacy', 'legacy@example.com', 'PLAINTEXT', now, now]
  )
  await legacyDatabase.disconnect()

  const migratedDatabase = new SQLiteAdapter({ filename, encryptionKey })
  await migratedDatabase.connect()
  assert.equal((await migratedDatabase.getAllTokens(userId))[0].secret, 'PLAINTEXT')
  assert.match(
    migratedDatabase._getOne('SELECT secret FROM tokens').secret,
    /^enc:v1:/
  )
  await migratedDatabase.disconnect()
  assert.equal(
    fs.readFileSync(filename).includes(Buffer.from('PLAINTEXT')),
    false
  )

  const wrongKeyDatabase = new SQLiteAdapter({
    filename,
    encryptionKey: 'b'.repeat(64)
  })
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await assert.rejects(
      wrongKeyDatabase.connect(),
      /verify DATA_ENCRYPTION_KEY/
    )
  } finally {
    console.error = originalConsoleError
  }
})

test('API uses SQLite and routes static token endpoints correctly', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-vault-api-'))
  process.env.DB_TYPE = 'sqlite'
  process.env.SQLITE_FILENAME = path.join(directory, 'vault.db')
  process.env.JWT_SECRET = 'test-secret'
  process.env.DATA_ENCRYPTION_KEY = 'c'.repeat(64)

  const [{ app }, { closeDatabase }] = await Promise.all([
    import('../src/index.js'),
    import('../src/adapters/index.js')
  ])
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await closeDatabase()
    fs.rmSync(directory, { recursive: true, force: true })
  })

  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`
  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'api@example.com',
      password: 'ReleasePass123',
      name: 'API Test'
    })
  })
  assert.equal(registerResponse.status, 201)
  const registration = await registerResponse.json()

  const authHeaders = {
    Authorization: `Bearer ${registration.token}`,
    'Content-Type': 'application/json'
  }
  const addResponse = await fetch(`${baseUrl}/api/tokens`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      issuer: 'Example',
      account: 'api@example.com',
      secret: 'JBSWY3DPEHPK3PXP'
    })
  })
  assert.equal(addResponse.status, 201)
  const added = await addResponse.json()

  const updateResponse = await fetch(`${baseUrl}/api/tokens/${added.token.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ secret: 'UPDATEDSECRET' })
  })
  assert.equal(updateResponse.status, 200)
  assert.equal((await updateResponse.json()).token.secret, 'UPDATEDSECRET')

  const searchResponse = await fetch(`${baseUrl}/api/tokens/search/Example`, {
    headers: authHeaders
  })
  assert.equal(searchResponse.status, 200)
  assert.equal((await searchResponse.json()).count, 1)

  const categoryResponse = await fetch(`${baseUrl}/api/tokens/category/personal`, {
    headers: authHeaders
  })
  assert.equal(categoryResponse.status, 200)
  assert.equal((await categoryResponse.json()).count, 1)

  const bulkCategoryResponse = await fetch(`${baseUrl}/api/tokens/bulk/category`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ tokenIds: [added.token.id], category: 'work' })
  })
  assert.equal(bulkCategoryResponse.status, 200)
  assert.equal((await bulkCategoryResponse.json()).count, 1)

  const workCategoryResponse = await fetch(`${baseUrl}/api/tokens/category/work`, {
    headers: authHeaders
  })
  assert.equal(workCategoryResponse.status, 200)
  assert.equal((await workCategoryResponse.json()).count, 1)

  const deleteResponse = await fetch(`${baseUrl}/api/tokens/bulk`, {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ tokenIds: [added.token.id] })
  })
  assert.equal(deleteResponse.status, 200)
  assert.equal((await deleteResponse.json()).count, 1)
})
