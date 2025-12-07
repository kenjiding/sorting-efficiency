# 数据迁移指南

快速迁移供应商、路由、关联关系数据到另一台电脑。

## 📋 迁移的数据集合

- **suppliers** - 供应商数据
- **routes** - 路由数据  
- **supplierroutemappings** - 供应商与路由的关联关系

## 🚀 方法一：使用 MongoDB Tools（推荐，最快）

### 前提条件

1. 安装 MongoDB Database Tools：
   ```bash
   # macOS
   brew install mongodb-database-tools
   
   # Ubuntu/Debian
   sudo apt-get install mongodb-database-tools
   
   # Windows
   # 从 https://www.mongodb.com/try/download/database-tools 下载安装
   ```

2. 确保 MongoDB 正在运行：
   ```bash
   # 使用 Docker
   docker-compose up -d mongodb
   
   # 或直接运行 MongoDB
   mongod
   ```

### 步骤

#### 1️⃣ 在源电脑（当前电脑）导出数据

**方法 A：使用 Shell 脚本（推荐）**
```bash
./migrate-data.sh export
```

**方法 B：使用 Node.js 脚本**
```bash
cd server
node migrate-data.js export
```

这会：
- 导出所有相关集合的数据
- 创建备份文件夹 `backup/YYYYMMDD_HHMMSS/`
- 生成压缩文件 `backup/migration_YYYYMMDD_HHMMSS.tar.gz`

#### 2️⃣ 复制备份文件到新电脑

将以下文件之一复制到新电脑：
- **压缩文件**：`backup/migration_YYYYMMDD_HHMMSS.tar.gz`（推荐，更小）
- **或整个文件夹**：`backup/YYYYMMDD_HHMMSS/`

#### 3️⃣ 在新电脑导入数据

```bash
# 1. 确保 MongoDB 正在运行
docker-compose up -d mongodb

# 2. 将备份文件放到项目根目录的 backup 文件夹

# 3. 运行导入命令
./migrate-data.sh import
```

## 🔧 方法二：使用 Node.js 脚本（无需额外工具）

如果无法安装 MongoDB Tools，可以使用 Node.js 脚本。

### 步骤

#### 1️⃣ 在源电脑导出数据

```bash
cd server
node migrate-data.js export
```

#### 2️⃣ 复制备份文件夹

将 `backup/` 文件夹复制到新电脑的项目根目录。

#### 3️⃣ 在新电脑导入数据

```bash
cd server
node migrate-data.js import
```

## 📝 手动迁移（如果脚本不可用）

### 使用 mongoexport/mongoimport

#### 导出（源电脑）

```bash
# 导出供应商
mongoexport --db=sorting-management --collection=suppliers --out=suppliers.json

# 导出路由
mongoexport --db=sorting-management --collection=routes --out=routes.json

# 导出关联关系
mongoexport --db=sorting-management --collection=supplierroutemappings --out=supplierroutemappings.json
```

#### 导入（目标电脑）

```bash
# 导入供应商
mongoimport --db=sorting-management --collection=suppliers --file=suppliers.json --drop

# 导入路由
mongoimport --db=sorting-management --collection=routes --file=routes.json --drop

# 导入关联关系
mongoimport --db=sorting-management --collection=supplierroutemappings --file=supplierroutemappings.json --drop
```

## ⚠️ 注意事项

1. **备份现有数据**：导入操作会使用 `--drop` 选项，会删除目标数据库中的现有数据。请先备份！

2. **数据库名称**：确保目标电脑的数据库名称也是 `sorting-management`

3. **MongoDB 版本**：建议源和目标使用相同或兼容的 MongoDB 版本

4. **关联关系**：导入顺序很重要，建议按以下顺序：
   - 先导入 suppliers
   - 再导入 routes
   - 最后导入 supplierroutemappings

## 🔍 验证迁移

导入后，可以验证数据：

```bash
# 使用 mongosh
mongosh sorting-management

# 查看数据统计
db.suppliers.countDocuments()
db.routes.countDocuments()
db.supplierroutemappings.countDocuments()

# 查看示例数据
db.suppliers.find().limit(5)
db.routes.find().limit(5)
db.supplierroutemappings.find().limit(5)
```

## 🆘 故障排除

### 问题：找不到 mongodump 命令

**解决**：安装 MongoDB Database Tools（见方法一的前提条件）

### 问题：连接 MongoDB 失败

**解决**：
```bash
# 检查 MongoDB 是否运行
docker ps | grep mongodb

# 或
ps aux | grep mongod

# 启动 MongoDB
docker-compose up -d mongodb
```

### 问题：导入时出现重复键错误

**解决**：脚本已使用 `--drop` 选项，会自动删除现有数据。如果仍有问题，手动清空集合：
```bash
mongosh sorting-management --eval "db.suppliers.deleteMany({})"
mongosh sorting-management --eval "db.routes.deleteMany({})"
mongosh sorting-management --eval "db.supplierroutemappings.deleteMany({})"
```

## 📞 需要帮助？

如果遇到问题，请检查：
1. MongoDB 是否正在运行
2. 数据库名称是否正确
3. 备份文件是否完整
4. 网络连接是否正常（如果使用远程数据库）

