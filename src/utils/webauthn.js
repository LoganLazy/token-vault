/**
 * WebAuthn 生物识别工具函数
 * 支持指纹、面容 ID、Windows Hello 等
 */

/**
 * 检测浏览器是否支持 WebAuthn
 */
export function isWebAuthnAvailable() {
  return (
    window.PublicKeyCredential !== undefined &&
    navigator.credentials !== undefined &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  )
}

/**
 * 检测平台是否支持生物识别
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnAvailable()) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (e) {
    console.warn('Platform authenticator check failed:', e)
    return false
  }
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 注册 WebAuthn 凭据
 */
export async function registerCredential(userId = 'totp-hub-user') {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn 不受支持')
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    // 获取有效的 RP ID（支持 localhost 和 127.0.0.1）
    const getRpId = () => {
      const hostname = window.location.hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'localhost'
      }
      return hostname
    }

    const publicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: 'Token Vault',
        id: getRpId()
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: 'Token Vault User'
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (推荐)
        { alg: -257, type: 'public-key' }  // RS256 (备用)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // 平台认证器（指纹/面容）
        userVerification: 'required',        // 要求用户验证
        requireResidentKey: false            // 不需要常驻密钥
      },
      timeout: 60000,
      attestation: 'none' // 不需要证明
    }

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })

    if (!credential) {
      throw new Error('凭据创建失败')
    }

    // 存储凭据 ID
    const credentialId = arrayBufferToBase64(credential.rawId)
    localStorage.setItem('webauthn-credential-id', credentialId)
    localStorage.setItem('webauthn-enabled', 'true')

    return {
      credentialId,
      success: true
    }
  } catch (error) {
    console.error('WebAuthn 注册失败:', error)

    // 处理常见错误
    if (error.name === 'NotAllowedError') {
      throw new Error('用户取消了生物识别注册')
    } else if (error.name === 'InvalidStateError') {
      throw new Error('凭据已存在，请先删除旧凭据')
    } else if (error.name === 'NotSupportedError') {
      throw new Error('设备不支持生物识别')
    } else if (error.name === 'SecurityError') {
      throw new Error('需要在 HTTPS 环境下使用')
    } else {
      throw new Error(error.message || '注册失败，请重试')
    }
  }
}

/**
 * 验证 WebAuthn 凭据
 */
export async function authenticateCredential() {
  if (!isWebAuthnAvailable()) {
    throw new Error('WebAuthn 不受支持')
  }

  const credentialId = localStorage.getItem('webauthn-credential-id')
  if (!credentialId) {
    throw new Error('未找到凭据，请先注册')
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    const publicKeyCredentialRequestOptions = {
      challenge: challenge,
      allowCredentials: [{
        id: base64ToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'] // 平台认证器
      }],
      userVerification: 'required',
      timeout: 60000
    }

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    })

    if (!assertion) {
      throw new Error('验证失败')
    }

    return {
      success: true,
      credentialId: arrayBufferToBase64(assertion.rawId)
    }
  } catch (error) {
    console.error('WebAuthn 验证失败:', error)

    if (error.name === 'NotAllowedError') {
      throw new Error('用户取消了生物识别验证')
    } else if (error.name === 'InvalidStateError') {
      throw new Error('凭据无效，请重新注册')
    } else if (error.name === 'NotSupportedError') {
      throw new Error('设备不支持生物识别')
    } else {
      throw new Error(error.message || '验证失败，请重试')
    }
  }
}

/**
 * 删除 WebAuthn 凭据
 */
export function deleteCredential() {
  localStorage.removeItem('webauthn-credential-id')
  localStorage.setItem('webauthn-enabled', 'false')
}

/**
 * 检查是否已启用 WebAuthn
 */
export function isWebAuthnEnabled() {
  return localStorage.getItem('webauthn-enabled') === 'true'
}

/**
 * 获取设备类型描述
 */
export function getDeviceTypeDescription() {
  const ua = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(ua)) {
    return 'Touch ID / Face ID'
  } else if (/android/.test(ua)) {
    return '指纹识别 / 面部识别'
  } else if (/mac/.test(ua)) {
    return 'Touch ID'
  } else if (/windows/.test(ua)) {
    return 'Windows Hello'
  } else {
    return '生物识别'
  }
}
