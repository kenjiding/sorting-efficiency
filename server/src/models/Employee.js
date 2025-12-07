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
  }]
  // 注意：timestamps: true 会自动添加 createdAt 和 updatedAt 字段，不需要手动定义
}, {
  timestamps: true
});

// 创建复合唯一索引：region + employeeId
employeeSchema.index({ region: 1, employeeId: 1 }, { unique: true });

// 注意：timestamps: true 会自动处理 createdAt 和 updatedAt，不需要手动更新

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
