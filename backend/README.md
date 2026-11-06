# Token Vault Backend

Token Vault 的自托管同步 API，提供账号认证、TOTP token CRUD、批量操作和使用统计。

## 数据库

支持 SQLite、MySQL 和 PostgreSQL。SQLite 是生产 Compose 的默认配置。

同步是端到端加密的（v1.5.0）：三个适配器都只存储客户端发来的不透明 `tv3:` 信封，不再在服务端加密或解密 secret；`DATA_ENCRYPTION_KEY` 已移除。

## 本地运行

```bash
npm install
cp .env.example .env
npm run dev
```

开发服务器默认监听 `http://localhost:3000`，健康检查为 `/health`。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `development` | 生产环境会启用严格配置校验 |
| `PORT` | `3000` | API 端口 |
| `DB_TYPE` | `sqlite` | `sqlite`、`mysql` 或 `postgresql` |
| `SQLITE_FILENAME` | `./data/totp.db` | SQLite 文件 |
| `JWT_SECRET` | （无，必须设置） | 至少 32 字符；除 `NODE_ENV=test` 外无回退 |
| `JWT_EXPIRES_IN` | `12h` | JWT 有效期 |
| `REGISTRATION_ENABLED` | `false` | 注册默认关闭 |
| `REGISTRATION_INVITE_CODE` | （空） | 关闭注册时的邀请码 |
| `BCRYPT_ROUNDS` | `12` | 生产允许 12 至 15 |
| `CORS_ORIGIN` | `http://localhost:5173` | 逗号分隔；生产仅允许 HTTPS |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 全局 API 限流窗口 |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | 每个窗口的请求上限 |

MySQL 使用 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。PostgreSQL 使用相应的 `PG_*` 变量。

## API

认证：

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
DELETE /api/auth/me
PUT    /api/auth/password
```

Token：

```text
GET    /api/tokens
POST   /api/tokens
GET    /api/tokens/:id
PUT    /api/tokens/:id
DELETE /api/tokens/:id
POST   /api/tokens/bulk
DELETE /api/tokens/bulk
PUT    /api/tokens/bulk/category
```

统计：

```text
GET /api/stats
GET /api/stats/token/:id
```

所有 token 和统计接口都要求 `Authorization: Bearer <token>`。注册密码必须为 12 至 128 位；TOTP secret 必须是客户端加密后的 `tv3:` 信封，明文 Base32 会被拒绝；批量请求最多 1000 条。改密码和退出登录会吊销该用户全部已发 JWT。

## 测试

```bash
npm test
npm audit --audit-level=moderate
```

## 生产

使用仓库根目录的 `docker-compose.production.yml` 和 [DEPLOYMENT.md](../DEPLOYMENT.md)。不要单独公开 3000 端口。
