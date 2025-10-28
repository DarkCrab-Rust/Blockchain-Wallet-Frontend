@echo off
chcp 65001 >nul
echo ==========================================
echo 修复Git冲突并推送
echo ==========================================
echo.

cd /d "%~dp0"

echo 当前目录: %CD%
echo.

echo 1. 拉取远程仓库...
git pull origin main --allow-unrelated-histories --no-edit
if %errorlevel% equ 0 (
    echo   拉取成功
    echo.
    echo 2. 推送到GitHub...
    git push -u origin main
    if %errorlevel% equ 0 (
        echo   推送成功!
    ) else (
        echo   推送失败,尝试强制推送...
        git push -u origin main --force
    )
) else (
    echo   拉取失败,尝试强制推送...
    echo.
    echo 2. 强制推送到GitHub...
    git push -u origin main --force
)

echo.
echo ==========================================
echo 完成!
echo ==========================================
echo.
echo 访问你的仓库:
echo https://github.com/DarkCrab-Rust/Blockchain-Wallet-Frontend
echo.
pause

