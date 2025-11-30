import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import ManualEntryForm from './DataEntry/ManualEntryForm';
import MultiWorkerEntryForm from './DataEntry/MultiWorkerEntryForm';
import ExcelImport from './DataEntry/ExcelImport';

const DataEntry = () => {
  const { addRecord, isSubmitting, bulkImportRecords, importProgress, getUniqueNames } = useStore();
  const [activeTab, setActiveTab] = useState('multi');
  const [availableNames, setAvailableNames] = useState([]);

  // Load available worker names
  useEffect(() => {
    const loadNames = async () => {
      const names = await getUniqueNames();
      setAvailableNames(names);
    };
    loadNames();
  }, [getUniqueNames]);

  // Reload worker names after operations
  const handleNamesUpdate = async () => {
    const names = await getUniqueNames();
    setAvailableNames(names);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">数据录入中心</h2>
              <p className="mt-1 text-sm text-gray-600">
                通过批量录入、单个录入或Excel导入的方式添加生产力记录
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('multi')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'multi'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              批量录入
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manual'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              单个录入
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'excel'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Excel导入
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'multi' && (
        <MultiWorkerEntryForm
          onSubmit={addRecord}
          isSubmitting={isSubmitting}
          availableNames={availableNames}
          onNamesUpdate={handleNamesUpdate}
        />
      )}

      {activeTab === 'manual' && (
        <ManualEntryForm
          onSubmit={addRecord}
          isSubmitting={isSubmitting}
          availableNames={availableNames}
          onNamesUpdate={handleNamesUpdate}
        />
      )}

      {activeTab === 'excel' && (
        <ExcelImport
          onImport={bulkImportRecords}
          importProgress={importProgress}
          onNamesUpdate={handleNamesUpdate}
        />
      )}
    </div>
  );
};

export default DataEntry; 