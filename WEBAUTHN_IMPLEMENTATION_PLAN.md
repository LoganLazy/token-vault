# 🔐 WebAuthn 生物识别实现方案

## 概述

WebAuthn (Web Authentication API) 是 W3C 标准，支持指纹、面容 ID、硬件密钥等生物识别方式。

---

## 技术架构

### 工作流程

```
注册流程:
用户设置主密码 → 创建 WebAuthn 凭据 → 存储凭据 ID → 完成

解锁流程:
应用锁定 → 显示生物识别按钮 → 验证凭据 → 解锁成功
```

### 数据存储

```javascript
localStorage:
- webauthn-credential-id: 凭据 ID
- webauthn-enabled: 是否启用
- master-password-hash: 主密码哈希（备用）
```

---

## 实现步骤

### 1️⃣ WebAuthn 工具函数

**文件**: `src/utils/webauthn.js`

**功能**:
- `isWebAuthnAvailable()` - 检测浏览器支持
- `registerCredential(userId)` - 注册凭据
- `authenticateCredential(credentialId)` - 验证凭据
- `deleteCredential()` - 删除凭据

---

### 2️⃣ 注册流程

**时机**: 首次设置主密码后

**步骤**:
1. 用户设置主密码
2. 提示"启用生物识别？"
3. 调用 `navigator.credentials.create()`
4. 存储凭据 ID

**API 调用**:
```javascript
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: {
      name: "TOTP Hub",
      id: window.location.hostname
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: "user@totp-hub",
      displayName: "TOTP Hub User"
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // 平台认证器（指纹/面容）
      userVerification: "required",
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: "none"
  }
})
```

---

### 3️⃣ 验证流程

**时机**: 应用解锁时

**步骤**:
1. 检测是否启用 WebAuthn
2. 显示"使用生物识别解锁"按钮
3. 调用 `navigator.credentials.get()`
4. 验证成功后解锁

**API 调用**:
```javascript
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{
      id: base64ToArrayBuffer(credentialId),
      type: "public-key"
    }],
    userVerification: "required",
    timeout: 60000
  }
})
```

---

### 4️⃣ UI 组件

**解锁界面更新**:
- 密码输入框（默认）
- 生物识别按钮（如果可用）
- "使用密码"/"使用生物识别" 切换

**图标**:
- 指纹图标（Fingerprint from lucide-react）
- 面容图标（Scan from lucide-react）

---

### 5️⃣ 设置界面

**新增选项**:
```
安全设置
├─ 主密码
│  ├─ 修改密码
│  └─ 移除密码
├─ 生物识别
│  ├─ 启用生物识别 [开关]
│  ├─ 设备支持: ✅ / ❌
│  └─ 重新注册
```

---

## 兼容性

### 浏览器支持

| 浏览器 | 版本 | 支持度 |
|--------|------|--------|
| Chrome | 67+ | ✅ 完全支持 |
| Safari | 13+ | ✅ 完全支持 |
| Firefox | 60+ | ✅ 完全支持 |
| Edge | 18+ | ✅ 完全支持 |

### 平台支持

| 平台 | 认证方式 | 支持度 |
|------|---------|--------|
| iOS | Face ID / Touch ID | ✅ |
| Android | 指纹 / 面部 | ✅ |
| macOS | Touch ID | ✅ |
| Windows | Windows Hello | ✅ |
| Linux | 部分设备 | ⚠️ |

---

## 安全考虑

### 1️⃣ 备用方案
- WebAuthn 不可用时，回退到密码
- 生物识别失败时，允许密码输入

### 2️⃣ 数据保护
- 凭据 ID 本身不敏感（公开存储）
- 私钥存储在设备安全芯片中
- 主密码哈希仍然保留（备用）

### 3️⃣ 用户控制
- 用户可随时启用/禁用
- 删除凭据不影响数据
- 密码仍可用

---

## 错误处理

### 常见错误

| 错误 | 原因 | 处理 |
|------|------|------|
| NotSupportedError | 浏览器不支持 | 隐藏生物识别选项 |
| NotAllowedError | 用户取消 | 提示"已取消" |
| InvalidStateError | 凭据已存在 | 删除旧凭据重试 |
| SecurityError | 非 HTTPS | 提示需要 HTTPS |

---

## 测试场景

### 1️⃣ 注册测试
- [ ] 首次设置密码后提示
- [ ] 成功注册凭据
- [ ] 存储凭据 ID
- [ ] 显示"生物识别已启用"

### 2️⃣ 验证测试
- [ ] 刷新页面后锁定
- [ ] 显示生物识别按钮
- [ ] 指纹/面容验证成功
- [ ] 应用解锁

### 3️⃣ 降级测试
- [ ] WebAuthn 不可用时隐藏
- [ ] 验证失败后允许密码输入
- [ ] 删除凭据后回退密码

### 4️⃣ 跨设备测试
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] macOS Safari
- [ ] Windows Chrome

---

## 实现优先级

### Phase 1: 核心功能 ⭐⭐⭐⭐⭐
- [x] WebAuthn 工具函数
- [x] 注册流程
- [x] 验证流程
- [x] UI 组件更新

### Phase 2: 用户体验 ⭐⭐⭐⭐
- [ ] 设置界面集成
- [ ] 错误处理优化
- [ ] Toast 提示

### Phase 3: 高级功能 ⭐⭐⭐
- [ ] 多设备支持
- [ ] 凭据管理
- [ ] 统计信息

---

## 实现时间估算

- WebAuthn 工具函数: 30 分钟
- UI 组件更新: 30 分钟
- 注册流程集成: 20 分钟
- 验证流程集成: 20 分钟
- 测试 + 调试: 30 分钟

**总计**: 约 2 小时

---

开始实现！🚀
