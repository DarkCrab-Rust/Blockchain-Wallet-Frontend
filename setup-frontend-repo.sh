#!/bin/bash

# 🎨 前端仓库初始化脚本
# 用途: 优化前端项目并准备上传到GitHub

set -e

echo "=========================================="
echo "🎨 前端仓库初始化"
echo "=========================================="
echo ""

# 进入前端目录
cd "$(dirname "$0")"

echo "📍 当前目录: $(pwd)"
echo ""

# 1. 创建 .env.example
echo "1️⃣ 创建 .env.example..."
cat > .env.example << 'EOF'
# API Configuration
REACT_APP_API_URL=http://localhost:8888
REACT_APP_API_KEY=your_api_key_here

# Network Configuration
REACT_APP_DEFAULT_NETWORK=eth
REACT_APP_ENABLE_TESTNET=true

# Optional: Custom RPC URLs
# REACT_APP_ETH_RPC_URL=https://ethereum.publicnode.com
# (Solana 已移除，不再需要 SOL RPC URL)
EOF
echo "  ✅ .env.example 已创建"
echo ""

# 2. 创建 LICENSE
echo "2️⃣ 创建 LICENSE..."
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 DarkCrab-Rust

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
echo "  ✅ LICENSE 已创建"
echo ""

# 3. 优化 .gitignore
echo "3️⃣ 优化 .gitignore..."
cat >> .gitignore << 'EOF'

# Environment files
.env

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db

# Test results
jest-results.json

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF
echo "  ✅ .gitignore 已优化"
echo ""

# 4. 创建 CONTRIBUTING.md
echo "4️⃣ 创建 CONTRIBUTING.md..."
cat > CONTRIBUTING.md << 'EOF'
# 贡献指南

感谢您对本项目的关注!

## 如何贡献

### 报告问题
- 使用 GitHub Issues 报告 bug
- 提供详细的复现步骤
- 附上截图或错误日志

### 提交代码
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 添加适当的测试
- 更新相关文档

### 提交信息格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

## 开发流程

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

### 运行测试
```bash
npm test
```

### 构建生产版本
```bash
npm run build
```

## 行为准则
- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评

感谢您的贡献! ❤️
EOF
echo "  ✅ CONTRIBUTING.md 已创建"
echo ""

# 5. 创建 GitHub Actions CI
echo "5️⃣ 创建 GitHub Actions CI..."
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage --watchAll=false
    
    - name: Build
      run: npm run build
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

  lint:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: npm run lint --if-present
EOF
echo "  ✅ GitHub Actions CI 已创建"
echo ""

# 6. 创建专业的 README.md
echo "6️⃣ 创建专业的 README.md..."
cat > README.md << 'EOF'
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
EOF
echo "  ✅ README.md 已创建"
echo ""

# 7. 显示统计信息
echo "=========================================="
echo "📊 优化完成统计"
echo "=========================================="
echo ""
echo "✅ 已创建文件:"
echo "   - .env.example"
echo "   - LICENSE"
echo "   - CONTRIBUTING.md"
echo "   - README.md"
echo "   - .github/workflows/ci.yml"
echo ""
echo "✅ 已优化文件:"
echo "   - .gitignore"
echo ""

# 8. 显示下一步操作
echo "=========================================="
echo "🎯 下一步操作"
echo "=========================================="
echo ""
echo "1. 在GitHub创建新仓库:"
echo "   - 仓库名: Blockchain-Wallet-Frontend"
echo "   - 描述: 🎨 Modern blockchain wallet frontend"
echo "   - 可见性: Public"
echo "   - 不要初始化 README"
echo ""
echo "2. 初始化Git并推送:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'feat: 初始化区块链钱包前端项目'"
echo "   git branch -M main"
echo "   git remote add origin https://github.com/DarkCrab-Rust/Blockchain-Wallet-Frontend.git"
echo "   git push -u origin main"
echo ""
echo "3. 设置仓库标签:"
echo "   - react"
echo "   - typescript"
echo "   - blockchain"
echo "   - wallet"
echo "   - ethereum"
echo "   - material-ui"
echo ""
echo "=========================================="
echo "✅ 前端仓库准备完成!"
echo "=========================================="

