import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import recordsRouter from './routes/records.js';
import testRouter from './routes/test.js';
import efficiencyAnalysisRouter from './routes/efficiencyAnalysis.js';
import crossRegionRouter from './routes/crossRegion.js';
import wagesRouter from './routes/wages.js';
import scanRecordsRouter from './routes/scanRecords.js';
import inboundDataRouter from './routes/inboundData.js';
import serviceDataRouter from './routes/serviceData.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sorting-management';

const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
};

if (process.env.MONGODB_TLS === 'true') {
  mongooseOptions.ssl = true;
  mongooseOptions.tlsAllowInvalidCertificates = process.env.MONGODB_TLS_ALLOW_INVALID === 'true';
}

let listenersInitialized = false;

const ensureConnectionEventListeners = () => {
  if (listenersInitialized) return;

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB连接错误:', error);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB连接断开');
  });

  listenersInitialized = true;
};

export const connectDatabase = async () => {
  ensureConnectionEventListeners();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGODB_URI, mongooseOptions);
    console.log('✅ MongoDB连接成功');
    console.log(`📦 数据库: ${MONGODB_URI}`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export const app = express();

// CORS 配置 - 允许所有来源（开发和生产环境）
const corsOptions = {
  origin: true, // 允许所有来源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
};

app.use(cors(corsOptions));

// 处理 OPTIONS 预检请求
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // 允许跨域资源
  contentSecurityPolicy: false, // 开发环境禁用 CSP
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/test', testRouter);
app.use('/api/records', recordsRouter);
app.use('/api/efficiency-analysis', efficiencyAnalysisRouter);
app.use('/api/cross-region', crossRegionRouter);
app.use('/api/wages', wagesRouter);
app.use('/api/scan-records', scanRecordsRouter);
app.use('/api/inbound-data', inboundDataRouter);
app.use('/api/service-data', serviceDataRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '分拣管理系统 API 服务器',
    version: '1.0.0',
    endpoints: {
      records: '/api/records',
      efficiencyAnalysis: '/api/efficiency-analysis',
      crossRegion: '/api/cross-region',
      wages: '/api/wages',
      health: '/health',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ message: '路由不存在' });
});

app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(error.status || 500).json({
    message: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

export const config = {
  MONGODB_URI,
  mongooseOptions,
};

