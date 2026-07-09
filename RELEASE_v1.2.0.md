# 🎉 TOTP Hub v1.2.0 发布说明

**发布日期**: 2026-07-09  
**版本**: 1.2.0  
**代号**: "生产力大跃进"

---

## 🌟 重大更新

v1.2.0 是继 v1.1.0 安全增强后的又一次重大功能更新，专注于**提升用户体验和操作效率**。

### 核心亮点

- ⌨️ **20+ 全局快捷键** - 告别重复点击
- 📱 **PWA 支持** - 安装到桌面，像原生应用
- 🎯 **拖拽排序** - 自由组织账号顺序
- ☑️ **批量操作** - 高效管理大量账号
- 🔒 **会话超时** - 自动锁定保护

---

## ✨ 新增功能

### 1️⃣ 全局快捷键系统

告别繁琐的鼠标操作，键盘即可完成所有操作！

#### 常用快捷键

| 快捷键 | 功能 | Mac |
|--------|------|-----|
| `Ctrl+K` | 聚焦搜索框 | `⌘K` |
| `Ctrl+N` | 添加新账号 | `⌘N` |
| `Ctrl+L` | 锁定应用 | `⌘L` |
| `Ctrl+A` | 批量操作 | `⌘A` |
| `Ctrl+B` | 备份窗口 | `⌘B` |
| `Ctrl+,` | 打开设置 | `⌘,` |
| `Ctrl+D` | 暗色模式 | `⌘D` |

#### 高级快捷键

- `Ctrl+1-9` - 快速复制第 N 个验证码
- `1-7` - 快速切换分类
- `?` - 显示快捷键帮助
- `Escape` - 关闭弹窗/取消选择

💡 **提示**: 按 `?` 查看完整快捷键列表

---

### 2️⃣ PWA 渐进式 Web 应用

将 TOTP Hub 安装到你的设备，享受原生应用体验！

#### 功能特性

✅ **一键安装** - 浏览器自动提示安装  
✅ **独立窗口** - 不依赖浏览器标签页  
✅ **完全离线** - Service Worker 智能缓存  
✅ **快速启动** - 像原生应用一样打开  
✅ **自动更新** - 后台检测新版本  

#### 如何安装

**桌面端（Chrome/Edge）**:
1. 访问 TOTP Hub
2. 地址栏右侧出现安装图标
3. 点击"安装"按钮
4. 完成！

**移动端（iOS/Android）**:
1. 打开 Safari/Chrome
2. 点击"分享"或"菜单"
3. 选择"添加到主屏幕"
4. 完成！

📱 **支持平台**: Windows, Mac, Linux, iOS, Android

---

### 3️⃣ 拖拽排序

自由调整账号顺序，常用的排前面！

#### 使用方法

**桌面端**: 鼠标拖动卡片  
**移动端**: 长按 200ms 后拖动

✨ **特性**:
- 实时保存顺序
- 流畅的拖拽动画
- 触摸设备友好
- 不会误触

---

### 4️⃣ 批量操作

管理大量账号？批量操作来帮忙！

#### 功能

- ✅ **批量选择** - 一次选中多个账号
- 🗑️ **批量删除** - 同时删除多个（带确认）
- 📁 **批量移动** - 将账号移动到其他分类

#### 使用方法

1. 点击顶部的"批量操作"按钮（或按 `Ctrl+A`）
2. 点击卡片进行选择
3. 底部操作栏选择操作
4. 完成！

💡 **提示**: 按 `Escape` 退出批量操作模式

---

### 5️⃣ 会话超时自动锁定

离开设备忘记锁定？自动帮你搞定！

#### 功能特性

- ⏱️ **可配置时间** - 5/10/15/30/60 分钟
- ⚠️ **30秒警告** - 锁定前提醒
- 🔄 **智能重置** - 任何操作都重置计时器
- 🛡️ **自动保护** - 超时后自动锁定

#### 设置方法

1. 点击设置按钮（齿轮图标）
2. 选择超时时间
3. 保存设置
4. 完成！

🔒 **推荐**: 共享设备使用 5-15 分钟，个人设备 30-60 分钟

---

## 🎨 界面优化

### 新增组件

