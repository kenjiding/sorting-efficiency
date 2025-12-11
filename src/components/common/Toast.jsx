import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Toast 通知组件
 * 
 * @param {Object} props
 * @param {string} props.type - 类型: 'success' | 'error' | 'info' | 'warning'
 * @param {string} props.message - 显示的消息
 * @param {number} props.duration - 显示时长（毫秒），默认 3000
 * @param {Function} props.onClose - 关闭时的回调函数
 * @param {string} props.position - 位置: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
 */
const Toast = ({ 
  type = 'info', 
  message, 
  duration = 3000, 
  onClose,
  position = 'top-right'
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = 'min-w-[300px] max-w-md rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in';
    
    const typeStyles = {
      success: 'bg-white border-l-4 border-green-500',
      error: 'bg-white border-l-4 border-red-500',
      warning: 'bg-white border-l-4 border-orange-500',
      info: 'bg-white border-l-4 border-blue-500'
    };

    return `${baseStyles} ${typeStyles[type] || typeStyles.info}`;
  };

  const getPositionStyles = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };

    return positions[position] || positions['top-right'];
  };

  return (
    <div className={`fixed ${getPositionStyles()} z-50`}>
      <div className={getStyles()}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-800 font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;

