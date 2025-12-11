import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { useToken } from '../contexts/TokenContext';

/**
 * 外部接口调用示例组件
 * 
 * 这是一个演示如何使用 externalApi 功能的示例组件
 * 你可以根据实际需求修改这个组件
 */
function ExternalApiExample() {
  const { token } = useToken(); // 获取全局 token
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [params, setParams] = useState('{\n  "key": "value"\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 调用外部接口
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // 解析参数 JSON
      let parsedParams = {};
      if (params.trim()) {
        try {
          parsedParams = JSON.parse(params);
        } catch (parseError) {
          throw new Error('参数格式错误，请输入有效的 JSON');
        }
      }

      // 调用外部接口，传递 token
      console.log('🔑 使用的 Token:', token ? `${token.substring(0, 8)}...` : 'null');
      
      let result;
      if (method === 'POST') {
        result = await apiClient.externalApi.post(url, parsedParams, token);
      } else if (method === 'GET') {
        result = await apiClient.externalApi.get(url, parsedParams, token);
      } else {
        result = await apiClient.externalApi.request(url, method, parsedParams, token);
      }

      setResponse(result);
      console.log('✅ 外部接口调用成功:', result);
    } catch (err) {
      setError(err.message);
      console.error('❌ 外部接口调用失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 清空表单
  const handleClear = () => {
    setUrl('');
    setParams('{\n  "key": "value"\n}');
    setResponse(null);
    setError(null);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>外部接口调用测试</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* URL 输入 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            外部接口 URL <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://external-api.com/endpoint"
            required
            style={styles.input}
          />
        </div>

        {/* 请求方法选择 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>请求方法</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={styles.select}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </div>

        {/* 参数输入 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            请求参数 (JSON 格式)
          </label>
          <textarea
            value={params}
            onChange={(e) => setParams(e.target.value)}
            placeholder='{\n  "key": "value"\n}'
            rows={8}
            style={styles.textarea}
          />
          <small style={styles.hint}>
            提示: 请输入有效的 JSON 格式，如 {`{"key": "value"}`}
          </small>
        </div>

        {/* 按钮组 */}
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={loading || !url}
            style={{
              ...styles.button,
              ...styles.submitButton,
              ...(loading || !url ? styles.disabledButton : {}),
            }}
          >
            {loading ? '请求中...' : '发送请求'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.clearButton,
              ...(loading ? styles.disabledButton : {}),
            }}
          >
            清空
          </button>
        </div>
      </form>

      {/* 错误显示 */}
      {error && (
        <div style={styles.errorBox}>
          <h3 style={styles.errorTitle}>❌ 错误</h3>
          <p style={styles.errorMessage}>{error}</p>
        </div>
      )}

      {/* 响应显示 */}
      {response && (
        <div style={styles.responseBox}>
          <h3 style={styles.responseTitle}>✅ 响应结果</h3>
          <pre style={styles.responseContent}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// 样式对象
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333',
  },
  form: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#555',
  },
  required: {
    color: 'red',
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    marginTop: '5px',
    fontSize: '12px',
    color: '#888',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  clearButton: {
    backgroundColor: '#f44336',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '4px',
    padding: '15px',
    marginBottom: '20px',
  },
  errorTitle: {
    margin: '0 0 10px 0',
    color: '#f44336',
    fontSize: '18px',
  },
  errorMessage: {
    margin: 0,
    color: '#c62828',
  },
  responseBox: {
    backgroundColor: '#e8f5e9',
    border: '1px solid #4CAF50',
    borderRadius: '4px',
    padding: '15px',
  },
  responseTitle: {
    margin: '0 0 10px 0',
    color: '#4CAF50',
    fontSize: '18px',
  },
  responseContent: {
    margin: 0,
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '500px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
};

export default ExternalApiExample;

