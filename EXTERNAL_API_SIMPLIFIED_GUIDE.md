# 外部接口集成简化指南

## 📚 快速开始

### 1. 在应用根组件中添加 TokenProvider

```jsx
// src/App.jsx 或 main.jsx
import { TokenProvider } from './contexts/TokenContext';

function App() {
  return (
    <TokenProvider>
      {/* 你的应用内容 */}
    </TokenProvider>
  );
}
```

### 2. 设置 Token（首次使用）

```jsx
import TokenManager from '@/components/common/TokenManager';

function SettingsPage() {
  return (
    <div>
      <h1>设置</h1>
      <TokenManager compact />
    </div>
  );
}
```

### 3. 在组件中使用外部接口

```jsx
import useExternalApi from '@/hooks/useExternalApi';

function MyComponent() {
  const { data, loading, fetchData, ToastContainer } = useExternalApi({
    url: 'https://ds.imile.com/dms/migrate/biz/problem/audit/searchNew',
    maxDays: 7
  });

  const handleFetch = () => {
    fetchData({
      start: '2025-12-03',
      end: '2025-12-09'
    });
  };

  return (
    <div>
      <ToastContainer />
      <button onClick={handleFetch} disabled={loading}>
        获取数据
      </button>
      {data.length > 0 && <div>数据数量: {data.length}</div>}
    </div>
  );
}
```

## 🔑 Token 管理

### Token 存储位置
- 前端：浏览器 localStorage
- 后端：环境变量（默认备用）

### 工作流程
```
1. 用户在 TokenManager 中输入 Token
   ↓
2. Token 保存到 localStorage
   ↓
3. useExternalApi 自动从 Context 读取 Token
   ↓
4. 每次请求时自动带上 Token
   ↓
5. 后端接收 Token 并用于外部接口认证
```

## 🎯 核心 API

### useExternalApi Hook

```javascript
const {
  data,           // 处理后的数据数组
  loading,        // 加载状态
  error,          // 错误信息
  fetchData,      // 获取数据函数
  ToastContainer  // Toast 容器（必须渲染）
} = useExternalApi({
  url,                  // 外部接口 URL（必填）
  hubCode,              // 站点代码（可选，默认 'S210431701'）
  maxDays,              // 最大天数限制（可选，默认 7）
  dataTransformer,      // 数据转换函数（可选）
  dataAggregator,       // 数据聚合函数（可选）
  showErrorToast        // 是否显示错误 Toast（可选，默认 true）
});
```

### useToken Hook

```javascript
import { useToken } from '@/contexts/TokenContext';

const { token, updateToken, clearToken } = useToken();

// 更新 Token
updateToken('new-token-value');

// 清空 Token
clearToken();
```

## 📝 完整示例

