# 🎨 Blockchain Wallet Frontend

<div align="center">

![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Material-UI](https://img.shields.io/badge/MUI-7.3.4-blue)
![License](https://img.shields.io/badge/License-MIT-green)

现代化的区块链钱包前端界面，支持多链资产管理与风险联动。

[后端仓库](https://github.com/DarkCrab-Rust/Rust-Secure-Wallet-AI) | [快速指南](docs/FRONTEND_QUICKSTART.md)

</div>

---

## ✨ 功能概览

- 钱包管理：创建/删除/恢复，支持“量子安全（实验性）”选项。
- 多钱包与网络：下拉快速切换当前钱包与网络（ETH/MATIC/BNB/BTC）。
- 资产总览：余额卡片与趋势图（`recharts`），首页快捷操作（转账/兑换）。
- 发送交易：EVM 地址与 BTC Taproot 地址校验；风险评估联动确认弹窗。
- 交易历史：筛选、分页、自动刷新与可见性优化，错误聚合提示。
- 跨链桥：源/目标网络选择、余额读取与桥接提交结果提示。
- 设置中心：
  - API 基础设置（URL/Key、保存/测试/清除）
  - 后端健康检查与 Swagger 文档入口
  - 风险策略配置与联动说明
  - 默认钱包选择与功能开关（Mock 等）
  - 认证测试与修改密码面板
- Mock 模式：开发默认启用，使用 `localStorage` 模拟钱包/余额，便于前端自测。
- 错误聚合：统一通过 `eventBus.emitApiError` 收敛错误并提示用户行动建议。

---

## 🧭 路由与页面

- `/` 钱包首页（`WalletPage`）
- `/send` 发送交易（`SendPage`）
- `/history` 交易历史（`HistoryPage`）
- `/bridge` 跨链桥（`BridgePage`）
- `/settings` 设置（`SettingsPage`）
- `/login` 登录（公开页）
- `/signup` 注册（公开页）

说明：受保护页面通过 `ProtectedRoute` 进行鉴权；测试环境自动放宽，便于端到端测试。

---

## 🚀 快速开始

### 前置要求
- Node.js 16+
- npm（或 yarn）
- 后端 API 服务（见后端仓库）

### 安装与启动（概览）

- 安装依赖：`npm install`
- 配置环境：复制 `.env.example` 为 `.env` 并设置 API 地址与密钥
- 启动开发：`npm start`（默认端口 `3000`）

详尽步骤、端口/环境问题排查请参见 `docs/FRONTEND_QUICKSTART.md`。

---

## 🔧 环境与运行时

- `REACT_APP_API_URL`：后端基础地址，前端会统一规范为包含 `/api` 的路径。
- `REACT_APP_API_KEY`：后端鉴权密钥；开发环境未配置时默认使用占位键并启用 Mock。
- 运行时配置：`src/services/api.ts` 中的 `apiRuntime` 负责管理基础地址与请求配置。
- UI 主题：`App.tsx` 中定义 MUI 全局主题与组件样式覆盖（按钮、tooltip、drawer 等）。

---

## 🛡️ 风险联动与事件

- REST 风险评估：`src/services/risk.ts` 封装调用；发送页在确认弹窗中显示威胁等级并在高风险阻止发送。
- WebSocket 实时异常事件：`src/hooks/useAnomalyEvents.ts`；可在页面中订阅显示最新事件。
- 等级颜色映射：`src/utils/threatColors.ts`（None/Low/Medium/High/Critical → 绿/蓝/黄/橙/红）。

---

## 🧪 测试与质量保障

- 端到端页面导航：`src/App.navigation.test.tsx` 验证侧边菜单导航与页面文案。
- 钱包流程：`src/pages/WalletPage/*.test.tsx` 覆盖创建/删除/恢复与错误提示聚合。
- 发送性能：`src/pages/SendPage/SendPage.perf.test.tsx` 验证发送流程性能阈值与交互稳定性。
- 跨链桥：`src/pages/BridgePage/BridgePage.test.tsx` 验证桥接表单与成功提示。
- API 拦截与错误分类：`src/services/api.*.test.ts` 验证端点别名与错误聚合分类。
- 测试辅助：`src/test/TestAid.tsx` 在测试环境集中渲染 `data-testid` 节点，提升选择与断言稳定性。

运行测试：

```bash
npm test

# 覆盖率报告
npm test -- --coverage
```

说明：测试环境下 `ProtectedRoute` 放宽鉴权，避免登录重定向影响页面渲染测试。

---

## 🏗️ 目录结构（简版）

```
src/
├── assets/                # 图标与静态资源
├── components/            # 可复用组件（含 Layout、状态/健康、配置面板等）
├── context/               # 全局状态（钱包、硬件、认证）
├── hooks/                 # 自定义 hooks（特性开关、异常事件等）
├── pages/                 # 页面模块（钱包/发送/历史/桥/设置/认证）
├── routes/                # 路由辅助（受保护/公开路由）
├── services/              # API 封装与 Mock、错误聚合与重试
├── test/                  # 测试辅助组件
├── types/                 # TS 类型声明
└── utils/                 # 工具方法（存储、映射、主题等）
```

---

## 🔧 维护建议与仓库收紧

- Mock 模式用于开发自测：`localStorage` 键包括 `feature_mock`、`mock_wallets`、`current_wallet`、`current_network`、`api_key`。
- 错误聚合统一走 `eventBus.emitApiError`，便于一致的用户反馈与分类。
- UI 变更尽量通过主题覆盖集中管理，减少局部 `!important`。
- 测试优先使用 `data-testid` 与稳定的选择方式，避免 Portal/动画导致不稳定。
- 文档与脚本保留核心与测试所需；临时输出与未引用配置可定期清理（已清理常见临时文件）。

更多使用与架构文档请参见 `docs/INDEX.md`（集中索引）；后端集成与环境变量说明请参见 `docs/FRONTEND_INTEGRATION_GUIDE.md`。

---

## 📦 构建与部署

```bash
# 生产构建
npm run build

# 构建输出位于 build/ 目录
```

部署到任意静态托管（Vercel/Netlify/自有容器等），注意配置后端 API 地址与鉴权。

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

<div align="center">

**Modern · Secure · User-Friendly**

Built with ❤️ using React and TypeScript

</div>
