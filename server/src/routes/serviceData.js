import express from 'express';
import ProblemItem from '../models/ProblemItem.js';
import LostPackage from '../models/LostPackage.js';
import Complaint from '../models/Complaint.js';
import InboundScanRecord from '../models/InboundScanRecord.js';
import Supplier from '../models/Supplier.js';
import SupplierRouteMapping from '../models/SupplierRouteMapping.js';

const router = express.Router();

// ==================== 问题件相关 ====================

// 上传问题件数据
router.post('/problem-items/upload', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '请提供有效的记录数据' });
    }

    const uploadBatchId = `problem_batch_${Date.now()}`;
    const validRecords = [];
    const errorRecords = [];

    // 第一步：验证和预处理所有记录
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        if (!record.waybillNumber || !record.registerTime) {
          errorRecords.push({
            index: i,
            waybillNumber: record.waybillNumber || '未知',
            error: '缺少必填字段'
          });
          continue;
        }

        let registerTime;
        let registerDate;
        
        if (record.registerTime instanceof Date) {
          registerTime = record.registerTime;
          registerDate = registerTime.toISOString().split('T')[0];
        } else if (typeof record.registerTime === 'string') {
          const date = new Date(record.registerTime);
          if (isNaN(date.getTime())) {
            errorRecords.push({
              index: i,
              waybillNumber: record.waybillNumber,
              error: '登记时间格式无效'
            });
            continue;
          }
          registerTime = date;
          registerDate = date.toISOString().split('T')[0];
        } else {
          errorRecords.push({
            index: i,
            waybillNumber: record.waybillNumber,
            error: '登记时间格式无效'
          });
          continue;
        }

        validRecords.push({
          waybillNumber: record.waybillNumber.trim(),
          supplier: record.supplier?.trim() || '',
          reason: record.reason?.trim() || '',
          driverCode: record.driverCode?.trim() || '',
          driverName: record.driverName?.trim() || '',
          registerTime,
          registerDate,
          routeCode: record.routeCode?.trim() || '', // 先保存前端传入的路由码
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

    // 第二步：批量匹配路由码（只匹配没有路由码的记录）
    const waybillNumbersToMatch = validRecords
      .filter(r => !r.routeCode)
      .map(r => r.waybillNumber);
    
    if (waybillNumbersToMatch.length > 0) {
      const routeMapping = await InboundScanRecord.find({
        waybillNumber: { $in: waybillNumbersToMatch }
      }).select('waybillNumber routeCode').lean();
      
      const routeMap = new Map();
      routeMapping.forEach(item => {
        if (item.routeCode) {
          routeMap.set(item.waybillNumber, item.routeCode);
        }
      });
      
      // 更新路由码
      validRecords.forEach(record => {
        if (!record.routeCode && routeMap.has(record.waybillNumber)) {
          record.routeCode = routeMap.get(record.waybillNumber);
        }
      });
    }

    // 批量插入（使用insertMany，忽略重复）
    if (validRecords.length > 0) {
      await ProblemItem.insertMany(validRecords, { ordered: false });
    }

    res.json({
      success: true,
      message: `成功上传 ${validRecords.length} 条记录，${errorRecords.length} 条错误`,
      validCount: validRecords.length,
      errorCount: errorRecords.length,
      errors: errorRecords.slice(0, 10) // 只返回前10个错误
    });
  } catch (error) {
    console.error('上传问题件数据失败:', error);
    res.status(500).json({ message: '上传失败: ' + error.message });
  }
});

