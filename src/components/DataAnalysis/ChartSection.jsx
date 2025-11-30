import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';

const ChartSection = ({ chartData, getDateRangeText, benchmarkValues }) => {
  // Global chart mode state
  const [chartMode, setChartMode] = useState('总量'); // '粗拣', '细拣', '总量'
  
  // 根据员工数量动态计算图表高度
  const getChartHeight = (dataLength) => {
    const baseHeight = 300;
    const minHeight = 300;
    const maxHeight = 800; // 增加最大高度以适应更多员工
    // 每增加一个员工，增加12px高度
    const dynamicHeight = baseHeight + Math.max(0, (dataLength - 5) * 12);
    return Math.min(Math.max(dynamicHeight, minHeight), maxHeight);
  };
  
  const chartHeight = getChartHeight(chartData?.length || 0);
  
  // 判断是否需要使用单列布局（员工数量多时）
  const shouldUseSingleColumn = chartData?.length > 12;

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-8 text-center border border-gray-200">
        <div className="text-gray-400 mb-4">
          <BarChart3 className="mx-auto h-16 w-16" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无图表数据</h3>
        <p className="text-gray-500">
          当前筛选条件下没有找到可用于生成图表的数据
        </p>
      </div>
    );
  }

  const formatTooltip = (value, name) => {
    // 根据dataKey和name来格式化显示
    if (name === '粗拣效率' || name === '细拣效率' || name === '总量效率' || name.includes('效率')) {
      return [`${value} 件/小时`, name];
    }
    if (name === '总处理数量' || name === '粗拣数量' || name === '细拣数量' || name.includes('数量')) {
      return [`${value} 件`, name];
    }
    return [value, name];
  };

  return (
    <div className="space-y-6">
      {/* Global Chart Mode Selector */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              数据可视化分析 - {chartMode === '总量' ? '总量数据视图' : chartMode === '粗拣' ? '粗拣专项视图' : '细拣专项视图'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {chartMode === '总量' ? '显示所有工人的总量效率和处理数量' : 
               chartMode === '粗拣' ? '专注分析粗拣作业的效率和数量数据' : 
               '专注分析细拣作业的效率和数量数据'}
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['粗拣', '细拣', '总量'].map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  chartMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Charts Grid - 自适应布局 */}
      <div className={`grid gap-6 ${shouldUseSingleColumn ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {/* Bar Chart - Efficiency Comparison */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {getDateRangeText()} - 各工人{chartMode === '总量' ? '总量数据' : chartMode === '粗拣' ? '粗拣数据' : '细拣数据'}对比
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {chartMode === '总量' ? '显示所有工人的总处理数量和总量效率' : 
             chartMode === '粗拣' ? '显示所有工人的粗拣处理数量和效率' : 
             '显示所有工人的细拣处理数量和效率'}
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: Math.max(60, chartData?.length * 8) }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: Math.max(9, 14 - Math.floor(chartData?.length / 10)) }}
                angle={chartData?.length > 8 ? -45 : 0}
                textAnchor={chartData?.length > 8 ? "end" : "middle"}
                height={chartData?.length > 8 ? Math.max(80, Math.min(chartData.length * 6, 150)) : 40}
                interval={0}
              />
              <YAxis 
                label={{ 
                  value: chartMode === '总量' ? '总量数据' : 
                         chartMode === '粗拣' ? '粗拣数据' : '细拣数据',
                  angle: -90, 
                  position: 'insideLeft' 
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name.includes('效率')) {
                    return [`${value} 件/小时`, name];
                  }
                  return [`${value} 件`, name];
                }}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {chartMode === '总量' && (
                <>
                  <Bar 
                    dataKey="totalItems" 
                    fill="#3b82f6" 
                    name="总处理数量"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="totalEfficiency"
                    fill="#8b5cf6" 
                    name="总量效率"
                    radius={[2, 2, 0, 0]}
                  />
                  <ReferenceLine 
                    y={(benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: `基准线: ${((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2).toFixed(0)}`, fill: '#16a34a', fontSize: 12 }}
                  />
                </>
              )}
              {chartMode === '粗拣' && (
                <>
                  <Bar 
                    dataKey="totalCoarseCount" 
                    fill="#f97316" 
                    name="粗拣数量"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="coarseEfficiency" 
                    fill="#dc2626" 
                    name="粗拣效率"
                    radius={[2, 2, 0, 0]}
                  />
                  <ReferenceLine 
                    y={benchmarkValues.coarseBenchmark} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: `粗拣基准: ${benchmarkValues.coarseBenchmark}`, fill: '#16a34a', fontSize: 12 }}
                  />
                </>
              )}
              {chartMode === '细拣' && (
                <>
                  <Bar 
                    dataKey="totalFineCount" 
                    fill="#ec4899" 
                    name="细拣数量"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="fineEfficiency" 
                    fill="#7c3aed" 
                    name="细拣效率"
                    radius={[2, 2, 0, 0]}
                  />
                  <ReferenceLine 
                    y={benchmarkValues.fineBenchmark} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: `细拣基准: ${benchmarkValues.fineBenchmark}`, fill: '#16a34a', fontSize: 12 }}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart - Total Items Processed */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {getDateRangeText()} - 各工人{chartMode === '总量' ? '总量数据' : chartMode === '粗拣' ? '粗拣数据' : '细拣数据'}趋势
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            显示工人{chartMode === '总量' ? '总处理数量和总量效率' : chartMode === '粗拣' ? '粗拣数量和效率' : '细拣数量和效率'}的变化趋势
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart 
              data={chartData?.map(item => ({
                ...item,
                // 确保所有数值字段都是有效数字，避免LineChart跳过数据点
                totalItems: typeof item.totalItems === 'number' ? item.totalItems : 0,
                totalEfficiency: typeof item.totalEfficiency === 'number' ? item.totalEfficiency : 0,
                coarseEfficiency: typeof item.coarseEfficiency === 'number' ? item.coarseEfficiency : 0,
                fineEfficiency: typeof item.fineEfficiency === 'number' ? item.fineEfficiency : 0,
                totalCoarseCount: typeof item.totalCoarseCount === 'number' ? item.totalCoarseCount : 0,
                totalFineCount: typeof item.totalFineCount === 'number' ? item.totalFineCount : 0
              })) || []} 
              margin={{ top: 20, right: 60, left: 20, bottom: Math.max(60, chartData?.length * 8) }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: Math.max(9, 14 - Math.floor(chartData?.length / 10)) }}
                angle={chartData?.length > 8 ? -45 : 0}
                textAnchor={chartData?.length > 8 ? "end" : "middle"}
                height={chartData?.length > 8 ? Math.max(80, Math.min(chartData.length * 6, 150)) : 40}
                type="category"
                allowDuplicatedCategory={false}
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                label={{ value: '处理数量 (件)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
                type="number"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: '效率 (件/小时)', angle: 90, position: 'insideRight' }}
                tick={{ fontSize: 12 }}
                type="number"
                domain={[0, 'dataMax']}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {chartMode === '总量' && (
                <>
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="totalItems" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    connectNulls={true}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    name="总处理数量"
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="totalEfficiency" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                    name="总量效率"
                    isAnimationActive={false}
                  />
                  <ReferenceLine 
                    yAxisId="right"
                    y={(benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: `基准: ${((benchmarkValues.coarseBenchmark + benchmarkValues.fineBenchmark) / 2).toFixed(0)}`, fill: '#16a34a', fontSize: 11, position: 'right' }}
                  />
                </>
              )}
              {chartMode === '粗拣' && (
                <>
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="totalCoarseCount" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    connectNulls={true}
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                    name="粗拣数量"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="coarseEfficiency" 
                    stroke="#dc2626" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
                    name="粗拣效率"
                  />
                  <ReferenceLine 
                    yAxisId="right"
                    y={benchmarkValues.coarseBenchmark} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: `粗拣基准: ${benchmarkValues.coarseBenchmark}`, fill: '#16a34a', fontSize: 11, position: 'right' }}
                  />
                </>
              )}
              {chartMode === '细拣' && (
                <>
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="totalFineCount" 
                    stroke="#ec4899" 
                    strokeWidth={3}
                    connectNulls={true}
                    dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ec4899', strokeWidth: 2 }}
                    name="细拣数量"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="fineEfficiency" 
                    stroke="#7c3aed" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    connectNulls={true}
                    dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#7c3aed', strokeWidth: 2 }}
                    name="细拣效率"
                  />
                  <ReferenceLine 
                    yAxisId="right"
                    y={benchmarkValues.fineBenchmark} 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: `细拣基准: ${benchmarkValues.fineBenchmark}`, fill: '#16a34a', fontSize: 11, position: 'right' }}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart - Efficiency Distribution */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {getDateRangeText()} - {chartMode === '总量' ? '总量效率' : chartMode === '粗拣' ? '粗拣效率' : '细拣效率'}分布占比
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            圆环图显示各工人的{chartMode === '总量' ? '总量效率' : chartMode === '粗拣' ? '粗拣效率' : '细拣效率'}占比
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={Math.max(350, chartHeight)}>
            <PieChart>
              <Pie
                data={chartData.map((item, index) => {
                  let dataValue;
                  switch(chartMode) {
                    case '粗拣':
                      dataValue = item.coarseEfficiency;
                      break;
                    case '细拣':
                      dataValue = item.fineEfficiency;
                      break;
                    default: // '总量'
                      dataValue = item.totalEfficiency;
                      break;
                  }
                  return {
                    ...item,
                    currentValue: dataValue,
                    color: `hsl(${(index * 360) / chartData.length}, 70%, 50%)`
                  };
                })}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="currentValue"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
                fontSize={Math.max(10, 14 - Math.floor(chartData?.length / 15))}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`hsl(${(index * 360) / chartData.length}, 70%, 50%)`}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [
                  `${value.toFixed(2)} 件/小时`, 
                  chartMode === '总量' ? '总量效率' : 
                  chartMode === '粗拣' ? '粗拣效率' : '细拣效率'
                ]}
                labelFormatter={(label) => `工人: ${label}`}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {chartData.map((item, index) => {
              let displayValue;
              switch(chartMode) {
                case '粗拣':
                  displayValue = item.coarseEfficiency;
                  break;
                case '细拣':
                  displayValue = item.fineEfficiency;
                  break;
                default: // '总量'
                  displayValue = item.totalEfficiency;
                  break;
              }
              
              return (
                <div key={item.name} className="flex items-center">
                  <div 
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: `hsl(${(index * 360) / chartData.length}, 70%, 50%)` }}
                  ></div>
                  <span className={`text-gray-600 ${chartData.length > 15 ? 'text-xs' : 'text-sm'}`}>
                    {item.name}: {displayValue.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radar Chart - Multi-dimensional Analysis */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {getDateRangeText()} - {chartMode === '总量' ? '多维度总量分析' : chartMode === '粗拣' ? '粗拣多维度分析' : '细拣多维度分析'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            雷达图展示工人在{chartMode === '总量' ? '多个维度的总量表现' : chartMode === '粗拣' ? '粗拣作业的多维度表现' : '细拣作业的多维度表现'}
          </p>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart 
              data={(() => {
                // 准备雷达图数据 - 根据模式显示不同维度
                if (chartData.length === 0) return [];
                
                const maxCoarse = Math.max(...chartData.map(d => d.coarseEfficiency));
                const maxFine = Math.max(...chartData.map(d => d.fineEfficiency));
                const maxTotal = Math.max(...chartData.map(d => d.totalItems));
                const maxCoarseCount = Math.max(...chartData.map(d => d.totalCoarseCount));
                const maxFineCount = Math.max(...chartData.map(d => d.totalFineCount));
                const maxHours = Math.max(...chartData.map(d => d.totalWorkingHours));
                
                let dimensions;
                if (chartMode === '粗拣') {
                  dimensions = ['粗拣效率', '粗拣数量', '工作时长', '专业表现'];
                } else if (chartMode === '细拣') {
                  dimensions = ['细拣效率', '细拣数量', '工作时长', '专业表现'];
                } else { // 总量
                  dimensions = ['粗拣效率', '细拣效率', '总处理量', '工作时长', '综合表现'];
                }
                
                return dimensions.map(dimension => {
                  const dataPoint = { subject: dimension };
                  
                  chartData.forEach(worker => {
                    let value = 0;
                    switch(dimension) {
                      case '粗拣效率':
                        value = maxCoarse > 0 ? (worker.coarseEfficiency / maxCoarse * 100) : 0;
                        break;
                      case '细拣效率':
                        value = maxFine > 0 ? (worker.fineEfficiency / maxFine * 100) : 0;
                        break;
                      case '粗拣数量':
                        value = maxCoarseCount > 0 ? (worker.totalCoarseCount / maxCoarseCount * 100) : 0;
                        break;
                      case '细拣数量':
                        value = maxFineCount > 0 ? (worker.totalFineCount / maxFineCount * 100) : 0;
                        break;
                      case '总处理量':
                        value = maxTotal > 0 ? (worker.totalItems / maxTotal * 100) : 0;
                        break;
                      case '工作时长':
                        value = maxHours > 0 ? (worker.totalWorkingHours / maxHours * 100) : 0;
                        break;
                      case '专业表现':
                        if (chartMode === '粗拣') {
                          value = (
                            (maxCoarse > 0 ? worker.coarseEfficiency / maxCoarse * 50 : 0) +
                            (maxCoarseCount > 0 ? worker.totalCoarseCount / maxCoarseCount * 50 : 0)
                          );
                        } else if (chartMode === '细拣') {
                          value = (
                            (maxFine > 0 ? worker.fineEfficiency / maxFine * 50 : 0) +
                            (maxFineCount > 0 ? worker.totalFineCount / maxFineCount * 50 : 0)
                          );
                        }
                        break;
                      case '综合表现':
                        value = (
                          (maxCoarse > 0 ? worker.coarseEfficiency / maxCoarse * 25 : 0) +
                          (maxFine > 0 ? worker.fineEfficiency / maxFine * 25 : 0) +
                          (maxTotal > 0 ? worker.totalItems / maxTotal * 25 : 0) +
                          (maxHours > 0 ? worker.totalWorkingHours / maxHours * 25 : 0)
                        );
                        break;
                    }
                    dataPoint[worker.name] = Number(value.toFixed(1));
                  });
                  
                  return dataPoint;
                });
              })()}
              margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
            >
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="subject"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                className="text-gray-600"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickCount={6}
              />
              {chartData.map((worker, index) => (
                <Radar
                  key={worker.name}
                  name={worker.name}
                  dataKey={worker.name}
                  stroke={`hsl(${(index * 360) / chartData.length}, 70%, 50%)`}
                  fill={`hsl(${(index * 360) / chartData.length}, 70%, 50%)`}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={{ r: 4, fill: `hsl(${(index * 360) / chartData.length}, 70%, 50%)` }}
                />
              ))}
              <Tooltip 
                formatter={(value, name) => [`${value}%`, name]}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
          
          {/* Performance Metrics */}
          <div className={`mt-4 grid gap-3 text-center ${chartMode === '总量' ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
            {chartMode === '粗拣' && (
              <>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-xs text-orange-600 font-medium">粗拣效率</div>
                  <div className="text-sm text-orange-800">相对表现</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">粗拣数量</div>
                  <div className="text-sm text-blue-800">处理数量</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">工作时长</div>
                  <div className="text-sm text-green-800">投入度</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-xs text-purple-600 font-medium">专业表现</div>
                  <div className="text-sm text-purple-800">粗拣评分</div>
                </div>
              </>
            )}
            {chartMode === '细拣' && (
              <>
                <div className="bg-pink-50 p-3 rounded-lg">
                  <div className="text-xs text-pink-600 font-medium">细拣效率</div>
                  <div className="text-sm text-pink-800">相对表现</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">细拣数量</div>
                  <div className="text-sm text-blue-800">处理数量</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">工作时长</div>
                  <div className="text-sm text-green-800">投入度</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-xs text-purple-600 font-medium">专业表现</div>
                  <div className="text-sm text-purple-800">细拣评分</div>
                </div>
              </>
            )}
            {chartMode === '总量' && (
              <>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-xs text-orange-600 font-medium">粗拣效率</div>
                  <div className="text-sm text-orange-800">相对表现</div>
                </div>
                <div className="bg-pink-50 p-3 rounded-lg">
                  <div className="text-xs text-pink-600 font-medium">细拣效率</div>
                  <div className="text-sm text-pink-800">相对表现</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">总处理量</div>
                  <div className="text-sm text-blue-800">相对表现</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-xs text-green-600 font-medium">工作时长</div>
                  <div className="text-sm text-green-800">投入度</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-xs text-purple-600 font-medium">综合表现</div>
                  <div className="text-sm text-purple-800">总体评分</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChartSection; 