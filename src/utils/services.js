// 常见服务商图标映射
export const serviceIcons = {
  github: '🐙',
  google: '🔍',
  microsoft: '🪟',
  amazon: '📦',
  facebook: '👥',
  twitter: '🐦',
  instagram: '📷',
  linkedin: '💼',
  dropbox: '📦',
  slack: '💬',
  discord: '🎮',
  steam: '🎮',
  netflix: '🎬',
  spotify: '🎵',
  paypal: '💰',
  stripe: '💳',
  apple: '🍎',
  reddit: '🤖',
  gitlab: '🦊',
  bitbucket: '🪣',
  cloudflare: '☁️',
  aws: '☁️',
  azure: '☁️',
  gcp: '☁️',
  digitalocean: '🌊',
  heroku: '💜',
  vercel: '▲',
  netlify: '🦋',
  npm: '📦',
  docker: '🐋',
  kubernetes: '⚓',
  default: '🔐'
}

export function getServiceIcon(issuer) {
  if (!issuer) return serviceIcons.default

  const key = issuer.toLowerCase()
  for (const [service, icon] of Object.entries(serviceIcons)) {
    if (key.includes(service)) {
      return icon
    }
  }
  return serviceIcons.default
}

import { t } from './i18n'

// 分类选项
export const categories = [
  { id: 'all', name: () => t('category.all'), icon: '📋' },
  { id: 'work', name: () => t('category.work'), icon: '💼' },
  { id: 'personal', name: () => t('category.personal'), icon: '👤' },
  { id: 'finance', name: () => t('category.finance'), icon: '💰' },
  { id: 'social', name: () => t('category.social'), icon: '💬' },
  { id: 'dev', name: () => t('category.dev'), icon: '💻' },
  { id: 'gaming', name: () => t('category.gaming'), icon: '🎮' },
  { id: 'other', name: () => t('category.other'), icon: '📌' }
]

export function getCategoryById(id) {
  return categories.find(c => c.id === id) || categories[0]
}
