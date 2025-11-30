import express from 'express';
import { body, validationResult } from 'express-validator';
import InboundScanRecord from '../models/InboundScanRecord.js';
import Supplier from '../models/Supplier.js';
import Route from '../models/Route.js';
import SupplierRouteMapping from '../models/SupplierRouteMapping.js';

const router = express.Router();

// ==================== 到件扫描记录相关 ====================

// 批量上传到件扫描记录（从Excel）- 优化版本
router.post('/inbound-scans/upload', async (req, res) => {
  try {
    const { records } = req.body; // 前端解析后的记录数组
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '请提供有效的记录数据' });
    }

    const uploadBatchId = `batch_${Date.now()}`;
    const validRecords = [];
    const errorRecords = [];

    // 第一步：验证和预处理所有记录
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // 验证必填字段
        if (!record.scanTime || !record.waybillNumber || !record.routeCode) {
          errorRecords.push({
            index: i,
            waybillNumber: record.waybillNumber || '未知',
            error: '缺少必填字段：扫描时间、运单号或路由编码'
          });
          continue;
        }

        // 解析扫描时间
        let scanDate;
        let scanTime;
        
        if (record.scanTime instanceof Date) {
          scanTime = record.scanTime;
          scanDate = scanTime.toISOString().split('T')[0];
        } else if (typeof record.scanTime === 'string') {
          const date = new Date(record.scanTime);
          if (isNaN(date.getTime())) {
            errorRecords.push({
              index: i,
              waybillNumber: record.waybillNumber,
              error: '扫描时间格式无效'
            });
            continue;
          }
          scanTime = date;
          scanDate = date.toISOString().split('T')[0];
        } else {
          errorRecords.push({
            index: i,
            waybillNumber: record.waybillNumber,
            error: '扫描时间格式无效'
          });
          continue;
        }

        validRecords.push({
          scanTime,
          scanDate,
          waybillNumber: record.waybillNumber.trim(),
          routeCode: record.routeCode.trim().toUpperCase(),
          uploadBatchId
        });
      } catch (error) {
        errorRecords.push({
          index: i,
          waybillNumber: record.waybillNumber || '未知',
          error: error.message
        });
      }
    }

    if (validRecords.length === 0) {
      return res.json({
        success: false,
        message: '没有有效的记录可以导入',
        stats: {
          total: records.length,
          imported: 0,
          duplicates: 0,
          errors: errorRecords.length
        },
        duplicates: [],
        errors: errorRecords
      });
    }

    // 第二步：批量查询已存在的运单号（一次性查询）
    const waybillNumbers = validRecords.map(r => r.waybillNumber);
    const existingWaybills = await InboundScanRecord.find({
      waybillNumber: { $in: waybillNumbers }
    }).select('waybillNumber').lean();

    const existingWaybillSet = new Set(existingWaybills.map(e => e.waybillNumber));
    const duplicateWaybills = [];

    // 第三步：过滤出需要插入的新记录
    const recordsToInsert = validRecords.filter(record => {
      if (existingWaybillSet.has(record.waybillNumber)) {
        duplicateWaybills.push(record.waybillNumber);
        return false;
      }
      return true;
    });

    // 第四步：批量插入新记录（使用 insertMany，但需要处理重复键错误）
    let insertedCount = 0;
    const insertErrors = [];

    if (recordsToInsert.length > 0) {
      try {
        // 使用 ordered: false 允许部分插入成功，即使有重复键错误
        const result = await InboundScanRecord.insertMany(recordsToInsert, {
          ordered: false, // 即使某些记录失败，也继续插入其他记录
          rawResult: false
        });
        insertedCount = result.length;
      } catch (error) {
        // insertMany 在 ordered: false 时，即使部分失败也会抛出错误
        // 需要检查错误中的写入结果
        if (error.writeErrors) {
          // 部分插入成功
          insertedCount = error.result.insertedCount || 0;
          // 记录重复的运单号
          error.writeErrors.forEach(writeError => {
            if (writeError.code === 11000) {
              const failedIndex = writeError.index;
              if (recordsToInsert[failedIndex]) {
                duplicateWaybills.push(recordsToInsert[failedIndex].waybillNumber);
              }
            } else {
              insertErrors.push({
                waybillNumber: recordsToInsert[writeError.index]?.waybillNumber || '未知',
                error: writeError.errmsg || writeError.err?.message || '插入失败'
              });
            }
          });
        } else {
          // 其他错误
          throw error;
        }
      }
    }

    res.json({
      success: true,
      message: `成功导入 ${insertedCount} 条记录`,
      stats: {
        total: records.length,
        imported: insertedCount,
        duplicates: duplicateWaybills.length,
        errors: errorRecords.length + insertErrors.length
      },
      duplicates: [...new Set(duplicateWaybills)], // 去重
      errors: [...errorRecords, ...insertErrors]
    });
  } catch (error) {
    console.error('上传到件扫描记录失败:', error);
    res.status(500).json({ message: '上传失败', error: error.message });
  }
});

