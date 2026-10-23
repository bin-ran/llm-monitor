# LLM Monitor · 项目说明

## 项目定位

桌面应用，用于集中查看多家大模型开放平台的账户余额，并按阈值告警。当前接入 4 个支持官方 API 查询余额的平台。

## 技术栈

- Electron 45（主进程 + preload + 托盘）
- Vue 3.5 + `<script setup>` / Pinia 4 / vue-router 5（`unplugin-vue-router` 文件式路由）
- Vite 8 / TypeScript 6 / UnoCSS（wind4 + presetIcons）
- pnpm（`pnpm-workspace.yaml` 中配置了 electron 相关构建白名单）

## 目录结构

```
electron/            # 主进程（Node 环境）
  main.ts            # 应用入口：窗口、托盘、生命周期
  preload.ts         # contextBridge 暴露 window.llmMonitor
  config.ts          # 配置读写，API Key 用 safeStorage 加密
  ipc.ts             # ipcMain 处理器
  refresh.ts         # 自动刷新调度 + 低余额通知
  tray.ts            # 托盘图标与菜单
  providers/         # 各平台余额适配器
src/
  shared/provider.ts # 主进程与渲染层共用的领域模型
  stores/providers.ts
  components/ProviderCard.vue
  pages/index.vue    # 总览仪表盘
  pages/settings.vue # API Key / 阈值 / 刷新设置
```

## 常用命令

```bash
pnpm electron:dev      # 开发模式（Electron + DevTools）
pnpm type-check        # vue-tsc 类型检查（含 electron/）
pnpm lint              # ESLint
pnpm build-only        # 仅构建渲染层
pnpm electron:build    # 打包安装包（electron-builder）
```

## 已接入的平台与余额接口

| 平台 | 接口 | 凭据 | 可用字段 |
| --- | --- | --- | --- |
| DeepSeek | `GET https://api.deepseek.com/user/balance` | API Key | 总额、充值余额、赠送余额 |
| Kimi | `GET https://api.moonshot.cn/v1/users/me/balance` | API Key | 可用余额、代金券、现金 |
| 智谱 GLM | `GET https://www.bigmodel.cn/api/biz/account/query-customer-account-report` | API Key | 可用余额、充值、赠送、累计消费、Coding Plan 额度 |
| MiniMax | `GET https://api.minimaxi.com/account/query_balance` | API Key | 可用余额、现金、代金券、授信、欠费 |
| 小米 MiMo | `GET https://platform.xiaomimimo.com/api/v1/balance` | 登录态 Cookie | 总余额、现金、赠送、冻结 |
| 千问AI平台 | 阿里云 BSS `QueryAccountBalance`（`business.aliyuncs.com`） | RAM AccessKey | 可用额度、现金可用、授信、欠费 |

## 约束与注意事项

- 所有第三方请求由主进程发起，渲染层只通过 IPC 通信，避免 CORS。
- 凭据只落在本机配置文件（`%APPDATA%/llm-monitor/config.json`），由 Electron `safeStorage`（Windows DPAPI）加密，禁止写入日志或提交到仓库。
- 阿里云 BSS 签名必须走官方 SDK `@alicloud/bssopenapi20171214`（ACS3-HMAC-SHA256），手写旧版 HMAC-SHA1 已被淘汰；SDK 为 CommonJS，主进程用 `createRequire` 加载。
- 小米 MiMo 用 `persist:mimo` 独立会话分区做网页登录抓 Cookie，Cookie 过期需重新登录。
- 智谱的 Coding Plan 额度属于非公开接口，可能随时变更，适配器已做失败降级。
- 仓库不配置远端同步推送，提交后由使用者自行推送。
