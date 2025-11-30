import { useState, useMemo, useEffect } from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import BatchOperationToolbar from './BatchOperationToolbar';

const DataTable = ({ 
  records, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  onBulkUpdateTime,
  filters,
  availableNames,
  getDateRangeText 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecords, setSelectedRecords] = useState([]);

  const getRecordId = (record, fallbackIndex = 0) => {
    const possibleId = record?.id ?? record?._id ?? record?.recordId ?? record?.recordID ?? record?.uuid ?? record?.uniqueId;
    if (possibleId !== undefined && possibleId !== null) {
      return possibleId.toString();
    }
    const namePart = record?.name ? record.name.toString() : 'record';
    const datePart = record?.date ? record.date.toString() : `index-${fallbackIndex}`;
    const coarse = record?.coarseCount ?? '';
    const fine = record?.fineCount ?? '';
    return `fallback-${namePart}-${datePart}-${coarse}-${fine}`;
  };

  // Pagination logic
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return records.slice(startIndex, endIndex);
  }, [records, currentPage, pageSize]);

  const totalPages = Math.ceil(records.length / pageSize);

  // Reset to first page when filtered records change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRecords([]); // Clear selection when records change
  }, [records]);

  // Handle individual record selection
  const handleRecordSelect = (record, isSelected, index = 0) => {
    const recordId = getRecordId(record, index);
    if (isSelected) {
      setSelectedRecords(prev => {
        if (prev.some(item => item.id === recordId)) {
          return prev;
        }
        return [...prev, { id: recordId, record }];
      });
    } else {
      setSelectedRecords(prev => prev.filter(item => item.id !== recordId));
    }
  };

  // Handle select all on current page
  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const newSelections = paginatedRecords.reduce((acc, record, idx) => {
        const globalIndex = (currentPage - 1) * pageSize + idx;
        const recordId = getRecordId(record, globalIndex);
        if (!selectedRecords.some(item => item.id === recordId)) {
          acc.push({ id: recordId, record });
        }
        return acc;
      }, []);
      setSelectedRecords(prev => [...prev, ...newSelections]);
    } else {
      const currentPageIds = paginatedRecords.map((record, idx) => {
        const globalIndex = (currentPage - 1) * pageSize + idx;
        return getRecordId(record, globalIndex);
      });
      setSelectedRecords(prev => prev.filter(item => !currentPageIds.includes(item.id)));
    }
  };

  // Check if all current page records are selected
  const isAllCurrentPageSelected = paginatedRecords.length > 0 && 
    paginatedRecords.every((record, idx) => {
      const globalIndex = (currentPage - 1) * pageSize + idx;
      const recordId = getRecordId(record, globalIndex);
      return selectedRecords.some(selected => selected.id === recordId);
    });

  // Check if some current page records are selected
  const isSomeCurrentPageSelected = paginatedRecords.some((record, idx) => {
    const globalIndex = (currentPage - 1) * pageSize + idx;
    const recordId = getRecordId(record, globalIndex);
    return selectedRecords.some(selected => selected.id === recordId);
  });

  // Handle bulk operations
  const handleBulkDelete = async (ids) => {
    const success = await onBulkDelete(ids);
    if (success) {
      setSelectedRecords([]);
    }
  };

  const handleBulkUpdateTime = async (ids, updates) => {
    const success = await onBulkUpdateTime(ids, updates);
    if (success) {
      setSelectedRecords([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedRecords([]);
  };

  if (records.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 text-center">
        <div className="flex flex-col items-center">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无符合条件的记录</h3>
          <div className="text-sm text-gray-500 space-y-1">
            <p>在 <span className="font-medium">{getDateRangeText()}</span> 时间范围内</p>
            {filters.selectedNames.length > 0 && (
              <p>工人 <span className="font-medium text-blue-600">{filters.selectedNames.join(', ')}</span> 没有记录</p>
            )}
            <p className="mt-3 text-xs">
              💡 提示：尝试调整时间范围或工人筛选条件
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">详细记录</h3>
          <div className="flex items-center space-x-4">
            {filters.selectedNames.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  🔍 筛选: {filters.selectedNames.join(', ')}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-500">
              共 {records.length} 条记录
              {filters.selectedNames.length === 0 && availableNames.length > 0 && (
                <span className="text-gray-400 ml-1">(所有工人)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Operation Toolbar */}
      <BatchOperationToolbar
        selectedRecords={selectedRecords}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateTime={handleBulkUpdateTime}
        onClearSelection={handleClearSelection}
        loading={false}
      />
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeCurrentPageSelected && !isAllCurrentPageSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                粗拣
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                细拣
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                效率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                总时长
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRecords.map((record, index) => {
              const recordId = getRecordId(record, (currentPage - 1) * pageSize + index);
              const isSelected = selectedRecords.some(selected => selected.id === recordId);
              return (
                <tr key={recordId} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleRecordSelect(record, e.target.checked, (currentPage - 1) * pageSize + index)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.date}
                  </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {record.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>
                    {record.coarseStartTime && record.coarseEndTime && (
                      <div className="text-xs">{record.coarseStartTime} - {record.coarseEndTime}</div>
                    )}
                    <div className="text-xs text-gray-500">数量: {record.coarseCount || 0}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>
                    {record.fineStartTime && record.fineEndTime && (
                      <div className="text-xs">{record.fineStartTime} - {record.fineEndTime}</div>
                    )}
                    <div className="text-xs text-gray-500">数量: {record.fineCount || 0}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                      <span>粗: {record.coarseEfficiency || '0.00'}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-pink-500 rounded-full mr-1"></div>
                      <span>细: {record.fineEfficiency || '0.00'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.totalWorkingHours || '0.00'} 小时
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onEdit(record)}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="编辑记录"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(record)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="删除记录"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {records.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 font-medium">
                显示第 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, records.length)} 条，
                共 {records.length} 条记录
              </span>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">每页显示:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value={5}>5条</option>
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                </select>
              </div>
              {totalPages > 1 && (
                <span className="text-xs text-gray-500">
                  第 {currentPage} / {totalPages} 页
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages <= 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {totalPages <= 1 ? (
                  <span className="px-3 py-1 bg-primary-600 text-white rounded text-sm">
                    1
                  </span>
                ) : (
                  Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable; 