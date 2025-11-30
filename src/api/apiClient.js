// API客户端工具函数
import { API_ENDPOINTS } from './config';

class APIClient {
  // 通用请求方法
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      console.log('🌐 发送请求:', url, '方法:', config.method || 'GET');
      if (config.body) {
        console.log('📤 请求体:', config.body);
      }
      
      const response = await fetch(url, config);
      
      console.log('📥 收到响应:', response.status, response.statusText);
      console.log('📥 响应头 Content-Type:', response.headers.get('Content-Type'));
      
      if (!response.ok) {
        // 尝试读取错误响应
        let errorData;
        try {
          const text = await response.text();
          console.error('❌ 错误响应文本:', text);
          errorData = JSON.parse(text);
        } catch (parseErr) {
          errorData = { message: `HTTP Error: ${response.status} ${response.statusText}` };
        }
        console.error('❌ API请求失败:', response.status, errorData);
        throw new Error(errorData.message || errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      // 检查响应是否有内容
      const contentType = response.headers.get('Content-Type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        console.log('📥 响应文本:', text);
        
        if (!text || text.trim() === '') {
          console.warn('⚠️ 警告：响应体为空');
          data = {};
        } else {
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            console.error('❌ JSON解析失败:', parseErr);
            throw new Error(`服务器响应格式错误: ${parseErr.message}`);
          }
        }
      } else {
        // 非JSON响应
        const text = await response.text();
        console.log('📥 非JSON响应:', text);
        data = text;
      }
      
      console.log('✅ API请求成功，返回数据:', data);
      return data;
    } catch (error) {
      console.error('❌ API请求错误:', error);
      console.error('🔍 请求URL:', url);
      console.error('🔍 错误类型:', error.name);
      console.error('🔍 错误消息:', error.message);
      
      // 如果是网络错误，提供更详细的错误信息
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const detailedError = new Error(`网络连接失败: 无法连接到服务器 ${url}。请检查：\n1. 服务器是否正在运行\n2. 网络连接是否正常\n3. 手机/PDA是否与服务器在同一网络\n4. 防火墙是否阻止了连接`);
        detailedError.originalError = error;
        throw detailedError;
      }
      
