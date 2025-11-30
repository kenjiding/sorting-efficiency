import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 移动端自动重定向组件
 * 检测到移动设备时，如果不在扫描相关页面，自动跳转到扫描页面
 */
const MobileRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 检测是否为移动设备
    const isMobile = () => {
      // 检查用户代理
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      
      // 检查屏幕宽度（移动端通常小于768px）
      const isSmallScreen = window.innerWidth < 768;
      
      // 检查触摸支持
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      return mobileRegex.test(userAgent.toLowerCase()) || (isSmallScreen && hasTouchScreen);
    };

    // 如果当前不在扫描相关页面，且是移动设备，则重定向
    const isScanPage = location.pathname.startsWith('/scan');
    
    if (isMobile() && !isScanPage) {
      navigate('/scan', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null; // 此组件不渲染任何内容
};

export default MobileRedirect;

