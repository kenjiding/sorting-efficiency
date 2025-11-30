#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');
const layerDir = join(serverDir, 'nodejs');
const zipFilePath = join(serverDir, 'nodejs-layer.zip');

console.log('📦 开始构建 AWS Layer...\n');

// 清理旧的 layer 目录和 zip 文件
if (existsSync(layerDir)) {
  console.log('🧹 清理旧的 layer 目录...');
  rmSync(layerDir, { recursive: true, force: true });
}
if (existsSync(zipFilePath)) {
  console.log('🧹 清理旧的 zip 文件...');
  rmSync(zipFilePath, { force: true });
}

// 创建 nodejs 目录
console.log('📁 创建 nodejs 目录...');
mkdirSync(layerDir, { recursive: true });

// 读取 package.json（只包含 dependencies，不包含 devDependencies）
console.log('📝 读取 package.json...');
const packageJsonPath = join(serverDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// 创建只包含生产依赖的 package.json
const layerPackageJson = {
  name: packageJson.name + '-layer',
  version: packageJson.version,
  description: `${packageJson.description} - AWS Lambda Layer`,
  dependencies: packageJson.dependencies || {},
  // 不包含 devDependencies
};

const layerPackageJsonPath = join(layerDir, 'package.json');
console.log('📝 写入 Layer package.json...');
writeFileSync(layerPackageJsonPath, JSON.stringify(layerPackageJson, null, 2), 'utf-8');

// 在 layer 目录中安装生产依赖
console.log('⬇️  安装生产依赖到 nodejs/node_modules...');
const originalCwd = process.cwd();
try {
  process.chdir(layerDir);
  execSync('npm install --production --no-save --no-package-lock', { stdio: 'inherit' });
} finally {
  process.chdir(originalCwd);
}

// 删除 package.json，只保留 node_modules
console.log('🗑️  删除 package.json...');
unlinkSync(layerPackageJsonPath);

// 打包成 zip 文件
console.log('📦 打包成 zip 文件...');
try {
  // 使用系统的 zip 命令
  // -r: 递归压缩
  // -q: 静默模式（不输出详细信息）
  // -9: 最高压缩级别
  // cd 到 server 目录，然后压缩 nodejs 目录
  execSync(`cd "${serverDir}" && zip -r -q -9 "${basename(zipFilePath)}" nodejs/`, { stdio: 'inherit' });
  console.log(`✅ Zip 文件创建成功: ${zipFilePath}`);
} catch (error) {
  console.error('❌ 创建 zip 文件失败');
  if (error.stderr) {
    console.error('   错误信息:', error.stderr.toString());
  } else {
    console.error('   错误信息:', error.message);
  }
  console.error('   请确保系统已安装 zip 命令');
  console.error('   在 macOS 上通常已经内置，如果没有可以通过 Homebrew 安装: brew install zip');
  // 即使 zip 失败，也保留 nodejs 目录供手动处理
  console.error(`\n⚠️  nodejs 目录已保留在: ${layerDir}`);
  console.error('   您可以手动创建 zip 文件或使用其他压缩工具');
  throw error;
}

// 显示文件大小
if (existsSync(zipFilePath)) {
  const stats = statSync(zipFilePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Zip 文件大小: ${fileSizeMB} MB`);
}

console.log('\n✅ AWS Layer 构建完成！');
console.log(`📂 Layer 目录: ${layerDir}`);
console.log(`📦 Zip 文件: ${zipFilePath}`);
console.log(`📦 已安装 ${Object.keys(layerPackageJson.dependencies).length} 个生产依赖包`);
console.log('\n💡 接下来可以运行: npm run sam:build 来打包并上传到 AWS');

