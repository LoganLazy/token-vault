# Token Vault

Token Vault 是一个本地优先的 TOTP 验证码管理工具，支持 PWA 安装、二维码扫描、批量导入、加密备份和可选的自托管同步。

## 功能

- 生成 SHA-1、SHA-256、SHA-512 TOTP 验证码
- 扫描二维码、解析 `otpauth://` URI 和 Google Authenticator 迁移数据
- 搜索、拼音搜索、分类、拖拽排序和批量操作
- 响应式界面、系统/亮色/暗色主题和 PWA 离线静态资源
- 可选主密码：PBKDF2-SHA256（600,000 次）+ AES-256-GCM
- 加密或明文 JSON 备份与恢复
- 可选自托管账号和同步 API

## 安全边界

默认数据保存在浏览器本地。未设置主密码时，TOTP 密钥以明文 JSON 存储；设置主密码后，本地保险库会加密，忘记密码无法恢复。

自托管同步服务会使用 AES-256-GCM 加密数据库中的 TOTP 密钥，但目前不是端到端加密，服务端处理请求时能够解密数据。生产同步服务必须部署在 HTTPS 后面并保护好 `DATA_ENCRYPTION_KEY`。完整说明见 [SECURITY.md](SECURITY.md) 和应用内隐私政策。

## 本地开发

要求 Node.js 20.19+。

```bash
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。本地保险库无需后端即可使用；登录和同步需要另行启动 API：

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Vite 会将 `/api` 代理到 `http://localhost:3000`。

## 验证与构建

```bash
npm run lint
npm test
npm run test:coverage
npm run build

cd backend
npm test
npm run test:coverage
```

生产构建输出到 `dist/`。仓库中的 GitHub Actions 会在推送和拉取请求时验证前后端安装、测试、审计、Lint 和构建。

## 生产部署

推荐使用生产 Compose 配置：

```bash
cp .env.production.example .env.production
# 填写唯一的 JWT_SECRET、64 位十六进制 DATA_ENCRYPTION_KEY 和 HTTPS CORS_ORIGIN
./deploy.sh
```

生产栈仅对外提供前端端口，API 通过同源 `/api` 访问，SQLite 数据保存在 `backend/data/totp.db`。完整步骤、TLS 要求和备份恢复说明见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 隐私

项目不集成第三方广告或分析。摄像头仅在用户主动扫描二维码时使用，二维码在设备上解析。隐私政策源文件位于 `public/privacy.html`，部署后可通过 `/privacy.html` 访问。

## 许可证

[MIT](LICENSE)
