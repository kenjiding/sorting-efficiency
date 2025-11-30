import express from 'express';
import Record from '../models/Record.js';
import EfficiencyAnalysis from '../models/EfficiencyAnalysis.js';

const router = express.Router();

// 获取所有区域的汇总统计
router.get('/', async (req, res) => {
  res.json({
    message: 'test success. Hello, World!'
  });
})

export default router;