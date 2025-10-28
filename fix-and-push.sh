#!/bin/bash

# 🔧 修复Git冲突并推送到GitHub

set -e

echo "=========================================="
echo "🔧 修复Git冲突并推送"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

echo "📍 当前目录: $(pwd)"
echo ""

# 方案1: 拉取并合并
echo "1️⃣ 尝试拉取远程仓库..."
if git pull origin main --allow-unrelated-histories --no-edit; then
    echo "  ✅ 拉取成功"
    echo ""
    echo "2️⃣ 推送到GitHub..."
    git push -u origin main
    echo "  ✅ 推送成功!"
else
    echo "  ⚠️  拉取失败,尝试强制推送..."
    echo ""
    echo "2️⃣ 强制推送到GitHub..."
    git push -u origin main --force
    echo "  ✅ 强制推送成功!"
fi

echo ""
echo "=========================================="
echo "✅ 完成!"
echo "=========================================="
echo ""
echo "🔗 访问你的仓库:"
echo "   https://github.com/DarkCrab-Rust/Blockchain-Wallet-Frontend"
echo ""


