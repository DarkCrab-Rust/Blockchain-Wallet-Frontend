# 前端集成指南（AI 异常检测）

本指南介绍如何在前端集成异常检测 AI 模块，包含 REST 风险评估、WebSocket 实时事件、以及在发送交易确认弹窗中的联动显示。

## 架构与对接点

- REST 评估接口：`POST /anomaly-detection/detect`
  - 通过 `axios` 发送检测请求，统一返回 `isFraud`、`threatLevel`、`message` 等字段。
- WebSocket 实时事件：开发环境 `ws://localhost:8080/api/anomaly-detection/events`；生产环境请使用 `wss://.../api/anomaly-detection/events`
  - 服务端推送 `transaction_blocked`、`warning_issued`、`detection_completed` 三类事件。
- 前端代理：`package.json` 中配置了 `proxy: http://localhost:8888`，前端请求 `/anomaly-detection/*` 会转发到后端。

## 关键文件

- `src/services/risk.ts`：封装 REST 风险评估 `riskAssess(req)`。
- `src/hooks/useAnomalyEvents.ts`：封装 WebSocket 事件接入与分发。
- `src/utils/threatColors.ts`：威胁等级颜色映射与工具函数 `getThreatColor(level)`。
- `src/pages/SendPage/SendPage.tsx`：确认弹窗中接入风险评估与实时事件显示。

## 使用示例

### 1) 调用 REST 风险评估

```ts
import { riskAssess } from '../services/risk';

const res = await riskAssess({
  from_wallet: 'my-wallet',
  to_address: '0x...',
  amount: 1.23,
  network: 'eth',
});

if (res.isFraud) {
  // 显示警告并阻止发送
}
```

### 2) 订阅 WebSocket 实时事件

```ts
import { useAnomalyEvents } from '../hooks/useAnomalyEvents';

const { connected, lastEvent } = useAnomalyEvents({
  onTransactionBlocked: (evt) => {
    // 显示拦截提示
  },
  onWarningIssued: (evt) => {
    // 显示警告提示
  },
});
```

### 3) 在确认弹窗显示告警

```tsx
{riskWarning && (
  <Alert severity="error" sx={{ mt: 2, borderLeft: '4px solid', borderColor: getThreatColor(lastEvent?.threatLevel) }}>
    {riskWarning}
  </Alert>
)}
```

## 事件类型与建议

- `transaction_blocked`：显示强提示并阻止交易。
- `warning_issued`：显示警告，允许用户确认继续。
- `detection_completed`：用于提示完成，不改变流程。

## 威胁等级与颜色映射

`None/Low/Medium/High/Critical` → 绿/蓝/黄/橙/红。使用 `getThreatColor(level)` 来动态着色 UI。

## 错误处理与稳定性

- REST 调用失败时，`riskAssess` 默认返回 `{ isFraud: false }`，避免因网络问题误拦截。
- WebSocket 连接错误不会中断页面逻辑；建议在页面顶部增加 Snackbar 提示连接状态。

## 端到端联调

1. 后端启动（开发）：`http://localhost:8888` 暴露 REST；`ws://localhost:8080` 暴露事件。生产环境应改为 `https://...` 与 `wss://...`。
2. 前端启动：`npm start` 打开 `http://localhost:3000/`。
3. 在发送页测试：正常输入后点击“发送”，确认弹窗会显示检测结果与实时事件提示。