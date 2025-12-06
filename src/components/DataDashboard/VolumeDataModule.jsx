import { useState, useEffect, useRef } from 'react';
import { BarChart3, Calendar, Search, Table, Sparkles } from 'lucide-react';
import InboundExcelUpload from './InboundExcelUpload';
import SupplierRouteManager from './SupplierRouteManager';
import VolumeDataDisplay from './VolumeDataDisplay';
import AIAnalysisModal from '../common/AIAnalysisModal';
import apiClient from '../../api/apiClient';
import useStore from '../../store/useStore';
import { getThisWeekRange, getWeekRange } from '../../utils/dateUtils';
import { buildVolumeDataPrompt } from '../../utils/openaiUtils';

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
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');

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

  // 处理AI分析
  const handleAIAnalysis = () => {
    if (comparisonPeriods.length === 0) {
      alert('请先加载数据');
      return;
    }

    // 计算汇总统计
    const totalBase = comparisonPeriods.reduce((sum, p) => {
      const baseTotal = Array.isArray(p.baseData) 
        ? p.baseData.reduce((s, d) => s + (d.total || 0), 0)
        : 0;
      return sum + baseTotal;
    }, 0);
    const totalCompare = comparisonPeriods.reduce((sum, p) => {
      const compareTotal = Array.isArray(p.compareData) 
        ? p.compareData.reduce((s, d) => s + (d.total || 0), 0)
        : 0;
      return sum + compareTotal;
    }, 0);
    const totalDiff = totalBase - totalCompare;
    const avgChangeRate = comparisonPeriods.length > 0
      ? comparisonPeriods.reduce((sum, p) => {
          const baseTotal = Array.isArray(p.baseData) 
            ? p.baseData.reduce((s, d) => s + (d.total || 0), 0)
            : 0;
          const compareTotal = Array.isArray(p.compareData) 
            ? p.compareData.reduce((s, d) => s + (d.total || 0), 0)
            : 0;
          const changeRate = compareTotal > 0 
            ? ((baseTotal - compareTotal) / compareTotal) * 100
            : (baseTotal > 0 ? 100 : 0);
          return sum + changeRate;
        }, 0) / comparisonPeriods.length
      : 0;
    const increaseCount = comparisonPeriods.filter(p => {
      const baseTotal = Array.isArray(p.baseData) 
        ? p.baseData.reduce((s, d) => s + (d.total || 0), 0)
        : 0;
      const compareTotal = Array.isArray(p.compareData) 
        ? p.compareData.reduce((s, d) => s + (d.total || 0), 0)
        : 0;
      return baseTotal > compareTotal;
    }).length;

    const summaryStats = {
      totalBase,
      totalCompare,
      totalDiff,
      avgChangeRate: avgChangeRate.toFixed(1),
      increaseCount,
      totalPeriods: comparisonPeriods.length
    };

    // 处理周期数据，提取供应商和路由信息
    const processedPeriods = comparisonPeriods.map(period => {
      const baseWeek = Array.isArray(period.baseData) ? period.baseData : [];
      const compareWeek = Array.isArray(period.compareData) ? period.compareData : [];
      
      // 计算基准周和对比周的总量
      const baseTotal = baseWeek.reduce((sum, d) => sum + (d.total || 0), 0);
      const compareTotal = compareWeek.reduce((sum, d) => sum + (d.total || 0), 0);
      
      // 提取供应商数据
      const supplierMap = new Map();
      baseWeek.forEach(day => {
        if (day.bySupplier && Array.isArray(day.bySupplier)) {
          day.bySupplier.forEach(supplier => {
            if (!supplierMap.has(supplier.supplierId)) {
              supplierMap.set(supplier.supplierId, {
                supplierId: supplier.supplierId,
                supplierName: supplier.supplierName || supplier.supplierId,
                count: 0,
                compareCount: 0
              });
            }
            supplierMap.get(supplier.supplierId).count += supplier.count || 0;
          });
        }
      });
      compareWeek.forEach(day => {
        if (day.bySupplier && Array.isArray(day.bySupplier)) {
          day.bySupplier.forEach(supplier => {
            if (!supplierMap.has(supplier.supplierId)) {
              supplierMap.set(supplier.supplierId, {
                supplierId: supplier.supplierId,
                supplierName: supplier.supplierName || supplier.supplierId,
                count: 0,
                compareCount: 0
              });
            }
            supplierMap.get(supplier.supplierId).compareCount += supplier.count || 0;
          });
        }
      });

      // 提取路由数据
      const routeMap = new Map();
      baseWeek.forEach(day => {
        if (day.byRoute && Array.isArray(day.byRoute)) {
          day.byRoute.forEach(route => {
            if (!routeMap.has(route.routeCode)) {
              routeMap.set(route.routeCode, {
                routeCode: route.routeCode,
                count: 0,
                compareCount: 0
              });
            }
            routeMap.get(route.routeCode).count += route.count || 0;
          });
        }
      });
      compareWeek.forEach(day => {
        if (day.byRoute && Array.isArray(day.byRoute)) {
          day.byRoute.forEach(route => {
            if (!routeMap.has(route.routeCode)) {
              routeMap.set(route.routeCode, {
                routeCode: route.routeCode,
                count: 0,
                compareCount: 0
              });
            }
            routeMap.get(route.routeCode).compareCount += route.count || 0;
          });
        }
      });

      const suppliers = Array.from(supplierMap.values()).map(s => ({
        ...s,
        supplierDiff: s.count - s.compareCount,
        supplierChangeRate: s.compareCount > 0 
          ? (((s.count - s.compareCount) / s.compareCount) * 100).toFixed(1)
          : (s.count > 0 ? '100.0' : '0.0')
      })).sort((a, b) => b.count - a.count);

      const routes = Array.from(routeMap.values()).map(r => ({
        ...r,
        routeDiff: r.count - r.compareCount,
        routeChangeRate: r.compareCount > 0
          ? (((r.count - r.compareCount) / r.compareCount) * 100).toFixed(1)
          : (r.count > 0 ? '100.0' : '0.0')
      })).sort((a, b) => b.count - a.count);

      const diff = baseTotal - compareTotal;
      const changeRate = compareTotal > 0 
        ? ((diff / compareTotal) * 100).toFixed(1)
        : (baseTotal > 0 ? '100.0' : '0.0');

      return {
        label: period.label,
        baseRange: period.baseRange,
        compareRange: period.compareRange,
        baseTotal,
        compareTotal,
        diff,
        changeRate: parseFloat(changeRate),
        isIncrease: diff > 0,
        suppliers,
        routes
      };
    });

    const prompt = buildVolumeDataPrompt(processedPeriods, summaryStats);
    setAIPrompt(prompt);
    setShowAIModal(true);
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
          <div className="flex items-center gap-3">
            {/* 视图切换 */}
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Table className="h-4 w-4 mr-2" />
                表格
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                图表
              </button>
            </div>
            <button
              onClick={loadQuickFilterData}
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? '加载中...' : '刷新数据'}
            </button>
            <button
              onClick={handleAIAnalysis}
              disabled={loading || comparisonPeriods.length === 0}
              className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI分析
            </button>
          </div>
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

      {/* AI分析模态框 */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        prompt={aiPrompt}
        title="货量数据AI分析"
      />
    </div>
  );
};

export default VolumeDataModule;

