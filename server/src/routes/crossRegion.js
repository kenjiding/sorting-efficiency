import express from 'express';
import Record from '../models/Record.js';
import EfficiencyAnalysis from '../models/EfficiencyAnalysis.js';

const router = express.Router();

// 获取所有区域的汇总统计
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const regions = ['SA', 'SYD', 'MEL', 'BNE', 'PER'];
    
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }

    // 获取所有区域的数据
    const regionData = await Promise.all(
      regions.map(async (region) => {
        const records = await Record.find({ ...query, region }).sort({ date: -1 });
        
        // 计算统计数据
        const totalRecords = records.length;
        const totalItems = records.reduce((sum, r) => sum + (Number(r.coarseCount) || 0) + (Number(r.fineCount) || 0), 0);
        const totalWorkingHours = records.reduce((sum, r) => sum + (Number(r.totalWorkingHours) || 0), 0);
        const avgCoarseEfficiency = records.length > 0 
          ? records.reduce((sum, r) => sum + (Number(r.coarseEfficiency) || 0), 0) / records.length 
          : 0;
        const avgFineEfficiency = records.length > 0 
          ? records.reduce((sum, r) => sum + (Number(r.fineEfficiency) || 0), 0) / records.length 
          : 0;
        const overallEfficiency = totalWorkingHours > 0 ? totalItems / totalWorkingHours : 0;
        
        // 获取唯一工人数量
        const uniqueWorkers = [...new Set(records.map(r => r.name))];
        
        return {
          region,
          totalRecords,
          totalItems,
          totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
          avgCoarseEfficiency: Number(avgCoarseEfficiency.toFixed(2)),
          avgFineEfficiency: Number(avgFineEfficiency.toFixed(2)),
          overallEfficiency: Number(overallEfficiency.toFixed(2)),
          workerCount: uniqueWorkers.length,
          workers: uniqueWorkers
        };
      })
    );

    res.json({
      regions: regionData,
      totalAcrossRegions: {
        records: regionData.reduce((sum, r) => sum + r.totalRecords, 0),
        items: regionData.reduce((sum, r) => sum + r.totalItems, 0),
        workingHours: regionData.reduce((sum, r) => sum + r.totalWorkingHours, 0),
        workers: regionData.reduce((sum, r) => sum + r.workerCount, 0)
      }
    });
  } catch (error) {
    console.error('获取跨区域汇总数据失败:', error);
    res.status(500).json({ message: '获取跨区域汇总数据失败', error: error.message });
  }
});

// 获取所有区域的效率分析历史
router.get('/efficiency-history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.analysisDate = { $gte: startDate, $lte: endDate };
    }

    const analyses = await EfficiencyAnalysis.find(query).sort({ analysisDate: -1, region: 1 });
    
    // 按区域分组
    const groupedByRegion = analyses.reduce((acc, analysis) => {
      if (!acc[analysis.region]) {
        acc[analysis.region] = [];
      }
      acc[analysis.region].push(analysis);
      return acc;
    }, {});

    res.json({
      byRegion: groupedByRegion,
      all: analyses
    });
  } catch (error) {
    console.error('获取跨区域效率历史失败:', error);
    res.status(500).json({ message: '获取跨区域效率历史失败', error: error.message });
  }
});

