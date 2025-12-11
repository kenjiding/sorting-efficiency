# Token 问题修复总结

## 🐛 问题描述

1. Token 在全局设置了，但请求时 token 是 null
2. Token 需要持久化到 localStorage
3. Token 应该放在 URL query 参数，而不是污染 body

## ✅ 修复方案

### 1. Token 持久化（已实现）

**位置**: `src/contexts/TokenContext.jsx`

```javascript
// Token 会自动保存到 localStorage
const updateToken = (newToken) => {
  setToken(newToken);
  if (typeof window !== 'undefined') {
    if (newToken) {
      localStorage.setItem('external_api_token', newToken);
      console.log('✅ Token 已保存到 localStorage');
    } else {
      localStorage.removeItem('external_api_token');
    }
  }
};

// 初始化时自动从 localStorage 加载
const [token, setToken] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('external_api_token') || '';
  }
  return '';
});
```

### 2. Token 放在 URL Query 参数

**后端修改**: `server/src/routes/externalApi.js`

```javascript
// ❌ 之前：从 body 读取
const { url, params = {}, token } = req.body;

// ✅ 现在：从 query 参数读取
const { url, params = {} } = req.body;
const token = req.query.token || null;
```

**前端修改**: `src/api/apiClient.js`

```javascript
// ✅ 构建带 token 的 URL
post: (url, params = {}, token = null) => {
  const apiUrl = token 
    ? `${API_ENDPOINTS.EXTERNAL_API_POST}?token=${encodeURIComponent(token)}`
    : API_ENDPOINTS.EXTERNAL_API_POST;
  return this.post(apiUrl, { url, params });
}
```

### 3. 添加调试日志

**TokenContext** - 保存时的日志：
```javascript
console.log('🔑 更新 Token:', {
  hasToken: !!newToken,
  tokenLength: newToken ? newToken.length : 0,
  tokenPreview: newToken ? newToken.substring(0, 8) + '...' : 'empty'
});
console.log('✅ Token 已保存到 localStorage');
```

**useExternalApi** - 使用时的日志：
```javascript
console.log('🔑 Token 状态:', {
  hasToken: !!token,
  tokenLength: token ? token.length : 0,
  tokenPreview: token ? token.substring(0, 8) + '...' : 'null'
});
```

**后端** - 接收时的日志：
```javascript
if (token) {
  console.log('🔑 使用前端提供的 Token:', token.substring(0, 8) + '...');
} else {
  console.log('🔑 使用默认 Token');
}
```

## 📊 完整的数据流

```
1. 用户在 /settings 页面输入 Token
   ↓
2. TokenManager 调用 updateToken(newToken)
   ↓
3. TokenContext 保存到 localStorage + 更新 state
   console: "🔑 更新 Token: {...}"
   console: "✅ Token 已保存到 localStorage"
   ↓
4. useExternalApi 通过 useToken() 获取 token
   console: "🔑 Token 状态: {...}"
   ↓
5. apiClient 将 token 添加到 URL query
   URL: /api/external/post?token=xxx
   Body: { url, params }  (不包含 token)
   ↓
6. 后端从 req.query.token 读取
   console: "🔑 使用前端提供的 Token: xxx..."
   ↓
7. 后端使用 token 调用外部接口
```

## 🔍 调试方法

### 1. 检查 Token 是否已保存

打开浏览器控制台：
```javascript
// 查看当前 token
localStorage.getItem('external_api_token')

// 手动设置 token（测试用）
localStorage.setItem('external_api_token', 'your-token-here')

// 清除 token
localStorage.removeItem('external_api_token')
```

### 2. 查看完整的调试日志

刷新页面后，在控制台应该能看到：

**设置 Token 时**：
```
🔑 更新 Token: {hasToken: true, tokenLength: 36, tokenPreview: "23921c36..."}
✅ Token 已保存到 localStorage
```

