#!/bin/bash

# 分拣管理系统 - 一键启动脚本

echo "🚀 启动分拣管理系统..."
echo ""

# 创建环境配置文件（如果不存在）
if [ ! -f ".env" ]; then
    echo "VITE_API_URL=http://localhost:7890/api" > .env
    echo "✅ 创建前端 .env 文件"
fi

if [ ! -f "server/.env" ]; then
    cat > server/.env << EOF
PORT=7890
MONGODB_URI=mongodb://localhost:27017/sorting-management
NODE_ENV=development
EOF
    echo "✅ 创建后端 .env 文件"
fi

# 检查MongoDB是否运行
echo "📦 检查MongoDB状态..."
if ! pgrep -x "mongod" > /dev/null && ! docker ps | grep -q mongo; then
    echo "⚠️  MongoDB未运行"
    echo "请选择启动方式："
    echo "1. 使用Homebrew: brew services start mongodb-community"
    echo "2. 使用Docker: docker run -d -p 27017:27017 --name mongodb mongo"
    echo ""
    read -p "是否使用Docker启动MongoDB? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker run -d -p 27017:27017 --name mongodb mongo || docker start mongodb
        sleep 3
    fi
fi

echo "✅ MongoDB运行中"
echo ""

# 启动后端服务器
echo "🔧 启动后端服务器..."
cd server
if [ ! -d "node_modules" ]; then
    echo "📥 安装后端依赖..."
    npm install
fi

# 在后台启动后端
npm start &
BACKEND_PID=$!
echo "✅ 后端服务器启动中 (PID: $BACKEND_PID)"
cd ..

# 等待后端启动
echo "⏳ 等待后端服务器就绪..."
sleep 3

# 启动前端
echo ""
echo "🎨 启动前端应用..."
if [ ! -d "node_modules" ]; then
    echo "📥 安装前端依赖..."
    npm install
fi

npm run dev

# 清理函数
cleanup() {
    echo ""
    echo "🛑 正在关闭服务..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ 所有服务已关闭"
    exit 0
}

# 捕获Ctrl+C信号
trap cleanup SIGINT SIGTERM

# 等待
wait

