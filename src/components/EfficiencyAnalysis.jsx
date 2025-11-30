import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Users, TrendingUp, Download, AlertCircle, Calendar, Save, History, Eye, Trash2, MapPin } from 'lucide-react';
import { processEfficiencyData, exportEfficiencyToExcel, exportEfficiencyToCSV, parseExcelFile } from '../utils/efficiencyUtils';
import { efficiencyAnalysisAPI } from '../database/api';
import useStore from '../store/useStore';
import { REGION_NAMES } from '../constants/regions';

const EfficiencyAnalysis = () => {
  const { selectedRegion } = useStore();
  const [scanningData, setScanningData] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [efficiencyResults, setEfficiencyResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingScanning, setUploadingScanning] = useState(false);
  const [uploadingRoute, setUploadingRoute] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [savedResults, setSavedResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  // 加载历史记录 - 当区域变化时重新加载
  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      try {
        await loadHistory();
      } catch (error) {
        if (isMounted) {
          console.error('加载历史记录失败:', error);
        }
      }
    };
    
    load();
    
    return () => {
      isMounted = false;
    };
  }, [selectedRegion]);

  const loadHistory = async () => {
    try {
      const results = await efficiencyAnalysisAPI.getAllAnalysisResults(selectedRegion);
      setSavedResults(results);
    } catch (err) {
      console.error('加载历史记录失败:', err);
    }
  };

  // 保存分析结果
  const saveAnalysisResult = async () => {
    if (!efficiencyResults) return;
    
    setSaving(true);
    try {
      const analysisData = {
        region: selectedRegion, // 添加区域字段
        analysisDate,
        totalScans: efficiencyResults.totalScans,
        averageTotalEfficiency: efficiencyResults.averageTotalEfficiency,
        operators: efficiencyResults.operators,
        scanningDataCount: scanningData.length,
        routeDataCount: routeData.length
      };
      
      await efficiencyAnalysisAPI.saveAnalysisResult(analysisData);
      await loadHistory(); // 重新加载历史记录
      setError('');
      alert('分析结果已保存！');
    } catch (err) {
      setError(`保存失败：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 查看历史记录详情
  const viewHistoryDetail = (result) => {
    setSelectedResult(result);
    setEfficiencyResults({
      totalScans: result.totalScans,
      averageTotalEfficiency: result.averageTotalEfficiency,
      operators: result.operators,
      processedAt: result.createdAt
    });
    setActiveTab('analysis'); // 切换到分析tab
  };

  // 删除历史记录
  const deleteHistoryRecord = async (id) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      await efficiencyAnalysisAPI.deleteAnalysisResult(id);
      await loadHistory();
      setError('');
    } catch (err) {
      setError(`删除失败：${err.message}`);
    }
  };

  // 获取区效率统计
  const getRouteSummary = () => {
    if (!efficiencyResults || !efficiencyResults.routeSummary) return [];
    return efficiencyResults.routeSummary;
  };

  // 处理扫描数据文件上传
  const handleScanningFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingScanning(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = parseExcelFile(e.target.result);
        setScanningData(data);
        setError('');
      } catch (err) {
        setError(`扫描数据文件解析失败：${err.message}`);
      } finally {
        setUploadingScanning(false);
      }
    };
    reader.onerror = () => {
      setError('文件读取失败');
      setUploadingScanning(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // 处理区号数据文件上传
  const handleRouteFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingRoute(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = parseExcelFile(e.target.result);
        setRouteData(data);
        setError('');
      } catch (err) {
        setError(`区号数据文件解析失败：${err.message}`);
      } finally {
        setUploadingRoute(false);
      }
    };
    reader.onerror = () => {
      setError('文件读取失败');
      setUploadingRoute(false);
    };
    reader.readAsArrayBuffer(file);
  }, []);


  // 计算效率
  const calculateEfficiency = useCallback(() => {
    if (scanningData.length === 0 || routeData.length === 0) {
      setError('请先上传两个数据文件');
      return;
    }

    setCalculating(true);
    setError('');

    // 使用setTimeout模拟异步处理，让用户看到loading效果
    setTimeout(() => {
      try {
        const results = processEfficiencyData(scanningData, routeData);
        setEfficiencyResults(results);
      } catch (err) {
        setError(`效率计算失败：${err.message}`);
      } finally {
        setCalculating(false);
      }
    }, 100);
  }, [scanningData, routeData]);

  // 导出Excel
  const handleExportExcel = () => {
    if (!efficiencyResults) return;
    try {
      exportEfficiencyToExcel(efficiencyResults, `efficiency_analysis_${analysisDate}`);
    } catch (err) {
      setError(`导出失败：${err.message}`);
    }
  };

  // 导出CSV
  const handleExportCSV = () => {
    if (!efficiencyResults) return;
    try {
      exportEfficiencyToCSV(efficiencyResults, `efficiency_analysis_${analysisDate}`);
    } catch (err) {
      setError(`导出失败：${err.message}`);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Global Loading Overlay */}
      {(uploadingScanning || uploadingRoute || calculating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {uploadingScanning && '正在解析扫描数据文件...'}
              {uploadingRoute && '正在解析区号数据文件...'}
              {calculating && '正在计算效率分析...'}
            </h3>
            <p className="text-sm text-gray-600">
              {uploadingScanning && '请稍候，正在处理您的Excel文件'}
              {uploadingRoute && '请稍候，正在处理您的Excel文件'}
              {calculating && `正在分析 ${scanningData.length} 条扫描记录和 ${routeData.length} 条区号记录`}
            </p>
            <div className="mt-4 text-xs text-gray-500">
              处理大量数据可能需要一些时间，请耐心等待
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">细分效率分析</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  <MapPin className="w-4 h-4 mr-1" />
                  {REGION_NAMES[selectedRegion]}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                上传扫描数据和区号数据，分析分拣员的工作效率。区号将按前缀（P、X等）进行分组统计。
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <label htmlFor="analysis-date" className="text-sm font-medium text-gray-700">
                  分析日期：
                </label>
                <input
                  id="analysis-date"
                  type="date"
                  value={analysisDate}
                  onChange={(e) => setAnalysisDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analysis'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  数据上传和分析
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  历史记录查看
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 扫描数据上传 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              扫描数据上传
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              包含tracking_number、operate、time字段的Excel文件
            </p>
          </div>
          <div className="p-6">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              uploadingScanning 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}>
              {uploadingScanning ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-blue-700">
                      正在解析扫描数据文件...
                    </span>
                    <p className="mt-1 text-xs text-blue-600">
                      请稍候，正在处理您的数据
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="scanning-file" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        点击上传扫描数据文件
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        Excel格式，支持.xlsx和.xls
                      </span>
                    </label>
                    <input
                      id="scanning-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleScanningFileUpload}
                      disabled={uploadingScanning}
                      className="sr-only"
                    />
                  </div>
                </div>
              )}
            </div>
            {scanningData.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ 已上传 {scanningData.length} 条扫描记录
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 区号数据上传 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              区号数据上传
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              包含tracking_number、route_number字段的Excel文件。系统将按区号前缀（P、X等）进行分组统计。
            </p>
          </div>
          <div className="p-6">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              uploadingRoute 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}>
              {uploadingRoute ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-green-700">
                      正在解析区号数据文件...
                    </span>
                    <p className="mt-1 text-xs text-green-600">
                      请稍候，正在处理您的数据
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="route-file" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        点击上传区号数据文件
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        Excel格式，支持.xlsx和.xls
                      </span>
                    </label>
                    <input
                      id="route-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleRouteFileUpload}
                      disabled={uploadingRoute}
                      className="sr-only"
                    />
                  </div>
                </div>
              )}
            </div>
            {routeData.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ 已上传 {routeData.length} 条区号记录
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

          {/* Calculate Button */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">效率计算</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {calculating 
                    ? '正在分析数据，请稍候...' 
                    : '上传完两个文件后，点击计算按钮开始分析'
                  }
                </p>
                {calculating && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                    正在处理 {scanningData.length} 条扫描记录和 {routeData.length} 条区号记录...
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {efficiencyResults && (
                  <button
                    onClick={saveAnalysisResult}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? '保存中...' : '保存结果'}
                  </button>
                )}
                <button
                  onClick={calculateEfficiency}
                  disabled={calculating || scanningData.length === 0 || routeData.length === 0}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {calculating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      计算中...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      开始计算
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {efficiencyResults && (
            <div className="space-y-6">
              {/* Current Result Info */}
              {selectedResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <History className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        当前查看：{selectedResult.analysisDate} 的分析结果
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedResult(null);
                        setEfficiencyResults(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      返回新分析
                    </button>
                  </div>
                </div>
              )}
              
              {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">分析分拣员</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {efficiencyResults.operators.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总扫描记录</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {efficiencyResults.totalScans}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">平均总效率</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {efficiencyResults.averageTotalEfficiency.toFixed(2)} 件/小时
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">人均分拣数</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {efficiencyResults.operators.length > 0 
                      ? (efficiencyResults.totalScans / efficiencyResults.operators.length).toFixed(0)
                      : 0} 件/人
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Route Efficiency Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">大区效率统计</h3>
              <p className="text-sm text-gray-600 mt-1">
                各区的分拣效率和总体统计
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      大区
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总分拣数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      参与分拣员
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      区效率(件/小时)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      人均分拣数
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getRouteSummary().map((route, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {route.routePrefix}区
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {route.totalScans}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {route.operatorCount}人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {route.efficiency.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {route.averagePerOperator.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">导出结果</h3>
              <div className="flex space-x-3">
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">详细效率分析</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分拣员
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      扫描数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      工作时间(小时)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总效率(件/小时)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作时间范围
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      大区分拣统计
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      大区效率详情
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {efficiencyResults.operators.map((operator, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {operator.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operator.scanCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operator.workingHours.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operator.totalEfficiency.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="font-medium">开始：</span>
                            {operator.firstScanTime ? operator.firstScanTime.toLocaleString('zh-CN') : '-'}
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">结束：</span>
                            {operator.lastScanTime ? operator.lastScanTime.toLocaleString('zh-CN') : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="space-y-1">
                          {operator.routeEfficiencies.map((route, idx) => (
                            <div key={idx} className="text-xs">
                              {route.routePrefix}区: {route.scanCount}件
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="space-y-1">
                          {operator.routeEfficiencies.map((route, idx) => (
                            <div key={idx} className="text-xs">
                              {route.routePrefix}区: {route.efficiency.toFixed(2)}件/小时
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600" />
                历史分析记录
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                查看之前保存的效率分析结果
              </p>
            </div>
            <div className="p-6">
              {savedResults.length === 0 ? (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">暂无历史记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              分析日期：{result.analysisDate}
                            </h4>
                            <p className="text-xs text-gray-500">
                              创建时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">{result.operators.length}</span> 个分拣员
                          </div>
                          <div className="text-sm text-gray-600">
                            总扫描：<span className="font-medium">{result.totalScans}</span> 次
                          </div>
                          <div className="text-sm text-gray-600">
                            平均效率：<span className="font-medium">{result.averageTotalEfficiency.toFixed(2)}</span> 件/小时
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewHistoryDetail(result)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看详情
                        </button>
                        <button
                          onClick={() => deleteHistoryRecord(result.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EfficiencyAnalysis;
