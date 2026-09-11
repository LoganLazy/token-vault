# 贡献指南

感谢您考虑为 Token Vault 做出贡献！🎉

## 行为准则

请保持友好、尊重和包容。我们欢迎所有人的贡献。

## 如何贡献

### 报告 Bug

在提交 Bug 报告前，请：
1. 搜索现有的 Issues，避免重复
2. 使用最新版本测试
3. 提供清晰的复现步骤

Bug 报告应包含：
- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 截图（如果适用）
- 环境信息（浏览器版本、操作系统等）

### 建议新功能

1. 搜索现有的 Issues，确保功能未被提出
2. 详细描述功能需求和使用场景
3. 说明为什么这个功能对用户有价值

### 提交代码

#### 开发流程

1. **Fork 仓库**
   ```bash
   # 克隆你的 fork
   git clone https://github.com/你的用户名/totp-hub.git
   cd totp-hub
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/你的功能名
   # 或
   git checkout -b fix/你的修复名
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **编写代码**
   - 遵循现有的代码风格
   - 添加必要的注释
   - 保持代码简洁清晰

6. **测试**
   ```bash
   npm run lint  # 检查代码规范
   npm run build # 测试构建
   ```

7. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `style:` 代码格式（不影响功能）
   - `refactor:` 重构
   - `perf:` 性能优化
   - `test:` 测试
   - `chore:` 构建/工具链

8. **推送并创建 PR**
   ```bash
   git push origin feature/你的功能名
   ```
   然后在 GitHub 上创建 Pull Request

#### 代码规范

- 使用 ES6+ 语法
- 使用函数式组件和 Hooks
- 保持组件小而专注
- 提取可复用的逻辑
- 使用有意义的变量名
- 添加必要的注释（尤其是复杂逻辑）
- 遵循 React 最佳实践

#### 样式规范

- 使用 Tailwind CSS 工具类
- 遵循现有的设计系统（暖色调）
- 确保移动端适配
- 支持暗色模式
- 保持一致的间距和圆角

#### 文件结构

```
totp-hub/
├── src/
│   ├── components/      # React 组件
│   │   ├── TokenCard.jsx
│   │   ├── AddTokenModal.jsx
│   │   └── ...
│   ├── utils/          # 工具函数
│   │   ├── services.js
│   │   ├── encryption.js
│   │   └── ...
│   ├── App.jsx         # 主应用组件
│   ├── main.jsx        # 入口文件
│   └── index.css       # 全局样式
├── public/             # 静态资源
├── README.md           # 项目说明
├── GUIDE.md            # 使用指南
├── CHANGELOG.md        # 更新日志
└── CONTRIBUTING.md     # 本文件
```

### Pull Request 检查清单

提交 PR 前，请确保：
- [ ] 代码通过 lint 检查
- [ ] 构建成功（`npm run build`）
- [ ] 功能在桌面端和移动端都能正常工作
- [ ] 支持暗色模式
- [ ] 更新了相关文档
- [ ] PR 描述清晰，说明了更改内容
- [ ] 关联了相关的 Issue（如果有）

### 文档贡献

文档改进同样重要！包括：
- 修正拼写错误
- 改进表述
- 添加示例
- 翻译

## 开发技巧

### 调试

1. 打开浏览器开发者工具
2. 查看 Console 日志
3. 使用 React DevTools 检查组件状态
4. 检查 localStorage 中的数据

### 测试新功能

1. 使用测试密钥：`JBSWY3DPEHPK3PXP`
2. 在隐私模式下测试新用户体验
3. 测试不同屏幕尺寸
4. 测试暗色和亮色模式

### 常见问题

**Q: 如何添加新的服务商图标？**
A: 在 `src/utils/services.js` 的 `serviceIcons` 对象中添加映射。

**Q: 如何修改颜色主题？**
A: 在 `src/index.css` 的 `@theme` 部分修改颜色变量。

**Q: 如何添加新的分类？**
A: 在 `src/utils/services.js` 的 `categories` 数组中添加新分类。

## 社区

- 提交 Issue 讨论想法
- 参与 PR 审查
- 帮助其他贡献者
- 分享使用经验

## 许可

贡献的代码将遵循项目的 MIT 许可证。

## 感谢

感谢所有为 Token Vault 做出贡献的开发者！ 🙏

---

有问题？随时开 Issue 询问！
