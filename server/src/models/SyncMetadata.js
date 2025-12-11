import mongoose from 'mongoose';

/**
 * 同步元数据模型
 * 用于记录各个数据模块的同步状态和历史
 */
const syncMetadataSchema = new mongoose.Schema({
  // 数据类型（标识不同的数据模块）
  dataType: {
    type: String,
    required: true,
    enum: ['inbound', 'problemItem', 'lostPackage', 'complaint'], // 可扩展
    index: true
  },
  // 上次同步的最后日期
  lastSyncDate: {
    type: String, // YYYY-MM-DD格式
    required: true
  },
  // 上次同步时间戳
  lastSyncTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  // 同步状态
  status: {
    type: String,
    enum: ['success', 'failed', 'in_progress'],
    default: 'success'
  },
  // 本次同步的记录数
  syncedRecordCount: {
    type: Number,
    default: 0
  },
  // 同步的日期范围
  syncDateRange: {
    start: String,
    end: String
  },
  // 错误信息（如果同步失败）
  errorMessage: {
    type: String,
    default: null
  },
  // 同步耗时（毫秒）
  durationMs: {
    type: Number,
    default: 0
  },
  // 外部API配置（保存最后使用的API配置）
  apiConfig: {
    url: String,
    params: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 复合索引：dataType唯一性，每种数据类型只保留最新的同步记录
syncMetadataSchema.index({ dataType: 1 }, { unique: true });

// 时间索引
syncMetadataSchema.index({ lastSyncTimestamp: -1 });

const SyncMetadata = mongoose.model('SyncMetadata', syncMetadataSchema);

export default SyncMetadata;
