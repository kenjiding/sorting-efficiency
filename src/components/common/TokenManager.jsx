import { useState } from 'react';
import { Key, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { useToken } from '../../contexts/TokenContext';
import useToast from '../../hooks/useToast.jsx';

/**
 * Token 管理组件
 * 
 * 使用全局 TokenContext 管理 Token
 */
const TokenManager = ({ compact = false }) => {
  const { token, updateToken } = useToken();
  const [editing, setEditing] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // 更新 Token
  const handleUpdateToken = () => {
    if (!newToken || newToken.trim().length === 0) {
      showToast('Token 不能为空', 'warning');
      return;
    }

    updateToken(newToken.trim());
    showToast('Token 更新成功！', 'success');
    console.log('✅ Token 已保存到本地存储');
    
    setEditing(false);
    setNewToken('');
    setShowToken(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditing(false);
    setNewToken('');
    setShowToken(false);
  };

  // 开始编辑
  const handleStartEdit = () => {
    setEditing(true);
    setNewToken(token);
  };

  // 生成遮罩 Token
  const getMaskedToken = () => {
    if (!token) return '未设置';
    if (token.length <= 12) return token;
    return `${token.substring(0, 8)}${'*'.repeat(Math.max(0, token.length - 12))}${token.substring(token.length - 4)}`;
  };

  if (compact) {
    // 紧凑模式 - 用于集成到其他页面
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <ToastContainer />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">外部接口 Token</h3>
          </div>
        </div>

        <div className="space-y-3">
          {!editing ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={showToken ? token : getMaskedToken()}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-mono"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title={showToken ? '隐藏' : '显示'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleStartEdit}
                  className="p-2 text-primary-600 hover:text-primary-700"
                  title="编辑"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Token 保存在浏览器本地存储中
              </p>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="输入新的 Token"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateToken}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <X className="h-4 w-4 mr-1" />
                    取消
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 完整模式 - 独立页面
  return (
    <div className="max-w-2xl mx-auto">
      <ToastContainer />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Key className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">外部接口 Token 管理</h2>
            <p className="text-sm text-gray-600 mt-1">Token 保存在浏览器本地存储中</p>
          </div>
        </div>

        <div className="space-y-6">
          {!editing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当前 Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={showToken ? token : getMaskedToken()}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-3 text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                    title={showToken ? '隐藏' : '显示'}
                  >
                    {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  💡 Token 保存在浏览器 localStorage 中，每次调用外部接口时自动带上
                </p>
              </div>

              <button
                onClick={handleStartEdit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                更新 Token
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新 Token
                </label>
                <input
                  type="text"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="输入新的 Token"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  请确保输入正确的 Token，错误的 Token 将导致外部接口调用失败
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateToken}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="h-5 w-5 mr-2" />
                  保存更改
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 mr-2" />
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenManager;

