import mongoose from 'mongoose';

const wageRecordSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    trim: true
  },
  nickname: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  workday: {
    type: String,
    trim: true
  },
  firstClockIn: {
    type: String,
    trim: true
  },
  lastClockOut: {
    type: String,
    trim: true
  },
  totalHours: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['worker', 'forklift', 'receptionist'],
    default: 'worker',
    required: true
  },
  isSorting: {
    type: Boolean,
    default: false
  },
  isPublicHoliday: {
    type: Boolean,
    default: false
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  totalHoursDecimal: {
    type: Number,
    required: true
  },
  totalWage: {
    type: Number,
    required: true
  },
  uploadBatchId: {
    type: String,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建复合索引，确保同一region同一员工同一天只有一条记录
wageRecordSchema.index({ region: 1, employeeId: 1, date: 1 }, { unique: true });

// 计算总时长十进制的静态方法
wageRecordSchema.statics.calculateDecimalHours = function(totalHours) {
  // 兼容两种格式：
  // 1. HH:MM (例如: 08:54 表示 8小时54分钟)
  // 2. HH.MM (例如: 8.54 表示 8小时54分钟)
  const timeStr = totalHours.toString().trim();
  
  // 检查是否包含冒号（HH:MM格式）
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  } 
  // 检查是否包含点（HH.MM格式）
  else if (timeStr.includes('.')) {
    const parts = timeStr.split('.');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  }
  // 只有数字，当作小时数
  else {
    return parseFloat(timeStr) || 0;
  }
};

// 计算时薪的静态方法
wageRecordSchema.statics.calculateHourlyRate = function(role, workday, isSorting, isPublicHoliday) {
  // 时薪表
  const rateTable = {
    '普通小工': {
      workday: 34.44,
      weekend: 34.44,
      sortingWeekend: 43.05,
      publicHoliday: 86.1
    },
    '叉车': {
      workday: 36.9,
      weekend: 36.9,
      sortingWeekend: 46.125,
      publicHoliday: 92.25
    },
    '前台': {
      workday: 36.9,
      weekend: 36.9,
      sortingWeekend: 46.125,
      publicHoliday: 92.25
    }
  };

  // 公共节假日优先
  if (isPublicHoliday) {
    return rateTable[role].publicHoliday;
  }

  // 判断是否是周末
  const dayName = workday?.trim().toLowerCase();
  const isWeekend = dayName === '周六' || dayName === '周日' || 
                    dayName === 'saturday' || dayName === 'sunday' ||
                    dayName === '星期六' || dayName === '星期日';

  if (isWeekend) {
    // 周末 - 根据是否分拣
    return isSorting ? rateTable[role].sortingWeekend : rateTable[role].weekend;
  } else {
    // 工作日
    return rateTable[role].workday;
  }
};

const WageRecord = mongoose.model('WageRecord', wageRecordSchema);

export default WageRecord;
