# AWS Lambda Layer 构建指南

## 概述

项目使用 AWS Lambda Layer 来分离依赖包，减少 Lambda 函数代码包大小。所有 `dependencies` 中的包会被打包到 Layer 中，只有源代码会被打包到 Lambda 函数。

## 目录结构

```
server/
├── nodejs/              # Layer 目录（由脚本生成）
│   └── node_modules/    # 生产依赖包
├── scripts/
│   └── build-layer.js   # Layer 构建脚本
├── src/                 # 源代码目录
└── dist/                # Webpack 打包输出（仅包含源代码）
```

## 构建命令

### 1. 只构建 Layer

```bash
npm run build:layer
```

这个命令会：
- 创建 `nodejs/` 目录
- 在其中安装所有 `dependencies`（不包括 `devDependencies`）
- 生成的目录结构符合 AWS Lambda Layer 的要求

### 2. 构建整个项目（包含 Layer）

```bash
npm run sam:build
```

这个命令会依次执行：
1. `npm run build:layer` - 构建 Layer
2. `npm run build` - 使用 Webpack 打包源代码（排除 node_modules）
3. `sam build` - SAM 构建，创建 CloudFormation 模板

### 3. 部署到 AWS

```bash
npm run sam:deploy
# 或使用引导式部署
npm run sam:deploy:guided
```

## Webpack 配置

`webpack.config.mjs` 已经配置为：
- ✅ 排除所有 `node_modules` 中的包
- ✅ 只打包 `src/` 目录下的源代码
- ✅ 使用 `externals` 将所有依赖标记为外部依赖

## SAM Template 配置

`template.yaml` 中已配置：

1. **DependenciesLayer**: AWS Lambda Layer 资源
   - 从 `nodejs/` 目录构建
   - 支持 Node.js 20.x 和 18.x

2. **SortingSystemFunction**: Lambda 函数
   - 引用 `DependenciesLayer`
   - 只包含打包后的源代码

## 工作流程

1. **开发时**：正常使用 `npm install`，所有依赖都在项目根目录的 `node_modules/`
2. **构建 Layer**：运行 `npm run build:layer`，创建 `nodejs/node_modules/`
3. **打包代码**：运行 `npm run build`，只打包 `src/` 目录，排除 `node_modules`
4. **SAM 构建**：`sam build` 会将 Layer 和函数代码分别打包
5. **部署**：Layer 和函数会一起部署到 AWS

## 注意事项

- ✅ Layer 只包含 `dependencies`，不包含 `devDependencies`
- ✅ Webpack 会自动排除所有 `node_modules` 中的包
- ✅ Lambda 函数代码包只包含源代码，体积更小
- ✅ Layer 可以被多个 Lambda 函数共享

## 文件说明

- `scripts/build-layer.js`: 构建 Layer 的脚本，会自动创建 `nodejs/` 目录并安装依赖
- `webpack.config.mjs`: Webpack 配置，排除所有 node_modules
- `template.yaml`: SAM 模板，定义 Layer 和 Lambda 函数

