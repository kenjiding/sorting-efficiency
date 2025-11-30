import { useState } from 'react';
import { TrendingUp, AlertTriangle, PackageX, MessageSquare } from 'lucide-react';
import ProblemItemModule from './ServiceData/ProblemItemModule';
import LostPackageModule from './ServiceData/LostPackageModule';
import ComplaintModule from './ServiceData/ComplaintModule';

const ServiceDataModule = () => {
  const [activeTab, setActiveTab] = useState('problem'); // 'problem' | 'lost' | 'complaint'

  const tabs = [
    {
      id: 'problem',
      label: '问题件数量分析',
      icon: AlertTriangle,
      component: ProblemItemModule
    },
    {
      id: 'lost',
      label: '丢包分析',
      icon: PackageX,
      component: LostPackageModule
    },
    {
      id: 'complaint',
      label: '客诉分析',
      icon: MessageSquare,
      component: ComplaintModule
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProblemItemModule;

  return (
    <div className="space-y-6">
      {/* 模块标题 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                服务数据
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                问题件、丢包、客诉数据统计与分析
              </p>
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

export default ServiceDataModule;

