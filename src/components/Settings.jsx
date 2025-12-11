import { Settings as SettingsIcon, Key, Info } from 'lucide-react';
import TokenManager from './common/TokenManager';

/**
 * 系统设置页面
 * 包含外部接口 Token 管理等设置项
 */
function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-600 mt-1">管理系统配置和外部接口设置</p>
        </div>
      </div>

      {/* 外部接口 Token 设置 */}
      <section>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">外部接口 Token</h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Token 用途说明：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>用于访问外部 iMile DMS 系统接口</li>
                  <li>Token 保存在浏览器本地存储中</li>
                  <li>每次调用外部接口时自动带上</li>
                  <li>如果未设置，将使用服务器默认 Token</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Token 管理组件 */}
          <TokenManager compact />
        </div>
      </section>

      {/* 可以在这里添加更多设置项 */}
      <section>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">其他设置</h2>
          <p className="text-sm text-gray-600">
            更多设置项即将推出...
          </p>
        </div>
      </section>
    </div>
  );
}

export default Settings;

