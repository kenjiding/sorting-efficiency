import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { History } from 'lucide-react';

const ScanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // 当从录入页面返回时，确保输入框获得焦点
  useEffect(() => {
    if (location.state?.fromEntry) {
      // 如果返回时要求刷新历史记录，传递刷新状态
      const refreshHistory = location.state?.refreshHistory;
      // 清空 location.state，避免重复触发
      window.history.replaceState({}, document.title);
      // 确保输入框获得焦点
      setTimeout(() => {
        const scannerInput = document.getElementById('pda-scanner-input');
        if (scannerInput) {
          scannerInput.focus();
        }
        // 如果有刷新标记，导航到历史页面时传递刷新状态
        if (refreshHistory) {
          // 将刷新状态保存，以便历史页面使用
          window.history.replaceState({ refreshHistory: true }, document.title);
        }
      }, 200);
    }
  }, [location.state]);


  // PDA扫描：监听Enter键，从输入框读取扫描结果
  useEffect(() => {
    // 存储原始输入值，避免数字精度问题
    let rawInputValue = '';
    
    const handler = (e) => {
      // Enter 键处理
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        // 使用保存的原始字符串值，避免数字转换
        setTimeout(() => {
          const scannerInput = document.getElementById('pda-scanner-input');
          if (scannerInput) {
            // 优先从 data 属性读取原始字符串值，避免数字精度问题
            // 如果没有 data 属性，则从 value 读取并强制转换为字符串
            const dataValue = scannerInput.getAttribute('data-barcode') || '';
            const inputValue = scannerInput.value || '';
            // 优先使用 data 属性中的值，因为它是最原始的字符串
            const scannedValue = String(dataValue || inputValue || rawInputValue || '').trim();
            if (scannedValue) {
              navigate(`/scan/entry?barcode=${encodeURIComponent(scannedValue)}`);
              scannerInput.value = '';
              scannerInput.setAttribute('data-barcode', '');
              rawInputValue = '';
            }
          }
        }, 100);
      }
    };

    // 监听 input 事件，保存原始字符串值（在 keydown 之前）
    const inputHandler = (e) => {
      // 直接保存原始输入值作为字符串，避免任何数字转换
      const value = e.target.value || '';
      rawInputValue = String(value);
      // 同时保存到 data 属性作为备份
      if (e.target) {
        e.target.setAttribute('data-barcode', rawInputValue);
      }
    };

    document.addEventListener('keydown', handler);
    
    // 确保输入框存在后再添加 input 监听器
    setTimeout(() => {
      const scannerInput = document.getElementById('pda-scanner-input');
      if (scannerInput) {
        scannerInput.addEventListener('input', inputHandler);
        scannerInput.focus();
      }
    }, 100);

    return () => {
      document.removeEventListener('keydown', handler);
      const scannerInput = document.getElementById('pda-scanner-input');
      if (scannerInput) {
        scannerInput.removeEventListener('input', inputHandler);
      }
    };
  }, [navigate]);


  const handleManualInput = () => {
    setShowManualInput(true);
    setManualBarcode('');
  };

  const handleManualInputSubmit = () => {
    // 确保条形码始终作为字符串处理，避免大数字精度问题
    const barcodeStr = String(manualBarcode || '').trim();
    if (barcodeStr) {
      navigate(`/scan/entry?barcode=${encodeURIComponent(barcodeStr)}`);
      setShowManualInput(false);
      setManualBarcode('');
    }
  };

  const handleManualInputCancel = () => {
    setShowManualInput(false);
    setManualBarcode('');
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
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">PDA扫描</h1>
        <button
          onClick={() => navigate('/scan/history')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <History size={24} className="text-gray-700" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 px-4 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* PDA Scan */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-6 mb-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                扫描区域（请使用PDA扫描器扫描条形码）
              </label>
              <input
                id="pda-scanner-input"
                type="text"
                placeholder="等待扫描..."
                autoFocus
                inputMode="text"
                pattern=".*"
                data-barcode=""
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-mono bg-gray-50"
                onInput={(e) => {
                  // 实时保存原始字符串值到 data 属性，避免数字转换
                  const value = e.target.value || '';
                  e.target.setAttribute('data-barcode', String(value));
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                提示：使用PDA扫描器扫描条形码，扫描结果将自动填充并跳转
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleManualInput}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                手动输入
              </button>
              <button
                onClick={() => navigate('/scan/history')}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                历史记录
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Input Modal */}
      {showManualInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">手动输入条形码</h2>
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(String(e.target.value))}
              placeholder="请输入条形码"
              autoFocus
              inputMode="text"
              pattern=".*"
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualInputSubmit();
                } else if (e.key === 'Escape') {
                  handleManualInputCancel();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleManualInputCancel}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleManualInputSubmit}
                className="flex-1 px-4 py-3 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
