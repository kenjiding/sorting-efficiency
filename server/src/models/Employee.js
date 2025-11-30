import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['worker', 'forklift', 'receptionist'],
    default: 'worker',
    required: true
  },
  roleHistory: [{
    role: {
      type: String,
      enum: ['worker', 'forklift', 'receptionist'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建复合唯一索引：region + employeeId
employeeSchema.index({ region: 1, employeeId: 1 }, { unique: true });

// 更新时间戳
employeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 添加角色变更方法
employeeSchema.methods.changeRole = function(newRole) {
  if (this.role !== newRole) {
    this.roleHistory.push({
      role: newRole,
      changedAt: new Date()
    });
    this.role = newRole;
  }
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
