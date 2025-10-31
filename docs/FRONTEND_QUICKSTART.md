# 前端快速上手（AI 异常检测）

## 前提条件
- Node.js 16+，npm 8+
- 后端运行：REST `http://localhost:8888`（开发环境），WebSocket `ws://localhost:8080`（开发环境）。生产环境请使用 `https://...` 与 `wss://...`。

## 启动前端
```bash
npm install
npm start
# 打开 http://localhost:3000/
```

## 关键能力
- REST 风险评估：`src/services/risk.ts`
- 实时事件订阅：`src/hooks/useAnomalyEvents.ts`
- 威胁颜色映射：`src/utils/threatColors.ts`
- 发送页联动：`src/pages/SendPage/SendPage.tsx`

## 最小示例
```ts
// 1) 调用风险评估
import { riskAssess } from '../services/risk';
const r = await riskAssess({ from_wallet: 'w', to_address: '0x..', amount: 1, network: 'eth' });
if (r.isFraud) { /* 显示警告并阻止 */ }

// 2) 订阅事件
import { useAnomalyEvents } from '../hooks/useAnomalyEvents';
const { connected, lastEvent } = useAnomalyEvents();
```

## UI 告警
```tsx
import { getThreatColor } from '../utils/threatColors';
{riskWarning && (
  <Alert severity="error" sx={{ mt: 2, borderLeft: '4px solid', borderColor: getThreatColor(lastEvent?.threatLevel) }}>
    {riskWarning}
  </Alert>
)}
```

## 常见问题
- 评估请求 404：确认 `package.json` 的 `proxy` 指向后端（默认 `http://localhost:8888`）。
- WebSocket 连接失败：开发环境检查事件服务是否运行在 `ws://localhost:8080`；生产环境请确保使用 `wss://` 并已配好证书与反向代理。
- ESLint 警告：`useAnomalyEvents` 的回调依赖可使用 `useRef` 封装或在依赖数组中声明。

## 下一步
- 根据 `docs/FRONTEND_INTEGRRATION_GUIDE.md` 完成更深入的集成与联调。