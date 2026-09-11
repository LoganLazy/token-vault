# Token Vault Backend

Token Vault 的自托管同步 API，提供账号认证、TOTP token CRUD、批量操作和使用统计。

## 数据库

支持 SQLite、MySQL 和 PostgreSQL。SQLite 是生产 Compose 的默认配置。三个持久化适配器都会使用 AES-256-GCM 加密数据库中的 TOTP secret，并在启动时迁移历史明文值。

同步不是端到端加密：API 进程持有数据加密密钥，并会为已认证客户端解密 secret。

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
| `JWT_SECRET` | 仅开发回退值 | 生产至少 32 字符 |
| `JWT_EXPIRES_IN` | `24h` | JWT 有效期 |
| `DATA_ENCRYPTION_KEY` | 仅开发回退值 | 生产必须是 64 位十六进制 |
| `BCRYPT_ROUNDS` | `12` | 生产允许 12 至 15 |
| `CORS_ORIGIN` | `http://localhost:5173` | 逗号分隔；生产仅允许 HTTPS |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 全局 API 限流窗口 |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | 每个窗口的请求上限 |

MySQL 使用 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。PostgreSQL 使用相应的 `PG_*` 变量。

## API

认证：

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/password
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

所有 token 和统计接口都要求 `Authorization: Bearer <token>`。注册密码必须为 12 至 128 位；TOTP secret 必须是有效 Base32；批量请求最多 1000 条。

## 测试

```bash
npm test
npm audit --audit-level=moderate
```

## 生产

使用仓库根目录的 `docker-compose.production.yml` 和 [DEPLOYMENT.md](../DEPLOYMENT.md)。不要单独公开 3000 端口，也不要在没有固定 `DATA_ENCRYPTION_KEY` 的情况下启动生产数据库。
