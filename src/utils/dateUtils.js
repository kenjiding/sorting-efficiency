import { startOfWeek, endOfWeek, format, parseISO, subWeeks } from 'date-fns';

/**
 * 获取澳洲时区的当前日期字符串（YYYY-MM-DD格式）
 * 支持多个澳洲时区：Sydney, Melbourne, Brisbane, Adelaide, Perth
 */
const getAustraliaDateString = (region = 'SYD') => {
  // 澳洲时区映射
  const timeZoneMap = {
    'SYD': 'Australia/Sydney',    // 悉尼 (有夏令时)
    'MEL': 'Australia/Melbourne', // 墨尔本 (有夏令时)
    'BNE': 'Australia/Brisbane',  // 布里斯班 (无夏令时)
    'SA': 'Australia/Adelaide',   // 南澳 (有夏令时)
    'PER': 'Australia/Perth'      // 珀斯 (无夏令时)
  };
  
  const timeZone = timeZoneMap[region] || 'Australia/Sydney';
  
  // 使用 Intl API 获取澳洲时区的当前日期字符串
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' 格式为 YYYY-MM-DD
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(now);
};

/**
 * 获取澳洲时区的当前日期对象
 * 用于周计算的基准日期
 */
const getAustraliaDate = (region = 'SYD') => {
  const dateString = getAustraliaDateString(region);
  // parseISO 解析 ISO 格式日期字符串，创建本地时区的 Date 对象
  // 这里的日期值代表澳洲时区的日期
  return parseISO(dateString);
};

/**
 * 获取本周的日期范围（周一到周日）
 * 以澳洲时间为准
 * @param {string} region - 区域代码，默认为 'SYD'
 * @returns {Object} { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export const getThisWeekRange = (region = 'SYD') => {
  const australiaDate = getAustraliaDate(region);
  
  // 使用 date-fns 的 startOfWeek，指定从周一开始（weekStartsOn: 1）
  const monday = startOfWeek(australiaDate, { weekStartsOn: 1 });
  const sunday = endOfWeek(australiaDate, { weekStartsOn: 1 });
  
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd')
  };
};

/**
 * 获取指定周数前的日期范围（周一到周日）
 * @param {number} weeksAgo - 几周前，0表示本周，1表示上周
 * @param {string} region - 区域代码，默认为 'SYD'
 * @returns {Object} { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export const getWeekRange = (weeksAgo, region = 'SYD') => {
  const australiaDate = getAustraliaDate(region);
  
  // 如果 weeksAgo 为 0，直接返回本周
  if (weeksAgo === 0) {
    return getThisWeekRange(region);
  }
  
  // 使用 date-fns 的 subWeeks 来减去周数，然后计算该周的起始和结束
  const targetDate = subWeeks(australiaDate, weeksAgo);
  const monday = startOfWeek(targetDate, { weekStartsOn: 1 });
  const sunday = endOfWeek(targetDate, { weekStartsOn: 1 });
  
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: format(sunday, 'yyyy-MM-dd')
  };
};

/**
 * 获取上周的日期范围（周一到周日）
 * @param {string} region - 区域代码，默认为 'SYD'
 * @returns {Object} { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export const getLastWeekRange = (region = 'SYD') => {
  return getWeekRange(1, region);
};

