import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DecryptedSecret } from '../secret-vault'

const mockState = vi.hoisted(() => ({ userDataPath: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => mockState.userDataPath },
}))

const { ConfigStore } = await import('../config')

/** 可控制「系统密钥是否轮换」的假保险箱，避免依赖真实 safeStorage */
class FakeVault {
  shouldRotate = false
  encryptCount = 0

  async isAvailable(): Promise<boolean> {
    return true
  }

  async encrypt(plain: string): Promise<string> {
    this.encryptCount += 1
    return `enc:${Buffer.from(plain, 'utf-8').toString('base64')}`
  }

  async decrypt(stored: string): Promise<DecryptedSecret> {
    if (!stored.startsWith('enc:')) return { value: null, shouldReEncrypt: false }
    return {
      value: Buffer.from(stored.slice(4), 'base64').toString('utf-8'),
      shouldReEncrypt: this.shouldRotate,
    }
  }
}

function createStore(vault: FakeVault): InstanceType<typeof ConfigStore> {
  return new ConfigStore(vault)
}

beforeEach(() => {
  mockState.userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'llm-monitor-test-'))
})

describe('ConfigStore', () => {
  it('并发保存不同平台时不会互相覆盖', async () => {
    const vault = new FakeVault()
    const store = createStore(vault)

    await Promise.all([
      store.saveCredential('deepseek', { apiKey: 'deepseek-key' }),
      store.saveCredential('kimi', { apiKey: 'kimi-key' }),
    ])

    expect(await store.readCredential('deepseek')).toEqual({ apiKey: 'deepseek-key' })
    expect(await store.readCredential('kimi')).toEqual({ apiKey: 'kimi-key' })
  })

  it('系统密钥轮换后写回新密文', async () => {
    const vault = new FakeVault()
    const store = createStore(vault)

    await store.saveCredential('kimi', { apiKey: 'kimi-key' })
    expect(vault.encryptCount).toBe(1)

    vault.shouldRotate = true
    expect(await store.readCredential('kimi')).toEqual({ apiKey: 'kimi-key' })
    expect(vault.encryptCount).toBe(2)

    // 再次读取时已无需轮换，密文保持可解密
    vault.shouldRotate = false
    expect(await store.readCredential('kimi')).toEqual({ apiKey: 'kimi-key' })
    expect(vault.encryptCount).toBe(2)
  })

  it('保存与轮换并发执行时都不丢失', async () => {
    const vault = new FakeVault()
    const store = createStore(vault)

    await store.saveCredential('deepseek', { apiKey: 'deepseek-key' })

    vault.shouldRotate = true
    await Promise.all([
      store.readCredential('deepseek'),
      store.saveCredential('mimo', { cookie: 'mimo-cookie' }),
    ])

    expect(await store.readCredential('deepseek')).toEqual({ apiKey: 'deepseek-key' })
    expect(await store.readCredential('mimo')).toEqual({ cookie: 'mimo-cookie' })
  })

  it('删除凭据后返回 null', async () => {
    const vault = new FakeVault()
    const store = createStore(vault)

    await store.saveCredential('zhipu', { apiKey: 'zhipu-key' })
    await store.removeCredential('zhipu')

    expect(await store.readCredential('zhipu')).toBeNull()
  })

  it('设置与窗口位置分别持久化，互不覆盖', async () => {
    const vault = new FakeVault()
    const store = createStore(vault)

    await store.updateSettings({ refreshIntervalSeconds: 600, thresholds: { kimi: 10 } })
    await store.saveWindowBounds({ x: 1, y: 2, width: 800, height: 500 })

    const settings = store.read()
    expect(settings.refreshIntervalSeconds).toBe(600)
    expect(settings.thresholds).toEqual({ kimi: 10 })
    expect(store.readWindowBounds()).toEqual({ x: 1, y: 2, width: 800, height: 500 })
  })
})
