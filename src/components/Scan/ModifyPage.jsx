import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle } from 'lucide-react';
import apiClient from '../../api/apiClient';

const ModifyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barcode = searchParams.get('barcode');
  
  const [records, setRecords] = useState([]);
  const [barcodeInfo, setBarcodeInfo] = useState(null);
  const [editableBarcode, setEditableBarcode] = useState('');
  const [totalCount, setTotalCount] = useState('');
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (barcode) {
      loadAllRecords();
    }
  }, [barcode]);

  const loadAllRecords = async () => {
    setLoading(true);
    setError('');
    try {
      // 获取该条形码的所有记录
      const allRecords = await apiClient.scanRecords.getAllByBarcode(barcode);
      
      if (!allRecords || allRecords.length === 0) {
        setError('未找到该条形码的记录');
        setLoading(false);
        return;
      }

      setRecords(allRecords);
      
      // 设置条形码信息（使用第一条记录）
      const firstRecord = allRecords[0];
      const barcodeStr = String(firstRecord.barcode || '');
      setBarcodeInfo({
        barcode: barcodeStr,
        lastScanTime: firstRecord.scanTime
      });
      // 设置可编辑的条形码值（确保是字符串）
      setEditableBarcode(barcodeStr);
      
      // 合并所有记录的总数（使用第一条记录的总数，因为同一个条形码总数应该一致）
      setTotalCount(firstRecord.totalCount.toString());
      
      // 合并所有记录的箱数
      const allBoxes = [];
      allRecords.forEach((record, recordIndex) => {
        if (record.boxes && record.boxes.length > 0) {
          record.boxes.forEach((box, boxIndex) => {
            allBoxes.push({
              count: box.count.toString(),
              timestamp: box.timestamp,
              recordId: record._id,
              recordIndex: recordIndex,
              boxIndex: boxIndex
            });
          });
        }
      });
      
      // 按时间戳排序（最新的在前，确保时间顺序）
      allBoxes.sort((a, b) => {
        const timeA = new Date(a.timestamp.replace(/-/g, '/'));
        const timeB = new Date(b.timestamp.replace(/-/g, '/'));
        return timeB - timeA; // 降序：最新的在前
      });
      
      setBoxes(allBoxes);
    } catch (err) {
      console.error('加载记录失败:', err);
      setError('加载记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBox = () => {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');
    
    // 添加到最新的记录中（第一条记录）
    const latestRecordId = records.length > 0 ? records[0]._id : null;
    const newBox = { 
      count: '', 
      timestamp: timeString,
      recordId: latestRecordId,
      recordIndex: 0,
      boxIndex: -1 // 新添加的箱数
    };
    
    // 添加到列表开头（最新的在前）
    setBoxes([newBox, ...boxes]);
  };

  const handleBoxChange = (index, value) => {
    const newBoxes = [...boxes];
    newBoxes[index].count = value;
    setBoxes(newBoxes);
  };

  const handleBoxDelete = (index) => {
    const newBoxes = boxes.filter((_, i) => i !== index);
    setBoxes(newBoxes);
  };

  const handleSave = async () => {
    // 验证条形码
    const newBarcode = String(editableBarcode || '').trim();
    if (!newBarcode) {
      setError('条形码不能为空');
      return;
    }

    if (!totalCount.trim() || isNaN(Number(totalCount))) {
      setError('请输入有效的总数');
      return;
    }

    // 验证所有箱数都已填写
    const invalidBoxes = boxes.filter(box => !box.count || isNaN(Number(box.count)));
    if (invalidBoxes.length > 0) {
      setError('请填写所有箱数');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // 检查条形码是否被修改
      const originalBarcode = String(barcodeInfo?.barcode || '');
      const barcodeChanged = newBarcode !== originalBarcode;

      // 按记录ID分组箱数，保持原有的记录结构
      const boxesByRecord = {};
      
      boxes.forEach(box => {
        const recordId = box.recordId;
        if (!boxesByRecord[recordId]) {
          boxesByRecord[recordId] = [];
        }
        boxesByRecord[recordId].push({
          count: Number(box.count),
          timestamp: box.timestamp
        });
      });

      // 更新所有相关记录
      // 如果条形码被修改了，需要更新所有记录的条形码
      const updatePromises = records.map(record => {
        const recordBoxes = boxesByRecord[record._id] || [];
        const updateData = {
          totalCount: Number(totalCount),
          boxes: recordBoxes,
          scanTime: record.scanTime // 保持原有扫描时间
        };
        
        // 如果条形码改变了，更新条形码
        if (barcodeChanged) {
          updateData.barcode = newBarcode;
        }
        
        return apiClient.scanRecords.update(record._id, updateData);
      });

      await Promise.all(updatePromises);
      
      // 如果条形码改变了，导航时使用新的条形码
      if (barcodeChanged) {
        // 更新本地状态
        setBarcodeInfo({
          barcode: newBarcode,
          lastScanTime: barcodeInfo?.lastScanTime || ''
        });
      }
      
      navigate('/scan/history', { state: { refreshHistory: true } });
    } catch (err) {
      console.error('保存失败:', err);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除该条形码的所有记录吗？此操作不可恢复！')) {
      return;
    }

    setError('');
    setDeleting(true);

    try {
      // 删除该条形码的所有记录
      const deletePromises = records.map(record => 
        apiClient.scanRecords.delete(record._id)
      );
      await Promise.all(deletePromises);
      
      console.log('✅ 删除成功');
      // 删除成功后返回历史记录页面并刷新
      navigate('/scan/history', { state: { refreshHistory: true } });
    } catch (err) {
      console.error('删除失败:', err);
      setError('删除失败，请重试');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!barcodeInfo) {
    if (!loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <p className="text-gray-600">记录不存在</p>
            <button
              onClick={() => navigate('/scan/history')}
              className="mt-4 px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              返回历史记录
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

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
      <div className="bg-white shadow-sm px-3 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/scan/history')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1">修改记录</h1>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Barcode Input - Editable */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            条形码
          </label>
          <input
            type="text"
            value={editableBarcode}
            onChange={(e) => {
              // 确保条形码始终作为字符串处理，避免大数字精度问题
              const value = String(e.target.value || '');
              setEditableBarcode(value);
            }}
            placeholder="输入条形码"
            className="w-full text-base font-mono font-bold text-gray-900 bg-gray-50 border-2 border-gray-200 p-2 rounded-lg break-all overflow-wrap-anywhere focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            inputMode="text"
          />
          <div className="mt-1 text-xs text-gray-500">
            扫描次数: {records.length} 次 | 最后扫描: {barcodeInfo.lastScanTime ? new Date(barcodeInfo.lastScanTime).toLocaleString('zh-CN') : 'N/A'}
          </div>
        </div>

        {/* Total Count Input - Compact */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex items-center gap-2">
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
        </div>

        {/* Boxes */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              箱数列表
            </label>
            <button
              onClick={handleAddBox}
              className="flex items-center gap-1 px-3 py-0 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-xs font-medium"
            >
              <Plus size={14} />
              添加
            </button>
          </div>

          <div className="space-y-2">
            {boxes.map((box, index) => {
              // 找到这个箱数属于哪条记录
              const record = records.find(r => r._id === box.recordId);
              const recordNumber = records.findIndex(r => r._id === box.recordId) + 1;
              
              return (
                <div key={`${box.recordId}-${index}`} className="flex items-center gap-2 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                          箱数{index + 1}
                        </label>
                        {record && records.length > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            第{recordNumber}次
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 mr-7">
                        {box.timestamp}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={box.count}
                        onChange={(e) => handleBoxChange(index, e.target.value)}
                        placeholder="输入箱数"
                        className="flex-1 min-w-0 px-2 py-2 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => handleBoxDelete(index)}
                        className="py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {boxes.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                <p className="mb-2 text-sm">暂无箱数记录</p>
                <button
                  onClick={handleAddBox}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  添加第一个箱数
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white py-2 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              <>
                <Save size={18} />
                保存修改
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="w-full bg-red-500 text-white py-3 rounded-xl shadow-md hover:shadow-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                删除中...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                删除记录
              </>
            )}
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">确认删除</h2>
              </div>
              <p className="text-gray-600 mb-6">
                确定要删除条形码 <span className="font-bold">{editableBarcode || barcodeInfo?.barcode}</span> 的所有记录吗？
                <br />
                <span className="text-red-600 font-semibold">此操作不可恢复！</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      删除中...
                    </>
                  ) : (
                    '确认删除'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifyPage;

