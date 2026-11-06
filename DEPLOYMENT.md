# Token Vault 生产部署 (v1.5.0)

生产 Compose 栈包含 Caddy 反向代理、Nginx 前端和 Node.js API，使用绑定到宿主机的 SQLite 数据文件。**只有 Caddy 对外发布端口（80/443）**：它为 `${DOMAIN}` 自动申请 Let's Encrypt 证书并强制 HTTPS；前端和后端只在内部网络可达，浏览器只通过同源 `/api` 访问后端。

> 破坏性变更：1.5.0 要求全新数据库。同步改为端到端加密，旧库里的 secret 无法迁移——升级前请每位用户先在旧版本里导出加密备份，部署 1.5.0 后再导入。

## 前置条件

- Linux 主机，Docker Engine 24+ 和 Docker Compose v2
- 一个真实域名，DNS 已指向这台服务器（Caddy 需要它完成 HTTP-01 验证）
- 服务器 80/443 端口可从公网访问（仅 Caddy）

## 配置

```bash
cp .env.production.example .env.production
```

必需值：

| 变量 | 要求 |
| --- | --- |
| `DOMAIN` | 公开域名，例如 `vault.example.com` |
| `CORS_ORIGIN` | 必须等于 `https://<DOMAIN>` |
| `JWT_SECRET` | 唯一随机值，至少 32 字符 |

可选值：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `JWT_EXPIRES_IN` | `12h` | 登录令牌有效期；改密码 / 退出登录会立即吊销旧 token |
| `REGISTRATION_ENABLED` | `false` | 注册默认关闭 |
| `REGISTRATION_INVITE_CODE` | （空） | 关闭注册时，注册需提供此邀请码；不设则无人能注册 |
| `BCRYPT_ROUNDS` | `12` | 生产允许 12 至 15 |
| `VITE_API_URL` | `/api` | 建议保持同源路径 |
| `PUID` / `PGID` | 当前部署用户 | SQLite bind mount 的文件身份，脚本会自动设置 |

生成随机值：

```bash
openssl rand -hex 48  # JWT_SECRET
openssl rand -hex 32  # REGISTRATION_INVITE_CODE（邀请码，用强随机值）
```

`.env.production` 已被 Git 忽略。不要提交、打印或放入数据库备份中。**1.5.0 已移除 `DATA_ENCRYPTION_KEY`**：secret 在客户端用各用户自己的主密码加密，服务端无法解密，也没有任何服务端密钥需要保管或轮换。

## 部署

```bash
chmod +x deploy.sh quick-start.sh backup.sh restore.sh
./deploy.sh
```

脚本会校验域名、JWT、CORS 和注册配置，验证 Compose 配置，构建镜像、启动服务，并在容器内检查后端 `/health` 和前端健康状态。脚本还会创建 `backend/data`，并让后端容器使用当前部署用户的 UID/GID，避免 Linux bind mount 权限问题。后续备份和恢复应使用同一系统用户执行。

常用命令：

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml down
```

`quick-start.sh` 使用构建缓存快速启动，同样会校验必需配置。

## 首次使用流程

1. 管理员把邀请码私下发给每位用户（5–10 人）。
2. 用户打开 `https://<DOMAIN>`，用邀请码注册账号（密码至少 12 位）。
3. **注册后先在设置里创建主密码**——没有主密码无法启用同步；同步数据用主密码端到端加密，主密码忘记后云端和本地加密数据都无法恢复。
4. 登录后即可添加账号并同步；换设备时用同一账号登录 + 同一主密码解锁即可拉取云端数据。

## HTTPS

Caddy 自动处理：

- 为 `${DOMAIN}` 申请并续期 Let's Encrypt 证书
- HTTP 自动跳转 HTTPS，设置 HSTS
- 只把 80/443 暴露给公网；后端 3000 端口和前端 80 端口不对外发布

部署后检查：

```bash
curl --fail https://vault.example.com/health
curl --fail https://vault.example.com/manifest.json
```

还应在浏览器中验证注册（无邀请码应被拒绝）、登录、添加、编辑、删除、退出后旧 token 失效、重新登录和离线启动。

## SQLite 数据

数据库位于：

```text
backend/data/totp.db
```

容器中的 sql.js 会以原子替换方式写入该文件。不要在后端运行时直接复制文件；使用仓库脚本创建一致快照：

```bash
./backup.sh
```

备份保存为 `backups/token-vault-YYYYMMDD_HHMMSS.db.gz`，默认保留 30 天。若系统存在 `sha256sum`，脚本同时生成校验文件。

数据库里的 TOTP secret 是各用户主密码加密后的 `tv3:` 信封，服务端和备份文件里都没有明文。**恢复数据库不能恢复忘记的主密码**：请每位用户各自保管好自己的主密码，并定期验证加密备份能导入。

恢复：

```bash
./restore.sh backups/token-vault-YYYYMMDD_HHMMSS.db.gz
```

恢复脚本要求输入 `RESTORE`，验证 SQLite 文件头，停止后端，自动创建恢复前快照，替换数据库，再启动并检查健康状态。

## 更新与回滚

更新前先运行 `./backup.sh` 并保存当前镜像标签或源码版本，然后：

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

若更新失败，恢复旧代码/镜像，再按需执行 `restore.sh`。不要在未确认备份可用时删除 `backend/data` 或 Compose volume。

## 上线检查

- `docker compose ... ps` 中 Caddy、前端、后端均为 healthy
- 公开地址只使用 HTTPS，HTTP 自动跳转 HTTPS
- 后端 3000 端口和前端 80 端口无法从公网访问
- `.env.production` 权限受限且不在版本控制中
- 已实测恢复、登录限流、CORS、邀请码注册、退出吊销和删除账号流程
- 已设定容器日志轮换、磁盘监控、系统补丁和依赖更新流程
