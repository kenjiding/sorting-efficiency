import express from 'express';
import Employee from '../models/Employee.js';
import WageRecord from '../models/WageRecord.js';
import InboundScanRecord from '../models/InboundScanRecord.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 默认时薪表（使用英文key）
const defaultRates = {
  worker: { workday: 34.44, sortingWeekend: 43.05, publicHoliday: 86.1 },
  forklift: { workday: 36.9, sortingWeekend: 46.125, publicHoliday: 92.25 },
  receptionist: { workday: 36.9, sortingWeekend: 46.125, publicHoliday: 92.25 }
};

// 计算时薪（使用自定义时薪表）
function calculateHourlyRate(role, workday, isSorting, isPublicHoliday, rateSettings) {
  const rates = rateSettings || defaultRates;
  const roleRates = rates[role] || defaultRates.worker;

  // 公共节假日优先
  if (isPublicHoliday) {
    return roleRates.publicHoliday;
  }

  // 判断是否是周末
  const dayName = workday?.trim().toLowerCase();
  const isWeekend = dayName === '周六' || dayName === '周日' || 
                    dayName === 'saturday' || dayName === 'sunday' ||
                    dayName === '星期六' || dayName === '星期日';

  if (isWeekend) {
    return isSorting ? roleRates.sortingWeekend : roleRates.workday;
  } else {
    return roleRates.workday;
  }
}

// 计算总时长十进制
function calculateDecimalHours(totalHours) {
  const timeStr = totalHours.toString().trim();
  
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  } else if (timeStr.includes('.')) {
    const parts = timeStr.split('.');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  } else {
    return parseFloat(timeStr) || 0;
  }
}

// 解析日期
function parseDate(dateStr) {
  try {
    let recordDate = new Date(dateStr);
    if (isNaN(recordDate.getTime())) {
      const parts = dateStr.toString().trim().split(/[-/]/);
      if (parts.length === 3) {
        recordDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        throw new Error('Invalid date format');
      }
    }
    return recordDate;
  } catch (err) {
    console.error('日期解析失败:', dateStr, err);
    return new Date();
  }
}

// 获取所有员工
router.get('/employees', async (req, res) => {
  try {
    const { region } = req.query;
    const query = region ? { region } : {};
    const employees = await Employee.find(query).sort({ employeeId: 1 });
    res.json(employees);
  } catch (error) {
    console.error('获取员工列表失败:', error);
    res.status(500).json({ message: '获取员工列表失败', error: error.message });
  }
});

// 获取单个员工信息
router.get('/employees/:region/:employeeId', async (req, res) => {
  try {
    const { region, employeeId } = req.params;
    const employee = await Employee.findOne({ region, employeeId });
    if (!employee) {
      return res.status(404).json({ message: '员工不存在' });
    }
    res.json(employee);
  } catch (error) {
    console.error('获取员工信息失败:', error);
    res.status(500).json({ message: '获取员工信息失败', error: error.message });
  }
});

// 更新员工角色
router.put('/employees/:region/:employeeId/role', async (req, res) => {
  try {
    const { region, employeeId } = req.params;
    const { role } = req.body;
    const employee = await Employee.findOne({ region, employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: '员工不存在' });
    }

    if (!['worker', 'forklift', 'receptionist'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }

    employee.changeRole(role);
    await employee.save();

    res.json({ message: '角色更新成功', employee });
  } catch (error) {
    console.error('更新员工角色失败:', error);
    res.status(500).json({ message: '更新员工角色失败', error: error.message });
  }
});

