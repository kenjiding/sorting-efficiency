import mongoose from 'mongoose';

const scanRecordSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  totalCount: {
    type: Number,
    required: true
  },
  boxes: [{
    count: {
      type: Number,
      required: true
    },
    timestamp: {
      type: String,
      required: true
    }
  }],
  scanTime: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// 复合索引用于优化查询
scanRecordSchema.index({ barcode: 1, createdAt: -1 });
scanRecordSchema.index({ scanTime: -1 });

const ScanRecord = mongoose.model('ScanRecord', scanRecordSchema);

export default ScanRecord;

