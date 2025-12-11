import { createContext, useContext, useState, useEffect } from 'react';

const TokenContext = createContext();

// localStorage 的 key
const TOKEN_STORAGE_KEY = 'external_api_token';

/**
 * Token Provider
 * 管理外部接口的 Token，存储在 localStorage 中
 */
export function TokenProvider({ children }) {
  const [token, setToken] = useState(() => {
    // 从 localStorage 加载 token
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    }
    return '';
  });

  // 更新 token 并保存到 localStorage
  const updateToken = (newToken) => {
    console.log('🔑 更新 Token:', {
      hasToken: !!newToken,
      tokenLength: newToken ? newToken.length : 0,
      tokenPreview: newToken ? newToken.substring(0, 8) + '...' : 'empty'
    });
    setToken(newToken);
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        console.log('✅ Token 已保存到 localStorage');
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        console.log('✅ Token 已从 localStorage 移除');
      }
    }
  };

  // 清空 token
  const clearToken = () => {
    updateToken('');
  };

  return (
    <TokenContext.Provider value={{ token, updateToken, clearToken }}>
      {children}
    </TokenContext.Provider>
  );
}

/**
 * 使用 Token 的 Hook
 */
export function useToken() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}

export default TokenContext;