// 删除员工
router.delete('/employees/:region/:employeeId', async (req, res) => {
  try {
    const { region, employeeId } = req.params;
    const employee = await Employee.findOne({ region, employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: '员工不存在' });
    }

    // 检查是否有关联的工资记录
    const recordCount = await WageRecord.countDocuments({ region, employeeId });
    
    if (recordCount > 0) {
      return res.status(400).json({ 
        message: `无法删除该员工，还有 ${recordCount} 条工资记录。请先删除相关工资记录。`,
        recordCount 
      });
    }

    await Employee.deleteOne({ region, employeeId });

    res.json({ message: '员工删除成功', employee });
  } catch (error) {
    console.error('删除员工失败:', error);
    res.status(500).json({ message: '删除员工失败', error: error.message });
  }
});

// 批量上传工资记录
router.post('/records/upload', async (req, res) => {
  try {
    const { region, records, isSorting, isPublicHoliday, rateSettings } = req.body;
    
    if (!region) {
      return res.status(400).json({ message: '缺少region参数' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: '无效的记录数据' });
    }

    const uploadBatchId = uuidv4();
    const processedRecords = [];
    const errors = [];
    const customRates = rateSettings || defaultRates;

    for (const record of records) {
      try {
        const {
          employeeId,
          name,
          surname,
          nickname,
          department,
          date,
          workday,
          firstClockIn,
          lastClockOut,
          totalHours,
          role: recordRole,
          isPublicHoliday: recordIsPublicHolidayInput,
          isSorting: recordIsSortingInput
        } = record;

        // 验证必填字段
        if (!employeeId || !name || !date || !totalHours) {
          errors.push({
            employeeId,
            name,
            error: '缺少必填字段'
          });
          continue;
        }

        // 查找或创建员工
        let employee = await Employee.findOne({ region, employeeId });
        
        if (!employee) {
          employee = new Employee({
            region,
            employeeId,
            name,
            surname,
            nickname,
            department,
            role: recordRole || 'worker',
            roleHistory: [{
              role: recordRole || 'worker',
              changedAt: new Date()
            }]
          });
          await employee.save();
        } else {
          employee.name = name;
          employee.surname = surname || employee.surname;
          employee.nickname = nickname || employee.nickname;
          employee.department = department || employee.department;
          await employee.save();
        }

        // 使用员工的当前角色
        const currentRole = recordRole || employee.role;

        const parseBoolean = (value, fallback) => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lowered = value.trim().toLowerCase();
            if (lowered === 'true') return true;
            if (lowered === 'false') return false;
          }
          return fallback;
        };

        const recordIsPublicHoliday = parseBoolean(recordIsPublicHolidayInput, isPublicHoliday);
        const recordIsSorting = parseBoolean(recordIsSortingInput, isSorting);

        // 计算总时长十进制
        const totalHoursDecimal = calculateDecimalHours(totalHours);

        // 计算时薪
        const hourlyRate = calculateHourlyRate(
          currentRole,
          workday,
          recordIsSorting,
          recordIsPublicHoliday,
          customRates
        );

        // 计算总工资
        const totalWage = totalHoursDecimal * hourlyRate;

        // 解析日期
        const recordDate = parseDate(date);

        // 检查是否已存在该员工该日期的记录
        const existingRecord = await WageRecord.findOne({
          region,
          employeeId,
          date: recordDate
        });

        if (existingRecord) {
          // 更新现有记录
          existingRecord.name = name;
          existingRecord.surname = surname;
          existingRecord.nickname = nickname;
          existingRecord.department = department;
          existingRecord.workday = workday;
          existingRecord.firstClockIn = firstClockIn;
          existingRecord.lastClockOut = lastClockOut;
          existingRecord.totalHours = totalHours;
          existingRecord.role = currentRole;
          existingRecord.isSorting = recordIsSorting;
          existingRecord.isPublicHoliday = recordIsPublicHoliday;
          existingRecord.hourlyRate = hourlyRate;
          existingRecord.totalHoursDecimal = totalHoursDecimal;
          existingRecord.totalWage = totalWage;
          existingRecord.uploadBatchId = uploadBatchId;

          await existingRecord.save();
          processedRecords.push(existingRecord);
        } else {
          // 创建新记录
          const wageRecord = new WageRecord({
            region,
            employeeId,
            name,
            surname,
            nickname,
            department,
            date: recordDate,
            workday,
            firstClockIn,
            lastClockOut,
            totalHours,
            role: currentRole,
            isSorting: recordIsSorting,
            isPublicHoliday: recordIsPublicHoliday,
            hourlyRate,
            totalHoursDecimal,
            totalWage,
            uploadBatchId
          });

          await wageRecord.save();
          processedRecords.push(wageRecord);
        }
      } catch (error) {
        console.error('处理记录失败:', error);
        errors.push({
          employeeId: record.employeeId,
          name: record.name,
          error: error.message
        });
      }
    }

    res.json({
      message: '上传完成',
      uploadBatchId,
      success: processedRecords.length,
      failed: errors.length,
      records: processedRecords,
      errors
    });
  } catch (error) {
    console.error('批量上传失败:', error);
    res.status(500).json({ message: '批量上传失败', error: error.message });
  }
});

