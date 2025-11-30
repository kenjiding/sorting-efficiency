import mongoose from 'mongoose';

const inboundScanRecordSchema = new mongoose.Schema({
  // 扫描时间（入站扫描时间）
  scanTime: {
    type: Date,
    required: true,
    index: true
  },
  // 扫描日期（从scanTime提取，用于快速查询）
  scanDate: {
    type: String, // YYYY-MM-DD格式
    required: true,
    index: true
  },
  // 运单号（每个包裹的唯一标识）
  waybillNumber: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 路由编码（细分结束笼框的号码）
  routeCode: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 是否已上传过（用于去重检测）
  isUploaded: {
    type: Boolean,
    default: true
  },
  // 上传批次ID（用于追踪同一批次上传的数据）
  uploadBatchId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// 复合索引：运单号唯一性（用于去重检测）
inboundScanRecordSchema.index({ waybillNumber: 1 }, { unique: true });

// 复合索引：日期和路由编码（用于快速查询和聚合）
inboundScanRecordSchema.index({ scanDate: 1, routeCode: 1 });

// 复合索引：日期和上传批次（用于追踪上传历史）
inboundScanRecordSchema.index({ scanDate: 1, uploadBatchId: 1 });

const InboundScanRecord = mongoose.model('InboundScanRecord', inboundScanRecordSchema);

export default InboundScanRecord;

