import { useState } from 'react';
import { Trash2, Clock, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import Modal from '../common/Modal';

const BatchOperationToolbar = ({ 
  selectedRecords, 
  onBulkDelete, 
  onBulkUpdateTime,
  onClearSelection,
  loading 
}) => {
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeUpdates, setTimeUpdates] = useState({
    coarseStartTime: '',
    coarseEndTime: '',
    fineStartTime: '',
    fineEndTime: ''
  });

  const selectedCount = selectedRecords.length;

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkDelete = () => {
    const confirmMessage = `确定要删除选中的 ${selectedCount} 条记录吗？\n\n此操作不可撤销！`;
    if (window.confirm(confirmMessage)) {
      const ids = selectedRecords.map(record => record.id);
      onBulkDelete(ids);
    }
  };

  const handleTimeUpdate = () => {
    // 验证粗拣时间必须填写
    if (!timeUpdates.coarseStartTime || !timeUpdates.coarseEndTime) {
      alert('粗拣开始时间和结束时间是必填项，请填写完整');
      return;
    }

    // 验证时间逻辑
    if (timeUpdates.coarseStartTime && timeUpdates.coarseEndTime) {
      const startTime = new Date(`2000-01-01T${timeUpdates.coarseStartTime}:00`);
      const endTime = new Date(`2000-01-01T${timeUpdates.coarseEndTime}:00`);
      
      // 处理跨天情况
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      if (endTime - startTime > 12 * 60 * 60 * 1000) { // 超过12小时
        if (!window.confirm('粗拣工作时间超过12小时，是否确认？')) {
          return;
        }
      }
    }

    if (timeUpdates.fineStartTime && timeUpdates.fineEndTime) {
      const startTime = new Date(`2000-01-01T${timeUpdates.fineStartTime}:00`);
      const endTime = new Date(`2000-01-01T${timeUpdates.fineEndTime}:00`);
      
      // 处理跨天情况
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      if (endTime - startTime > 12 * 60 * 60 * 1000) { // 超过12小时
        if (!window.confirm('细拣工作时间超过12小时，是否确认？')) {
          return;
        }
      }
    }

    // 过滤掉空值
    const updates = {};
    Object.entries(timeUpdates).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        updates[key] = value.trim();
      }
    });

    const confirmMessage = `确定要批量更新选中 ${selectedCount} 条记录的时间信息吗？`;
    if (window.confirm(confirmMessage)) {
      const ids = selectedRecords.map(record => record.id);
      onBulkUpdateTime(ids, updates);
      setShowTimeModal(false);
      setTimeUpdates({
        coarseStartTime: '',
        coarseEndTime: '',
        fineStartTime: '',
        fineEndTime: ''
      });
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // 如果已经是 HH:mm 格式，直接返回
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    // 如果是 HH:mm:ss 格式，去掉秒
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  const handleTimeInputChange = (field, value) => {
    const formattedTime = formatTime(value);
    setTimeUpdates(prev => ({
      ...prev,
      [field]: formattedTime
    }));
  };

  return (
    <>
      {/* 批量操作工具栏 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-900">
                已选中 {selectedCount} 条记录
              </span>
            </div>
            <div className="text-xs text-blue-600">
              可进行批量操作
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTimeModal(true)}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="批量修改时间"
            >
              <Clock className="h-4 w-4" />
              <span>批量修改时间</span>
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="批量删除"
            >
              <Trash2 className="h-4 w-4" />
              <span>批量删除</span>
            </button>
            
            <button
              onClick={onClearSelection}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="取消选择"
            >
              <X className="h-4 w-4" />
              <span>取消选择</span>
            </button>
          </div>
        </div>
      </div>

      {/* 批量修改时间模态框 */}
      <Modal
        isOpen={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        maxWidth="max-w-lg"
        title={
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                批量修改时间
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                更新选中 {selectedCount} 条记录的时间信息
              </p>
            </div>
          </div>
        }
        footer={
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowTimeModal(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleTimeUpdate}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>确认更新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        {/* 内容区域 */}
        <div className="px-6 py-6">
              {/* 提示信息 */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">重要提示：</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <span className="font-medium text-orange-600">粗拣时间</span>是必填项</li>
                      <li>• <span className="font-medium text-pink-600">细拣时间</span>是可选填项</li>
                      <li>• 支持跨天工作时间（如：22:00 - 06:00）</li>
                      <li>• 只填写需要修改的字段，留空字段不会被更新</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* 时间输入表单 */}
              <div className="space-y-6">
                {/* 粗拣时间区域 */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <h4 className="text-lg font-medium text-gray-900">粗拣工作时间</h4>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      必填
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        开始时间
                      </label>
                      <input
                        type="time"
                        value={timeUpdates.coarseStartTime}
                        onChange={(e) => handleTimeInputChange('coarseStartTime', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="HH:mm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        结束时间
                      </label>
                      <input
                        type="time"
                        value={timeUpdates.coarseEndTime}
                        onChange={(e) => handleTimeInputChange('coarseEndTime', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        placeholder="HH:mm"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                {/* 细拣时间区域 */}
                <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <h4 className="text-lg font-medium text-gray-900">细拣工作时间</h4>
                    <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full">
                      可选
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        开始时间
                      </label>
                      <input
                        type="time"
                        value={timeUpdates.fineStartTime}
                        onChange={(e) => handleTimeInputChange('fineStartTime', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                        placeholder="HH:mm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        结束时间
                      </label>
                      <input
                        type="time"
                        value={timeUpdates.fineEndTime}
                        onChange={(e) => handleTimeInputChange('fineEndTime', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                        placeholder="HH:mm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </Modal>
    </>
  );
};

export default BatchOperationToolbar;