// 获取区域排名
router.get('/rankings', async (req, res) => {
  try {
    const { startDate, endDate, metric = 'efficiency' } = req.query;
    const regions = ['SA', 'SYD', 'MEL', 'BNE', 'PER'];
    
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }

    // 获取各区域数据并排名
    const regionStats = await Promise.all(
      regions.map(async (region) => {
        const records = await Record.find({ ...query, region });
        
        const totalItems = records.reduce((sum, r) => sum + (Number(r.coarseCount) || 0) + (Number(r.fineCount) || 0), 0);
        const totalWorkingHours = records.reduce((sum, r) => sum + (Number(r.totalWorkingHours) || 0), 0);
        const overallEfficiency = totalWorkingHours > 0 ? totalItems / totalWorkingHours : 0;
        const avgCoarseEfficiency = records.length > 0 
          ? records.reduce((sum, r) => sum + (Number(r.coarseEfficiency) || 0), 0) / records.length 
          : 0;
        const avgFineEfficiency = records.length > 0 
          ? records.reduce((sum, r) => sum + (Number(r.fineEfficiency) || 0), 0) / records.length 
          : 0;
        
        return {
          region,
          efficiency: Number(overallEfficiency.toFixed(2)),
          coarseEfficiency: Number(avgCoarseEfficiency.toFixed(2)),
          fineEfficiency: Number(avgFineEfficiency.toFixed(2)),
          totalItems,
          totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
          recordCount: records.length
        };
      })
    );

    // 根据指定指标排序
    let sortedRegions;
    switch (metric) {
      case 'efficiency':
        sortedRegions = regionStats.sort((a, b) => b.efficiency - a.efficiency);
        break;
      case 'totalItems':
        sortedRegions = regionStats.sort((a, b) => b.totalItems - a.totalItems);
        break;
      case 'coarseEfficiency':
        sortedRegions = regionStats.sort((a, b) => b.coarseEfficiency - a.coarseEfficiency);
        break;
      case 'fineEfficiency':
        sortedRegions = regionStats.sort((a, b) => b.fineEfficiency - a.fineEfficiency);
        break;
      default:
        sortedRegions = regionStats.sort((a, b) => b.efficiency - a.efficiency);
    }

    // 添加排名
    const rankedRegions = sortedRegions.map((region, index) => ({
      ...region,
      rank: index + 1
    }));

    res.json(rankedRegions);
  } catch (error) {
    console.error('获取区域排名失败:', error);
    res.status(500).json({ message: '获取区域排名失败', error: error.message });
  }
});

// 获取区域对比数据（用于图表）
router.get('/comparison', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const regions = ['SA', 'SYD', 'MEL', 'BNE', 'PER'];
    
    const query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = startDate;
    }

    const comparisonData = await Promise.all(
      regions.map(async (region) => {
        const records = await Record.find({ ...query, region });
        
        // 按工人分组统计
        const workerStats = records.reduce((acc, record) => {
          if (!acc[record.name]) {
            acc[record.name] = {
              name: record.name,
              totalItems: 0,
              totalWorkingHours: 0,
              coarseTotal: 0,
              fineTotal: 0,
              recordCount: 0
            };
          }
          
          const worker = acc[record.name];
          worker.totalItems += (Number(record.coarseCount) || 0) + (Number(record.fineCount) || 0);
          worker.totalWorkingHours += Number(record.totalWorkingHours) || 0;
          worker.coarseTotal += Number(record.coarseCount) || 0;
          worker.fineTotal += Number(record.fineCount) || 0;
          worker.recordCount++;
          
          return acc;
        }, {});

        const workers = Object.values(workerStats).map(worker => ({
          ...worker,
          efficiency: worker.totalWorkingHours > 0 
            ? Number((worker.totalItems / worker.totalWorkingHours).toFixed(2)) 
            : 0,
          coarseEfficiency: worker.totalWorkingHours > 0 
            ? Number((worker.coarseTotal / worker.totalWorkingHours).toFixed(2)) 
            : 0,
          fineEfficiency: worker.totalWorkingHours > 0 
            ? Number((worker.fineTotal / worker.totalWorkingHours).toFixed(2)) 
            : 0
        }));

        const totalItems = records.reduce((sum, r) => sum + (Number(r.coarseCount) || 0) + (Number(r.fineCount) || 0), 0);
        const totalWorkingHours = records.reduce((sum, r) => sum + (Number(r.totalWorkingHours) || 0), 0);
        const overallEfficiency = totalWorkingHours > 0 ? totalItems / totalWorkingHours : 0;

        return {
          region,
          workers,
          summary: {
            totalItems,
            totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
            overallEfficiency: Number(overallEfficiency.toFixed(2)),
            workerCount: workers.length
          }
        };
      })
    );

    res.json(comparisonData);
  } catch (error) {
    console.error('获取区域对比数据失败:', error);
    res.status(500).json({ message: '获取区域对比数据失败', error: error.message });
  }
});

export default router;

