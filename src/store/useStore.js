import { create } from 'zustand';
import { recordsAPI } from '../database/api';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const useStore = create((set, get) => ({
  // Authentication state
  user: null,
  isAuthenticated: false,
  loading: false,

  // Records state
  records: [],
  filteredRecords: [],
  error: null,

  // Region state - 全局区域选择（使用英文缩写）
  selectedRegion: localStorage.getItem('selectedRegion') || 'SYD',
  
  // Filter state
  filters: {
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    selectedNames: [], // empty array means all names
  },

  // Benchmark efficiency values (stored in localStorage)
  benchmarkValues: {
    coarseBenchmark: 400, // 粗拣基准效率 (件/小时)
    fineBenchmark: 400,   // 细拣基准效率 (件/小时)
  },

  // UI state
  activeTab: 'entry', // 'entry', 'analysis'
  
  // Data entry state
  isSubmitting: false,
  importProgress: 0,

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Region actions
  setSelectedRegion: (region) => {
    set({ selectedRegion: region });
    localStorage.setItem('selectedRegion', region);
    // 切换区域时重新加载数据
    get().loadAllRecords();
  },

  // Filter actions
  setDateRange: (startDate, endDate) => {
    set((state) => ({
      filters: { ...state.filters, startDate, endDate }
    }));
    // Don't call loadFilteredRecords here, let the component's useEffect handle it
  },

  setStartDate: (date) => {
    set((state) => ({
      filters: { ...state.filters, startDate: date }
    }));
    // Don't call loadFilteredRecords here, let the component's useEffect handle it
  },

  setEndDate: (date) => {
    set((state) => ({
      filters: { ...state.filters, endDate: date }
    }));
    // Don't call loadFilteredRecords here, let the component's useEffect handle it
  },

  setSelectedNames: (names) => {
    set((state) => ({
      filters: { ...state.filters, selectedNames: names }
    }));
    // Don't call loadFilteredRecords here, let the component's useEffect handle it
  },

  // Benchmark values actions
  setBenchmarkValues: (coarseBenchmark, fineBenchmark) => {
    const benchmarkValues = { coarseBenchmark, fineBenchmark };
    set({ benchmarkValues });
    // Save to localStorage
    localStorage.setItem('benchmarkValues', JSON.stringify(benchmarkValues));
  },

  loadBenchmarkValues: () => {
    try {
      const saved = localStorage.getItem('benchmarkValues');
      if (saved) {
        const benchmarkValues = JSON.parse(saved);
        set({ benchmarkValues });
      }
    } catch (error) {
      console.error('加载基准值失败:', error);
    }
  },

  // Data loading actions
  loadAllRecords: async () => {
    const state = get();
    // 防止重复请求
    if (state.loading) {
      console.log('已有请求进行中，跳过重复请求');
      return;
    }
    
    set({ loading: true, error: null });
    try {
      const { selectedRegion } = get();
      const records = await recordsAPI.getAllRecords(selectedRegion);
      set({ records, loading: false });
      get().loadFilteredRecords();
    } catch (error) {
      console.error('loadAllRecords: 加载数据失败:', error);
      set({ error: error.message, loading: false });
    }
  },

  loadFilteredRecords: async () => {
    const { filters, selectedRegion, loading } = get();
    
    // 防止在加载中时重复请求
    if (loading) {
      return;
    }
    
    const { startDate, endDate, selectedNames } = filters;

    try {
      let records;
      if (startDate === endDate) {
        records = await recordsAPI.getRecordsByDate(startDate, selectedRegion);
      } else {
        records = await recordsAPI.getRecordsByDateRange(startDate, endDate, selectedRegion);
      }

      // Filter by names if specified
      if (selectedNames && selectedNames.length > 0) {
        records = records.filter(record => selectedNames.includes(record.name));
      }

      set({ filteredRecords: records });
    } catch (error) {
      console.error('loadFilteredRecords: 加载筛选数据失败:', error);
      set({ error: error.message });
    }
  },

  // Data manipulation actions
  addRecord: async (recordData) => {
    set({ isSubmitting: true, error: null });
    try {
      const { selectedRegion } = get();
      // 确保记录包含区域信息
      const recordWithRegion = { ...recordData, region: selectedRegion };
      await recordsAPI.addRecord(recordWithRegion);
      await get().loadAllRecords();
      set({ isSubmitting: false });
      return true;
    } catch (error) {
      set({ error: error.message, isSubmitting: false });
      return false;
    }
  },

  updateRecord: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await recordsAPI.updateRecord(id, updates);
      await get().loadAllRecords();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  deleteRecord: async (id) => {
    set({ loading: true, error: null });
    try {
      await recordsAPI.deleteRecord(id);
      await get().loadAllRecords();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  bulkDeleteRecords: async (ids) => {
    set({ loading: true, error: null });
    try {
      await recordsAPI.bulkDeleteRecords(ids);
      await get().loadAllRecords();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  bulkUpdateRecords: async (ids, updates) => {
    set({ loading: true, error: null });
    try {
      await recordsAPI.bulkUpdateRecords(ids, updates);
      await get().loadAllRecords();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  bulkImportRecords: async (records, onProgress) => {
    set({ isSubmitting: true, error: null, importProgress: 0 });
    try {
      const { selectedRegion } = get();
      // 为所有记录添加区域信息
      const recordsWithRegion = records.map(record => ({
        ...record,
        region: selectedRegion
      }));
      
      const batchSize = 50; // 增加批次大小以提高性能
      const batches = [];
      
      for (let i = 0; i < recordsWithRegion.length; i += batchSize) {
        batches.push(recordsWithRegion.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        await recordsAPI.bulkAddRecords(batches[i]);
        const progress = Math.round(((i + 1) / batches.length) * 100);
        set({ importProgress: progress });
        if (onProgress) onProgress(progress);
        
        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await get().loadAllRecords();
      set({ isSubmitting: false, importProgress: 0 });
      return true;
    } catch (error) {
      set({ error: error.message, isSubmitting: false, importProgress: 0 });
      return false;
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),

  getUniqueNames: async () => {
    try {
      const { selectedRegion } = get();
      return await recordsAPI.getUniqueNames(selectedRegion);
    } catch (error) {
      set({ error: error.message });
      return [];
    }
  },

  getAggregatedData: async (date) => {
    try {
      const { selectedRegion } = get();
      return await recordsAPI.getDayAggregatedData(date, selectedRegion);
    } catch (error) {
      set({ error: error.message });
      return [];
    }
  },

  // Chart data preparation
  getChartData: (inputRecords = null) => {
    const state = get();
    const { filteredRecords, filters } = state;
    
    // 使用传入的记录或store中的记录
    const recordsToUse = inputRecords || filteredRecords;
    
    if (recordsToUse.length === 0) {
      return [];
    }
    
    // 对于所有时间段（日/周/月），都按工人分组来显示数据
    const groupedByUser = recordsToUse.reduce((acc, record) => {
      if (!acc[record.name]) {
        acc[record.name] = {
          name: record.name,
          coarseEfficiency: 0,
          fineEfficiency: 0,
          totalItems: 0,
          totalCoarseCount: 0,
          totalFineCount: 0,
          totalWorkingHours: 0,
          recordCount: 0,
          dates: new Set()
        };
      }
      
      const user = acc[record.name];
      user.coarseEfficiency += Number(record.coarseEfficiency) || 0;
      user.fineEfficiency += Number(record.fineEfficiency) || 0;
      user.totalCoarseCount += Number(record.coarseCount) || 0;
      user.totalFineCount += Number(record.fineCount) || 0;
      user.totalItems += (Number(record.coarseCount) || 0) + (Number(record.fineCount) || 0);
      user.totalWorkingHours += Number(record.totalWorkingHours) || 0;
      user.recordCount++;
      user.dates.add(record.date);
      
      return acc;
    }, {});

    // 计算平均效率并格式化数据
    const chartData = Object.values(groupedByUser).map(user => {
      const avgCoarseEfficiency = user.recordCount > 0 ? (user.coarseEfficiency / user.recordCount) : 0;
      const avgFineEfficiency = user.recordCount > 0 ? (user.fineEfficiency / user.recordCount) : 0;
      // 计算总体效率：总件数 / 总工作小时数（而不是两个效率相加）
      const overallEfficiency = user.totalWorkingHours > 0 ? (user.totalItems / user.totalWorkingHours) : 0;
      
      return {
        name: user.name,
        coarseEfficiency: Number(avgCoarseEfficiency.toFixed(2)),
        fineEfficiency: Number(avgFineEfficiency.toFixed(2)),
        totalEfficiency: Number(overallEfficiency.toFixed(2)), // 总体效率 = 总件数/总小时数
        avgCoarseEfficiency: Number(avgCoarseEfficiency.toFixed(2)), // 兼容旧字段名
        avgFineEfficiency: Number(avgFineEfficiency.toFixed(2)), // 兼容旧字段名
        totalItems: user.totalItems,
        totalCoarseCount: user.totalCoarseCount,
        totalFineCount: user.totalFineCount,
        totalWorkingHours: Number(user.totalWorkingHours.toFixed(2)),
        recordCount: user.recordCount,
        workingDays: user.dates.size,
                 // 添加时间段标识
         startDate: filters.startDate,
         endDate: filters.endDate,
         periodLabel: filters.startDate === filters.endDate ? '单日' : '时间段'
      };
         }).sort((a, b) => b.totalItems - a.totalItems); // 按总处理数量排序

     return chartData;
  },

  // Authentication actions
  initializeAuth: () => {
    try {
      // Check for stored authentication
      const storedUser = localStorage.getItem('user');
      const storedAuth = localStorage.getItem('isAuthenticated');
      
      if (storedUser && storedAuth === 'true') {
        set({
          user: JSON.parse(storedUser),
          isAuthenticated: true
        });
      }

      // Initialize default users if not exists
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.length === 0) {
        const defaultUsers = [
          {
            id: 1,
            username: 'admin',
            password: 'admin123', // In production, this should be hashed
            name: '管理员',
            role: 'admin',
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            username: 'ceo',
            password: 'ceo123', // In production, this should be hashed
            name: '总经理',
            role: 'ceo',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        console.log('默认管理员账户已创建: admin/admin123');
        console.log('默认总经理账户已创建: ceo/ceo123');
      }
    } catch (error) {
      console.error('初始化认证失败:', error);
    }
  },

  // Check user permissions
  hasPermission: (requiredRole) => {
    const { user } = get();
    if (!user) return false;
    
    // Role hierarchy: ceo > admin > user
    const roleHierarchy = {
      ceo: 3,
      admin: 2,
      user: 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        const userInfo = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        };
        
        localStorage.setItem('user', JSON.stringify(userInfo));
        localStorage.setItem('isAuthenticated', 'true');
        
        set({
          user: userInfo,
          isAuthenticated: true,
          loading: false
        });
        
        console.log('登录成功:', user.username);
        return true;
      } else {
        set({ loading: false });
        console.log('登录失败: 用户名或密码错误');
        return false;
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      console.error('登录错误:', error);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    
    set({
      user: null,
      isAuthenticated: false,
      // 清除其他敏感数据
      records: [],
      filteredRecords: []
    });
    
    console.log('用户已登出');
  },

  // User management actions
  createUser: (userData) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const newUser = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        ...userData,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      return true;
    } catch (error) {
      console.error('创建用户失败:', error);
      return false;
    }
  },

  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]');
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  }
}));

export default useStore; 