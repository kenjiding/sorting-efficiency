@echo off
REM 分拣管理系统 - Windows启动脚本

echo 🚀 启动分拣管理系统...
echo.

echo 📦 请确保MongoDB已经运行
echo    如果没有运行，请先运行: net start MongoDB
echo.

echo 🔧 启动后端服务器...
cd server
if not exist node_modules (
    echo 📥 安装后端依赖...
    call npm install
)

start "后端服务器" cmd /k npm start
cd ..

echo ⏳ 等待后端服务器就绪...
timeout /t 5 /nobreak > nul

echo.
echo 🎨 启动前端应用...
if not exist node_modules (
    echo 📥 安装前端依赖...
    call npm install
)

call npm run dev

pause

