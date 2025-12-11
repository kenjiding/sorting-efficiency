import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Search, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Upload, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import FileUpload from './FileUpload';
import FilterPanel from './FilterPanel';
import AIAnalysisModal from '../../common/AIAnalysisModal';
import { parseProblemItemExcel } from '../../../utils/serviceDataExcelUtils';
import apiClient from '../../../api/apiClient';
import { formatTimePeriod } from '../../../utils/dateUtils';
import { buildServiceDataPrompt } from '../../../utils/openaiUtils';
import { useToken } from '../../../contexts/TokenContext';

const ProblemItemModule = () => {
  const { token } = useToken(); // 获取全局 token
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestUploadInfo, setLatestUploadInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  
  // 表格显示控制
  const [displayLimit, setDisplayLimit] = useState(20); // 初始显示20条
  const INITIAL_DISPLAY_COUNT = 20; // 初始显示数量
  const LOAD_MORE_COUNT = 20; // 每次加载更多时增加的数量
  
  // 排序状态
  const [sortField, setSortField] = useState(null); // 'registerTime' | 'count' | null
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  
  // 筛选状态
  const [dimension, setDimension] = useState('supplier'); // 'supplier' | 'driver' | 'reason'
  const [timeUnit, setTimeUnit] = useState('day'); // 'day' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7天（包括今天）
    return {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });

  const dimensions = [
    { value: 'supplier', label: '供应商维度' },
    { value: 'driver', label: '司机维度' },
    { value: 'reason', label: '问题件原因维度' }
  ];

  // 处理文件上传
  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadStatus({
      type: 'loading',
      message: '正在解析Excel文件...'
    });

    try {
      const result = await parseProblemItemExcel(file, (progress) => {
        setUploadStatus({
          type: 'loading',
          message: `正在解析Excel文件... ${progress}%`
        });
      });

      if (result.records.length === 0) {
        setUploadStatus({
          type: 'error',
          message: '没有找到有效的数据记录',
          onClose: () => setUploadStatus(null)
        });
        setUploading(false);
        return;
      }

      // 上传到服务器（后端会自动匹配路由码）
      setUploadStatus({
        type: 'loading',
        message: '正在上传数据并匹配路由码...'
      });

      await apiClient.serviceData.uploadProblemItems(result.records);

      setUploadStatus({
        type: 'success',
        message: `成功上传 ${result.validRows} 条记录（注意：当前页面显示的是外部接口数据）`,
        onClose: () => setUploadStatus(null)
      });

      // 重新加载数据（从外部接口）
      loadData();
    } catch (error) {
      console.error('文件上传失败:', error);
      setUploadStatus({
        type: 'error',
        message: `上传失败: ${error.message}`,
        onClose: () => setUploadStatus(null)
      });
    } finally {
      setUploading(false);
    }
  };

  // 加载最新上传数据信息
  const loadLatestUploadInfo = async () => {
    try {
      const data = await apiClient.serviceData.getProblemItemsLatest();
      setLatestUploadInfo(data);
    } catch (error) {
      console.error('加载最新上传信息失败:', error);
    }
  };


  // 加载数据 - 从MongoDB获取
  const loadData = async () => {
    setLoading(true);
    try {
      console.log(`🔍 从MongoDB加载问题件数据...`);
      
      const startTime = performance.now();
      
      // 调用后端MongoDB聚合接口
      const result = await apiClient.serviceData.getProblemItems({
        dimension,
        timeUnit,
        startDate: timeRange.start,
        endDate: timeRange.end
      });
      
      const requestTime = performance.now() - startTime;
      console.log(`⏱️ MongoDB查询响应时间: ${requestTime.toFixed(0)}ms`);
      console.log(`✅ 获取到聚合数据: ${result.length} 条`);
      
      setData(result);
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      setData([]);
      
      // 如果是没有数据的错误，给出友好提示
      if (error.message.includes('请提供开始日期和结束日期')) {
        alert('请先设置时间范围');
      }
    } finally {
      setLoading(false);
    }
  };

  // 注意：现在数据由后端聚合，不再需要前端聚合函数

  useEffect(() => {
    loadData();
    // 重置显示数量当筛选条件改变时
    setDisplayLimit(INITIAL_DISPLAY_COUNT);
    // 重置排序状态
    setSortField(null);
    setSortDirection('asc');
  }, [dimension, timeUnit, timeRange]);
  
  // 处理排序
  const handleSort = (field) => {
    if (sortField === field) {
      // 如果点击的是当前排序字段，切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新字段，设置为升序
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 获取排序图标
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary-600" />
      : <ArrowDown className="h-4 w-4 ml-1 text-primary-600" />;
  };

  // 处理"查看更多"
  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + LOAD_MORE_COUNT);
  };

  // 处理"显示全部"
  const handleShowAll = () => {
    setDisplayLimit(tableData.length);
  };

  // 处理表格数据
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
      let processedData = data.map(item => {
      const row = {
        registerTime: item.registerTime || '',
        timePeriod: item.timePeriod || '', // 保留timePeriod用于格式化显示
        supplier: item.supplier || '',
        driverName: item.driverName || '',
        reason: item.reason || '',
        count: item.count || 0
      };

      // 根据维度调整字段顺序
      if (dimension === 'supplier') {
        return {
          registerTime: row.registerTime,
          timePeriod: row.timePeriod, // 保留timePeriod用于格式化显示
          supplier: row.supplier,
          count: row.count,
          driverName: row.driverName,
          reason: row.reason
        };
      } else if (dimension === 'driver') {
        return {
          registerTime: row.registerTime,
          timePeriod: row.timePeriod, // 保留timePeriod用于格式化显示
          driverName: row.driverName,
          supplier: row.supplier,
          count: row.count,
          reason: row.reason
        };
      } else {
        return {
          registerTime: row.registerTime,
          timePeriod: row.timePeriod, // 保留timePeriod用于格式化显示
          reason: row.reason,
          count: row.count,
          supplier: row.supplier,
          driverName: row.driverName
        };
      }
    });
    
    // 应用排序
    if (sortField) {
      processedData.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // 处理登记时间的排序（字符串日期）
        if (sortField === 'registerTime') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }
        
        // 处理累计数量的排序（数字）
        if (sortField === 'count') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }
    
    return processedData;
  }, [data, dimension, sortField, sortDirection]);

  // 柱状图/饼图数据（天维度使用）
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || timeUnit !== 'day') return [];
    
    // 按维度聚合（天维度只显示总量）
    const dimensionMap = new Map();
    data.forEach(item => {
      const key = dimension === 'supplier' ? item.supplier :
                  dimension === 'driver' ? item.driverName :
                  item.reason;
      const dimensionKey = key || '未知';
      if (!dimensionMap.has(dimensionKey)) {
        dimensionMap.set(dimensionKey, 0);
      }
      dimensionMap.set(dimensionKey, dimensionMap.get(dimensionKey) + item.count);
    });
    
    return Array.from(dimensionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // 取前10名
  }, [data, dimension, timeUnit]);

  // 折线图趋势数据（天/周/月维度）
  const trendChartData = useMemo(() => {
    if (!data || data.length === 0 || timeUnit === 'day') return [];
    
    // 获取所有时间周期
    const timePeriods = [...new Set(data.map(item => item.timePeriod))].sort();
    
    // 获取所有维度值（供应商/司机/原因）
    const dimensionValues = [...new Set(
      data.map(item => {
        const key = dimension === 'supplier' ? item.supplier :
                    dimension === 'driver' ? item.driverName :
                    item.reason;
        return key || '未知';
      })
    )];
    
    // 只取前10个维度值（避免图表过于复杂）
    const topDimensionValues = dimensionValues.slice(0, 10);
    
    // 构建趋势数据：每个时间周期一个对象，每个维度值一个属性
    const trendData = timePeriods.map(timePeriod => {
      const dataPoint = {
        timePeriod: timePeriod,
        // 格式化显示时间
        name: timeUnit === 'week' ? `第${timePeriod}` : timeUnit === 'month' ? timePeriod : timePeriod
      };
      
      // 为每个维度值添加数据
      topDimensionValues.forEach(dimValue => {
        const matchingItem = data.find(item => {
          const key = dimension === 'supplier' ? item.supplier :
                      dimension === 'driver' ? item.driverName :
                      item.reason;
          return item.timePeriod === timePeriod && (key || '未知') === dimValue;
        });
        dataPoint[dimValue] = matchingItem ? matchingItem.count : 0;
      });
      
      return dataPoint;
    });
    
    return {
      data: trendData,
      dimensionValues: topDimensionValues
    };
  }, [data, dimension, timeUnit]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

  // 处理AI分析
  const handleAIAnalysis = () => {
    if (data.length === 0) {
      alert('请先加载数据');
      return;
    }

    const prompt = buildServiceDataPrompt(data, dimension, timeUnit, timeRange, 'problem');
    setAIPrompt(prompt);
    setShowAIModal(true);
  };

  return (
    <div className="space-y-6">

      {/* 筛选面板 */}
      <FilterPanel
        dimension={dimension}
        onDimensionChange={setDimension}
        dimensions={dimensions}
        timeUnit={timeUnit}
        onTimeUnitChange={setTimeUnit}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        timeRangeHint=""
        aiAnalysisButton={
          <button
            onClick={handleAIAnalysis}
            disabled={loading || data.length === 0}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI分析
          </button>
        }
      />

      {/* 数据展示 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">正在加载数据...</p>
        </div>
      ) : (
        <>
          {/* 图表展示 */}
          {/* 折线趋势图（周/月维度） */}
          {trendChartData.data && trendChartData.data.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                {dimensions.find(d => d.value === dimension)?.label}趋势分析（{timeUnit === 'week' ? '周' : '月'}维度）
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendChartData.data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="timePeriod" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {trendChartData.dimensionValues.map((dimValue, index) => (
                    <Line
                      key={dimValue}
                      type="monotone"
                      dataKey={dimValue}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      name={dimValue}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 柱状图和饼图（天维度） */}
          {chartData.length > 0 && timeUnit === 'day' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 柱状图 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                  {dimensions.find(d => d.value === dimension)?.label}统计
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6B7280"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      tick={{ fill: '#6B7280' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#3B82F6" name="数量" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 饼图 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-primary-600" />
                  {dimensions.find(d => d.value === dimension)?.label}占比
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 折线趋势图（天维度 - 每天对各个供应商的趋势） */}
          {timeUnit === 'day' && data.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                {dimensions.find(d => d.value === dimension)?.label}趋势分析（天维度）
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart 
                  data={(() => {
                    // 生成完整的时间区间内的所有日期
                    const generateDateRange = (startDate, endDate) => {
                      const dates = [];
                      const start = new Date(startDate);
                      const end = new Date(endDate);
                      const current = new Date(start);
                      
                      while (current <= end) {
                        dates.push(current.toISOString().split('T')[0]);
                        current.setDate(current.getDate() + 1);
                      }
                      return dates;
                    };
                    
                    // 生成从start到end的所有日期
                    const allDates = generateDateRange(timeRange.start, timeRange.end);
                    
                    // 获取所有维度值（从实际数据中提取）
                    const dimensionValues = [...new Set(
                      data.map(item => {
                        const key = dimension === 'supplier' ? item.supplier :
                                    dimension === 'driver' ? item.driverName :
                                    item.reason;
                        return key || '未知';
                      })
                    )].slice(0, 10); // 只取前10个
                    
                    // 构建数据映射：日期 + 维度值 -> count
                    const dataMap = new Map();
                    data.forEach(item => {
                      const date = item.timePeriod || (item.registerTime ? item.registerTime.split('T')[0] : '');
                      if (!date) return;
                      
                      const key = dimension === 'supplier' ? item.supplier :
                                  dimension === 'driver' ? item.driverName :
                                  item.reason;
                      const dimKey = key || '未知';
                      
                      const mapKey = `${date}_${dimKey}`;
                      if (!dataMap.has(mapKey)) {
                        dataMap.set(mapKey, 0);
                      }
                      dataMap.set(mapKey, dataMap.get(mapKey) + (item.count || 0));
                    });
                    
                    // 构建趋势数据：为每个日期创建数据点
                    return allDates.map(date => {
                      const dataPoint = { 
                        timePeriod: date, 
                        name: date.substring(5) // 只显示月-日，更简洁
                      };
                      
                      dimensionValues.forEach(dimValue => {
                        const mapKey = `${date}_${dimValue}`;
                        dataPoint[dimValue] = dataMap.get(mapKey) || 0;
                      });
                      
                      return dataPoint;
                    });
                  })()} 
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="timePeriod" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.floor((timeRange.end && timeRange.start ? 
                      Math.ceil((new Date(timeRange.end) - new Date(timeRange.start)) / (1000 * 60 * 60 * 24)) : 30) / 10)}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {(() => {
                    const dimensionValues = [...new Set(
                      data.map(item => {
                        const key = dimension === 'supplier' ? item.supplier :
                                    dimension === 'driver' ? item.driverName :
                                    item.reason;
                        return key || '未知';
                      })
                    )].slice(0, 10);
                    return dimensionValues.map((dimValue, index) => (
                      <Line
                        key={dimValue}
                        type="monotone"
                        dataKey={dimValue}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        name={dimValue}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ));
                  })()}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 数据表格 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="h-5 w-5 mr-2 text-primary-600" />
              详细数据
            </h4>
            {tableData.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('registerTime')}
                        >
                          <span className="flex items-center">
                            登记时间
                            {getSortIcon('registerTime')}
                          </span>
                        </th>
                        {dimension === 'supplier' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('count')}
                            >
                              <span className="flex items-center">
                                累计数量
                                {getSortIcon('count')}
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">问题件原因</th>
                          </>
                        )}
                        {dimension === 'driver' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('count')}
                            >
                              <span className="flex items-center">
                                累计数量
                                {getSortIcon('count')}
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">问题件原因</th>
                          </>
                        )}
                        {dimension === 'reason' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">问题件原因</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleSort('count')}
                            >
                              <span className="flex items-center">
                                累计数量
                                {getSortIcon('count')}
                              </span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.slice(0, displayLimit).map((row, index) => {
                        // 格式化时间显示：周/月维度使用timePeriod，天维度使用registerTime
                        const timeDisplay = timeUnit !== 'day' && row.timePeriod 
                          ? formatTimePeriod(row.timePeriod, timeUnit)
                          : row.registerTime;
                        return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-900">{timeDisplay}</td>
                          {dimension === 'supplier' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.supplier}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.driverName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.reason}</td>
                            </>
                          )}
                          {dimension === 'driver' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.driverName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.supplier}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.reason}</td>
                            </>
                          )}
                          {dimension === 'reason' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.reason}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.supplier}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.driverName}</td>
                            </>
                          )}
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* 查看更多按钮 */}
                {tableData.length > displayLimit && (
                  <div className="mt-4 flex items-center justify-center space-x-4 border-t border-gray-200 pt-4">
                    <span className="text-sm text-gray-600">
                      显示 {Math.min(displayLimit, tableData.length)} / {tableData.length} 条记录
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleLoadMore}
                        className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        查看更多 ({Math.min(LOAD_MORE_COUNT, tableData.length - displayLimit)}条)
                      </button>
                      <button
                        onClick={handleShowAll}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        显示全部
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 已显示全部时的提示 */}
                {tableData.length <= displayLimit && tableData.length > 0 && (
                  <div className="mt-4 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
                    已显示全部 {tableData.length} 条记录
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>
        </>
      )}

      {/* AI分析模态框 */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        prompt={aiPrompt}
        title="问题件数量分析AI分析"
      />
    </div>
  );
};

export default ProblemItemModule;

