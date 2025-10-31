# 生产环境 CSP 收紧建议

为降低 XSS、数据泄露与点击劫持风险，生产环境建议使用严格的内容安全策略（CSP）。以下提供推荐策略、适配说明与常见陷阱排查。

## 推荐策略（HTTP 响应头）

在后端通过响应头设置（优先于 `<meta http-equiv>`）：

```
Content-Security-Policy: \
  default-src 'self'; \
  script-src 'self' 'nonce-<server-generated-nonce>'; \
  style-src 'self' 'unsafe-inline'; \
  img-src 'self' data:; \
  font-src 'self'; \
  connect-src 'self' https://api.example.com; \
  frame-ancestors 'none'; \
  base-uri 'self'; \
  object-src 'none'; \
  upgrade-insecure-requests; \
  report-to csp-endpoint; \
  report-uri https://monitor.example.com/csp-report
```

说明：
- `script-src` 使用服务端生成的 `nonce` 替代 `unsafe-inline`，防止内联脚本被执行。
- `style-src` 暂时允许 `unsafe-inline` 以兼容部分 UI 库（可逐步迁移至 `nonce` 或哈希）。
- `connect-src` 限定后端域名，例如 `https://api.example.com`，避免任意外连。
- `frame-ancestors 'none'` 防止被第三方页面以 `<iframe>` 嵌入（点击劫持）。
- `upgrade-insecure-requests` 协助将 http 资源升级为 https，避免混合内容。
- `img-src` 允许 `data:` 以支持 Base64 图标，避免第三方图像来源。
- `report-to`/`report-uri` 用于上报违规事件，建议在生产接入监控。

## 推荐策略（HTML `<meta>` 兜底方案）

若暂时无法由后端设置响应头，可在 `public/index.html` 中添加 `<meta http-equiv="Content-Security-Policy">`（效果不如响应头稳妥）：

```
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests">
```

注意：`meta` 不支持 `nonce` 与 `report-to`，建议最终回到响应头配置。

## 前端适配建议

- 移除内联事件处理与内联 `<script>`，所有脚本通过打包产物加载。
- 若必须动态插入脚本，后端需生成 `nonce` 并注入至页面，前端插入时带上相同 `nonce`。
- 禁止使用 `dangerouslySetInnerHTML` 或第三方未净化的 HTML；如确需渲染，先进行严格白名单净化。
- 统一通过 `axios` 拦截器附加认证头，避免在 URL 中传递敏感参数。
- 生产环境关闭调试端点、Mock 与过度日志；敏感数据避免持久化在 `localStorage`。

## 常见陷阱与排查

- 业务需要外链图片/CDN：在 `img-src`、`script-src`、`style-src` 中精确加入允许来源，不要使用 `*` 或宽泛通配。
- 第三方 SDK 注入：评估其加载域名与运行时行为，必要时为其单独配置子资源完整性（SRI）或隔离沙箱。
- WebSocket/Server-Sent Events：需在 `connect-src` 添加对应域名与协议（如 `wss://`）。
- 报告通道：开启 `report-to`/`report-uri` 后，验证监控端点是否接收并持久化上报数据。

## 配置示例对接

- Nginx：
```
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-$csp_nonce'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests" always;
```

- Node/Express：
```
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; '));
  res.locals.cspNonce = nonce;
  next();
});
```

将 `nonce` 注入模板并用于需要的 `<script nonce="...">` 标签。

---

如需我直接帮你把 `index.html` 的 CSP 调整为更严格版本或改为后端响应头形式，请告诉我你的后端栈（Nginx/Express/其他）与后端域名。