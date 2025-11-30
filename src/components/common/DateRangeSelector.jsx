import { Calendar, Search } from 'lucide-react';

const DateRangeSelector = ({ baseRange, compareRange, onBaseRangeChange, onCompareRangeChange, onSearch }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* 基准数据时间范围 */}
        <div className="flex-1 space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 mr-2 text-primary-600" />
            基准数据时间范围
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={baseRange.start}
              onChange={(e) => onBaseRangeChange({ ...baseRange, start: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={baseRange.end}
              onChange={(e) => onBaseRangeChange({ ...baseRange, end: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* 对比数据时间范围 */}
        <div className="flex-1 space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 mr-2 text-primary-600" />
            对比数据时间范围
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={compareRange.start}
              onChange={(e) => onCompareRangeChange({ ...compareRange, start: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={compareRange.end}
              onChange={(e) => onCompareRangeChange({ ...compareRange, end: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* 搜索按钮 */}
        <div className="flex items-end">
          <button
            onClick={onSearch}
            className="w-full md:w-auto inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
          >
            <Search className="h-4 w-4 mr-2" />
            搜索
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;

