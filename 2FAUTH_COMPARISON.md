# TOTP Hub vs 2FAuth 功能对比与优化建议

## 📊 功能对比矩阵

| 功能 | TOTP Hub v1.1.0 | 2FAuth | 优先级 | 实现难度 |
|------|-----------------|--------|--------|----------|
| **核心功能** |
| TOTP 生成 | ✅ | ✅ | - | - |
| 扫码添加 | ✅ | ✅ | - | - |
| 手动添加 | ✅ | ✅ | - | - |
| 搜索功能 | ✅ | ✅ | - | - |
| 分类管理 | ✅ (7类) | ✅ (自定义组) | ⭐⭐⭐ | 中 |
| 暗色模式 | ✅ | ✅ | - | - |
| **安全功能** |
| 主密码加密 | ✅ (PBKDF2+AES) | ✅ | - | - |
| 启动解锁 | ✅ | ✅ | - | - |
| 手动锁定 | ✅ | ✅ | - | - |
| 会话超时 | ❌ | ✅ | ⭐⭐⭐⭐ | 简单 |
| WebAuthn (生物识别) | ❌ | ✅ | ⭐⭐⭐⭐⭐ | 中 |
| **数据管理** |
| 本地存储 | ✅ | ✅ | - | - |
| 导出/导入 | ✅ (JSON) | ✅ (JSON/2FAS/Aegis) | ⭐⭐⭐ | 简单 |
| 加密备份 | ✅ | ✅ | - | - |
| 批量操作 | ❌ | ✅ | ⭐⭐⭐ | 中 |
| **UI/UX** |
| 图标支持 | ✅ (Emoji 30+) | ✅ (真实 Logo) | ⭐⭐⭐⭐ | 难 |
| 拖拽排序 | ❌ | ✅ | ⭐⭐⭐⭐ | 中 |
| 网格/列表视图 | ❌ (仅网格) | ✅ | ⭐⭐ | 简单 |
| PWA 支持 | ❌ | ✅ | ⭐⭐⭐⭐⭐ | 中 |
| 快捷键 | ❌ | ✅ | ⭐⭐⭐ | 简单 |
| **高级功能** |
| HOTP 支持 | ❌ | ✅ | ⭐⭐ | 中 |
| Steam Guard | ❌ | ✅ | ⭐⭐ | 难 |
| 自定义图标 | ❌ | ✅ | ⭐⭐⭐ | 中 |
| 多用户支持 | ❌ | ✅ | ⭐ | 难 |
| API 支持 | ❌ | ✅ | ⭐ | 难 |
| 浏览器扩展 | ❌ | ✅ | ⭐⭐⭐⭐ | 难 |
| **部署** |
| 纯前端 | ✅ | ❌ (需后端) | - | - |
| 自托管 | ✅ | ✅ | - | - |
| Docker | ❌ | ✅ | ⭐⭐ | 简单 |

---

## 🎯 推荐优化方向

### 🔥 高优先级（v1.2.0）

#### 1. **会话超时自动锁定** ⭐⭐⭐⭐
**为什么需要**:
- 忘记手动锁定时的最后防线
- 共享设备上的重要保护
- 2FAuth 默认 15 分钟超时

**实现方案**:
```javascript
// 简单实现
let lastActivity = Date.now()
let timeoutDuration = 15 * 60 * 1000 // 15 分钟

// 监听用户活动
['mousedown', 'keydown', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now()
  })
})

// 定时检查
setInterval(() => {
  if (hasMasterPassword() && !isLocked) {
    if (Date.now() - lastActivity > timeoutDuration) {
      handleLock() // 自动锁定
    }
  }
}, 60000) // 每分钟检查一次
```

**用户体验**:
- 设置中可配置超时时间（5/10/15/30/60 分钟，或禁用）
- 锁定前 30 秒倒计时提醒
- 任何操作都重置计时器

---

#### 2. **WebAuthn 生物识别解锁** ⭐⭐⭐⭐⭐
**为什么需要**:
- 现代设备都支持指纹/面容识别
- 用户体验远超输入密码
- 安全性更高（不会被键盘记录器窃取）

