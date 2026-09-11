# Token Vault 生产部署

生产 Compose 栈包含 Nginx 前端和 Node.js API，使用绑定到宿主机的 SQLite 数据文件。后端端口不对外发布，浏览器只通过同源 `/api` 访问。

## 前置条件

- Linux 主机
- Docker Engine 24+ 和 Docker Compose v2
- 一个已配置 DNS 的域名
- 位于应用前方的 HTTPS 反向代理或负载均衡器

仓库内 Nginx 监听 HTTP 80。生产环境必须由上游代理终止 TLS，并将流量转发到 `${HTTP_PORT:-80}`；不要直接把 HTTP 服务暴露到公网。

## 配置

```bash
cp .env.production.example .env.production
```

必需值：

| 变量 | 要求 |
| --- | --- |
| `JWT_SECRET` | 唯一值，至少 32 字符 |
| `DATA_ENCRYPTION_KEY` | 32 随机字节，编码为 64 位十六进制；永久保管 |
| `CORS_ORIGIN` | 对外 HTTPS Origin，例如 `https://vault.example.com` |

可选值：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HTTP_PORT` | `80` | 宿主机仅供上游代理访问的端口 |
| `VITE_API_URL` | `/api` | 建议保持同源路径 |
| `JWT_EXPIRES_IN` | `24h` | 登录令牌有效期 |
| `BCRYPT_ROUNDS` | `12` | 生产允许 12 至 15 |
| `PUID` / `PGID` | 当前部署用户 | SQLite bind mount 的文件身份，脚本会自动设置 |

生成随机值：

```bash
openssl rand -hex 32  # DATA_ENCRYPTION_KEY
openssl rand -hex 48  # JWT_SECRET
```

`.env.production` 已被 Git 忽略。不要提交、打印或放入数据库备份中。

## 部署

```bash
chmod +x deploy.sh quick-start.sh backup.sh restore.sh
./deploy.sh
```

脚本会验证密钥、Compose 配置、构建镜像、启动服务，并通过前端代理检查 `http://127.0.0.1:${HTTP_PORT:-80}/health`。
脚本还会创建 `backend/data`，并让后端容器使用当前部署用户的 UID/GID，避免 Linux bind mount 权限问题。后续备份和恢复应使用同一系统用户执行。

常用命令：

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml down
```

`quick-start.sh` 使用构建缓存快速启动，但仍会执行 Compose 配置校验。

## HTTPS 代理

上游代理必须：

- 为公开域名提供有效 TLS 证书
- 将请求转发到宿主机 `HTTP_PORT`
- 传递 `Host`、`X-Forwarded-For` 和 `X-Forwarded-Proto`
- 仅允许受信网络访问宿主机 HTTP 端口
- 不单独暴露容器后端 3000 端口

部署后检查：

```bash
curl --fail https://vault.example.com/health
curl --fail https://vault.example.com/manifest.json
```

还应在浏览器中验证注册、登录、添加、编辑、删除、退出、重新登录和离线启动。

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

数据库中的 TOTP secret 由 `DATA_ENCRYPTION_KEY` 加密。必须把该密钥单独保存到密码管理器或密钥管理服务，并验证能同时取回数据库与密钥。丢失或更换密钥后，已有 secret 无法解密。

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

若更新失败，恢复旧代码/镜像，再按需执行 `restore.sh`。不要在未确认备份和密钥可用时删除 `backend/data` 或 Compose volume。

## 上线检查

- `docker compose ... ps` 中前后端均为 healthy
- 公开地址只使用 HTTPS，HTTP 自动跳转 HTTPS
- 后端 3000 端口无法从公网访问
- `.env.production` 权限受限且不在版本控制中
- 数据库备份与 `DATA_ENCRYPTION_KEY` 分开存放
- 已实测恢复、登录限流、CORS 和删除流程
- 已设定容器日志轮换、磁盘监控、系统补丁和依赖更新流程
