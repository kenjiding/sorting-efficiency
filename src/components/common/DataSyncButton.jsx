import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useToken } from '../../contexts/TokenContext';

/**
 * 通用数据同步按钮组件
 * @param {object} props
 * @param {string} props.syncType - 同步类型: 'inbound' | 'problemItem' | 'all'
 * @param {string} props.label - 按钮文字
 * @param {function} props.onSyncComplete - 同步完成后的回调
 * @param {string} props.className - 自定义样式类名
 * @param {boolean} props.showStatus - 是否显示上次同步状态
 */
const DataSyncButton = ({ 
  syncType = 'all', 
  label = '同步最新数据', 
  onSyncComplete,
  className = '',
  showStatus = true 
}) => {
  const { token } = useToken();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'error' | 'info'

  // 加载同步状态
  const loadSyncStatus = async () => {
    try {
      const response = await apiClient.dataSync.getStatus();
      if (response.success) {
        const statusData = syncType === 'all' 
          ? response.data 
          : { [syncType]: response.data[syncType] };
        setSyncStatus(statusData);
      }
    } catch (error) {
      console.error('加载同步状态失败:', error);
    }
  };

  useEffect(() => {
    if (showStatus) {
      loadSyncStatus();
    }
  }, [showStatus, syncType]);

  // 执行同步
  const handleSync = async () => {
    if (!token) {
      showToastMessage('请先设置Token', 'error');
      return;
    }

    setSyncing(true);
    try {
      console.log(`🚀 开始同步 ${syncType} 数据...`);
      
      let result;
      if (syncType === 'all') {
        result = await apiClient.dataSync.syncAll(token);
      } else if (syncType === 'inbound') {
        result = await apiClient.dataSync.syncInbound(token);
      } else if (syncType === 'problemItem') {
        result = await apiClient.dataSync.syncProblemItems(token);
      } else {
        throw new Error(`未知的同步类型: ${syncType}`);
      }

      if (result.success) {
        const message = syncType === 'all'
          ? `全量同步完成！共同步 ${result.totalRecords || 0} 条记录`
          : result.message || `成功同步 ${result.syncedRecordCount || 0} 条记录`;
        showToastMessage(message, 'success');
        
        // 重新加载同步状态
        await loadSyncStatus();
        
        // 调用回调
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      } else {
        // 显示详细的错误信息
        let errorMessage = result.message || '同步失败';
        
        // 特殊处理常见错误
        if (errorMessage.includes('Token invalid')) {
          errorMessage = '❌ Token无效或已过期，请重新设置Token';
        } else if (errorMessage.includes('forced offline') || errorMessage.includes('login in other places')) {
          errorMessage = '❌ 账号在其他地方登录，Token已失效，请重新获取Token';
        }
        
        // 如果是全量同步，显示各模块的详细错误
        if (syncType === 'all' && result.details) {
          const errors = [];
          if (result.details.inbound && !result.details.inbound.success) {
            errors.push(`货量数据: ${result.details.inbound.error || result.details.inbound.message}`);
          }
          if (result.details.problemItem && !result.details.problemItem.success) {
            errors.push(`问题件数据: ${result.details.problemItem.error || result.details.problemItem.message}`);
          }
          if (errors.length > 0) {
            errorMessage = errorMessage + '\n' + errors.join('\n');
          }
        }
        
        showToastMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('同步失败:', error);
      showToastMessage(`同步失败: ${error.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // 显示提示消息
  const showToastMessage = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  // 格式化日期时间
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 获取状态信息（用于显示）
  const getStatusInfo = () => {
    if (!syncStatus) return null;
    
    if (syncType === 'all') {
      const inbound = syncStatus.inbound || {};
      const problemItem = syncStatus.problemItem || {};
      
      return {
        lastSyncDate: inbound.lastSyncDate || problemItem.lastSyncDate,
        status: inbound.status === 'never_synced' && problemItem.status === 'never_synced' 
          ? 'never_synced' 
          : 'synced'
      };
    } else {
      const status = syncStatus[syncType] || {};
      return {
        lastSyncDate: status.lastSyncDate,
        status: status.status
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 ${
          syncing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg active:scale-95'
        }`}
      >
        {syncing ? (
          <>
            <Loader className="h-4 w-4 mr-2 animate-spin" />
            同步中...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            {label}
          </>
        )}
      </button>

      {/* 同步状态显示 */}
      {showStatus && statusInfo && (
        <div className="mt-2 text-xs text-gray-600 flex items-center">
          {statusInfo.status === 'never_synced' ? (
            <>
              <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
              <span>从未同步</span>
            </>
          ) : statusInfo.status === 'failed' ? (
            <>
              <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
              <span>上次同步失败</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 mr-1 text-green-500" />
              <span>最新数据: {statusInfo.lastSyncDate || '-'}</span>
            </>
          )}
        </div>
      )}

      {/* Toast提示 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-from-top max-w-md">
          <div
            className={`flex items-start gap-3 px-6 py-4 rounded-lg shadow-lg ${
              toastType === 'success'
                ? 'bg-green-50 border border-green-200'
                : toastType === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex-shrink-0 pt-0.5">
              {toastType === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {toastType === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {toastType === 'info' && <Clock className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <span
                className={`text-sm font-medium whitespace-pre-line ${
                  toastType === 'success'
                    ? 'text-green-900'
                    : toastType === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}
              >
                {toastMessage}
              </span>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSyncButton;
