# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循语义化版本。

## [Unreleased]

## [1.5.0] - 2026-11-06

### 破坏性变更

- **同步改为端到端加密**：每个 TOTP secret 在客户端用用户自己的主密码逐条加密（PBKDF2-SHA256 600,000 次 + AES-256-GCM，`tv3:` 信封），服务端只存储不透明信封，无法解密。**升级需要全新数据库**，旧库的 secret 无法迁移；升级前请每位用户先导出加密备份，部署后重新导入。
- **移除 `DATA_ENCRYPTION_KEY`**：后端不再持有服务端加密密钥，`backend/src/utils/secretCipher.js` 已删除，三个数据库适配器不再在服务端加密/解密 secret。
- **注册默认关闭**：`REGISTRATION_ENABLED` 默认为 `false`；关闭时注册需提供 `REGISTRATION_INVITE_CODE`，不设邀请码则无人能注册。
- 同步 API 只接受 `tv3:` 信封，明文 Base32 secret 会被拒绝（400）。
- JWT 默认有效期由 24 小时改为 12 小时。

### 安全

- JWT 吊销：JWT 携带 `token_version`，改密码和退出登录（新增 `POST /api/auth/logout`）会递增该版本，吊销该用户全部已发 token。
- 新增 `DELETE /api/auth/me` 删除账号及全部云端令牌。
- `JWT_SECRET` 在所有环境都必填（至少 32 字符），除 `NODE_ENV=test` 的测试回退外不再有任何默认值；开发 Compose 也必须显式设置。
- 删除未被使用的实验性 WebAuthn 代码（`src/utils/webauthn.js`，从未验证签名）。
- 移除 `decryptData` 中无认证的 v1 CryptoJS 口令回落；只接受 `tv3:` 和 `tv2:` 信封。
- Logo 只返回白名单 `SERVICE_LOGOS` 里的 URL，不再根据用户输入的 issuer 拼接域名。
- 修复 `npm audit --audit-level=high` 全部高危项：升级 `body-parser` 1.20.9、`brace-expansion` 5.0.12、`compression` 1.8.2、`proxy-addr` 2.0.8、`browserslist` 4.29.5、`nanoid` 3.3.20、`source-map-js` 1.2.2、`vite` 8.3.6（含 `launch-editor`）；剩余审计项均为 moderate。

### 部署

- 新增 Caddy 反向代理：只有 Caddy 对外暴露 80/443，为 `${DOMAIN}` 自动申请 Let's Encrypt 证书并强制 HTTPS；前端和后端只在内部网络可达。
- `deploy.sh` / `quick-start.sh` 校验 `DOMAIN`、`JWT_SECRET`、`CORS_ORIGIN`，健康检查改为容器内检查。

### 修复

- 同步失败不再静默：`syncToBackend` 返回 `{ ok, error }`，应用会弹 toast 提示，本地数据保留。
- 同步删除只在成功加载后端列表后才传播，加载失败时不删除任何云端数据；旧版明文后端数据行会在下次推送时重新加密。
- `addToken` 现在同时设置 `updatedAt`，避免新账号因缺少更新时间而在同步比较中被漏掉。

## [1.4.1] - 2026-08-10

### 安全

- 更新前后端依赖锁文件，修复 PostCSS 和 brace-expansion 的已知安全公告。

### 性能

- 修正 Vite 分包策略，避免首屏预加载统计图表和二维码扫描依赖。

### 工程化

- 增加前后端覆盖率脚本和 GitHub Actions 持续集成检查。
- 修复密文篡改测试偶发未修改有效字节的问题。

## [1.4.0] - 2026-07-20

### 新增

- 可选账号系统和自托管同步 API
- SQLite、MySQL、PostgreSQL 后端适配器
- Google Authenticator 迁移二维码、2FAS、Microsoft Authenticator 和 URI 导入
- 拼音搜索、数据统计、移动端手势和系统主题
- PWA 图标、商店截图、隐私政策及生产 Docker 配置

### 安全

- 本地保险库升级为 PBKDF2-SHA256 600,000 次和 AES-256-GCM
- 后端数据库中的 TOTP secret 使用 AES-256-GCM 加密，并迁移历史明文
- 增加 API 字段校验、请求体上限、限流、严格 CORS 和生产配置校验
- Service Worker 排除 API、授权请求和非 GET 请求
- Nginx 增加 CSP、HSTS、Permissions Policy 和 API 禁止缓存策略
- 修复移除主密码时的数据丢失、初始化覆盖和异步写入竞态

### 修复

- 启动同步改为合并本地与云端数据，避免静默覆盖
- 删除操作使用后端 ID，移除新增时的并发双写
- 下线不能安全恢复加密密钥的实验性 WebAuthn 入口
- 修正移动端头部拥挤、生产脚本、备份恢复和发布文档

### 依赖

- React 19
- Vite 8
- protobufjs 8

## [1.3.0] - 2026-07-09

- 增加拼音搜索、移动端交互、使用统计和 Docker 初始配置。
- 此版本中的 WebAuthn 与虚拟滚动代码属于未完成实验，未作为 v1.4.0 发布功能保留。

## [1.2.0] - 2026-07-09

- 增加快捷键、会话超时、PWA、拖拽排序和批量操作。

## [1.1.0] - 2026-07-09

- 增加第一版本地主密码和加密保险库，后续由 v1.4.0 的认证加密格式取代。

## [1.0.0] - 2026-07-09

- 首次发布 TOTP 管理、扫码、搜索、分类、主题和备份功能。
