/**
 * 多语言支持
 * 支持中文和英文
 */

export const LANGUAGES = {
  'zh-CN': '简体中文',
  'en-US': 'English'
}

export const translations = {
  'zh-CN': {
    // 通用
    'app.name': 'TOTP Hub',
    'app.tagline': '安全便捷的两步验证码管理工具',
    'common.close': '关闭',
    'common.cancel': '取消',
    'common.confirm': '确定',
    'common.save': '保存',
    'common.delete': '删除',
    'common.add': '添加',
    'common.edit': '编辑',
    'common.search': '搜索',
    'common.or': '或',
    'common.loading': '加载中...',

    // 头部
    'header.lock': '锁定',
    'header.unlock': '解锁',
    'header.backup': '备份',
    'header.settings': '设置',
    'header.shortcuts': '快捷键',
    'header.batchSelect': '批量选择',

    // 搜索和筛选
    'search.placeholder': '搜索账号或服务商...',
    'search.results': '{{count}} / {{total}}',
    'category.all': '全部',
    'category.personal': '个人',
    'category.work': '工作',
    'category.finance': '金融',
    'category.social': '社交',
    'category.dev': '开发',
    'category.other': '其他',

    // Token 卡片
    'token.copy': '复制验证码',
    'token.copied': '已复制',
    'token.delete': '删除',
    'token.expiresIn': '剩余 {{seconds}} 秒',

    // 添加 Token
    'addToken.title': '添加两步验证账号',
    'addToken.scan': '扫码',
    'addToken.importUri': 'URI 导入',
    'addToken.batchImport': '批量导入',
    'addToken.manualInput': '或手动填写',
    'addToken.category': '分类',
    'addToken.issuer': '服务商',
    'addToken.issuerPlaceholder': '如 Google, GitHub',
    'addToken.account': '账号',
    'addToken.accountPlaceholder': '邮箱或用户名',
    'addToken.secret': '密钥',
    'addToken.secretPlaceholder': '16 位或更长的密钥',
    'addToken.advanced': '高级选项',
    'addToken.algorithm': '算法',
    'addToken.digits': '位数',
    'addToken.period': '周期(秒)',
    'addToken.submit': '添加账号',
    'addToken.batchTitle': '批量导入账号',
    'addToken.batchPlaceholder': 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example\notpauth://totp/GitHub:username?secret=ABCDEFGHIJKLMNOP&issuer=GitHub\n...',
    'addToken.batchHint': '💡 支持从 Google Authenticator、Authy 等应用导出的 URI 列表',
    'addToken.import': '导入',

    // 主密码
    'password.setup': '设置主密码',
    'password.verify': '输入主密码',
    'password.remove': '移除主密码',
    'password.change': '修改主密码',
    'password.setupDesc': '设置主密码以加密保护您的所有验证码数据',
    'password.verifyDesc': '请输入主密码以解锁应用',
    'password.removeDesc': '请输入当前密码以移除保护并解密数据',
    'password.label': '密码',
    'password.labelMain': '主密码',
    'password.confirm': '确认密码',
    'password.show': '显示密码',
    'password.hide': '隐藏密码',
    'password.strength': '密码强度',
    'password.strengthWeak': '弱',
    'password.strengthMedium': '中',
    'password.strengthStrong': '强',
    'password.error': '密码错误',
    'password.mismatch': '两次输入的密码不一致',

    // 生物识别
    'biometric.unlock': '使用 {{type}} 解锁',
    'biometric.usePassword': '使用密码解锁',
    'biometric.useBiometric': '切换到生物识别',
    'biometric.orPassword': '或使用下方密码输入框',
    'biometric.verifying': '验证中...',
    'biometric.title': '生物识别解锁',
    'biometric.desc': '使用 {{type}} 快速解锁应用',
    'biometric.enabled': '已启用',
    'biometric.disabled': '未启用',
    'biometric.enable': '启用',
    'biometric.disable': '禁用',
    'biometric.notSupported': '您的设备或浏览器不支持生物识别功能',
    'biometric.hint': '💡 启用后，下次解锁时可使用生物识别，无需输入密码',

    // 设置
    'settings.title': '应用设置',
    'settings.timeout': '会话超时时间',
    'settings.timeoutDesc': '无操作自动锁定应用的时间。锁定前 30 秒会显示提醒。',
    'settings.timeoutWarning': '⚠️ 禁用自动锁定会降低安全性，仅建议在私人设备上使用',
    'settings.language': '语言',
    'settings.languageDesc': '选择应用界面语言',
    'settings.save': '保存设置',

    // 备份
    'backup.title': '备份与恢复',
    'backup.export': '导出备份',
    'backup.import': '导入备份',
    'backup.exportDesc': '导出所有账号数据为加密的 JSON 文件',
    'backup.importDesc': '从备份文件恢复账号数据',
    'backup.exportBtn': '导出 JSON',
    'backup.importBtn': '选择文件',
    'backup.encrypted': '🔒 备份文件已加密保护',
    'backup.success': '✅ 备份成功',
    'backup.imported': '✅ 导入成功',

    // Toast 消息
    'toast.copied': '✓ 验证码已复制',
    'toast.deleted': '✓ 账号已删除',
    'toast.added': '✓ 账号已添加',
    'toast.refreshed': '✓ 已刷新',
    'toast.batchDeleted': '✓ 已删除 {{count}} 个账号',
    'toast.batchMoved': '✓ 已移动 {{count}} 个账号',
    'toast.copyFailed': '复制失败，请重试',
    'toast.error': '操作失败',

    // 空状态
    'empty.title': '还没有验证码账号',
    'empty.desc': '点击下方按钮添加第一个账号',
    'empty.noResults': '没有找到匹配的账号',
    'empty.tryAnotherSearch': '试试其他关键词',

    // 批量操作
    'batch.selected': '已选择 {{count}} 个',
    'batch.delete': '批量删除',
    'batch.move': '批量移动',
    'batch.cancel': '取消选择',
    'batch.confirmDelete': '确定要删除 {{count}} 个账号吗？此操作无法撤销。'
  },

  'en-US': {
    // Common
    'app.name': 'TOTP Hub',
    'app.tagline': 'Secure and convenient TOTP manager',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.or': 'or',
    'common.loading': 'Loading...',

    // Header
    'header.lock': 'Lock',
    'header.unlock': 'Unlock',
    'header.backup': 'Backup',
    'header.settings': 'Settings',
    'header.shortcuts': 'Shortcuts',
    'header.batchSelect': 'Batch Select',

    // Search & Filter
    'search.placeholder': 'Search accounts or services...',
    'search.results': '{{count}} / {{total}}',
    'category.all': 'All',
    'category.personal': 'Personal',
    'category.work': 'Work',
    'category.finance': 'Finance',
    'category.social': 'Social',
    'category.dev': 'Development',
    'category.other': 'Other',

    // Token Card
    'token.copy': 'Copy Code',
    'token.copied': 'Copied',
    'token.delete': 'Delete',
    'token.expiresIn': '{{seconds}}s left',

    // Add Token
    'addToken.title': 'Add TOTP Account',
    'addToken.scan': 'Scan QR',
    'addToken.importUri': 'Import URI',
    'addToken.batchImport': 'Batch Import',
    'addToken.manualInput': 'Or enter manually',
    'addToken.category': 'Category',
    'addToken.issuer': 'Service',
    'addToken.issuerPlaceholder': 'e.g. Google, GitHub',
    'addToken.account': 'Account',
    'addToken.accountPlaceholder': 'Email or username',
    'addToken.secret': 'Secret',
    'addToken.secretPlaceholder': '16+ character secret key',
    'addToken.advanced': 'Advanced Options',
    'addToken.algorithm': 'Algorithm',
    'addToken.digits': 'Digits',
    'addToken.period': 'Period(s)',
    'addToken.submit': 'Add Account',
    'addToken.batchTitle': 'Batch Import Accounts',
    'addToken.batchPlaceholder': 'otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example\notpauth://totp/GitHub:username?secret=ABCDEFGHIJKLMNOP&issuer=GitHub\n...',
    'addToken.batchHint': '💡 Supports URI lists exported from Google Authenticator, Authy, etc.',
    'addToken.import': 'Import',

    // Master Password
    'password.setup': 'Setup Master Password',
    'password.verify': 'Enter Master Password',
    'password.remove': 'Remove Master Password',
    'password.change': 'Change Master Password',
    'password.setupDesc': 'Set a master password to encrypt and protect all your TOTP data',
    'password.verifyDesc': 'Please enter your master password to unlock the app',
    'password.removeDesc': 'Enter your current password to remove protection and decrypt data',
    'password.label': 'Password',
    'password.labelMain': 'Master Password',
    'password.confirm': 'Confirm Password',
    'password.show': 'Show Password',
    'password.hide': 'Hide Password',
    'password.strength': 'Password Strength',
    'password.strengthWeak': 'Weak',
    'password.strengthMedium': 'Medium',
    'password.strengthStrong': 'Strong',
    'password.error': 'Incorrect password',
    'password.mismatch': 'Passwords do not match',

    // Biometric
    'biometric.unlock': 'Unlock with {{type}}',
    'biometric.usePassword': 'Use password instead',
    'biometric.useBiometric': 'Switch to biometric',
    'biometric.orPassword': 'Or use password below',
    'biometric.verifying': 'Verifying...',
    'biometric.title': 'Biometric Unlock',
    'biometric.desc': 'Quickly unlock with {{type}}',
    'biometric.enabled': 'Enabled',
    'biometric.disabled': 'Disabled',
    'biometric.enable': 'Enable',
    'biometric.disable': 'Disable',
    'biometric.notSupported': 'Your device or browser does not support biometric authentication',
    'biometric.hint': '💡 Once enabled, you can use biometric authentication to unlock without entering password',

    // Settings
    'settings.title': 'App Settings',
    'settings.timeout': 'Session Timeout',
    'settings.timeoutDesc': 'Auto-lock the app after inactivity. A reminder will show 30 seconds before locking.',
    'settings.timeoutWarning': '⚠️ Disabling auto-lock reduces security. Only recommended for personal devices.',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.save': 'Save Settings',

    // Backup
    'backup.title': 'Backup & Restore',
    'backup.export': 'Export Backup',
    'backup.import': 'Import Backup',
    'backup.exportDesc': 'Export all account data as encrypted JSON file',
    'backup.importDesc': 'Restore account data from backup file',
    'backup.exportBtn': 'Export JSON',
    'backup.importBtn': 'Choose File',
    'backup.encrypted': '🔒 Backup file is encrypted',
    'backup.success': '✅ Backup successful',
    'backup.imported': '✅ Import successful',

    // Toast Messages
    'toast.copied': '✓ Code copied',
    'toast.deleted': '✓ Account deleted',
    'toast.added': '✓ Account added',
    'toast.refreshed': '✓ Refreshed',
    'toast.batchDeleted': '✓ Deleted {{count}} accounts',
    'toast.batchMoved': '✓ Moved {{count}} accounts',
    'toast.copyFailed': 'Copy failed, please try again',
    'toast.error': 'Operation failed',

    // Empty State
    'empty.title': 'No TOTP accounts yet',
    'empty.desc': 'Click the button below to add your first account',
    'empty.noResults': 'No matching accounts found',
    'empty.tryAnotherSearch': 'Try different keywords',

    // Batch Actions
    'batch.selected': '{{count}} selected',
    'batch.delete': 'Delete',
    'batch.move': 'Move',
    'batch.cancel': 'Cancel',
    'batch.confirmDelete': 'Delete {{count}} accounts? This action cannot be undone.'
  }
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage() {
  const saved = localStorage.getItem('totp-hub-language')
  if (saved && translations[saved]) {
    return saved
  }

  // 自动检测浏览器语言
  const browserLang = navigator.language || navigator.userLanguage
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

/**
 * 设置语言
 */
export function setLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem('totp-hub-language', lang)
    return true
  }
  return false
}

/**
 * 翻译函数
 */
export function t(key, params = {}) {
  const lang = getCurrentLanguage()
  let text = translations[lang][key] || translations['en-US'][key] || key

  // 替换参数 {{param}}
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param])
  })

  return text
}

/**
 * React Hook for translations
 */
export function useTranslation() {
  const lang = getCurrentLanguage()

  return {
    t: (key, params) => t(key, params),
    lang,
    setLang: setLanguage
  }
}
