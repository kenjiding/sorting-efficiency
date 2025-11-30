import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 数据整合和排序功能
export const processDataForExport = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  // 按员工姓名分组
  const groupedData = {};
  
  data.forEach(record => {
    const name = record.name;
    if (!groupedData[name]) {
      groupedData[name] = [];
    }
    groupedData[name].push(record);
  });

  // 合并每个员工的数据
  const mergedData = Object.keys(groupedData).map(name => {
    const records = groupedData[name];
    
    // 计算合并后的数据
    const mergedRecord = {
      name: name,
      totalCoarseCount: 0,
      totalFineCount: 0,
      totalCoarseHours: 0,
      totalFineHours: 0,
      totalWorkingHours: 0,
      recordCount: records.length,
      dateRange: {
        start: records[0].date,
        end: records[0].date
      }
    };

    // 合并所有记录的数据
    records.forEach(record => {
      // 合并数量
      mergedRecord.totalCoarseCount += Number(record.coarseCount) || 0;
      mergedRecord.totalFineCount += Number(record.fineCount) || 0;
      
      // 合并工作时间
      mergedRecord.totalWorkingHours += Number(record.totalWorkingHours) || 0;
      
      // 计算粗拣和细拣的工作时间
      if (record.coarseStartTime && record.coarseEndTime) {
        const coarseHours = calculateTimeDifference(record.coarseStartTime, record.coarseEndTime);
        mergedRecord.totalCoarseHours += coarseHours;
      }
      
      if (record.fineStartTime && record.fineEndTime) {
        const fineHours = calculateTimeDifference(record.fineStartTime, record.fineEndTime);
        mergedRecord.totalFineHours += fineHours;
      }
      
      // 更新日期范围
      if (record.date < mergedRecord.dateRange.start) {
        mergedRecord.dateRange.start = record.date;
      }
      if (record.date > mergedRecord.dateRange.end) {
        mergedRecord.dateRange.end = record.date;
      }
    });

    // 计算效率
    mergedRecord.coarseEfficiency = mergedRecord.totalCoarseHours > 0 
      ? (mergedRecord.totalCoarseCount / mergedRecord.totalCoarseHours).toFixed(2)
      : '0.00';
    
    mergedRecord.fineEfficiency = mergedRecord.totalFineHours > 0 
      ? (mergedRecord.totalFineCount / mergedRecord.totalFineHours).toFixed(2)
      : '0.00';
    
    mergedRecord.overallEfficiency = mergedRecord.totalWorkingHours > 0 
      ? ((mergedRecord.totalCoarseCount + mergedRecord.totalFineCount) / mergedRecord.totalWorkingHours).toFixed(2)
      : '0.00';

    return mergedRecord;
  });

  // 按粗分效率从高到低排序
  mergedData.sort((a, b) => {
    const efficiencyA = parseFloat(a.coarseEfficiency) || 0;
    const efficiencyB = parseFloat(b.coarseEfficiency) || 0;
    return efficiencyB - efficiencyA; // 降序排列
  });

  return mergedData;
};

// 计算时间差（小时）
const calculateTimeDifference = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  // 如果结束时间小于开始时间，说明跨天了
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end - start;
  return diffMs / (1000 * 60 * 60); // 转换为小时
};

// Excel import functionality
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件必须包含至少一个表头行和一个数据行'));
          return;
        }
        
        // Parse headers and data
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        
        // Map headers to expected field names
        const fieldMapping = mapExcelHeaders(headers);
        
        // Convert rows to records
        const records = dataRows
          .filter(row => row.some(cell => cell !== undefined && cell !== '')) // Skip empty rows
          .map((row, index) => {
            const record = {};
            
            headers.forEach((header, colIndex) => {
              const fieldName = fieldMapping[header];
              if (fieldName && row[colIndex] !== undefined && row[colIndex] !== '') {
                record[fieldName] = row[colIndex];
              }
            });
            
            // Validate required fields
            const validationError = validateRecord(record, index + 2); // +2 for header row and 0-based index
            if (validationError) {
              throw new Error(validationError);
            }
            
            return record;
          });
        
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取Excel文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Map Excel headers to database field names (case-insensitive, flexible matching)
const mapExcelHeaders = (headers) => {
  const mapping = {};
  
  headers.forEach(header => {
    if (!header) return;
    
    const normalizedHeader = header.toString().toLowerCase().trim();
    
    // Date field mappings
    if (['date', 'work date', 'workdate', '日期'].includes(normalizedHeader)) {
      mapping[header] = 'date';
    }
    // Name field mappings
    else if (['name', 'worker name', 'employee name', 'worker', 'employee', '姓名', '工人姓名'].includes(normalizedHeader)) {
      mapping[header] = 'name';
    }
    // Coarse sort time mappings
    else if (['coarse start time', 'coarse start', 'coarsestart', 'coarse_start_time', '粗拣开始时间'].includes(normalizedHeader)) {
      mapping[header] = 'coarseStartTime';
    }
    else if (['coarse end time', 'coarse end', 'coarseend', 'coarse_end_time', '粗拣结束时间'].includes(normalizedHeader)) {
      mapping[header] = 'coarseEndTime';
    }
    // Fine sort time mappings
    else if (['fine start time', 'fine start', 'finestart', 'fine_start_time', '细拣开始时间'].includes(normalizedHeader)) {
      mapping[header] = 'fineStartTime';
    }
    else if (['fine end time', 'fine end', 'fineend', 'fine_end_time', '细拣结束时间'].includes(normalizedHeader)) {
      mapping[header] = 'fineEndTime';
    }
    // Count field mappings
    else if (['coarse count', 'coarse quantity', 'coarsecount', 'coarse_count', '粗拣数量'].includes(normalizedHeader)) {
      mapping[header] = 'coarseCount';
    }
    else if (['fine count', 'fine quantity', 'finecount', 'fine_count', '细拣数量'].includes(normalizedHeader)) {
      mapping[header] = 'fineCount';
    }
  });
  
  return mapping;
};

