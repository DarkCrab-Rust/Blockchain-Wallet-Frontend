#!/bin/bash

# 🚀 完成Git合并并推送

set -e

echo "=========================================="
echo "🚀 完成Git合并并推送"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

echo "📍 当前目录: $(pwd)"
echo ""

echo "1️⃣ 添加已解决的文件..."
git add README.md
echo "  ✅ README.md已添加"
echo ""

echo "2️⃣ 提交合并..."
git commit -m "Merge remote README with local version"
echo "  ✅ 提交成功"
echo ""

echo "3️⃣ 推送到GitHub..."
git push -u origin main
echo "  ✅ 推送成功!"
echo ""

echo "=========================================="
echo "✅ 前端仓库创建完成!"
echo "=========================================="
echo ""
echo "🔗 访问你的仓库:"
echo "   https://github.com/DarkCrab-Rust/Blockchain-Wallet-Frontend"
echo ""
echo "📝 下一步:"
echo "   1. 在GitHub上设置仓库主题(Topics)"
echo "   2. 在后端README中添加前端仓库链接"
echo "   3. 部署前端到Vercel或Netlify"
echo ""