      throw error;
    }
  }

  // GET请求
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullURL = queryString ? `${url}?${queryString}` : url;
    return this.request(fullURL, { method: 'GET' });
  }

  // POST请求
  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT请求
  async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE请求
  async delete(url, data = null) {
    const options = {
      method: 'DELETE',
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    return this.request(url, options);
  }

  // 记录相关API
  records = {
    // 获取所有记录（支持过滤）
    getAll: (params = {}) => this.get(API_ENDPOINTS.RECORDS, params),
    
    // 获取单个记录
    getById: (id) => this.get(`${API_ENDPOINTS.RECORDS}/${id}`),
    
    // 创建记录
    create: (data) => this.post(API_ENDPOINTS.RECORDS, data),
    
    // 批量创建记录
    bulkCreate: (records) => this.post(API_ENDPOINTS.RECORDS_BULK, { records }),
    
    // 更新记录
    update: (id, data) => this.put(`${API_ENDPOINTS.RECORDS}/${id}`, data),
    
    // 批量更新记录
    bulkUpdate: (ids, updates) => this.put(API_ENDPOINTS.RECORDS_BULK_UPDATE, { ids, updates }),
    
    // 删除记录
    delete: (id) => this.delete(`${API_ENDPOINTS.RECORDS}/${id}`),
    
    // 批量删除记录
    bulkDelete: (ids) => this.delete(API_ENDPOINTS.RECORDS_BULK_DELETE, { ids }),
    
    // 获取唯一姓名列表
    getNames: (region) => this.get(API_ENDPOINTS.RECORDS_NAMES, region ? { region } : {}),
    
    // 获取日期聚合数据
    getAggregateByDate: (date, region) => this.get(API_ENDPOINTS.RECORDS_AGGREGATE, { date, region }),
  };

  // 效率分析相关API
  efficiencyAnalysis = {
    // 获取所有分析结果
    getAll: (params = {}) => this.get(API_ENDPOINTS.EFFICIENCY_ANALYSIS, params),
    
    // 获取单个分析结果
    getById: (id) => this.get(`${API_ENDPOINTS.EFFICIENCY_ANALYSIS}/${id}`),
    
    // 创建分析结果
    create: (data) => this.post(API_ENDPOINTS.EFFICIENCY_ANALYSIS, data),
    
    // 删除分析结果
    delete: (id) => this.delete(`${API_ENDPOINTS.EFFICIENCY_ANALYSIS}/${id}`),
  };

  // 跨区域数据相关API
  crossRegion = {
    // 获取所有区域的汇总统计
    getSummary: (params = {}) => this.get(API_ENDPOINTS.CROSS_REGION_SUMMARY, params),
    
    // 获取所有区域的效率分析历史
    getEfficiencyHistory: (params = {}) => this.get(API_ENDPOINTS.CROSS_REGION_EFFICIENCY_HISTORY, params),
    
    // 获取区域排名
    getRankings: (params = {}) => this.get(API_ENDPOINTS.CROSS_REGION_RANKINGS, params),
    
    // 获取区域对比数据
    getComparison: (params = {}) => this.get(API_ENDPOINTS.CROSS_REGION_COMPARISON, params),
  };

  // 扫描记录相关API
  scanRecords = {
    // 获取所有扫描记录（支持过滤）
    getAll: (params = {}) => this.get(API_ENDPOINTS.SCAN_RECORDS, params),
    
    // 获取单个扫描记录
    getById: (id) => this.get(`${API_ENDPOINTS.SCAN_RECORDS}/${id}`),
    
    // 根据条形码获取记录（用于回填）
    getByBarcode: (barcode) => this.get(`${API_ENDPOINTS.SCAN_RECORDS}/barcode/${barcode}`),
    
    // 根据条形码获取所有记录（用于修改页面）
    getAllByBarcode: (barcode) => this.get(`${API_ENDPOINTS.SCAN_RECORDS}/barcode/${barcode}/all`),
    
    // 创建扫描记录
    create: (data) => this.post(API_ENDPOINTS.SCAN_RECORDS, data),
    
    // 更新扫描记录
    update: (id, data) => this.put(`${API_ENDPOINTS.SCAN_RECORDS}/${id}`, data),
    
    // 删除扫描记录
    delete: (id) => this.delete(`${API_ENDPOINTS.SCAN_RECORDS}/${id}`),
    
    // 获取合并后的历史记录
    getMergedHistory: (params = {}) => this.get(`${API_ENDPOINTS.SCAN_RECORDS}/history/merged`, params),
  };

  // 货量数据相关API
  inboundData = {
    // 上传到件扫描记录
    uploadScans: (records) => this.post(API_ENDPOINTS.INBOUND_SCANS_UPLOAD, { records }),
    
    // 获取到件扫描记录
    getScans: (params = {}) => this.get(API_ENDPOINTS.INBOUND_SCANS, params),
    
    // 获取聚合统计
    getAggregate: (params = {}) => this.get(API_ENDPOINTS.INBOUND_SCANS_AGGREGATE, params),
    
    // 供应商管理
    getSuppliers: () => this.get(API_ENDPOINTS.SUPPLIERS),
    createSupplier: (data) => this.post(API_ENDPOINTS.SUPPLIERS, data),
    updateSupplier: (id, data) => this.put(`${API_ENDPOINTS.SUPPLIERS}/${id}`, data),
    deleteSupplier: (id) => this.delete(`${API_ENDPOINTS.SUPPLIERS}/${id}`),
    
    // 路由管理
    getRoutes: () => this.get(API_ENDPOINTS.ROUTES),
    createRoute: (data) => this.post(API_ENDPOINTS.ROUTES, data),
    updateRoute: (id, data) => this.put(`${API_ENDPOINTS.ROUTES}/${id}`, data),
    deleteRoute: (id) => this.delete(`${API_ENDPOINTS.ROUTES}/${id}`),
    
    // 供应商-路由关联管理
    getMappings: () => this.get(API_ENDPOINTS.SUPPLIER_ROUTE_MAPPINGS),
    createMapping: (data) => this.post(API_ENDPOINTS.SUPPLIER_ROUTE_MAPPINGS, data),
    deleteMapping: (id) => this.delete(`${API_ENDPOINTS.SUPPLIER_ROUTE_MAPPINGS}/${id}`),
  };

  // 工资相关API
  wages = {
    // 获取工资统计
    getStatistics: (params = {}) => this.get(API_ENDPOINTS.WAGES_STATISTICS, params),
    
    // 获取工资记录（支持筛选和分页）
    getRecords: (params = {}) => {
      const url = `${API_ENDPOINTS.WAGES}/records`;
      return this.get(url, params);
    },
    
    // 获取效率与成本汇总数据（聚合接口，减少请求次数）
    getEfficiencyCostSummary: (params = {}) => {
      const url = `${API_ENDPOINTS.WAGES}/efficiency-cost-summary`;
      return this.get(url, params);
    },
  };

  // 服务数据相关API
  serviceData = {
    // 问题件相关
    uploadProblemItems: (records) => this.post(API_ENDPOINTS.PROBLEM_ITEMS_UPLOAD, { records }),
    getProblemItems: (params = {}) => this.get(API_ENDPOINTS.PROBLEM_ITEMS, params),
    
    // 丢包相关
    uploadLostPackages: (records) => this.post(API_ENDPOINTS.LOST_PACKAGES_UPLOAD, { records }),
    getLostPackages: (params = {}) => this.get(API_ENDPOINTS.LOST_PACKAGES, params),
    
    // 客诉相关
    uploadComplaints: (records) => this.post(API_ENDPOINTS.COMPLAINTS_UPLOAD, { records }),
    getComplaints: (params = {}) => this.get(API_ENDPOINTS.COMPLAINTS, params),
    deleteComplaints: () => this.delete(API_ENDPOINTS.COMPLAINTS),
  };

  // 健康检查
  async checkHealth() {
    try {
      const response = await this.get(API_ENDPOINTS.HEALTH);
      return response;
    } catch (error) {
      console.error('健康检查失败:', error);
      return { status: 'error', message: error.message };
    }
  }
}

export const apiClient = new APIClient();
export default apiClient;

