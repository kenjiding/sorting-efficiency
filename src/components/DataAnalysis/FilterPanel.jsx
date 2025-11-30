import { useState, useEffect } from 'react';
import { Filter, ChevronDown, X, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const FilterPanel = ({
  filters,
  availableNames,
  onDateRangeChange,
  onWorkerSelectionChange,
  onFilterReset,
  getDateRangeText
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date(filters.startDate));
  const [endDateObj, setEndDateObj] = useState(new Date(filters.endDate));
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  // Update date picker when filters change
  useEffect(() => {
    setStartDateObj(new Date(filters.startDate));
    setEndDateObj(new Date(filters.endDate));
  }, [filters.startDate, filters.endDate]);

  // Close worker dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.worker-dropdown-container')) {
        setShowWorkerDropdown(false);
      }
    };

    if (showWorkerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showWorkerDropdown]);

  const handleStartDateChange = (date) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      setStartDateObj(date);
      onDateRangeChange(dateStr, filters.endDate);
    }
  };

  const handleEndDateChange = (date) => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      setEndDateObj(date);
      onDateRangeChange(filters.startDate, dateStr);
    }
  };

  const handleQuickFilter = (type) => {
    const today = new Date();
    let startDate, endDate;

    switch (type) {
      case 'today':
        startDate = endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(today), 'yyyy-MM-dd');
        endDate = format(endOfWeek(today), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setStartDateObj(new Date(startDate));
    setEndDateObj(new Date(endDate));
    onDateRangeChange(startDate, endDate);
  };

  const handleWorkerToggle = (workerName) => {
    const currentSelection = filters.selectedNames || [];
    let newSelection;
    
    if (currentSelection.includes(workerName)) {
      newSelection = currentSelection.filter(name => name !== workerName);
    } else {
      newSelection = [...currentSelection, workerName];
    }
    
    onWorkerSelectionChange(newSelection);
  };

  const clearWorkerSelection = () => {
    onWorkerSelectionChange([]);
  };

  // Handle "All" option toggle
  const handleSelectAll = () => {
    const currentSelection = filters.selectedNames || [];
    if (currentSelection.length === availableNames.length) {
      // If all are selected, clear selection
      onWorkerSelectionChange([]);
    } else {
      // If not all are selected, select all
      onWorkerSelectionChange([...availableNames]);
    }
  };

  // Check if all workers are selected
  const isAllSelected = () => {
    return availableNames.length > 0 && filters.selectedNames.length === availableNames.length;
  };

  // Check if some (but not all) workers are selected
  const isIndeterminate = () => {
    return filters.selectedNames.length > 0 && filters.selectedNames.length < availableNames.length;
  };

  // Check if current filter matches quick filter options
  const isToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return filters.startDate === filters.endDate && filters.startDate === today;
  };

  const isThisWeek = () => {
    const today = new Date();
    const weekStart = format(startOfWeek(today), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today), 'yyyy-MM-dd');
    return filters.startDate === weekStart && filters.endDate === weekEnd;
  };

  const isThisMonth = () => {
    const today = new Date();
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    return filters.startDate === monthStart && filters.endDate === monthEnd;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">数据筛选</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="ml-3 text-sm text-primary-600 hover:text-primary-700"
            >
              {showFilters ? '收起' : '展开'}筛选
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-1 inline" />
              {getDateRangeText()}
            </span>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">快速筛选</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickFilter('today')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                isToday()
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              今天
            </button>
            <button
              onClick={() => handleQuickFilter('week')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                isThisWeek()
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              本周
            </button>
            <button
              onClick={() => handleQuickFilter('month')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                isThisMonth()
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              本月
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Filters */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期
              </label>
              <DatePicker
                selected={startDateObj}
                onChange={handleStartDateChange}
                dateFormat="yyyy-MM-dd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholderText="选择开始日期"
                selectsStart
                startDate={startDateObj}
                endDate={endDateObj}
              />
            </div>

            {/* End Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束日期
              </label>
              <DatePicker
                selected={endDateObj}
                onChange={handleEndDateChange}
                dateFormat="yyyy-MM-dd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholderText="选择结束日期"
                selectsEnd
                startDate={startDateObj}
                endDate={endDateObj}
                minDate={startDateObj}
              />
            </div>

            {/* Multi-select Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                工人筛选 (多选)
              </label>
              <div className="relative worker-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-left"
                >
                  {filters.selectedNames.length === 0 
                    ? `所有工人 (${availableNames.length}人)`
                    : filters.selectedNames.length === availableNames.length
                    ? `全部工人 (${availableNames.length}人)`
                    : filters.selectedNames.length === 1
                    ? filters.selectedNames[0]
                    : `已选择 ${filters.selectedNames.length} 人`
                  }
                </button>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
                
                {/* Multi-select Dropdown */}
                {showWorkerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {filters.selectedNames.length === 0 
                            ? `未选择任何工人 (共${availableNames.length}人)`
                            : filters.selectedNames.length === availableNames.length
                            ? `已选择全部工人 (${availableNames.length}/${availableNames.length})`
                            : `已选择 ${filters.selectedNames.length} / ${availableNames.length} 人`
                          }
                        </span>
                        {filters.selectedNames.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearWorkerSelection();
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            清空选择
                          </button>
                        )}
                      </div>
                      {filters.selectedNames.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          💡 {filters.selectedNames.length === availableNames.length 
                            ? '已选择全部工人，将显示所有工人的记录'
                            : '筛选将只显示所选工人在当前时间范围内的记录'
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="p-1">
                      {/* Select All option */}
                      <label className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer rounded bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isAllSelected()}
                          ref={(input) => {
                            if (input) input.indeterminate = isIndeterminate();
                          }}
                          onChange={handleSelectAll}
                          className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {isAllSelected() ? '取消全选' : '选择全部'}
                        </span>
                        {availableNames.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({availableNames.length}人)
                          </span>
                        )}
                      </label>
                      
                      {/* Separator */}
                      {availableNames.length > 0 && (
                        <div className="border-t border-gray-200 my-1"></div>
                      )}
                      
                      {/* Individual worker options */}
                      {availableNames.map(name => (
                        <label
                          key={name}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={filters.selectedNames.includes(name)}
                            onChange={() => handleWorkerToggle(name)}
                            className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900">{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current View Info */}
      <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-blue-800">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {getDateRangeText()}
            </span>
            {filters.selectedNames.length > 0 && filters.selectedNames.length < availableNames.length && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  🔍 筛选: {filters.selectedNames.length > 3 ? `${filters.selectedNames.slice(0, 3).join(', ')}...` : filters.selectedNames.join(', ')}
                </span>
              </div>
            )}
          </div>
          {((filters.selectedNames.length > 0 && filters.selectedNames.length < availableNames.length) || filters.startDate !== filters.endDate) && (
            <button
              onClick={onFilterReset}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              重置筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel; 