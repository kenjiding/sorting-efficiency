import * as XLSX from 'xlsx';

/**
 * 查找列索引（支持多个可能的列名）
 * 优先精确匹配，然后模糊匹配
 */
const findColumnIndex = (headers, possibleNames) => {
  // 第一步：精确匹配（去除空格后完全相等）
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = headers.findIndex(h => {
      if (!h) return false;
      const normalizedHeader = h.toString().toLowerCase().trim();
      return normalizedHeader === normalizedName;
    });
    if (index !== -1) {
      console.log(`精确匹配列名: "${name}" -> 索引 ${index}, 实际列名: "${headers[index]}"`);
      return index;
    }
  }
  
  // 第二步：模糊匹配（包含关系）
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = headers.findIndex(h => {
      if (!h) return false;
      const normalizedHeader = h.toString().toLowerCase().trim();
      return normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader);
    });
    if (index !== -1) {
      console.log(`模糊匹配列名: "${name}" -> 索引 ${index}, 实际列名: "${headers[index]}"`);
      return index;
    }
  }
  
  console.warn(`未找到列名: ${possibleNames.join(', ')}`);
  return -1;
};

/**
 * 查找列索引（支持排除某些列名）
 * 用于确保优先匹配正确的列，避免匹配到相似的列名
 */
const findColumnIndexExcluding = (headers, possibleNames, excludeNames = []) => {
  // 第一步：精确匹配（去除空格后完全相等），排除指定列名
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = headers.findIndex((h, idx) => {
      if (!h) return false;
      const normalizedHeader = h.toString().toLowerCase().trim();
      
      // 检查是否在排除列表中
      const isExcluded = excludeNames.some(excludeName => {
        const normalizedExclude = excludeName.toLowerCase().trim();
        return normalizedHeader === normalizedExclude || normalizedHeader.includes(normalizedExclude);
      });
      
      if (isExcluded) return false;
      return normalizedHeader === normalizedName;
    });
    if (index !== -1) {
      console.log(`精确匹配列名（排除后）: "${name}" -> 索引 ${index}, 实际列名: "${headers[index]}"`);
      return index;
    }
  }
  
  // 第二步：模糊匹配（包含关系），排除指定列名
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().trim();
    const index = headers.findIndex((h, idx) => {
      if (!h) return false;
      const normalizedHeader = h.toString().toLowerCase().trim();
      
      // 检查是否在排除列表中
      const isExcluded = excludeNames.some(excludeName => {
        const normalizedExclude = excludeName.toLowerCase().trim();
        return normalizedHeader === normalizedExclude || normalizedHeader.includes(normalizedExclude);
      });
      
      if (isExcluded) return false;
      
      // 确保匹配的列名包含目标名称，但不包含排除名称
      const matches = normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader);
      return matches;
    });
    if (index !== -1) {
      console.log(`模糊匹配列名（排除后）: "${name}" -> 索引 ${index}, 实际列名: "${headers[index]}"`);
      return index;
    }
  }
  
  console.warn(`未找到列名（排除 ${excludeNames.join(', ')} 后）: ${possibleNames.join(', ')}`);
  return -1;
};

/**
 * 解析日期字符串
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // 如果是Date对象，直接转换
  if (dateStr instanceof Date) {
    return dateStr.toISOString().split('T')[0];
  }
  
  // 如果是数字（Excel日期序列号）
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // 如果是字符串，尝试解析
  const str = dateStr.toString().trim();
  if (!str) return null;
  
  // 尝试多种日期格式
  const formats = [
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // MM-DD-YYYY or DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      const year = match[1].length === 4 ? match[1] : match[3];
      const month = match[1].length === 4 ? match[2] : match[1];
      const day = match[1].length === 4 ? match[3] : match[2];
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // 尝试直接解析
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
};

/**
 * 解析DA问题件审核Excel文件
 */
