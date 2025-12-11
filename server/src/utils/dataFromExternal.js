import axios from 'axios';

// 默认 Token（如果前端没有提供）
const DEFAULT_TOKEN = process.env.EXTERNAL_JWT_TOKEN || '23921c36-38c9-480f-b011-18d98e244e32';

/**
 * 通用的 API 调用函数，支持 GET 和 POST，并携带 JWT 认证。
 * @param {string} url - 目标接口 URL
 * @param {string} method - HTTP 方法 ('GET' 或 'POST')
 * @param {object} [dataOrParams] - POST 请求的请求体 (data) 或 GET 请求的查询参数 (params)
 * @param {string} [token] - JWT Token（从请求参数中传入）
 * @returns {Promise<Object>} API 返回的数据
 */
async function callApi(url, method, dataOrParams = {}, token = null) {
    // 使用传入的 token，如果没有则使用默认 token
    const JWT_TOKEN = token || DEFAULT_TOKEN;
    
    if (!JWT_TOKEN) {
        throw new Error("Missing JWT Token. Please provide a token or configure the default token.");
    }

    const config = {
        method: method.toUpperCase(), // 确保方法为大写
        url: url,
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            // POST 请求需要明确指定内容类型
            'Content-Type': 'application/json' 
        },
    };

    if (config.method === 'POST') {
        // 对于 POST/PUT/PATCH，数据放在 'data' 字段
        config.data = dataOrParams;
    } else if (config.method === 'GET') {
        // 对于 GET，参数放在 'params' 字段，会被自动转换为查询字符串
        config.params = dataOrParams;
    } else {
        // 也可以添加对其他方法的支持
        config.data = dataOrParams; // 默认将数据放在 data 中
    }

    try {
        const response = await axios(config);
        if(response.data.status === 'failure') {
          throw new Error(response.data.message);
        }
        return response.data;

    } catch (error) {
        if (error.response) {
            console.error(`❌ API 调用失败，状态码: ${error.response.status}`);
            console.error(`❌ 响应数据:`, error.response.data);
            
            if (error.response.status === 401 || error.response.status === 403) {
                console.error("❗ 身份验证失败或 Token 无效/过期。");
            }
            
            // 提取外部接口的错误消息
            const errorMessage = error.response.data?.message 
                || error.response.data?.error 
                || error.response.statusText 
                || '外部接口调用失败';
            
            // 创建一个包含详细信息的错误对象
            const detailedError = new Error(errorMessage);
            detailedError.status = error.response.status;
            detailedError.data = error.response.data;
            throw detailedError;
        } else {
            console.error("❌ 请求发送失败:", error.message);
            throw error;
        }
    }
}

// --- 示例调用 ---

// 1. POST 请求示例 (发送请求体)
export async function runPost(url, params, token = null) {
    try {
        const postData = await callApi(url, 'POST', params, token);
        // 返回完整的响应对象，让调用者自己决定如何提取数据
        return postData;
    } catch (err) {
        console.error("POST 请求执行失败:", err.message);
        throw err; // 重新抛出错误，让上层处理
    }
}


// 2. GET 请求示例 (发送查询参数)
export async function runGet(url, params, token = null) {
    try {
        return await callApi(url, 'GET', params, token);
        // 注意：axios 会自动将 GET_PARAMS 转换为查询字符串
    } catch (err) {
        console.error("GET 请求执行失败:", err.message);
        throw err;
    }
}