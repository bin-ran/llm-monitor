import deepseekLogo from '../assets/providers/deepseek.ico'
import kimiLogo from '../assets/providers/kimi.ico'
import minimaxLogo from '../assets/providers/minimax.ico'
import mimoLogo from '../assets/providers/mimo.png'
import qwenLogo from '../assets/providers/qwen.svg'
import zhipuLogo from '../assets/providers/zhipu.png'

import type { ProviderId } from '../shared/provider'

/**
 * 各厂商官方 logo，取自官网 favicon/品牌资源，保持原色不做重着色
 */
export const PROVIDER_LOGOS: Record<ProviderId, string> = {
  deepseek: deepseekLogo,
  kimi: kimiLogo,
  zhipu: zhipuLogo,
  minimax: minimaxLogo,
  mimo: mimoLogo,
  qwen: qwenLogo,
}
