// 区域常量配置 - 使用英文缩写作为实际值
export const REGIONS = {
  SA: 'SA',      // 南澳 South Australia
  SYD: 'SYD',    // 悉尼 Sydney
  MEL: 'MEL',    // 墨尔本 Melbourne
  BNE: 'BNE',    // 布里斯班 Brisbane
  PER: 'PER'     // 珀斯 Perth
};

// 区域显示名称映射（用于UI显示）
export const REGION_NAMES = {
  SA: '南澳',
  SYD: '悉尼',
  MEL: '墨尔本',
  BNE: '布里斯班',
  PER: '珀斯'
};

// 区域图标映射
export const REGION_ICONS = {
  SA: '🏖️',
  SYD: '🌉',
  MEL: '🏙️',
  BNE: '☀️',
  PER: '🌅'
};

// 获取所有区域代码列表
export const REGION_CODES = Object.values(REGIONS);

// 获取区域显示文本
export const getRegionName = (code) => REGION_NAMES[code] || code;

// 获取区域图标
export const getRegionIcon = (code) => REGION_ICONS[code] || '📍';

