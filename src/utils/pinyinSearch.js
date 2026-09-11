import { pinyin } from 'pinyin-pro'

/**
 * 拼音搜索工具
 */

/**
 * 为文本生成拼音索引
 * @param {string} text - 中文文本
 * @returns {object} - { full: 完整拼音, first: 首字母 }
 */
export function generatePinyinIndex(text) {
  if (!text) return { full: '', first: '' }

  // 获取完整拼音（带音调）
  const fullPinyin = pinyin(text, {
    toneType: 'none', // 无音调
    type: 'array'
  }).join('')

  // 获取首字母
  const firstLetters = pinyin(text, {
    pattern: 'first',
    toneType: 'none'
  }).toLowerCase()

  return {
    full: fullPinyin.toLowerCase(),
    first: firstLetters.toLowerCase()
  }
}

/**
 * 拼音搜索匹配
 * @param {string} searchText - 搜索文本（中文）
 * @param {string} query - 查询关键词（中文或拼音）
 * @returns {boolean} - 是否匹配
 */
export function pinyinMatch(searchText, query) {
  if (!searchText || !query) return false

  const lowerQuery = query.toLowerCase()
  const lowerText = searchText.toLowerCase()

  // 1. 直接匹配（中文或英文）
  if (lowerText.includes(lowerQuery)) {
    return true
  }

  // 2. 拼音匹配
  const { full, first } = generatePinyinIndex(searchText)

  // 完整拼音匹配
  if (full.includes(lowerQuery)) {
    return true
  }

  // 首字母匹配
  if (first.includes(lowerQuery)) {
    return true
  }

  return false
}

/**
 * 高亮匹配的部分（支持拼音）
 * @param {string} text - 原始文本
 * @param {string} query - 查询关键词
 * @returns {Array} - 高亮片段数组
 */
export function highlightPinyinMatch(text, query) {
  if (!text || !query) return [{ text, highlight: false }]

  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // 直接匹配的情况（保留原有逻辑）
  if (lowerText.includes(lowerQuery)) {
    const parts = []
    let remaining = text
    let remainingLower = lowerText

    while (remainingLower.includes(lowerQuery)) {
      const index = remainingLower.indexOf(lowerQuery)

      if (index > 0) {
        parts.push({ text: remaining.substring(0, index), highlight: false })
      }

      parts.push({
        text: remaining.substring(index, index + query.length),
        highlight: true
      })

      remaining = remaining.substring(index + query.length)
      remainingLower = remainingLower.substring(index + query.length)
    }

    if (remaining) {
      parts.push({ text: remaining, highlight: false })
    }

    return parts
  }

  // 拼音匹配的情况 - 简化处理，整体高亮
  const { full, first } = generatePinyinIndex(text)
  if (full.includes(lowerQuery) || first.includes(lowerQuery)) {
    return [{ text, highlight: true }]
  }

  return [{ text, highlight: false }]
}

/**
 * 为账号数组生成搜索索引
 * @param {Array} tokens - 账号数组
 * @returns {Array} - 带拼音索引的账号数组
 */
export function indexTokens(tokens) {
  return tokens.map(token => ({
    ...token,
    _pinyinIndex: {
      issuer: generatePinyinIndex(token.issuer || ''),
      account: generatePinyinIndex(token.account || '')
    }
  }))
}

/**
 * 拼音搜索过滤
 * @param {Array} tokens - 账号数组（需先通过 indexTokens 处理）
 * @param {string} query - 查询关键词
 * @returns {Array} - 匹配的账号数组
 */
export function filterTokensByPinyin(tokens, query) {
  if (!query) return tokens

  return tokens.filter(token => {
    // 直接匹配
    if (pinyinMatch(token.issuer, query)) return true
    if (pinyinMatch(token.account, query)) return true

    return false
  })
}
