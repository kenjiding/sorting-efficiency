# 数据同步架构文档

## 概述

本文档描述了从"前端->后端->外部API实时查询"到"一键同步外部数据到MongoDB，然后从本地读取"的架构改造。

## 架构设计原则

1. **可扩展性** - 通过抽象基类设计，方便后续添加新的数据模块（如丢包分析、客诉分析）
2. **可复用性** - 前端和后端都有通用组件/服务，避免重复代码
3. **增量同步** - 自动记录上次同步日期，只同步新增数据
4. **性能优化** - 批量操作、分批同步、去重处理

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                         │
├─────────────────────────────────────────────────────────────┤
│  DataSyncButton (通用同步按钮组件)                            │
│  ├─ 全局同步按钮 (Dashboard)                                  │
│  ├─ 货量数据同步                                              │
│  └─ 问题件数据同步                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API层 (apiClient.js)                      │
├─────────────────────────────────────────────────────────────┤
│  dataSync.getStatus()       - 获取同步状态                    │
│  dataSync.syncInbound()     - 同步货量数据                    │
│  dataSync.syncProblemItems() - 同步问题件数据                 │
│  dataSync.syncAll()         - 全量同步                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   后端路由层 (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  POST /api/sync/inbound      - 同步货量数据                   │
│  POST /api/sync/problem-items - 同步问题件数据                │
│  POST /api/sync/all          - 全量同步                       │
│  GET  /api/sync/status       - 获取同步状态                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   服务层 (Services)                          │
├─────────────────────────────────────────────────────────────┤
│  DataSyncService (抽象基类)                                  │
│  ├─ getLastSyncMetadata()   - 获取上次同步元数据             │
│  ├─ calculateSyncDateRange() - 计算需要同步的日期范围         │
│  ├─ sync()                  - 执行同步（模板方法）            │
│  └─ fetchAndSaveData()      - 抽象方法（子类实现）            │
│                                                              │
│  InboundDataSyncService (货量数据同步)                        │
│  └─ 从外部API获取货量数据并保存到MongoDB                      │
│                                                              │
│  ProblemItemSyncService (问题件数据同步)                      │
│  └─ 从外部API获取问题件数据并保存到MongoDB                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   数据层 (MongoDB Models)                    │
├─────────────────────────────────────────────────────────────┤
│  SyncMetadata        - 同步元数据（记录上次同步时间等）       │
│  InboundScanRecord   - 货量数据（运单号、路由码、扫描时间）    │
│  ProblemItem         - 问题件数据（运单号、原因、司机等）      │
└─────────────────────────────────────────────────────────────┘
```

## 数据流程

### 1. 同步流程

```
用户点击"同步最新数据"
    ↓
DataSyncButton触发同步
    ↓
调用 apiClient.dataSync.syncAll(token)
    ↓
后端 /api/sync/all 接收请求
    ↓
并行执行 InboundDataSyncService.sync() 和 ProblemItemSyncService.sync()
    ↓
每个Service执行以下步骤：
    1. 从SyncMetadata获取上次同步日期
    2. 计算需要同步的日期范围（从上次同步日期+1天 到 今天）
    3. 分批调用外部API获取数据
    4. 批量插入MongoDB（自动去重）
    5. 更新SyncMetadata记录本次同步信息
    ↓
返回同步结果（成功/失败、记录数、耗时等）
    ↓
前端显示同步结果Toast提示
```

### 2. 查询流程（以问题件为例）

```
用户访问"服务数据-问题件数量分析"
    ↓
ProblemItemModule加载
    ↓
调用 apiClient.serviceData.getProblemItems({ dimension, timeUnit, startDate, endDate })
    ↓
后端 /api/service-data/problem-items 接收请求
    ↓
查询MongoDB ProblemItem集合
    ↓
按维度（供应商/司机/原因）和时间单位（天/周/月）聚合
    ↓
返回聚合后的数据
    ↓
前端展示图表和表格
```

## 核心代码结构

### 后端

```
server/src/
├── models/
│   ├── SyncMetadata.js           # 同步元数据模型
│   ├── InboundScanRecord.js      # 货量数据模型
│   └── ProblemItem.js            # 问题件数据模型
├── services/
│   ├── DataSyncService.js        # 抽象基类（模板方法模式）
│   ├── InboundDataSyncService.js # 货量数据同步服务
│   └── ProblemItemSyncService.js # 问题件数据同步服务
├── routes/
│   ├── dataSync.js               # 数据同步路由
│   └── serviceData.js            # 服务数据查询路由（已存在，已包含MongoDB查询）
└── utils/
    └── dataFromExternal.js       # 外部API调用封装（已存在）
```

### 前端

```
src/
├── components/
│   ├── common/
│   │   └── DataSyncButton.jsx    # 通用同步按钮组件
│   ├── DataDashboard.jsx         # Dashboard主页（添加了全局同步按钮）
│   └── DataDashboard/
│       └── ServiceData/
│           └── ProblemItemModule.jsx  # 问题件模块（改为从MongoDB读取）
├── api/
│   ├── config.js                 # API端点配置
│   └── apiClient.js              # API客户端（添加了dataSync方法）
└── contexts/
    └── TokenContext.jsx          # Token上下文（已存在）
```

## 关键特性

### 1. 增量同步

- `SyncMetadata` 模型记录每个数据模块的 `lastSyncDate`
- 每次同步时，只同步从 `lastSyncDate + 1` 到今天的数据
- 首次同步时，默认同步最近7天的数据（外部API限制）

### 2. 批量处理

- **货量数据**：每批处理3天，避免单次请求数据量过大
- **问题件数据**：每批处理7天（外部API支持）
- 使用MongoDB的 `bulkWrite` 批量插入，性能更好

### 3. 去重机制

```javascript
// 使用 updateOne + upsert 实现去重
const bulkOps = records.map(record => ({
  updateOne: {
    filter: { waybillNumber: record.waybillNumber },
    update: { $setOnInsert: record },
    upsert: true
  }
}));
```

### 4. 错误处理

- 单个日期同步失败不影响其他日期
- 同步失败时更新 `SyncMetadata.status = 'failed'` 和错误信息
- 前端Toast提示同步结果

## 外部API配置

### 货量数据API

- **URL**: `https://ds.imile.com/lm/express/ops/v1/biz/inbound/query`
- **方法**: POST
- **参数**:
  ```json
  {
    "currentPage": 1,
    "showCount": 9999,
    "startTime": "YYYY-MM-DD 00:00:00",
    "endTime": "YYYY-MM-DD 23:59:59"
  }
  ```
- **返回字段**:
  - `waybillNo`: 运单号
  - `scanDate`: 扫描时间
  - `routeCode`: 路由编码

### 问题件数据API

- **URL**: `https://ds.imile.com/dms/migrate/biz/problem/audit/searchNew`
- **方法**: POST
- **参数**:
  ```json
  {
    "currentPage": 1,
    "showCount": 9999,
    "start": "YYYY-MM-DD 00:00:00",
    "end": "YYYY-MM-DD 23:59:59",
    "hubCode": "S210431701",
    "searchType": "register",
    "waybillNos": []
  }
  ```
- **返回字段**:
  - `waybillNo`: 运单号
  - `vendor`: 供应商
  - `problemReasonDesc`: 问题件原因
  - `daName`: 司机姓名
  - `registerDateTime`: 登记时间

## 扩展指南

### 添加新的数据模块（如"丢包分析"）

1. **创建MongoDB模型**（如果不存在）
   ```javascript
   // server/src/models/LostPackage.js
   ```

2. **创建同步服务**
   ```javascript
   // server/src/services/LostPackageSyncService.js
   import DataSyncService from './DataSyncService.js';
   
   class LostPackageSyncService extends DataSyncService {
     constructor() {
       super('lostPackage', {
         url: 'https://external-api.com/lost-packages',
         method: 'POST'
       });
     }
     
     async fetchAndSaveData(dates, token, options) {
       // 实现具体的数据获取和保存逻辑
     }
   }
   ```

3. **添加路由**
   ```javascript
   // server/src/routes/dataSync.js
   router.post('/lost-packages', async (req, res) => {
     const service = new LostPackageSyncService();
     const result = await service.sync(token, options);
     res.json(result);
   });
   ```

4. **更新前端apiClient**
   ```javascript
   // src/api/apiClient.js
   dataSync = {
     syncLostPackages: (token, options = {}) => {
       const url = `${API_ENDPOINTS.SYNC_LOST_PACKAGES}?token=${token}`;
       return this.post(url, options);
     }
   }
   ```

5. **使用DataSyncButton组件**
   ```jsx
   <DataSyncButton 
     syncType="lostPackage"
     label="同步丢包数据"
     onSyncComplete={handleSyncComplete}
   />
   ```

## 性能优化建议

1. **数据库索引**
   - `SyncMetadata`: `dataType` 唯一索引
   - `InboundScanRecord`: `waybillNumber` 唯一索引, `scanDate` + `routeCode` 复合索引
   - `ProblemItem`: `registerDate` + 各维度字段的复合索引

2. **分批同步**
   - 根据外部API的限制和数据量，合理设置 `batchSize`
   - 避免单次请求数据量过大导致超时

3. **定时同步**（可选）
   - 可以使用 `node-cron` 定时执行同步任务
   - 建议凌晨自动同步前一天的数据

4. **缓存策略**（可选）
   - 对于不常变化的聚合查询结果，可以考虑使用Redis缓存

## 监控和日志

### 同步日志

每次同步都会输出详细日志：

```
🔄 开始同步 inbound 数据...
📅 上次同步日期: 2025-12-01
📊 需要同步的日期: 2025-12-02 至 2025-12-11 (共10天)
📦 正在同步第 1/4 批...
  📅 同步 2025-12-02 的数据...
  ⏱️  外部API响应: 1250ms, 获取 523 条原始数据
  ✅ 2025-12-02: 插入 523 条新记录（跳过 0 条重复），耗时 89ms
...
✅ inbound 同步完成！共5234条记录，耗时12500ms
```

### 同步状态查询

```bash
# 获取所有模块的同步状态
GET /api/sync/status

# 返回示例
{
  "success": true,
  "data": {
    "inbound": {
      "dataType": "inbound",
      "status": "success",
      "lastSyncDate": "2025-12-11",
      "lastSyncTimestamp": "2025-12-11T10:30:00.000Z",
      "syncedRecordCount": 5234,
      "durationMs": 12500
    },
    "problemItem": {
      "dataType": "problemItem",
      "status": "success",
      "lastSyncDate": "2025-12-11",
      "syncedRecordCount": 1523,
      "durationMs": 8200
    }
  }
}
```

## 常见问题

### Q1: 首次同步需要多长时间？

A: 取决于数据量和网络速度。以问题件为例，如果外部API每秒返回1000条记录，同步7天约需要10-30秒。

### Q2: 如何重新同步某个日期的数据？

A: 可以手动修改 `SyncMetadata` 表中的 `lastSyncDate`，下次同步时会从该日期之后开始。或者删除对应的记录重新同步。

### Q3: 同步失败怎么办？

A: 查看后端日志确定失败原因（网络问题、Token过期、外部API限流等）。修复问题后重新点击同步按钮。

### Q4: 能否支持实时同步？

A: 当前设计是手动触发同步。如需实时同步，可以：
1. 添加定时任务（如每小时同步一次）
2. 使用WebSocket推送通知前端自动同步

## 总结

本架构通过以下方式实现了高可扩展性和可维护性：

1. **抽象基类**：`DataSyncService` 提供了通用的同步框架
2. **模板方法模式**：子类只需实现 `fetchAndSaveData()` 方法
3. **通用组件**：`DataSyncButton` 可复用于各种数据模块
4. **增量同步**：通过 `SyncMetadata` 自动追踪同步进度
5. **批量操作**：提高性能，减少数据库压力

后续添加新的数据模块（如丢包分析、客诉分析）时，只需：
1. 创建新的 `XXXSyncService` 继承 `DataSyncService`
2. 实现 `fetchAndSaveData()` 方法
3. 添加路由和前端API调用
4. 使用 `DataSyncButton` 组件

整个过程无需修改核心逻辑，符合开闭原则（对扩展开放，对修改关闭）。
