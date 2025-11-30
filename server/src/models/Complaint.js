import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  // 工单创建时间
  createTime: {
    type: Date,
    required: true,
    index: true
  },
  // 创建日期（用于快速查询）
  createDate: {
    type: String, // YYYY-MM-DD格式
    required: true,
    index: true
  },
  // 工单子类（客诉类型）
  subCategory: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 供应商（需要从其他数据源匹配）
  supplier: {
    type: String,
    index: true,
    trim: true
  },
  // 司机姓名（需要从其他数据源匹配）
  driverName: {
    type: String,
    index: true,
    trim: true
  },
  // 路由码（需要从其他数据源匹配）
  routeCode: {
    type: String,
    index: true,
    trim: true
  },
  // 状态
  status: {
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
complaintSchema.index({ createDate: 1, supplier: 1 });
complaintSchema.index({ createDate: 1, driverName: 1 });
complaintSchema.index({ createDate: 1, routeCode: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;

