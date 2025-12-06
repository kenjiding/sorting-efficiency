import { Calendar, Filter } from 'lucide-react';

const FilterPanel = ({ 
  dimension, 
  onDimensionChange, 
  dimensions,
  timeUnit,
  onTimeUnitChange,
  timeRange,
  onTimeRangeChange,
  aiAnalysisButton // 可选的AI分析按钮
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* 维度选择 */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
          <Filter className="h-4 w-4 mr-2 text-primary-600" />
          选择维度：
        </label>
        <div className="flex flex-wrap gap-2">
          {dimensions.map((dim) => (
            <button
              key={dim.value}
              onClick={() => onDimensionChange(dim.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                dimension === dim.value
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-primary-300'
              }`}
            >
              {dim.label}
            </button>
          ))}
        </div>
      </div>

      {/* 时间单位选择 */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
          <Calendar className="h-4 w-4 mr-2 text-primary-600" />
          时间单位：
        </label>
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="radio"
              name="timeUnit"
              value="day"
              checked={timeUnit === 'day'}
              onChange={(e) => onTimeUnitChange(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">天</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="timeUnit"
              value="week"
              checked={timeUnit === 'week'}
              onChange={(e) => onTimeUnitChange(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">周</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="timeUnit"
              value="month"
              checked={timeUnit === 'month'}
              onChange={(e) => onTimeUnitChange(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">月</span>
          </label>
        </div>
      </div>

      {/* 时间范围选择和AI分析按钮 */}
      <div className="flex items-end gap-8">
        {timeUnit === 'day' ? (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择时间区间：
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={timeRange.start}
                onChange={(e) => onTimeRangeChange({ ...timeRange, start: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={timeRange.end}
                onChange={(e) => onTimeRangeChange({ ...timeRange, end: e.target.value })}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        ) : null}
        {aiAnalysisButton && (
          <div className="flex items-center flex-shrink-0">
            {aiAnalysisButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;