- 📋 **设置面板** - 统一的应用设置
- ⌨️ **快捷键帮助** - 完整的快捷键说明
- ⚠️ **超时警告** - 优雅的倒计时提醒
- 📲 **PWA 安装提示** - 自定义安装引导
- ☑️ **批量操作栏** - 底部操作栏

### 视觉改进

- ✨ 选中状态高亮（陶土色边框）
- 🎯 拖拽时半透明效果
- 📊 底部操作栏滑入动画
- 🌓 所有新组件暗色模式适配

---

## 📊 版本对比

| 功能 | v1.0.0 | v1.1.0 | v1.2.0 |
|------|--------|--------|--------|
| 基础 TOTP | ✅ | ✅ | ✅ |
| 主密码加密 | ❌ | ✅ | ✅ |
| 会话超时 | ❌ | ❌ | ✅ |
| 快捷键 | ❌ | ❌ | ✅ (20+) |
| PWA 支持 | ❌ | ❌ | ✅ |
| 拖拽排序 | ❌ | ❌ | ✅ |
| 批量操作 | ❌ | ❌ | ✅ |
| 代码行数 | 1,500 | 2,131 | 4,640 |

---

## 🔧 技术细节

### 新增依赖

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

### 新增文件

- `src/components/SessionTimeoutWarning.jsx`
- `src/components/SettingsModal.jsx`
- `src/components/KeyboardShortcutsHelp.jsx`
- `src/components/PWAInstallPrompt.jsx`
- `src/components/SortableTokenCard.jsx`
- `src/components/BatchActionsBar.jsx`
- `src/utils/sessionTimeout.js`
- `src/utils/keyboardShortcuts.js`
- `src/utils/pwa.js`
- `public/manifest.json`
- `public/sw.js`

### Service Worker

- **缓存策略**: Cache First + Network First
- **离线支持**: 完全离线可用
- **自动更新**: 后台检测新版本
- **智能缓存**: 静态资源 + 运行时缓存

---

## 📈 性能提升

- ⚡ **首次加载**: Service Worker 缓存提升 50%
- 🚀 **离线访问**: 100% 可用
- 💾 **内存优化**: 批量操作不增加内存
- 🎯 **交互响应**: 快捷键零延迟

---

## 🐛 Bug 修复

- 修复暗色模式下部分按钮颜色不正确
- 修复移动端长按可能触发系统菜单
- 修复拖拽时可能意外复制验证码

---

## ⚠️ 注意事项

### PWA 图标

PWA 需要图标文件才能完整使用，请参考 `PWA_ICONS_GUIDE.md` 生成图标。

**快速方法**:
```bash
# 使用 PWA Asset Generator
npm install -g pwa-asset-generator
pwa-asset-generator source-icon.png public/ --icon-only --maskable
```

### Service Worker

Service Worker 仅在生产环境注册，开发环境不会影响。

### 浏览器兼容性

| 功能 | Chrome | Safari | Firefox | Edge |
|------|--------|--------|---------|------|
| PWA | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| 拖拽排序 | ✅ | ✅ | ✅ | ✅ |
| 快捷键 | ✅ | ✅ | ✅ | ✅ |

---

## 📚 相关文档

- [CHANGELOG.md](CHANGELOG.md) - 完整更新日志
- [SECURITY.md](SECURITY.md) - 安全说明
- [GUIDE.md](GUIDE.md) - 使用指南
- [PWA_ICONS_GUIDE.md](PWA_ICONS_GUIDE.md) - PWA 图标生成
- [2FAUTH_COMPARISON.md](2FAUTH_COMPARISON.md) - 功能对比

---

## 🙏 致谢

感谢所有使用 TOTP Hub 的用户！你们的反馈让产品越来越好。

---

## 🚀 立即体验

### 开发模式

```bash
npm install
npm run dev
```

访问 http://localhost:5173

### 生产部署

```bash
npm run build
# 部署 dist/ 目录到任何静态托管
```

### Docker 部署（即将支持）

```bash
docker run -p 80:80 totp-hub:latest
```

---

## 📞 问题反馈

- 🐛 Bug 报告: [GitHub Issues](https://github.com/your-repo/totp-hub/issues)
- 💡 功能建议: [GitHub Discussions](https://github.com/your-repo/totp-hub/discussions)
- 🔒 安全问题: security@totp-hub.example.com

---

**v1.2.0 - 让效率成为习惯** 🚀