// Validate a single record
const validateRecord = (record, rowNumber) => {
  const errors = [];
  
  // Check required fields
  if (!record.date) {
    errors.push(`第${rowNumber}行：日期为必填项`);
  } else {
    // Validate date format
    const dateStr = formatDateFromExcel(record.date);
    if (!isValidDate(dateStr)) {
      errors.push(`第${rowNumber}行：日期格式无效，期望格式为 YYYY-MM-DD 或 Excel日期格式`);
    } else {
      record.date = dateStr; // Update with formatted date
    }
  }
  
  if (!record.name || record.name.toString().trim() === '') {
    errors.push(`第${rowNumber}行：姓名为必填项`);
  } else {
    record.name = record.name.toString().trim();
  }
  
  // Validate time formats
  // 粗拣时间必填
  const requiredTimeFields = ['coarseStartTime', 'coarseEndTime'];
  requiredTimeFields.forEach(field => {
    if (!record[field]) {
      const fieldNames = {
        'coarseStartTime': '粗拣开始时间',
        'coarseEndTime': '粗拣结束时间'
      };
      errors.push(`第${rowNumber}行：${fieldNames[field]}为必填项`);
    } else {
      const timeStr = formatTimeFromExcel(record[field]);
      if (!isValidTime(timeStr)) {
        errors.push(`第${rowNumber}行：${fieldNames[field]}格式无效，期望格式为 HH:mm`);
      } else {
        record[field] = timeStr;
      }
    }
  });
  
  // 细拣时间可选，但如果填写了需要验证格式
  const optionalTimeFields = ['fineStartTime', 'fineEndTime'];
  optionalTimeFields.forEach(field => {
    if (record[field]) {
      const timeStr = formatTimeFromExcel(record[field]);
      if (!isValidTime(timeStr)) {
        const fieldNames = {
          'fineStartTime': '细拣开始时间',
          'fineEndTime': '细拣结束时间'
        };
        errors.push(`第${rowNumber}行：${fieldNames[field]}格式无效，期望格式为 HH:mm`);
      } else {
        record[field] = timeStr;
      }
    }
  });
  
  // Validate count fields
  // 粗拣数量必须填写
  if (record.coarseCount === undefined || record.coarseCount === '') {
    errors.push(`第${rowNumber}行：粗拣数量为必填项`);
  } else {
    const count = Number(record.coarseCount);
    if (isNaN(count) || count < 0) {
      errors.push(`第${rowNumber}行：粗拣数量必须是非负数`);
    } else {
      record.coarseCount = count;
    }
  }
  
  // 细拣数量可以为空，默认为0
  if (record.fineCount !== undefined && record.fineCount !== '') {
    const count = Number(record.fineCount);
    if (isNaN(count) || count < 0) {
      errors.push(`第${rowNumber}行：细拣数量必须是非负数`);
    } else {
      record.fineCount = count;
    }
  } else {
    // 如果细拣数量为空，设置为0
    record.fineCount = 0;
  }
  
  return errors.length > 0 ? errors.join('; ') : null;
};

