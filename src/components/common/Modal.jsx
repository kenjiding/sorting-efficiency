import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  footer,
  maxWidth = 'max-w-2xl',
  showCloseButton = true,
  closeOnClickOutside = true 
}) => {
  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ESC键关闭
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ position: 'fixed', overflow: 'hidden' }}
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-xl shadow-2xl ${maxWidth} w-full max-h-[90vh] flex flex-col`}>
        {/* 头部 - 固定 */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex-shrink-0">
            <div className="flex items-center justify-between">
              {typeof title === 'string' ? (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              ) : (
                title
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>

        {/* 底部区域 - 固定 */}
        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;