// 获取工资记录（支持筛选和分页）
router.get('/records', async (req, res) => {
  try {
    const { region, startDate, endDate, employeeId, role, uploadBatchId, page, limit } = req.query;
    
    const query = {};
    
    if (region) query.region = region;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (employeeId) {
      query.employeeId = new RegExp(employeeId, 'i');
    }

    if (role) {
      query.role = role;
    }

    if (uploadBatchId) {
      query.uploadBatchId = uploadBatchId;
    }

    let recordsQuery = WageRecord.find(query).sort({ date: -1, employeeId: 1 });

    // 应用分页
    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      recordsQuery = recordsQuery.skip(skip).limit(parseInt(limit));
    }

    const records = await recordsQuery;
    const total = await WageRecord.countDocuments(query);

    res.json({
      records,
      total,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : records.length
    });
  } catch (error) {
    console.error('获取工资记录失败:', error);
    res.status(500).json({ message: '获取工资记录失败', error: error.message });
  }
});

// 获取单条工资记录
router.get('/records/:id', async (req, res) => {
  try {
    const record = await WageRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    console.error('获取工资记录失败:', error);
    res.status(500).json({ message: '获取工资记录失败', error: error.message });
  }
});

// 更新单条工资记录的角色
router.put('/records/:id/role', async (req, res) => {
  try {
    const { role, rateSettings } = req.body;
    const record = await WageRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }

    if (!['worker', 'forklift', 'receptionist'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }

    const customRates = rateSettings || defaultRates;

    // 重新计算时薪和总工资
    record.role = role;
    record.hourlyRate = calculateHourlyRate(
      role,
      record.workday,
      record.isSorting,
      record.isPublicHoliday,
      customRates
    );
    record.totalWage = record.totalHoursDecimal * record.hourlyRate;

    await record.save();

    res.json({ message: '角色更新成功', record });
  } catch (error) {
    console.error('更新记录角色失败:', error);
    res.status(500).json({ message: '更新记录角色失败', error: error.message });
  }
});

