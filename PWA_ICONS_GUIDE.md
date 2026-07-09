# PWA 图标生成指南

## 📱 所需图标尺寸

PWA 需要以下尺寸的图标：

### 标准图标
- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

### Maskable 图标（用于 Android 自适应图标）
- icon-maskable-192.png (192x192)
- icon-maskable-512.png (512x512)

### 快捷方式图标
- icon-shortcut-add.png (96x96)
- icon-shortcut-backup.png (96x96)

### 截图（可选）
- screenshot-mobile.png (390x844)
- screenshot-desktop.png (1280x720)

---

## 🎨 快速生成图标

### 方法一：使用在线工具（推荐）

1. **PWA Asset Generator**
   - 网址：https://www.pwabuilder.com/imageGenerator
   - 上传一张 512x512 的源图片
   - 自动生成所有尺寸的图标

2. **Favicon Generator**
   - 网址：https://realfavicongenerator.net/
   - 可以生成包括 Apple Touch Icon 在内的所有图标

3. **Icon Kitchen**
   - 网址：https://icon.kitchen/
   - 专为 PWA 设计的图标生成工具

### 方法二：使用命令行工具

```bash
# 安装 pwa-asset-generator
npm install -g pwa-asset-generator

# 生成所有图标
pwa-asset-generator source-icon.png public/ \
  --icon-only \
  --maskable \
  --favicon
```

### 方法三：使用 ImageMagick（需要安装）

```bash
# 生成标准图标
convert source-icon.png -resize 72x72 public/icon-72.png
convert source-icon.png -resize 96x96 public/icon-96.png
convert source-icon.png -resize 128x128 public/icon-128.png
convert source-icon.png -resize 144x144 public/icon-144.png
convert source-icon.png -resize 152x152 public/icon-152.png
convert source-icon.png -resize 192x192 public/icon-192.png
convert source-icon.png -resize 384x384 public/icon-384.png
convert source-icon.png -resize 512x512 public/icon-512.png

# 生成 maskable 图标（需要留 20% 安全边距）
convert source-icon.png \
  -resize 154x154 \
  -gravity center \
  -extent 192x192 \
  -background "#C4612F" \
  public/icon-maskable-192.png

convert source-icon.png \
  -resize 410x410 \
  -gravity center \
  -extent 512x512 \
  -background "#C4612F" \
  public/icon-maskable-512.png
```

---

## 🎯 设计建议

### 图标设计原则

1. **简洁明了** - 在小尺寸下也能识别
2. **品牌一致** - 使用 TOTP Hub 的陶土色 (#C4612F)
3. **居中对齐** - 主要元素居中，四周留白
4. **高对比度** - 确保在各种背景下都清晰

### 推荐设计元素

- 🔒 盾牌图标 + 时钟
- 🔐 锁图标 + 数字 "2FA"
- ⏱️ 环形进度条 + 密钥
- 🛡️ 六边形盾牌 + 数字 "6"

### 颜色方案

**主色**：陶土色 #C4612F
**辅助色**：奶油色 #F7F4EF
**强调色**：深色 #1F2421

---

## ⚡ 临时解决方案

如果暂时没有设计图标，可以使用现有的 favicon.svg：

```bash
# 将 favicon.svg 转换为 PNG（需要 ImageMagick）
cd public
for size in 72 96 128 144 152 192 384 512; do
  convert favicon.svg -resize ${size}x${size} icon-${size}.png
done

# 或者直接使用 favicon.svg 作为所有图标
# 现代浏览器都支持 SVG 图标
```

---

## 📝 测试清单

生成图标后，测试以下内容：

- [ ] 在 Chrome DevTools 中检查 manifest.json
- [ ] 在 Lighthouse 中运行 PWA 审计
- [ ] 在移动设备上测试"添加到主屏幕"
- [ ] 检查 iOS Safari 的 Apple Touch Icon
- [ ] 检查 Android Chrome 的自适应图标
- [ ] 验证暗色模式下的图标显示

---

## 🔧 图标路径

所有图标应放在 `public/` 目录下：

```
public/
├── icon-72.png
├── icon-96.png
├── icon-128.png
├── icon-144.png
├── icon-152.png
├── icon-192.png
├── icon-384.png
├── icon-512.png
├── icon-maskable-192.png
├── icon-maskable-512.png
├── icon-shortcut-add.png
├── icon-shortcut-backup.png
├── screenshot-mobile.png (可选)
└── screenshot-desktop.png (可选)
```

---

## 📱 当前状态

**✅ 已完成**:
- manifest.json 配置
- Service Worker 实现
- PWA 安装提示组件
- Meta 标签配置

**⚠️ 待完成**:
- 生成实际的图标文件
- 可选：添加应用截图

**💡 提示**: 
在开发阶段，manifest.json 中的图标路径会导致 404 错误，这是正常的。
只要在部署前生成图标即可。PWA 其他功能（离线、安装提示等）不受影响。
