import { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseExcelFile, downloadTemplate } from '../../utils/excelUtils';

const ExcelImport = ({ 
  onImport, 
  importProgress, 
  onNamesUpdate 
}) => {
  const [importStatus, setImportStatus] = useState(null);
  const [importedData, setImportedData] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportStatus({
      type: 'loading',
      message: '正在解析Excel文件...'
    });

    try {
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        setImportStatus({
          type: 'error',
          message: '没有找到有效的数据记录，请检查Excel文件格式'
        });
        return;
      }

      setImportedData(data);
      setImportStatus({
        type: 'success',
        message: `成功解析 ${data.length} 条记录，请检查预览数据`
      });
    } catch (error) {
      console.error('Excel解析失败:', error);
      setImportStatus({
        type: 'error',
        message: `Excel解析失败: ${error.message}`
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (importedData.length === 0) return;

    const success = await onImport(importedData, (progress) => {
      setImportStatus({
        type: 'loading',
        message: `正在导入记录... ${progress}%`
      });
    });

    if (success) {
      onNamesUpdate?.();
      setImportStatus({
        type: 'success',
        message: `成功导入${importedData.length}条记录！`
      });
      setImportedData([]);
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const handleCancelImport = () => {
    setImportedData([]);
    setImportStatus(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary-600" />
          Excel批量导入
        </h3>
        <p className="mt-1 text-sm text-gray-600">上传Excel文件来批量导入生产力记录</p>
      </div>

      <div className="p-6">
        {/* File Upload Area */}
        <div className="mb-6">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">点击上传Excel文件</span> 或拖拽到此处
                </p>
                <p className="text-xs text-gray-500">支持 .xlsx, .xls 格式</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Template Download */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">使用模板文件</h4>
                <p className="text-sm text-blue-700 mb-3">
                  为确保导入成功，建议使用我们提供的Excel模板文件。模板包含正确的列标题和数据格式示例。
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载Excel模板
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {importStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            importStatus.type === 'success' ? 'bg-green-50 border-green-200' :
            importStatus.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start">
              {importStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />}
              {importStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />}
              {importStatus.type === 'loading' && (
                <div className="w-5 h-5 mt-0.5 mr-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  importStatus.type === 'success' ? 'text-green-800' :
                  importStatus.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {importStatus.message}
                </p>
                {importStatus.type === 'loading' && importProgress > 0 && (
                  <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
              {importStatus.type !== 'loading' && (
                <button
                  onClick={() => setImportStatus(null)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Preview Data */}
        {importedData.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">数据预览 ({importedData.length} 条记录)</h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">粗拣时间</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">细拣时间</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">处理数量</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importedData.slice(0, 5).map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-900">{record.date}</td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{record.name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {record.coarseStartTime && record.coarseEndTime 
                            ? `${record.coarseStartTime} - ${record.coarseEndTime}`
                            : '-'
                          }
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {record.fineStartTime && record.fineEndTime 
                            ? `${record.fineStartTime} - ${record.fineEndTime}`
                            : '-'
                          }
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          粗: {record.coarseCount || 0}, 细: {record.fineCount || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importedData.length > 5 && (
                <div className="px-3 py-2 bg-gray-100 text-xs text-gray-500 text-center">
                  还有 {importedData.length - 5} 条记录未显示...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {importedData.length > 0 && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancelImport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消导入
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 transition-colors"
            >
              确认导入 {importedData.length} 条记录
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImport; 