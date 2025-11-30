import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * 解析Excel文件
 * @param {ArrayBuffer} data - Excel文件数据
 * @returns {Array} 解析后的数据数组
 */
export const parseExcelFile = (data) => {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel文件必须包含至少一个表头行和一个数据行');
    }
    
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    // 映射字段名
    const fieldMapping = mapExcelHeaders(headers);
    
    // 转换为记录数组
    const records = dataRows
      .filter(row => row.some(cell => cell !== undefined && cell !== ''))
      .map((row, index) => {
        const record = {};
        headers.forEach((header, colIndex) => {
          const fieldName = fieldMapping[header];
          if (fieldName && row[colIndex] !== undefined && row[colIndex] !== '') {
            record[fieldName] = row[colIndex];
          }
        });
        return record;
      });
    
    return records;
  } catch (error) {
    throw new Error(`Excel文件解析失败：${error.message}`);
  }
};

/**
 * 映射Excel表头到字段名
 * @param {Array} headers - 表头数组
 * @returns {Object} 字段映射对象
 */
const mapExcelHeaders = (headers) => {
  const mapping = {};
  
  headers.forEach(header => {
    if (!header) return;
    
    const normalizedHeader = header.toString().toLowerCase().trim();
    
    // 扫描数据字段映射
    if (['tracking_number', 'trackingnumber', 'tracking', '快递单号', '运单号'].includes(normalizedHeader)) {
      mapping[header] = 'trackingNumber';
    }
    else if (['operate', 'operator', '分拣员', '操作员'].includes(normalizedHeader)) {
      mapping[header] = 'operator';
    }
    else if (['time', 'scan_time', 'scantime', '扫描时间', '操作时间'].includes(normalizedHeader)) {
      mapping[header] = 'scanTime';
    }
    // 区号数据字段映射
    else if (['route_number', 'routenumber', 'route', '区号', '路由号'].includes(normalizedHeader)) {
      mapping[header] = 'routeNumber';
    }
  });
  
  return mapping;
};

/**
 * 处理效率数据
 * @param {Array} scanningData - 扫描数据
 * @param {Array} routeData - 区号数据
 * @returns {Object} 效率分析结果
 */
export const processEfficiencyData = (scanningData, routeData) => {
  if (!scanningData || scanningData.length === 0) {
    throw new Error('扫描数据不能为空');
  }
  
  if (!routeData || routeData.length === 0) {
    throw new Error('区号数据不能为空');
  }
  
  // 验证必要字段
  validateScanningData(scanningData);
  validateRouteData(routeData);
  
  // 创建区号映射表
  const routeMap = createRouteMap(routeData);
  
  // 按分拣员分组处理扫描数据
  const operatorGroups = groupByOperator(scanningData);
  
  // 计算每个分拣员的效率
  const operators = calculateOperatorEfficiencies(operatorGroups, routeMap);
  
  // 计算总体统计
  const totalScans = scanningData.length;
  const averageTotalEfficiency = operators.length > 0 
    ? operators.reduce((sum, op) => sum + op.totalEfficiency, 0) / operators.length 
    : 0;
  
  // 计算区效率统计
  const routeSummary = calculateRouteSummary(scanningData, routeMap);
  
  return {
    operators,
    totalScans,
    averageTotalEfficiency,
    routeSummary,
    processedAt: new Date().toISOString()
  };
};

/**
 * 验证扫描数据
 * @param {Array} data - 扫描数据
 */
const validateScanningData = (data) => {
  const requiredFields = ['trackingNumber', 'operator', 'scanTime'];
  const firstRecord = data[0];
  
  requiredFields.forEach(field => {
    if (!(field in firstRecord)) {
      throw new Error(`扫描数据缺少必要字段：${field}`);
    }
  });
};

/**
 * 验证区号数据
 * @param {Array} data - 区号数据
 */
