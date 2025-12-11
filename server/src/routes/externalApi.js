import express from 'express';
import { runPost, runGet } from '../utils/dataFromExternal.js';

const router = express.Router();

/**
 * POST 请求外部接口
 * 前端需要传递：
 * - url: 外部接口的完整URL
 * - params: 请求参数（可选）
 */
router.post('/post', async (req, res) => {
    try {
        const { url, params = {} } = req.body;
        const token = req.query.token || null; // 从 query 参数获取 token

        // 验证必填参数
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL 参数不能为空'
            });
        }

        // 调用外部接口，传递 token
        const startTime = Date.now();
        const data = await runPost(url, params, token);
        const duration = Date.now() - startTime;
        
        console.log(`✅ 外部POST请求完成 [${duration}ms]: ${url.split('?')[0]}`);

        res.json({
            success: true,
            data: data,
            message: '请求成功'
        });

    } catch (error) {
        console.error('❌ 外部POST请求失败:', error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || '外部接口调用失败',
            errorDetails: error.data || null,
            error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        });
    }
});

/**
 * GET 请求外部接口
 * 前端需要传递：
 * - url: 外部接口的完整URL
 * - params: 查询参数（可选）
 */
router.post('/get', async (req, res) => {
    try {
        const { url, params = {} } = req.body;
        const token = req.query.token || null; // 从 query 参数获取 token

        // 验证必填参数
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL 参数不能为空'
            });
        }

        // 调用外部接口，传递 token
        const startTime = Date.now();
        const data = await runGet(url, params, token);
        const duration = Date.now() - startTime;
        
        console.log(`✅ 外部GET请求完成 [${duration}ms]: ${url.split('?')[0]}`);

        res.json({
            success: true,
            data: data,
            message: '请求成功'
        });

    } catch (error) {
        console.error('❌ 外部GET请求失败:', error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || '外部接口调用失败',
            errorDetails: error.data || null,
            error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        });
    }
});

/**
 * 通用请求接口 - 支持动态选择 GET 或 POST
 * 前端需要传递：
 * - url: 外部接口的完整URL
 * - method: 请求方法 ('GET' 或 'POST')
 * - params: 请求参数（可选）
 */
router.post('/request', async (req, res) => {
    try {
        const { url, method = 'GET', params = {} } = req.body;
        const token = req.query.token || null; // 从 query 参数获取 token

        // 验证必填参数
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL 参数不能为空'
            });
        }

        const upperMethod = method.toUpperCase();
        if (!['GET', 'POST'].includes(upperMethod)) {
            return res.status(400).json({
                success: false,
                message: '不支持的请求方法，只支持 GET 或 POST'
            });
        }

        // 根据方法选择对应的函数，传递 token
        const startTime = Date.now();
        let data;
        if (upperMethod === 'POST') {
            data = await runPost(url, params, token);
        } else {
            data = await runGet(url, params, token);
        }
        const duration = Date.now() - startTime;
        
        console.log(`✅ 外部${upperMethod}请求完成 [${duration}ms]: ${url.split('?')[0]}`);

        res.json({
            success: true,
            data: data,
            message: '请求成功'
        });

    } catch (error) {
        console.error(`❌ 外部${method}请求失败:`, error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || '外部接口调用失败',
            errorDetails: error.data || null,
            error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
        });
    }
});

export default router;

