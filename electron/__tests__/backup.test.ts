import { describe, expect, it } from 'vitest'

import { BACKUP_FORMAT, decryptBackup, encryptBackup } from '../backup'
import type { AppSettings, ProviderCredential, ProviderId } from '../../src/shared/provider'

const SETTINGS: AppSettings = {
  autoRefreshEnabled: true,
  refreshIntervalSeconds: 300,
  thresholds: { deepseek: 20, tokenhub: 10 },
}

const CREDENTIALS: Partial<Record<ProviderId, ProviderCredential>> = {
  deepseek: { apiKey: 'sk-secret-value' },
  tokenhub: { secretId: 'AKID123', secretKey: 'secret-key-value' },
}

const PASSWORD = 'correct-horse-battery'

describe('配置备份加解密', () => {
  it('正确密码能还原设置与凭据', () => {
    const file = encryptBackup({ settings: SETTINGS, credentials: CREDENTIALS }, PASSWORD)

    expect(JSON.parse(file).format).toBe(BACKUP_FORMAT)
    expect(JSON.parse(file).data).not.toContain('sk-secret-value')
    expect(decryptBackup(file, PASSWORD)).toEqual({ settings: SETTINGS, credentials: CREDENTIALS })
  })

  it('密码错误或文件被篡改时拒绝导入', () => {
    const file = encryptBackup({ settings: SETTINGS, credentials: CREDENTIALS }, PASSWORD)
    expect(() => decryptBackup(file, 'wrong-password')).toThrow('密码错误或文件已被篡改')

    const parsed = JSON.parse(file)
    parsed.data = Buffer.from('tampered').toString('base64')
    expect(() => decryptBackup(JSON.stringify(parsed), PASSWORD)).toThrow('密码错误或文件已被篡改')
  })

  it('拒绝短密码和非法格式', () => {
    expect(() => encryptBackup({ settings: SETTINGS, credentials: {} }, 'short')).toThrow('至少 8 位')
    expect(() => decryptBackup('{}', PASSWORD)).toThrow('不是支持的备份文件格式')
  })
})
