import { useState, useRef } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Modal from './Modal';
import { analyzeWithOpenAIStream, analyzeWithGeminiStream } from '../../utils/openaiUtils';

const AIAnalysisModal = ({ isOpen, onClose, prompt, title = 'AI数据分析' }) => {
  const [analysisResult, setAnalysisResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(null); // 当前使用的API提供商
  const abortControllerRef = useRef(null);

  // 执行AI分析（流式输出）
  const handleAnalyze = async () => {
    if (!prompt) {
      setError('分析提示词为空');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult('');
    setCurrentProvider(null);

    // 创建AbortController用于取消请求
    abortControllerRef.current = new AbortController();

    // 优先使用 Gemini API，失败时回退到 OpenAI
    const analyzeWithFallback = async () => {
      // 检查 Gemini API Key 是否配置
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (geminiApiKey) {
        try {
          setCurrentProvider('Gemini');
          await analyzeWithGeminiStream(
            prompt, 
            (chunk) => {
              // 实时更新分析结果
              setAnalysisResult(prev => prev + chunk);
            },
            abortControllerRef.current?.signal
          );
          return; // 成功则直接返回
        } catch (err) {
          // 如果是用户取消，直接返回
          if (err.name === 'AbortError' || err.message?.includes('取消')) {
            throw err;
          }
          // Gemini 失败，记录错误但继续尝试 OpenAI
          console.warn('Gemini API调用失败，切换到OpenAI:', err);
        }
      }

      // 回退到 OpenAI API
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('未配置任何AI API Key，请至少配置 VITE_GEMINI_API_KEY 或 VITE_OPENAI_API_KEY');
      }

      try {
        setCurrentProvider('OpenAI');
        await analyzeWithOpenAIStream(
          prompt, 
          (chunk) => {
            // 实时更新分析结果
            setAnalysisResult(prev => prev + chunk);
          },
          abortControllerRef.current?.signal
        );
      } catch (err) {
        // 如果是用户取消，直接抛出
        if (err.name === 'AbortError' || err.message?.includes('取消')) {
          throw err;
        }
        // OpenAI 也失败了
        throw new Error(err.message || 'AI分析失败，请检查环境变量中的API Key是否正确配置');
      }
    };

    try {
      await analyzeWithFallback();
    } catch (err) {
      // 如果是用户取消，不显示错误，保留已生成的内容
      if (err.name === 'AbortError' || err.message?.includes('取消')) {
        // 不清空分析结果，保留已生成的内容
        return;
      }
      console.error('AI分析失败:', err);
      setError(err.message || 'AI分析失败，请检查环境变量中的API Key是否正确配置');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 取消分析
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    // 取消时不清空分析结果，保留已生成的内容
  };

  // 关闭模态框时重置状态（但保留分析结果）
  const handleClose = () => {
    // 如果正在加载，先取消请求
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 不清空 analysisResult，保留上一次的分析内容
    setError(null);
    setLoading(false);
    abortControllerRef.current = null;
    onClose();
  };

  // 模态框标题
  const modalTitle = (
    <div className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-primary-600" />
      <span>{title}</span>
    </div>
  );

  // 模态框底部按钮
  const modalFooter = (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
      {loading ? (
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          取消分析
        </button>
      ) : (
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            开始分析
          </button>
        </>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      footer={modalFooter}
      maxWidth="max-w-4xl"
    >
      <div className="p-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">分析失败</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 分析结果 - 使用Markdown渲染 */}
        {analysisResult && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">分析结果：</h4>
              {currentProvider && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  使用 {currentProvider} API
                </span>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // 自定义样式
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-900" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-gray-900" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="text-base font-semibold mb-2 mt-3 text-gray-900" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                  li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-blue-700" {...props} />,
                  em: ({ node, ...props }) => <em className="italic" {...props} />,
                  code: ({ node, inline, ...props }) => 
                    inline ? (
                      <code className="px-1.5 py-0.5 bg-gray-200 rounded text-sm font-mono text-gray-800" {...props} />
                    ) : (
                      <code className="block p-3 bg-gray-800 text-gray-100 rounded-lg text-sm font-mono overflow-x-auto mb-3" {...props} />
                    ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 my-3" {...props} />
                  ),
                  // 表格样式
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-gray-300 bg-white shadow-sm" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-gray-100" {...props} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody className="bg-white" {...props} />
                  ),
                  tr: ({ node, ...props }) => (
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors" {...props} />
                  ),
                  th: ({ node, align, ...props }) => {
                    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                    return (
                      <th 
                        className={`border border-gray-300 px-4 py-2 font-semibold text-gray-900 bg-gray-100 ${alignClass}`}
                        style={{ textAlign: align }}
                        {...props} 
                      />
                    );
                  },
                  td: ({ node, align, ...props }) => {
                    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                    return (
                      <td 
                        className={`border border-gray-300 px-4 py-2 text-gray-700 ${alignClass}`}
                        style={{ textAlign: align }}
                        {...props} 
                      />
                    );
                  },
                }}
              >
                {analysisResult}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* 加载状态 - 只在没有结果时显示 */}
        {loading && !analysisResult && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-4" />
            <p className="text-sm text-gray-600">
              {currentProvider ? `${currentProvider} AI LLM正在分析数据，请稍候...` : 'AI正在分析数据，请稍候...'}
            </p>
          </div>
        )}

        {/* 流式输出时的加载指示器 */}
        {loading && analysisResult && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{currentProvider ? `${currentProvider} 正在继续生成内容...` : 'AI正在继续生成内容...'}</span>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !analysisResult && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              点击下方按钮开始AI分析
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AIAnalysisModal;
