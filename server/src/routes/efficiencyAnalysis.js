import express from 'express';
import { body, validationResult } from 'express-validator';
import EfficiencyAnalysis from '../models/EfficiencyAnalysis.js';

const router = express.Router();

// 验证中间件
const validateAnalysis = [
  body('region').isIn(['SA', 'SYD', 'MEL', 'BNE', 'PER']).withMessage('无效的区域'),
  body('analysisDate').notEmpty().withMessage('分析日期不能为空')
];

// 获取所有效率分析结果
router.get('/', async (req, res) => {
  try {
    const { region, startDate, endDate } = req.query;
    const query = {};
    
    if (region) {
      query.region = region;
    }
    
    if (startDate && endDate) {
      query.analysisDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.analysisDate = startDate;
    }
    
    const analyses = await EfficiencyAnalysis.find(query).sort({ createdAt: -1 });
    res.json(analyses);
  } catch (error) {
    console.error('获取效率分析失败:', error);
    res.status(500).json({ message: '获取效率分析失败', error: error.message });
  }
});

// 获取单个效率分析结果
router.get('/:id', async (req, res) => {
  try {
    const analysis = await EfficiencyAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: '分析结果不存在' });
    }
    res.json(analysis);
  } catch (error) {
    console.error('获取效率分析失败:', error);
    res.status(500).json({ message: '获取效率分析失败', error: error.message });
  }
});

// 创建新的效率分析结果
router.post('/', validateAnalysis, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const analysis = new EfficiencyAnalysis(req.body);
    await analysis.save();
    res.status(201).json(analysis);
  } catch (error) {
    console.error('创建效率分析失败:', error);
    res.status(500).json({ message: '创建效率分析失败', error: error.message });
  }
});

// 删除效率分析结果
router.delete('/:id', async (req, res) => {
  try {
    const analysis = await EfficiencyAnalysis.findByIdAndDelete(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({ message: '分析结果不存在' });
    }
    
    res.json({ message: '删除成功', analysis });
  } catch (error) {
    console.error('删除效率分析失败:', error);
    res.status(500).json({ message: '删除效率分析失败', error: error.message });
  }
});

export default router;