**实现方案**:
```javascript
// 注册 WebAuthn 凭据
async function registerWebAuthn() {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: new Uint8Array(32),
      rp: { name: "TOTP Hub" },
      user: {
        id: new Uint8Array(16),
        name: "user",
        displayName: "TOTP Hub User"
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // 使用设备内置
        userVerification: "required"
      }
    }
  })
  // 存储凭据 ID
  localStorage.setItem('totp-hub-webauthn-id', credential.id)
}

// 使用 WebAuthn 解锁
async function unlockWithWebAuthn() {
  const credentialId = localStorage.getItem('totp-hub-webauthn-id')
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(32),
      allowCredentials: [{
        id: base64ToArrayBuffer(credentialId),
        type: 'public-key'
      }],
      userVerification: "required"
    }
  })
  // 验证成功，解锁应用
  handleUnlock(storedPassword)
}
```

**用户体验**:
- 解锁界面显示「使用生物识别」按钮
- 一键指纹/面容解锁
- 仍可使用密码作为备用方式

---

#### 3. **PWA 支持（离线安装）** ⭐⭐⭐⭐⭐
**为什么需要**:
- 可以像原生应用一样安装到桌面/主屏幕
- 完全离线使用
- 独立窗口，不受浏览器标签页干扰

**实现方案**:
```javascript
// manifest.json
{
  "name": "TOTP Hub",
  "short_name": "TOTP Hub",
  "description": "企业级两步验证码管理工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F7F4EF",
  "theme_color": "#C4612F",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// Service Worker (简化版)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('totp-hub-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/src/main.jsx',
        '/src/index.css'
      ])
    })
  )
})
```

**用户体验**:
- 访问网站时提示「添加到主屏幕」
- 点击后像 App 一样使用
- 完全离线可用

---

#### 4. **拖拽排序** ⭐⭐⭐⭐
**为什么需要**:
- 常用账号排在前面
- 个性化组织方式
- 提升查找效率

**实现方案**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

```javascript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function handleDragEnd(event) {
  const { active, over } = event
  if (active.id !== over.id) {
    const oldIndex = tokens.findIndex(t => t.id === active.id)
    const newIndex = tokens.findIndex(t => t.id === over.id)
    const newTokens = arrayMove(tokens, oldIndex, newIndex)
    setTokens(newTokens)
  }
}
```

**用户体验**:
- 长按拖拽卡片重新排序
- 实时保存顺序
- 触摸设备友好

---

### 🔧 中优先级（v1.3.0）

#### 5. **真实服务商 Logo** ⭐⭐⭐⭐
**当前状态**: Emoji 图标（🐙 🔍 等）
**建议改进**: 真实的服务商 Logo

**实现方案**:
```javascript
// 使用公共 Logo 库
const logoUrl = `https://logo.clearbit.com/${domain}`
// 或自建 Logo 库
const logos = {
  'github': '/logos/github.svg',
  'google': '/logos/google.svg',
  // ...
}

// 组件中
<img 
  src={getLogoUrl(token.issuer)} 
  alt={token.issuer}
  onError={(e) => e.target.src = '/logos/default.svg'}
  className="w-8 h-8 rounded"
/>
```

**优点**:
- 更专业的视觉效果
- 一眼识别服务商
- 品牌感更强

**缺点**:
- 需要维护 Logo 库
- 可能有版权问题（使用公共 API 或官方授权）

---

#### 6. **批量操作** ⭐⭐⭐
**功能**:
- 批量选择
- 批量删除
- 批量移动分类
- 批量导出

**实现方案**:
```javascript
const [selectedTokens, setSelectedTokens] = useState([])
const [selectionMode, setSelectionMode] = useState(false)

// 切换选择模式
<button onClick={() => setSelectionMode(!selectionMode)}>
  {selectionMode ? '取消选择' : '批量操作'}
</button>

// 批量删除
<button onClick={() => {
  setTokens(tokens.filter(t => !selectedTokens.includes(t.id)))
  setSelectedTokens([])
  setSelectionMode(false)
}}>
  删除选中 ({selectedTokens.length})