```jsx
import { useState, useEffect, useMemo } from 'react';
import useExternalApi from '@/hooks/useExternalApi';
import TokenManager from '@/components/common/TokenManager';

function ProblemItemsPage() {
  const [timeRange, setTimeRange] = useState({
    start: '2025-12-03',
    end: '2025-12-09'
  });

  // 数据转换
  const transformer = useMemo(() => (rawData) => {
    return rawData.map(item => ({
      supplier: item.vendor || '',
      driver: item.daName || '',
      reason: item.problemReasonDesc || '',
      date: item.registerDateTime?.split(' ')[0] || ''
    }));
  }, []);

  // 数据聚合
  const aggregator = useMemo(() => (data) => {
    const grouped = new Map();
    data.forEach(item => {
      const key = item.supplier;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    
    return Array.from(grouped.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }, []);

  const { data, loading, fetchData, ToastContainer } = useExternalApi({
    url: 'https://ds.imile.com/dms/migrate/biz/problem/audit/searchNew',
    dataTransformer: transformer,
    dataAggregator: aggregator,
    maxDays: 7
  });

  useEffect(() => {
    fetchData({
      start: timeRange.start,
      end: timeRange.end
    });
  }, [timeRange]);

  return (
    <div>
      <ToastContainer />
      
      {/* Token 管理 */}
      <TokenManager compact />
      
      {/* 时间选择 */}
      <div>
        <input
          type="date"
          value={timeRange.start}
          onChange={(e) => setTimeRange({ ...timeRange, start: e.target.value })}
        />
        <input
          type="date"
          value={timeRange.end}
          onChange={(e) => setTimeRange({ ...timeRange, end: e.target.value })}
        />
      </div>

      {/* 数据展示 */}
      {loading ? (
        <div>加载中...</div>
      ) : (
        <ul>
          {data.map((item, i) => (
            <li key={i}>
              {item.name}: {item.count}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## 🚀 主要特性

### ✅ 已实现的功能

1. **全局 Token 管理**
   - Token 保存在浏览器 localStorage
   - 通过 React Context 全局可用
   - 简洁的 UI 组件管理

2. **自动错误提示**
   - 外部接口错误自动显示 Toast
   - 3秒后自动消失
   - 可自定义显示时长

3. **完全抽象封装**
   - `useExternalApi` Hook 封装所有逻辑
   - 自动时间范围验证
   - 支持自定义数据处理

## 📁 文件结构

```
server/
└── src/
    ├── routes/
    │   └── externalApi.js          # 外部接口代理
    └── utils/
        └── dataFromExternal.js      # 外部接口调用工具

src/
├── contexts/
│   └── TokenContext.jsx            # Token Context（新增）
├── components/
│   └── common/
│       ├── TokenManager.jsx        # Token 管理组件（简化）
│       └── Toast.jsx               # Toast 组件
├── hooks/
│   ├── useToken.js                 # Token Hook
│   ├── useToast.js                 # Toast Hook
│   └── useExternalApi.js           # 外部接口 Hook（更新）
└── api/
    ├── apiClient.js                # API 客户端（更新）
    └── config.js                   # API 配置
```

## 🔧 配置说明

### 后端默认 Token（可选）

如果前端没有设置 Token，后端会使用默认值：

```bash
# .env 文件
EXTERNAL_JWT_TOKEN=your-default-token-here
```

或在代码中设置：

```javascript
// server/src/utils/dataFromExternal.js
const DEFAULT_TOKEN = '23921c36-38c9-480f-b011-18d98e244e32';
```

## 🐛 常见问题

### Q1: Token 在哪里存储？
A: 前端存储在浏览器的 localStorage 中，key 为 `external_api_token`

### Q2: 如何查看当前 Token？
A: 打开浏览器控制台，输入 `localStorage.getItem('external_api_token')`

### Q3: Token 如何传递到后端？
A: `useExternalApi` Hook 自动从 Context 读取 Token，并在每次请求时作为参数传递给后端

### Q4: 如果没有设置 Token 会怎样？
A: 后端会使用默认的 Token（环境变量或代码中的默认值）

### Q5: 如何清空 Token？
A: 
```javascript
const { clearToken } = useToken();
clearToken();
```

## 📊 数据流向

```
TokenManager 组件
    ↓
更新 Token
    ↓
保存到 localStorage + Context
    ↓
useExternalApi Hook 读取 Token
    ↓
调用 apiClient.externalApi.post(url, params, token)
    ↓
后端接收 token 参数
    ↓
使用 token 调用外部接口
    ↓
返回数据给前端
    ↓
自动显示错误 Toast（如果有错误）
```

## 🎉 优势

1. **简单易用** - 只需3步即可集成
2. **全局管理** - Token 全局可用，无需重复配置
3. **自动化** - 自动带 Token、自动错误提示
4. **高度封装** - 复杂逻辑都在 Hook 中
5. **灵活扩展** - 支持自定义转换和聚合

## 📞 技术支持

遇到问题请检查：
1. 是否在根组件添加了 `TokenProvider`
2. 是否设置了正确的 Token
3. 浏览器控制台的错误信息
4. 后端日志输出

