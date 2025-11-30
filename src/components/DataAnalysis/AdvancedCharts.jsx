import { useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, Area, Cell, LabelList, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertCircle, Target, Activity } from 'lucide-react';

const AdvancedCharts = ({ chartData, getDateRangeText, benchmarkValues }) => {
  const [activeView, setActiveView] = useState('scatter'); // 'scatter', 'stacked', 'ranking'

  if (!chartData || chartData.length === 0) {
    return null;
  }

  // 基于基准值动态计算效率等级
  const getEfficiencyGrade = (efficiency, type = 'total') => {
    let benchmark;
    if (type === 'coarse') {
      benchmark = benchmarkValues.coarseBenchmark;
    } else if (type === 'fine') {
      benchmark = benchmarkValues.fineBenchmark;
    } else { // total - 总体效率使用粗分和细分基准的平均值作为参考
      // 总体效率 = 总件数/总小时数，应该与单项效率基准在同一量级
      // 使用粗分和细分基准的平均值作为总体基准
      benchmark = (benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2;
    }
    
    // 基于基准值的动态等级（基准值 = B级合格线）
    const thresholds = {
      S: benchmark * 1.8,  // 180% 基准 = 优秀
      A: benchmark * 1.4,  // 140% 基准 = 良好
      B: benchmark,        // 100% 基准 = 合格
      C: benchmark * 0.7   // 70% 基准 = 待提升
    };
    
    if (efficiency >= thresholds.S) return { grade: 'S', color: '#8b5cf6', label: '优秀' };
    if (efficiency >= thresholds.A) return { grade: 'A', color: '#3b82f6', label: '良好' };
    if (efficiency >= thresholds.B) return { grade: 'B', color: '#10b981', label: '合格' };
    if (efficiency >= thresholds.C) return { grade: 'C', color: '#f59e0b', label: '待提升' };
    return { grade: 'D', color: '#ef4444', label: '需改进' };
  };

  // 准备排名数据
  const rankingData = [...chartData].sort((a, b) => b.totalEfficiency - a.totalEfficiency)
    .map((worker, index) => ({
      ...worker,
      rank: index + 1,
      grade: getEfficiencyGrade(worker.totalEfficiency, 'total'),
      coarseGrade: getEfficiencyGrade(worker.coarseEfficiency, 'coarse'),
      fineGrade: getEfficiencyGrade(worker.fineEfficiency, 'fine')
    }));

  // 计算统计数据
  const stats = {
    avgEfficiency: (chartData.reduce((sum, d) => sum + d.totalEfficiency, 0) / chartData.length).toFixed(2),
    maxEfficiency: Math.max(...chartData.map(d => d.totalEfficiency)).toFixed(2),
    minEfficiency: Math.min(...chartData.map(d => d.totalEfficiency)).toFixed(2),
    totalItems: chartData.reduce((sum, d) => sum + d.totalItems, 0),
    avgWorkingHours: (chartData.reduce((sum, d) => sum + d.totalWorkingHours, 0) / chartData.length).toFixed(2)
  };

  // 效率与工作时长的散点数据
  const scatterData = chartData.map((worker, index) => ({
    name: worker.name,
    x: worker.totalWorkingHours,
    y: worker.totalEfficiency,
    z: worker.totalItems,
    coarseEfficiency: worker.coarseEfficiency,
    fineEfficiency: worker.fineEfficiency,
    grade: getEfficiencyGrade(worker.totalEfficiency, 'total')
  }));

  // 堆叠数据
  const stackedData = chartData.map(worker => ({
    name: worker.name,
    coarseCount: worker.totalCoarseCount,
    fineCount: worker.totalFineCount,
    coarseEfficiency: worker.coarseEfficiency,
    fineEfficiency: worker.fineEfficiency,
    total: worker.totalItems
  }));

  // 自定义散点
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const size = Math.min(15, Math.max(8, payload.z / 50));
    
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={size} 
        fill={payload.grade.color}
        stroke="#fff"
        strokeWidth={2}
        opacity={0.8}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* 视图切换器 */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              深度数据分析
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              多维度可视化分析工具，帮助发现数据规律和优化空间
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'scatter', label: '效率相关性' },
              { key: 'stacked', label: '作业对比' },
              { key: 'ranking', label: '绩效排名' }
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setActiveView(view.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === view.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-1">平均效率</div>
          <div className="text-2xl font-bold text-blue-900">{stats.avgEfficiency}</div>
          <div className="text-xs text-blue-600 mt-1">件/小时</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 font-medium mb-1">最高效率</div>
          <div className="text-2xl font-bold text-green-900">{stats.maxEfficiency}</div>
          <div className="text-xs text-green-600 mt-1">件/小时</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-xs text-orange-600 font-medium mb-1">最低效率</div>
          <div className="text-2xl font-bold text-orange-900">{stats.minEfficiency}</div>
          <div className="text-xs text-orange-600 mt-1">件/小时</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">总处理量</div>
          <div className="text-2xl font-bold text-purple-900">{stats.totalItems}</div>
          <div className="text-xs text-purple-600 mt-1">件</div>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
          <div className="text-xs text-pink-600 font-medium mb-1">平均工时</div>
          <div className="text-2xl font-bold text-pink-900">{stats.avgWorkingHours}</div>
          <div className="text-xs text-pink-600 mt-1">小时</div>
        </div>
      </div>

      {/* 散点图视图 - 效率与工作时长相关性 */}
      {activeView === 'scatter' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">效率与工作时长相关性分析</h3>
            <p className="text-sm text-gray-600 mt-1">
              横轴：工作时长（小时） | 纵轴：总效率（件/小时） | 气泡大小：总处理量
            </p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="工作时长"
                  label={{ value: '工作时长 (小时)', position: 'bottom', offset: 40 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="总效率"
                  label={{ value: '总效率 (件/小时)', angle: -90, position: 'left', offset: 40 }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">工作时长: <span className="font-medium text-gray-900">{data.x.toFixed(2)} 小时</span></p>
                            <p className="text-gray-600">总效率: <span className="font-medium text-gray-900">{data.y.toFixed(2)} 件/小时</span></p>
                            <p className="text-gray-600">总处理量: <span className="font-medium text-gray-900">{data.z} 件</span></p>
                            <p className="text-gray-600">粗拣效率: <span className="font-medium text-orange-600">{data.coarseEfficiency.toFixed(2)}</span></p>
                            <p className="text-gray-600">细拣效率: <span className="font-medium text-pink-600">{data.fineEfficiency.toFixed(2)}</span></p>
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                                    style={{ backgroundColor: `${data.grade.color}20`, color: data.grade.color }}>
                                等级 {data.grade.grade} - {data.grade.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  content={() => (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#8b5cf6' }}></div>
                        <span className="text-sm text-gray-600">S级 (优秀)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-sm text-gray-600">A级 (良好)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-sm text-gray-600">B级 (合格)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-sm text-gray-600">C级 (待提升)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-sm text-gray-600">D级 (需改进)</span>
                      </div>
                    </div>
                  )}
                />
                <Scatter name="工人效率分布" data={scatterData} shape={<CustomDot />} />
                {/* 平均效率参考线 */}
                <ReferenceLine 
                  y={parseFloat(stats.avgEfficiency)}
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `平均: ${stats.avgEfficiency}`, fill: '#94a3b8', fontSize: 11 }}
                />
                {/* 基准效率参考线 - 使用平均基准 */}
                <ReferenceLine 
                  y={(benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2}
                  stroke="#16a34a" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ value: `基准: ${((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2).toFixed(0)}`, fill: '#16a34a', fontSize: 11, fontWeight: 'bold' }}
                />
              </ScatterChart>
            </ResponsiveContainer>
            
            {/* 相关性说明 */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">分析要点</span>
                </div>
                <p className="text-sm text-blue-700">
                  气泡越大表示处理量越多，位置越高表示效率越高
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">优化建议</span>
                </div>
                <p className="text-sm text-green-700">
                  关注高工时但效率偏低的员工，可能需要培训或休息
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Award className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">标杆学习</span>
                </div>
                <p className="text-sm text-purple-700">
                  S级和A级员工的工作方法值得其他员工学习借鉴
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 堆叠柱状图视图 - 粗拣细拣对比 */}
      {activeView === 'stacked' && (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">粗拣与细拣作业对比分析</h3>
              <p className="text-sm text-gray-600 mt-1">
                堆叠柱状图展示每位工人的粗拣和细拣数量分布
              </p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={stackedData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: '处理数量 (件)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    label={{ value: '效率 (件/小时)', angle: 90, position: 'insideRight' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => {
                      if (name.includes('效率')) {
                        return [`${value.toFixed(2)} 件/小时`, name];
                      }
                      return [`${value} 件`, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="coarseCount" stackId="a" fill="#f97316" name="粗拣数量">
                    <LabelList dataKey="coarseCount" position="inside" fill="#fff" fontSize={10} />
                  </Bar>
                  <Bar yAxisId="left" dataKey="fineCount" stackId="a" fill="#ec4899" name="细拣数量">
                    <LabelList dataKey="fineCount" position="inside" fill="#fff" fontSize={10} />
                  </Bar>
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="coarseEfficiency" 
                    stroke="#dc2626" 
                    strokeWidth={3}
                    dot={{ fill: '#dc2626', r: 5 }}
                    name="粗拣效率"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="fineEfficiency" 
                    stroke="#be185d" 
                    strokeWidth={3}
                    dot={{ fill: '#be185d', r: 5 }}
                    strokeDasharray="5 5"
                    name="细拣效率"
                  />
                  {/* 粗拣基准线 */}
                  <ReferenceLine 
                    yAxisId="right"
                    y={benchmarkValues.coarseBenchmark}
                    stroke="#f97316" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: `粗拣基准`, fill: '#f97316', fontSize: 10 }}
                  />
                  {/* 细拣基准线 */}
                  <ReferenceLine 
                    yAxisId="right"
                    y={benchmarkValues.fineBenchmark}
                    stroke="#ec4899" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: `细拣基准`, fill: '#ec4899', fontSize: 10 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* 分析洞察 */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    粗拣作业分析
                  </h4>
                  <div className="space-y-2 text-sm text-orange-700">
                    <p>• 平均粗拣数量: {(stackedData.reduce((sum, d) => sum + d.coarseCount, 0) / stackedData.length).toFixed(0)} 件</p>
                    <p>• 平均粗拣效率: {(stackedData.reduce((sum, d) => sum + d.coarseEfficiency, 0) / stackedData.length).toFixed(2)} 件/小时</p>
                    <p>• 粗拣占比: {((stackedData.reduce((sum, d) => sum + d.coarseCount, 0) / stackedData.reduce((sum, d) => sum + d.total, 0)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h4 className="font-semibold text-pink-900 mb-2 flex items-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                    细拣作业分析
                  </h4>
                  <div className="space-y-2 text-sm text-pink-700">
                    <p>• 平均细拣数量: {(stackedData.reduce((sum, d) => sum + d.fineCount, 0) / stackedData.length).toFixed(0)} 件</p>
                    <p>• 平均细拣效率: {(stackedData.reduce((sum, d) => sum + d.fineEfficiency, 0) / stackedData.length).toFixed(2)} 件/小时</p>
                    <p>• 细拣占比: {((stackedData.reduce((sum, d) => sum + d.fineCount, 0) / stackedData.reduce((sum, d) => sum + d.total, 0)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 绩效排名视图 */}
      {activeView === 'ranking' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-500" />
              员工绩效排名与等级评定
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              根据总效率进行排名，并展示各项作业的等级评定
            </p>
          </div>
          <div className="p-6">
            {/* 前三名特别展示 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {rankingData.slice(0, 3).map((worker, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                const colors = [
                  'from-yellow-50 to-yellow-100 border-yellow-300',
                  'from-gray-50 to-gray-100 border-gray-300',
                  'from-orange-50 to-orange-100 border-orange-300'
                ];
                return (
                  <div key={worker.name} className={`bg-gradient-to-br ${colors[index]} border-2 rounded-xl p-6 text-center`}>
                    <div className="text-4xl mb-2">{medals[index]}</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{worker.name}</h4>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{worker.totalEfficiency.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 mb-3">件/小时</div>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" 
                            style={{ backgroundColor: `${worker.grade.color}20`, color: worker.grade.color }}>
                        {worker.grade.grade}级
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <div className="text-gray-600">粗拣</div>
                        <div className="font-semibold text-orange-600">{worker.coarseEfficiency.toFixed(1)}</div>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <div className="text-gray-600">细拣</div>
                        <div className="font-semibold text-pink-600">{worker.fineEfficiency.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 完整排名表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总效率</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">综合等级</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">粗拣</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">细拣</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总处理量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工作时长</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankingData.map((worker) => (
                    <tr key={worker.name} className={`hover:bg-gray-50 ${worker.rank <= 3 ? 'bg-yellow-50 bg-opacity-30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-lg font-bold ${worker.rank <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            #{worker.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{worker.totalEfficiency.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">件/小时</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" 
                              style={{ backgroundColor: `${worker.grade.color}20`, color: worker.grade.color }}>
                          {worker.grade.grade}级 - {worker.grade.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{worker.coarseEfficiency.toFixed(2)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" 
                                style={{ backgroundColor: `${worker.coarseGrade.color}20`, color: worker.coarseGrade.color }}>
                            {worker.coarseGrade.grade}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{worker.fineEfficiency.toFixed(2)}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" 
                                style={{ backgroundColor: `${worker.fineGrade.color}20`, color: worker.fineGrade.color }}>
                            {worker.fineGrade.grade}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.totalItems} 件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.totalWorkingHours.toFixed(2)} 小时
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 等级说明 - 基于基准值动态生成 */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  动态等级评定标准
                </h4>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  基于基准值自动计算
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700 mb-2 flex items-center">
                    <span>总效率等级</span>
                    <span className="ml-2 text-xs text-gray-500">(总件数/总工时)</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#8b5cf6' }}>S:</span>
                        <span className="text-gray-600">≥{(((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2) * 1.8).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(180%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#3b82f6' }}>A:</span>
                        <span className="text-gray-600">≥{(((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2) * 1.4).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(140%)</span>
                    </div>
                    <div className="flex items-center justify-between bg-green-50 px-2 py-0.5 rounded">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#10b981' }}>B:</span>
                        <span className="text-gray-900 font-semibold">≥{((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-green-700 font-medium">基准</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#f59e0b' }}>C:</span>
                        <span className="text-gray-600">≥{(((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2) * 0.7).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(70%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-8 font-medium" style={{ color: '#ef4444' }}>D:</span>
                      <span className="text-gray-600">&lt;{(((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2) * 0.7).toFixed(0)} 件/小时</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 mb-2 flex items-center">
                    <span>粗拣效率等级</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#8b5cf6' }}>S:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.coarseBenchmark * 1.8).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(180%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#3b82f6' }}>A:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.coarseBenchmark * 1.4).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(140%)</span>
                    </div>
                    <div className="flex items-center justify-between bg-orange-50 px-2 py-0.5 rounded">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#10b981' }}>B:</span>
                        <span className="text-gray-900 font-semibold">≥{benchmarkValues.coarseBenchmark} 件/小时</span>
                      </div>
                      <span className="text-xs text-orange-700 font-medium">基准</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#f59e0b' }}>C:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.coarseBenchmark * 0.7).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(70%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-8 font-medium" style={{ color: '#ef4444' }}>D:</span>
                      <span className="text-gray-600">&lt;{(benchmarkValues.coarseBenchmark * 0.7).toFixed(0)} 件/小时</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700 mb-2 flex items-center">
                    <span>细拣效率等级</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#8b5cf6' }}>S:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.fineBenchmark * 1.8).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(180%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#3b82f6' }}>A:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.fineBenchmark * 1.4).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(140%)</span>
                    </div>
                    <div className="flex items-center justify-between bg-pink-50 px-2 py-0.5 rounded">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#10b981' }}>B:</span>
                        <span className="text-gray-900 font-semibold">≥{benchmarkValues.fineBenchmark} 件/小时</span>
                      </div>
                      <span className="text-xs text-pink-700 font-medium">基准</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 font-medium" style={{ color: '#f59e0b' }}>C:</span>
                        <span className="text-gray-600">≥{(benchmarkValues.fineBenchmark * 0.7).toFixed(0)} 件/小时</span>
                      </div>
                      <span className="text-xs text-gray-400">(70%)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-8 font-medium" style={{ color: '#ef4444' }}>D:</span>
                      <span className="text-gray-600">&lt;{(benchmarkValues.fineBenchmark * 0.7).toFixed(0)} 件/小时</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  💡 等级标准基于您设置的基准值动态计算，B级(合格)对应100%基准值，修改基准值后等级标准会自动调整
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCharts;

