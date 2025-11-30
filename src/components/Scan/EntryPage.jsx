import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import apiClient from '../../api/apiClient';

const EntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 确保条形码始终作为字符串处理，避免大数字精度问题
  const barcode = String(searchParams.get('barcode') || '');
  
  const [totalCount, setTotalCount] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [scanTime, setScanTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 设置扫描时间
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');
    setScanTime(timeString);

    // 如果条形码存在，尝试获取之前的记录来回填总数
    if (barcode) {
      loadPreviousRecord();
    }
  }, [barcode]);

  const loadPreviousRecord = async () => {
    try {
      const record = await apiClient.scanRecords.getByBarcode(barcode);
      if (record && record.totalCount) {
        setTotalCount(record.totalCount.toString());
      }
    } catch (err) {
      // 忽略错误，继续使用空值
    }
  };

  const handleSave = async () => {
    if (!barcode.trim()) {
      setError('条形码不能为空');
      return;
    }
    if (!totalCount.trim() || isNaN(Number(totalCount))) {
      setError('请输入有效的总数');
      return;
    }
    if (!boxCount.trim() || isNaN(Number(boxCount))) {
      setError('请输入有效的箱数');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const now = new Date();
      const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      const recordData = {
        barcode: barcode.trim(),
        totalCount: Number(totalCount),
        boxes: [{
          count: Number(boxCount),
          timestamp: timeString
        }],
        scanTime: timeString
      };

      const savedRecord = await apiClient.scanRecords.create(recordData);
      
      if (!savedRecord || (!savedRecord._id && !savedRecord.id)) {
        throw new Error('保存失败：服务器未返回有效数据');
      }
      
      // 保存成功，直接跳转
      navigate('/scan', { state: { fromEntry: true, scanMode: 'pda', refreshHistory: true } });
    } catch (err) {
      const errorMessage = err.message || '保存失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm px-3 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/scan')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 truncate">数据录入</h1>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 max-w-full overflow-hidden">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Barcode Display */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            条形码
          </label>
          <div className="text-base font-mono font-bold text-gray-900 bg-gray-50 p-2 rounded-lg break-all overflow-wrap-anywhere">
            {barcode || '未扫描'}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            扫描时间: {scanTime}
          </div>
        </div>

        {/* Total Count and Box Count Inputs - Compact */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0 w-8">
              总数
            </label>
            <input
              type="number"
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
              placeholder="输入总数"
              className="flex-1 min-w-0 px-2 py-2 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              inputMode="numeric"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0 w-8">
              箱数
            </label>
            <input
              type="number"
              value={boxCount}
              onChange={(e) => setBoxCount(e.target.value)}
              placeholder="输入当前pallet箱数"
              className="flex-1 min-w-0 px-2 py-2 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              保存中...
            </>
          ) : (
            <>
              <Save size={20} />
              保存
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EntryPage;

