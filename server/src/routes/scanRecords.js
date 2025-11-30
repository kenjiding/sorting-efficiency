import express from 'express';
import { body, validationResult } from 'express-validator';
import ScanRecord from '../models/ScanRecord.js';

const router = express.Router();

// 验证中间件
const validateScanRecord = [
  body('barcode').notEmpty().withMessage('条形码不能为空'),
  body('totalCount').custom((value) => {
    // 接受数字或可转换为数字的字符串
    if (value === null || value === undefined) {
      throw new Error('总数不能为空');
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || !isFinite(numValue)) {
      throw new Error('总数必须是有效的数字');
    }
    return true;
  }),
  body('boxes').isArray({ min: 1 }).withMessage('箱数必须是数组且至少包含一个元素'),
  body('scanTime').notEmpty().withMessage('扫描时间不能为空')
];

// 获取所有扫描记录（支持过滤）
router.get('/', async (req, res) => {
  try {
    const { barcode, startDate, endDate } = req.query;
    const query = {};
    
    if (barcode) {
      query.barcode = barcode;
    }
    
    if (startDate || endDate) {
      query.scanTime = {};
      if (startDate) {
        query.scanTime.$gte = startDate;
      }
      if (endDate) {
        query.scanTime.$lte = endDate;
      }
    }
    
    const records = await ScanRecord.find(query).sort({ scanTime: -1, createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error('获取扫描记录失败:', error);
    res.status(500).json({ message: '获取扫描记录失败', error: error.message });
  }
});

// 获取单个扫描记录
router.get('/:id', async (req, res) => {
  try {
    const record = await ScanRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    console.error('获取扫描记录失败:', error);
    res.status(500).json({ message: '获取扫描记录失败', error: error.message });
  }
});

// 根据条形码获取记录（用于回填数据）
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const records = await ScanRecord.find({ barcode: req.params.barcode })
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (records.length === 0) {
      return res.json(null);
    }
    
    res.json(records[0]);
  } catch (error) {
    console.error('获取条形码记录失败:', error);
    res.status(500).json({ message: '获取条形码记录失败', error: error.message });
  }
});

// 根据条形码获取所有记录（用于修改页面）
router.get('/barcode/:barcode/all', async (req, res) => {
  try {
    const records = await ScanRecord.find({ barcode: req.params.barcode })
      .sort({ scanTime: -1 });
    
    res.json(records);
  } catch (error) {
    console.error('获取条形码所有记录失败:', error);
    res.status(500).json({ message: '获取条形码所有记录失败', error: error.message });
  }
});

// 创建新扫描记录
router.post('/', validateScanRecord, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '数据验证失败',
        errors: errors.array() 
      });
    }

    const record = new ScanRecord(req.body);
    const savedRecord = await record.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('❌ 创建扫描记录失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({ 
      message: '创建扫描记录失败', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 更新扫描记录
router.put('/:id', async (req, res) => {
  try {
    const record = await ScanRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('更新扫描记录失败:', error);
    res.status(500).json({ message: '更新扫描记录失败', error: error.message });
  }
});

// 删除扫描记录
router.delete('/:id', async (req, res) => {
  try {
    const record = await ScanRecord.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    
    res.json({ message: '删除成功', record });
  } catch (error) {
    console.error('删除扫描记录失败:', error);
    res.status(500).json({ message: '删除扫描记录失败', error: error.message });
  }
});

// 获取合并后的历史记录（相同条形码合并）
router.get('/history/merged', async (req, res) => {
  try {
    const { barcode, startDate, endDate } = req.query;
    let query = {};
    
    if (barcode) {
      query.barcode = barcode;
    }
    
    // 获取所有记录，然后在内存中筛选日期
    let records = await ScanRecord.find(query).sort({ scanTime: -1 });
    
    // 按日期筛选
    if (startDate || endDate) {
      records = records.filter(record => {
        // scanTime 是字符串格式 "2024-01-01 12:00:00" 或 "2024/01/01 12:00:00"，需要提取日期部分
        let recordDate;
        if (typeof record.scanTime === 'string') {
          // 字符串格式："2024-01-01 12:00:00" 或 "2024/01/01 12:00:00"
          // 先替换斜杠为横杠，然后提取日期部分
          recordDate = record.scanTime.replace(/\//g, '-').split(' ')[0];
          // 确保格式是 YYYY-MM-DD
          const parts = recordDate.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            recordDate = `${year}-${month}-${day}`;
          }
        } else {
          // 如果是 Date 对象，转换为 YYYY-MM-DD 格式
          recordDate = new Date(record.scanTime).toISOString().split('T')[0];
        }
        
        // 比较日期（字符串格式 YYYY-MM-DD 可以直接比较）
        const isAfterStart = !startDate || recordDate >= startDate;
        const isBeforeEnd = !endDate || recordDate <= endDate;
        
        return isAfterStart && isBeforeEnd;
      });
    }
    
    // 按条形码合并记录
    const merged = {};
    records.forEach(record => {
      if (!merged[record.barcode]) {
        merged[record.barcode] = {
          barcode: record.barcode,
          totalCount: record.totalCount,
          pallet: record.boxes ? record.boxes.length : 0,
          lastScanTime: record.scanTime,
          recordId: record._id,
          boxes: record.boxes || []
        };
      } else {
        // 如果已存在，更新pallet数量（累加箱数）
        merged[record.barcode].pallet += (record.boxes ? record.boxes.length : 0);
        // 更新最后扫描时间（字符串可以直接比较，因为格式是 YYYY-MM-DD HH:mm:ss）
        const currentTime = merged[record.barcode].lastScanTime.replace(/\//g, '-');
        const recordTime = record.scanTime.replace(/\//g, '-');
        if (recordTime > currentTime) {
          merged[record.barcode].lastScanTime = record.scanTime;
          merged[record.barcode].recordId = record._id;
        }
      }
    });
    
    const mergedArray = Object.values(merged).sort((a, b) => {
      // 按字符串比较排序（降序，最新的在前）
      const timeA = a.lastScanTime.replace(/\//g, '-');
      const timeB = b.lastScanTime.replace(/\//g, '-');
      return timeB.localeCompare(timeA);
    });
    
    res.json(mergedArray);
  } catch (error) {
    console.error('❌ 获取合并历史记录失败:', error);
    res.status(500).json({ message: '获取合并历史记录失败', error: error.message });
  }
});

export default router;