**调用外部接口时**：
```
🔑 Token 状态: {hasToken: true, tokenLength: 36, tokenPreview: "23921c36..."}
📡 调用外部接口: {...}
```

**后端日志**（服务器控制台）：
```
📡 收到外部POST请求: https://...
🔑 使用前端提供的 Token: 23921c36...
📦 请求参数: {...}
```

### 3. 检查网络请求

打开浏览器开发者工具 → Network 标签：

**应该看到的请求**：
```
POST http://localhost:7890/api/external/post?token=23921c36-38c9-480f-b011-18d98e244e32

Request Headers:
  Content-Type: application/json

Request Body:
  {
    "url": "https://ds.imile.com/...",
    "params": {...}
  }
```

**注意**：
- ✅ Token 在 URL query 中：`?token=xxx`
- ✅ Body 只包含 url 和 params
- ❌ Body 不应该包含 token

## 🎯 测试步骤

### 步骤 1: 设置 Token

1. 访问 `http://localhost:5173/settings`
2. 点击"编辑"按钮
3. 输入 Token（例如：`23921c36-38c9-480f-b011-18d98e244e32`）
4. 点击"保存"
5. **检查控制台**：应该看到"✅ Token 已保存到 localStorage"

### 步骤 2: 验证 Token 已保存

打开控制台，输入：
```javascript
localStorage.getItem('external_api_token')
```
应该返回你刚才输入的 Token

### 步骤 3: 测试外部接口调用

1. 访问使用外部接口的页面（例如：问题件数量分析）
2. 触发数据加载
3. **检查控制台**：
   - 应该看到 "🔑 Token 状态: {hasToken: true, ...}"
   - 应该看到请求成功的日志

4. **检查 Network 标签**：
   - 找到 `/api/external/post` 请求
   - 查看 URL 应该包含 `?token=xxx`
   - 查看 Request Body 不应该包含 token

### 步骤 4: 检查后端日志

在服务器控制台应该看到：
```
🔑 使用前端提供的 Token: 23921c36...
```

## 🚨 常见问题

### Q1: Token 保存成功，但请求时还是 null

**原因**：可能是浏览器缓存问题

**解决**：
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 重新设置 Token

### Q2: 后端日志显示 "使用默认 Token"

**原因**：前端没有正确传递 token

**检查**：
1. 打开控制台，运行 `localStorage.getItem('external_api_token')`
2. 查看 Network 标签，确认 URL 是否包含 `?token=xxx`
3. 确保 TokenProvider 已经包裹整个应用（在 main.jsx 中）

### Q3: Token 刷新后丢失

**原因**：localStorage 没有正确保存

**检查**：
1. 确保浏览器支持 localStorage
2. 检查浏览器设置，是否禁用了 localStorage
3. 查看控制台是否有错误

## 📁 修改的文件

### 后端
- ✅ `server/src/routes/externalApi.js` - 从 query 读取 token

### 前端
- ✅ `src/contexts/TokenContext.jsx` - 添加调试日志
- ✅ `src/api/apiClient.js` - Token 作为 query 参数
- ✅ `src/hooks/useExternalApi.js` - 添加调试日志

## 🎉 优势

1. **URL Query 方式**
   - ✅ 不污染 request body
   - ✅ 更符合 RESTful 规范
   - ✅ 便于调试（直接在 Network 标签看到）

2. **localStorage 持久化**
   - ✅ 刷新页面不丢失
   - ✅ 跨页面共享
   - ✅ 用户无需重复设置

3. **完整的调试日志**
   - ✅ 前端、后端都有日志
   - ✅ 便于排查问题
   - ✅ 清楚显示 Token 状态

## 📞 还有问题？

如果 Token 还是 null，请：

1. **打开浏览器控制台**，检查所有日志
2. **打开 Network 标签**，查看请求 URL 和 Body
3. **查看服务器日志**，确认后端收到的 token
4. **复制所有日志**，便于分析问题

祝使用愉快！🚀

