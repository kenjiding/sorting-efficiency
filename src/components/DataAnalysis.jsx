import { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { exportToExcel, exportToCSV } from '../utils/excelUtils';
import { format } from 'date-fns';
import EditRecordModal from './EditRecordModal';
import FilterPanel from './DataAnalysis/FilterPanel';
import StatisticsCards from './DataAnalysis/StatisticsCards';
import ChartSection from './DataAnalysis/ChartSection';
import AdvancedCharts from './DataAnalysis/AdvancedCharts';
import BenchmarkSettings from './DataAnalysis/BenchmarkSettings';
import DataTable from './DataAnalysis/DataTable';
import ExportActions from './DataAnalysis/ExportActions';

const DataAnalysis = () => {
  const {
    filteredRecords,
    filters,
    benchmarkValues,
    setDateRange,
    setSelectedNames,
    loadFilteredRecords,
    getUniqueNames,
    getChartData,
    updateRecord,
    deleteRecord,
    bulkDeleteRecords,
    bulkUpdateRecords,
    setBenchmarkValues,
    loadBenchmarkValues,
    loading
  } = useStore();

  const [availableNames, setAvailableNames] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load available names for filtering and initial data
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        const names = await getUniqueNames();
        if (isMounted) {
          setAvailableNames(names);
          loadBenchmarkValues(); // Load saved benchmark values
        }
      } catch (error) {
        console.error('加载初始数据失败:', error);
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false; // 清理函数，防止内存泄漏
    };
  }, []); // 只在组件挂载时执行一次

  // Reload filtered records when filters change
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await loadFilteredRecords();
      } catch (error) {
        if (isMounted) {
          console.error('加载数据失败:', error);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [filters.startDate, filters.endDate, filters.selectedNames.join(',')]); // 使用join避免数组引用变化

  // Prepare chart data
  const chartData = useMemo(() => {
    return getChartData(filteredRecords);
  }, [filteredRecords]); // 只依赖 filteredRecords，移除函数依赖

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        totalRecords: 0,
        totalWorkers: 0,
        avgCoarseEfficiency: 0,
        avgFineEfficiency: 0,
        totalItems: 0,
        totalHours: 0
      };
    }

    const uniqueWorkers = new Set(filteredRecords.map(r => r.name));
    const totalCoarseEfficiency = filteredRecords.reduce((sum, r) => sum + (Number(r.coarseEfficiency) || 0), 0);
    const totalFineEfficiency = filteredRecords.reduce((sum, r) => sum + (Number(r.fineEfficiency) || 0), 0);
    const totalItems = filteredRecords.reduce((sum, r) => sum + (Number(r.coarseCount) || 0) + (Number(r.fineCount) || 0), 0);
    const totalHours = filteredRecords.reduce((sum, r) => sum + (Number(r.totalWorkingHours) || 0), 0);

    return {
      totalRecords: filteredRecords.length,
      totalWorkers: uniqueWorkers.size,
      avgCoarseEfficiency: (totalCoarseEfficiency / filteredRecords.length).toFixed(2),
      avgFineEfficiency: (totalFineEfficiency / filteredRecords.length).toFixed(2),
      totalItems,
      totalHours: totalHours.toFixed(2)
    };
  }, [filteredRecords]);

  // Handler functions for child components
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleSaveRecord = async (id, updatedData) => {
    const success = await updateRecord(id, updatedData);
    return success;
  };

  const handleDeleteRecord = async (record) => {
    if (window.confirm(`确定要删除 ${record.name} 在 ${record.date} 的记录吗？`)) {
      await deleteRecord(record.id);
    }
  };

  const handleBulkDelete = async (ids) => {
    const success = await bulkDeleteRecords(ids);
    return success;
  };

  const handleBulkUpdateTime = async (ids, updates) => {
    const success = await bulkUpdateRecords(ids, updates);
    return success;
  };

  const getDateRangeText = () => {
    if (filters.startDate === filters.endDate) {
      return format(new Date(filters.startDate), 'yyyy年MM月dd日');
    } else {
      return `${format(new Date(filters.startDate), 'yyyy年MM月dd日')} 至 ${format(new Date(filters.endDate), 'yyyy年MM月dd日')}`;
    }
  };

  const handleDateRangeChange = (startDate, endDate) => {
    setDateRange(startDate, endDate);
  };

  const handleWorkerSelectionChange = (selectedNames) => {
    setSelectedNames(selectedNames);
  };

  const handleFilterReset = () => {
    setSelectedNames([]);
    const today = format(new Date(), 'yyyy-MM-dd');
    setDateRange(today, today);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">数据分析仪表板</h2>
              <p className="mt-1 text-sm text-gray-600">
                查看和分析工人生产力数据，支持多维度筛选和图表展示
              </p>
            </div>
            <div>
              <BenchmarkSettings 
                benchmarkValues={benchmarkValues}
                onSave={setBenchmarkValues}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        availableNames={availableNames}
        onDateRangeChange={handleDateRangeChange}
        onWorkerSelectionChange={handleWorkerSelectionChange}
        onFilterReset={handleFilterReset}
        getDateRangeText={getDateRangeText}
      />

      {/* Statistics Cards */}
      <StatisticsCards stats={summaryStats} />

      {/* Charts Section */}
      <ChartSection 
        chartData={chartData} 
        getDateRangeText={getDateRangeText}
        benchmarkValues={benchmarkValues}
      />

      {/* Advanced Charts Section */}
      <AdvancedCharts 
        chartData={chartData} 
        getDateRangeText={getDateRangeText}
        benchmarkValues={benchmarkValues}
      />

      {/* Data Table with Pagination */}
      <DataTable
        records={filteredRecords}
        onEdit={handleEditRecord}
        onDelete={handleDeleteRecord}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateTime={handleBulkUpdateTime}
        filters={filters}
        availableNames={availableNames}
        getDateRangeText={getDateRangeText}
      />

      {/* Export Actions */}
      <ExportActions
        records={filteredRecords}
        onExportExcel={exportToExcel}
        onExportCSV={exportToCSV}
        filters={filters}
        getDateRangeText={getDateRangeText}
      />

      {/* Edit Record Modal */}
      <EditRecordModal
        record={editingRecord}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        loading={loading}
      />
    </div>
  );
};

export default DataAnalysis; 