import SyncMetadata from '../models/SyncMetadata.js';

/**
 * 数据同步服务基类
 * 提供通用的同步逻辑框架，子类只需实现具体的数据获取和保存逻辑
 */
class DataSyncService {
  /**
   * @param {string} dataType - 数据类型标识（如 'inbound', 'problemItem'）
   * @param {object} externalApiConfig - 外部API配置
   */
  constructor(dataType, externalApiConfig = {}) {
    this.dataType = dataType;
    this.externalApiConfig = externalApiConfig;
  }

  /**
   * 获取上次同步的元数据
   * @returns {Promise<Object|null>}
   */
  async getLastSyncMetadata() {
    try {
      const metadata = await SyncMetadata.findOne({ dataType: this.dataType });
      return metadata;
    } catch (error) {
      console.error(`获取${this.dataType}同步元数据失败:`, error);
      return null;
    }
  }

  /**
   * 计算需要同步的日期范围
   * @param {string} lastSyncDate - 上次同步的日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期（默认今天）
   * @returns {Array<string>} 日期数组
   */
  calculateSyncDateRange(lastSyncDate, endDate = null) {
    const dates = [];
    const end = endDate ? new Date(endDate) : new Date();
    
    // 如果lastSyncDate不存在（首次同步），从3个月前开始
    const start = lastSyncDate 
      ? new Date(new Date(lastSyncDate).getTime() + 24 * 60 * 60 * 1000) // 从下一天开始
      : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); // 3个月前（90天）
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * 获取MongoDB中最新的数据日期（子类可选实现）
   * @returns {Promise<string|null>}
   */
  async getLatestDataDate() {
    return null;
  }

  /**
   * 删除超过4个月的旧数据（子类实现）
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteOldData() {
    return 0;
  }

  /**
   * 执行同步（模板方法）
   * @param {string} token - JWT token
   * @param {object} options - 同步选项
   * @returns {Promise<object>} 同步结果
   */
  async sync(token, options = {}) {
    const startTime = Date.now();
    const endDate = options.endDate || new Date().toISOString().split('T')[0];
    
    try {
      console.log(`\n🔄 开始同步 ${this.dataType} 数据...`);
      
      // 1. 优先从MongoDB获取最新数据日期，如果没有则从SyncMetadata获取
      let lastSyncDate = await this.getLatestDataDate();
      
      if (!lastSyncDate) {
        const lastSync = await this.getLastSyncMetadata();
        lastSyncDate = lastSync?.lastSyncDate || null;
      }
      
      if (lastSyncDate) {
        console.log(`📅 数据库最新数据日期: ${lastSyncDate}`);
      } else {
        console.log(`📅 数据库无数据，首次同步将获取最近3个月数据`);
      }
      
      // 2. 计算需要同步的日期范围
      const datesToSync = this.calculateSyncDateRange(lastSyncDate, endDate);
      
      if (datesToSync.length === 0) {
        console.log(`✅ ${this.dataType} 数据已是最新，无需同步`);
        return {
          success: true,
          message: '数据已是最新',
          syncedRecordCount: 0,
          dateRange: { start: endDate, end: endDate },
          duration: Date.now() - startTime
        };
      }
      
      console.log(`📊 需要同步的日期: ${datesToSync[0]} 至 ${datesToSync[datesToSync.length - 1]} (共${datesToSync.length}天)`);
      
      if (datesToSync.length > 30) {
        console.log(`⚠️  数据量较大，预计需要较长时间，请耐心等待...`);
      }
      
      // 3. 更新同步状态为进行中
      await SyncMetadata.findOneAndUpdate(
        { dataType: this.dataType },
        {
          status: 'in_progress',
          lastSyncTimestamp: new Date()
        },
        { upsert: true }
      );
      
      // 4. 执行具体的数据获取和保存（由子类实现）
      const result = await this.fetchAndSaveData(datesToSync, token, options);
      
      // 4.5. 异步删除超过4个月的旧数据（不阻塞同步流程）
      this.deleteOldData().then(deletedCount => {
        if (deletedCount > 0) {
          console.log(`🗑️  已删除 ${deletedCount} 条超过4个月的旧数据`);
        }
      }).catch(err => {
        console.error('删除旧数据失败:', err);
      });
      
      // 5. 更新同步元数据
      const duration = Date.now() - startTime;
      await SyncMetadata.findOneAndUpdate(
        { dataType: this.dataType },
        {
          lastSyncDate: datesToSync[datesToSync.length - 1],
          lastSyncTimestamp: new Date(),
          status: 'success',
          syncedRecordCount: result.recordCount,
          syncDateRange: {
            start: datesToSync[0],
            end: datesToSync[datesToSync.length - 1]
          },
          durationMs: duration,
          errorMessage: null,
          apiConfig: this.externalApiConfig
        },
        { upsert: true }
      );
      
      console.log(`✅ ${this.dataType} 同步完成！共${result.recordCount}条记录，耗时${duration}ms`);
      
      return {
        success: true,
        message: `成功同步${result.recordCount}条记录`,
        syncedRecordCount: result.recordCount,
        dateRange: {
          start: datesToSync[0],
          end: datesToSync[datesToSync.length - 1]
        },
        duration
      };
      
    } catch (error) {
      console.error(`❌ ${this.dataType} 同步失败:`, error);
      
      // 更新同步元数据为失败状态
      await SyncMetadata.findOneAndUpdate(
        { dataType: this.dataType },
        {
          status: 'failed',
          errorMessage: error.message,
          lastSyncTimestamp: new Date(),
          durationMs: Date.now() - startTime
        },
        { upsert: true }
      );
      
      // 返回错误信息而不是抛出，让前端能够显示
      return {
        success: false,
        message: error.message || '同步失败',
        error: error.message,
        syncedRecordCount: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 获取并保存数据（抽象方法，由子类实现）
   * @param {Array<string>} dates - 需要同步的日期数组
   * @param {string} token - JWT token
   * @param {object} options - 选项
   * @returns {Promise<object>} { recordCount: number }
   */
  async fetchAndSaveData(dates, token, options) {
    throw new Error('fetchAndSaveData() 必须由子类实现');
  }

  /**
   * 获取同步状态
   * @returns {Promise<object>}
   */
  async getSyncStatus() {
    const metadata = await this.getLastSyncMetadata();
    console.log('metadata', metadata);
    if (!metadata) {
      return {
        dataType: this.dataType,
        status: 'never_synced',
        lastSyncDate: null,
        message: '从未同步过'
      };
    }
    
    return {
      dataType: this.dataType,
      status: metadata.status,
      lastSyncDate: metadata.lastSyncDate,
      lastSyncTimestamp: metadata.lastSyncTimestamp,
      syncedRecordCount: metadata.syncedRecordCount,
      syncDateRange: metadata.syncDateRange,
      durationMs: metadata.durationMs,
      errorMessage: metadata.errorMessage
    };
  }
}

export default DataSyncService;