const validateRouteData = (data) => {
  const requiredFields = ['trackingNumber', 'routeNumber'];
  const firstRecord = data[0];
  
  requiredFields.forEach(field => {
    if (!(field in firstRecord)) {
      throw new Error(`区号数据缺少必要字段：${field}`);
    }
  });
};

/**
 * 创建区号映射表
 * @param {Array} routeData - 区号数据
 * @returns {Map} 区号映射表
 */
const createRouteMap = (routeData) => {
  const routeMap = new Map();
  
  routeData.forEach(record => {
    if (record.trackingNumber && record.routeNumber) {
      routeMap.set(record.trackingNumber, record.routeNumber);
    }
  });
  
  return routeMap;
};

/**
 * 按分拣员分组
 * @param {Array} scanningData - 扫描数据
 * @returns {Map} 分拣员分组数据
 */
const groupByOperator = (scanningData) => {
  const groups = new Map();
  
  scanningData.forEach(record => {
    if (record.operator && record.trackingNumber && record.scanTime) {
      if (!groups.has(record.operator)) {
        groups.set(record.operator, []);
      }
      groups.get(record.operator).push({
        trackingNumber: record.trackingNumber,
        scanTime: new Date(record.scanTime)
      });
    }
  });
  
  return groups;
};

/**
 * 计算分拣员效率
 * @param {Map} operatorGroups - 分拣员分组数据
 * @param {Map} routeMap - 区号映射表
 * @returns {Array} 分拣员效率数组
 */
const calculateOperatorEfficiencies = (operatorGroups, routeMap) => {
  const operators = [];
  
  operatorGroups.forEach((scans, operatorName) => {
    // 按tracking_number分组
    const trackingGroups = groupByTrackingNumber(scans);
    
    // 计算总效率
    const totalEfficiency = calculateTotalEfficiency(trackingGroups);
    
    // 计算区效率
    const routeEfficiencies = calculateRouteEfficiencies(trackingGroups, routeMap);
    
    operators.push({
      name: operatorName,
      scanCount: scans.length,
      workingHours: totalEfficiency.workingHours,
      totalEfficiency: totalEfficiency.efficiency,
      firstScanTime: totalEfficiency.firstScanTime,
      lastScanTime: totalEfficiency.lastScanTime,
      routeEfficiencies: routeEfficiencies
    });
  });
  
  // 按总效率排序
  operators.sort((a, b) => b.totalEfficiency - a.totalEfficiency);
  
  return operators;
};

/**
 * 按tracking_number分组
 * @param {Array} scans - 扫描记录数组
 * @returns {Map} 按tracking_number分组的数据
 */
const groupByTrackingNumber = (scans) => {
  const groups = new Map();
  
  scans.forEach(scan => {
    if (!groups.has(scan.trackingNumber)) {
      groups.set(scan.trackingNumber, []);
    }
    groups.get(scan.trackingNumber).push(scan.scanTime);
  });
  
  return groups;
};

/**
 * 计算总效率
 * @param {Map} trackingGroups - 按tracking_number分组的数据
 * @returns {Object} 总效率结果
 */
const calculateTotalEfficiency = (trackingGroups) => {
  let totalScans = 0;
  let minTime = null;
  let maxTime = null;
  
  trackingGroups.forEach(times => {
    totalScans += times.length;
    
    times.forEach(time => {
      if (minTime === null || time < minTime) {
        minTime = time;
      }
      if (maxTime === null || time > maxTime) {
        maxTime = time;
      }
    });
  });
  
  const workingHours = minTime && maxTime ? (maxTime - minTime) / (1000 * 60 * 60) : 0;
  const efficiency = workingHours > 0 ? totalScans / workingHours : 0;
  
  return {
    workingHours,
    efficiency,
    firstScanTime: minTime,
    lastScanTime: maxTime
  };
};

/**
 * 计算区效率
 * @param {Map} trackingGroups - 按tracking_number分组的数据
 * @param {Map} routeMap - 区号映射表
 * @returns {Array} 区效率数组
 */
