import mongoose from 'mongoose';

const lostPackageSchema = new mongoose.Schema({
  // 异常完结原因
  reason: {
    type: String,
    required: true,
    trim: true
  },
  // 供应商名字
  supplier: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 完结时间
  finishTime: {
    type: Date,
    required: true,
    index: true
  },
  // 完结日期（用于快速查询）
  finishDate: {
    type: String, // YYYY-MM-DD格式
    required: true,
    index: true
  },
  // 类型（疑似丢包、确认丢包、库内丢包、库外丢包）
  type: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  // 司机姓名（需要从其他数据源匹配）
  driverName: {
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
lostPackageSchema.index({ finishDate: 1, supplier: 1 });
lostPackageSchema.index({ finishDate: 1, driverName: 1 });
lostPackageSchema.index({ finishDate: 1, type: 1 });

const LostPackage = mongoose.model('LostPackage', lostPackageSchema);

export default LostPackage;