// 获取到件扫描记录（支持过滤和分页）
router.get('/inbound-scans', async (req, res) => {
  try {
    const { startDate, endDate, routeCode, page = 1, limit = 100 } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.scanDate = {};
      if (startDate) query.scanDate.$gte = startDate;
      if (endDate) query.scanDate.$lte = endDate;
    }

    if (routeCode) {
      query.routeCode = routeCode.toUpperCase();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const records = await InboundScanRecord.find(query)
      .sort({ scanTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InboundScanRecord.countDocuments(query);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取到件扫描记录失败:', error);
    res.status(500).json({ message: '获取记录失败', error: error.message });
  }
});

// 获取数据聚合统计（按天聚合）
router.get('/inbound-scans/aggregate', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始日期和结束日期' });
    }

    // 获取所有记录
    const records = await InboundScanRecord.find({
      scanDate: { $gte: startDate, $lte: endDate }
    });

    // 调试日志：记录查询结果
    if (startDate === endDate) {
      console.log(`[货量聚合] 单天查询 ${startDate}: 找到 ${records.length} 条记录`);
    }

    // 按天分组
    const grouped = {};
    
    records.forEach(record => {
      const key = record.scanDate; // 使用日期作为key

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          total: 0,
          byRoute: {},
          bySupplier: {}
        };
      }

      grouped[key].total++;
      
      // 按路由统计
      const routeCode = record.routeCode;
      if (!grouped[key].byRoute[routeCode]) {
        grouped[key].byRoute[routeCode] = 0;
      }
      grouped[key].byRoute[routeCode]++;

      // 按供应商统计（需要查询供应商-路由映射）
      // 这里先统计路由，后续再关联供应商
    });

    // 获取供应商-路由映射
    const mappings = await SupplierRouteMapping.find({ isActive: true })
      .populate('supplierId', 'name');

    // 构建路由到供应商的映射
    const routeToSupplier = {};
    mappings.forEach(mapping => {
      if (!routeToSupplier[mapping.routeCode]) {
        routeToSupplier[mapping.routeCode] = [];
      }
      routeToSupplier[mapping.routeCode].push({
        supplierId: mapping.supplierId._id.toString(),
        supplierName: mapping.supplierId.name
      });
    });

    // 按供应商统计
    Object.keys(grouped).forEach(key => {
      Object.keys(grouped[key].byRoute).forEach(routeCode => {
        const suppliers = routeToSupplier[routeCode] || [];
        suppliers.forEach(supplier => {
          if (!grouped[key].bySupplier[supplier.supplierId]) {
            grouped[key].bySupplier[supplier.supplierId] = {
              supplierId: supplier.supplierId,
              supplierName: supplier.supplierName,
              count: 0
            };
          }
          grouped[key].bySupplier[supplier.supplierId].count += grouped[key].byRoute[routeCode];
        });
      });
    });

    // 转换为数组格式，按日期排序
    const result = Object.values(grouped)
      .map(item => ({
        date: item.date,
        total: item.total,
        byRoute: Object.entries(item.byRoute).map(([routeCode, count]) => ({
          routeCode,
          count,
          percentage: item.total > 0 ? ((count / item.total) * 100).toFixed(2) : '0.00'
        })),
        bySupplier: Object.values(item.bySupplier).map(supplier => ({
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          count: supplier.count,
          percentage: item.total > 0 ? ((supplier.count / item.total) * 100).toFixed(2) : '0.00'
        }))
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // 按日期排序

    res.json(result);
  } catch (error) {
    console.error('获取聚合统计失败:', error);
    res.status(500).json({ message: '获取统计失败', error: error.message });
  }
});

// ==================== 供应商管理 ====================

// 获取所有供应商
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    console.error('获取供应商失败:', error);
    res.status(500).json({ message: '获取供应商失败', error: error.message });
  }
});

// 创建供应商
router.post('/suppliers', [
  body('name').notEmpty().withMessage('供应商名称不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;
    const supplier = new Supplier({ name: name.trim(), description: description || '' });
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '供应商名称已存在' });
    }
    console.error('创建供应商失败:', error);
    res.status(500).json({ message: '创建供应商失败', error: error.message });
  }
});

