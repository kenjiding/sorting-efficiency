#!/bin/bash

# 获取本机IP地址
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        ip=$(hostname -I | awk '{print $1}')
    else
        ip="localhost"
    fi
    
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo $ip
}

LOCAL_IP=$(get_local_ip)

echo "=========================================="
echo "📱 移动端调试启动脚本"
echo "=========================================="
echo ""
echo "🌐 检测到本机IP: $LOCAL_IP"
echo ""
echo "📋 访问地址："
echo "   前端: http://$LOCAL_IP:6789/scan"
echo "   后端: http://$LOCAL_IP:7890"
echo ""
echo "⚠️  重要提示："
echo "   1. 确保手机和电脑在同一WiFi网络"
echo "   2. 如果API无法连接，请创建 .env.local 文件："
echo "      VITE_API_URL=http://$LOCAL_IP:7890/api"
echo ""
echo "=========================================="
echo ""

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo "📝 创建 .env.local 文件..."
    echo "VITE_API_URL=http://$LOCAL_IP:7890/api" > .env.local
    echo "✅ 已创建 .env.local"
    echo ""
fi

echo "🚀 启动开发服务器..."
echo ""

# 启动服务器
npm run start:all

