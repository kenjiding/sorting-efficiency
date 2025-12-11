import { useState, useEffect } from 'react';

/**
 * Toast 管理 Hook
 * 
 * 使用示例:
 * const { toast, showToast, ToastContainer } = useToast();
 * 
 * // 显示成功消息
 * showToast('操作成功！', 'success');
 * 
 * // 显示错误消息
 * showToast('操作失败！', 'error');
 * 
 * // 在组件中渲染
 * return (
 *   <div>
 *     <ToastContainer />
 *     ...
 *   </div>
 * );
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info', duration = 3000, position = 'top-right') => {
    setToast({
      message,
      type,
      duration,
      position,
      id: Date.now() // 用于区分不同的 toast
    });
  };

  const hideToast = () => {
    setToast(null);
  };

  // 自动隐藏
  useEffect(() => {
    if (toast && toast.duration > 0) {
      const timer = setTimeout(() => {
        hideToast();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Toast 容器组件
  const ToastContainer = () => {
    if (!toast) return null;

    return (
      <div 
        className="fixed z-50" 
        style={{ 
          ...(toast.position?.includes('top') ? { top: '1rem' } : { bottom: '1rem' }),
          ...(toast.position?.includes('center') ? { left: '50%', transform: 'translateX(-50%)' } : { right: '1rem' })
        }}
      >
        <div className={`
          min-w-[300px] max-w-md rounded-lg shadow-lg p-4 flex items-start gap-3 
          animate-slide-in bg-white border-l-4
          ${toast.type === 'success' ? 'border-green-500' : ''}
          ${toast.type === 'error' ? 'border-red-500' : ''}
          ${toast.type === 'warning' ? 'border-orange-500' : ''}
          ${toast.type === 'info' ? 'border-blue-500' : ''}
        `}>
          <div className="flex-shrink-0">
            {toast.type === 'success' && (
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-800 font-medium">{toast.message}</p>
          </div>
          <button
            onClick={hideToast}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return {
    toast,
    showToast,
    hideToast,
    ToastContainer
  };
}

export default useToast;
