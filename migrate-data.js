// 数据迁移脚本 - Node.js 版本（如果 MongoDB Tools 不可用）
// 使用方法：
// 1. 在 server 目录运行：node ../migrate-data.js export
// 2. 将生成的 backup 文件夹复制到新电脑
// 3. 在新电脑的 server 目录运行：node ../migrate-data.js import

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 如果从 server 目录运行，需要调整路径
const isInServerDir = __dirname.includes('server');
const projectRoot = isInServerDir ? path.join(__dirname, '..') : __dirname;

const DB_NAME = 'sorting-management';
const COLLECTIONS = ['suppliers', 'routes', 'supplierroutemappings'];
const BACKUP_DIR = path.join(projectRoot, 'backup');

// 连接数据库
const connectDB = async () => {
  const MONGODB_URI = 'mongodb://localhost:27017/sorting-management';
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB 连接成功');
    return client;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 导出数据
const exportData = async () => {
  const client = await connectDB();
  const db = client.db(DB_NAME);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = path.join(BACKUP_DIR, timestamp);
  
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  
  console.log('📦 开始导出数据...');
  
  const exportResults = {};
  
  for (const collectionName of COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const data = await collection.find({}).toArray();
      
      const filePath = path.join(backupPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      exportResults[collectionName] = data.length;
      console.log(`✅ ${collectionName}: ${data.length} 条记录`);
    } catch (error) {
      console.error(`❌ ${collectionName} 导出失败:`, error);
    }
  }
  
  // 保存元数据
  const metadata = {
    timestamp: new Date().toISOString(),
    database: DB_NAME,
    collections: COLLECTIONS,
    counts: exportResults
  };
  
  fs.writeFileSync(
    path.join(backupPath, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  console.log('\n✅ 数据导出完成！');
  console.log(`📁 备份位置: ${backupPath}`);
  console.log('\n⚠️  请将以下文件夹复制到新电脑：');
  console.log(`   ${backupPath}`);
  
  await client.close();
};

// 导入数据
const importData = async () => {
  const client = await connectDB();
  const db = client.db(DB_NAME);
  
  // 查找最新的备份
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('❌ 备份目录不存在:', BACKUP_DIR);
    console.log('请先运行: node migrate-data.js export');
    process.exit(1);
  }
  
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(dir => {
      const dirPath = path.join(BACKUP_DIR, dir);
      return fs.statSync(dirPath).isDirectory();
    })
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.error('❌ 未找到备份文件');
    console.log('请先运行: node migrate-data.js export');
    process.exit(1);
  }
  
  const latestBackup = path.join(BACKUP_DIR, backups[0]);
  console.log(`📦 使用备份: ${latestBackup}`);
  
  // 读取元数据
  const metadataPath = path.join(latestBackup, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log(`📅 备份时间: ${metadata.timestamp}`);
    console.log(`📊 备份统计:`);
    Object.entries(metadata.counts).forEach(([col, count]) => {
      console.log(`   - ${col}: ${count} 条记录`);
    });
  }
  
  // 确认操作
  console.log('\n⚠️  即将导入以下集合到数据库:');
  COLLECTIONS.forEach(col => console.log(`   - ${col}`));
  
  // 导入数据
  console.log('\n📥 开始导入数据...');
  
  for (const collectionName of COLLECTIONS) {
    try {
      const filePath = path.join(latestBackup, `${collectionName}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  ${collectionName}.json 不存在，跳过`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const collection = db.collection(collectionName);
      
      // 清空现有数据
      await collection.deleteMany({});
      
      // 导入新数据
      if (data.length > 0) {
        await collection.insertMany(data);
      }
      
      console.log(`✅ ${collectionName}: ${data.length} 条记录`);
    } catch (error) {
      console.error(`❌ ${collectionName} 导入失败:`, error);
    }
  }
  
  console.log('\n✅ 数据导入完成！');
  
  await client.close();
};

// 主函数
const main = async () => {
  const command = process.argv[2];
  
  switch (command) {
    case 'export':
      await exportData();
      break;
    case 'import':
      await importData();
      break;
    default:
      console.log('使用方法:');
      console.log('  导出数据: node migrate-data.js export');
      console.log('  导入数据: node migrate-data.js import');
      console.log('');
      console.log('说明:');
      console.log('  1. 在源电脑运行: node migrate-data.js export');
      console.log('  2. 将 backup 文件夹复制到目标电脑');
      console.log('  3. 在目标电脑运行: node migrate-data.js import');
      process.exit(1);
  }
};

main().catch(console.error);

