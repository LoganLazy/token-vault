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

// 分类选项
export const categories = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'work', name: '工作', icon: '💼' },
  { id: 'personal', name: '个人', icon: '👤' },
  { id: 'finance', name: '金融', icon: '💰' },
  { id: 'social', name: '社交', icon: '💬' },
  { id: 'dev', name: '开发', icon: '💻' },
  { id: 'other', name: '其他', icon: '📌' }
]

export function getCategoryById(id) {
  return categories.find(c => c.id === id) || categories[0]
}
