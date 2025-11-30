import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  // 路由编码
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    uppercase: true // 统一转换为大写
  },
  // 路由描述
  description: {
    type: String,
    default: ''
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Route = mongoose.model('Route', routeSchema);

export default Route;

