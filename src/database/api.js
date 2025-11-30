// 新的API层，替代IndexedDB
import apiClient from '../api/apiClient';

// 辅助函数：计算时间差
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // 处理跨夜工作
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

// 处理记录数据
function processRecord(record) {
  const processed = { ...record };
  
  // 计算工作时间和效率
  if (record.coarseStartTime && record.coarseEndTime && record.coarseCount !== undefined) {
    const coarseHours = calculateHours(record.coarseStartTime, record.coarseEndTime);
    processed.coarseEfficiency = coarseHours > 0 ? (record.coarseCount / coarseHours).toFixed(2) : '0.00';
  }
  
  if (record.fineStartTime && record.fineEndTime && record.fineCount !== undefined) {
    const fineHours = calculateHours(record.fineStartTime, record.fineEndTime);
    processed.fineEfficiency = fineHours > 0 ? (record.fineCount / fineHours).toFixed(2) : '0.00';
  }

  // 计算总工作时间
  let totalHours = 0;
  if (record.coarseStartTime && record.coarseEndTime) {
    totalHours += calculateHours(record.coarseStartTime, record.coarseEndTime);
  }
  if (record.fineStartTime && record.fineEndTime) {
    totalHours += calculateHours(record.fineStartTime, record.fineEndTime);
  }
  processed.totalWorkingHours = totalHours.toFixed(2);

  return processed;
}

// 记录API - 新的API调用方式
export const recordsAPI = {
  // 添加记录
  async addRecord(record) {
    return await apiClient.records.create(record);
  },

  // 获取所有记录（支持按region过滤）
  async getAllRecords(region = null) {
    const params = region ? { region } : {};
    return await apiClient.records.getAll(params);
  },

  // 按日期范围获取记录
  async getRecordsByDateRange(startDate, endDate, region = null) {
    const params = { startDate, endDate };
    if (region) params.region = region;
    return await apiClient.records.getAll(params);
  },

  // 按日期获取记录
  async getRecordsByDate(date, region = null) {
    const params = { startDate: date, endDate: date };
    if (region) params.region = region;
    return await apiClient.records.getAll(params);
  },

  // 更新记录
  async updateRecord(id, updates) {
    return await apiClient.records.update(id, updates);
  },

  // 删除记录
  async deleteRecord(id) {
    return await apiClient.records.delete(id);
  },

  // 批量添加记录
  async bulkAddRecords(records) {
    return await apiClient.records.bulkCreate(records);
  },

  // 批量删除记录
  async bulkDeleteRecords(ids) {
    return await apiClient.records.bulkDelete(ids);
  },

  // 批量更新记录
  async bulkUpdateRecords(ids, updates) {
    return await apiClient.records.bulkUpdate(ids, updates);
  },

  // 处理记录
  processRecord,

  // 计算小时数
  calculateHours,

  // 获取唯一姓名
  async getUniqueNames(region = null) {
    return await apiClient.records.getNames(region);
  },

  // 获取日期聚合数据
  async getDayAggregatedData(date, region = null) {
    return await apiClient.records.getAggregateByDate(date, region);
  }
};

// 效率分析API
export const efficiencyAnalysisAPI = {
  // 保存分析结果
  async saveAnalysisResult(analysisData) {
    return await apiClient.efficiencyAnalysis.create(analysisData);
  },

  // 获取所有分析结果
  async getAllAnalysisResults(region = null) {
    const params = region ? { region } : {};
    return await apiClient.efficiencyAnalysis.getAll(params);
  },

  // 按ID获取分析结果
  async getAnalysisResultById(id) {
    return await apiClient.efficiencyAnalysis.getById(id);
  },

  // 按日期获取分析结果
  async getAnalysisResultsByDate(analysisDate, region = null) {
    const params = { startDate: analysisDate, endDate: analysisDate };
    if (region) params.region = region;
    return await apiClient.efficiencyAnalysis.getAll(params);
  },

  // 删除分析结果
  async deleteAnalysisResult(id) {
    return await apiClient.efficiencyAnalysis.delete(id);
  },

  // 按日期范围获取分析结果
  async getAnalysisResultsByDateRange(startDate, endDate, region = null) {
    const params = { startDate, endDate };
    if (region) params.region = region;
    return await apiClient.efficiencyAnalysis.getAll(params);
  }
};

// 跨区域API
export const crossRegionAPI = {
  // 获取所有区域的汇总统计
  async getSummary(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await apiClient.crossRegion.getSummary(params);
  },

  // 获取所有区域的效率分析历史
  async getEfficiencyHistory(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await apiClient.crossRegion.getEfficiencyHistory(params);
  },

  // 获取区域排名
  async getRankings(startDate = null, endDate = null, metric = 'efficiency') {
    const params = { metric };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await apiClient.crossRegion.getRankings(params);
  },

  // 获取区域对比数据
  async getComparison(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return await apiClient.crossRegion.getComparison(params);
  }
};