// 获取问题件数据（支持多维度聚合）
router.get('/problem-items', async (req, res) => {
  try {
    const { dimension = 'supplier', timeUnit = 'day', startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始日期和结束日期' });
    }

    // 构建查询条件
    const matchStage = {
      registerDate: { $gte: startDate, $lte: endDate }
    };

    // 先获取所有数据
    const allRecords = await ProblemItem.find(matchStage).lean();

    // 根据时间单位处理数据
    const processedRecords = allRecords.map(record => {
      let timePeriod = record.registerDate;
      
      if (timeUnit === 'week') {
        // 计算该日期所在周的周一
        const date = new Date(record.registerDate);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        timePeriod = monday.toISOString().split('T')[0];
      } else if (timeUnit === 'month') {
        // 取年月
        timePeriod = record.registerDate.substring(0, 7);
      }
      
      return {
        ...record,
        timePeriod
      };
    });

    // 按维度和时间周期分组
    const groupedData = new Map();
    
    processedRecords.forEach(record => {
      let dimensionKey;
    if (dimension === 'supplier') {
        dimensionKey = (record.supplier && record.supplier.trim()) || '未知供应商';
    } else if (dimension === 'driver') {
        dimensionKey = (record.driverName && record.driverName.trim()) || '未知司机';
      } else {
        dimensionKey = (record.reason && record.reason.trim()) || '未知原因';
    }

      // 按时间周期+维度分组
      const key = `${record.timePeriod}_${dimensionKey}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timePeriod: record.timePeriod,
          supplier: (record.supplier && record.supplier.trim()) || '',
          driverName: (record.driverName && record.driverName.trim()) || '',
          reason: (record.reason && record.reason.trim()) || '',
          count: 0,
          registerTime: record.registerTime
        });
      } else {
        const existing = groupedData.get(key);
        if (!existing.supplier && record.supplier && record.supplier.trim()) {
          existing.supplier = record.supplier.trim();
        }
        if (!existing.driverName && record.driverName && record.driverName.trim()) {
          existing.driverName = record.driverName.trim();
        }
        if (!existing.reason && record.reason && record.reason.trim()) {
          existing.reason = record.reason.trim();
        }
        if (record.registerTime && (!existing.registerTime || new Date(record.registerTime) > new Date(existing.registerTime))) {
          existing.registerTime = record.registerTime;
        }
      }
      
      groupedData.get(key).count += 1;
    });

    const formattedResults = Array.from(groupedData.values())
      .sort((a, b) => {
        // 先按时间周期排序，再按数量排序
        if (a.timePeriod !== b.timePeriod) {
          return a.timePeriod.localeCompare(b.timePeriod);
        }
        return b.count - a.count;
      })
      .map(item => ({
        registerTime: item.registerTime ? item.registerTime.toISOString().split('T')[0] : item.timePeriod,
        timePeriod: item.timePeriod,
        supplier: item.supplier,
        driverName: item.driverName,
        reason: item.reason,
        count: item.count
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('获取问题件数据失败:', error);
    res.status(500).json({ message: '获取数据失败: ' + error.message });
  }
});

// ==================== 丢包相关 ====================

// 上传丢包数据
router.post('/lost-packages/upload', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '请提供有效的记录数据' });
    }

    const uploadBatchId = `lost_batch_${Date.now()}`;
    const validRecords = [];
    const errorRecords = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        if (!record.finishTime) {
          errorRecords.push({
            index: i,
            error: '缺少必填字段：完结时间'
          });
          continue;
        }

        let finishTime;
        let finishDate;
        
        if (record.finishTime instanceof Date) {
          finishTime = record.finishTime;
          finishDate = finishTime.toISOString().split('T')[0];
        } else if (typeof record.finishTime === 'string') {
          const date = new Date(record.finishTime);
          if (isNaN(date.getTime())) {
            errorRecords.push({
              index: i,
              error: '完结时间格式无效'
            });
            continue;
          }
          finishTime = date;
          finishDate = date.toISOString().split('T')[0];
        } else {
          errorRecords.push({
            index: i,
            error: '完结时间格式无效'
          });
          continue;
        }

        validRecords.push({
          reason: record.reason?.trim() || '',
          supplier: record.supplier?.trim() || '',
          finishTime,
          finishDate,
          type: record.type?.trim() || '未知',
          driverName: record.driverName?.trim() || '',
          uploadBatchId
        });
      } catch (error) {
        errorRecords.push({
          index: i,
          error: error.message
        });
      }
    }

    if (validRecords.length > 0) {
      await LostPackage.insertMany(validRecords, { ordered: false });
    }

    res.json({
      success: true,
      message: `成功上传 ${validRecords.length} 条记录，${errorRecords.length} 条错误`,
      validCount: validRecords.length,
      errorCount: errorRecords.length,
      errors: errorRecords.slice(0, 10)
    });
  } catch (error) {
    console.error('上传丢包数据失败:', error);
    res.status(500).json({ message: '上传失败: ' + error.message });
  }
});

// 获取丢包数据
router.get('/lost-packages', async (req, res) => {
  try {
    const { dimension = 'supplier', timeUnit = 'day', startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始日期和结束日期' });
    }

    const matchStage = {
      finishDate: { $gte: startDate, $lte: endDate }
    };

    // 先获取所有数据
    const allRecords = await LostPackage.find(matchStage).lean();

    // 根据时间单位处理数据
    const processedRecords = allRecords.map(record => {
      let timePeriod = record.finishDate;
      
      if (timeUnit === 'week') {
        // 计算该日期所在周的周一
        const date = new Date(record.finishDate);
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        timePeriod = monday.toISOString().split('T')[0];
      } else if (timeUnit === 'month') {
        // 取年月
        timePeriod = record.finishDate.substring(0, 7);
      }
      
      return {
        ...record,
        timePeriod
      };
    });

    // 按维度和时间周期分组
    const groupedData = new Map();
    
    processedRecords.forEach(record => {
      let dimensionKey;
    if (dimension === 'supplier') {
        dimensionKey = (record.supplier && record.supplier.trim()) || '未知供应商';
      } else {
        dimensionKey = (record.driverName && record.driverName.trim()) || '未知司机';
      }
      
      // 按时间周期+维度分组
      const key = `${record.timePeriod}_${dimensionKey}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timePeriod: record.timePeriod,
          supplier: (record.supplier && record.supplier.trim()) || '',
          driverName: (record.driverName && record.driverName.trim()) || '',
          type: (record.type && record.type.trim()) || '',
          count: 0,
          finishTime: record.finishTime
        });
      } else {
        const existing = groupedData.get(key);
        if (!existing.supplier && record.supplier && record.supplier.trim()) {
          existing.supplier = record.supplier.trim();
        }
        if (!existing.driverName && record.driverName && record.driverName.trim()) {
          existing.driverName = record.driverName.trim();
        }
        if (!existing.type && record.type && record.type.trim()) {
          existing.type = record.type.trim();
        }
        if (record.finishTime && (!existing.finishTime || new Date(record.finishTime) > new Date(existing.finishTime))) {
          existing.finishTime = record.finishTime;
        }
      }
      
      groupedData.get(key).count += 1;
    });

    const formattedResults = Array.from(groupedData.values())
      .sort((a, b) => {
        // 先按时间周期排序，再按数量排序
        if (a.timePeriod !== b.timePeriod) {
          return a.timePeriod.localeCompare(b.timePeriod);
        }
        return b.count - a.count;
      })
      .map(item => ({
        finishTime: item.finishTime ? item.finishTime.toISOString().split('T')[0] : item.timePeriod,
        timePeriod: item.timePeriod,
        supplier: item.supplier,
        driverName: item.driverName,
        type: item.type,
        count: item.count
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('获取丢包数据失败:', error);
    res.status(500).json({ message: '获取数据失败: ' + error.message });
  }
});

