/**
 * 统计功能 - 追踪使用次数和最常用账号
 */

const STATS_KEY = 'totp-hub-stats'

/**
 * 获取统计数据
 */
export function getStats() {
  try {
    const data = localStorage.getItem(STATS_KEY)
    return data ? JSON.parse(data) : {
      copyCount: {},      // { tokenId: count }
      totalCopies: 0,     // 总复制次数
      lastCopy: {},       // { tokenId: timestamp }
      firstUse: Date.now()  // 首次使用时间
    }
  } catch (e) {
    return {
      copyCount: {},
      totalCopies: 0,
      lastCopy: {},
      firstUse: Date.now()
    }
  }
}

/**
 * 保存统计数据
 */
function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch (e) {
    console.error('Failed to save stats:', e)
  }
}

/**
 * 记录复制操作
 */
export function recordCopy(tokenId) {
  const stats = getStats()

  // 增加复制次数
  stats.copyCount[tokenId] = (stats.copyCount[tokenId] || 0) + 1
  stats.totalCopies += 1
  stats.lastCopy[tokenId] = Date.now()

  saveStats(stats)
}

/**
 * 获取最常用的账号
 */
export function getMostUsedTokens(tokens, limit = 5) {
  const stats = getStats()

  return tokens
    .map(token => ({
      ...token,
      copyCount: stats.copyCount[token.id] || 0,
      lastCopy: stats.lastCopy[token.id] || 0
    }))
    .filter(token => token.copyCount > 0)
    .sort((a, b) => b.copyCount - a.copyCount)
    .slice(0, limit)
}

/**
 * 获取最近使用的账号
 */
export function getRecentlyUsedTokens(tokens, limit = 5) {
  const stats = getStats()

  return tokens
    .map(token => ({
      ...token,
      lastCopy: stats.lastCopy[token.id] || 0
    }))
    .filter(token => token.lastCopy > 0)
    .sort((a, b) => b.lastCopy - a.lastCopy)
    .slice(0, limit)
}

/**
 * 获取统计摘要
 */
export function getStatsSummary(tokens) {
  const stats = getStats()

  const usedTokens = tokens.filter(token => stats.copyCount[token.id] > 0)
  const totalDays = Math.ceil((Date.now() - stats.firstUse) / (1000 * 60 * 60 * 24))

  return {
    totalCopies: stats.totalCopies,
    totalTokens: tokens.length,
    usedTokens: usedTokens.length,
    unusedTokens: tokens.length - usedTokens.length,
    avgCopiesPerDay: totalDays > 0 ? (stats.totalCopies / totalDays).toFixed(1) : 0,
    totalDays: totalDays,
    mostUsed: getMostUsedTokens(tokens, 1)[0] || null
  }
}

/**
 * 清除统计数据
 */
export function clearStats() {
  localStorage.removeItem(STATS_KEY)
}

/**
 * 清除特定账号的统计
 */
export function clearTokenStats(tokenId) {
  const stats = getStats()

  if (stats.copyCount[tokenId]) {
    stats.totalCopies -= stats.copyCount[tokenId]
    delete stats.copyCount[tokenId]
    delete stats.lastCopy[tokenId]
    saveStats(stats)
  }
}

/**
 * 格式化时间
 */
export function formatLastUsed(timestamp) {
  if (!timestamp) return '从未使用'

  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 月前`
}
