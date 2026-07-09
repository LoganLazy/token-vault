/**
 * 服务商 Logo 映射表
 * 使用免费的 Logo CDN 服务
 */

// 常见服务商的真实 Logo URL
export const SERVICE_LOGOS = {
  // 科技公司
  'google': 'https://www.google.com/favicon.ico',
  'microsoft': 'https://www.microsoft.com/favicon.ico',
  'apple': 'https://www.apple.com/favicon.ico',
  'github': 'https://github.com/favicon.ico',
  'gitlab': 'https://gitlab.com/favicon.ico',
  'amazon': 'https://www.amazon.com/favicon.ico',
  'aws': 'https://aws.amazon.com/favicon.ico',

  // 社交媒体
  'facebook': 'https://www.facebook.com/favicon.ico',
  'twitter': 'https://twitter.com/favicon.ico',
  'x': 'https://twitter.com/favicon.ico',
  'instagram': 'https://www.instagram.com/favicon.ico',
  'linkedin': 'https://www.linkedin.com/favicon.ico',
  'reddit': 'https://www.reddit.com/favicon.ico',
  'discord': 'https://discord.com/favicon.ico',
  'slack': 'https://slack.com/favicon.ico',
  'telegram': 'https://telegram.org/favicon.ico',
  'whatsapp': 'https://www.whatsapp.com/favicon.ico',

  // 开发工具
  'vercel': 'https://vercel.com/favicon.ico',
  'netlify': 'https://www.netlify.com/favicon.ico',
  'heroku': 'https://www.heroku.com/favicon.ico',
  'digitalocean': 'https://www.digitalocean.com/favicon.ico',
  'cloudflare': 'https://www.cloudflare.com/favicon.ico',
  'docker': 'https://www.docker.com/favicon.ico',
  'npm': 'https://www.npmjs.com/favicon.ico',
  'yarn': 'https://yarnpkg.com/favicon.ico',

  // 金融服务
  'paypal': 'https://www.paypal.com/favicon.ico',
  'stripe': 'https://stripe.com/favicon.ico',
  'coinbase': 'https://www.coinbase.com/favicon.ico',
  'binance': 'https://www.binance.com/favicon.ico',

  // 云服务
  'dropbox': 'https://www.dropbox.com/favicon.ico',
  'onedrive': 'https://www.microsoft.com/favicon.ico',
  'gdrive': 'https://drive.google.com/favicon.ico',
  'icloud': 'https://www.icloud.com/favicon.ico',

  // 邮件服务
  'gmail': 'https://mail.google.com/favicon.ico',
  'outlook': 'https://outlook.live.com/favicon.ico',
  'protonmail': 'https://proton.me/favicon.ico',

  // 游戏平台
  'steam': 'https://store.steampowered.com/favicon.ico',
  'epic': 'https://www.epicgames.com/favicon.ico',
  'playstation': 'https://www.playstation.com/favicon.ico',
  'xbox': 'https://www.xbox.com/favicon.ico',
  'nintendo': 'https://www.nintendo.com/favicon.ico',

  // 中国服务
  'alipay': 'https://www.alipay.com/favicon.ico',
  '支付宝': 'https://www.alipay.com/favicon.ico',
  'wechat': 'https://www.wechat.com/favicon.ico',
  '微信': 'https://www.wechat.com/favicon.ico',
  'taobao': 'https://www.taobao.com/favicon.ico',
  '淘宝': 'https://www.taobao.com/favicon.ico',
  'jd': 'https://www.jd.com/favicon.ico',
  '京东': 'https://www.jd.com/favicon.ico',
  'baidu': 'https://www.baidu.com/favicon.ico',
  '百度': 'https://www.baidu.com/favicon.ico',
  'qq': 'https://www.qq.com/favicon.ico',
  'douban': 'https://www.douban.com/favicon.ico',
  '豆瓣': 'https://www.douban.com/favicon.ico',
  'zhihu': 'https://www.zhihu.com/favicon.ico',
  '知乎': 'https://www.zhihu.com/favicon.ico',
  'bilibili': 'https://www.bilibili.com/favicon.ico',
  'b站': 'https://www.bilibili.com/favicon.ico',

  // 更多服务
  'notion': 'https://www.notion.so/favicon.ico',
  'figma': 'https://www.figma.com/favicon.ico',
  'canva': 'https://www.canva.com/favicon.ico',
  'adobe': 'https://www.adobe.com/favicon.ico',
  'zoom': 'https://zoom.us/favicon.ico',
  'trello': 'https://trello.com/favicon.ico',
  'asana': 'https://asana.com/favicon.ico',
  'salesforce': 'https://www.salesforce.com/favicon.ico',
  'shopify': 'https://www.shopify.com/favicon.ico',
  'wordpress': 'https://wordpress.com/favicon.ico',
  'medium': 'https://medium.com/favicon.ico',
  'youtube': 'https://www.youtube.com/favicon.ico',
  'spotify': 'https://www.spotify.com/favicon.ico',
  'netflix': 'https://www.netflix.com/favicon.ico',
  'twitch': 'https://www.twitch.tv/favicon.ico',
  'tiktok': 'https://www.tiktok.com/favicon.ico'
}

/**
 * 根据服务商名称获取 Logo URL
 */
export function getServiceLogo(issuer) {
  if (!issuer) return null

  const key = issuer.toLowerCase().trim()

  // 直接匹配
  if (SERVICE_LOGOS[key]) {
    return SERVICE_LOGOS[key]
  }

  // 部分匹配
  for (const [service, url] of Object.entries(SERVICE_LOGOS)) {
    if (key.includes(service) || service.includes(key)) {
      return url
    }
  }

  // 尝试自动生成（通用域名）
  if (key.includes('.')) {
    return `https://${key}/favicon.ico`
  }

  // 尝试常见域名
  return `https://www.${key}.com/favicon.ico`
}

/**
 * 检查 Logo 是否可用
 */
export async function checkLogoAvailable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * 获取服务商显示（Logo 或 Emoji）
 */
export function getServiceDisplay(issuer, emoji) {
  const logoUrl = getServiceLogo(issuer)

  return {
    type: logoUrl ? 'logo' : 'emoji',
    logo: logoUrl,
    emoji: emoji,
    fallback: emoji
  }
}
