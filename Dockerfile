# ============================================
# 多阶段构建 - Token Vault 前端
# ============================================

# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 设置构建参数
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci && npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 列出构建产物（调试用）
RUN ls -la /app/dist

# ============================================
# 生产阶段 - Nginx
# ============================================
FROM nginx:1.25-alpine

# 安装 wget（用于健康检查）
RUN apk add --no-cache wget

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建日志目录
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