// 更新单条工资记录（通用接口，支持更新多个字段）
router.put('/records/:id', async (req, res) => {
  try {
    const { 
      date, 
      totalHours, 
      workday, 
      role, 
      isSorting, 
      isPublicHoliday,
      firstClockIn,
      lastClockOut,
      rateSettings 
    } = req.body;
    
    const record = await WageRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }

    const customRates = rateSettings || defaultRates;
    let needsRecalculation = false;

    // 更新可编辑字段
    if (date !== undefined) {
      record.date = parseDate(date);
      needsRecalculation = true;
    }
    
    if (totalHours !== undefined) {
      record.totalHours = totalHours;
      record.totalHoursDecimal = calculateDecimalHours(totalHours);
      needsRecalculation = true;
    }
    
    if (workday !== undefined) {
      record.workday = workday;
      needsRecalculation = true;
    }
    
    if (role !== undefined) {
      if (!['worker', 'forklift', 'receptionist'].includes(role)) {
        return res.status(400).json({ message: '无效的角色' });
      }
      record.role = role;
      needsRecalculation = true;
    }
    
    if (isSorting !== undefined) {
      record.isSorting = isSorting;
      needsRecalculation = true;
    }
    
    if (isPublicHoliday !== undefined) {
      record.isPublicHoliday = isPublicHoliday;
      needsRecalculation = true;
    }
    
    if (firstClockIn !== undefined) {
      record.firstClockIn = firstClockIn;
    }
    
    if (lastClockOut !== undefined) {
      record.lastClockOut = lastClockOut;
    }

    // 如果相关字段发生变化，重新计算时薪和总工资
    if (needsRecalculation) {
      record.hourlyRate = calculateHourlyRate(
        record.role,
        record.workday,
        record.isSorting,
        record.isPublicHoliday,
        customRates
      );
      record.totalWage = record.totalHoursDecimal * record.hourlyRate;
    }

    await record.save();

    res.json({ message: '记录更新成功', record });
  } catch (error) {
    console.error('更新记录失败:', error);
    res.status(500).json({ message: '更新记录失败', error: error.message });
  }
});

// 删除工资记录
router.delete('/records/:id', async (req, res) => {
  try {
    const record = await WageRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: '记录不存在' });
    }
    res.json({ message: '删除成功', record });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ message: '删除记录失败', error: error.message });
  }
});

