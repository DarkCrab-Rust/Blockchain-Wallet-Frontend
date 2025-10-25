# Global Wallet State & setCurrentWallet 使用说明

本文档记录前端全局钱包状态的约定、`setCurrentWallet` 的使用场景与限制，帮助团队在多页面并发切换下保持一致、稳定的行为。

## 背景
- 全局钱包状态由 `WalletContext` 提供：
  - `currentWallet: string | null`：当前选择的钱包名（单一来源）
  - `wallets: Wallet[]`：钱包列表（来自 API）
  - `setCurrentWallet(name: string | null)`：设置当前全局钱包名，并同步到 `localStorage('current_wallet')`
  - `refreshWallets(): Promise<void>`：拉取钱包列表，若 `currentWallet` 为空且列表非空，则默认选第一个钱包
- 已实现跨标签页同步：当其它标签修改 `localStorage('current_wallet')` 时，会通过 `storage` 事件即时更新全局状态。

## 使用场景
- 页面默认选中逻辑：
  - `currentWallet` 不为空 → 使用该钱包名
  - `currentWallet` 为空且 `wallets` 非空 → 默认使用 `wallets[0].name`
- 设置全局钱包：
  - 在设置页或导航处切换钱包时，调用 `setCurrentWallet(name)`，该操作会：
    - 更新 `WalletContext` 中的 `currentWallet`
    - 写入 `localStorage('current_wallet')`，从而触发其它标签页同步
- 列表与显示：
  - 列表区使用 API 返回的 `wallets` 显示详细信息
  - 概览与刷新等依赖“当前账户”的区域使用 `currentWallet ?? wallets[0]?.name`

## 限制与注意事项
- `name` 必须为已存在的钱包名；传入不存在的名字可能导致后续 API 报错或数据为空。
- 不要在每次渲染周期内频繁调用 `setCurrentWallet`，仅在用户交互（选择切换）时调用。
- 并发拉取：
  - 避免与 `refreshWallets` 竞争条件：如需在拉取列表后设置默认钱包，请在 `refreshWallets` 完成后再调用。
  - 组件内应避免在 `useEffect` 中同时调用 `setCurrentWallet` 与 `refreshWallets`，除非有严格的依赖控制。
- 跨标签页同步：
  - 仅在同源标签页有效（浏览器 `storage` 事件约束）
  - 不会跨浏览器或跨设备同步（这属于后端会话范畴）

## 多页面并发切换建议
- 典型并发场景：用户在 Wallet、Bridge、Send、Settings 多页面来回切换或在多个标签页同时操作。
- 建议：
  - 页面初始化时使用 `currentWallet ?? wallets[0]?.name` 作为默认值，避免空值
  - 所有发起交易/跨链/刷新余额的函数都以“当前钱包名”作为输入；若无名则直接提示错误
  - 对性能敏感的按钮（如刷新余额）建议加入节流或最小间隔（如 1–2s）

## 性能监控与优化
- 已在以下流程加入性能计时（`console.time` / `console.timeEnd`）：
  - `WalletContext.refreshWallets`
  - `WalletPage.fetchOverviewBalance`
  - `WalletPage.handleRefreshBalance`
  - `BridgePage.handleBridgeAssets`
  - `SendPage.handleSend`
- 观察指标：
  - API 响应时间（从调用到返回）
  - 前端处理耗时（渲染与数据生成，如余额趋势计算）
- 缓存策略建议（可按需启用）：
  - 为余额查询加入短 TTL 缓存（如 10s），按钱包名缓存最近结果，避免短时间内重复请求
  - 当用户手动点击刷新或切换钱包时强制绕过缓存

## 常见问题
- 切换后页面未更新：检查是否使用了旧的局部状态而非 `currentWallet`
- 多标签页切换不生效：确保在 `WalletProvider` 中存在 `storage` 事件监听；同时确认两个标签页同源
- API 慢导致卡顿：优先检查网络与后端；必要时为频繁按钮加入节流、为列表加载加骨架屏；尝试在前端添加短 TTL 缓存

## 最佳实践（Do/Don't）
- Do：
  - 在选择组件的 `onChange` 里调用 `setCurrentWallet`
  - 使用 `currentWallet ?? wallets[0]?.name` 作为默认输入来源
  - 在关键路径加入性能计时，便于定位瓶颈
- Don't：
  - 不要在 `render` 或无交互场景中频繁调用 `setCurrentWallet`
  - 不要在多个地方同时维护“当前钱包”的副本，避免出现不一致

## 参考
- `src/context/WalletContext.tsx`
- `src/pages/SettingsPage/SettingsPage.tsx`
- `src/pages/WalletPage/WalletPage.tsx`
- `src/pages/BridgePage/BridgePage.tsx`
- `src/pages/SendPage/SendPage.tsx`