import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  region: {
    type: String,
    required: true,
    enum: ['SA', 'SYD', 'MEL', 'BNE', 'PER'], // 英文缩写
    index: true
  },
  coarseStartTime: {
    type: String,
    default: ''
  },
  coarseEndTime: {
    type: String,
    default: ''
  },
  fineStartTime: {
    type: String,
    default: ''
  },
  fineEndTime: {
    type: String,
    default: ''
  },
  coarseCount: {
    type: Number,
    default: 0
  },
  fineCount: {
    type: Number,
    default: 0
  },
  coarseEfficiency: {
    type: Number,
    default: 0
  },
  fineEfficiency: {
    type: Number,
    default: 0
  },
  totalWorkingHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 复合索引用于优化查询
recordSchema.index({ region: 1, date: 1 });
recordSchema.index({ region: 1, name: 1 });
recordSchema.index({ region: 1, date: 1, name: 1 });

// 计算效率的中间件
recordSchema.pre('save', function(next) {
  // 计算粗拣效率
  if (this.coarseStartTime && this.coarseEndTime && this.coarseCount !== undefined) {
    const coarseHours = calculateHours(this.coarseStartTime, this.coarseEndTime);
    this.coarseEfficiency = coarseHours > 0 ? Number((this.coarseCount / coarseHours).toFixed(2)) : 0;
  }
  
  // 计算细拣效率
  if (this.fineStartTime && this.fineEndTime && this.fineCount !== undefined) {
    const fineHours = calculateHours(this.fineStartTime, this.fineEndTime);
    this.fineEfficiency = fineHours > 0 ? Number((this.fineCount / fineHours).toFixed(2)) : 0;
  }

  // 计算总工作时间
  let totalHours = 0;
  if (this.coarseStartTime && this.coarseEndTime) {
    totalHours += calculateHours(this.coarseStartTime, this.coarseEndTime);
  }
  if (this.fineStartTime && this.fineEndTime) {
    totalHours += calculateHours(this.fineStartTime, this.fineEndTime);
  }
  this.totalWorkingHours = Number(totalHours.toFixed(2));

  next();
});

// 辅助函数：计算时间差
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // 处理跨夜工作
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

const Record = mongoose.model('Record', recordSchema);

export default Record;

