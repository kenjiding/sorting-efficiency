// API配置 - 自动检测当前访问地址
const getApiBaseUrl = () => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 使用环境变量 API URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  // 自动检测：如果当前访问的不是localhost，使用当前hostname
  // const hostname = window.location.hostname;
  if ((hostname !== 'localhost') && (hostname !== '127.0.0.1')) {
    // 移动端访问，使用当前hostname（保持相同的IP地址）
    const apiUrl = `http://${hostname}:7890/api`;
    return apiUrl;
  }
  
  // 默认使用localhost
  const defaultUrl = 'http://localhost:7890/api';
  console.log('💻 PC端访问，使用默认 API URL:', defaultUrl);
  return defaultUrl;
};

const API_BASE_URL = getApiBaseUrl();

console.log('✅ 最终 API Base URL:', API_BASE_URL);

export const API_ENDPOINTS = {
  // 记录相关
  RECORDS: `${API_BASE_URL}/records`,
  RECORDS_BULK: `${API_BASE_URL}/records/bulk`,
  RECORDS_BULK_UPDATE: `${API_BASE_URL}/records/bulk/update`,
  RECORDS_BULK_DELETE: `${API_BASE_URL}/records/bulk/delete`,
  RECORDS_NAMES: `${API_BASE_URL}/records/meta/names`,
  RECORDS_AGGREGATE: `${API_BASE_URL}/records/aggregate/by-date`,
  
  // 效率分析相关
  EFFICIENCY_ANALYSIS: `${API_BASE_URL}/efficiency-analysis`,
  
  // 跨区域数据相关
  CROSS_REGION_SUMMARY: `${API_BASE_URL}/cross-region/summary`,
  CROSS_REGION_EFFICIENCY_HISTORY: `${API_BASE_URL}/cross-region/efficiency-history`,
  CROSS_REGION_RANKINGS: `${API_BASE_URL}/cross-region/rankings`,
  CROSS_REGION_COMPARISON: `${API_BASE_URL}/cross-region/comparison`,
  
  // 扫描记录相关
  SCAN_RECORDS: `${API_BASE_URL}/scan-records`,
  
  // 货量数据相关
  INBOUND_DATA: `${API_BASE_URL}/inbound-data`,
  INBOUND_SCANS: `${API_BASE_URL}/inbound-data/inbound-scans`,
  INBOUND_SCANS_UPLOAD: `${API_BASE_URL}/inbound-data/inbound-scans/upload`,
  INBOUND_SCANS_AGGREGATE: `${API_BASE_URL}/inbound-data/inbound-scans/aggregate`,
  SUPPLIERS: `${API_BASE_URL}/inbound-data/suppliers`,
  ROUTES: `${API_BASE_URL}/inbound-data/routes`,
  SUPPLIER_ROUTE_MAPPINGS: `${API_BASE_URL}/inbound-data/supplier-route-mappings`,
  
  // 工资相关
  WAGES: `${API_BASE_URL}/wages`,
  WAGES_STATISTICS: `${API_BASE_URL}/wages/statistics`,
  
  // 服务数据相关
  SERVICE_DATA: `${API_BASE_URL}/service-data`,
  PROBLEM_ITEMS: `${API_BASE_URL}/service-data/problem-items`,
  PROBLEM_ITEMS_UPLOAD: `${API_BASE_URL}/service-data/problem-items/upload`,
  LOST_PACKAGES: `${API_BASE_URL}/service-data/lost-packages`,
  LOST_PACKAGES_UPLOAD: `${API_BASE_URL}/service-data/lost-packages/upload`,
  COMPLAINTS: `${API_BASE_URL}/service-data/complaints`,
  COMPLAINTS_UPLOAD: `${API_BASE_URL}/service-data/complaints/upload`,
  
  // 健康检查
  HEALTH: `${API_BASE_URL.replace('/api', '')}/health`,
};

export default API_BASE_URL;

