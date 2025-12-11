import express from 'express';
import InboundDataSyncService from '../services/InboundDataSyncService.js';
import ProblemItemSyncService from '../services/ProblemItemSyncService.js';

const router = express.Router();

// 服务实例
const inboundSyncService = new InboundDataSyncService();
const problemItemSyncService = new ProblemItemSyncService();

/**
 * 获取所有数据模块的同步状态
 * GET /api/sync/status
 */
router.get('/status', async (req, res) => {
  try {
    const [inboundStatus, problemItemStatus] = await Promise.all([
      inboundSyncService.getSyncStatus(),
      problemItemSyncService.getSyncStatus()
    ]);
    
    res.json({
      success: true,
      data: {
        inbound: inboundStatus,
        problemItem: problemItemStatus
      }
    });
  } catch (error) {
    console.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取同步状态失败',
      error: error.message
    });
  }
});

/**
 * 同步货量数据
 * POST /api/sync/inbound
 * Body: { endDate?: 'YYYY-MM-DD' }
 * Query: token (JWT token)
 */
router.post('/inbound', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    const { endDate } = req.body;
    const options = endDate ? { endDate } : {};
    
    console.log('\n🚀 收到货量数据同步请求...');
    
    const result = await inboundSyncService.sync(token, options);
    
    // 直接返回result，已经包含success状态
    res.json(result);
    
  } catch (error) {
    console.error('货量数据同步失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '货量数据同步失败',
      error: error.message
    });
  }
});

/**
 * 同步问题件数据
 * POST /api/sync/problem-items
 * Body: { endDate?: 'YYYY-MM-DD' }
 * Query: token (JWT token)
 */
router.post('/problem-items', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    const { endDate } = req.body;
    const options = endDate ? { endDate } : {};
    
    console.log('\n🚀 收到问题件数据同步请求...');
    
    const result = await problemItemSyncService.sync(token, options);
    
    // 直接返回result，已经包含success状态
    res.json(result);
    
  } catch (error) {
    console.error('问题件数据同步失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '问题件数据同步失败',
      error: error.message
    });
  }
});

/**
 * 同步所有数据模块
 * POST /api/sync/all
 * Body: { endDate?: 'YYYY-MM-DD' }
 * Query: token (JWT token)
 */
router.post('/all', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    const { endDate } = req.body;
    const options = endDate ? { endDate } : {};
    
    console.log('\n🚀 收到全量数据同步请求...');
    
    // 并行同步所有数据模块
    const [inboundResult, problemItemResult] = await Promise.allSettled([
      inboundSyncService.sync(token, options),
      problemItemSyncService.sync(token, options)
    ]);
    
    // 整理结果
    const results = {
      inbound: inboundResult.status === 'fulfilled' 
        ? inboundResult.value 
        : { success: false, error: inboundResult.reason?.message, message: inboundResult.reason?.message },
      problemItem: problemItemResult.status === 'fulfilled' 
        ? problemItemResult.value 
        : { success: false, error: problemItemResult.reason?.message, message: problemItemResult.reason?.message }
    };
    
    // 计算总体统计
    const totalRecords = 
      (results.inbound.syncedRecordCount || 0) + 
      (results.problemItem.syncedRecordCount || 0);
    
    const allSuccess = 
      (results.inbound.success || false) && 
      (results.problemItem.success || false);
    
    res.json({
      success: allSuccess,
      message: allSuccess 
        ? `全量同步完成，共同步 ${totalRecords} 条记录` 
        : '部分数据同步失败，请查看详情',
      totalRecords,
      details: results
    });
    
  } catch (error) {
    console.error('全量数据同步失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '全量数据同步失败',
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
});

export default router;
