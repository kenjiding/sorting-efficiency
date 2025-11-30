import { Download, FileText, Users, TrendingUp } from 'lucide-react';

const ExportActions = ({ 
  records, 
  onExportExcel, 
  onExportCSV, 
  filters, 
  getDateRangeText 
}) => {
  const handleExportExcel = () => {
    try {
      const filename = `productivity_summary_${filters.startDate}_${filters.endDate}`;
      onExportExcel(records, filename);
    } catch (error) {
      alert(`导出失败：${error.message}`);
    }
  };

  const handleExportCSV = () => {
    try {
      const filename = `productivity_summary_${filters.startDate}_${filters.endDate}`;
      onExportCSV(records, filename);
    } catch (error) {
      alert(`导出失败：${error.message}`);
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <FileText className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">没有可导出的数据</p>
        </div>
      </div>
    );
  }

  // 计算唯一员工数量
  const uniqueWorkers = new Set(records.map(r => r.name)).size;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Download className="h-5 w-5 mr-2 text-gray-600" />
          数据导出
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          导出整合后的员工生产力汇总数据 ({getDateRangeText()})
        </p>
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <FileText className="h-3 w-3 mr-1" />
            <span>原始记录：{records.length} 条</span>
          </div>
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span>员工数量：{uniqueWorkers} 人</span>
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>按粗分效率排序</span>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4">
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">导出说明</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 自动合并同一员工的多条记录</li>
            <li>• 计算总数量、总工时和各项效率</li>
            <li>• 按粗分效率从高到低排序</li>
            <li>• 显示排名、日期范围等汇总信息</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportExcel}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          >
            <FileText className="h-4 w-4 mr-2" />
            导出为 Excel
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            导出为 CSV
          </button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>导出的文件包含：排名、姓名、记录数量、日期范围、总数量、总工时、各项效率等汇总信息</p>
        </div>
      </div>
    </div>
  );
};

export default ExportActions; 