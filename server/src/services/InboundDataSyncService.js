import DataSyncService from './DataSyncService.js';
import InboundScanRecord from '../models/InboundScanRecord.js';
import { runPost } from '../utils/dataFromExternal.js';

/**
 * 货量数据同步服务
 * 从外部API (https://ds.imile.com/lm/express/ops/v1/biz/inbound/query) 同步到MongoDB
 */
class InboundDataSyncService extends DataSyncService {
  constructor() {
    super('inbound', {
      url: 'https://ds.imile.com/lm/express/ops/v1/biz/inbound/query',
      method: 'POST'
    });
  }

  /**
   * 实现具体的数据获取和保存逻辑
   * @param {Array<string>} dates - 需要同步的日期数组
   * @param {string} token - JWT token
   * @param {object} options - 选项
   * @returns {Promise<object>} { recordCount: number }
   */
  async fetchAndSaveData(dates, token, options = {}) {
    let totalRecordCount = 0;
    
    // 根据日期数量动态调整批次大小
    // 如果超过30天，每批处理10天；否则每批处理3天
    const batchSize = dates.length > 30 ? 10 : 3;
    
    // 分批处理日期
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      const progress = Math.floor((i / dates.length) * 100);
      console.log(`📦 正在同步第 ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)} 批 (${progress}% 完成)...`);
      
      for (const date of batchDates) {
        const recordCount = await this.syncSingleDay(date, token);
        totalRecordCount += recordCount;
      }
    }
    
    return { recordCount: totalRecordCount };
  }

  /**
   * 获取MongoDB中最新的数据日期
   * @returns {Promise<string|null>} 最新数据日期 (YYYY-MM-DD) 或 null
   */
  async getLatestDataDate() {
    try {
      const latestRecord = await InboundScanRecord.findOne()
        .sort({ scanDate: -1 })
        .select('scanDate')
        .lean();
      
      return latestRecord?.scanDate || null;
    } catch (error) {
      console.error('查询最新数据日期失败:', error);
      return null;
    }
  }

  /**
   * 删除超过3个月的旧数据
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteOldData() {
    try {
      // 计算3个月前的日期
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const cutoffDate = threeMonthsAgo.toISOString().split('T')[0];
      
      console.log(`🗑️  正在删除 ${cutoffDate} 之前的旧数据...`);
      
      const result = await InboundScanRecord.deleteMany({
        scanDate: { $lt: cutoffDate }
      });
      
      return result.deletedCount || 0;
    } catch (error) {
      console.error('删除旧数据失败:', error);
      return 0;
    }
  }

  /**
   * 同步单天的数据
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} token - JWT token
   * @returns {Promise<number>} 同步的记录数
   */
  async syncSingleDay(date, token) {
    try {
      console.log(`  📅 同步 ${date} 的数据...`);
      
      // 调用外部API - 使用正确的参数格式
      const params = {
        currentPage: 1,
        endTime: `${date} 23:59:59`,
        isLatest: 0,
        orderScopeNew: "",
        receiveType: "All",
        scanTypeList: ["100", "300", "2500", "600"],
        searchNoList: [],
        showCount: 9999, // 获取所有数据
        startTime: `${date} 00:00:00`,
        vehicleUuid: ""
      };
      
      const startTime = Date.now();
      const result = await runPost(this.externalApiConfig.url, params, token);
      const requestTime = Date.now() - startTime;
      
      // 提取数据：resultObject.data 或 resultObject.results
      const rawData = result?.resultObject?.data || result?.resultObject?.results || [];
      console.log(`  ⏱️  外部API响应: ${requestTime}ms, 获取 ${rawData.length} 条原始数据`);
      
      if (rawData.length === 0) {
        console.log(`  ⚠️  ${date} 无数据`);
        return 0;
      }
      
      // 转换并保存数据
      const saveStartTime = Date.now();
      const records = rawData.map(item => ({
        waybillNumber: item.waybillNo || item.waybillNumber,
        scanTime: item.scanDate ? new Date(item.scanDate) : new Date(item.scanTime || `${date} 00:00:00`),
        scanDate: date,
        routeCode: item.routeCode || item.route || 'UNKNOWN',
        uploadBatchId: `sync_${date}_${Date.now()}`
      }));
      
      // 批量插入（使用bulkWrite处理重复 - 根据运单号去重）
      const bulkOps = records.map(record => ({
        updateOne: {
          filter: { waybillNumber: record.waybillNumber },
          update: { $setOnInsert: record },
          upsert: true
        }
      }));
      
      const bulkResult = await InboundScanRecord.bulkWrite(bulkOps, { ordered: false });
      const insertedCount = bulkResult.upsertedCount || 0;
      const saveTime = Date.now() - saveStartTime;
      
      console.log(`  ✅ ${date}: 插入 ${insertedCount} 条新记录（跳过 ${records.length - insertedCount} 条重复），耗时 ${saveTime}ms`);
      
      return insertedCount;
      
    } catch (error) {
      console.error(`  ❌ ${date} 同步失败:`, error.message);
      // 不抛出错误，继续处理下一天
      return 0;
    }
  }
}

export default InboundDataSyncService;
