import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Users, 
  Package, 
  Clock, 
  BarChart3, 
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Filter,
  Crown
} from 'lucide-react';
import { crossRegionAPI } from '../database/api';
import { REGION_NAMES, REGION_ICONS } from '../constants/regions';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { format, subDays } from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [rankingsData, setRankingsData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [rankingMetric, setRankingMetric] = useState('efficiency');
  const [activeView, setActiveView] = useState('overview');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [summary, rankings, comparison] = await Promise.all([
        crossRegionAPI.getSummary(dateRange.startDate, dateRange.endDate),
        crossRegionAPI.getRankings(dateRange.startDate, dateRange.endDate, rankingMetric),
        crossRegionAPI.getComparison(dateRange.startDate, dateRange.endDate)
      ]);

      setSummaryData(summary);
      setRankingsData(rankings);
      setComparisonData(comparison);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, rankingMetric]);

  // 格式化数字
  const formatNumber = (num) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  // 计算变化率（模拟）
  const getChangeRate = () => {
    return Math.random() > 0.5 
      ? { value: (Math.random() * 20).toFixed(1), isPositive: true }
      : { value: (Math.random() * 10).toFixed(1), isPositive: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和控制区 */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-sm border border-blue-100 p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">总经理仪表板</h1>
                <p className="text-gray-600 mt-1">跨区域效率数据分析与对比</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* 日期范围选择 */}
            <div className="flex items-center space-x-2 bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <Calendar className="h-5 w-5 text-blue-600" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="border-none text-gray-700 text-sm focus:outline-none bg-transparent"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="border-none text-gray-700 text-sm focus:outline-none bg-transparent"
              />
            </div>
            <button
              onClick={loadData}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-3 transition-colors shadow-sm"
            >
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeView === 'overview'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            总览
          </button>
          <button
            onClick={() => setActiveView('rankings')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeView === 'rankings'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            区域排名
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeView === 'comparison'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            详细对比
          </button>
        </div>
      </div>

      {/* 总览视图 */}
      {activeView === 'overview' && summaryData && (
        <div className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">总处理量</p>
                  <p className="text-3xl font-bold text-gray-800">{formatNumber(summaryData.totalAcrossRegions.items)}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                <span>跨所有区域</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">总工人数</p>
                  <p className="text-3xl font-bold text-gray-800">{summaryData.totalAcrossRegions.workers}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <MapPin className="h-4 w-4 mr-1 text-green-500" />
                <span>{summaryData.regions.length} 个区域</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">总工作时长</p>
                  <p className="text-3xl font-bold text-gray-800">{formatNumber(summaryData.totalAcrossRegions.workingHours.toFixed(0))}</p>
                </div>
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="h-4 w-4 mr-1 text-purple-500" />
                <span>小时</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-sm">平均效率</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {(summaryData.totalAcrossRegions.workingHours > 0 
                      ? (summaryData.totalAcrossRegions.items / summaryData.totalAcrossRegions.workingHours).toFixed(0)
                      : 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-gray-500 text-sm">
                <TrendingUp className="h-4 w-4 mr-1 text-orange-500" />
                <span>件/小时</span>
              </div>
            </div>
          </div>

          {/* 区域对比图表 - 拆分为两个 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 区域总处理量对比 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                区域总处理量对比
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="region" 
                    tickFormatter={(value) => REGION_NAMES[value] || value}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    label={{ value: '处理量 (件)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                    tick={{ fill: '#666' }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => REGION_NAMES[value] || value}
                    formatter={(value) => [formatNumber(value), '处理量']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  />
                  <Bar dataKey="totalItems" name="总处理量" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 区域总效率对比 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                区域总效率对比
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="region" 
                    tickFormatter={(value) => REGION_NAMES[value] || value}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    label={{ value: '效率 (件/小时)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                    tick={{ fill: '#666' }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => REGION_NAMES[value] || value}
                    formatter={(value) => [value.toFixed(2), '效率']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  />
                  <Bar dataKey="overallEfficiency" name="总体效率" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 区域数据详情表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                区域详细数据
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      区域
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      处理量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工人数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工作时长
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总体效率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      粗拣效率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      细拣效率
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency).map((region, index) => (
                    <tr key={region.region} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{REGION_ICONS[region.region]}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {REGION_NAMES[region.region]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(region.totalItems)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.workerCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.totalWorkingHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {region.overallEfficiency.toFixed(2)} 件/h
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.avgCoarseEfficiency.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {region.avgFineEfficiency.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 区域分布饼图 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                处理量分布
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency)}
                    dataKey="totalItems"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${REGION_NAMES[entry.region]}: ${entry.totalItems}`}
                  >
                    {[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Users className="h-5 w-5 text-green-600 mr-2" />
                工人数分布
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency)}
                    dataKey="workerCount"
                    nameKey="region"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${REGION_NAMES[entry.region]}: ${entry.workerCount}人`}
                  >
                    {[...summaryData.regions].sort((a, b) => b.overallEfficiency - a.overallEfficiency).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 区域排名视图 */}
      {activeView === 'rankings' && (
        <div className="space-y-6">
          {/* 排名指标选择 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">排名依据：</span>
              <select
                value={rankingMetric}
                onChange={(e) => setRankingMetric(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="efficiency">总体效率</option>
                <option value="totalItems">处理总量</option>
                <option value="coarseEfficiency">粗拣效率</option>
                <option value="fineEfficiency">细拣效率</option>
              </select>
            </div>
          </div>

          {/* 排名展示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankingsData.map((region, index) => (
              <div
                key={region.region}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all hover:shadow-md ${
                  index === 0
                    ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white'
                    : index === 1
                    ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-white'
                    : index === 2
                    ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-white'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400'
                          : index === 1
                          ? 'bg-gray-100 text-gray-700 border-2 border-gray-400'
                          : index === 2
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-400'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {region.rank}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{REGION_ICONS[region.region]}</span>
                        <h3 className="text-xl font-bold text-gray-900">
                          {REGION_NAMES[region.region]}
                        </h3>
                      </div>
                    </div>
                  </div>
                  {index < 3 && <Award className="h-8 w-8 text-yellow-500" />}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">总体效率</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {region.efficiency} 件/h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">处理总量</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatNumber(region.totalItems)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">工作时长</span>
                    <span className="text-lg font-semibold text-purple-600">
                      {region.totalWorkingHours}h
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 详细对比视图 */}
      {activeView === 'comparison' && comparisonData && (
        <div className="space-y-6">
          {[...comparisonData].sort((a, b) => b.summary.overallEfficiency - a.summary.overallEfficiency).map((regionData) => (
            <div key={regionData.region} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{REGION_ICONS[regionData.region]}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {REGION_NAMES[regionData.region]}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {regionData.workers.length} 个工人 | 总效率: {regionData.summary.overallEfficiency} 件/小时
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatNumber(regionData.summary.totalItems)}
                    </p>
                    <p className="text-sm text-gray-600">总处理量</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {regionData.workers.length > 20 && (
                  <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">💡 提示：</span>
                      该区域共有 {regionData.workers.length} 个工人，当前显示效率排名前 20 的工人数据
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          工人
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          处理量
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          工作时长
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          效率
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          粗拣量
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          细拣量
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {regionData.workers
                        .sort((a, b) => b.efficiency - a.efficiency)
                        .slice(0, 20)
                        .map((worker, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {worker.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatNumber(worker.totalItems)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {worker.totalWorkingHours.toFixed(1)}h
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {worker.efficiency} 件/h
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatNumber(worker.coarseTotal)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatNumber(worker.fineTotal)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;

