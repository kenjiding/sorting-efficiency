# Docker 部署指南

本项目使用 Docker Compose 来管理 MongoDB 数据库服务。

## 快速开始

### 1. 启动 MongoDB 服务

```bash
# 启动 MongoDB 容器
docker-compose up -d mongodb

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f mongodb
```

### 2. 配置环境变量

确保后端服务器的环境变量已正确配置：

```bash
# 如果 server/.env 不存在，从示例文件创建
cp server/.env.example server/.env
```

编辑 `server/.env` 文件，确保 MongoDB URI 指向本地：

```env
MONGODB_URI=mongodb://localhost:27017/sorting-management
PORT=7890
NODE_ENV=development
```

### 3. 安装依赖并启动项目

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ..
npm install

# 启动所有服务（MongoDB 已在 Docker 中运行）
npm run start:all
```

或者分别启动：

```bash
# 终端1：启动后端服务器
cd server
npm run dev

# 终端2：启动前端开发服务器
npm run dev
```

## 完整的 Docker Compose 命令

### 启动服务

```bash
# 启动 MongoDB（后台运行）
docker-compose up -d mongodb

# 启动所有服务（如果有定义）
docker-compose up -d
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（注意：会删除所有数据！）
docker-compose down -v
```

### 查看状态

```bash
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f mongodb

# 查看 MongoDB 日志
docker-compose logs mongodb
```

### 进入容器

```bash
# 进入 MongoDB 容器
docker-compose exec mongodb mongosh sorting-management

# 或使用旧的 mongo 命令
docker-compose exec mongodb mongo sorting-management
```

## MongoDB 数据持久化

MongoDB 数据存储在 Docker volume 中，即使容器被删除，数据也会保留。

查看 volumes：

```bash
docker volume ls | grep sorting
```

删除数据（谨慎操作）：

```bash
docker-compose down -v
```

## 端口说明

- **MongoDB**: `27017` - 数据库服务端口
- **后端 API**: `7890` - Express 服务器端口（本地运行）
- **前端开发服务器**: `6789` - Vite 开发服务器端口

## 健康检查

MongoDB 容器包含健康检查，确保数据库完全启动后才允许依赖服务连接。

查看健康状态：

```bash
docker-compose ps
```

## 容器化后端服务（可选）

如果需要完全容器化运行，可以：

1. 取消注释 `docker-compose.yml` 中的 `backend` 服务部分
2. 修改环境变量，使用容器内的 MongoDB URI：
   ```env
   MONGODB_URI=mongodb://mongodb:27017/sorting-management
   ```

然后启动：

```bash
docker-compose up -d
```

## 故障排除

### MongoDB 连接失败

1. 确保 MongoDB 容器正在运行：
   ```bash
   docker-compose ps
   ```

2. 检查 MongoDB 日志：
   ```bash
   docker-compose logs mongodb
   ```

3. 测试 MongoDB 连接：
   ```bash
   docker-compose exec mongodb mongosh sorting-management --eval "db.runCommand('ping')"
   ```

### 端口冲突

如果端口 27017 已被占用：

1. 修改 `docker-compose.yml` 中的端口映射：
   ```yaml
   ports:
     - "27018:27017"  # 使用 27018 代替 27017
   ```

2. 更新 `server/.env` 中的 MongoDB URI：
   ```env
   MONGODB_URI=mongodb://localhost:27018/sorting-management
   ```

### 数据丢失

数据存储在 Docker volumes 中，默认不会丢失。如果遇到问题：

1. 检查 volumes 是否存在：
   ```bash
   docker volume ls
   ```

2. 备份数据：
   ```bash
   docker-compose exec mongodb mongodump --out /backup
   ```

## 生产环境部署

生产环境建议：

1. 使用 MongoDB Atlas 或其他托管 MongoDB 服务
2. 使用环境变量管理敏感信息
3. 配置适当的网络和安全策略
4. 启用 MongoDB 认证（如果需要）

## 更多信息

- [Docker Compose 文档](https://docs.docker.com/compose/)
- [MongoDB Docker 镜像](https://hub.docker.com/_/mongo)
- [项目 README](./README.md)