const calculateRouteEfficiencies = (trackingGroups, routeMap) => {
  const routeGroups = new Map();
  
  // 按区号前缀分组（P、X等）
  trackingGroups.forEach((times, trackingNumber) => {
    const routeNumber = routeMap.get(trackingNumber);
    if (routeNumber) {
      // 提取区号前缀（第一个字符）
      const routePrefix = routeNumber.charAt(0).toUpperCase();
      if (!routeGroups.has(routePrefix)) {
        routeGroups.set(routePrefix, {
          scanCount: 0,
          allTimes: []
        });
      }
      
      const routeData = routeGroups.get(routePrefix);
      routeData.scanCount += times.length;
      routeData.allTimes.push(...times);
    }
  });
  
  // 计算每个大区的效率
  const routeEfficiencies = [];
  routeGroups.forEach((routeData, routePrefix) => {
    if (routeData.scanCount > 0 && routeData.allTimes.length > 0) {
      // 计算该区的时间范围（最早到最晚）
      const minTime = Math.min(...routeData.allTimes);
      const maxTime = Math.max(...routeData.allTimes);
      const workingHours = (maxTime - minTime) / (1000 * 60 * 60);
      
      const efficiency = workingHours > 0 ? routeData.scanCount / workingHours : 0;
      
      routeEfficiencies.push({
        routePrefix,
        scanCount: routeData.scanCount,
        workingHours: workingHours,
        efficiency
      });
    }
  });
  
  // 按效率排序
  routeEfficiencies.sort((a, b) => b.efficiency - a.efficiency);
  
  return routeEfficiencies;
};

/**
 * 计算区效率统计
 * @param {Array} scanningData - 扫描数据
 * @param {Map} routeMap - 区号映射表
 * @returns {Array} 区效率统计数组
 */
const calculateRouteSummary = (scanningData, routeMap) => {
  const routeGroups = new Map();
  
  // 按区号前缀分组，收集所有扫描记录（包含tracking_number）
  scanningData.forEach(record => {
    const routeNumber = routeMap.get(record.trackingNumber);
    if (routeNumber) {
      const routePrefix = routeNumber.charAt(0).toUpperCase();
      if (!routeGroups.has(routePrefix)) {
        routeGroups.set(routePrefix, {
          scanRecords: [],
          operators: new Set()
        });
      }
      
      const routeData = routeGroups.get(routePrefix);
      routeData.scanRecords.push({
        trackingNumber: record.trackingNumber, // 保留tracking_number
        operator: record.operator,
        scanTime: new Date(record.scanTime)
      });
      routeData.operators.add(record.operator);
    }
  });
  
  // 计算每个区的统计指标
  const routeSummary = [];
  routeGroups.forEach((routeData, routePrefix) => {
    if (routeData.scanRecords.length > 0) {
      // 按tracking_number分组计算工作时间
      const trackingGroups = new Map();
      routeData.scanRecords.forEach(record => {
        const trackingNumber = record.trackingNumber; // 直接使用tracking_number
        if (!trackingGroups.has(trackingNumber)) {
          trackingGroups.set(trackingNumber, []);
        }
        trackingGroups.get(trackingNumber).push(record.scanTime);
      });
      
      // 计算总工作时间
      let totalWorkingHours = 0;
      trackingGroups.forEach(times => {
        if (times.length > 0) {
          const minTime = Math.min(...times);
          const maxTime = Math.max(...times);
          const workingHours = (maxTime - minTime) / (1000 * 60 * 60);
          totalWorkingHours += workingHours;
        }
      });
      
      const totalScans = routeData.scanRecords.length;
      const operatorCount = routeData.operators.size;
      
      routeSummary.push({
        routePrefix,
        totalScans,
        operatorCount,
        efficiency: totalWorkingHours > 0 ? totalScans / totalWorkingHours : 0,
        averagePerOperator: operatorCount > 0 ? totalScans / operatorCount : 0
      });
    }
  });
  
  // 按效率排序
  return routeSummary.sort((a, b) => b.efficiency - a.efficiency);
};

