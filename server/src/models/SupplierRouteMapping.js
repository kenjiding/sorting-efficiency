import mongoose from 'mongoose';

const supplierRouteMappingSchema = new mongoose.Schema({
  // 供应商ID
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },
  // 路由编码
  routeCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 复合唯一索引：确保同一供应商和路由编码的组合唯一
supplierRouteMappingSchema.index({ supplierId: 1, routeCode: 1 }, { unique: true });

// 复合索引：路由编码查询
supplierRouteMappingSchema.index({ routeCode: 1, isActive: 1 });

const SupplierRouteMapping = mongoose.model('SupplierRouteMapping', supplierRouteMappingSchema);

export default SupplierRouteMapping;

