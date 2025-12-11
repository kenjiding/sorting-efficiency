import { useState } from 'react';
import { BarChart3, Package, DollarSign, TrendingUp } from 'lucide-react';
import VolumeDataModule from './DataDashboard/VolumeDataModule';
import CostDataModule from './DataDashboard/CostDataModule';
import ServiceDataModule from './DataDashboard/ServiceDataModule';
import DataSyncButton from './common/DataSyncButton';

const DataDashboard = () => {
  const [activeTab, setActiveTab] = useState('volume'); // 'volume' | 'cost' | 'service' | 'other'

  const tabs = [
    {
      id: 'volume',
      label: '货量数据',
      icon: Package,
      component: VolumeDataModule
    },
    {
      id: 'cost',
      label: '成本数据',
      icon: DollarSign,
      component: CostDataModule
    },
    {
      id: 'service',
      label: '服务数据',
      icon: TrendingUp,
      component: ServiceDataModule
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || VolumeDataModule;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-primary-600" />
                数据报表看板
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                货量数据、成本数据、服务数据 - 支持筛选和排序
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 全局同步按钮 */}
              <DataSyncButton 
                syncType="all"
                label="同步最新数据"
                showStatus={true}
                onSyncComplete={(result) => {
                  console.log('全局数据同步完成:', result);
                  // 可以在这里触发数据刷新
                }}
              />
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="px-6 border-t border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-1 py-4 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 当前激活的模块内容 */}
      <ActiveComponent />
    </div>
  );
};

export default DataDashboard;

