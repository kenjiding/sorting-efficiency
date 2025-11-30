import { useForm } from 'react-hook-form';
import { Save, AlertCircle, Edit2 } from 'lucide-react';
import { useEffect } from 'react';
import Modal from './common/Modal';

const EditRecordModal = ({ record, isOpen, onClose, onSave, loading }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue
  } = useForm();

  useEffect(() => {
    if (record && isOpen) {
      // Populate form with record data
      setValue('date', record.date);
      setValue('name', record.name);
      setValue('coarseStartTime', record.coarseStartTime || '');
      setValue('coarseEndTime', record.coarseEndTime || '');
      setValue('fineStartTime', record.fineStartTime || '');
      setValue('fineEndTime', record.fineEndTime || '');
      setValue('coarseCount', record.coarseCount || '');
      setValue('fineCount', record.fineCount || '');
    }
  }, [record, isOpen, setValue]);

  const onSubmit = async (data) => {
    const success = await onSave(record.id, {
      ...data,
      coarseCount: Number(data.coarseCount) || 0,
      fineCount: Number(data.fineCount) || 0
    });
    
    if (success) {
      reset();
      onClose();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-2xl"
      title={
        <div>
          <div className="flex items-center space-x-2">
            <Edit2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">编辑记录</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">修改生产力记录数据</p>
        </div>
      }
    >
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期 *
                </label>
                <input
                  type="date"
                  {...register('date', { required: '日期为必填项' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  {...register('name', { 
                    required: '姓名为必填项',
                    minLength: { value: 2, message: '姓名至少需要2个字符' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="请输入工人姓名"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coarse Sort */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                粗拣工作
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间
                    </label>
                    <input
                      type="time"
                      {...register('coarseStartTime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束时间
                    </label>
                    <input
                      type="time"
                      {...register('coarseEndTime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    处理数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('coarseCount', {
                      min: { value: 0, message: '数量不能为负数' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                  {errors.coarseCount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.coarseCount.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Fine Sort */}
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                细拣工作
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间
                    </label>
                    <input
                      type="time"
                      {...register('fineStartTime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束时间
                    </label>
                    <input
                      type="time"
                      {...register('fineEndTime')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    处理数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('fineCount', {
                      min: { value: 0, message: '数量不能为负数' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                  {errors.fineCount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.fineCount.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存更改
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
  );
};

export default EditRecordModal; 