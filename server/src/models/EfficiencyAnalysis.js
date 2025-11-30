import mongoose from 'mongoose';

const efficiencyAnalysisSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
    enum: ['SA', 'SYD', 'MEL', 'BNE', 'PER'], // 英文缩写
    index: true
  },
  analysisDate: {
    type: String,
    required: true,
    index: true
  },
  totalScans: {
    type: Number,
    default: 0
  },
  averageTotalEfficiency: {
    type: Number,
    default: 0
  },
  operators: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  scanningDataCount: {
    type: Number,
    default: 0
  },
  routeDataCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 复合索引
efficiencyAnalysisSchema.index({ region: 1, analysisDate: 1 });

const EfficiencyAnalysis = mongoose.model('EfficiencyAnalysis', efficiencyAnalysisSchema);

export default EfficiencyAnalysis;