</button>
```

---

#### 7. **快捷键支持** ⭐⭐⭐
**建议快捷键**:
- `Ctrl/Cmd + K` - 聚焦搜索框
- `Ctrl/Cmd + N` - 添加新账号
- `Ctrl/Cmd + L` - 锁定应用
- `Ctrl/Cmd + B` - 打开备份窗口
- `Esc` - 关闭弹窗
- `1-9` - 快速复制第 N 个验证码

**实现方案**:
```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault()
      handleLock()
    }
    // ...
  }
  document.addEventListener('keydown', handleKeyPress)
  return () => document.removeEventListener('keydown', handleKeyPress)
}, [])
```

---

#### 8. **更多导入格式支持** ⭐⭐⭐
**当前支持**: TOTP URI, JSON 备份
**建议添加**:
- Google Authenticator 导出格式
- Authy 备份格式
- 2FAS 格式
- Aegis 格式

**实现**:
```javascript
function parseGoogleAuthenticator(data) {
  // 解析 Google Authenticator 的 otpauth-migration:// 格式
  // 需要 protobuf 解析
}

function parse2FAS(jsonData) {
  // 解析 2FAS JSON 格式
  return jsonData.services.map(s => ({
    issuer: s.name,
    account: s.otp.account,
    secret: s.otp.secret,
    // ...
  }))
}
```

---

### 🎨 低优先级（v2.0.0+）

#### 9. **自定义图标上传** ⭐⭐⭐
- 允许用户上传自己的服务商图标
- 本地存储为 base64 或 blob

#### 10. **网格/列表切换视图** ⭐⭐
- 当前只有网格视图
- 添加紧凑的列表视图选项

#### 11. **HOTP 支持** ⭐⭐
- 基于计数器的一次性密码
- 较少使用，优先级不高

#### 12. **Steam Guard 支持** ⭐⭐
- Steam 特殊的验证码格式
- 游戏玩家需求

---

## 🚀 v1.2.0 推荐实现清单

基于优先级和实现难度，建议 v1.2.0 实现以下功能：

### 核心功能（必须）
1. ✅ **会话超时自动锁定** - 1-2 小时开发
2. ✅ **PWA 支持** - 2-3 小时开发
3. ✅ **拖拽排序** - 2-3 小时开发

### 进阶功能（推荐）
4. ✅ **WebAuthn 生物识别** - 3-4 小时开发
5. ✅ **快捷键支持** - 1-2 小时开发
6. ✅ **批量操作** - 2-3 小时开发

### 体验优化（可选）
7. ✅ **真实 Logo 支持** - 2-3 小时（Logo 收集）
8. ✅ **更多导入格式** - 2-3 小时开发

**总预计开发时间**: 15-23 小时

---

## 💎 TOTP Hub 的独特优势

虽然 2FAuth 功能更丰富，但 TOTP Hub 有这些优势：

### 1. **纯前端架构**
- ✅ 不需要后端服务器
- ✅ 部署超简单（只需静态托管）
- ✅ 不需要数据库
- ✅ 完全离线使用

2FAuth 需要 PHP + MySQL，部署复杂度更高

### 2. **开箱即用**
- ✅ 访问网址就能用
- ✅ 不需要注册账号
- ✅ 不需要配置

2FAuth 需要安装、配置数据库、创建管理员账号

### 3. **现代化技术栈**
- ✅ React 19 + Vite 8
- ✅ Tailwind CSS v4
- ✅ 最新的前端技术

2FAuth 使用 Laravel (PHP)，前端是 Vue 2

### 4. **独特设计**
- ✅ 暖色调设计（区别于常见的蓝紫色）
- ✅ Emoji 图标（虽然不如真实 Logo，但无版权问题）
- ✅ 中文优化

---

## 📝 总结建议

### 立即实现（高价值 + 简单）
1. **会话超时自动锁定** - 安全性提升，实现简单
2. **快捷键支持** - 用户体验提升，实现简单
3. **PWA 支持** - 重大体验提升，工作量中等

### 下个版本实现（高价值 + 中等难度）
4. **WebAuthn 生物识别** - 现代化解锁方式
5. **拖拽排序** - 常用功能
6. **批量操作** - 管理大量账号时很有用

### 长期规划（低优先级或高难度）
7. **真实 Logo 库** - 需要持续维护
8. **浏览器扩展** - 独立项目，工作量大
9. **多用户支持** - 需要后端，违背纯前端理念

---

**建议**: 先完成 v1.2.0 的核心功能，保持"纯前端 + 企业级安全 + 现代化设计"的特色定位！
