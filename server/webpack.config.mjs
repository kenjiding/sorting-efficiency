import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

export default {
  entry: path.resolve(__dirname, 'src/lambda.js'),
  target: 'node20',
  mode: isProduction ? 'production' : 'development',
  output: {
    filename: './src/lambda.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2',
    },
    clean: true,
  },
  externalsPresets: { node: true },
  // 排除所有 node_modules，因为它们会被打包到 AWS Layer
  externals: [
    /^aws-sdk$/,
    // 排除所有 node_modules 中的包（将从 Layer 加载）
    function ({ request, context }, callback) {
      // 如果请求的是 node_modules 中的包，则排除它
      // node_modules 中的包不以 . 或 / 开头，也不是绝对路径
      const isNodeModule = 
        !request.startsWith('.') &&
        !request.startsWith('/') &&
        !path.isAbsolute(request) &&
        !request.includes('./') &&
        !request.includes('../');
      
      if (isNodeModule) {
        // 这是 node_modules 中的包，从 Layer 加载
        return callback(null, `commonjs ${request}`);
      }
      
      // 本地文件，继续打包
      callback();
    },
  ],
  resolve: {
    extensions: ['.js', '.json'],
  },
  optimization: {
    minimize: isProduction,
  },
  performance: {
    hints: false,
  },
  stats: 'minimal',
  devtool: isProduction ? false : 'inline-source-map',
};

