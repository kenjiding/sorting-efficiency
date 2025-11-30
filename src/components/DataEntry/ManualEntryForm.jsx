import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import WorkerSelector from './WorkerSelector';

const ManualEntryForm = ({ 
  onSubmit, 
  isSubmitting, 
  availableNames, 
  onNamesUpdate 
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      coarseStartTime: '',
      coarseEndTime: '',
      fineStartTime: '',
      fineEndTime: '',
      coarseCount: '',
      fineCount: ''
    }
  });

  const watchedValues = watch();

  const handleFormSubmit = async (data) => {
    const success = await onSubmit({
      ...data,
      coarseCount: Number(data.coarseCount) || 0,
      fineCount: Number(data.fineCount) || 0
    });

    if (success) {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        name: '',
        coarseStartTime: '',
        coarseEndTime: '',
        fineStartTime: '',
        fineEndTime: '',
        coarseCount: '',
        fineCount: ''
      });
      onNamesUpdate?.();
    }
  };

  const handleWorkerChange = (value) => {
    setValue('name', value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Plus className="h-5 w-5 mr-2 text-primary-600" />
          手动录入数据
        </h3>
        <p className="mt-1 text-sm text-gray-600">填写下方表单来添加新的生产力记录</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">基本信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('date', { required: '请选择日期' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工人姓名 <span className="text-red-500">*</span>
                </label>
                <WorkerSelector
                  value={watchedValues.name}
                  onChange={handleWorkerChange}
                  availableNames={availableNames}
                  register={register}
                  errors={errors}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Work Time Records */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">工作时间记录</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coarse Sorting */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h5 className="text-sm font-medium text-orange-700 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  粗拣记录
                </h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        开始时间 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        {...register('coarseStartTime', { required: '请输入粗拣开始时间' })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={isSubmitting}
                      />
                      {errors.coarseStartTime && (
                        <p className="mt-1 text-xs text-red-600">{errors.coarseStartTime.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        结束时间 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        {...register('coarseEndTime', { required: '请输入粗拣结束时间' })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={isSubmitting}
                      />
                      {errors.coarseEndTime && (
                        <p className="mt-1 text-xs text-red-600">{errors.coarseEndTime.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      处理数量 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      {...register('coarseCount', { 
                        required: '请输入粗拣数量',
                        min: { value: 0, message: '数量不能为负数' }
                      })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="输入粗拣数量"
                      min="0"
                      disabled={isSubmitting}
                    />
                    {errors.coarseCount && (
                      <p className="mt-1 text-xs text-red-600">{errors.coarseCount.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fine Sorting */}
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                <h5 className="text-sm font-medium text-pink-700 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                  细拣记录 <span className="text-gray-500 text-xs ml-1">(可选)</span>
                </h5>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        开始时间
                      </label>
                      <input
                        type="time"
                        {...register('fineStartTime')}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        结束时间
                      </label>
                      <input
                        type="time"
                        {...register('fineEndTime')}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      处理数量
                    </label>
                    <input
                      type="number"
                      {...register('fineCount', { 
                        min: { value: 0, message: '数量不能为负数' }
                      })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="输入细拣数量"
                      min="0"
                      disabled={isSubmitting}
                    />
                    {errors.fineCount && (
                      <p className="mt-1 text-xs text-red-600">{errors.fineCount.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  提交中...
                </div>
              ) : (
                <div className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  添加记录
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryForm; 