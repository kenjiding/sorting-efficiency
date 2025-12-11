import { useState, useCallback, useRef } from 'react';
import apiClient from '../api/apiClient';
import useToast from './useToast.jsx';
import { useToken } from '../contexts/TokenContext';

/**
 * 外部接口调用通用 Hook
 * 
 * 特性：
 * - 自动处理加载状态
 * - 自动处理错误并使用 Toast 显示
 * - 支持时间范围验证
 * - 支持数据聚合
 * - 完整的错误日志
 * 
 * @param {Object} config 配置项
 * @param {string} config.url - 外部接口 URL
 * @param {string} config.hubCode - 站点代码
 * @param {number} config.maxDays - 最大天数限制（默认 7）
 * @param {Function} config.dataTransformer - 数据转换函数
 * @param {Function} config.dataAggregator - 数据聚合函数
 * 
 * @returns {Object} { data, loading, error, fetchData, ToastContainer }
 */
export function useExternalApi({
  url,
  hubCode = 'S210431701',
  maxDays = 7,
  dataTransformer = null,
  dataAggregator = null,
  showErrorToast = true
} = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast, ToastContainer } = useToast();
  const { token } = useToken(); // 从 Context 获取 token
  const abortControllerRef = useRef(null);

  /**
   * 验证时间范围
   */
  const validateTimeRange = useCallback((startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysDiff > maxDays) {
      const errorMsg = `时间范围过大（${daysDiff}天），外部接口限制最多查询${maxDays}天数据。请调整时间范围。`;
      return { valid: false, error: errorMsg, daysDiff };
    }
    
    return { valid: true, daysDiff };
  }, [maxDays]);

  /**
   * 获取数据
   */
  const fetchData = useCallback(async (params = {}) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 验证时间范围
    if (params.start && params.end) {
      const validation = validateTimeRange(params.start, params.end);
      if (!validation.valid) {
        console.error('❌', validation.error);
        if (showErrorToast) {
          showToast(validation.error, 'error');
        }
        setData([]);
        return { success: false, error: validation.error };
      }
      
      console.log(`📊 时间范围验证通过: ${validation.daysDiff}天`);
    }

    setLoading(true);
    setError(null);

    try {
      // 构建请求参数
      const requestParams = {
        currentPage: params.currentPage || 1,
        end: params.end ? `${params.end} 23:59:59` : undefined,
        hubCode: params.hubCode || hubCode,
        searchType: params.searchType || 'register',
        showCount: params.showCount || 9999,
        start: params.start ? `${params.start} 00:00:00` : undefined,
        waybillNos: params.waybillNos || [],
        ...params.extra // 允许传递额外参数
      };

      // 调用外部接口，传递 token
      const result = await apiClient.externalApi.post(url, requestParams, token || null);

      // 提取数据
      let rawData = result.data?.resultObject?.results || [];

      // 数据转换
      if (dataTransformer && typeof dataTransformer === 'function') {
        rawData = dataTransformer(rawData);
        console.log('🔄 数据转换完成:', rawData.length, '条');
      }

      // 数据聚合
      let finalData = rawData;
      if (dataAggregator && typeof dataAggregator === 'function') {
        finalData = dataAggregator(rawData, params);
        console.log('📊 数据聚合完成:', finalData.length, '条');
      }

      setData(finalData);
      setError(null);
      
      return { 
        success: true, 
        data: finalData, 
        rawData,
        total: rawData.length 
      };

    } catch (err) {
      console.error('❌ 外部接口调用失败:', err);
      
      const errorMessage = err.message || '外部接口调用失败';
      setError(errorMessage);
      setData([]);
      
      // 显示 Toast 错误提示
      if (showErrorToast) {
        showToast(errorMessage, 'error', 3000);
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: err 
      };
      
    } finally {
      setLoading(false);
    }
  }, [url, hubCode, maxDays, dataTransformer, dataAggregator, validateTimeRange, showToast, showErrorToast]);

  /**
   * 清空数据
   */
  const clearData = useCallback(() => {
    setData([]);
    setError(null);
  }, []);

  /**
   * 重新加载
   */
  const reload = useCallback((params) => {
    return fetchData(params);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fetchData,
    clearData,
    reload,
    ToastContainer
  };
}

export default useExternalApi;

