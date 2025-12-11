# 数据同步修复说明

## 修复的问题

### 1. ✅ 货量数据API参数格式错误

**问题**：之前使用的参数格式不完整，导致外部API返回0条数据

**旧参数**：
```javascript
{
  currentPage: 1,
  showCount: 9999,
  startTime: "2025-12-11 00:00:00",
  endTime: "2025-12-11 23:59:59"
}
```

**新参数（正确）**：
```javascript
{
  currentPage: 1,
  endTime: "2025-12-11 23:59:59",
  isLatest: 0,
  orderScopeNew: "",
  receiveType: "All",
  scanTypeList: ["100", "300", "2500", "600"],
  searchNoList: [],
  showCount: 9999,
  startTime: "2025-12-11 00:00:00",
  vehicleUuid: ""
}
```

### 2. ✅ 改进日期计算逻辑

**问题**：之前依赖SyncMetadata记录的lastSyncDate，不够准确

**改进**：
- 优先从MongoDB查询最新数据的实际日期
- 如果MongoDB没有数据，才使用SyncMetadata
- 这样可以确保即使SyncMetadata被清空，也能正确计算同步范围

**实现**：
```javascript
// InboundDataSyncService
async getLatestDataDate() {
  const latestRecord = await InboundScanRecord.findOne()
    .sort({ scanDate: -1 })
    .select('scanDate')
    .lean();
  return latestRecord?.scanDate || null;
}

// ProblemItemSyncService
async getLatestDataDate() {
  const latestRecord = await ProblemItem.findOne()
    .sort({ registerDate: -1 })
    .select('registerDate')
    .lean();
  return latestRecord?.registerDate || null;
}
```

### 3. ✅ 确认运单号去重逻辑

**去重机制**：
```javascript
const bulkOps = records.map(record => ({
  updateOne: {
    filter: { waybillNumber: record.waybillNumber },
    update: { $setOnInsert: record },
    upsert: true
  }
}));
```

- 使用 `waybillNumber` 作为唯一标识
- `$setOnInsert` 确保只在插入新记录时设置数据
- 如果运单号已存在，不会覆盖原有数据

## 修改的文件

1. **server/src/services/DataSyncService.js**
   - 添加 `getLatestDataDate()` 抽象方法
   - 修改 `sync()` 方法优先使用MongoDB中的最新日期

2. **server/src/services/InboundDataSyncService.js**
   - 实现 `getLatestDataDate()` 方法查询最新scanDate
   - 修改API参数格式为正确的格式

3. **server/src/services/ProblemItemSyncService.js**
   - 实现 `getLatestDataDate()` 方法查询最新registerDate

## 测试步骤

### 1. 重启服务器

```bash
# 在server目录
npm run dev
```

### 2. 测试同步功能

1. 打开浏览器，访问 http://localhost:5173/dashboard
2. 点击右上角"同步最新数据"按钮
3. 观察浏览器控制台和服务器终端日志

### 3. 预期日志输出

**服务器端**：
```
🔄 开始同步 inbound 数据...
📅 数据库最新数据日期: 2025-12-10 (或 无数据（首次同步）)
📊 需要同步的日期: 2025-12-11 至 2025-12-11 (共1天)
📦 正在同步第 1/1 批...
  📅 同步 2025-12-11 的数据...
  ⏱️  外部API响应: 1250ms, 获取 523 条原始数据
  ✅ 2025-12-11: 插入 523 条新记录（跳过 0 条重复），耗时 89ms
✅ inbound 同步完成！共523条记录，耗时1500ms
```

**浏览器端**：
- Toast提示：✅ 全量同步完成！共XXX条记录

### 4. 验证数据

**方法1：通过MongoDB查看**
```bash
# 连接MongoDB
mongosh mongodb://localhost:27017/sorting-management

# 查询货量数据
db.inboundscanrecords.countDocuments()
db.inboundscanrecords.find().limit(5)

# 查询最新数据日期
db.inboundscanrecords.find().sort({scanDate: -1}).limit(1)
```

**方法2：通过前端页面查看**
1. 访问"货量数据"模块
2. 选择对应日期范围
3. 查看是否有数据显示

## 常见问题排查

### Q1: 仍然同步0条数据

**可能原因**：
1. Token无效或过期
2. 网络连接问题
3. 外部API当天确实没有数据
4. 日期计算有误

**排查步骤**：
```bash
# 1. 检查Token是否有效
# 在设置页面重新配置Token

# 2. 查看服务器日志
# 找到类似这样的日志：
#   ⏱️  外部API响应: XXXms, 获取 0 条原始数据
# 或
#   ❌ 同步失败: xxx

# 3. 手动测试外部API
# 使用Postman或curl测试API是否返回数据

# 4. 检查MongoDB中的最新日期
db.inboundscanrecords.find().sort({scanDate: -1}).limit(1)
```

### Q2: 提示"数据已是最新"但实际没有数据

**原因**：MongoDB中已有今天的数据，系统认为不需要同步

**解决**：
```bash
# 删除今天的数据重新同步
db.inboundscanrecords.deleteMany({ scanDate: "2025-12-11" })

# 或者清空所有数据重新同步
db.inboundscanrecords.deleteMany({})
```

### Q3: 运单号重复，数据没有更新

**说明**：这是正常行为！

系统使用 `$setOnInsert` 策略，意味着：
- 如果运单号已存在，**不会**更新数据
- 只有新的运单号才会插入

**如果需要强制更新**，修改代码：
```javascript
// 将 $setOnInsert 改为 $set
update: { $set: record }  // 会覆盖已有数据
```

## 性能优化建议

### 1. 批量大小调整

如果单天数据量很大（>10000条），可以调整批量处理大小：

```javascript
// InboundDataSyncService.js
const batchSize = options.batchSize || 1; // 每次只处理1天
```

### 2. 索引优化

确保MongoDB有正确的索引：

```javascript
// 货量数据索引
db.inboundscanrecords.createIndex({ waybillNumber: 1 }, { unique: true })
db.inboundscanrecords.createIndex({ scanDate: 1 })
db.inboundscanrecords.createIndex({ scanDate: 1, routeCode: 1 })

// 问题件数据索引
db.problemitems.createIndex({ waybillNumber: 1, registerDate: 1 })
db.problemitems.createIndex({ registerDate: 1 })
```

### 3. 定时自动同步（可选）

使用node-cron实现每天自动同步：

```javascript
// server/src/app.js
import cron from 'node-cron';
import InboundDataSyncService from './services/InboundDataSyncService.js';

// 每天凌晨1点自动同步
cron.schedule('0 1 * * *', async () => {
  console.log('🕐 开始定时同步...');
  const service = new InboundDataSyncService();
  await service.sync(process.env.DEFAULT_TOKEN);
});
```

## 总结

主要修复内容：
1. ✅ 使用正确的API参数格式（包含scanTypeList等字段）
2. ✅ 从MongoDB查询最新数据日期，而不是依赖SyncMetadata
3. ✅ 确认运单号去重逻辑正确

现在系统应该能够正常同步数据了！🎉
