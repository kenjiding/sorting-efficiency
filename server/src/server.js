// 加载环境变量（必须在导入其他模块之前）
import dotenv from 'dotenv';
dotenv.config();

import { app, connectDatabase, disconnectDatabase } from './app.js';

const PORT = process.env.PORT || 7890;

const startServer = async () => {
  try {
    await connectDatabase();

    // 获取本机IP地址
    const os = await import('os');
    const networkInterfaces = os.default.networkInterfaces();
    let localIP = 'localhost';
    
    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) {
          localIP = address.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`🌐 本地访问: http://localhost:${PORT}`);
      console.log(`📱 手机访问: http://${localIP}:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('提示: 请确保MongoDB正在运行');
    console.error('Docker: docker run -d -p 27017:27017 --name mongodb mongo');
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await disconnectDatabase();
  process.exit(0);
});

