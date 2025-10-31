# ✅ AI 异常检测前端集成完成

本文档总结前端对接后端 AI 异常检测模块的工作内容与最终效果。

## 已完成工作
- 封装 REST 风险评估：`src/services/risk.ts`（`POST /anomaly-detection/detect`）
- WebSocket 实时事件：`src/hooks/useAnomalyEvents.ts`（开发默认 `ws://localhost:8080/api/anomaly-detection/events`，生产强制 `wss://.../api/anomaly-detection/events`）
- 威胁等级颜色：`src/utils/threatColors.ts`（`None/Low/Medium/High/Critical`）
- 发送页联动：`src/pages/SendPage/SendPage.tsx`（确认弹窗风险评估 + 实时告警显示）
- 构建修复：`src/services/api.ts` 添加 `__shouldLog` 占位，确保启动成功

## 使用流程
1. 用户点击“发送” → 打开确认弹窗
2. 前端调用 `/detect` 进行风险评估
3. 若返回风险（`isFraud: true`），弹窗显示红色警告并阻止发送；否则继续交易
4. 若接收到 WebSocket 的拦截或警告事件，也在弹窗中展示并动态着色

## 接口说明
- REST：`POST /anomaly-detection/detect`
  - 请求：`{ from_wallet, to_address, amount, network, config? }`
  - 响应：`{ isFraud, threatLevel?, message?, details? }`
- WebSocket：开发环境 `ws://localhost:8080/api/anomaly-detection/events`；生产环境请使用 `wss://.../api/anomaly-detection/events`
  - 事件类型：`transaction_blocked | warning_issued | detection_completed`
  - 推荐行为：阻止或警告并提示用户，按威胁等级着色

## 运行与预览
- 前端：`npm start` → 打开 `http://localhost:3000/`
- 后端：确保开发环境 `http://localhost:8888`（REST）与 `ws://localhost:8080`（事件）处于运行状态；生产环境请改用 `https://...` 与 `wss://...`。

## 建议
- 将检测结果详情（命中规则、模型分数）在弹窗中折叠展示，利于决策
- 提供设置页对接 `/config` 与 `/stats`，支持模式切换与黑名单管理
- 在 `eventBus` 中统一上报异常事件，便于全局通知与记录

---

如需继续完善“异常检测设置页”与“统计面板”，请告知，我将继续对接并实现。