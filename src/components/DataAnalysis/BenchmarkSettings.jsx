import { useState } from 'react';
import { Target, Save, RotateCcw, Info, TrendingUp } from 'lucide-react';
import Modal from '../common/Modal';

const BenchmarkSettings = ({ benchmarkValues, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coarseBenchmark, setCoarseBenchmark] = useState(benchmarkValues.coarseBenchmark);
  const [fineBenchmark, setFineBenchmark] = useState(benchmarkValues.fineBenchmark);
  const [hasChanges, setHasChanges] = useState(false);

  // 打开弹窗时回填当前保存的基准值
  const handleOpenModal = () => {
    setCoarseBenchmark(benchmarkValues.coarseBenchmark);
    setFineBenchmark(benchmarkValues.fineBenchmark);
    setHasChanges(false);
    setIsOpen(true);
  };

  const handleCoarseChange = (value) => {
    setCoarseBenchmark(Number(value));
    setHasChanges(true);
  };

  const handleFineChange = (value) => {
    setFineBenchmark(Number(value));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (coarseBenchmark <= 0 || fineBenchmark <= 0) {
      alert('基准效率值必须大于0');
      return;
    }
    onSave(coarseBenchmark, fineBenchmark);
    setHasChanges(false);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultCoarse = 400;
    const defaultFine = 400;
    setCoarseBenchmark(defaultCoarse);
    setFineBenchmark(defaultFine);
    setHasChanges(true);
  };

  const handleCancel = () => {
    setCoarseBenchmark(benchmarkValues.coarseBenchmark);
    setFineBenchmark(benchmarkValues.fineBenchmark);
    setHasChanges(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
      >
        <Target className="h-4 w-4 mr-2 text-blue-600" />
        基准效率设置
        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
          粗:{benchmarkValues.coarseBenchmark} 细:{benchmarkValues.fineBenchmark}
        </span>
      </button>

      {/* 设置模态框 */}
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        maxWidth="max-w-2xl"
        title={
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                基准效率设置
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                设置粗拣和细拣的合格标准效率值
              </p>
            </div>
          </div>
        }
        footer={
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                恢复默认值
              </button>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {hasChanges ? '保存设置' : '已保存'}
                </button>
              </div>
            </div>
          </div>
        }
      >
        {/* 内容区域 */}
        <div className="px-6 py-6">
              {/* 说明信息 */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">基准效率说明：</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 基准效率是判断员工是否<span className="font-semibold text-blue-900">达标</span>的合格线</li>
                      <li>• 图表将使用这些值绘制<span className="font-semibold text-blue-900">参考线</span>，方便对比分析</li>
                      <li>• 等级评定将基于基准值动态调整，更贴近实际情况</li>
                      <li>• 建议根据历史数据和行业标准设置合理的基准值</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 基准值输入 */}
              <div className="space-y-6">
                {/* 粗拣基准 */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                      <h4 className="text-lg font-semibold text-gray-900">粗拣基准效率</h4>
                    </div>
                    <span className="text-xs text-orange-700 bg-orange-200 px-2 py-1 rounded-full">
                      合格标准线
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        效率值 (件/小时)
                      </label>
                      <input
                        type="number"
                        value={coarseBenchmark}
                        onChange={(e) => handleCoarseChange(e.target.value)}
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 text-lg font-semibold border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        实时预览
                      </label>
                      <div className="bg-white border-2 border-orange-300 rounded-lg px-4 py-3 text-center">
                        <div className="text-3xl font-bold text-orange-600">{coarseBenchmark}</div>
                        <div className="text-xs text-gray-600 mt-1">件/小时</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 滑块 */}
                  <div className="mt-4">
                    <input
                      type="range"
                      value={coarseBenchmark}
                      onChange={(e) => handleCoarseChange(e.target.value)}
                      min="100"
                      max="800"
                      step="10"
                      className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>100</span>
                      <span>450</span>
                      <span>800</span>
                    </div>
                  </div>
                  
                  {/* 建议值 */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-600">推荐范围: 350-450 件/小时</span>
                    <button
                      onClick={() => handleCoarseChange(400)}
                      className="text-orange-600 hover:text-orange-800 font-medium underline"
                    >
                      使用推荐值 (400)
                    </button>
                  </div>
                </div>

                {/* 细拣基准 */}
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 border-2 border-pink-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                      <h4 className="text-lg font-semibold text-gray-900">细拣基准效率</h4>
                    </div>
                    <span className="text-xs text-pink-700 bg-pink-200 px-2 py-1 rounded-full">
                      合格标准线
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        效率值 (件/小时)
                      </label>
                      <input
                        type="number"
                        value={fineBenchmark}
                        onChange={(e) => handleFineChange(e.target.value)}
                        min="1"
                        step="1"
                        className="w-full px-4 py-3 text-lg font-semibold border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        实时预览
                      </label>
                      <div className="bg-white border-2 border-pink-300 rounded-lg px-4 py-3 text-center">
                        <div className="text-3xl font-bold text-pink-600">{fineBenchmark}</div>
                        <div className="text-xs text-gray-600 mt-1">件/小时</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 滑块 */}
                  <div className="mt-4">
                    <input
                      type="range"
                      value={fineBenchmark}
                      onChange={(e) => handleFineChange(e.target.value)}
                      min="100"
                      max="800"
                      step="10"
                      className="w-full h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>100</span>
                      <span>450</span>
                      <span>800</span>
                    </div>
                  </div>
                  
                  {/* 建议值 */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-600">推荐范围: 350-450 件/小时</span>
                    <button
                      onClick={() => handleFineChange(400)}
                      className="text-pink-600 hover:text-pink-800 font-medium underline"
                    >
                      使用推荐值 (400)
                    </button>
                  </div>
                </div>
              </div>

              {/* 效率对比预览 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">基准值影响预览</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">粗拣评判标准：</p>
                    <ul className="space-y-0.5 text-xs text-gray-700">
                      <li>• 优秀: ≥ {(coarseBenchmark * 1.8).toFixed(0)} 件/小时</li>
                      <li>• 良好: ≥ {(coarseBenchmark * 1.4).toFixed(0)} 件/小时</li>
                      <li className="font-semibold text-blue-700">• 合格: ≥ {coarseBenchmark} 件/小时 (基准)</li>
                      <li>• 待提升: ≥ {(coarseBenchmark * 0.7).toFixed(0)} 件/小时</li>
                      <li>• 需改进: &lt; {(coarseBenchmark * 0.7).toFixed(0)} 件/小时</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">细拣评判标准：</p>
                    <ul className="space-y-0.5 text-xs text-gray-700">
                      <li>• 优秀: ≥ {(fineBenchmark * 1.8).toFixed(0)} 件/小时</li>
                      <li>• 良好: ≥ {(fineBenchmark * 1.4).toFixed(0)} 件/小时</li>
                      <li className="font-semibold text-blue-700">• 合格: ≥ {fineBenchmark} 件/小时 (基准)</li>
                      <li>• 待提升: ≥ {(fineBenchmark * 0.7).toFixed(0)} 件/小时</li>
                      <li>• 需改进: &lt; {(fineBenchmark * 0.7).toFixed(0)} 件/小时</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
      </Modal>
    </>
  );
};

export default BenchmarkSettings;

