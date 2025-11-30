@echo off
chcp 65001 >nul
echo ==========================================
echo 📱 移动端调试启动脚本
echo ==========================================
echo.

REM 获取本机IP地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set ip=%%a
    goto :found
)
:found
set ip=%ip:~1%
if "%ip%"=="" set ip=localhost

echo 🌐 检测到本机IP: %ip%
echo.
echo 📋 访问地址：
echo    前端: http://%ip%:6789/scan
echo    后端: http://%ip%:7890
echo.
echo ⚠️  重要提示：
echo    1. 确保手机和电脑在同一WiFi网络
echo    2. 如果API无法连接，请创建 .env.local 文件：
echo       VITE_API_URL=http://%ip%:7890/api
echo.
echo ==========================================
echo.

REM 检查.env.local文件
if not exist ".env.local" (
    echo 📝 创建 .env.local 文件...
    echo VITE_API_URL=http://%ip%:7890/api > .env.local
    echo ✅ 已创建 .env.local
    echo.
)

echo 🚀 启动开发服务器...
echo.

REM 启动服务器
call npm run start:all

