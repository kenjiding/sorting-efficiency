import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Search, TrendingUp, Calendar, Filter, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import FileUpload from './FileUpload';
import FilterPanel from './FilterPanel';
import { parseComplaintExcel } from '../../../utils/serviceDataExcelUtils';
import apiClient from '../../../api/apiClient';
import useStore from '../../../store/useStore';
import { getWeekRange } from '../../../utils/dateUtils';

const ComplaintModule = () => {
  const { selectedRegion } = useStore();
  const region = selectedRegion || 'SYD';
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 筛选状态
  const [dimension, setDimension] = useState('supplier'); // 'supplier' | 'driver' | 'routeCode'
  const [timeUnit, setTimeUnit] = useState('day'); // 'day' | 'week' | 'month'
  const [timeRange, setTimeRange] = useState(() => {
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return {
      start: twoWeeksAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });

  const dimensions = [
    { value: 'supplier', label: '供应商维度' },
    { value: 'driver', label: '司机维度' },
    { value: 'routeCode', label: '路由码维度' }
  ];

  // 使用统一的日期工具函数处理澳洲时区

  // 生成多个对比周期（周单位）
  const generateWeekPeriods = (weeks) => {
    const periods = [];
    const startIndex = 1; // 从上周开始
    const endIndex = startIndex + weeks;
    
    for (let i = startIndex; i < endIndex; i++) {
      const baseWeekIndex = i;
      const compareWeekIndex = i + 1;
      let label;
      if (i === 1) {
        label = '上周';
      } else if (i === 2) {
        label = '上上周';
      } else {
        label = `${i}周前`;
      }
      
      periods.push({
        baseRange: getWeekRange(baseWeekIndex, region),
        compareRange: getWeekRange(compareWeekIndex, region),
        label
      });
    }
    return periods;
  };

  // 处理文件上传
  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadStatus({
      type: 'loading',
      message: '正在解析Excel文件...'
    });

    try {
      const result = await parseComplaintExcel(file, (progress) => {
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

      // 上传到服务器
      setUploadStatus({
        type: 'loading',
        message: '正在上传数据...'
      });

      await apiClient.serviceData.uploadComplaints(result.records);

      setUploadStatus({
        type: 'success',
        message: `成功上传 ${result.validRows} 条记录`,
        onClose: () => setUploadStatus(null)
      });

      // 重新加载数据
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

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (timeUnit === 'week') {
        // 周维度：获取近4周的数据
        const periods = generateWeekPeriods(4);
        const allDates = [];
        periods.forEach(period => {
          allDates.push(period.baseRange.start, period.baseRange.end, period.compareRange.start, period.compareRange.end);
        });
        startDate = new Date(Math.min(...allDates.map(d => new Date(d)))).toISOString().split('T')[0];
        endDate = new Date(Math.max(...allDates.map(d => new Date(d)))).toISOString().split('T')[0];
      } else if (timeUnit === 'month') {
        // 月维度：获取近3个月的数据
        const today = new Date();
        endDate = today.toISOString().split('T')[0];
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
      } else {
        // 天维度：使用timeRange
        startDate = timeRange.start;
        endDate = timeRange.end;
      }

      const response = await apiClient.serviceData.getComplaints({
        dimension,
        timeUnit,
        startDate,
        endDate
      });
      
      // 调试日志
      console.log('获取到的客诉数据:', response);
      console.log('数据条数:', response?.length || 0);
      if (response && response.length > 0) {
        console.log('第一条数据示例:', response[0]);
      }
      
      setData(response || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dimension, timeUnit, timeRange]);

  // 处理表格数据（按维度聚合）
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // 按维度分组并计算累计数量
    const groupedData = new Map();
    
    data.forEach(item => {
      let key;
      if (dimension === 'supplier') {
        key = (item.supplier && item.supplier.trim()) || '未知供应商';
      } else if (dimension === 'driver') {
        key = (item.driverName && item.driverName.trim()) || '未知司机';
      } else {
        key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          key,
          createTime: item.createTime || item.timePeriod || '',
          supplier: item.supplier || '',
          driverName: item.driverName || '',
          routeCode: item.routeCode || '',
          count: 0
        });
      }
      
      const group = groupedData.get(key);
      group.count += item.count || 0;
      // 保留最新的时间
      if (item.createTime && (!group.createTime || item.createTime > group.createTime)) {
        group.createTime = item.createTime;
      }
    });
    
    return Array.from(groupedData.values()).sort((a, b) => b.count - a.count);
  }, [data, dimension]);

  // 柱状图数据（天维度使用）
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || timeUnit !== 'day') return [];
    
    // 按维度聚合（天维度只显示总量）
      return tableData.slice(0, 10).map(item => ({
        name: item.key || '未知',
        value: item.count || 0
      }));
  }, [data, timeUnit, tableData]);

  // 折线图趋势数据（天/周/月维度）
  const trendChartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // 获取所有时间周期
    const timePeriods = [...new Set(data.map(item => item.timePeriod))].sort();
    
    // 获取所有维度值（供应商/司机/路由码）
    const dimensionValues = [...new Set(
      data.map(item => {
        let key;
        if (dimension === 'supplier') {
          key = (item.supplier && item.supplier.trim()) || '未知供应商';
        } else if (dimension === 'driver') {
          key = (item.driverName && item.driverName.trim()) || '未知司机';
        } else {
          key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
        }
        return key;
      })
    )].slice(0, 10); // 只取前10个维度值
    
    // 构建趋势数据
    const trendData = timePeriods.map(timePeriod => {
      let displayName = timePeriod;
      if (timeUnit === 'week') {
        // 周维度：显示为 "10/27周" 格式
        const dateParts = timePeriod.split('-');
        if (dateParts.length === 3) {
          displayName = `${dateParts[1]}/${dateParts[2]}周`;
        } else {
          displayName = timePeriod;
        }
      } else if (timeUnit === 'month') {
        // 月维度：保持 YYYY-MM 格式
        displayName = timePeriod;
      }
      
      const dataPoint = {
        timePeriod: timePeriod,
        name: displayName
      };
      
      // 为每个维度值添加数据
      dimensionValues.forEach(dimValue => {
        const matchingItem = data.find(item => {
          let key;
          if (dimension === 'supplier') {
            key = (item.supplier && item.supplier.trim()) || '未知供应商';
          } else if (dimension === 'driver') {
            key = (item.driverName && item.driverName.trim()) || '未知司机';
          } else {
            key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
          }
          return item.timePeriod === timePeriod && key === dimValue;
        });
        dataPoint[dimValue] = matchingItem ? matchingItem.count : 0;
      });
      
      return dataPoint;
    });
    
    return {
      data: trendData,
      dimensionValues: dimensionValues
    };
  }, [data, dimension, timeUnit]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

  // 格式化日期显示
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateRange = (range) => {
    if (!range || !range.start || !range.end) return '';
    return `${formatDate(range.start)} - ${formatDate(range.end)}`;
  };

  return (
    <div className="space-y-6">
      {/* 文件上传 */}
      <FileUpload
        title="上传客诉明细文件"
        accept=".xlsx,.xls"
        onFileUpload={handleFileUpload}
        uploadStatus={uploadStatus}
        uploading={uploading}
      />

      {/* 筛选面板 */}
      <FilterPanel
        dimension={dimension}
        onDimensionChange={setDimension}
        dimensions={dimensions}
        timeUnit={timeUnit}
        onTimeUnitChange={setTimeUnit}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* 数据展示 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">正在加载数据...</p>
        </div>
      ) : (
        <>
          {/* 折线趋势图（周/月维度 - 多维度值趋势） */}
          {trendChartData && trendChartData.data && trendChartData.data.length > 0 && timeUnit !== 'day' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
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

          {/* 折线趋势图（天维度 - 每天对各个维度值的趋势） */}
          {timeUnit === 'day' && data.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
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
                        let key;
                        if (dimension === 'supplier') {
                          key = (item.supplier && item.supplier.trim()) || '未知供应商';
                        } else if (dimension === 'driver') {
                          key = (item.driverName && item.driverName.trim()) || '未知司机';
                        } else {
                          key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
                        }
                        return key;
                      })
                    )].slice(0, 10); // 只取前10个
                    
                    // 构建数据映射：日期 + 维度值 -> count
                    const dataMap = new Map();
                    data.forEach(item => {
                      const date = item.timePeriod || (item.createTime ? item.createTime.split('T')[0] : '');
                      if (!date) return;
                      
                      let key;
                      if (dimension === 'supplier') {
                        key = (item.supplier && item.supplier.trim()) || '未知供应商';
                      } else if (dimension === 'driver') {
                        key = (item.driverName && item.driverName.trim()) || '未知司机';
                      } else {
                        key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
                      }
                      const dimKey = key;
                      
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
                        let key;
                        if (dimension === 'supplier') {
                          key = (item.supplier && item.supplier.trim()) || '未知供应商';
                        } else if (dimension === 'driver') {
                          key = (item.driverName && item.driverName.trim()) || '未知司机';
                        } else {
                          key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
                        }
                        return key;
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

          {/* 柱状图（天维度） */}
          {chartData.length > 0 && timeUnit === 'day' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
                {dimensions.find(d => d.value === dimension)?.label}统计
              </h4>
              <ResponsiveContainer width="100%" height={400}>
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
                    <Bar dataKey="value" fill="#8B5CF6" name="客诉数量" />
                  </BarChart>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工单创建时间</th>
                      {dimension === 'supplier' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商名称</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计数量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">路由码</th>
                        </>
                      )}
                      {dimension === 'driver' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计数量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">路由码</th>
                        </>
                      )}
                      {dimension === 'routeCode' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">路由码</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计数量</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.createTime || '-'}</td>
                        {dimension === 'supplier' && (
                          <>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.supplier || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.driverName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.routeCode || '-'}</td>
                          </>
                        )}
                        {dimension === 'driver' && (
                          <>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.driverName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.supplier || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.routeCode || '-'}</td>
                          </>
                        )}
                        {dimension === 'routeCode' && (
                          <>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.routeCode || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.driverName || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.supplier || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count || 0}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ComplaintModule;
