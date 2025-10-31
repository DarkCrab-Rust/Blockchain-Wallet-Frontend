# Enterprise Readiness Checklist

本前端工程已具备面向企业级场景的关键能力与约束。以下是已实现要点与使用说明：

## 全局状态一致性
- 单一来源：`WalletContext` 提供 `currentWallet`、`wallets`、`currentNetwork`，并与 `localStorage` 双向同步。
- 跨页一致：在 `Wallet`、`Send`、`History`、`Bridge`、`Settings` 间导航时保持统一的当前钱包状态。
- 跨标签页同步：借助 `storage` 事件，将 `current_wallet` 与 `current_network` 变化广播到同源标签页。

## 错误处理与用户体验
- 全局错误边界：`components/ErrorBoundary` 捕获渲染异常，显示降级 UI，并可一键刷新；同时通过 `eventBus.emitApiError` 上报。
- 细粒度分类：`services/api.ts` 对后端错误进行分类与友好化，含重试策略、超时、取消、速率限制与权限等场景。
- 错误聚合：`hooks/useApiErrorAggregator` 去重并归档错误消息，通过 `react-hot-toast` 提示用户。

## API 稳健性
- 统一运行时配置：`apiRuntime` 管理 `baseUrl` 与 `apiKey`，支持 `eventBus` 动态更新与 `axios.defaults` 同步。
- 拦截器：统一注入认证头；错误经过增强并上报。
- 幂等与防并发：页面级请求（如历史拉取）使用 `AbortController` 与并发防护避免旧响应覆盖新状态。

## 测试策略
- 集成测试：`App.flow.integration.test.tsx`、`App.create.integration.test.tsx`、`App.bridge.integration.test.tsx` 覆盖恢复/创建/跨链桥跨页一致性。
- 组件测试：`components/__tests__/ErrorBoundary.test.tsx` 验证错误边界降级与刷新逻辑。
- 导航测试：`components/Layout/AppLayout.navigation.test.tsx` 验证侧边栏与各页面标题渲染。

## 配置与特性开关
- `feature_mock`：测试/开发模式下启用本地 Mock，简化端到端路径。
- 运行时展示：`ApiConfigPanel` 与 `BackendHealthPanel` 提供健壮的后端配置与健康检查能力。

## 性能与可观察性
- 性能计时：在关键路径中使用 `console.time/timeEnd`，便于定位瓶颈。
- 取消与节流：对频繁操作加入取消与最小间隔，避免 UI 抖动与资源浪费。

## 使用指南
- 运行测试：`npm test --silent -- --watchAll=false`
- 运行单个测试：`npm test --silent -- App.bridge.integration.test.tsx --watchAll=false`
- 开发预览：`npm start`，建议设置 `PORT` 环境变量；当前预览示例 `http://localhost:3014/`

## 后续建议
- 引入端到端浏览器测试（Playwright）覆盖真实 DOM 与网络。
- 补充 `BridgePage` 的表单交互集成测试（参数校验、提交与成功提示）。
- 对余额/历史等热点接口加入短 TTL 缓存与统一取消策略，减少重复请求。