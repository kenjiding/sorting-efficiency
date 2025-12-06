// OpenAI API工具函数
// 用于调用OpenAI API进行数据分析

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 调用OpenAI API进行分析（流式输出）
 * @param {string} prompt - 分析提示词
 * @param {Function} onChunk - 接收每个数据块的回调函数 (chunk: string) => void
 * @param {AbortSignal} signal - 可选的AbortSignal用于取消请求
 * @returns {Promise<void>}
 */
export async function analyzeWithOpenAIStream(prompt, onChunk, signal) {
  // 从环境变量读取API Key
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API Key未配置，请在环境变量中设置VITE_OPENAI_API_KEY');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // 使用gpt-4o-mini模型，性价比更高
        messages: [
          {
            role: 'system',
            content: '你是一位顶级的快递物流行业数据分析专家，擅长分析物流行业各种情况的数据。请根据提供的数据进行深入分析，提供专业的见解和建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        stream: true // 启用流式输出
      }),
      signal // 支持取消请求
    });

    if (!response.ok) {
      // 对于流式响应，错误信息可能在响应体中
      try {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `OpenAI API错误: ${response.status}`);
      } catch (e) {
        // 如果不是JSON，使用状态码
        throw new Error(`OpenAI API错误: ${response.status} ${response.statusText}`);
      }
    }

    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // 检查是否已取消
        if (signal?.aborted) {
          reader.cancel();
          throw new DOMException('请求已取消', 'AbortError');
        }

        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // 解码数据块
        buffer += decoder.decode(value, { stream: true });
        
        // 处理SSE格式的数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || '';
              if (content && onChunk) {
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
              console.warn('解析SSE数据失败:', e, data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('OpenAI API调用失败:', error);
    throw error;
  }
}

/**
 * 调用OpenAI API进行分析（非流式，保留用于兼容）
 * @param {string} prompt - 分析提示词
 * @returns {Promise<string>} - AI分析结果
 */
