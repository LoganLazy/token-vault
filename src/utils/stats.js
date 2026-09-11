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
    console.error('Failed to load stats:', e)
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

  // 记录详细历史
  recordCopyHistory(tokenId)
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

/**
 * 获取 token 的历史记录（包括详细的复制历史）
 */
function getTokenHistory(tokenId) {
  const historyKey = `totp-hub-token-history-${tokenId}`
  try {
    const data = localStorage.getItem(historyKey)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error('Failed to load token history:', e)
    return null
  }
}

/**
 * 记录详细的复制历史（用于趋势分析）
 */
export function recordCopyHistory(tokenId) {
  const historyKey = `totp-hub-token-history-${tokenId}`
  try {
    const history = getTokenHistory(tokenId) || {
      copyCount: 0,
      copyHistory: []
    }

    history.copyCount++
    history.copyHistory.push(Date.now())

    // 只保留最近 30 天的记录
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    history.copyHistory = history.copyHistory.filter(t => t >= thirtyDaysAgo)

    localStorage.setItem(historyKey, JSON.stringify(history))
  } catch (e) {
    console.error('Failed to record copy history:', e)
  }
}

/**
 * 获取使用趋势（最近7天）
 */
export function getUsageTrend(tokens) {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  // 初始化最近7天的数据
  const trendMap = {}
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
    trendMap[dateStr] = 0
  }

  // 统计每天的复制次数
  tokens.forEach(token => {
    const history = getTokenHistory(token.id)
    if (history && history.copyHistory) {
      history.copyHistory.forEach(timestamp => {
        if (timestamp >= sevenDaysAgo) {
          const date = new Date(timestamp)
          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
          if (trendMap[dateStr] !== undefined) {
            trendMap[dateStr]++
          }
        }
      })
    }
  })

  return Object.keys(trendMap).map(date => ({
    date,
    count: trendMap[date]
  }))
}

/**
 * 获取分类分布
 */
export function getCategoryDistribution(tokens) {
  const categoryMap = {}

  tokens.forEach(token => {
    const category = token.category || 'other'
    const history = getTokenHistory(token.id)
    const count = history?.copyCount || 0

    if (!categoryMap[category]) {
      categoryMap[category] = { name: getCategoryName(category), value: 0 }
    }
    categoryMap[category].value += count
  })

  return Object.values(categoryMap).filter(item => item.value > 0)
}

/**
 * 获取时段分布
 */
export function getHourlyDistribution(tokens) {
  const hourMap = {}
  for (let i = 0; i < 24; i++) {
    hourMap[i] = 0
  }

  tokens.forEach(token => {
    const history = getTokenHistory(token.id)
    if (history && history.copyHistory) {
      history.copyHistory.forEach(timestamp => {
        const hour = new Date(timestamp).getHours()
        hourMap[hour]++
      })
    }
  })

  return Object.keys(hourMap).map(hour => ({
    hour: `${hour}:00`,
    count: hourMap[hour]
  })).filter(item => item.count > 0)
}

function getCategoryName(categoryId) {
  const names = {
    work: '工作',
    personal: '个人',
    finance: '金融',
    social: '社交',
    dev: '开发',
    gaming: '游戏',
    other: '其他'
  }
  return names[categoryId] || '其他'
}
