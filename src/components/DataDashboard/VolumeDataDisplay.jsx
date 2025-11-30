import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Table, BarChart3, Package, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell
} from 'recharts';

const VolumeDataDisplay = ({ comparisonPeriods, viewMode, onViewModeChange }) => {
  // 每个周期的路由展开状态
  const [expandedRoutes, setExpandedRoutes] = useState({});
  // 格式化日期范围显示
  const formatDateRange = (range) => {
    if (!range || !range.start || !range.end) return '';
    const start = new Date(range.start);
    const end = new Date(range.end);
    const formatDate = (date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // 计算周数据（将多天数据合并为周）
  const calculateWeekData = (data) => {
    if (!data || data.length === 0) return { total: 0, byRoute: [], bySupplier: [] };

    const weekData = {
      total: 0,
      byRoute: {},
      bySupplier: {}
    };

    data.forEach(day => {
      weekData.total += day.total;
      
      // 合并路由数据
      day.byRoute.forEach(route => {
        if (!weekData.byRoute[route.routeCode]) {
          weekData.byRoute[route.routeCode] = { routeCode: route.routeCode, count: 0 };
        }
        weekData.byRoute[route.routeCode].count += route.count;
      });

      // 合并供应商数据
      day.bySupplier.forEach(supplier => {
        if (!weekData.bySupplier[supplier.supplierId]) {
          weekData.bySupplier[supplier.supplierId] = {
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            count: 0
          };
        }
        weekData.bySupplier[supplier.supplierId].count += supplier.count;
      });
    });

    // 转换为数组格式并排序
    return {
      total: weekData.total,
      byRoute: Object.values(weekData.byRoute)
        .map(route => ({
        ...route,
        percentage: weekData.total > 0 ? ((route.count / weekData.total) * 100).toFixed(2) : '0.00'
        }))
        .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)),
      bySupplier: Object.values(weekData.bySupplier)
        .map(supplier => ({
        ...supplier,
        percentage: weekData.total > 0 ? ((supplier.count / weekData.total) * 100).toFixed(2) : '0.00'
      }))
        .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
    };
  };

  // 处理多个对比周期的数据
  const processedPeriods = useMemo(() => {
    if (!comparisonPeriods || comparisonPeriods.length === 0) return [];

    return comparisonPeriods.map(period => {
      const baseWeek = calculateWeekData(period.baseData);
      const compareWeek = calculateWeekData(period.compareData);
      
      const diff = baseWeek.total - compareWeek.total;
      const changeRate = compareWeek.total > 0 
        ? ((diff / compareWeek.total) * 100).toFixed(1)
        : (baseWeek.total > 0 ? '100.0' : '0.0');
      
      // 合并供应商数据并计算对比
      const allSuppliers = new Map();
      baseWeek.bySupplier.forEach(supplier => {
        allSuppliers.set(supplier.supplierId, {
          ...supplier,
          compareCount: 0,
          comparePercentage: '0.00'
        });
      });
      compareWeek.bySupplier.forEach(supplier => {
        const existing = allSuppliers.get(supplier.supplierId);
      if (existing) {
        existing.compareCount = supplier.count;
          existing.comparePercentage = supplier.percentage;
      } else {
          allSuppliers.set(supplier.supplierId, {
            ...supplier,
            count: 0,
            percentage: '0.00',
            compareCount: supplier.count,
            comparePercentage: supplier.percentage
        });
      }
    });

      // 合并路由数据并计算对比
      const allRoutes = new Map();
      baseWeek.byRoute.forEach(route => {
        allRoutes.set(route.routeCode, {
          ...route,
          compareCount: 0,
          comparePercentage: '0.00'
        });
      });
      compareWeek.byRoute.forEach(route => {
        const existing = allRoutes.get(route.routeCode);
      if (existing) {
        existing.compareCount = route.count;
          existing.comparePercentage = route.percentage;
      } else {
          allRoutes.set(route.routeCode, {
            ...route,
            count: 0,
            percentage: '0.00',
            compareCount: route.count,
            comparePercentage: route.percentage
        });
      }
    });

      return {
        label: period.label,
        baseRange: period.baseRange,
        compareRange: period.compareRange,
        baseTotal: baseWeek.total,
        compareTotal: compareWeek.total,
        diff,
        changeRate: parseFloat(changeRate),
        isIncrease: diff > 0,
        baseWeek,
        compareWeek,
        suppliers: Array.from(allSuppliers.values()).map(supplier => ({
          ...supplier,
          supplierDiff: supplier.count - supplier.compareCount,
          supplierChangeRate: supplier.compareCount > 0 
            ? (((supplier.count - supplier.compareCount) / supplier.compareCount) * 100).toFixed(1)
            : (supplier.count > 0 ? '100.0' : '0.0')
        })),
        routes: Array.from(allRoutes.values()).map(route => ({
          ...route,
          routeDiff: route.count - route.compareCount,
          routeChangeRate: route.compareCount > 0
            ? (((route.count - route.compareCount) / route.compareCount) * 100).toFixed(1)
            : (route.count > 0 ? '100.0' : '0.0')
        }))
      };
    });
  }, [comparisonPeriods]);

  // 汇总统计
  const summaryStats = useMemo(() => {
    if (processedPeriods.length === 0) return null;

    const totalBase = processedPeriods.reduce((sum, p) => sum + p.baseTotal, 0);
    const totalCompare = processedPeriods.reduce((sum, p) => sum + p.compareTotal, 0);
    const totalDiff = totalBase - totalCompare;
    const avgChangeRate = processedPeriods.length > 0
      ? processedPeriods.reduce((sum, p) => sum + p.changeRate, 0) / processedPeriods.length
      : 0;
    const increaseCount = processedPeriods.filter(p => p.isIncrease).length;

    return {
      totalBase,
      totalCompare,
      totalDiff,
      avgChangeRate: avgChangeRate.toFixed(1),
      increaseCount,
      totalPeriods: processedPeriods.length
    };
  }, [processedPeriods]);

  // 图表数据 - 包含基准周、对比周和变化量
  const chartData = useMemo(() => {
    // 按时间倒序排列（从最新到最旧）
    return [...processedPeriods].reverse().map((period, index) => ({
      name: period.label,
      baseTotal: period.baseTotal,
      compareTotal: period.compareTotal,
      diff: period.diff,
      changeRate: period.changeRate,
      periodIndex: index
    }));
  }, [processedPeriods]);

  if (!comparisonPeriods || comparisonPeriods.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">请选择对比周期并加载数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 视图切换 */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => onViewModeChange('table')}
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
            onClick={() => onViewModeChange('chart')}
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
      </div>

      {viewMode === 'table' ? (
        <>
          {/* 货量对比表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">货量对比</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周期</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">基准周总量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对比周总量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">变化率</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedPeriods.map((period, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{period.label}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(period.baseRange)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateRange(period.compareRange)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{period.baseTotal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{period.compareTotal.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-sm font-semibold flex items-center ${
                        period.isIncrease ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {period.isIncrease ? (
                          <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-1" />
                        )}
                        {period.diff >= 0 ? '+' : ''}{period.diff.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${
                        period.isIncrease ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {period.changeRate >= 0 ? '+' : ''}{period.changeRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 供应商对比表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">供应商对比</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">供应商</th>
                    {processedPeriods.map((period, idx) => (
                      <th key={idx} colSpan="4" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">
                        {period.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10"></th>
                    {processedPeriods.map((period, idx) => (
                      <React.Fragment key={idx}>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase border-l border-gray-200">基准周</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">对比周</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">变化量</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">变化率</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // 收集所有供应商
                    const allSuppliersMap = new Map();
                    processedPeriods.forEach(period => {
                      period.suppliers.forEach(supplier => {
                        if (!allSuppliersMap.has(supplier.supplierId)) {
                          allSuppliersMap.set(supplier.supplierId, {
                            supplierId: supplier.supplierId,
                            supplierName: supplier.supplierName,
                            periods: {}
                          });
                        }
                        allSuppliersMap.get(supplier.supplierId).periods[period.label] = supplier;
                      });
                    });
                    
                    return Array.from(allSuppliersMap.values()).map((supplier, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                          {supplier.supplierName}
                        </td>
                        {processedPeriods.map((period, pIdx) => {
                          const supplierData = supplier.periods[period.label];
                          if (!supplierData) {
                            return (
                              <React.Fragment key={pIdx}>
                                <td className="px-2 py-3 text-sm text-gray-400 border-l border-gray-200">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                              </React.Fragment>
                            );
                          }
                          const isIncrease = supplierData.supplierDiff > 0;
                          return (
                            <React.Fragment key={pIdx}>
                              <td className="px-2 py-3 text-sm text-gray-900 font-semibold border-l border-gray-200">
                                {supplierData.count.toLocaleString()}
                              </td>
                              <td className="px-2 py-3 text-sm text-gray-600">
                                {supplierData.compareCount.toLocaleString()}
                              </td>
                              <td className={`px-2 py-3 text-sm font-semibold flex items-center justify-center ${
                                isIncrease ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {isIncrease ? (
                                  <ArrowUp className="h-3 w-3 mr-0.5" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 mr-0.5" />
                                )}
                                {supplierData.supplierDiff >= 0 ? '+' : ''}{supplierData.supplierDiff.toLocaleString()}
                              </td>
                              <td className={`px-2 py-3 text-sm font-semibold ${
                                isIncrease ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {supplierData.supplierChangeRate >= 0 ? '+' : ''}{supplierData.supplierChangeRate}%
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* 路由码对比表 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">路由码对比</h3>
              {(() => {
                const allRoutes = new Set();
                processedPeriods.forEach(period => {
                  period.routes.forEach(route => allRoutes.add(route.routeCode));
                });
                return allRoutes.size > 20 && (
                  <button
                    onClick={() => setExpandedRoutes(prev => ({ ...prev, routes: !prev.routes }))}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                  >
                    {expandedRoutes.routes ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        展开全部 ({allRoutes.size})
                      </>
                    )}
                  </button>
                );
              })()}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">路由码</th>
                    {processedPeriods.map((period, idx) => (
                      <th key={idx} colSpan="4" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">
                        {period.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10"></th>
                    {processedPeriods.map((period, idx) => (
                      <React.Fragment key={idx}>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase border-l border-gray-200">基准周</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">占比</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">变化量</th>
                        <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">变化率</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // 收集所有路由码
                    const allRoutesMap = new Map();
                    processedPeriods.forEach(period => {
                      period.routes.forEach(route => {
                        if (!allRoutesMap.has(route.routeCode)) {
                          allRoutesMap.set(route.routeCode, {
                            routeCode: route.routeCode,
                            periods: {}
                          });
                        }
                        allRoutesMap.get(route.routeCode).periods[period.label] = route;
                      });
                    });
                    
                    const routesList = Array.from(allRoutesMap.values());
                    const displayRoutes = expandedRoutes.routes ? routesList : routesList.slice(0, 20);
                    
                    return displayRoutes.map((route, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                          {route.routeCode}
                        </td>
                        {processedPeriods.map((period, pIdx) => {
                          const routeData = route.periods[period.label];
                          if (!routeData) {
                            return (
                              <React.Fragment key={pIdx}>
                                <td className="px-2 py-3 text-sm text-gray-400 border-l border-gray-200">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                                <td className="px-2 py-3 text-sm text-gray-400">-</td>
                              </React.Fragment>
                            );
                          }
                          const isIncrease = routeData.routeDiff > 0;
                          return (
                            <React.Fragment key={pIdx}>
                              <td className="px-2 py-3 text-sm text-gray-900 font-semibold border-l border-gray-200">
                                {routeData.count.toLocaleString()}
                              </td>
                              <td className="px-2 py-3 text-sm text-gray-600">
                                {routeData.percentage}%
                              </td>
                              <td className={`px-2 py-3 text-sm font-semibold flex items-center justify-center ${
                                isIncrease ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {isIncrease ? (
                                  <ArrowUp className="h-3 w-3 mr-0.5" />
                                ) : (
                                  <ArrowDown className="h-3 w-3 mr-0.5" />
                                )}
                                {routeData.routeDiff >= 0 ? '+' : ''}{routeData.routeDiff.toLocaleString()}
                              </td>
                              <td className={`px-2 py-3 text-sm font-semibold ${
                                isIncrease ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {routeData.routeChangeRate >= 0 ? '+' : ''}{routeData.routeChangeRate}%
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 货量趋势面积图 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">货量趋势</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6B7280"
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), '货量']}
                  labelFormatter={(label) => `周期: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="baseTotal" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBase)"
                  name="基准周货量"
                  dot={{ r: 6, fill: '#3B82F6' }}
                  activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 变化量趋势图 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">变化量趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6B7280"
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fill: '#6B7280' }}
                />
                <Tooltip 
                  formatter={(value) => [
                    `${value >= 0 ? '+' : ''}${value.toLocaleString()}`,
                    '变化量'
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="diff" name="变化量" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.diff >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </>
      )}
    </div>
  );
};

export default VolumeDataDisplay;
