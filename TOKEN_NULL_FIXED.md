# Token 为 null 问题修复

## 🐛 问题根因

虽然 Token 已经保存在 localStorage 中（`'867aa76b-f753-4597-99b2-3e7c364eed3b'`），但在调用外部接口时 token 参数显示为 `null`。

**原因**：
1. `ProblemItemModule.jsx` 没有使用 `useToken()` 获取 token
2. 直接调用 `apiClient.externalApi.post(url, params)` 时没有传递第三个参数 token

## ✅ 修复方案

### 1. 在组件中导入并使用 useToken

```javascript
import { useToken } from '../../../contexts/TokenContext';

const ProblemItemModule = () => {
  const { token } = useToken(); // 获取全局 token
  // ...
}
```

### 2. 调用 API 时传递 token

```javascript
// ❌ 之前：没有传递 token
const result = await apiClient.externalApi.post(externalUrl, params);

// ✅ 现在：传递 token 作为第三个参数
const result = await apiClient.externalApi.post(externalUrl, params, token);
```

## 📁 修改的文件

### 1. ✅ ProblemItemModule.jsx

**添加导入**：
```javascript
import { useToken } from '../../../contexts/TokenContext';
```

**使用 token**：
```javascript
const { token } = useToken();
```

**传递 token**：
```javascript
const result = await apiClient.externalApi.post(externalUrl, params, token);
```

### 2. ✅ ExternalApiExample.jsx

**添加导入**：
```javascript
import { useToken } from '../contexts/TokenContext';
```

**使用并传递 token**：
```javascript
const { token } = useToken();
// ...
result = await apiClient.externalApi.post(url, parsedParams, token);
result = await apiClient.externalApi.get(url, parsedParams, token);
result = await apiClient.externalApi.request(url, method, parsedParams, token);
```

## 🔍 完整的调用流程

### 修复后的正确流程：

```
1. localStorage 存储 Token
   localStorage.getItem('external_api_token')
   → '867aa76b-f753-4597-99b2-3e7c364eed3b'

2. TokenContext 提供 Token
   const { token } = useToken();
   → token = '867aa76b-f753-4597-99b2-3e7c364eed3b'

3. 组件调用时传递 token
   apiClient.externalApi.post(url, params, token)
                                            ↑
                                     第三个参数！

4. apiClient 构建 URL
   const apiUrl = token 
     ? `${endpoint}?token=${encodeURIComponent(token)}`
     : endpoint;
   → 'http://localhost:7890/api/external/post?token=867aa76b-...'

5. 发送请求
   POST http://localhost:7890/api/external/post?token=867aa76b-...
   Body: { url, params }

6. 后端接收
   const token = req.query.token;
   → '867aa76b-f753-4597-99b2-3e7c364eed3b'

7. 后端使用 token 调用外部接口
   await runPost(url, params, token)
```

## 📊 验证方法

### 刷新页面后应该看到的日志：

**前端控制台**：
```
🔑 使用的 Token: 867aa76b...
📍 apiClient.externalApi.post 被调用
  - url: https://ds.imile.com/...
  - token: 867aa76b...          ← 不再是 null！
  - params: {...}
  - 最终请求 URL: http://localhost:7890/api/external/post?token=867aa76b...
```

**Network 标签**：
```
Request URL: http://localhost:7890/api/external/post?token=867aa76b-f753-4597-99b2-3e7c364eed3b
                                                      ↑
                                               Token 在这里！
```

**后端服务器日志**：
```
📡 收到外部POST请求: https://ds.imile.com/...
🔑 使用前端提供的 Token: 867aa76b...  ← 不再是"使用默认 Token"！
📦 请求参数: {...}
```

## 🎯 检查清单

- [x] localStorage 中有 token
- [x] 组件导入了 useToken
- [x] 组件调用了 useToken() 获取 token
- [x] API 调用时传递了 token 参数
- [x] apiClient 构建了带 token 的 URL
- [x] 后端从 req.query.token 读取
- [x] 后端使用 token 调用外部接口

## 🚀 如何使用（其他页面参考）

如果你要在其他页面使用外部接口，记得：

```javascript
import { useToken } from '@/contexts/TokenContext';

function YourComponent() {
  const { token } = useToken(); // 1. 获取 token
  
  const fetchData = async () => {
    // 2. 传递 token 作为第三个参数
    const result = await apiClient.externalApi.post(url, params, token);
  };
  
  // ...
}
```

**或者更简单：直接使用 `useExternalApi` Hook**：

```javascript
import useExternalApi from '@/hooks/useExternalApi';

function YourComponent() {
  // useExternalApi 会自动处理 token
  const { data, loading, fetchData, ToastContainer } = useExternalApi({
    url: 'https://...'
  });
  
  return (
    <div>
      <ToastContainer />
      {/* ... */}
    </div>
  );
}
```

## 🎉 完成！

现在刷新页面，你应该能看到：
- ✅ Token 正确传递
- ✅ URL 包含 `?token=xxx`
- ✅ 后端日志显示"使用前端提供的 Token"
- ✅ 外部接口调用成功

祝使用愉快！🚀

