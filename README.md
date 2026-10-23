# LLM Monitor

一个基于 Electron + Vue 3 + Vite 的桌面应用，用于集中查看多家大模型开放平台的账户余额与用量。

<img src="public/logo-lockup-light.svg" alt="LLM Monitor" width="360" />

## 功能特点

1. 🖥️ 多平台余额聚合展示（DeepSeek / Kimi / 智谱 GLM / MiniMax / 小米 MiMo / 千问AI平台）
2. 🔑 凭据本地加密存储（Electron safeStorage / Windows DPAPI）
3. 🕐 定时自动刷新（可配置间隔）与托盘常驻
4. ⚠️ 低余额阈值告警（系统通知）
5. 🔗 一键跳转各平台控制台充值

## 已接入平台

| 平台 | 余额接口 | 凭据 | 可用字段 |
| --- | --- | --- | --- |
| DeepSeek | `GET api.deepseek.com/user/balance` | API Key | 总额、充值余额、赠送余额 |
| Kimi | `GET api.moonshot.cn/v1/users/me/balance` | API Key | 可用余额、代金券、现金余额 |
| 智谱 GLM | `GET www.bigmodel.cn/api/biz/account/query-customer-account-report` | API Key | 可用余额、充值、赠送、累计消费、Coding Plan 额度 |
| MiniMax | `GET api.minimaxi.com/account/query_balance` | API Key | 可用余额、现金、代金券、授信、欠费 |
| 小米 MiMo | `GET platform.xiaomimimo.com/api/v1/balance` | 登录态 Cookie | 总余额、现金、赠送、冻结 |
| 千问AI平台 | 阿里云 BSS `QueryAccountBalance` | RAM AccessKey | 可用额度、现金可用、授信、欠费 |

> **小米 MiMo**：官方未开放余额接口，只能用登录态 Cookie。设置页点「登录获取」会弹出登录窗口，登录成功后自动抓取并加密保存 Cookie。
> **千问AI平台**：模型 API Key 无法查询余额，需要阿里云 RAM 密钥（`bssapi:QueryAccountBalance` 只读权限）；签名交由官方 SDK `@alicloud/bssopenapi20171214` 处理。
> 各平台的「用量明细」多数没有公开 API，本应用只聚合余额。

## 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue 3](https://v3.vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Pinia](https://pinia.vuejs.org/) - 状态管理
- [UnoCSS](https://uno.antfu.me/) - 原子化 CSS 引擎
- [Vue Router](https://router.vuejs.org/) - 官方路由
- [VueUse](https://vueuse.org/) - Vue 组合式工具集

## 环境要求

- Node.js >= 20.0.0 || >= 22.0.0 || >= 24.0.0
- pnpm

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动 Electron 开发环境
pnpm electron:dev
```

### 构建与打包

```bash
# 构建并生成 Windows 安装包（输出到 release/<version>/）
pnpm electron:build

# 仅打包目录、不生成安装包
pnpm electron:preview
```

安装包产物：`release/0.0.1/LLM Monitor-0.0.1-Setup.exe`（NSIS，可选择安装目录）。

### 其他命令

```bash
# TypeScript 类型检查
pnpm type-check

# 代码格式化
pnpm format

# ESLint 检查并自动修复
pnpm lint

# 单元测试（适配器解析与错误识别）
pnpm test
```

## Logo 设计

Logo 在 Figma 中设计（页面 `Logo` → 分区 `06 · LLM-MONITOR · CONCEPTS` / `07 · LLM-MONITOR · FINAL` / `08 · LLM-MONITOR · CONCEPTS V2`），
设计模型：第一批与成品 **MiniMax-M3.1-Flash**，第二批 **GLM（glm-5.3-flash）**（均经 pi coding agent）。

成品资产在 `public/`（`favicon.ico`、`logo.svg`、`logo-mono.svg`、`logo-inverted.svg`、`logo-lockup*.svg`、`icon-*.png`），
概念方案与使用规范见 [`design/README.md`](design/README.md)。

## 项目结构

```
.
├── electron/          # Electron 主进程
│   ├── main.ts       # 应用入口（窗口、托盘、生命周期）
│   ├── preload.ts    # 预加载脚本，暴露 window.llmMonitor
│   ├── config.ts     # 配置读写与密钥加密
│   ├── ipc.ts        # IPC 处理器
│   ├── refresh.ts    # 自动刷新调度与余额告警
│   ├── tray.ts       # 托盘图标与菜单
│   └── providers/    # 各平台余额适配器
├── src/              # 渲染进程（Vue 应用）
│   ├── shared/       # 主进程与渲染层共用类型
│   ├── components/   # 通用组件
│   ├── pages/        # 页面组件（总览 / 设置）
│   ├── router/       # 路由配置
│   ├── stores/       # Pinia 状态管理
│   ├── utils/        # 工具函数
│   ├── styles/       # 全局样式
│   ├── App.vue       # 根组件
│   ├── main.ts       # 应用入口
│   └── electron.d.ts # Electron 类型定义
├── design/           # Logo 设计说明与概念方案
├── dist/             # 渲染进程构建输出
├── dist-electron/    # 主进程构建输出
└── package.json      # 项目配置
```

## 平台支持

- ✅ Windows
- ✅ macOS
- ✅ Linux

## 许可证

MIT
