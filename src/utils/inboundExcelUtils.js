import * as XLSX from 'xlsx';

/**
 * 解析到件扫描Excel文件（优化版本，支持进度回调）
 * @param {File} file - Excel文件
 * @param {Function} onProgress - 进度回调函数 (progress) => void，progress 0-100
 * @returns {Promise<Array>} 解析后的记录数组
 */
export const parseInboundScanExcel = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // 报告进度：开始读取
        onProgress?.(10);
        
        const data = new Uint8Array(e.target.result);
        
        // 报告进度：开始解析
        onProgress?.(20);
        
        // 使用更高效的解析选项
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: false, // 不自动转换日期，我们自己处理
          cellNF: false, // 不保留数字格式
          cellStyles: false // 不保留样式
        });
        
        // 报告进度：解析完成
        onProgress?.(30);
        
        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 转换为JSON（第一行作为表头）
        // 使用更高效的方式：直接转换为对象数组，然后批量处理
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          raw: false // 使用格式化的值
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件必须包含至少一个表头行和一个数据行'));
          return;
        }
        
        // 报告进度：表头解析完成
        onProgress?.(40);
        
        // 解析表头
        const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
        
        // 查找关键列索引
        const scanTimeIndex = findColumnIndex(headers, ['扫描时间', '入站扫描时间', 'scanTime', 'scan_time', '时间']);
        const waybillIndex = findColumnIndex(headers, ['运单号', 'waybillNumber', 'waybill_number', 'waybill', '运单']);
        const routeIndex = findColumnIndex(headers, ['路由编码', 'routeCode', 'route_code', 'route', '路由', '路由码']);
        
        if (scanTimeIndex === -1) {
          reject(new Error('未找到"扫描时间"列，请确保Excel文件包含该列'));
          return;
        }
        if (waybillIndex === -1) {
          reject(new Error('未找到"运单号"列，请确保Excel文件包含该列'));
          return;
        }
        if (routeIndex === -1) {
          reject(new Error('未找到"路由编码"列，请确保Excel文件包含该列'));
          return;
        }
        
        // 解析数据行（批量处理，每1000行报告一次进度）
        const records = [];
        const errors = [];
        const totalRows = jsonData.length - 1;
        const progressStep = 50 / Math.ceil(totalRows / 1000); // 剩余50%的进度分配给数据解析
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // 每1000行报告一次进度
          if (i % 1000 === 0) {
            const progress = 40 + Math.floor((i / totalRows) * 50);
            onProgress?.(progress);
          }
          
          // 跳过空行
          if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }
          
          try {
            const scanTime = row[scanTimeIndex];
            const waybillNumber = row[waybillIndex];
            const routeCode = row[routeIndex];
            
            // 验证必填字段
            if (!scanTime || !waybillNumber || !routeCode) {
              errors.push({
                row: i + 1,
                error: '缺少必填字段'
              });
              continue;
            }
            
            // 解析扫描时间
            let scanTimeDate;
            if (scanTime instanceof Date) {
              scanTimeDate = scanTime;
            } else if (typeof scanTime === 'number') {
              // Excel日期序列号
              try {
                const dateCode = XLSX.SSF.parse_date_code(scanTime);
                scanTimeDate = new Date(dateCode.y, dateCode.m - 1, dateCode.d);
              } catch (e) {
                // 如果解析失败，尝试作为时间戳
                scanTimeDate = new Date((scanTime - 25569) * 86400 * 1000);
              }
            } else if (typeof scanTime === 'string') {
              // 字符串日期
              scanTimeDate = parseDateString(scanTime);
              if (!scanTimeDate) {
                errors.push({
                  row: i + 1,
                  error: `扫描时间格式无效: ${scanTime}`
                });
                continue;
              }
            } else {
              errors.push({
                row: i + 1,
                error: `扫描时间格式无效: ${scanTime}`
              });
              continue;
            }
            
            // 清理和验证数据
            const waybillStr = waybillNumber.toString().trim();
            const routeStr = routeCode.toString().trim().toUpperCase();
            
            if (!waybillStr || !routeStr) {
              errors.push({
                row: i + 1,
                error: '运单号或路由编码为空'
              });
              continue;
            }
            
            records.push({
              scanTime: scanTimeDate,
              waybillNumber: waybillStr,
              routeCode: routeStr
            });
          } catch (error) {
            errors.push({
              row: i + 1,
              error: error.message
            });
          }
        }
        
        // 报告进度：完成
        onProgress?.(100);
        
        if (records.length === 0 && errors.length > 0) {
          reject(new Error(`所有数据行都有错误。第一个错误: ${errors[0].error}`));
          return;
        }
        
        resolve({
          records,
          errors,
          totalRows: totalRows,
          validRows: records.length,
          errorRows: errors.length
        });
      } catch (error) {
        reject(new Error(`Excel解析失败: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取Excel文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 查找列索引（支持多种可能的列名）
 */
function findColumnIndex(headers, possibleNames) {
  const normalizedNames = possibleNames.map(name => name.toLowerCase().trim());
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] ? headers[i].toLowerCase().trim() : '';
    if (normalizedNames.some(name => header.includes(name) || name.includes(header))) {
      return i;
    }
  }
  
  return -1;
}

/**
 * 解析日期字符串（支持多种格式）
 */
function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  // 尝试多种日期格式
  const formats = [
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(\s+(\d{1,2}):(\d{1,2})(:(\d{1,2}))?)?$/, // YYYY-MM-DD HH:mm:ss
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(\s+(\d{1,2}):(\d{1,2})(:(\d{1,2}))?)?$/, // MM/DD/YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day, hour = 0, minute = 0, second = 0;
      
      if (match[1].length === 4) {
        // YYYY-MM-DD格式
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
        if (match[5]) hour = parseInt(match[5]);
        if (match[6]) minute = parseInt(match[6]);
        if (match[8]) second = parseInt(match[8]);
      } else {
        // MM/DD/YYYY格式
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        year = parseInt(match[3]);
        if (match[5]) hour = parseInt(match[5]);
        if (match[6]) minute = parseInt(match[6]);
        if (match[8]) second = parseInt(match[8]);
      }
      
      const date = new Date(year, month, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // 尝试直接解析
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

