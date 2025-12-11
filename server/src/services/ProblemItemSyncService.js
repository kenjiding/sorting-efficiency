import DataSyncService from './DataSyncService.js';
import ProblemItem from '../models/ProblemItem.js';
import { runPost } from '../utils/dataFromExternal.js';

/**
 * 问题件数据同步服务
 * 从外部API (https://ds.imile.com/dms/migrate/biz/problem/audit/searchNew) 同步到MongoDB
 */
class ProblemItemSyncService extends DataSyncService {
  constructor() {
    super('problemItem', {
      url: 'https://ds.imile.com/dms/migrate/biz/problem/audit/searchNew',
      method: 'POST',
      hubCode: 'S210431701'
    });
  }

  /**
   * 获取MongoDB中最新的数据日期
   * @returns {Promise<string|null>} 最新数据日期 (YYYY-MM-DD) 或 null
   */
  async getLatestDataDate() {
    try {
      const latestRecord = await ProblemItem.findOne()
        .sort({ registerDate: -1 })
        .select('registerDate')
        .lean();
      
      return latestRecord?.registerDate || null;
    } catch (error) {
      console.error('查询最新数据日期失败:', error);
      return null;
    }
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
    const batchSize = options.batchSize || 7; // 问题件API支持7天查询
    
    // 分批处理日期（每批最多7天）
    for (let i = 0; i < dates.length; i += batchSize) {
      const batchDates = dates.slice(i, i + batchSize);
      console.log(`📦 正在同步第 ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)} 批...`);
      
      const recordCount = await this.syncBatch(batchDates, token);
      totalRecordCount += recordCount;
    }
    
    return { recordCount: totalRecordCount };
  }

  /**
   * 同步一批日期的数据（最多7天）
   * @param {Array<string>} dates - 日期数组
   * @param {string} token - JWT token
   * @returns {Promise<number>} 同步的记录数
   */
  async syncBatch(dates, token) {
    try {
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      console.log(`  📅 同步 ${startDate} 至 ${endDate} 的数据...`);
      
      // 调用外部API
      const params = {
        currentPage: 1,
        showCount: 9999, // 获取所有数据
        start: `${startDate} 00:00:00`,
        end: `${endDate} 23:59:59`,
        hubCode: this.externalApiConfig.hubCode,
        searchType: 'register',
        waybillNos: []
      };
      
      const startTime = Date.now();
      const result = await runPost(this.externalApiConfig.url, params, token);
      const requestTime = Date.now() - startTime;
      
      // 提取数据：resultObject.results
      const rawData = result?.resultObject?.results || [];
      console.log(`  ⏱️  外部API响应: ${requestTime}ms, 获取 ${rawData.length} 条原始数据`);
      
      if (rawData.length === 0) {
        console.log(`  ⚠️  ${startDate} 至 ${endDate} 无数据`);
        return 0;
      }
      
      // 转换并保存数据
      const saveStartTime = Date.now();
      const records = rawData.map(item => {
        const registerDateTime = item.registerDateTime || '';
        const registerDate = registerDateTime.split(' ')[0] || startDate;
        
        return {
          waybillNumber: item.waybillNo || item.waybillNumber || '',
          supplier: item.vendor || item.supplier || 'UNKNOWN',
          reason: item.problemReasonDesc || item.reason || 'UNKNOWN',
          driverCode: item.daCode || item.driverCode || '',
          driverName: item.daName || item.driverName || '',
          registerTime: registerDateTime ? new Date(registerDateTime) : new Date(`${registerDate} 00:00:00`),
          registerDate: registerDate,
          routeCode: item.routeCode || '',
          uploadBatchId: `sync_${startDate}_${endDate}_${Date.now()}`
        };
      });
      
      // 批量插入（使用bulkWrite处理重复）
      const bulkOps = records.map(record => ({
        updateOne: {
          filter: { 
            waybillNumber: record.waybillNumber,
            registerDate: record.registerDate 
          },
          update: { $setOnInsert: record },
          upsert: true
        }
      }));
      
      const bulkResult = await ProblemItem.bulkWrite(bulkOps, { ordered: false });
      const insertedCount = bulkResult.upsertedCount || 0;
      const saveTime = Date.now() - saveStartTime;
      
      console.log(`  ✅ ${startDate} 至 ${endDate}: 插入 ${insertedCount} 条新记录（跳过 ${records.length - insertedCount} 条重复），耗时 ${saveTime}ms`);
      
      return insertedCount;
      
    } catch (error) {
      console.error(`  ❌ ${dates[0]} 至 ${dates[dates.length - 1]} 同步失败:`, error.message);
      // 不抛出错误，继续处理下一批
      return 0;
    }
  }
}

export default ProblemItemSyncService;