// 删除批次上传的所有记录
router.delete('/records/batch/:uploadBatchId', async (req, res) => {
  try {
    const result = await WageRecord.deleteMany({ uploadBatchId: req.params.uploadBatchId });
    res.json({ message: '批次删除成功', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('批次删除失败:', error);
    res.status(500).json({ message: '批次删除失败', error: error.message });
  }
});

// 获取工资统计
router.get('/statistics', async (req, res) => {
  try {
    const { region, startDate, endDate, employeeId } = req.query;
    
    const query = {};
    
    if (region) query.region = region;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // 确保包含整天的开始时间（00:00:00）
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        // 确保包含整天的结束时间（23:59:59.999）
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await WageRecord.find(query);

    // 按员工分组统计
    const employeeStats = {};
    let totalWages = 0;
    let totalHours = 0;

    records.forEach(record => {
      if (!employeeStats[record.employeeId]) {
        employeeStats[record.employeeId] = {
          employeeId: record.employeeId,
          name: record.name,
          totalWage: 0,
          totalHours: 0,
          workDays: 0,
          role: record.role
        };
      }
      
      employeeStats[record.employeeId].totalWage += record.totalWage;
      employeeStats[record.employeeId].totalHours += record.totalHoursDecimal;
      employeeStats[record.employeeId].workDays += 1;
      
      totalWages += record.totalWage;
      totalHours += record.totalHoursDecimal;
    });

    res.json({
      totalWages: Math.round(totalWages * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      totalRecords: records.length,
      employeeStats: Object.values(employeeStats).map(stat => ({
        ...stat,
        totalWage: Math.round(stat.totalWage * 100) / 100,
        totalHours: Math.round(stat.totalHours * 100) / 100,
        averageHourlyRate: Math.round((stat.totalWage / stat.totalHours) * 100) / 100
      }))
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

// 获取最新上传数据的日期和数量
router.get('/records/latest', async (req, res) => {
  try {
    const { region } = req.query;
    const query = region ? { region } : {};
    
    // 获取最新日期的记录（按date排序，date是Date类型）
    const latestRecord = await WageRecord.findOne(query)
      .sort({ date: -1 })
      .select('date')
      .lean();
    
    if (!latestRecord || !latestRecord.date) {
      return res.json({
        latestUploadDate: null,
        recordCount: 0,
        message: '暂无数据'
      });
    }
    
    // 获取最新日期（date字段是Date类型）
    const latestDate = new Date(latestRecord.date);
    latestDate.setHours(0, 0, 0, 0);
    const latestDateStr = latestDate.toISOString().split('T')[0];
    const nextDay = new Date(latestDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // 统计该日期的记录数量（使用Date对象查询）
    const count = await WageRecord.countDocuments({
      ...query,
      date: {
        $gte: latestDate,
        $lt: nextDay
      }
    });
    
    res.json({
      latestUploadDate: latestDateStr,
      recordCount: count
    });
  } catch (error) {
    console.error('获取最新工资记录失败:', error);
    res.status(500).json({ message: '获取最新记录失败', error: error.message });
  }
});

// 获取日期范围内的效率与成本汇总数据（聚合接口，减少前端请求次数）
router.get('/efficiency-cost-summary', async (req, res) => {
  try {
    const { region, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: '请提供开始日期和结束日期' });
    }

    // 确保日期范围正确
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 并行获取所有数据
    const [wageRecords, inboundRecords] = await Promise.all([
      // 获取工资记录
      WageRecord.find({
        region: region || { $exists: true },
        date: { $gte: start, $lte: end }
      }),
      // 获取货量数据
      InboundScanRecord.find({
        scanDate: { $gte: startDate, $lte: endDate }
      })
    ]);

    // 按日期分组处理工资数据
    const wageDataByDate = {};
    const sortingInfoByDate = {};

    wageRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!wageDataByDate[dateKey]) {
        wageDataByDate[dateKey] = {
          date: dateKey,
          totalHours: 0,
          totalCost: 0,
          recordCount: 0
        };
      }
      
      wageDataByDate[dateKey].totalHours += record.totalHoursDecimal || 0;
      wageDataByDate[dateKey].totalCost += record.totalWage || 0;
      wageDataByDate[dateKey].recordCount += 1;

      // 记录分拣信息（如果该日期有任何一条记录是分拣的，就认为是分拣）
      if (!sortingInfoByDate[dateKey]) {
        sortingInfoByDate[dateKey] = false;
      }
      if (record.isSorting === true) {
        sortingInfoByDate[dateKey] = true;
      }
    });

    // 按日期分组处理货量数据
    const volumeDataByDate = {};

    inboundRecords.forEach(record => {
      const dateKey = record.scanDate;
      
      if (!volumeDataByDate[dateKey]) {
        volumeDataByDate[dateKey] = {
          date: dateKey,
          total: 0
        };
      }
      
      volumeDataByDate[dateKey].total += 1;
    });

    // 合并所有日期范围的数据
    const allDates = new Set();
    Object.keys(wageDataByDate).forEach(date => allDates.add(date));
    Object.keys(volumeDataByDate).forEach(date => allDates.add(date));
    
    // 生成日期范围内的所有日期
    const currentDate = new Date(start);
    while (currentDate <= end) {
      allDates.add(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 构建结果数组
    const result = Array.from(allDates)
      .sort()
      .map(date => {
        const wageData = wageDataByDate[date] || {
          totalHours: 0,
          totalCost: 0,
          recordCount: 0
        };
        const volumeData = volumeDataByDate[date] || { total: 0 };
        const isSorting = sortingInfoByDate[date] || false;

        const totalVolume = volumeData.total || 0;
        const totalHours = wageData.totalHours || 0;
        const totalCost = wageData.totalCost || 0;
        const efficiency = totalHours > 0 ? (totalVolume / totalHours) : 0;

        return {
          date,
          totalVolume,
          totalHours: Math.round(totalHours * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          efficiency: Math.round(efficiency * 100) / 100,
          isSorting,
          hasData: totalVolume > 0 || totalHours > 0 || totalCost > 0
        };
      });

    res.json(result);
  } catch (error) {
    console.error('获取效率成本汇总数据失败:', error);
    res.status(500).json({ message: '获取汇总数据失败', error: error.message });
  }
});

export default router;