// Format date from Excel (handles both Excel serial dates and string dates)
const formatDateFromExcel = (excelDate) => {
  if (typeof excelDate === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(excelDate);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  } else if (typeof excelDate === 'string') {
    // Try to parse string date
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  return excelDate;
};

// Format time from Excel (handles both Excel time values and string times)
const formatTimeFromExcel = (excelTime) => {
  if (typeof excelTime === 'number' && excelTime < 1) {
    // Excel time fraction (0.5 = 12:00)
    const totalMinutes = Math.round(excelTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else if (typeof excelTime === 'string') {
    // String time, validate and reformat
    const timeMatch = excelTime.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  }
  return excelTime;
};

// Validate date string
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
};

// Validate time string
const isValidTime = (timeStr) => {
  if (typeof timeStr !== 'string') return false;
  const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) return false;
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

// Excel export functionality with data processing
export const exportToExcel = (data, filename = 'productivity_data') => {
  if (!data || data.length === 0) {
    throw new Error('没有数据可导出');
  }
  
  // 处理数据：整合、合并、排序
  const processedData = processDataForExport(data);
  
  // Define headers for processed data
  const headers = [
    '排名',
    '姓名',
    '记录数量',
    '日期范围',
    '总粗拣数量',
    '总细拣数量',
    '总粗拣工时',
    '总细拣工时',
    '总工作时间',
    '粗拣效率（件/小时）',
    '细拣效率（件/小时）',
    '综合效率（件/小时）'
  ];
  
  // Convert processed data to rows
  const rows = processedData.map((record, index) => [
    index + 1, // 排名
    record.name,
    record.recordCount,
    `${record.dateRange.start} 至 ${record.dateRange.end}`,
    record.totalCoarseCount,
    record.totalFineCount,
    record.totalCoarseHours.toFixed(2),
    record.totalFineHours.toFixed(2),
    record.totalWorkingHours.toFixed(2),
    record.coarseEfficiency,
    record.fineEfficiency,
    record.overallEfficiency
  ]);
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const colWidths = [
    { wch: 8 },  // 排名
    { wch: 15 }, // 姓名
    { wch: 12 }, // 记录数量
    { wch: 25 }, // 日期范围
    { wch: 15 }, // 总粗拣数量
    { wch: 15 }, // 总细拣数量
    { wch: 15 }, // 总粗拣工时
    { wch: 15 }, // 总细拣工时
    { wch: 15 }, // 总工作时间
    { wch: 20 }, // 粗拣效率
    { wch: 20 }, // 细拣效率
    { wch: 20 }  // 综合效率
  ];
  worksheet['!cols'] = colWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productivity Summary');
  
  // Save file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

// CSV export functionality with data processing
export const exportToCSV = (data, filename = 'productivity_data') => {
  if (!data || data.length === 0) {
    throw new Error('没有数据可导出');
  }
  
  // 处理数据：整合、合并、排序
  const processedData = processDataForExport(data);
  
  // Define headers for processed data
  const headers = [
    '排名',
    '姓名',
    '记录数量',
    '日期范围',
    '总粗拣数量',
    '总细拣数量',
    '总粗拣工时',
    '总细拣工时',
    '总工作时间',
    '粗拣效率（件/小时）',
    '细拣效率（件/小时）',
    '综合效率（件/小时）'
  ];
  
  // Convert processed data to CSV format
  const csvContent = [
    headers.join(','),
    ...processedData.map((record, index) => [
      index + 1, // 排名
      `"${record.name}"`, // Quote name in case it contains commas
      record.recordCount,
      `"${record.dateRange.start} 至 ${record.dateRange.end}"`,
      record.totalCoarseCount,
      record.totalFineCount,
      record.totalCoarseHours.toFixed(2),
      record.totalFineHours.toFixed(2),
      record.totalWorkingHours.toFixed(2),
      record.coarseEfficiency,
      record.fineEfficiency,
      record.overallEfficiency
    ].join(','))
  ].join('\n');
  
  // Create and save blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
};

// Generate Excel template for users
export const downloadTemplate = () => {
  const headers = [
    '日期',
    '姓名',
    '粗拣开始时间',
    '粗拣结束时间',
    '细拣开始时间',
    '细拣结束时间',
    '粗拣数量',
    '细拣数量'
  ];
  
  const sampleData = [
    ['2024-01-15', '张三', '09:00', '12:00', '13:00', '17:00', 150, 200],
    ['2024-01-15', '李四', '08:30', '11:30', '12:30', '16:30', 120, 180]
  ];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 15 }, // Name
    { wch: 15 }, // Coarse Start Time
    { wch: 15 }, // Coarse End Time
    { wch: 15 }, // Fine Start Time
    { wch: 15 }, // Fine End Time
    { wch: 12 }, // Coarse Count
    { wch: 12 }  // Fine Count
  ];
  worksheet['!cols'] = colWidths;
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  
  // Save file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'productivity_template.xlsx');
}; 