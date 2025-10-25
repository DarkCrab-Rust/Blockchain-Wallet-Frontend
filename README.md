# 🎨 Blockchain Wallet Frontend

<div align="center">

![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue)
![Material-UI](https://img.shields.io/badge/MUI-7.3.4-blue)
![License](https://img.shields.io/badge/License-MIT-green)

现代化的区块链钱包前端界面,支持多链资产管理

[在线演示](#) | [后端仓库](https://github.com/DarkCrab-Rust/Rust-Secure-Wallet-AI) | [文档](#)

</div>

---

## ✨ 特性

### 🎨 现代化UI
- ✅ Material-UI 组件库
- ✅ 响应式设计
- ✅ 深色/浅色主题
- ✅ 流畅的动画效果

### 💼 钱包管理
- ✅ 创建/导入钱包
- ✅ 多钱包支持
- ✅ 助记词备份
- ✅ 密钥安全存储

### ⛓️ 多链支持
- ✅ Ethereum (ETH)
- ✅ Solana (SOL)
- ✅ Polygon (MATIC)
- ✅ BSC (BNB)

### 💸 交易功能
- ✅ 发送/接收资产
- ✅ 交易历史查询
- ✅ Gas费用估算
- ✅ 交易状态追踪

### 🌉 跨链桥接
- ✅ 资产跨链转移
- ✅ 自动路由选择
- ✅ 费用优化

---

## 🚀 快速开始

### 前置要求
- Node.js 16+
- npm 或 yarn
- 后端API服务 (见[后端仓库](https://github.com/DarkCrab-Rust/Rust-Secure-Wallet-AI))

### 安装

```bash
# 克隆仓库
git clone https://github.com/DarkCrab-Rust/Blockchain-Wallet-Frontend.git
cd Blockchain-Wallet-Frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件,设置API地址和密钥

# 启动开发服务器
npm start
```

访问 http://localhost:3000

---

## 📦 技术栈

### 核心框架
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Material-UI** - UI组件库
- **React Router** - 路由管理

### 区块链集成
- **ethers.js** - Ethereum交互
- **web3.js** - Web3功能
- **Axios** - HTTP客户端

### 开发工具
- **Jest** - 单元测试
- **Testing Library** - 组件测试
- **ESLint** - 代码检查

---

## 🏗️ 项目结构

```
src/
├── components/       # 可复用组件
│   └── Layout/      # 布局组件
├── pages/           # 页面组件
│   ├── WalletPage/  # 钱包页面
│   ├── SendPage/    # 发送页面
│   ├── HistoryPage/ # 历史页面
│   ├── BridgePage/  # 跨链页面
│   └── SettingsPage/# 设置页面
├── context/         # React Context
├── services/        # API服务
├── types/           # TypeScript类型
├── utils/           # 工具函数
└── assets/          # 静态资源
```

---

## 🔧 配置

### 环境变量

创建 `.env` 文件:

```bash
# API配置
REACT_APP_API_URL=http://localhost:8888
REACT_APP_API_KEY=your_api_key_here

# 网络配置
REACT_APP_DEFAULT_NETWORK=eth
REACT_APP_ENABLE_TESTNET=true
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 生成覆盖率报告
npm test -- --coverage

# 运行特定测试
npm test -- HistoryTimelineItem
```

---

## 📦 构建

```bash
# 生产构建
npm run build

# 构建文件位于 build/ 目录
```

---

## 🚀 部署

### Vercel (推荐)

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

### Netlify

```bash
# 构建
npm run build

# 部署 build/ 目录到 Netlify
```

---

## 🔗 相关链接

- **后端仓库**: [Rust-Blockchain-Secure-Wallet](https://github.com/DarkCrab-Rust/Rust-Secure-Wallet-AI)
- **API文档**: 见后端仓库
- **在线演示**: [待部署]

---

## 🤝 贡献

欢迎贡献!请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

<div align="center">

**🎨 Modern · Secure · User-Friendly 🎨**

**Built with ❤️ using React and TypeScript**

⭐ **如果这个项目对您有帮助,请给一个Star!** ⭐

</div>
