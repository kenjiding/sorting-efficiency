import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Database, 
  PlusCircle, 
  BarChart3, 
  ChevronLeft, 
  TrendingUp,
  Users,
  FileText,
  Calculator,
  Crown,
  DollarSign,
  ScanLine,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import useStore from '../../store/useStore';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { records, getUniqueNames, user, hasPermission } = useStore();
  const [realTimeStats, setRealTimeStats] = useState({
    todayRecords: 0,
    activeWorkers: 0,
    avgEfficiency: '0.0'
  });

  // 基础菜单项（所有用户可见）
  const baseMenuItems = [
    {
      id: 'entry',
      path: '/entry',
      label: '数据录入',
      icon: PlusCircle,
      description: '添加和导入生产力数据',
      requiredRole: null
    },
    {
      id: 'scan',
      path: '/scan',
      label: '扫描货量',
      icon: ScanLine,
      description: '扫描条形码记录货量',
      requiredRole: null
    },
    {
      id: 'analysis',
      path: '/analysis',
      label: '数据分析',
      icon: BarChart3,
      description: '查看图表和导出报告',
      requiredRole: null
    },
    {
      id: 'efficiency',
      path: '/efficiency',
      label: '细分效率',
      icon: Calculator,
      description: '分析分拣员工作效率',
      requiredRole: null
    },
    {
      id: 'wage-salary',
      path: '/wage-salary',
      label: '工资结算',
      icon: DollarSign,
      description: '员工工资计算和管理',
      requiredRole: null
    },
    {
      id: 'dashboard',
      path: '/dashboard',
      label: '数据报表看板',
      icon: LayoutDashboard,
      description: '货量数据报表和分析',
      requiredRole: null
    },
    {
      id: 'settings',
      path: '/settings',
      label: '系统设置',
      icon: Settings,
      description: 'Token配置和系统设置',
      requiredRole: null
    }
  ];

  // CEO专属菜单项
  const ceoMenuItem = {
    id: 'manager',
    path: '/manager',
    label: '跨区域效率仪表板',
    icon: Crown,
    description: '跨区域效率对比分析',
    requiredRole: 'ceo'
  };

  // 根据用户角色过滤菜单项
  const menuItems = [
    ...baseMenuItems,
    ...(hasPermission('ceo') ? [ceoMenuItem] : [])
  ];

  // Calculate real-time stats
  useEffect(() => {
    const calculateStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = records.filter(record => record.date === today);
      
      try {
        const uniqueWorkers = await getUniqueNames();
        
        const totalEfficiency = todayRecords.reduce((sum, record) => {
          const coarseEff = Number(record.coarseEfficiency) || 0;
          const fineEff = Number(record.fineEfficiency) || 0;
          return sum + (coarseEff + fineEff) / 2;
        }, 0);
        
        const avgEff = todayRecords.length > 0 ? (totalEfficiency / todayRecords.length).toFixed(1) : '0.0';
        
        setRealTimeStats({
          todayRecords: todayRecords.length,
          activeWorkers: uniqueWorkers.length,
          avgEfficiency: avgEff
        });
      } catch (error) {
        console.error('计算统计数据失败:', error);
      }
    };
    
    calculateStats();
  }, [records]); // 移除 getUniqueNames，只依赖 records

  const quickStats = [
    { label: '今日记录', value: realTimeStats.todayRecords.toString(), icon: FileText, color: 'text-blue-600' },
    { label: '活跃工人', value: realTimeStats.activeWorkers.toString(), icon: Users, color: 'text-green-600' },
    { label: '平均效率', value: realTimeStats.avgEfficiency, icon: TrendingUp, color: 'text-purple-600' }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
      collapsed ? 'w-16' : 'w-64'
    } flex flex-col h-screen overflow-hidden flex-shrink-0 relative shadow-sm`}>
      {/* Logo and Header */}
      <div className={`border-b border-gray-200 flex-shrink-0 transition-all duration-300 ${collapsed ? 'p-3' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center transition-all duration-300 ${collapsed ? 'justify-center w-full' : 'space-x-3'}`}>
            <div 
              className={`flex-shrink-0 transition-all duration-200 ${collapsed ? 'cursor-pointer hover:bg-blue-50 p-2 rounded-lg' : ''}`}
              onClick={() => collapsed && setCollapsed(false)}
              title={collapsed ? '展开菜单' : ''}
            >
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
              collapsed 
                ? 'w-0 opacity-0 transform translate-x-4' 
                : 'w-auto opacity-100 transform translate-x-0'
            }`}
            style={{
              transitionDelay: collapsed ? '0ms' : '150ms'
            }}>
              <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">分拣管理系统</h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">Sorting Management</p>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed 
              ? 'w-0 opacity-0 transform translate-x-4' 
              : 'w-auto opacity-100 transform translate-x-0'
          }`}
          style={{
            transitionDelay: collapsed ? '0ms' : '150ms'
          }}>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
              title="收起菜单"
            >
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className={`flex-1 overflow-y-auto transition-all duration-300 ${collapsed ? 'px-2 py-4' : 'px-4 py-6'}`}>
        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex items-center rounded-lg text-sm font-medium transition-all duration-200 group
                  ${collapsed ? 'px-3 py-3 justify-center' : 'px-3 py-3 space-x-3'}
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                title={collapsed ? item.label : ''}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
                  collapsed 
                    ? 'w-0 opacity-0 transform translate-x-4' 
                    : 'w-auto opacity-100 transform translate-x-0'
                }`}
                style={{
                  transitionDelay: collapsed ? '0ms' : '150ms'
                }}>
                  <div className="font-medium truncate whitespace-nowrap">{item.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate whitespace-nowrap">{item.description}</div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${
                  collapsed || !isActive
                    ? 'w-0 opacity-0' 
                    : 'w-2 opacity-100'
                }`}>
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Quick Stats */}
      <div className={`border-t border-gray-200 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed 
          ? 'h-0 p-0 opacity-0' 
          : 'h-auto p-4 opacity-100'
      }`}
      style={{
        transitionDelay: collapsed ? '0ms' : '200ms'
      }}>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 whitespace-nowrap">
          快速统计
        </h3>
        <div className="space-y-3">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 min-w-0">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${stat.color}`} />
                  <span className="text-xs text-gray-600 truncate whitespace-nowrap">{stat.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{stat.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={`border-t border-gray-200 flex-shrink-0 transition-all duration-300 ${collapsed ? 'p-2 text-center' : 'p-4'}`}>
        <div className="text-xs text-gray-500 overflow-hidden relative">
          <div className={`transition-all duration-300 ease-in-out ${
            collapsed 
              ? 'opacity-100 transform translate-x-0' 
              : 'opacity-0 transform translate-x-4 absolute'
          }`}
          style={{
            transitionDelay: collapsed ? '150ms' : '0ms'
          }}>
            v1.0
          </div>
          <div className={`transition-all duration-300 ease-in-out ${
            collapsed 
              ? 'opacity-0 transform translate-x-4 absolute' 
              : 'opacity-100 transform translate-x-0'
          }`}
          style={{
            transitionDelay: collapsed ? '0ms' : '150ms'
          }}>
            Version 1.0.0
          </div>
        </div>
      </div>


    </div>
  );
};

export default Sidebar; 