// 更新供应商
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), description, isActive },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    res.json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '供应商名称已存在' });
    }
    console.error('更新供应商失败:', error);
    res.status(500).json({ message: '更新供应商失败', error: error.message });
  }
});

// 删除供应商
router.delete('/suppliers/:id', async (req, res) => {
  try {
    // 检查是否有路由关联
    const mappings = await SupplierRouteMapping.find({ supplierId: req.params.id });
    if (mappings.length > 0) {
      return res.status(400).json({ 
        message: '该供应商还有路由关联，请先删除关联关系' 
      });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    res.json({ message: '供应商已删除' });
  } catch (error) {
    console.error('删除供应商失败:', error);
    res.status(500).json({ message: '删除供应商失败', error: error.message });
  }
});

// ==================== 路由管理 ====================

// 获取所有路由
router.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find().sort({ code: 1 });
    res.json(routes);
  } catch (error) {
    console.error('获取路由失败:', error);
    res.status(500).json({ message: '获取路由失败', error: error.message });
  }
});

// 创建路由
router.post('/routes', [
  body('code').notEmpty().withMessage('路由编码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, description } = req.body;
    const route = new Route({ 
      code: code.trim().toUpperCase(), 
      description: description || '' 
    });
    await route.save();
    res.status(201).json(route);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '路由编码已存在' });
    }
    console.error('创建路由失败:', error);
    res.status(500).json({ message: '创建路由失败', error: error.message });
  }
});

// 更新路由
router.put('/routes/:id', async (req, res) => {
  try {
    const { code, description, isActive } = req.body;
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { code: code?.trim().toUpperCase(), description, isActive },
      { new: true, runValidators: true }
    );

    if (!route) {
      return res.status(404).json({ message: '路由不存在' });
    }

    res.json(route);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '路由编码已存在' });
    }
    console.error('更新路由失败:', error);
    res.status(500).json({ message: '更新路由失败', error: error.message });
  }
});

// 删除路由
router.delete('/routes/:id', async (req, res) => {
  try {
    // 检查是否有供应商关联
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: '路由不存在' });
    }

    const mappings = await SupplierRouteMapping.find({ routeCode: route.code });
    if (mappings.length > 0) {
      return res.status(400).json({ 
        message: '该路由还有供应商关联，请先删除关联关系' 
      });
    }

    await Route.findByIdAndDelete(req.params.id);
    res.json({ message: '路由已删除' });
  } catch (error) {
    console.error('删除路由失败:', error);
    res.status(500).json({ message: '删除路由失败', error: error.message });
  }
});

// ==================== 供应商-路由关联管理 ====================

// 获取所有供应商-路由关联
router.get('/supplier-route-mappings', async (req, res) => {
  try {
    const mappings = await SupplierRouteMapping.find({ isActive: true })
      .populate('supplierId', 'name')
      .sort({ routeCode: 1 });
    res.json(mappings);
  } catch (error) {
    console.error('获取供应商-路由关联失败:', error);
    res.status(500).json({ message: '获取关联失败', error: error.message });
  }
});

// 创建供应商-路由关联
router.post('/supplier-route-mappings', [
  body('supplierId').notEmpty().withMessage('供应商ID不能为空'),
  body('routeCode').notEmpty().withMessage('路由编码不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplierId, routeCode } = req.body;

    // 验证供应商是否存在
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: '供应商不存在' });
    }

    // 验证路由是否存在
    const route = await Route.findOne({ code: routeCode.toUpperCase() });
    if (!route) {
      return res.status(404).json({ message: '路由不存在' });
    }

    const mapping = new SupplierRouteMapping({
      supplierId,
      routeCode: routeCode.trim().toUpperCase()
    });

    await mapping.save();
    await mapping.populate('supplierId', 'name');
    res.status(201).json(mapping);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: '该供应商和路由的关联已存在' });
    }
    console.error('创建供应商-路由关联失败:', error);
    res.status(500).json({ message: '创建关联失败', error: error.message });
  }
});

// 删除供应商-路由关联
router.delete('/supplier-route-mappings/:id', async (req, res) => {
  try {
    const mapping = await SupplierRouteMapping.findByIdAndDelete(req.params.id);
    if (!mapping) {
      return res.status(404).json({ message: '关联不存在' });
    }
    res.json({ message: '关联已删除' });
  } catch (error) {
    console.error('删除供应商-路由关联失败:', error);
    res.status(500).json({ message: '删除关联失败', error: error.message });
  }
});

export default router;

