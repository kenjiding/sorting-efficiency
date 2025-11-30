import mongoose from 'mongoose';

const problemItemSchema = new mongoose.Schema({
  // 运单号
  waybillNumber: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 所属供应商
  supplier: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 问题件原因
  reason: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 司机编码
  driverCode: {
    type: String,
    trim: true
  },
  // 司机姓名
  driverName: {
    type: String,
    index: true,
    trim: true
  },
  // 登记时间
  registerTime: {
    type: Date,
    required: true,
    index: true
  },
  // 登记日期（用于快速查询）
  registerDate: {
    type: String, // YYYY-MM-DD格式
    required: true,
    index: true
  },
  // 路由码（从货量数据匹配）
  routeCode: {
    type: String,
    index: true,
    trim: true
  },
  // 上传批次ID
  uploadBatchId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// 复合索引
problemItemSchema.index({ registerDate: 1, supplier: 1 });
problemItemSchema.index({ registerDate: 1, driverName: 1 });
problemItemSchema.index({ registerDate: 1, reason: 1 });

const ProblemItem = mongoose.model('ProblemItem', problemItemSchema);

export default ProblemItem;

