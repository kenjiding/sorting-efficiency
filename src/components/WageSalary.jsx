import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import Modal from './common/Modal';
import API_BASE_URL_CONFIG from '../api/config';
import { 
  Upload, 
  Users, 
  Download, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  DollarSign,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { parse, format, isValid } from 'date-fns';

const API_BASE_URL = `${API_BASE_URL_CONFIG}/wages`;

const WageSalary = () => {
  const { selectedRegion } = useStore();
  const region = selectedRegion || 'SYD';

  const [activeTab, setActiveTab] = useState('upload');
  const [employees, setEmployees] = useState([]);
  const [wageRecords, setWageRecords] = useState([]);
  const [isLoadingWageRecords, setIsLoadingWageRecords] = useState(false);
  const [uploadedData, setUploadedData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  // 上传配置
  const [isSorting, setIsSorting] = useState(false);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadBatchId, setUploadBatchId] = useState(null);
  
  // 编辑状态
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [tempRole, setTempRole] = useState('');
  // 通用编辑状态：{ recordId: { field: value } }
  const [editingFields, setEditingFields] = useState({});
  // 整行编辑状态：记录ID -> 编辑数据
  const [rowEditingData, setRowEditingData] = useState({});
  
  // 搜索和筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchRole, setSearchRole] = useState('');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // 时薪标准设置
  const [showRateSettings, setShowRateSettings] = useState(false);
  
  // 默认时薪标准（使用英文key）
  const defaultRateSettings = {
    worker: { workday: 34.44, sortingWeekend: 43.05, publicHoliday: 86.1 },
    forklift: { workday: 36.9, sortingWeekend: 46.125, publicHoliday: 92.25 },
    receptionist: { workday: 36.9, sortingWeekend: 46.125, publicHoliday: 92.25 }
  };

  const isWeekendWorkday = (workdayValue) => {
    if (!workdayValue) return false;
    const normalized = workdayValue.toString().trim().toLowerCase();
    if (!normalized) return false;
    const weekendKeywords = [
      '周六', '星期六', '周日', '星期日',
      'saturday', 'sunday', 'sat', 'sun'
    ];
    return weekendKeywords.some(keyword => normalized.includes(keyword));
  };

  /**
   * 判断记录是否是周末（同时检查workday字段和实际日期）
   */
  const isWeekendRecord = (record) => {
    // 先检查workday字段
    if (isWeekendWorkday(record.workday)) {
      return true;
    }
    // 再检查实际日期是否是周末
    const dateObj = parseDate(record.date);
    if (dateObj && isValid(dateObj)) {
      const dayOfWeek = dateObj.getDay(); // 0=周日, 6=周六
      return dayOfWeek === 0 || dayOfWeek === 6;
    }
    return false;
  };
  
  // 从localStorage加载时薪设置（根据region）
  const loadRateSettings = (region) => {
    try {
      const savedSettings = localStorage.getItem(`wageRateSettings_${region}`);
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (error) {
      console.error('加载时薪设置失败:', error);
    }
    return defaultRateSettings;
  };
  
  const [rateSettings, setRateSettings] = useState(() => loadRateSettings(region));
  
  // 消息提示
  const [message, setMessage] = useState(null);

  // 角色映射
  const roleMap = {
    worker: '普通小工',
    forklift: '叉车',
    receptionist: '前台'
  };

  // 角色选项（英文key）
  const roles = ['worker', 'forklift', 'receptionist'];

  // 加载所有员工
  const loadEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees?region=${region}`);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('加载员工列表失败:', response.status, errorText);
        showMessage(`加载员工列表失败: ${response.status}`, 'error');
        return;
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('响应不是JSON格式:', contentType, text.substring(0, 200));
        showMessage('服务器返回了非JSON格式的响应', 'error');
        return;
      }
      
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('加载员工列表失败:', error);
      showMessage('加载员工列表失败', 'error');
    }
  };

  // 加载工资记录
  const loadWageRecords = async () => {
    setIsLoadingWageRecords(true);
    try {
      const params = new URLSearchParams({ region });
      if (searchQuery) params.append('employeeId', searchQuery);
      if (searchStartDate) params.append('startDate', searchStartDate);
      if (searchEndDate) params.append('endDate', searchEndDate);
      if (searchRole) params.append('role', searchRole);
      
      const response = await fetch(`${API_BASE_URL}/records?${params}`);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('加载工资记录失败:', response.status, errorText);
        showMessage(`加载工资记录失败: ${response.status}`, 'error');
        setWageRecords([]);
        return;
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('响应不是JSON格式:', contentType, text.substring(0, 200));
        showMessage('服务器返回了非JSON格式的响应', 'error');
        setWageRecords([]);
        return;
      }
      
      const data = await response.json();
      // 后端返回 {records: [], total: ...}，提取 records 数组
      setWageRecords(data.records || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('加载工资记录失败:', error);
      showMessage('加载工资记录失败', 'error');
      setWageRecords([]); // 确保出错时也设置为空数组
    } finally {
      setIsLoadingWageRecords(false);
    }
  };

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/statistics?region=${region}`);
      
      // 检查响应状态
      if (!response.ok) {
        console.error('加载统计数据失败:', response.status);
        return;
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('响应不是JSON格式:', contentType);
        return;
      }
      
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    // 当region切换时，清空当前数据并重新加载
    setEmployees([]);
    setWageRecords([]);
    setStatistics(null);
    setUploadedData([]);
    setCurrentPage(1);
    setSearchQuery('');
    setSearchStartDate('');
    setSearchEndDate('');
    setSearchRole('');
    
    // 重新加载该region的时薪设置
    setRateSettings(loadRateSettings(region));
    
    // 重新加载数据
    loadEmployees();
    loadWageRecords();
    loadStatistics();
  }, [region]);

  // 显示消息
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // 保存时薪设置到localStorage
  const saveRateSettings = (settings) => {
    try {
      localStorage.setItem(`wageRateSettings_${region}`, JSON.stringify(settings));
      showMessage('时薪设置已保存', 'success');
    } catch (error) {
      console.error('保存时薪设置失败:', error);
      showMessage('保存时薪设置失败', 'error');
    }
  };

  // 重置时薪设置为默认值
  const resetRateSettings = () => {
    setRateSettings(defaultRateSettings);
    localStorage.removeItem(`wageRateSettings_${region}`);
    showMessage('已重置为默认时薪', 'success');
  };

  /**
   * 解析各种日期格式，统一返回Date对象
   * 优先处理澳大利亚格式 (DD/MM/YYYY)
   */
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    // 如果已经是Date对象
    if (dateValue instanceof Date && isValid(dateValue)) {
      return dateValue;
    }
    
    // 如果是Excel日期序列号（数字）
    if (typeof dateValue === 'number') {
      // Excel日期从1900年1月1日开始计算
      // 注意：Excel有一个bug，1900年被错误地当作闰年
      const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899年12月30日
      const milliseconds = dateValue * 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + milliseconds);
      return date;
    }
    
    // 如果是字符串日期
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim();
      
      // 1. 优先尝试澳大利亚格式 DD/MM/YYYY 或 D/M/YYYY
      const australianFormats = ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy'];
      for (const formatStr of australianFormats) {
        try {
          const parsedDate = parse(dateStr, formatStr, new Date());
          if (isValid(parsedDate)) {
            return parsedDate;
          }
        } catch (e) {
          // 继续尝试下一个格式
        }
      }
      
      // 2. 尝试ISO格式 YYYY-MM-DD
      try {
        const isoDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (isValid(isoDate)) {
          return isoDate;
        }
      } catch (e) {
        // 继续
      }
      
      // 3. 最后尝试JavaScript原生解析（不推荐，但作为后备）
      const fallbackDate = new Date(dateStr);
      if (isValid(fallbackDate)) {
        return fallbackDate;
      }
    }
    
    return null;
  };

  /**
   * 格式化日期显示为中文格式
   */
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    
    const date = parseDate(dateValue);
    if (!date || !isValid(date)) {
      return typeof dateValue === 'string' ? dateValue : '-';
    }
    
    // 使用date-fns格式化为 yyyy/M/d 格式
    return format(date, 'yyyy/M/d');
  };

  /**
   * 格式化工作日显示，将"周天"替换为"周日"
   */
  const formatWorkday = (workdayValue) => {
    if (!workdayValue) return '-';
    const workdayStr = workdayValue.toString();
    // 将"周天"替换为"周日"
    return workdayStr.replace(/周天/g, '周日');
  };

  /**
   * 将日期转换为标准格式 YYYY-MM-DD 用于提交到后端
   * 重要：使用本地日期，避免UTC时区转换导致日期变化
   */
  const convertDateToStandard = (dateValue) => {
    if (!dateValue) return '';
    
    const date = parseDate(dateValue);
    if (!date || !isValid(date)) {
      return typeof dateValue === 'string' ? dateValue : '';
    }
    
    // 使用date-fns格式化，确保使用本地时间而不是UTC
    return format(date, 'yyyy-MM-dd');
  };

  // 处理文件上传（支持Excel和CSV）
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let jsonData = [];

      // 配置XLSX读取选项：保留原始数据，不自动转换日期
      const xlsxOptions = {
        cellDates: false,  // 不自动将数字转换为Date对象
        raw: false,        // 使用格式化的文本而不是原始值
        dateNF: 'dd/mm/yyyy' // 日期格式（但由于cellDates=false，这个不会生效）
      };

      if (fileExtension === 'csv') {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string', ...xlsxOptions });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, xlsxOptions);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      }

      // 创建员工ID到角色的映射
      const employeeRoleMap = {};
      employees.forEach(emp => {
        employeeRoleMap[emp.employeeId] = emp.role;
      });

      const mappedData = jsonData.map(row => {
        const employeeId = row['人员编号'] || row['Employee ID'] || row['employeeId'] || '';
        
        // 如果员工已存在，使用员工列表中的角色；否则使用默认角色
        const role = employeeRoleMap[employeeId] || 'worker';

        const workdayValue = row['工作日'] || row['Workday'] || row['workday'] || '';
        const dateValue = row['日期'] || row['Date'] || row['date'] || '';
        
        // 判断是否是周末：先检查workday字段，再检查实际日期
        let weekend = isWeekendWorkday(workdayValue);
        if (!weekend) {
          // 如果workday字段没有标注，检查实际日期是否是周末
          const dateObj = parseDate(dateValue);
          if (dateObj && isValid(dateObj)) {
            const dayOfWeek = dateObj.getDay(); // 0=周日, 6=周六
            weekend = dayOfWeek === 0 || dayOfWeek === 6;
          }
        }

        let isPublicHolidayRow = false;
        let isSortingRow = false;
        // 默认设置为"分拣"，后续会根据人数自动调整
        let weekendOption = 'sorting';

        if (weekend) {
          if (isPublicHoliday) {
            isPublicHolidayRow = true;
            weekendOption = 'publicHoliday';
          } else if (isSorting) {
            isSortingRow = true;
            weekendOption = 'sorting';
          } else {
            // 默认分拣
            weekendOption = 'sorting';
            isSortingRow = true;
          }
        } else {
          // 工作日也使用相同的选项结构
          if (isPublicHoliday) {
            isPublicHolidayRow = true;
            weekendOption = 'publicHoliday';
          } else if (isSorting) {
            isSortingRow = true;
            weekendOption = 'sorting';
          } else {
            // 默认分拣
            weekendOption = 'sorting';
            isSortingRow = true;
          }
        }
        
        return {
          employeeId,
          name: row['姓名'] || row['Name'] || row['name'] || '',
          surname: row['姓氏'] || row['Surname'] || row['surname'] || '',
          nickname: row['昵称'] || row['Nickname'] || row['nickname'] || '',
          department: row['部门'] || row['Department'] || row['department'] || '',
          date: dateValue,
          workday: workdayValue,
          firstClockIn: row['首次打卡'] || row['First Clock In'] || row['firstClockIn'] || '',
          lastClockOut: row['最后打卡'] || row['Last Clock Out'] || row['lastClockOut'] || '',
          totalHours: row['总时长'] || row['Total Hours'] || row['totalHours'] || '',
          role,
          isPublicHolidayRow,
          isSortingRow,
          weekendOption
        };
      });

      // 自动设置所有日期的"日配置"：默认分拣，如果同一天的人数少于3人，则设置为不分拣
      // 按日期分组，统计每个日期的工作人数（所有日期，不只是周末）
      const dateGroupMap = new Map();
      
      mappedData.forEach(record => {
        const dateObj = parseDate(record.date);
        if (dateObj && isValid(dateObj)) {
          const dateKey = format(dateObj, 'yyyy-MM-dd');
          if (!dateGroupMap.has(dateKey)) {
            dateGroupMap.set(dateKey, new Set());
          }
          // 使用员工ID去重统计人数
          dateGroupMap.get(dateKey).add(record.employeeId);
        }
      });
      
      // 更新所有记录的weekendOption（不只是周末）
      const processedData = mappedData.map(record => {
        const dateObj = parseDate(record.date);
        if (dateObj && isValid(dateObj)) {
          // 如果不是公共节假日，根据工作人数自动设置
          if (!record.isPublicHolidayRow) {
            const dateKey = format(dateObj, 'yyyy-MM-dd');
            const workerCount = dateGroupMap.get(dateKey)?.size || 0;
            
            // 如果人数少于3人，设置为不分拣；否则保持默认的分拣
            if (workerCount < 3) {
              return {
                ...record,
                weekendOption: 'regularWeekend',
                isSortingRow: false
              };
            } else {
              // 人数>=3人，保持分拣
              return {
                ...record,
                weekendOption: 'sorting',
                isSortingRow: true
              };
            }
          }
        }
        return record;
      });

      // 按日期排序
      const sortedData = processedData.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        
        if (!dateA || !isValid(dateA)) return 1;
        if (!dateB || !isValid(dateB)) return -1;
        
        return dateA.getTime() - dateB.getTime();
      });

      setUploadedData(sortedData);
      
      // 统计已匹配和新员工
      const matchedCount = mappedData.filter(item => employeeRoleMap[item.employeeId]).length;
      const newCount = mappedData.length - matchedCount;
      
      if (matchedCount > 0 && newCount > 0) {
        showMessage(`成功读取 ${mappedData.length} 条记录（${matchedCount} 条已匹配角色，${newCount} 条新员工）`, 'success');
      } else if (matchedCount > 0) {
        showMessage(`成功读取 ${mappedData.length} 条记录（全部已匹配角色）`, 'success');
      } else {
        showMessage(`成功读取 ${mappedData.length} 条记录（全部为新员工）`, 'success');
      }
    } catch (error) {
      console.error('读取文件失败:', error);
      showMessage('读取文件失败，请确保文件格式正确', 'error');
    }

    event.target.value = '';
  };

  // 提交上传数据
  const handleSubmitUpload = async () => {
    if (uploadedData.length === 0) {
      showMessage('请先上传文件', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 转换所有日期为标准格式，并验证数据
      const recordsToSubmit = [];
      const validationErrors = [];

      for (let i = 0; i < uploadedData.length; i++) {
        const record = uploadedData[i];
        const {
          isPublicHolidayRow,
          isSortingRow,
          ...rest
        } = record;

        // 验证必填字段（人员编号可以为空，用于试工人员）
        if (!record.name || !record.date || !record.totalHours) {
          const missingFields = [];
          if (!record.name) missingFields.push('姓名');
          if (!record.date) missingFields.push('日期');
          if (!record.totalHours) missingFields.push('总时长');
          
          validationErrors.push({
            index: i + 1,
            employeeId: record.employeeId || '试工',
            name: record.name || '未知',
            error: `缺少必填字段: ${missingFields.join('、')}`
          });
          continue;
        }

        // 验证日期格式
        const standardDate = convertDateToStandard(record.date);
        if (!standardDate || standardDate.trim() === '') {
          validationErrors.push({
            index: i + 1,
            employeeId: record.employeeId || '试工',
            name: record.name,
            error: `日期格式无效: ${record.date}`
          });
          continue;
        }

        // 如果人员编号为空（试工人员），生成临时ID
        let finalEmployeeId = record.employeeId;
        if (!finalEmployeeId || finalEmployeeId.trim() === '') {
          // 使用姓名和日期生成临时ID，格式：TEMP-{姓名前10字符}-{日期}
          const namePart = record.name.trim().substring(0, 10).replace(/\s+/g, '-');
          const datePart = standardDate.replace(/-/g, '');
          finalEmployeeId = `TEMP-${namePart}-${datePart}`;
        }

        // 所有日期都根据 weekendOption 来设置（不再区分周末和工作日）
        let recordIsPublicHoliday = false;
        let recordIsSorting = false;

        if (record.weekendOption === 'publicHoliday') {
          recordIsPublicHoliday = true;
          recordIsSorting = false;
        } else if (record.weekendOption === 'sorting') {
          recordIsPublicHoliday = false;
          recordIsSorting = true;
        } else {
          // 'regularWeekend' 或其他值，表示不分拣
          recordIsPublicHoliday = false;
          recordIsSorting = false;
        }

        recordsToSubmit.push({
          ...rest,
          employeeId: finalEmployeeId, // 使用处理后的员工ID（可能是临时ID）
          date: standardDate,
          isPublicHoliday: recordIsPublicHoliday,
          isSorting: recordIsSorting
        });
      }

      // 如果有验证错误，先显示错误信息
      if (validationErrors.length > 0) {
        const errorMsg = `数据验证失败，发现 ${validationErrors.length} 条无效记录：\n\n` +
          validationErrors.slice(0, 10).map(err => 
            `第 ${err.index} 行 - ${err.name} (${err.employeeId}): ${err.error}`
          ).join('\n') +
          (validationErrors.length > 10 ? `\n...还有 ${validationErrors.length - 10} 条错误` : '');
        showMessage(errorMsg, 'error');
        setIsUploading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/records/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          records: recordsToSubmit,
          isSorting,
          isPublicHoliday,
          rateSettings
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // 显示详细的成功/失败信息
        if (result.failed > 0 && result.errors && result.errors.length > 0) {
          // 如果有失败记录，显示前5条错误信息
          const errorMessages = result.errors.slice(0, 5).map(err => 
            `${err.name || err.employeeId || '未知'}: ${err.error}`
          ).join('\n');
          const moreErrors = result.errors.length > 5 ? `\n...还有 ${result.errors.length - 5} 条错误` : '';
          showMessage(
            `上传完成！成功: ${result.success} 条，失败: ${result.failed} 条\n\n错误详情：\n${errorMessages}${moreErrors}`,
            'error'
          );
        } else {
          showMessage(
            `上传成功！成功: ${result.success} 条，失败: ${result.failed} 条`,
            'success'
          );
        }
        setUploadBatchId(result.uploadBatchId);
        await loadWageRecords();
        await loadEmployees();
        await loadStatistics();
        setUploadedData([]);
      } else {
        // 显示详细的错误信息
        const errorMsg = result.message || '上传失败';
        const errorDetails = result.errors && result.errors.length > 0 
          ? '\n\n错误详情：\n' + result.errors.slice(0, 10).map(err => 
              `${err.name || err.employeeId || '未知'}: ${err.error || '未知错误'}`
            ).join('\n')
          : '';
        showMessage(errorMsg + errorDetails, 'error');
      }
    } catch (error) {
      console.error('上传失败:', error);
      showMessage(`上传失败: ${error.message || '网络错误'}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 更新记录角色
  const handleUpdateRecordRole = async (recordId, newRole) => {
    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, rateSettings })
      });

      const result = await response.json();
      
      if (response.ok) {
        showMessage('角色更新成功', 'success');
        await loadWageRecords();
        await loadStatistics();
      } else {
        showMessage(result.message || '更新失败', 'error');
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      showMessage('更新角色失败', 'error');
    }
    setEditingRecordId(null);
  };

  // 通用更新记录字段
  const handleUpdateRecordField = async (recordId, fieldUpdates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fieldUpdates, rateSettings })
      });

      const result = await response.json();
      
      if (response.ok) {
        showMessage('更新成功', 'success');
        await loadWageRecords();
        await loadStatistics();
        // 清除编辑状态
        setEditingFields(prev => {
          const newState = { ...prev };
          delete newState[recordId];
          return newState;
        });
      } else {
        showMessage(result.message || '更新失败', 'error');
      }
    } catch (error) {
      console.error('更新记录失败:', error);
      showMessage('更新记录失败', 'error');
    }
  };

  // 开始编辑字段
  const startEditingField = (recordId, field, currentValue) => {
    setEditingFields(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: currentValue
      }
    }));
  };

  // 取消编辑字段
  const cancelEditingField = (recordId, field) => {
    setEditingFields(prev => {
      const newState = { ...prev };
      if (newState[recordId]) {
        delete newState[recordId][field];
        if (Object.keys(newState[recordId]).length === 0) {
          delete newState[recordId];
        }
      }
      return newState;
    });
  };

  // 保存编辑的字段
  const saveEditingField = (recordId, field, value) => {
    const fieldUpdates = { [field]: value };
    handleUpdateRecordField(recordId, fieldUpdates);
  };

  // 开始整行编辑
  const startRowEditing = (record) => {
    setRowEditingData({
      [record._id]: {
        date: convertDateToStandard(record.date),
        workday: record.workday || '',
        totalHours: record.totalHours || '',
        role: record.role,
        isPublicHoliday: record.isPublicHoliday || false,
        isSorting: record.isSorting || false
      }
    });
  };

  // 取消整行编辑
  const cancelRowEditing = (recordId) => {
    setRowEditingData(prev => {
      const newState = { ...prev };
      delete newState[recordId];
      return newState;
    });
  };

  // 保存整行编辑
  const saveRowEditing = async (recordId) => {
    const editData = rowEditingData[recordId];
    if (!editData) return;

    const updates = {
      date: editData.date,
      workday: editData.workday,
      totalHours: editData.totalHours,
      role: editData.role,
      isPublicHoliday: editData.isPublicHoliday,
      isSorting: editData.isSorting
    };

    await handleUpdateRecordField(recordId, updates);
    cancelRowEditing(recordId);
  };

  // 删除记录
  const handleDeleteRecord = async (recordId) => {
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showMessage('删除成功', 'success');
        await loadWageRecords();
        await loadStatistics();
      } else {
        showMessage('删除失败', 'error');
      }
    } catch (error) {
      console.error('删除失败:', error);
      showMessage('删除失败', 'error');
    }
  };

  // 更新员工角色
  const handleUpdateEmployeeRole = async (employeeId, newRole) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${region}/${employeeId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      const result = await response.json();
      
      if (response.ok) {
        showMessage('员工角色更新成功', 'success');
        await loadEmployees();
      } else {
        showMessage(result.message || '更新失败', 'error');
      }
    } catch (error) {
      console.error('更新员工角色失败:', error);
      showMessage('更新员工角色失败', 'error');
    }
    setEditingEmployeeId(null);
  };

  // 删除员工
  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!confirm(`确定要删除员工 ${employeeName} (${employeeId}) 吗？\n\n注意：如果该员工有工资记录，需要先删除工资记录才能删除员工。`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employees/${region}/${employeeId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        showMessage('员工删除成功', 'success');
        await loadEmployees();
      } else {
        showMessage(result.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除员工失败:', error);
      showMessage('删除员工失败', 'error');
    }
  };

  // 更新上传数据中的角色
  const handleUpdateUploadedRole = (index, newRole) => {
    setUploadedData(prev => 
      prev.map((item, i) => i === index ? { ...item, role: newRole } : item)
    );
  };

  // 统一的日配置选项处理函数（适用于所有日期）
  const handleDayOptionChange = (index, option) => {
    setUploadedData(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          weekendOption: option,
          isPublicHolidayRow: option === 'publicHoliday',
          isSortingRow: option === 'sorting'
        };
      })
    );
  };

  // 保留旧函数名以兼容（已废弃，统一使用 handleDayOptionChange）
  const handleToggleWeekdayPublicHoliday = (index, value) => {
    handleDayOptionChange(index, value ? 'publicHoliday' : 'regularWeekend');
  };

  const handleWeekendOptionChange = (index, option) => {
    handleDayOptionChange(index, option);
  };

  // 删除上传数据中的行
  const handleDeleteUploadedRow = (index) => {
    setUploadedData(prev => prev.filter((_, i) => i !== index));
  };

  // 导出工资数据
  const handleExport = () => {
    const dataToExport = getFilteredAndPaginatedRecords(false);
    
    if (dataToExport.length === 0) {
      showMessage('没有可导出的数据', 'error');
      return;
    }

    const exportData = dataToExport.map(record => ({
      'Region': record.region,
      '人员编号': record.employeeId,
      '姓名': record.name,
      '姓氏': record.surname || '',
      '昵称': record.nickname || '',
      '部门': record.department || '',
      '日期': new Date(record.date).toLocaleDateString('zh-CN'),
      '工作日': record.workday || '',
      '首次打卡': record.firstClockIn || '',
      '最后打卡': record.lastClockOut || '',
      '总时长': record.totalHours,
      '角色': record.role,
      '当日总时长-十进制': record.totalHoursDecimal.toFixed(2),
      '价格/每小时': record.hourlyRate.toFixed(2),
      '价格(AUD)': record.totalWage.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '工资数据');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `工资数据_${region}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    saveAs(blob, fileName);
    
    showMessage('导出成功', 'success');
  };

  // 清空上传数据
  const handleClearUploadedData = () => {
    setUploadedData([]);
    setUploadBatchId(null);
  };

  // 获取筛选和分页后的记录
  const getFilteredAndPaginatedRecords = (paginate = true) => {
    let filtered = [...wageRecords];

    // 应用搜索筛选
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 日期区间筛选
    if (searchStartDate || searchEndDate) {
      filtered = filtered.filter(r => {
        const recordDate = new Date(r.date);
        const recordDateStr = format(recordDate, 'yyyy-MM-dd');
        
        if (searchStartDate && searchEndDate) {
          return recordDateStr >= searchStartDate && recordDateStr <= searchEndDate;
        } else if (searchStartDate) {
          return recordDateStr >= searchStartDate;
        } else if (searchEndDate) {
          return recordDateStr <= searchEndDate;
        }
        return true;
      });
    }

    if (searchRole) {
      filtered = filtered.filter(r => r.role === searchRole);
    }

    if (!paginate) return filtered;

    // 应用分页
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  };

  const totalPages = Math.ceil(wageRecords.length / pageSize);
  const paginatedRecords = getFilteredAndPaginatedRecords();

  return (
    <div className="space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1 whitespace-pre-wrap break-words">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto hover:opacity-70 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                工资结算系统 - {region}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                上传员工打卡数据，自动计算工资，支持多角色和不同时薪标准
              </p>
            </div>
            <div className="flex gap-6">
              {statistics && (
                <>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">总工资</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${statistics.totalWages.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">总工时</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.totalHours.toFixed(2)}h
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">记录数</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics.totalRecords}
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={() => setShowRateSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                时薪设置
              </button>
            </div>
          </div>
        </div>

        {/* Tab导航 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              文件上传
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              员工管理
            </button>
          </div>
        </div>
      </div>

      {/* 时薪设置对话框 */}
      <Modal
        isOpen={showRateSettings}
        onClose={() => setShowRateSettings(false)}
        title="时薪标准设置"
        maxWidth="max-w-2xl"
      >
        <div className="p-6 space-y-6">
          {Object.keys(rateSettings).map(role => (
            <div key={role} className="border-b pb-4 last:border-b-0">
              <h4 className="font-medium text-gray-900 mb-3">{roleMap[role]}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">工作日时薪</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateSettings[role].workday}
                    onChange={(e) => setRateSettings(prev => ({
                      ...prev,
                      [role]: { ...prev[role], workday: parseFloat(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">分拣周末时薪</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateSettings[role].sortingWeekend}
                    onChange={(e) => setRateSettings(prev => ({
                      ...prev,
                      [role]: { ...prev[role], sortingWeekend: parseFloat(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">公共节假日时薪</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateSettings[role].publicHoliday}
                    onChange={(e) => setRateSettings(prev => ({
                      ...prev,
                      [role]: { ...prev[role], publicHoliday: parseFloat(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
          <button
            onClick={resetRateSettings}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            恢复默认
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                saveRateSettings(rateSettings);
                setShowRateSettings(false);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              保存设置
            </button>
            <button
              onClick={() => setShowRateSettings(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </Modal>

      {/* Tab内容 - 文件上传 */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* 上传控制面板 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">上传配置</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* 是否分拣开关 */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="isSorting"
                  checked={isSorting}
                  onChange={(e) => setIsSorting(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isSorting" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium text-blue-900">
                    是否分拣（影响周末时薪）
                  </span>
                  <p className="text-xs text-blue-700 mt-0.5">
                    仅影响周末，非节假日时生效
                  </p>
                </label>
              </div>
              {/* 是否公共节假日开关 */}
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  id="isPublicHoliday"
                  checked={isPublicHoliday}
                  onChange={(e) => setIsPublicHoliday(e.target.checked)}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                />
                <label htmlFor="isPublicHoliday" className="cursor-pointer flex-1">
                  <span className="text-sm font-medium text-red-900">
                    是否公共节假日（三倍工资）
                  </span>
                  <p className="text-xs text-red-700 mt-0.5">
                    优先级最高，全天按节假日时薪计算
                  </p>
                </label>
              </div>

            </div>

            {/* 文件上传按钮 */}
            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Upload className="w-5 h-5" />
                  选择文件（Excel或CSV）
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedData.length > 0 && (
                <>
                  <button
                    onClick={handleSubmitUpload}
                    disabled={isUploading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {isUploading ? '薪资计算中...' : '计算薪资'}
                  </button>
                  
                  <button
                    onClick={handleClearUploadedData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    清空
                  </button>
                </>
              )}
            </div>

            {/* 时薪说明 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">当前时薪标准</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-2 px-3 text-blue-900">分类</th>
                      <th className="text-right py-2 px-3 text-blue-900">{roleMap.worker}时薪</th>
                      <th className="text-right py-2 px-3 text-blue-900">{roleMap.forklift}时薪</th>
                      <th className="text-right py-2 px-3 text-blue-900">{roleMap.receptionist}时薪</th>
                    </tr>
                  </thead>
                  <tbody className="text-blue-800">
                    <tr className="border-b border-blue-100">
                      <td className="py-2 px-3">工作日 & 不分拣的周末</td>
                      <td className="text-right py-2 px-3">${rateSettings.worker.workday}</td>
                      <td className="text-right py-2 px-3">${rateSettings.forklift.workday}</td>
                      <td className="text-right py-2 px-3">${rateSettings.receptionist.workday}</td>
                    </tr>
                    <tr className="border-b border-blue-100">
                      <td className="py-2 px-3">分拣的周末</td>
                      <td className="text-right py-2 px-3">${rateSettings.worker.sortingWeekend}</td>
                      <td className="text-right py-2 px-3">${rateSettings.forklift.sortingWeekend}</td>
                      <td className="text-right py-2 px-3">${rateSettings.receptionist.sortingWeekend}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">公共节假日</td>
                      <td className="text-right py-2 px-3">${rateSettings.worker.publicHoliday}</td>
                      <td className="text-right py-2 px-3">${rateSettings.forklift.publicHoliday}</td>
                      <td className="text-right py-2 px-3">${rateSettings.receptionist.publicHoliday}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 上传的数据预览 */}
          {uploadedData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  数据预览 ({uploadedData.length} 条记录)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">人员编号</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">昵称</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">工作日</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">总时长</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">日配置</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadedData.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm text-gray-900">{record.employeeId}</td>
                        <td className="px-3 py-3 text-sm text-gray-900">{record.name}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{record.nickname || '-'}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{record.department}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{formatDate(record.date)}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{formatWorkday(record.workday)}</td>
                        <td className="px-3 py-3 text-sm text-gray-600">{record.totalHours}</td>
                        <td className="px-3 py-3 text-sm">
                          <select
                            value={record.role}
                            onChange={(e) => handleUpdateUploadedRole(index, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {roles.map(role => (
                              <option key={role} value={role}>{roleMap[role]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-700">
                          {/* 所有日期都显示3个选项：公共节假日、分拣、不分拣 */}
                            <div className="flex flex-col items-start gap-2">
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="radio"
                                name={`day-option-${index}`}
                                  value="publicHoliday"
                                  checked={record.weekendOption === 'publicHoliday'}
                                onChange={() => handleDayOptionChange(index, 'publicHoliday')}
                                  className="text-red-500 focus:ring-red-500"
                                />
                                <span>公共节假日</span>
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="radio"
                                name={`day-option-${index}`}
                                  value="sorting"
                                  checked={record.weekendOption === 'sorting'}
                                onChange={() => handleDayOptionChange(index, 'sorting')}
                                  className="text-blue-500 focus:ring-blue-500"
                                />
                                <span>分拣</span>
                              </label>
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="radio"
                                name={`day-option-${index}`}
                                  value="regularWeekend"
                                  checked={record.weekendOption === 'regularWeekend'}
                                onChange={() => handleDayOptionChange(index, 'regularWeekend')}
                                  className="text-gray-500 focus:ring-gray-500"
                                />
                                <span>不分拣</span>
                              </label>
                            </div>
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteUploadedRow(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 已提交的工资记录 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                工资记录 ({wageRecords.length} 条)
              </h3>
              <button
                onClick={handleExport}
                disabled={isLoadingWageRecords || wageRecords.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLoadingWageRecords || wageRecords.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Download className="w-4 h-4" />
                导出Excel
              </button>
            </div>

              {/* 搜索筛选 - 统一协调布局 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
                  {/* 人员编号搜索 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">人员编号/姓名</label>
                    <input
                      type="text"
                      placeholder="输入人员编号或姓名..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  
                  {/* 角色选择 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">角色</label>
                    <select
                      value={searchRole}
                      onChange={(e) => setSearchRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">所有角色</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{roleMap[role]}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 开始日期 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">开始日期</label>
                    <input
                      type="date"
                      value={searchStartDate}
                      onChange={(e) => setSearchStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  
                  {/* 结束日期 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">结束日期</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={searchEndDate}
                        onChange={(e) => setSearchEndDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      {(searchStartDate || searchEndDate) && (
                        <button
                          onClick={() => {
                            setSearchStartDate('');
                            setSearchEndDate('');
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          title="清除日期"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* 搜索按钮 */}
                  <button
                    onClick={loadWageRecords}
                    className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap h-[38px]"
                  >
                    <Search className="w-4 h-4" />
                    搜索
                  </button>
                </div>
              </div>

            {isLoadingWageRecords ? (
              <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p>工资记录加载中...</p>
              </div>
            ) : wageRecords.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
                <p>暂无工资记录</p>
                <p className="text-sm mt-1">上传打卡数据后将显示在此</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">人员编号</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">工作日</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">总时长</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">时薪</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">总工资</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRecords.map((record) => {
                        const isEditingDate = editingFields[record._id]?.date !== undefined;
                        const isEditingWorkday = editingFields[record._id]?.workday !== undefined;
                        const isEditingTotalHours = editingFields[record._id]?.totalHours !== undefined;
                        const isEditingRole = editingRecordId === record._id;
                        const isEditingType = editingFields[record._id]?.type !== undefined;
                        const isRowEditing = rowEditingData[record._id] !== undefined;
                        const editData = rowEditingData[record._id];
                        
                        return (
                        <tr key={record._id} className={`hover:bg-gray-50 ${isRowEditing ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-3 text-sm text-gray-900">{record.employeeId}</td>
                          <td className="px-3 py-3 text-sm text-gray-900">{record.name}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                              {isRowEditing ? (
                                <input
                                  type="date"
                                  value={editData.date || ''}
                                  onChange={(e) => {
                                    setRowEditingData(prev => ({
                                      ...prev,
                                      [record._id]: {
                                        ...prev[record._id],
                                        date: e.target.value
                                      }
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <span>{formatDate(record.date)}</span>
                              )}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                              {isRowEditing ? (
                                <input
                                  type="text"
                                  value={editData.workday || ''}
                                  onChange={(e) => {
                                    setRowEditingData(prev => ({
                                      ...prev,
                                      [record._id]: {
                                        ...prev[record._id],
                                        workday: e.target.value
                                      }
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="工作日"
                                />
                              ) : (
                                <span>{formatWorkday(record.workday)}</span>
                              )}
                          </td>
                            <td className="px-3 py-3 text-sm text-gray-600">
                              {isRowEditing ? (
                                <input
                                  type="text"
                                  value={editData.totalHours || ''}
                                  onChange={(e) => {
                                    setRowEditingData(prev => ({
                                      ...prev,
                                      [record._id]: {
                                        ...prev[record._id],
                                        totalHours: e.target.value
                                      }
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="总时长"
                                />
                              ) : (
                                <span>{record.totalHours} ({record.totalHoursDecimal.toFixed(2)}h)</span>
                              )}
                          </td>
                          <td className="px-3 py-3 text-sm">
                              {isRowEditing ? (
                                <select
                                  value={editData.role || 'worker'}
                                  onChange={(e) => {
                                    setRowEditingData(prev => ({
                                      ...prev,
                                      [record._id]: {
                                        ...prev[record._id],
                                        role: e.target.value
                                      }
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {roles.map(role => (
                                    <option key={role} value={role}>{roleMap[role]}</option>
                                  ))}
                                </select>
                             ) : (
                               <span className={`px-2 py-1 rounded text-xs font-medium ${
                                 record.role === 'worker' ? 'bg-blue-100 text-blue-800' :
                                 record.role === 'forklift' ? 'bg-purple-100 text-purple-800' :
                                 'bg-green-100 text-green-800'
                               }`}>
                                 {roleMap[record.role]}
                               </span>
                             )}
                          </td>
                          <td className="px-3 py-3 text-sm">
                              {isRowEditing ? (
                                <select
                                  value={editData.isPublicHoliday ? 'publicHoliday' : editData.isSorting ? 'sorting' : 'regular'}
                                  onChange={(e) => {
                                    const type = e.target.value;
                                    setRowEditingData(prev => ({
                                      ...prev,
                                      [record._id]: {
                                        ...prev[record._id],
                                        isPublicHoliday: type === 'publicHoliday',
                                        isSorting: type === 'sorting'
                                      }
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="regular">不分拣</option>
                                  <option value="sorting">分拣</option>
                                  <option value="publicHoliday">公共假期</option>
                                </select>
                              ) : (
                                record.isPublicHoliday ? (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    公共假期
                                  </span>
                                ) : record.isSorting ? (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    分拣
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    不分拣
                                  </span>
                                )
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-right text-gray-900 font-medium">
                            ${record.hourlyRate.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-right text-green-600 font-bold">
                            ${record.totalWage.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isRowEditing ? (
                                <>
                                  <button
                                    onClick={() => saveRowEditing(record._id)}
                                    className="text-green-600 hover:text-green-800"
                                    title="保存"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => cancelRowEditing(record._id)}
                                    className="text-gray-600 hover:text-gray-800"
                                    title="取消"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startRowEditing(record)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="编辑"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(record._id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="8" className="px-3 py-3 text-sm font-bold text-right text-gray-900">
                          当前页总计:
                        </td>
                        <td className="px-3 py-3 text-sm text-right font-bold text-green-600">
                          ${paginatedRecords.reduce((sum, r) => sum + r.totalWage, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 分页控件 */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">每页显示</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-600">条</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <span className="text-sm text-gray-600">
                        第 {currentPage} / {totalPages} 页
                      </span>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab内容 - 员工管理 */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            员工列表 ({employees.length} 人)
          </h3>

          {employees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无员工数据</p>
              <p className="text-sm mt-1">上传打卡文件后将自动创建员工档案</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">人员编号</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">昵称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {employee.employeeId}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {employee.surname} {employee.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {employee.nickname || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {employee.department || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingEmployeeId === employee.employeeId ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={tempRole}
                              onChange={(e) => setTempRole(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {roles.map(role => (
                                <option key={role} value={role}>{roleMap[role]}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUpdateEmployeeRole(employee.employeeId, tempRole)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingEmployeeId(null)}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              employee.role === 'worker' ? 'bg-blue-100 text-blue-800' :
                              employee.role === 'forklift' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {roleMap[employee.role]}
                            </span>
                            <button
                              onClick={() => {
                                setEditingEmployeeId(employee.employeeId);
                                setTempRole(employee.role);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(employee.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleDeleteEmployee(employee.employeeId, employee.name)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="删除员工"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WageSalary;
