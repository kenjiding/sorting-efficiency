import { Navigate } from 'react-router-dom';
import useStore from '../store/useStore';

/**
 * 权限保护路由组件
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 * @param {string} props.requiredRole - 需要的角色权限 ('admin', 'ceo')
 * @param {string} props.redirectTo - 无权限时重定向路径，默认 '/entry'
 */
const ProtectedRoute = ({ children, requiredRole, redirectTo = '/entry' }) => {
  const { user, hasPermission } = useStore();

  // 检查用户是否登录
  if (!user) {
    return <Navigate to="/entry" replace />;
  }

  // 检查用户是否有所需权限
  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <svg 
              className="mx-auto h-24 w-24 text-red-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问受限</h2>
          <p className="text-gray-600 mb-6">
            您没有权限访问此页面。此页面仅限{requiredRole === 'ceo' ? '总经理' : '管理员'}级别用户查看。
          </p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p>当前用户：{user.name}</p>
            <p>当前角色：{user.role === 'admin' ? '管理员' : user.role === 'ceo' ? '总经理' : '普通用户'}</p>
            <p>需要权限：{requiredRole === 'ceo' ? '总经理' : '管理员'}</p>
          </div>
          <button
            onClick={() => window.location.href = redirectTo}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

