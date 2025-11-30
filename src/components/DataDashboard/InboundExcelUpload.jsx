import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { parseInboundScanExcel } from '../../utils/inboundExcelUtils';
import apiClient from '../../api/apiClient';

const InboundExcelUpload = ({ onUploadSuccess }) => {
  const [uploadStatus, setUploadStatus] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setParseProgress(0);
    setUploadStatus({
      type: 'loading',
      message: '正在解析Excel文件...'
    });

    try {
      const result = await parseInboundScanExcel(file, (progress) => {
        setParseProgress(progress);
        setUploadStatus({
          type: 'loading',
          message: `正在解析Excel文件... ${progress}%`
        });
      });
      
      setParsedData(result);
      
      if (result.records.length === 0) {
        setUploadStatus({
          type: 'error',
          message: '没有找到有效的数据记录'
        });
        return;
      }

      setUploadStatus({
        type: 'success',
        message: `成功解析 ${result.validRows} 条有效记录，${result.errorRows} 条错误记录`
      });
      setParseProgress(100);
    } catch (error) {
      console.error('Excel解析失败:', error);
      setUploadStatus({
        type: 'error',
        message: `Excel解析失败: ${error.message}`
      });
      setParsedData(null);
      setParseProgress(0);
    }

    // Reset file input
    event.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!parsedData || parsedData.records.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus({
      type: 'loading',
      message: '正在上传数据到服务器...'
    });

    try {
      // 模拟上传进度（实际进度由服务器处理时间决定）
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev; // 最多到90%，等待服务器响应
          return prev + 5;
        });
      }, 500);

      const response = await apiClient.inboundData.uploadScans(parsedData.records);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadStatus({
        type: 'success',
        message: `上传成功！导入 ${response.stats.imported} 条记录，跳过 ${response.stats.duplicates} 条重复记录${response.stats.errors > 0 ? `，${response.stats.errors} 条错误` : ''}`
      });

      // 清空数据
      setTimeout(() => {
        setParsedData(null);
        setUploadStatus(null);
        setParseProgress(0);
        setUploadProgress(0);
        onUploadSuccess?.();
      }, 3000);
    } catch (error) {
      console.error('上传失败:', error);
      setUploadStatus({
        type: 'error',
        message: `上传失败: ${error.message}`
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setUploadStatus(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary-600" />
          上传到件扫描数据
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          上传Excel文件，系统会自动检测重复的运单号并跳过
        </p>
      </div>

      <div className="p-6">
        {/* 文件上传区域 */}
        <div className="mb-6">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">点击上传Excel文件</span> 或拖拽到此处
                </p>
                <p className="text-xs text-gray-500">支持 .xlsx, .xls 格式，必须包含：扫描时间、运单号、路由编码</p>
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

        {/* 状态消息 */}
        {uploadStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            uploadStatus.type === 'success' ? 'bg-green-50 border-green-200' :
            uploadStatus.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start">
              {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />}
              {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />}
              {uploadStatus.type === 'loading' && (
                <div className="w-5 h-5 mt-0.5 mr-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  uploadStatus.type === 'success' ? 'text-green-800' :
                  uploadStatus.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {uploadStatus.message}
                </p>
                {uploadStatus.type === 'loading' && (
                  <div className="mt-2">
                    {parseProgress > 0 && (
                      <div className="mb-1">
                        <div className="text-xs text-blue-700 mb-1">解析进度: {parseProgress}%</div>
                        <div className="bg-white rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${parseProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {uploadProgress > 0 && (
                      <div>
                        <div className="text-xs text-blue-700 mb-1">上传进度: {uploadProgress}%</div>
                        <div className="bg-white rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-green-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {uploadStatus.type !== 'loading' && (
                <button
                  onClick={() => setUploadStatus(null)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 数据预览 */}
        {parsedData && parsedData.records.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              数据预览 ({parsedData.validRows} 条有效记录)
            </h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">扫描时间</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">运单号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">路由编码</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.records.slice(0, 10).map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-900">
                          {record.scanTime.toLocaleString('zh-CN')}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900">{record.waybillNumber}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{record.routeCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.records.length > 10 && (
                <div className="px-3 py-2 bg-gray-100 text-xs text-gray-500 text-center">
                  还有 {parsedData.records.length - 10} 条记录未显示...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 错误记录 */}
        {parsedData && parsedData.errors && parsedData.errors.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-red-900 mb-3">
              错误记录 ({parsedData.errors.length} 条)
            </h4>
            <div className="bg-red-50 rounded-lg border border-red-200 overflow-hidden">
              <div className="overflow-x-auto max-h-32">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">行号</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">错误信息</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-red-200">
                    {parsedData.errors.slice(0, 5).map((error, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-xs text-red-900">{error.row}</td>
                        <td className="px-3 py-2 text-xs text-red-800">{error.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {parsedData && parsedData.records.length > 0 && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {uploading ? '上传中...' : `确认上传 ${parsedData.records.length} 条记录`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboundExcelUpload;