// ==================== 客诉相关 ====================

// 上传客诉数据
router.post('/complaints/upload', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '请提供有效的记录数据' });
    }

    // 调试日志：检查接收到的数据
    if (records.length > 0) {
      console.log('接收到的客诉数据示例（前3条）:', records.slice(0, 3).map(r => ({
        createTime: r.createTime,
        subCategory: r.subCategory,
        supplier: r.supplier || '(空)',
        driverName: r.driverName || '(空)',
        status: r.status
      })));
    }

    const uploadBatchId = `complaint_batch_${Date.now()}`;
    const validRecords = [];
    const errorRecords = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        if (!record.createTime) {
          errorRecords.push({
            index: i,
            error: '缺少必填字段：工单创建时间'
          });
          continue;
        }

        let createTime;
        let createDate;
        
        if (record.createTime instanceof Date) {
          createTime = record.createTime;
          createDate = createTime.toISOString().split('T')[0];
        } else if (typeof record.createTime === 'string') {
          const date = new Date(record.createTime);
          if (isNaN(date.getTime())) {
            errorRecords.push({
              index: i,
              error: '工单创建时间格式无效'
            });
            continue;
          }
          createTime = date;
          createDate = date.toISOString().split('T')[0];
        } else {
          errorRecords.push({
            index: i,
            error: '工单创建时间格式无效'
          });
          continue;
        }

        const supplier = record.supplier?.trim() || '';
        const driverName = record.driverName?.trim() || '';
        
        // 调试日志：检查前几条记录的供应商和司机名称
        if (validRecords.length < 3) {
          console.log(`准备保存的记录 ${validRecords.length + 1}:`, {
            supplier: supplier || '(空)',
            driverName: driverName || '(空)',
            originalSupplier: record.supplier,
            originalDriverName: record.driverName
          });
        }
        
        validRecords.push({
          createTime,
          createDate,
          subCategory: record.subCategory?.trim() || '',
          supplier: supplier,
          driverName: driverName,
          routeCode: record.routeCode?.trim() || '',
          status: record.status?.trim() || '',
          uploadBatchId
        });
      } catch (error) {
        errorRecords.push({
          index: i,
          error: error.message
        });
      }
    }

    // 第二步：批量匹配路由码（只匹配没有路由码的记录）
    const recordsToMatch = validRecords.filter(r => !r.routeCode && r.supplier);
    
    if (recordsToMatch.length > 0) {
      // 获取所有供应商名称
      const supplierNames = [...new Set(recordsToMatch.map(r => r.supplier))];
      
      // 查找供应商
      const suppliers = await Supplier.find({
        name: { $in: supplierNames }
      }).lean();
      
      const supplierMap = new Map();
      suppliers.forEach(supplier => {
        supplierMap.set(supplier.name, supplier._id);
      });
      
      // 查找供应商-路由关联
      const supplierIds = Array.from(supplierMap.values());
      if (supplierIds.length > 0) {
        const mappings = await SupplierRouteMapping.find({
          supplierId: { $in: supplierIds },
          isActive: true
        }).lean();
        
        // 构建供应商到路由码的映射（一个供应商可能有多个路由码，取第一个）
        const supplierRouteMap = new Map();
        mappings.forEach(mapping => {
          const supplier = suppliers.find(s => s._id.toString() === mapping.supplierId.toString());
          if (supplier && !supplierRouteMap.has(supplier.name)) {
            supplierRouteMap.set(supplier.name, mapping.routeCode);
          }
        });
        
        // 更新路由码
        validRecords.forEach(record => {
          if (!record.routeCode && supplierRouteMap.has(record.supplier)) {
            record.routeCode = supplierRouteMap.get(record.supplier);
          }
        });
      }
    }

    if (validRecords.length > 0) {
      await Complaint.insertMany(validRecords, { ordered: false });
      
      // 调试日志：验证保存的数据
      const savedSample = await Complaint.find({ uploadBatchId })
        .limit(3)
        .lean();
      console.log('保存后的客诉数据示例（前3条）:', savedSample.map(r => ({
        createDate: r.createDate,
        supplier: r.supplier || '(空)',
        driverName: r.driverName || '(空)',
        routeCode: r.routeCode || '(空)'
      })));
      
      // 统计供应商和司机名称的分布
      const supplierStats = await Complaint.aggregate([
        { $match: { uploadBatchId } },
        { $group: { _id: '$supplier', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      const driverStats = await Complaint.aggregate([
        { $match: { uploadBatchId } },
        { $group: { _id: '$driverName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      console.log('供应商分布（前5）:', supplierStats);
      console.log('司机分布（前5）:', driverStats);
    }

    res.json({
      success: true,
      message: `成功上传 ${validRecords.length} 条记录，${errorRecords.length} 条错误`,
      validCount: validRecords.length,
      errorCount: errorRecords.length,
      errors: errorRecords.slice(0, 10)
    });
  } catch (error) {
    console.error('上传客诉数据失败:', error);
    res.status(500).json({ message: '上传失败: ' + error.message });
  }
});

// 获取客诉数据（支持按周/月维度聚合）
router.get('/complaints', async (req, res) => {
  try {
    const { dimension = 'supplier', timeUnit = 'day', startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始日期和结束日期' });
    }

    const matchStage = {
      createDate: { $gte: startDate, $lte: endDate }
    };

    // 先获取所有数据
    const allRecords = await Complaint.find(matchStage).lean();
    
    // 调试日志：检查原始数据
    if (allRecords.length > 0) {
      console.log('客诉原始数据示例（前3条）:', allRecords.slice(0, 3).map(r => ({
        createDate: r.createDate,
        supplier: r.supplier,
        driverName: r.driverName,
        routeCode: r.routeCode
      })));
    }

    // 根据时间单位处理数据
    const processedRecords = allRecords.map(record => {
      let timePeriod = record.createDate;
      
      if (timeUnit === 'week') {
        // 计算该日期所在周的周一（使用字符串操作避免时区问题）
        // createDate 格式为 YYYY-MM-DD
        const [year, month, day] = record.createDate.split('-').map(Number);
        const date = new Date(year, month - 1, day); // 月份从0开始
        const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 如果是周日，往前6天；否则往前到周一
        const monday = new Date(year, month - 1, day + diff);
        timePeriod = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (timeUnit === 'month') {
        // 取年月
        timePeriod = record.createDate.substring(0, 7);
      }
      
      return {
        ...record,
        timePeriod
      };
    });

    // 按维度和时间周期分组
    const groupedData = new Map();
    
    processedRecords.forEach(record => {
      let dimensionKey;
      if (dimension === 'supplier') {
        dimensionKey = (record.supplier && record.supplier.trim()) || '未知供应商';
      } else if (dimension === 'driver') {
        dimensionKey = (record.driverName && record.driverName.trim()) || '未知司机';
      } else {
        dimensionKey = (record.routeCode && record.routeCode.trim()) || '未知路由码';
      }
      
      // 天/周/月维度：都按时间周期+维度分组（天维度也需要按日期分组以便趋势图展示）
      const key = `${record.timePeriod}_${dimensionKey}`;
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          timePeriod: record.timePeriod,
          supplier: (record.supplier && record.supplier.trim()) || '',
          driverName: (record.driverName && record.driverName.trim()) || '',
          routeCode: (record.routeCode && record.routeCode.trim()) || '',
          count: 0,
          createTime: record.createTime
        });
      } else {
        // 如果已有记录，尝试更新非空字段
        const existing = groupedData.get(key);
        if (!existing.supplier && record.supplier && record.supplier.trim()) {
          existing.supplier = record.supplier.trim();
        }
        if (!existing.driverName && record.driverName && record.driverName.trim()) {
          existing.driverName = record.driverName.trim();
        }
        if (!existing.routeCode && record.routeCode && record.routeCode.trim()) {
          existing.routeCode = record.routeCode.trim();
        }
        // 保留最新的时间
        if (record.createTime && (!existing.createTime || new Date(record.createTime) > new Date(existing.createTime))) {
          existing.createTime = record.createTime;
        }
      }
      
      groupedData.get(key).count += 1;
    });
    
    // 调试日志：输出前几条记录
    console.log('客诉数据聚合结果（前5条）:', Array.from(groupedData.values()).slice(0, 5));

    const formattedResults = Array.from(groupedData.values())
      .sort((a, b) => {
        // 先按时间周期排序，再按数量排序
        if (a.timePeriod !== b.timePeriod) {
          return a.timePeriod.localeCompare(b.timePeriod);
        }
        return b.count - a.count;
      })
      .map(item => ({
        createTime: item.createTime ? item.createTime.toISOString().split('T')[0] : item.timePeriod,
        timePeriod: item.timePeriod,
        supplier: item.supplier,
        driverName: item.driverName,
        routeCode: item.routeCode,
        count: item.count
      }));

    res.json(formattedResults);
  } catch (error) {
    console.error('获取客诉数据失败:', error);
    res.status(500).json({ message: '获取数据失败: ' + error.message });
  }
});

// 删除所有客诉数据
router.delete('/complaints', async (req, res) => {
  try {
    const result = await Complaint.deleteMany({});
    
    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条客诉记录`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('删除客诉数据失败:', error);
    res.status(500).json({ message: '删除数据失败: ' + error.message });
  }
});

export default router;

