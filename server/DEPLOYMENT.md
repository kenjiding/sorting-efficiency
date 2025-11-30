# AWS SAM 部署指南

本文档说明如何将 `/server` 中的 Express API 通过 Webpack 打包后，使用 [AWS Serverless Application Model (SAM)](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) 部署到 AWS Lambda + HTTP API。

## 环境准备

1. **Node.js:** 建议使用 v18 或更新版本。
2. **AWS 凭证:** 本地需要可用的 AWS 访问凭证（`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` 或已登录的 SSO/profile），并在 shell 中配置默认 Region。
3. **SAM CLI:** 安装 [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) 并确认为最新版本。
4. **环境变量:** 在 `server/.env` 中配置 MongoDB 连接相关参数，部署时将以参数形式传递给 SAM。

```bash
cd /Users/dinglun/Documents/nextjs/分拣管理系统/server
cp .env.example .env   # 如无模板，可直接创建 .env

# .env 内容示例
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/sorting-management
MONGODB_TLS=true
MONGODB_TLS_ALLOW_INVALID=false
# 可按需修改
AWS_REGION=ap-east-1
```

> `.env` 文件不会被打包；部署时可以通过 `sam deploy --guided` 将变量写入 `samconfig.toml`。

## 本地开发

- 本地 API 调试：`npm run dev`（使用 `nodemon` 启动 `server.js`，监听 `localhost:7890`）。
- 打包预览：`npm run build:dev` 会持续监听并输出 `dist/lambda.js`。
- SAM 本地模拟（可选）：`sam local start-api`，需先执行 `npm run build`。

## 构建与部署

1. 安装依赖：

   ```bash
   npm install
   ```

2. 使用 Webpack 生成 Lambda 入口：

   ```bash
   npm run build
   # 产物输出到 dist/lambda.js
   ```

3. 通过 SAM 打包与部署（首次推荐使用 Guided 模式）：

   ```bash
   npm run sam:deploy:guided
   ```

   Guided 流程会询问以下信息，并生成 `samconfig.toml` 供后续 `npm run sam:deploy` 复用：
   - Stack 名称
   - 部署 Region
   - S3 打包桶（SAM 会自动创建）
   - `StageName`（默认 `dev`）
   - MongoDB 环境变量（对应 `template.yaml` 中的参数）

4. 后续更新可直接运行：

   ```bash
   npm run deploy        # 等同于 npm run sam:deploy
   ```

5. 清理部署：

   ```bash
   sam delete
   ```

## 注意事项

- `webpack.config.mjs` 会将所有依赖打包到 `dist/lambda.js`，无需上传 `node_modules`。
- 构建时出现的 MongoDB 可选依赖 Warning 属于预期，可忽略，除非你需要启用这些功能（如 `snappy`、`aws4` 等）。
- `template.yaml` 使用参数化方式管理 MongoDB 连接信息，可在 `sam deploy --guided` 时填入并保存在 `samconfig.toml`。
- 如果 Lambda 需要访问私有 MongoDB，请在 SAM 模板中为函数添加 VPC 配置或额外 IAM 权限。