export const parseProblemItemExcel = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        onProgress?.(10);
        
        const data = new Uint8Array(e.target.result);
        onProgress?.(20);
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellStyles: false
        });
        
        onProgress?.(30);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件必须包含至少一个表头行和一个数据行'));
          return;
        }
        
        onProgress?.(40);
        
        const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
        
        // 调试日志：输出所有表头
        console.log('问题件Excel表头:', headers);
        
        // 查找列索引
        const waybillIndex = findColumnIndex(headers, ['运单号', 'waybill', 'waybillNumber', '运单']);
        const supplierIndex = findColumnIndex(headers, ['所属供应商', '供应商', 'supplier']);
        // 问题件原因：优先精确匹配"问题件原因"，排除"问题件原因类型"
        const reasonIndex = findColumnIndexExcluding(headers, ['问题件原因', '原因', 'reason'], ['问题件原因类型']);
        const driverCodeIndex = findColumnIndex(headers, ['司机编码', '司机代码', 'driverCode']);
        const driverNameIndex = findColumnIndex(headers, ['司机姓名', '司机', 'driverName', 'driver']);
        const registerTimeIndex = findColumnIndex(headers, ['登记时间', '时间', 'registerTime', '时间']);
        
        // 调试日志：输出找到的列索引和实际列名
        console.log('问题件Excel列索引:', {
          waybillIndex,
          supplierIndex,
          reasonIndex,
          driverCodeIndex,
          driverNameIndex,
          registerTimeIndex,
          reasonColumnName: reasonIndex >= 0 ? headers[reasonIndex] : '未找到',
          allHeaders: headers
        });
        
        if (waybillIndex === -1) {
          reject(new Error('未找到"运单号"列'));
          return;
        }
        
        const records = [];
        const errors = [];
        const totalRows = jsonData.length - 1;
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          if (i % 1000 === 0) {
            const progress = 40 + Math.floor((i / totalRows) * 50);
            onProgress?.(progress);
          }
          
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }
          
          try {
            const waybillNumber = row[waybillIndex]?.toString().trim();
            if (!waybillNumber) {
              errors.push({ row: i + 1, error: '运单号为空' });
              continue;
            }
            
            const registerTime = row[registerTimeIndex] ? parseDate(row[registerTimeIndex]) : null;
            const supplier = row[supplierIndex]?.toString().trim() || '';
            const reason = reasonIndex >= 0 ? (row[reasonIndex]?.toString().trim() || '') : '';
            const driverCode = row[driverCodeIndex]?.toString().trim() || '';
            const driverName = row[driverNameIndex]?.toString().trim() || '';
            
            // 调试日志：输出前几条解析的数据
            if (records.length < 3) {
              console.log('解析的问题件数据示例 (第' + (i + 1) + '行):', {
                waybillNumber,
                supplier,
                reason: reason || '(空)',
                driverCode,
                driverName,
                registerTime,
                rawReason: reasonIndex >= 0 ? row[reasonIndex] : '列未找到'
              });
            }
            
            records.push({
              waybillNumber,
              supplier,
              reason,
              driverCode,
              driverName,
              registerTime: registerTime || new Date().toISOString().split('T')[0]
            });
          } catch (error) {
            errors.push({ row: i + 1, error: error.message });
          }
        }
        
        onProgress?.(100);
        
        resolve({
          records,
          validRows: records.length,
          errorRows: errors.length,
          errors
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('读取Excel文件失败'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 解析丢包Excel文件（Abnormal List.xlsx）
 */
export const parseLostPackageExcel = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        onProgress?.(10);
        
        const data = new Uint8Array(e.target.result);
        onProgress?.(20);
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellStyles: false
        });
        
        onProgress?.(30);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件必须包含至少一个表头行和一个数据行'));
          return;
        }
        
        onProgress?.(40);
        
        const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
        
        // 查找列索引
        const reasonIndex = findColumnIndex(headers, ['异常完结原因', '原因', 'reason']);
        const supplierIndex = findColumnIndex(headers, ['供应商名字', '供应商', 'supplier']);
        const finishTimeIndex = findColumnIndex(headers, ['完结时间', '时间', 'finishTime']);
        const typeIndex = findColumnIndex(headers, ['疑似丢包', '确认丢包', '库外丢', '类型', 'type']);
        const driverNameIndex = findColumnIndex(headers, ['异常完结备注', '司机', 'driverName', '司机姓名']);
        
        const records = [];
        const errors = [];
        const totalRows = jsonData.length - 1;
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          if (i % 1000 === 0) {
            const progress = 40 + Math.floor((i / totalRows) * 50);
            onProgress?.(progress);
          }
          
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }
          
          try {
            const reason = row[reasonIndex]?.toString().trim() || '';
            const supplier = row[supplierIndex]?.toString().trim() || '';
            const finishTime = row[finishTimeIndex] ? parseDate(row[finishTimeIndex]) : null;
            // 异常完结备注映射为司机字段
            const driverName = driverNameIndex >= 0 ? (row[driverNameIndex]?.toString().trim() || '') : '';
            
            // 判断类型：库内丢包或库外丢包
            let type = '';
            if (reason.includes('库内丢包') || reason.includes('库内')) {
              type = '库内丢包';
            } else if (reason.includes('库外丢包') || reason.includes('库外')) {
              type = '库外丢包';
            } else {
              // 从类型列判断
              const typeValue = row[typeIndex]?.toString().trim() || '';
              if (typeValue.includes('疑似丢包')) {
                type = '疑似丢包';
              } else if (typeValue.includes('确认丢包') || typeValue.includes('库外丢')) {
                type = '确认丢包';
              } else {
                type = reason || '未知';
              }
            }
            
            records.push({
              reason,
              supplier,
              finishTime: finishTime || new Date().toISOString().split('T')[0],
              type,
              driverName
            });
          } catch (error) {
            errors.push({ row: i + 1, error: error.message });
          }
        }
        
        onProgress?.(100);
        
        resolve({
          records,
          validRows: records.length,
          errorRows: errors.length,
          errors
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('读取Excel文件失败'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 解析客诉明细Excel文件
 */
export const parseComplaintExcel = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        onProgress?.(10);
        
        const data = new Uint8Array(e.target.result);
        onProgress?.(20);
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellStyles: false
        });
        
        onProgress?.(30);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件必须包含至少一个表头行和一个数据行'));
          return;
        }
        
        onProgress?.(40);
        
        const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
        
        // 查找列索引（优先匹配精确名称）
        const createTimeIndex = findColumnIndex(headers, ['工单创建时间', '创建时间', 'createTime', '时间']);
        const subCategoryIndex = findColumnIndex(headers, ['工单子类', '子类', 'subCategory', '客诉类型']);
        // 供应商名称：优先匹配"供应商名称"，然后是其他变体
        const supplierIndex = findColumnIndex(headers, ['供应商名称', '供应商', 'supplier', '供应商名字', '所属供应商']);
        // 责任员工名称：优先匹配"责任员工名称"，然后是其他变体
        const driverNameIndex = findColumnIndex(headers, ['责任员工名称', '司机姓名', '司机', 'driverName', '员工名称', '员工', '责任员工']);
        const statusIndex = findColumnIndex(headers, ['状态', 'status', '工单状态']);
        
        // 调试日志：输出找到的列索引和实际列名
        console.log('客诉Excel列索引:', {
          createTimeIndex,
          subCategoryIndex,
          supplierIndex,
          driverNameIndex,
          statusIndex,
          headers: headers,
          supplierColumnName: supplierIndex >= 0 ? headers[supplierIndex] : '未找到',
          driverNameColumnName: driverNameIndex >= 0 ? headers[driverNameIndex] : '未找到'
        });
        
        if (createTimeIndex === -1) {
          reject(new Error('未找到"工单创建时间"列'));
          return;
        }
        
        const records = [];
        const errors = [];
        const totalRows = jsonData.length - 1;
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          if (i % 1000 === 0) {
            const progress = 40 + Math.floor((i / totalRows) * 50);
            onProgress?.(progress);
          }
          
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }
          
          try {
            const createTime = row[createTimeIndex] ? parseDate(row[createTimeIndex]) : null;
            if (!createTime) {
              errors.push({ row: i + 1, error: '工单创建时间为空' });
              continue;
            }
            
            const subCategory = subCategoryIndex >= 0 ? (row[subCategoryIndex]?.toString().trim() || '') : '';
            const supplier = supplierIndex >= 0 ? (row[supplierIndex]?.toString().trim() || '') : '';
            const driverName = driverNameIndex >= 0 ? (row[driverNameIndex]?.toString().trim() || '') : '';
            const status = statusIndex >= 0 ? (row[statusIndex]?.toString().trim() || '') : '';
            
            // 调试日志：输出前几条解析的数据（包括原始值和提取值）
            if (records.length < 3) {
              console.log('解析的客诉数据示例 (第' + (i + 1) + '行):', {
                createTime,
                subCategory,
                supplier: supplier || '(空)',
                driverName: driverName || '(空)',
                status,
                rawSupplier: supplierIndex >= 0 ? row[supplierIndex] : '列未找到',
                rawDriverName: driverNameIndex >= 0 ? row[driverNameIndex] : '列未找到'
              });
            }
            
            // 如果供应商或司机名称为空，记录警告（仅前几条）
            if (records.length < 3) {
              if (!supplier && supplierIndex >= 0) {
                console.warn(`第${i + 1}行: 供应商名称为空，列索引: ${supplierIndex}, 原始值:`, row[supplierIndex]);
              }
              if (!driverName && driverNameIndex >= 0) {
                console.warn(`第${i + 1}行: 责任员工名称为空，列索引: ${driverNameIndex}, 原始值:`, row[driverNameIndex]);
              }
            }
            
            records.push({
              createTime: createTime || new Date().toISOString().split('T')[0],
              subCategory,
              supplier,
              driverName,
              status
            });
          } catch (error) {
            errors.push({ row: i + 1, error: error.message });
          }
        }
        
        onProgress?.(100);
        
        resolve({
          records,
          validRows: records.length,
          errorRows: errors.length,
          errors
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('读取Excel文件失败'));
    reader.readAsArrayBuffer(file);
  });
};