export async function analyzeWithOpenAI(prompt) {
  // 从环境变量读取API Key
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API Key未配置，请在环境变量中设置VITE_OPENAI_API_KEY');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 使用gpt-4o-mini模型，性价比更高
        messages: [
          {
            role: 'system',
            content: '你是一位顶级的快递物流行业数据分析专家，擅长分析物流行业各种情况的数据。请根据提供的数据进行深入分析，提供专业的见解和建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '分析结果为空';
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    throw error;
  }
}

/**
 * 构建货量数据分析的prompt
 * @param {Array} comparisonPeriods - 对比周期数据
 * @param {Object} summaryStats - 汇总统计
 * @returns {string} - 分析提示词
 */
export function buildVolumeDataPrompt(comparisonPeriods, summaryStats) {
  let prompt = `# 货量数据分析请求
  - 你需要根据以下数据进行详细的分析, 每点都需要深入分析. 不能笼统的泛泛而谈!!!

## 数据概览
- 对比周期数量: ${comparisonPeriods.length}
- 基准周总货量: ${summaryStats.totalBase.toLocaleString()}
- 对比周总货量: ${summaryStats.totalCompare.toLocaleString()}
- 总变化量: ${summaryStats.totalDiff >= 0 ? '+' : ''}${summaryStats.totalDiff.toLocaleString()}
- 平均变化率: ${summaryStats.avgChangeRate}%
- 增长周期数: ${summaryStats.increaseCount}/${summaryStats.totalPeriods}

## 详细周期数据
`;

  comparisonPeriods.forEach((period, index) => {
    prompt += `
### ${period.label} (${index + 1}/${comparisonPeriods.length})
- 基准周: ${period.baseRange.start} 至 ${period.baseRange.end}
- 对比周: ${period.compareRange.start} 至 ${period.compareRange.end}
- 基准周总货量: ${period.baseTotal.toLocaleString()}
- 对比周总货量: ${period.compareTotal.toLocaleString()}
- 变化量: ${period.diff >= 0 ? '+' : ''}${period.diff.toLocaleString()}
- 变化率: ${period.changeRate >= 0 ? '+' : ''}${period.changeRate}%
- 趋势: ${period.isIncrease ? '增长' : '下降'}

#### 供应商数据（前5名）
${period.suppliers.slice(0, 5).map(s => 
  `- ${s.supplierName || s.supplierId}: 基准周${s.count.toLocaleString()}, 对比周${s.compareCount.toLocaleString()}, 变化${s.supplierDiff >= 0 ? '+' : ''}${s.supplierDiff.toLocaleString()} (${s.supplierChangeRate >= 0 ? '+' : ''}${s.supplierChangeRate}%)`
).join('\n')}

#### 路由码数据（前5名）
${period.routes.slice(0, 5).map(r => 
  `- ${r.routeCode}: 基准周${r.count.toLocaleString()}, 对比周${r.compareCount.toLocaleString()}, 变化${r.routeDiff >= 0 ? '+' : ''}${r.routeDiff.toLocaleString()} (${r.routeChangeRate >= 0 ? '+' : ''}${r.routeChangeRate}%)`
).join('\n')}
`;
  });

  prompt += `
## 分析要求
请基于以上数据，从以下角度进行专业分析：
1. 整体趋势分析：货量变化的整体趋势和规律
2. 周期对比分析：各周期之间的变化特点和原因推测
3. 供应商分析：主要供应商的表现和变化原因
4. 路由码分析：主要路由码的货量分布和变化
5. 问题识别：识别可能存在的问题和风险点
6. 改进建议：提供针对性的改进建议和优化方向

请用结构化的方式输出分析结果，包括：
- 核心发现
- 趋势分析
- 问题识别
- 改进建议
`;

  return prompt;
}

/**
 * 构建成本数据（人效分析）的prompt
 * @param {Array} efficiencyData - 人效数据
 * @param {Array} costData - 成本数据
 * @param {string} filterType - 筛选类型 ('week' | 'day')
 * @returns {string} - 分析提示词
 */
export function buildCostDataPrompt(efficiencyData, costData, filterType) {
  let prompt = `# 成本数据 - 人效分析请求
  - 你需要根据以下数据进行详细的分析, 每点都需要深入分析. 不能笼统的泛泛而谈!!!

## 数据概览
- 筛选类型: ${filterType === 'week' ? '周单位' : '天单位'}
- 人效数据记录数: ${efficiencyData.length}
- 成本数据记录数: ${costData.length}

## 人效数据详情
`;

  if (filterType === 'week') {
    efficiencyData.forEach((period, index) => {
      prompt += `
### ${period.label} (${index + 1}/${efficiencyData.length})
- 基准周: ${period.baseRange.start} 至 ${period.baseRange.end}
- 对比周: ${period.compareRange.start} 至 ${period.compareRange.end}
- 基准周人效: ${period.baseEfficiency}
- 对比周人效: ${period.compareEfficiency}
- 变化量: ${period.efficiencyDiff >= 0 ? '+' : ''}${period.efficiencyDiff}
- 基准周总货量: ${period.baseTotalVolume.toLocaleString()}
- 对比周总货量: ${period.compareTotalVolume.toLocaleString()}
- 基准周总工时: ${period.baseTotalHours.toLocaleString()}
- 对比周总工时: ${period.compareTotalHours.toLocaleString()}
`;
    });
  } else {
    efficiencyData.slice(0, 10).forEach((day, index) => {
      prompt += `
### ${day.date}
- 人效率: ${day.efficiency}
- 总货量: ${day.totalVolume.toLocaleString()}
- 总工时: ${day.totalHours.toLocaleString()}
- 变化: ${day.change !== null ? (day.change >= 0 ? '+' : '') + day.change : '无对比数据'}
`;
    });
  }

  prompt += `
## 成本数据详情
`;

  if (filterType === 'week') {
    costData.forEach((period, index) => {
      prompt += `
### ${period.label} (${index + 1}/${costData.length})
- 基准周成本: $${period.baseTotalCost.toLocaleString()}
- 对比周成本: $${period.compareTotalCost.toLocaleString()}
- 变化量: ${period.costDiff >= 0 ? '+' : ''}$${Math.abs(period.costDiff).toLocaleString()}
`;
    });
  } else {
    costData.slice(0, 10).forEach((day, index) => {
      prompt += `
### ${day.date}
- 总成本: $${day.totalCost.toLocaleString()}
- 变化: ${day.change !== null ? (day.change >= 0 ? '+' : '') + '$' + Math.abs(day.change).toLocaleString() : '无对比数据'}
`;
    });
  }

  prompt += `
## 分析要求
请基于以上数据，从以下角度进行专业分析：
1. 人效趋势分析：人效率的变化趋势和影响因素
2. 成本趋势分析：成本的变化趋势和成本控制效果
3. 人效与成本关联分析：人效变化对成本的影响
4. 效率优化分析：识别效率提升的机会点
5. 成本优化分析：识别成本降低的机会点
6. 改进建议：提供针对性的改进建议和优化方向

请用结构化的方式输出分析结果，包括：
- 核心发现
- 趋势分析
- 关联分析
- 优化建议
`;

  return prompt;
}

/**
 * 构建服务数据分析的prompt
 * @param {Array} data - 服务数据
 * @param {string} dimension - 维度 ('supplier' | 'driver' | 'reason' | 'routeCode')
 * @param {string} timeUnit - 时间单位 ('day' | 'week' | 'month')
 * @param {Object} timeRange - 时间范围
 * @param {string} dataType - 数据类型 ('problem' | 'lost' | 'complaint')
 * @returns {string} - 分析提示词
 */
export function buildServiceDataPrompt(data, dimension, timeUnit, timeRange, dataType) {
  const dataTypeLabels = {
    problem: '问题件数量',
    lost: '丢包',
    complaint: '客诉'
  };

  const dimensionLabels = {
    supplier: '供应商',
    driver: '司机',
    reason: '问题件原因',
    routeCode: '路由码'
  };

  // 根据数据类型调整维度标签
  if (dataType === 'lost') {
    // 丢包数据没有reason维度
    delete dimensionLabels.reason;
    delete dimensionLabels.routeCode;
  } else if (dataType === 'problem') {
    // 问题件数据没有routeCode维度
    delete dimensionLabels.routeCode;
  }

  let prompt = `# ${dataTypeLabels[dataType]}分析请求
  - 你需要根据以下数据进行详细的分析, 每点都需要深入分析. 不能笼统的泛泛而谈!!!

## 数据概览
- 分析类型: ${dataTypeLabels[dataType]}
- 分析维度: ${dimensionLabels[dimension]}
- 时间单位: ${timeUnit === 'day' ? '天' : timeUnit === 'week' ? '周' : '月'}
- 时间范围: ${timeRange.start} 至 ${timeRange.end}
- 数据记录数: ${data.length}

## 详细数据
`;

  // 按维度聚合数据
  const groupedData = new Map();
  data.forEach(item => {
    let key;
    if (dimension === 'supplier') {
      key = (item.supplier && item.supplier.trim()) || '未知供应商';
    } else if (dimension === 'driver') {
      key = (item.driverName && item.driverName.trim()) || '未知司机';
    } else if (dimension === 'reason') {
      key = (item.reason && item.reason.trim()) || '未知原因';
    } else if (dimension === 'routeCode') {
      key = (item.routeCode && item.routeCode.trim()) || '未知路由码';
    } else {
      key = '未知';
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        key,
        count: 0,
        items: []
      });
    }
    const group = groupedData.get(key);
    group.count += item.count || 0;
    group.items.push(item);
  });

  // 按数量排序，取前10名
  const topItems = Array.from(groupedData.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  topItems.forEach((item, index) => {
    prompt += `
### ${index + 1}. ${item.key}
- 累计数量: ${item.count}
- 记录数: ${item.items.length}
`;
    
    // 如果是天维度，显示时间分布
    if (timeUnit === 'day' && item.items.length > 0) {
      const timeDistribution = {};
      item.items.forEach(record => {
        const date = record.timePeriod || (record.registerTime ? record.registerTime.split('T')[0] : '') || (record.finishTime ? record.finishTime.split('T')[0] : '') || (record.createTime ? record.createTime.split('T')[0] : '');
        if (date) {
          timeDistribution[date] = (timeDistribution[date] || 0) + (record.count || 0);
        }
      });
      const topDates = Object.entries(timeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (topDates.length > 0) {
        prompt += `- 主要发生日期: ${topDates.map(([date, count]) => `${date}(${count})`).join(', ')}\n`;
      }
    }
  });

  // 计算总体统计
  const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
  const avgCount = data.length > 0 ? (totalCount / data.length).toFixed(2) : 0;

  prompt += `
## 总体统计
- 总数量: ${totalCount}
- 平均数量: ${avgCount}
- 维度值数量: ${groupedData.size}
- 前10名占比: ${topItems.reduce((sum, item) => sum + item.count, 0)} (${((topItems.reduce((sum, item) => sum + item.count, 0) / totalCount) * 100).toFixed(2)}%)

## 分析要求
请基于以上数据，从以下角度进行专业分析：
1. 整体趋势分析：${dataTypeLabels[dataType]}的整体趋势和规律
2. 维度分析：从${dimensionLabels[dimension]}维度分析${dataTypeLabels[dataType]}的分布特点
3. 问题识别：识别${dataTypeLabels[dataType]}集中的${dimensionLabels[dimension]}和可能的原因
4. 风险预警：识别需要重点关注的高风险${dimensionLabels[dimension]}
5. 改进建议：提供针对性的改进建议和优化方向

请用结构化的方式输出分析结果，包括：
- 核心发现
- 趋势分析
- 问题识别
- 风险预警
- 改进建议
`;

  return prompt;
}

/**
 * 调用Gemini API进行分析（流式输出）
 * @param {string} prompt - 分析提示词
 * @param {Function} onChunk - 接收每个数据块的回调函数 (chunk: string) => void
 * @param {AbortSignal} signal - 可选的AbortSignal用于取消请求
 * @returns {Promise<void>}
 */
export async function analyzeWithGeminiStream(prompt, onChunk, signal) {
  // 从环境变量读取API Key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API Key未配置，请在环境变量中设置VITE_GEMINI_API_KEY');
  }

  try {
    // 1. 初始化客户端
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. 获取模型实例
    // 目前推荐使用 'gemini-1.5-flash' (速度快) 或 'gemini-1.5-pro' (能力强)
    const model = genAI.getGenerativeModel({ 
      model: import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025",
      generationConfig: {
        temperature: 0.1,
      },
      systemInstruction: '你是一位顶级的快递物流行业数据分析专家，擅长分析物流行业各种情况的数据。请根据提供的数据进行深入分析，提供专业的见解和建议。'
    });

    // 3. 构建完整的提示词（包含系统提示）
    const fullPrompt = prompt;

    // 4. 发起流式请求
    const result = await model.generateContentStream(fullPrompt);

    // 5. 使用 for await...of 循环处理流
    // SDK 会自动处理分块，我们只需要遍历 result.stream
    try {
      for await (const chunk of result.stream) {
        // 检查是否已取消
        if (signal?.aborted) {
          throw new DOMException('请求已取消', 'AbortError');
        }

        const chunkText = chunk.text();
        
        // 调用回调函数处理这部分文本
        if (onChunk && chunkText) {
          onChunk(chunkText);
        }
      }
    } catch (error) {
      // 如果是取消错误，直接抛出
      if (error.name === 'AbortError' || signal?.aborted) {
        throw new DOMException('请求已取消', 'AbortError');
      }
      throw error;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Gemini API调用失败:', error);
    throw new Error(error.message || 'Gemini API调用失败，请检查环境变量中的API Key是否正确配置');
  }
}

/**
 * 调用Gemini API进行分析（非流式，保留用于兼容）
 * @param {string} prompt - 分析提示词
 * @returns {Promise<string>} - AI分析结果
 */
export async function analyzeWithGemini(prompt) {
  // 从环境变量读取API Key
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API Key未配置，请在环境变量中设置VITE_GEMINI_API_KEY');
  }

  try {
    // 1. 初始化客户端
    const genAI = new GoogleGenerativeAI(apiKey);

    // 2. 获取模型实例
    const model = genAI.getGenerativeModel({ 
      model: import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash-preview-09-2025",
      generationConfig: {
        temperature: 0.1,
      },
      systemInstruction: '你是一位顶级的快递物流行业数据分析专家，擅长分析物流行业各种情况的数据。请根据提供的数据进行深入分析，提供专业的见解和建议。'
    });

    // 3. 发起请求
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text || '分析结果为空';
  } catch (error) {
    console.error('Gemini API调用失败:', error);
    throw new Error(error.message || 'Gemini API调用失败，请检查环境变量中的API Key是否正确配置');
  }
}

