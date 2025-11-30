import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Filter, RefreshCw } from 'lucide-react';
import apiClient from '../../api/apiClient';

const HistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const isInitialMount = useRef(true);
  
  // Filters
  const [barcodeFilter, setBarcodeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    // 默认设置为当天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showFilters, setShowFilters] = useState(false);

  // 页面可见性变化时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isInitialMount.current) {
        // 页面变为可见时，刷新数据
        loadRecords(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dateFilter]);

  // 页面焦点变化时刷新数据
  useEffect(() => {
    const handleFocus = () => {
      if (!isInitialMount.current) {
        // 不是首次挂载，且页面获得焦点时，刷新数据
        loadRecords(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [dateFilter]);

  // 从其他页面返回时刷新数据 - 监听路由变化
  useEffect(() => {
    // 当路径变化或 location.state 有 refreshHistory 标志时，刷新数据
    if (location.pathname === '/scan/history') {
      // 如果是从其他页面导航过来的，检查是否有刷新标志
      if (location.state?.refreshHistory) {
        // 清空 location.state，避免重复触发
        window.history.replaceState({}, document.title);
        loadRecords(true);
      }
    }
  }, [location.pathname, location.state]);

  useEffect(() => {
    loadRecords();
    isInitialMount.current = false;
  }, []);

  useEffect(() => {
    // 当日期筛选改变时，重新加载数据
    if (!isInitialMount.current) {
      loadRecords();
    }
  }, [dateFilter]);

  useEffect(() => {
    // 当数据加载完成后，应用筛选
    applyFilters();
  }, [records, barcodeFilter, dateFilter]);

  const loadRecords = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      // 如果有日期筛选，传递给API
      const params = {};
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }
      const data = await apiClient.scanRecords.getMergedHistory(params);
      setRecords(data);
    } catch (err) {
      setError('加载历史记录失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // 按条形码筛选
    if (barcodeFilter.trim()) {
      filtered = filtered.filter(record =>
        record.barcode.toLowerCase().includes(barcodeFilter.toLowerCase())
      );
    }

    // 按日期筛选（如果API没有处理，在这里再筛选一次）
    if (dateFilter) {
      filtered = filtered.filter(record => {
        // lastScanTime 可能是字符串格式 "2024-01-01 12:00:00" 或 "2024/01/01 12:00:00"，需要提取日期部分
        let recordDate;
        if (typeof record.lastScanTime === 'string') {
          // 先替换斜杠为横杠，然后提取日期部分
          recordDate = record.lastScanTime.replace(/\//g, '-').split(' ')[0];
          // 确保格式是 YYYY-MM-DD（处理可能的单数字月份/日期）
          const parts = recordDate.split('-');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            recordDate = `${year}-${month}-${day}`;
          }
        } else {
          recordDate = new Date(record.lastScanTime).toISOString().split('T')[0];
        }
        // 确保 dateFilter 也是标准格式
        const filterParts = dateFilter.split('-');
        const normalizedFilter = filterParts.length === 3 
          ? `${filterParts[0]}-${filterParts[1].padStart(2, '0')}-${filterParts[2].padStart(2, '0')}`
          : dateFilter;
        
        return recordDate === normalizedFilter;
      });
    }

    setFilteredRecords(filtered);
  };

  const handleRecordClick = (record) => {
    navigate(`/scan/modify?barcode=${encodeURIComponent(record.barcode)}`);
  };

  const clearFilters = () => {
    setBarcodeFilter('');
    // 重置为当天
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDateFilter(`${year}-${month}-${day}`);
    setShowFilters(false);
    loadRecords();
  };

  return (
    <div 
      className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden"
      style={{ 
        height: '100dvh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%'
      }}
    >
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate('/scan')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex-1">历史记录</h1>
        <button
          onClick={() => loadRecords(true)}
          disabled={refreshing}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="刷新"
        >
          <RefreshCw size={24} className={`text-gray-700 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Filter size={24} className="text-gray-700" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-3 flex-shrink-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Search size={16} />
              条形码
            </label>
            <input
              type="text"
              value={barcodeFilter}
              onChange={(e) => setBarcodeFilter(e.target.value)}
              placeholder="搜索条形码..."
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} />
              日期
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              清除筛选
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
            {error}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            {records.length === 0 ? '暂无历史记录' : '没有匹配的记录'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record, index) => (
              <div
                key={index}
                onClick={() => handleRecordClick(record)}
                className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-mono font-bold text-gray-900">
                    {record.barcode}
                  </div>
                  <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {record.pallet} pallet
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  总数: {record.totalCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  最后扫描: {new Date(record.lastScanTime).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;

