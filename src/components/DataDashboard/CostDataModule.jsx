import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, LineChart, Calendar, Search, Filter, DollarSign, Sparkles } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AIAnalysisModal from '../common/AIAnalysisModal';
import apiClient from '../../api/apiClient';
import useStore from '../../store/useStore';
import { getWeekRange } from '../../utils/dateUtils';
import { buildCostDataPrompt } from '../../utils/openaiUtils';

const CostDataModule = () => {
  const { selectedRegion } = useStore();
  const region = selectedRegion || 'SYD';
  
  // 筛选类型：'week' | 'day'
  const [filterType, setFilterType] = useState('week');
  
  // 周单位筛选
  const [weekFilter, setWeekFilter] = useState(4); // 默认选择近4周
  
  // 天单位筛选
  const [dayRangeStart, setDayRangeStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    return today.toISOString().split('T')[0];
  });
  const [dayRangeEnd, setDayRangeEnd] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // 是否剔除不分拣的时间（仅适用于人效图表）
  const [excludeNonSortingDays, setExcludeNonSortingDays] = useState(true);
  
  // 数据状态
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const mountedRef = useRef(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');

  // 使用统一的日期工具函数处理澳洲时区

  // 生成多个对比周期（周单位）
  const generateWeekPeriods = (weeks) => {
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

  // 获取某个日期范围内所有日期是否分拣的信息
  const getDaySortingInfo = async (startDate, endDate) => {
    try {
      const response = await apiClient.wages.getRecords({
        region,
        startDate,
        endDate
      });
      
      const sortingMap = new Map();
      if (response && Array.isArray(response)) {
        response.forEach(record => {
          const date = record.date ? record.date.split('T')[0] : null;
          if (date) {
            // 如果该日期已经有记录，保留已有的isSorting状态
            if (!sortingMap.has(date)) {
              sortingMap.set(date, record.isSorting === true);
            } else {
              // 如果已有记录，只要有一个是分拣的，就认为是分拣的
              if (record.isSorting === true) {
                sortingMap.set(date, true);
              }
            }
          }
        });
      }
      return sortingMap;
    } catch (error) {
      console.error('获取日期分拣信息失败:', error);
      return new Map();
    }
  };

  // 获取单日的人效数据
  const getDailyEfficiencyData = async (date, daySortingMap) => {
    try {
      // 如果需要剔除不分拣的时间，检查该日期是否分拣
      if (excludeNonSortingDays && daySortingMap) {
        const isSorting = daySortingMap.get(date);
        // 只有当明确标记为不分拣（false）时才过滤掉
        // 如果daySortingMap中没有该日期的记录（undefined），则正常处理
        if (isSorting === false) {
          return null; // 明确标记为不分拣的日期返回null
        }
      }

      // 查询货量数据
      const volumeData = await apiClient.inboundData.getAggregate({
        startDate: date,
        endDate: date
      });
      
      // 查询工时数据
      const wageData = await apiClient.wages.getStatistics({
        startDate: date,
        endDate: date,
        region
      });

      const dayVolumeData = Array.isArray(volumeData) 
        ? volumeData.find(item => item.date === date) || volumeData[0]
        : null;

      const totalVolume = dayVolumeData ? (dayVolumeData.total || 0) : 0;
      const totalHours = wageData ? (wageData.totalHours || 0) : 0;
      const efficiency = totalHours > 0 ? (totalVolume / totalHours) : 0;

      return {
        date,
        totalVolume,
        totalHours: Math.round(totalHours * 100) / 100,
        efficiency: Math.round(efficiency * 100) / 100
      };
    } catch (error) {
      console.error(`获取 ${date} 的人效数据失败:`, error);
      return null;
    }
  };

  // 获取单日的成本数据
  const getDailyCostData = async (date) => {
    try {
      // 查询工资记录
      const response = await apiClient.wages.getRecords({
        startDate: date,
        endDate: date,
        region
      });

      // API返回格式为 {records: [], total: ...}，需要提取records数组
      const wageRecords = response?.records || (Array.isArray(response) ? response : []);

      // 计算总成本（所有工资记录的总和）
      let totalCost = 0;
      if (Array.isArray(wageRecords) && wageRecords.length > 0) {
        totalCost = wageRecords.reduce((sum, record) => {
          return sum + (record.totalWage || 0);
        }, 0);
      }

      return {
        date,
        totalCost: Math.round(totalCost * 100) / 100
      };
    } catch (error) {
      console.error(`获取 ${date} 的成本数据失败:`, error);
      return {
        date,
        totalCost: 0
      };
    }
  };

  // 加载数据
  const loadData = async () => {
    if (loadingRef.current) {
      console.log('请求已在进行中，跳过重复请求');
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      let periods = [];
      let daySortingMap = new Map();

      if (filterType === 'week') {
        // 周单位筛选
        periods = generateWeekPeriods(weekFilter);
        
        // 找到所有周期的最早和最晚日期
        let minDate = null;
        let maxDate = null;
        periods.forEach(period => {
          const baseStart = new Date(period.baseRange.start);
          const baseEnd = new Date(period.baseRange.end);
          const compareStart = new Date(period.compareRange.start);
          const compareEnd = new Date(period.compareRange.end);
          
          const dates = [baseStart, baseEnd, compareStart, compareEnd];
          dates.forEach(date => {
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
          });
        });

        // 使用聚合接口一次性获取所有数据
        const startDateStr = minDate.toISOString().split('T')[0];
        const endDateStr = maxDate.toISOString().split('T')[0];
        console.log(`开始加载周单位数据，从 ${startDateStr} 到 ${endDateStr}`);
        
        const summaryData = await apiClient.wages.getEfficiencyCostSummary({
          region,
          startDate: startDateStr,
          endDate: endDateStr
        });

        // 将数据转换为按日期索引的Map，方便查找
        const dataByDate = new Map();
        summaryData.forEach(day => {
          dataByDate.set(day.date, day);
        });

        // 处理每个周期
        const periodData = periods.map(period => {
          // 获取基准周的所有日期
          const baseDates = [];
          const baseStart = new Date(period.baseRange.start);
          const baseEnd = new Date(period.baseRange.end);
          for (let d = new Date(baseStart); d <= baseEnd; d.setDate(d.getDate() + 1)) {
            baseDates.push(d.toISOString().split('T')[0]);
          }

          // 获取对比周的所有日期
          const compareDates = [];
          const compareStart = new Date(period.compareRange.start);
          const compareEnd = new Date(period.compareRange.end);
          for (let d = new Date(compareStart); d <= compareEnd; d.setDate(d.getDate() + 1)) {
            compareDates.push(d.toISOString().split('T')[0]);
          }

          // 从聚合数据中提取基准周和对比周的数据
          let baseEfficiencyData = baseDates.map(date => dataByDate.get(date)).filter(d => d);
          let compareEfficiencyData = compareDates.map(date => dataByDate.get(date)).filter(d => d);

          // 如果需要剔除不分拣的时间，过滤数据
          if (excludeNonSortingDays) {
            baseEfficiencyData = baseEfficiencyData.filter(d => d.isSorting !== false);
            compareEfficiencyData = compareEfficiencyData.filter(d => d.isSorting !== false);
          }

          // 过滤掉没有数据的日期
          const validBaseEfficiency = baseEfficiencyData.filter(d => {
            return !(d.totalVolume === 0 && d.totalHours === 0);
          });
          const validCompareEfficiency = compareEfficiencyData.filter(d => {
            return !(d.totalVolume === 0 && d.totalHours === 0);
          });

          // 成本数据不过滤分拣状态，但过滤没有数据的日期
          const validBaseCost = baseDates
            .map(date => dataByDate.get(date))
            .filter(d => d && d.totalCost > 0);
          const validCompareCost = compareDates
            .map(date => dataByDate.get(date))
            .filter(d => d && d.totalCost > 0);

          // 计算基准周的人效
          const baseTotalVolume = validBaseEfficiency.reduce((sum, d) => sum + d.totalVolume, 0);
          const baseTotalHours = validBaseEfficiency.reduce((sum, d) => sum + d.totalHours, 0);
          const baseEfficiency = baseTotalHours > 0 ? (baseTotalVolume / baseTotalHours) : 0;

          // 计算对比周的人效
          const compareTotalVolume = validCompareEfficiency.reduce((sum, d) => sum + d.totalVolume, 0);
          const compareTotalHours = validCompareEfficiency.reduce((sum, d) => sum + d.totalHours, 0);
          const compareEfficiency = compareTotalHours > 0 ? (compareTotalVolume / compareTotalHours) : 0;

          // 计算基准周的成本
          const baseTotalCost = validBaseCost.reduce((sum, d) => sum + d.totalCost, 0);

          // 计算对比周的成本
          const compareTotalCost = validCompareCost.reduce((sum, d) => sum + d.totalCost, 0);

          return {
            label: period.label,
            baseRange: period.baseRange,
            compareRange: period.compareRange,
            baseEfficiency: Math.round(baseEfficiency * 100) / 100,
            compareEfficiency: Math.round(compareEfficiency * 100) / 100,
            baseTotalVolume,
            compareTotalVolume,
            baseTotalHours: Math.round(baseTotalHours * 100) / 100,
            compareTotalHours: Math.round(compareTotalHours * 100) / 100,
            baseTotalCost: Math.round(baseTotalCost * 100) / 100,
            compareTotalCost: Math.round(compareTotalCost * 100) / 100,
            efficiencyDiff: Math.round((baseEfficiency - compareEfficiency) * 100) / 100,
            costDiff: Math.round((baseTotalCost - compareTotalCost) * 100) / 100
          };
        });

        console.log(`数据加载完成，共 ${periodData.length} 个对比周期`);
        
        // 过滤掉没有数据的周期
        // 人效数据：如果基准周和对比周都没有数据，过滤掉
        const validEfficiencyPeriods = periodData.filter(period => {
          const hasBaseData = period.baseTotalVolume > 0 || period.baseTotalHours > 0;
          const hasCompareData = period.compareTotalVolume > 0 || period.compareTotalHours > 0;
          return hasBaseData || hasCompareData;
        });
        
        // 成本数据：如果基准周和对比周都没有成本数据，过滤掉
        const validCostPeriods = periodData.filter(period => {
          return period.baseTotalCost > 0 || period.compareTotalCost > 0;
        });
        
        setEfficiencyData(validEfficiencyPeriods);
        setCostData(validCostPeriods);
      } else {
        // 天单位筛选 - 使用聚合接口一次性获取所有数据
        console.log(`开始加载天单位数据，从 ${dayRangeStart} 到 ${dayRangeEnd}`);

        // 使用新的聚合接口一次性获取所有数据
        const summaryData = await apiClient.wages.getEfficiencyCostSummary({
          region,
          startDate: dayRangeStart,
          endDate: dayRangeEnd
        });

        // 如果需要剔除不分拣的时间，过滤数据
        let filteredSummaryData = summaryData;
        if (excludeNonSortingDays) {
          filteredSummaryData = summaryData.filter(day => day.isSorting !== false);
        }

        // 过滤掉没有数据的日期
        const validEfficiencyData = filteredSummaryData.filter(d => {
          // 如果总货量和总工时都为0，说明没有数据，过滤掉
          return !(d.totalVolume === 0 && d.totalHours === 0);
        });
        
        const validCostData = summaryData.filter(d => {
          // 如果总成本为0，说明没有数据，过滤掉
          return d.totalCost > 0;
        });

        // 转换为人效数据格式
        const efficiencyDataList = validEfficiencyData.map((day, index) => {
          const prevDay = index > 0 ? validEfficiencyData[index - 1] : null;
          const prevEfficiency = prevDay ? prevDay.efficiency : null;
          const change = prevEfficiency !== null ? day.efficiency - prevEfficiency : null;

          return {
            date: day.date,
            efficiency: day.efficiency || 0,
            totalVolume: day.totalVolume || 0,
            totalHours: day.totalHours || 0,
            change: change !== null ? Math.round(change * 100) / 100 : null,
            isIncrease: change !== null ? change > 0 : null
          };
        });

        // 转换为成本数据格式
        const costDataList = validCostData.map((day, index) => {
          const prevDay = index > 0 ? validCostData[index - 1] : null;
          const prevCost = prevDay ? prevDay.totalCost : null;
          const change = prevCost !== null ? day.totalCost - prevCost : null;

            return {
            date: day.date,
            totalCost: day.totalCost || 0,
            change: change !== null ? Math.round(change * 100) / 100 : null,
            isIncrease: change !== null ? change < 0 : null // 成本下降是好的
            };
          });

        console.log(`数据加载完成，人效数据 ${efficiencyDataList.length} 条，成本数据 ${costDataList.length} 条`);
        setEfficiencyData(efficiencyDataList);
        setCostData(costDataList);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // 处理周单位筛选切换
  const handleWeekFilterChange = (weeks) => {
    if (weekFilter === weeks) return;
    setWeekFilter(weeks);
  };

  // 只在组件首次挂载时加载数据
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  // 当筛选参数变化时自动加载数据（排除首次挂载）
  useEffect(() => {
    if (mountedRef.current) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, weekFilter, dayRangeStart, dayRangeEnd, excludeNonSortingDays, region]);

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

  // 处理AI分析
  const handleAIAnalysis = () => {
    if (efficiencyData.length === 0 && costData.length === 0) {
      alert('请先加载数据');
      return;
    }

    const prompt = buildCostDataPrompt(efficiencyData, costData, filterType);
    setAIPrompt(prompt);
    setShowAIModal(true);
  };

  // 获取周标签的排序顺序（用于排序）
  const getWeekLabelOrder = (label) => {
    if (label === '上周') return 1;
    if (label === '上上周') return 2;
    // 提取数字，如 "3周前" -> 3
    const match = label.match(/^(\d+)周前$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 999; // 未知标签排在最后
  };

  // 合并的人效和成本折线图数据
  const combinedChartData = useMemo(() => {
    if (filterType === 'week') {
      // 周单位：合并人效和成本数据
      const efficiencyMap = new Map();
      const costMap = new Map();

      // 处理人效数据
      efficiencyData
        .filter(period => period.baseEfficiency > 0 || period.baseTotalVolume > 0 || period.baseTotalHours > 0)
        .forEach((period) => {
          efficiencyMap.set(period.label, {
            name: period.label,
            efficiency: period.baseEfficiency,
            date: period.baseRange.start
          });
        });

      // 处理成本数据
      costData
        .filter(period => period.baseTotalCost > 0)
        .forEach((period) => {
          costMap.set(period.label, {
            name: period.label,
            cost: period.baseTotalCost,
            date: period.baseRange.start
          });
        });

      // 合并数据：获取所有唯一的周期标签
      const allLabels = new Set([...efficiencyMap.keys(), ...costMap.keys()]);
      return Array.from(allLabels).map(label => {
        const efficiencyItem = efficiencyMap.get(label);
        const costItem = costMap.get(label);
        return {
          name: label,
          efficiency: efficiencyItem?.efficiency || null,
          cost: costItem?.cost || null,
          date: efficiencyItem?.date || costItem?.date
        };
      }).sort((a, b) => {
        // 按照周标签顺序排序：上周、上上周、3周前...
        return getWeekLabelOrder(a.name) - getWeekLabelOrder(b.name);
      });
    } else {
      // 天单位：合并人效和成本数据
      const efficiencyMap = new Map();
      const costMap = new Map();

      // 处理人效数据
      efficiencyData
        .filter(day => day.efficiency > 0 || day.totalVolume > 0 || day.totalHours > 0)
        .forEach((day) => {
          const dateKey = day.date;
          efficiencyMap.set(dateKey, {
            name: formatDate(day.date),
            efficiency: day.efficiency,
            date: day.date
          });
        });

      // 处理成本数据
      costData
        .filter(day => day.totalCost > 0)
        .forEach((day) => {
          const dateKey = day.date;
          costMap.set(dateKey, {
            name: formatDate(day.date),
            cost: day.totalCost,
            date: day.date
          });
        });

      // 合并数据：获取所有唯一的日期
      const allDates = new Set([...efficiencyMap.keys(), ...costMap.keys()]);
      return Array.from(allDates).map(date => {
        const efficiencyItem = efficiencyMap.get(date);
        const costItem = costMap.get(date);
        return {
          name: efficiencyItem?.name || costItem?.name || formatDate(date),
          efficiency: efficiencyItem?.efficiency || null,
          cost: costItem?.cost || null,
          date: date
        };
      }).sort((a, b) => {
        // 按日期排序
        if (a.date && b.date) {
          return new Date(a.date) - new Date(b.date);
        }
        return 0;
      });
    }
  }, [efficiencyData, costData, filterType]);

  return (
    <div className="space-y-6">
      {/* 模块标题 */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-primary-600" />
              成本数据 - 人效分析
            </h3>
            <p className="mt-1 text-sm text-gray-600">
                人效 = 总货量 / 总工时 | 成本 = 总工资
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExcludeNonSortingDays(!excludeNonSortingDays)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  excludeNonSortingDays
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <Filter className="h-4 w-4" />
                剔除不分拣的时间
              </button>
              <button
                onClick={handleAIAnalysis}
                disabled={loading || (efficiencyData.length === 0 && costData.length === 0)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI分析
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选部分 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="mb-4">
          <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
            <Calendar className="h-4 w-4 mr-2 text-primary-600" />
            筛选类型：
          </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                value="week"
                checked={filterType === 'week'}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="mr-2"
                />
              <span className="text-sm text-gray-700">周单位</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="filterType"
                value="day"
                checked={filterType === 'day'}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="mr-2"
                />
              <span className="text-sm text-gray-700">天单位</span>
              </label>
            </div>
          </div>

        {/* 周单位筛选 */}
        {filterType === 'week' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择对比周期：
              </label>
              <div className="flex flex-wrap gap-2">
                {[2, 4, 6, 8].map((weeks) => (
                  <button
                    key={weeks}
                    onClick={() => handleWeekFilterChange(weeks)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      weekFilter === weeks
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-primary-300'
                    }`}
                  >
                    近{weeks}周
                  </button>
                ))}
              </div>
              {weekFilter && (
                <p className="mt-2 text-xs text-gray-500">
                  将显示 {weekFilter} 个对比周期
                </p>
              )}
            </div>
          </div>
        )}

        {/* 天单位筛选 */}
        {filterType === 'day' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择时间区间：
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                  value={dayRangeStart}
                  onChange={(e) => setDayRangeStart(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-gray-500">至</span>
                    <input
                      type="date"
                  value={dayRangeEnd}
                  onChange={(e) => setDayRangeEnd(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  <button
                  onClick={loadData}
                  disabled={loading}
                  className="ml-4 inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Search className="h-4 w-4 mr-2" />
                  {loading ? '加载中...' : '刷新数据'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* 数据展示 */}
        {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">正在加载数据...</p>
          </div>
        ) : (
          <>
          {/* 人效与成本对比图（合并图表） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">人效与成本对比图</h3>
            {combinedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={combinedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                    label={{ value: '人效率', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                    label={{ value: '成本 ($)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === '人效率') {
                        return [`${value}`, name];
                      } else if (name === '成本') {
                        return [`$${value.toLocaleString()}`, name];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="人效率"
                    dot={{ r: 6, fill: '#3B82F6' }}
                    activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                    connectNulls={true}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name="成本"
                    dot={{ r: 6, fill: '#10B981' }}
                    activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2 }}
                    connectNulls={true}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>

            {/* 人效率报表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">人效率报表</h3>
            {efficiencyData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {filterType === 'week' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周总量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周总量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周总工时</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周总工时</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周人效</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周人效</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化量</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">总货量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">总工时</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">人效率</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比</th>
                        </>
                      )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {efficiencyData.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {filterType === 'week' ? (
                          <>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.label}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(item.baseRange)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(item.compareRange)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{(item.baseTotalVolume || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{(item.compareTotalVolume || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{(item.baseTotalHours || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{(item.compareTotalHours || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.baseEfficiency || 0}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.compareEfficiency || 0}</td>
                            <td className={`px-4 py-3 text-sm font-semibold flex items-center ${
                              (item.efficiencyDiff || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(item.efficiencyDiff || 0) >= 0 ? (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              ) : (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              )}
                              {(item.efficiencyDiff || 0) >= 0 ? '+' : ''}{item.efficiencyDiff || 0}
                          </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{(item.totalVolume || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{(item.totalHours || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.efficiency || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.change !== null ? (
                              <div className="flex items-center">
                                  {item.isIncrease ? (
                                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                                )}
                                  <span className={item.isIncrease ? 'text-green-600' : 'text-red-600'}>
                                    {item.isIncrease ? '+' : ''}{item.change}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
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

          {/* 成本报表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">成本报表</h3>
            {costData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {filterType === 'week' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化量</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">总成本</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {costData.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {filterType === 'week' ? (
                          <>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.label}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(item.baseRange)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(item.compareRange)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">${(item.baseTotalCost || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">${(item.compareTotalCost || 0).toLocaleString()}</td>
                            <td className={`px-4 py-3 text-sm font-semibold flex items-center ${
                              (item.costDiff || 0) <= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(item.costDiff || 0) <= 0 ? (
                                <TrendingDown className="h-4 w-4 mr-1" />
                              ) : (
                                <TrendingUp className="h-4 w-4 mr-1" />
                              )}
                              {(item.costDiff || 0) >= 0 ? '+' : ''}${Math.abs(item.costDiff || 0).toLocaleString()}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.date)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">${(item.totalCost || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.change !== null ? (
                                <div className="flex items-center">
                                  {item.isIncrease ? (
                                    <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                                  ) : (
                                    <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                                  )}
                                  <span className={item.isIncrease ? 'text-green-600' : 'text-red-600'}>
                                    {item.isIncrease ? '-' : '+'}${Math.abs(item.change || 0).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
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

      {/* AI分析模态框 */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        prompt={aiPrompt}
        title="成本数据 - 人效分析AI分析"
      />
    </div>
  );
};

export default CostDataModule;
