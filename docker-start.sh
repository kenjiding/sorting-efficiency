#!/bin/bash

# Docker Compose 启动脚本 - 分拣管理系统

set -e

echo "🚀 启动分拣管理系统 Docker 服务..."
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "访问: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 启动 MongoDB 服务
echo "📦 启动 MongoDB 服务..."
docker-compose up -d mongodb

# 等待 MongoDB 就绪
echo "⏳ 等待 MongoDB 启动..."
sleep 5

# 检查 MongoDB 健康状态
echo "🔍 检查 MongoDB 健康状态..."
if docker-compose ps mongodb | grep -q "healthy\|Up"; then
    echo "✅ MongoDB 服务运行正常"
else
    echo "⚠️  MongoDB 可能还在启动中，请稍后检查: docker-compose logs mongodb"
fi

echo ""
echo "📝 下一步："
echo "1. 确保后端环境变量已配置: cp server/env.example server/.env"
echo "2. 安装后端依赖: cd server && npm install"
echo "3. 启动后端服务器: cd server && npm run dev"
echo "4. 安装前端依赖: npm install"
echo "5. 启动前端开发服务器: npm run dev"
echo ""
echo "📚 查看完整文档: cat DOCKER_README.md"
echo ""

