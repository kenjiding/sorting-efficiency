import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bell, 
  Settings, 
  User, 
  RefreshCw,
  Calendar,
  Clock,
  LogOut,
  ChevronDown
} from 'lucide-react';
import useStore from '../../store/useStore';
import RegionSelector from '../common/RegionSelector';

const Header = () => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { loadAllRecords, loading, user, logout } = useStore();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/entry':
        return {
          title: '数据录入',
          subtitle: '添加和管理生产力记录'
        };
      case '/analysis':
        return {
          title: '数据分析',
          subtitle: '查看统计图表和导出报告'
        };
      default:
        return {
          title: '仪表板',
          subtitle: '生产力跟踪管理系统'
        };
    }
  };

  const pageInfo = getPageTitle();

  const handleRefresh = async () => {
    await loadAllRecords();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-10 flex-shrink-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Page Title and Breadcrumb */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pageInfo.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{pageInfo.subtitle}</p>
            </div>
          </div>

          {/* Right: Actions and User Info */}
          <div className="flex items-center space-x-4">
            {/* Region Selector */}
            <RegionSelector />

            {/* Current Time */}
            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{currentTime.toLocaleDateString('zh-CN')}</span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{currentTime.toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="刷新数据"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>

            {/* User Profile */}
            <div className="relative pl-4 border-l border-gray-200 user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name || '未知用户'}</div>
                  <div className="text-xs text-gray-500">{user?.role === 'admin' ? '系统管理员' : '普通用户'}</div>
                </div>
                <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">@{user?.username}</p>
                  </div>
                  
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    账户设置
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                    <User className="h-4 w-4 mr-3 text-gray-400" />
                    个人资料
                  </button>
                  
                  <div className="border-t border-gray-200 mt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-500" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar for loading */}
      {loading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div className="h-full bg-primary-600 animate-pulse"></div>
        </div>
      )}
    </header>
  );
};

export default Header; 