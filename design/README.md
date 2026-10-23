# LLM Monitor · Logo 设计说明

设计来源：Figma 文件 `uW3sGV9Gf6O2l5vI4xkEpj` → 页面 **Logo** → 分区
`06 · LLM-MONITOR · CONCEPTS`（概念 V1）、`07 · LLM-MONITOR · FINAL`（成品）、
`08 · LLM-MONITOR · CONCEPTS V2`（概念 V2）。

> 设计模型署名（逐批次）：第一批 + 成品 **MiniMax-M3.1-Flash**（pi coding agent / `cc-switch-mini-max`）；
> 第二批 V2 **GLM（glm-5.3-flash）**（pi coding agent / `cc-switch-zhipu-glm`）。已在 Figma 各分区底部标注。
> 方案由 AI 生成，最终取舍需人工确认。

## 概念方案

### 第一批（V1 · 徽章语族）

| 方案 | 意象 | 文件 |
| --- | --- | --- |
| A · Pulse | 心电/信号波形 + 实时数据点 | `concepts/a-pulse.svg` |
| B · Radar | 多层扫描弧 = 多平台聚合雷达 | `concepts/b-radar.svg` |
| C · M Bars | 字母 M（Monitor），告警平台用暖色腿 | `concepts/c-m-bars.svg` |
| D · Chip | AI 芯片 + 内部信号线 | `concepts/d-chip-eye.svg` |
| E · Gauge | 余额仪表盘 + 指针 | `concepts/e-gauge.svg` |
| F · Balance Bars | 多平台余额柱阵，末位为告警色 | `concepts/f-balance-bars.svg` |

### 第二批（V2 · 换视觉语族，GLM · glm-5.3-flash）

| 方案 | 意象 | 文件 |
| --- | --- | --- |
| G · Sparkline | 应用窗口 + 走势线，桌面监控面板 | `concepts-v2/g-sparkline.svg` |
| H · Converge | 三条来源线汇入监测节点 = 多平台聚合 | `concepts-v2/h-converge.svg` |
| J · Orbital | 监测核 + 轨道平台点（原子感） | `concepts-v2/j-orbital.svg` |
| K · Sticker | 新粗野主义贴纸风：粗描边 + 硬投影 | `concepts-v2/k-sticker.svg` |
| L · Ring | 极简进度环，3/4 主色 + 1/4 告警色 | `concepts-v2/l-ring.svg` |
| M · Pixel | 8-bit 像素脉冲，终端/极客气质 | `concepts-v2/m-pixel.svg` |
| N · Terminal | 终端提示符 `>_`，开发者工具身份 | `concepts-v2/n-terminal.svg` |
| O · Shield | 盾牌 + 脉冲，API Key 本地加密的安全感 | `concepts-v2/o-shield.svg` |

## 采用方案：A · Pulse（第一批；第二批备选 G / H / O）

青色渐变圆角方块 + 白色监控波形 + 桃色数据点：

- **波形**＝对多家 LLM 平台用量的持续监测
- **桃色圆点**＝实时数据点 / 余额告警信号（与项目 confetti 配色 `#F2A679` 一致）
- **青色渐变**＝沿用应用主色 teal（`#0D9488`）

## 颜色

| 用途 | 色值 |
| --- | --- |
| 渐变起点 | `#22D3EE` |
| 渐变中段（主色 teal-600） | `#0D9488` |
| 渐变终点 | `#0F766E` |
| 告警 / 数据点 | `#F2A679` |
| 深色底 | `#0B1220` |
| 浅色底 | `#FFFFFF` |

## 交付资产（`public/`）

| 文件 | 用途 |
| --- | --- |
| `favicon.ico` | 浏览器标签页 / Electron 窗口 / Windows 安装包图标（16→256 共 6 档） |
| `logo.svg` | 应用图标（渐变底），界面内使用 |
| `logo-mono.svg` | 单色版（透明底、青色图形），浅色界面与单色印刷 |
| `logo-inverted.svg` | 反白版（深色底 + 白色图形） |
| `logo-lockup.svg` / `logo-lockup-light.svg` | 图标 + 文字组合（浅底 / 深底） |
| `icon-16/32/64/128/256/512.png` | 位图图标 |

## 使用规范

- 界面内最小尺寸 16px，低于 64px 建议改用 `logo-mono.svg` 或仅保留波形主体。
- 图标四周留白不低于图形高度的 10%。
- 不要改变圆角比例（1024 画布下 rx = 224）与波形线宽比例。
- 深浅底分别使用 `logo-lockup.svg` 与 `logo-lockup-light.svg`，不要自行反色。
