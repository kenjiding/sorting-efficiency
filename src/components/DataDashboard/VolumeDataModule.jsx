import { useState, useEffect, useRef } from 'react';
import { BarChart3, Calendar, Search } from 'lucide-react';
import InboundExcelUpload from './InboundExcelUpload';
import SupplierRouteManager from './SupplierRouteManager';
import VolumeDataDisplay from './VolumeDataDisplay';
import apiClient from '../../api/apiClient';
import useStore from '../../store/useStore';
import { getThisWeekRange, getWeekRange } from '../../utils/dateUtils';

const VolumeDataModule = () => {
  const { selectedRegion } = useStore();
  const region = selectedRegion || 'SYD';

  // 生成多个对比周期
  // 所有选项都从上周开始，不包含本周
  // 近2周 = 上周 vs 上上周（1个对比周期）
  // 近4周 = 上周 vs 上上周，上上周 vs 上上上周，上上上周 vs 上上上上周，上上上上周 vs 上上上上上周（4个对比周期）
  const generateComparisonPeriods = (weeks) => {
    const periods = [];
    // 所有选项都从上周（index=1）开始
    const startIndex = 1;
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

  const [quickFilter, setQuickFilter] = useState(4); // 默认选择近4周
  const [comparisonPeriods, setComparisonPeriods] = useState([]); // 多个对比周期的数据
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const loadingRef = useRef(false); // 用于防止重复请求
  const mountedRef = useRef(false); // 用于标记组件是否已挂载

  // 加载快捷筛选的数据
  const loadQuickFilterData = async (weeks = null) => {
    const targetWeeks = weeks || quickFilter;
    if (!targetWeeks) return;
    
    // 防止重复请求：如果正在加载，直接返回
    if (loadingRef.current) {
      console.log('请求已在进行中，跳过重复请求');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const weeksNum = parseInt(targetWeeks);
      const periods = generateComparisonPeriods(weeksNum);
      
      console.log(`开始加载 ${weeksNum} 周数据，共 ${periods.length} 个对比周期，${periods.length * 2} 个请求`);
      
      // 并行加载所有周期的数据
      const periodDataPromises = periods.map(async (period) => {
        const [baseResult, compareResult] = await Promise.all([
          apiClient.inboundData.getAggregate({
            startDate: period.baseRange.start,
            endDate: period.baseRange.end
          }),
          apiClient.inboundData.getAggregate({
            startDate: period.compareRange.start,
            endDate: period.compareRange.end
          })
        ]);
        return {
          ...period,
          baseData: baseResult,
          compareData: compareResult
        };
      });

      const periodData = await Promise.all(periodDataPromises);
      setComparisonPeriods(periodData);
      console.log(`数据加载完成，共 ${periodData.length} 个对比周期`);
    } catch (error) {
      console.error('加载快捷筛选数据失败:', error);
      // 错误已在 apiClient 中处理，这里只记录日志
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // 处理快捷筛选切换
  const handleQuickFilterChange = (weeks) => {
    if (quickFilter === weeks) return; // 如果选择相同，不重复加载
    setQuickFilter(weeks);
    loadQuickFilterData(weeks);
  };

  // 只在组件首次挂载时加载数据
  useEffect(() => {
    if (!mountedRef.current && quickFilter) {
      mountedRef.current = true;
      loadQuickFilterData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  const handleUploadSuccess = () => {
    // 上传成功后重新加载数据
    if (quickFilter) {
      loadQuickFilterData();
    }
  };

  return (
    <div className="space-y-6">
      {/* 模块标题 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
                货量数据
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                到件扫描记录统计与分析
              </p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {showSettings ? '隐藏设置' : '管理设置'}
            </button>
          </div>
        </div>
      </div>

      {/* 设置面板（供应商和路由管理） */}
      {showSettings && (
        <SupplierRouteManager />
      )}

      {/* Excel上传 */}
      <InboundExcelUpload onUploadSuccess={handleUploadSuccess} />

      {/* 快捷选择器 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4 mr-2 text-primary-600" />
              选择对比周期：
            </label>
            <div className="flex flex-wrap gap-2">
              {[2, 4, 6, 8].map((weeks) => (
                <button
                  key={weeks}
                  onClick={() => handleQuickFilterChange(weeks)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    quickFilter === weeks
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-primary-300'
                  }`}
                >
                  近{weeks}周
                </button>
              ))}
            </div>
            {quickFilter && (
              <p className="mt-2 text-xs text-gray-500">
                将显示 {quickFilter} 个对比周期：本周 vs 上周，上周 vs 上上周...
              </p>
            )}
          </div>
          <button
            onClick={loadQuickFilterData}
            disabled={loading}
            className="ml-4 inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {/* 数据展示 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">正在加载数据...</p>
        </div>
      ) : (
        <VolumeDataDisplay
          comparisonPeriods={comparisonPeriods}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </div>
  );
};

export default VolumeDataModule;

