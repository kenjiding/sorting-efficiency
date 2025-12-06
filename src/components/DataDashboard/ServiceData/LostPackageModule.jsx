import { useState, useEffect, useMemo, useRef } from 'react';
import { PackageX, Search, TrendingUp, Upload, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import FilterPanel from './FilterPanel';
import AIAnalysisModal from '../../common/AIAnalysisModal';
import { parseLostPackageExcel } from '../../../utils/serviceDataExcelUtils';
import apiClient from '../../../api/apiClient';
import { formatTimePeriod } from '../../../utils/dateUtils';
import { buildServiceDataPrompt } from '../../../utils/openaiUtils';

const LostPackageModule = () => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestUploadInfo, setLatestUploadInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  
  // 筛选状态
  const [dimension, setDimension] = useState('supplier'); // 'supplier' | 'driver'
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
    { value: 'driver', label: '司机维度' }
  ];

  // 处理文件上传
  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadStatus({
      type: 'loading',
      message: '正在解析Excel文件...'
    });

    try {
      const result = await parseLostPackageExcel(file, (progress) => {
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

      await apiClient.serviceData.uploadLostPackages(result.records);

      setUploadStatus({
        type: 'success',
        message: `成功上传 ${result.validRows} 条记录`,
        onClose: () => setUploadStatus(null)
      });

      // 重新加载数据
      loadData();
      loadLatestUploadInfo();
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
      const data = await apiClient.serviceData.getLostPackagesLatest();
      setLatestUploadInfo(data);
    } catch (error) {
      console.error('加载最新上传信息失败:', error);
    }
  };

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.serviceData.getLostPackages({
        dimension,
        timeUnit,
        startDate: timeRange.start,
        endDate: timeRange.end
      });
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
    loadLatestUploadInfo();
  }, [dimension, timeUnit, timeRange]);

  // 处理表格数据
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => {
      if (dimension === 'supplier') {
        return {
          finishTime: item.finishTime || '',
          timePeriod: item.timePeriod || '', // 保留timePeriod用于格式化显示
          supplier: item.supplier || '',
          count: item.count || 0,
          driverName: item.driverName || '',
          type: item.type || ''
        };
      } else {
        return {
          finishTime: item.finishTime || '',
          timePeriod: item.timePeriod || '', // 保留timePeriod用于格式化显示
          driverName: item.driverName || '',
          supplier: item.supplier || '',
          count: item.count || 0,
          type: item.type || ''
        };
      }
    });
  }, [data, dimension]);

  // 柱状图数据（天维度使用）
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || timeUnit !== 'day') return [];
    
    // 按维度聚合（天维度只显示总量）
    const dimensionMap = new Map();
    data.forEach(item => {
      const key = dimension === 'supplier' ? item.supplier : item.driverName;
      const dimensionKey = key || '未知';
      if (!dimensionMap.has(dimensionKey)) {
        dimensionMap.set(dimensionKey, 0);
      }
      dimensionMap.set(dimensionKey, dimensionMap.get(dimensionKey) + item.count);
    });
    
    return Array.from(dimensionMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, dimension, timeUnit]);

  // 折线图趋势数据（天/周/月维度）
  const trendChartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // 获取所有时间周期
    const timePeriods = [...new Set(data.map(item => item.timePeriod))].sort();
    
    // 获取所有维度值（供应商/司机）
    const dimensionValues = [...new Set(
      data.map(item => {
        const key = dimension === 'supplier' ? item.supplier : item.driverName;
        return key || '未知';
      })
    )].slice(0, 10); // 只取前10个维度值
    
    // 构建趋势数据
    const trendData = timePeriods.map(timePeriod => {
      const dataPoint = {
        timePeriod: timePeriod,
        name: timeUnit === 'week' ? `第${timePeriod}` : timeUnit === 'month' ? timePeriod : timePeriod
      };
      
      // 为每个维度值添加数据
      dimensionValues.forEach(dimValue => {
        const matchingItem = data.find(item => {
          const key = dimension === 'supplier' ? item.supplier : item.driverName;
          return item.timePeriod === timePeriod && (key || '未知') === dimValue;
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

  // 处理AI分析
  const handleAIAnalysis = () => {
    if (data.length === 0) {
      alert('请先加载数据');
      return;
    }

    const prompt = buildServiceDataPrompt(data, dimension, timeUnit, timeRange, 'lost');
    setAIPrompt(prompt);
    setShowAIModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 文件上传 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-md font-semibold text-gray-900">上传丢包文件</h4>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
        accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileUpload(file);
                }
                e.target.value = '';
              }}
              className="hidden"
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? '上传中...' : '选择文件'}
            </button>
        {latestUploadInfo && latestUploadInfo.latestUploadDate && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">最新数据：</span>
              <span className="text-sm text-blue-700">
                {new Date(latestUploadInfo.latestUploadDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="text-sm font-semibold text-blue-600">
                ({latestUploadInfo.recordCount} 条)
              </span>
            </div>
            )}
          </div>
        </div>
        {uploadStatus && (
          <div className={`mt-4 flex items-center gap-2 ${
            uploadStatus.type === 'success' ? 'text-green-600' : 
            uploadStatus.type === 'error' ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5" />}
            <span className="text-sm">{uploadStatus.message}</span>
            <button
              onClick={() => setUploadStatus(null)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 筛选面板 */}
      <FilterPanel
        dimension={dimension}
        onDimensionChange={setDimension}
        dimensions={dimensions}
        timeUnit={timeUnit}
        onTimeUnitChange={setTimeUnit}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
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
          {/* 折线趋势图（周/月维度） */}
          {trendChartData && trendChartData.data && trendChartData.data.length > 0 && timeUnit !== 'day' && (
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

          {/* 折线趋势图（天维度 - 每天对各个维度值的趋势） */}
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
                        const key = dimension === 'supplier' ? item.supplier : item.driverName;
                        return key || '未知';
                      })
                    )].slice(0, 10); // 只取前10个
                    
                    // 构建数据映射：日期 + 维度值 -> count
                    const dataMap = new Map();
                    data.forEach(item => {
                      const date = item.timePeriod || (item.finishTime ? item.finishTime.split('T')[0] : '');
                      if (!date) return;
                      
                      const key = dimension === 'supplier' ? item.supplier : item.driverName;
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
                        const key = dimension === 'supplier' ? item.supplier : item.driverName;
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

          {/* 柱状图（天维度） */}
          {chartData.length > 0 && timeUnit === 'day' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
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
                  <Bar dataKey="value" fill="#EF4444" name="丢包数量" />
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">完结时间</th>
                      {dimension === 'supplier' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计数量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                        </>
                      )}
                      {dimension === 'driver' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">司机姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计数量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => {
                      // 格式化时间显示：周/月维度使用timePeriod，天维度使用finishTime
                      const timeDisplay = timeUnit !== 'day' && row.timePeriod 
                        ? formatTimePeriod(row.timePeriod, timeUnit)
                        : row.finishTime;
                      return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm text-gray-900">{timeDisplay}</td>
                        {dimension === 'supplier' && (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.supplier}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.driverName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.type}</td>
                          </>
                        )}
                        {dimension === 'driver' && (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.driverName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.supplier}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.type}</td>
                          </>
                        )}
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
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
        title="丢包分析AI分析"
      />
    </div>
  );
};

export default LostPackageModule;

