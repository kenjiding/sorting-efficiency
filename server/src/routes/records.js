import express from 'express';
import { body, validationResult } from 'express-validator';
import Record from '../models/Record.js';

const router = express.Router();

// 验证中间件
const validateRecord = [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('name').notEmpty().withMessage('姓名不能为空'),
  body('region').isIn(['SA', 'SYD', 'MEL', 'BNE', 'PER']).withMessage('无效的区域')
];

// 获取所有记录（支持按region过滤）
router.get('/', async (req, res) => {
  try {
    const { region, startDate, endDate, name } = req.query;
    const query = {};
    
    if (region) {
      query.region = region;
    }
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }
    
    if (name) {
      query.name = name;
    }
    
    const records = await Record.find(query).sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ message: '获取记录失败', error: error.message });
  }
});

// 获取单个记录
router.get('/:id', async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ message: '获取记录失败', error: error.message });
  }
});

// 创建新记录
router.post('/', validateRecord, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const record = new Record(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    console.error('创建记录失败:', error);
    res.status(500).json({ message: '创建记录失败', error: error.message });
  }
});

// 批量创建记录
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '请提供有效的记录数组' });
    }

    const createdRecords = await Record.insertMany(records);
    res.status(201).json(createdRecords);
  } catch (error) {
    console.error('批量创建记录失败:', error);
    res.status(500).json({ message: '批量创建记录失败', error: error.message });
  }
});

// 更新记录
router.put('/:id', validateRecord, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const record = await Record.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('更新记录失败:', error);
    res.status(500).json({ message: '更新记录失败', error: error.message });
  }
});

// 批量更新记录
router.put('/bulk/update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供有效的ID数组' });
    }

    const result = await Record.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );
    
    res.json({ 
      message: '批量更新成功',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('批量更新记录失败:', error);
    res.status(500).json({ message: '批量更新记录失败', error: error.message });
  }
});

// 删除记录
router.delete('/:id', async (req, res) => {
  try {
    const record = await Record.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    res.json({ message: '删除成功', record });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ message: '删除记录失败', error: error.message });
  }
});

// 批量删除记录
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '请提供有效的ID数组' });
    }

    const result = await Record.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      message: '批量删除成功',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('批量删除记录失败:', error);
    res.status(500).json({ message: '批量删除记录失败', error: error.message });
  }
});

// 获取唯一的姓名列表（按region过滤）
router.get('/meta/names', async (req, res) => {
  try {
    const { region } = req.query;
    const query = region ? { region } : {};
    
    const names = await Record.distinct('name', query);
    res.json(names.filter(name => name && name.trim() !== ''));
  } catch (error) {
    console.error('获取姓名列表失败:', error);
    res.status(500).json({ message: '获取姓名列表失败', error: error.message });
  }
});

// 获取日期聚合数据
router.get('/aggregate/by-date', async (req, res) => {
  try {
    const { date, region } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: '请提供日期参数' });
    }

    const query = { date };
    if (region) {
      query.region = region;
    }
    
    const records = await Record.find(query);
    
    const aggregated = records.reduce((acc, record) => {
      if (!acc[record.name]) {
        acc[record.name] = {
          name: record.name,
          totalCoarseCount: 0,
          totalFineCount: 0,
          totalWorkingHours: 0,
          avgCoarseEfficiency: 0,
          avgFineEfficiency: 0,
          recordCount: 0
        };
      }
      
      const user = acc[record.name];
      user.totalCoarseCount += record.coarseCount || 0;
      user.totalFineCount += record.fineCount || 0;
      user.totalWorkingHours += record.totalWorkingHours || 0;
      user.avgCoarseEfficiency += record.coarseEfficiency || 0;
      user.avgFineEfficiency += record.fineEfficiency || 0;
      user.recordCount++;
      
      return acc;
    }, {});

    // 计算平均值
    Object.values(aggregated).forEach(user => {
      user.avgCoarseEfficiency = user.recordCount > 0 ? 
        Number((user.avgCoarseEfficiency / user.recordCount).toFixed(2)) : 0;
      user.avgFineEfficiency = user.recordCount > 0 ? 
        Number((user.avgFineEfficiency / user.recordCount).toFixed(2)) : 0;
      user.totalWorkingHours = Number(user.totalWorkingHours.toFixed(2));
    });

    res.json(Object.values(aggregated));
  } catch (error) {
    console.error('获取聚合数据失败:', error);
    res.status(500).json({ message: '获取聚合数据失败', error: error.message });
  }
});

export default router;

