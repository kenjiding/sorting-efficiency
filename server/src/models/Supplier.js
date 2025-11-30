import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  // 供应商名称
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  // 供应商描述
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

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