/**
 * 导出效率分析结果到Excel
 * @param {Object} results - 效率分析结果
 * @param {string} filename - 文件名
 */
export const exportEfficiencyToExcel = (results, filename = 'efficiency_analysis') => {
  if (!results || !results.operators) {
    throw new Error('没有可导出的数据');
  }
  
  // 创建总效率表
  const totalEfficiencyHeaders = [
    '排名',
    '分拣员',
    '扫描数量',
    '工作时间(小时)',
    '总效率(件/小时)',
    '最早操作时间',
    '最后操作时间',
    '大区分拣统计',
    '平均区效率(件/小时)'
  ];
  
  const totalEfficiencyRows = results.operators.map((operator, index) => [
    index + 1,
    operator.name,
    operator.scanCount,
    operator.workingHours.toFixed(2),
    operator.totalEfficiency.toFixed(2),
    operator.firstScanTime ? operator.firstScanTime.toLocaleString('zh-CN') : '-',
    operator.lastScanTime ? operator.lastScanTime.toLocaleString('zh-CN') : '-',
    operator.routeEfficiencies.map(route => `${route.routePrefix}区:${route.scanCount}件`).join('; '),
    operator.routeEfficiencies.length > 0 
      ? (operator.routeEfficiencies.reduce((sum, route) => sum + route.efficiency, 0) / operator.routeEfficiencies.length).toFixed(2)
      : '0.00'
  ]);
  
  // 创建区效率表
  const routeEfficiencyHeaders = [
    '分拣员',
    '大区',
    '扫描数量',
    '工作时间(小时)',
    '区效率(件/小时)'
  ];
  
  const routeEfficiencyRows = [];
  results.operators.forEach(operator => {
    operator.routeEfficiencies.forEach(route => {
      routeEfficiencyRows.push([
        operator.name,
        route.routePrefix,
        route.scanCount,
        route.workingHours.toFixed(2),
        route.efficiency.toFixed(2)
      ]);
    });
  });

  // 创建区效率统计表
  const routeSummaryHeaders = [
    '大区',
    '总分拣数',
    '参与分拣员',
    '区效率(件/小时)',
    '人均分拣数'
  ];
  
  const routeSummaryRows = (results.routeSummary || []).map(route => [
    route.routePrefix + '区',
    route.totalScans,
    route.operatorCount + '人',
    route.efficiency.toFixed(2),
    route.averagePerOperator.toFixed(0)
  ]);
  
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  // 总效率表
  const totalEfficiencySheet = XLSX.utils.aoa_to_sheet([
    totalEfficiencyHeaders,
    ...totalEfficiencyRows
  ]);
  XLSX.utils.book_append_sheet(workbook, totalEfficiencySheet, '总效率分析');
  
  // 区效率表
  if (routeEfficiencyRows.length > 0) {
    const routeEfficiencySheet = XLSX.utils.aoa_to_sheet([
      routeEfficiencyHeaders,
      ...routeEfficiencyRows
    ]);
    XLSX.utils.book_append_sheet(workbook, routeEfficiencySheet, '区效率分析');
  }

  // 区效率统计表
  if (routeSummaryRows.length > 0) {
    const routeSummarySheet = XLSX.utils.aoa_to_sheet([
      routeSummaryHeaders,
      ...routeSummaryRows
    ]);
    XLSX.utils.book_append_sheet(workbook, routeSummarySheet, '大区效率统计');
  }
  
  // 保存文件
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * 导出效率分析结果到CSV
 * @param {Object} results - 效率分析结果
 * @param {string} filename - 文件名
 */
export const exportEfficiencyToCSV = (results, filename = 'efficiency_analysis') => {
  if (!results || !results.operators) {
    throw new Error('没有可导出的数据');
  }
  
  // 创建总效率CSV
  const totalEfficiencyHeaders = [
    '排名',
    '分拣员',
    '扫描数量',
    '工作时间(小时)',
    '总效率(件/小时)',
    '最早操作时间',
    '最后操作时间',
    '大区分拣统计',
    '平均区效率(件/小时)'
  ];
  
  const totalEfficiencyRows = results.operators.map((operator, index) => [
    index + 1,
    `"${operator.name}"`,
    operator.scanCount,
    operator.workingHours.toFixed(2),
    operator.totalEfficiency.toFixed(2),
    operator.firstScanTime ? `"${operator.firstScanTime.toLocaleString('zh-CN')}"` : '"-"',
    operator.lastScanTime ? `"${operator.lastScanTime.toLocaleString('zh-CN')}"` : '"-"',
    `"${operator.routeEfficiencies.map(route => `${route.routePrefix}区:${route.scanCount}件`).join('; ')}"`,
    operator.routeEfficiencies.length > 0 
      ? (operator.routeEfficiencies.reduce((sum, route) => sum + route.efficiency, 0) / operator.routeEfficiencies.length).toFixed(2)
      : '0.00'
  ]);
  
  const totalEfficiencyCSV = [
    totalEfficiencyHeaders.join(','),
    ...totalEfficiencyRows.map(row => row.join(','))
  ].join('\n');
  
  // 保存总效率CSV
  const totalBlob = new Blob([totalEfficiencyCSV], { type: 'text/csv;charset=utf-8' });
  saveAs(totalBlob, `${filename}_total.csv`);
  
  // 创建区效率CSV
  if (results.operators.some(op => op.routeEfficiencies.length > 0)) {
    const routeEfficiencyHeaders = [
      '分拣员',
      '大区',
      '扫描数量',
      '工作时间(小时)',
      '区效率(件/小时)'
    ];
    
    const routeEfficiencyRows = [];
    results.operators.forEach(operator => {
      operator.routeEfficiencies.forEach(route => {
        routeEfficiencyRows.push([
          `"${operator.name}"`,
          `"${route.routePrefix}"`,
          route.scanCount,
          route.workingHours.toFixed(2),
          route.efficiency.toFixed(2)
        ]);
      });
    });
    
    const routeEfficiencyCSV = [
      routeEfficiencyHeaders.join(','),
      ...routeEfficiencyRows.map(row => row.join(','))
    ].join('\n');
    
    // 保存区效率CSV
    const routeBlob = new Blob([routeEfficiencyCSV], { type: 'text/csv;charset=utf-8' });
    saveAs(routeBlob, `${filename}_routes.csv`);
  }
};

/**
 * 计算区效率统计
 * @param {Object} results - 效率分析结果
 * @returns {Array} 区效率统计数组
 */
const getRouteSummary = (results) => {
  if (!results || !results.operators) return [];
  
  const routeMap = new Map();
  
  // 收集所有分拣员的区效率数据
  results.operators.forEach(operator => {
    operator.routeEfficiencies.forEach(route => {
      const key = route.routePrefix;
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          routePrefix: key,
          totalScans: 0,
          operatorCount: 0,
          totalWorkingHours: 0,
          operators: new Set()
        });
      }
      
      const routeData = routeMap.get(key);
      routeData.totalScans += route.scanCount;
      routeData.totalWorkingHours += route.workingHours;
      routeData.operators.add(operator.name);
    });
  });
  
  // 计算统计指标
  return Array.from(routeMap.values()).map(route => ({
    routePrefix: route.routePrefix,
    totalScans: route.totalScans,
    operatorCount: route.operators.size,
    efficiency: route.totalWorkingHours > 0 ? route.totalScans / route.totalWorkingHours : 0,
    averagePerOperator: route.operators.size > 0 ? route.totalScans / route.operators.size : 0
  })).sort((a, b) => b.efficiency - a.efficiency);
};
