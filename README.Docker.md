# Token Vault Docker 部署指南

## 🐳 快速开始

### 使用 Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

应用将在 http://localhost:8080 运行；可通过 `HTTP_PORT` 环境变量修改宿主机端口。

### 使用 Docker

```bash
# 构建镜像
docker build -t token-vault:1.4.1 .

# 运行容器
docker run -d \
  --name token-vault \
  -p 8080:80 \
  --restart unless-stopped \
  token-vault:1.4.1

# 查看日志
docker logs -f token-vault

# 停止容器
docker stop token-vault

# 删除容器
docker rm token-vault
```

## 🔧 自定义配置

### 修改端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:80"  # 改为你想要的端口
```

### 使用 HTTPS

需要配置反向代理（如 Nginx、Traefik、Caddy）：

```yaml
services:
  token-vault:
    # ... 其他配置
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.token-vault.rule=Host(`vault.example.com`)"
      - "traefik.http.routers.token-vault.tls=true"
      - "traefik.http.routers.token-vault.tls.certresolver=letsencrypt"
```

## 📊 镜像信息

- **基础镜像**: nginx:alpine
- **构建镜像**: node:20-alpine
- **最终大小**: ~40MB（压缩）
- **架构**: amd64, arm64

## 🛡️ 安全性

- ✅ 多阶段构建，最小化镜像大小
- ✅ 仅包含生产依赖
- ✅ 使用精简的 Nginx Alpine 运行时镜像
- ✅ 安全响应头配置
- ✅ Gzip 压缩启用
- ✅ 健康检查配置

## 🔍 故障排查

### 检查容器状态
```bash
docker ps -a | grep token-vault
```

### 查看详细日志
```bash
docker logs --tail 100 token-vault
```

### 进入容器调试
```bash
docker exec -it token-vault sh
```

### 健康检查
```bash
docker inspect --format='{{json .State.Health}}' token-vault
```

## 🚀 生产部署建议

1. **使用反向代理**（Nginx/Caddy/Traefik）处理 SSL
2. **配置防火墙**，只开放必要端口
3. **定期备份**数据（虽然所有数据存储在浏览器本地）
4. **监控容器**健康状态
5. **更新策略**：拉取新镜像前先备份

## 📝 环境要求

- Docker 20.10+
- Docker Compose v2（可选）
- 内存: 最小 128MB
- 磁盘: 最小 100MB
