import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import WorkerSelector from './WorkerSelector';

const MultiWorkerEntryForm = ({ 
  onSubmit, 
  isSubmitting, 
  availableNames, 
  onNamesUpdate 
}) => {
  const [globalCoarseStartTime, setGlobalCoarseStartTime] = useState('');
  const [globalCoarseEndTime, setGlobalCoarseEndTime] = useState('');
  const [globalFineStartTime, setGlobalFineStartTime] = useState('');
  const [globalFineEndTime, setGlobalFineEndTime] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      workers: [
        {
          name: '',
          coarseStartTime: '',
          coarseEndTime: '',
          fineStartTime: '',
          fineEndTime: '',
          coarseCount: '',
          fineCount: ''
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "workers"
  });

  const watchedValues = watch();

  // 同步粗拣时间函数
  const syncCoarseTimes = useCallback(() => {
    fields.forEach((field, index) => {
      if (globalCoarseStartTime) {
        setValue(`workers.${index}.coarseStartTime`, globalCoarseStartTime);
      }
      if (globalCoarseEndTime) {
        setValue(`workers.${index}.coarseEndTime`, globalCoarseEndTime);
      }
    });
  }, [fields, globalCoarseStartTime, globalCoarseEndTime, setValue]);

  // 同步细拣时间函数
  const syncFineTimes = useCallback(() => {
    fields.forEach((field, index) => {
      if (globalFineStartTime) {
        setValue(`workers.${index}.fineStartTime`, globalFineStartTime);
      }
      if (globalFineEndTime) {
        setValue(`workers.${index}.fineEndTime`, globalFineEndTime);
      }
    });
  }, [fields, globalFineStartTime, globalFineEndTime, setValue]);

  // 添加新员工
  const addWorker = () => {
    append({
      name: '',
      coarseStartTime: globalCoarseStartTime || '',
      coarseEndTime: globalCoarseEndTime || '',
      fineStartTime: globalFineStartTime || '',
      fineEndTime: globalFineEndTime || '',
      coarseCount: '',
      fineCount: ''
    });
  };

  // 删除员工
  const removeWorker = (index) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // 处理全局时间变化
  const handleGlobalTimeChange = (type, value) => {
    switch (type) {
      case 'coarseStart':
        setGlobalCoarseStartTime(value);
        break;
      case 'coarseEnd':
        setGlobalCoarseEndTime(value);
        break;
      case 'fineStart':
        setGlobalFineStartTime(value);
        break;
      case 'fineEnd':
        setGlobalFineEndTime(value);
        break;
    }
  };

  // 数据校验函数
  const validateWorkerData = (worker, index) => {
    const errors = [];

    // 检查姓名
    if (!worker.name.trim()) {
      errors.push(`员工${index + 1}：姓名不能为空`);
    }

    // 检查粗拣数据
    if (!worker.coarseStartTime) {
      errors.push(`员工${index + 1}：粗拣开始时间不能为空`);
    }
    if (!worker.coarseEndTime) {
      errors.push(`员工${index + 1}：粗拣结束时间不能为空`);
    }
    if (worker.coarseCount === undefined || worker.coarseCount === '') {
      errors.push(`员工${index + 1}：粗拣数量不能为空`);
    } else {
      const coarseCount = Number(worker.coarseCount);
      if (isNaN(coarseCount) || coarseCount < 0) {
        errors.push(`员工${index + 1}：粗拣数量必须是非负数字`);
      }
    }

    // 检查细拣数据 - 细拣时间和数量都是可选的
    // 如果填写了细拣时间，需要检查格式和逻辑
    if (worker.fineStartTime && worker.fineEndTime) {
      // 如果都填写了，检查时间逻辑
      if (worker.fineStartTime >= worker.fineEndTime) {
        errors.push(`员工${index + 1}：细拣开始时间不能晚于或等于结束时间`);
      }
    } else if (worker.fineStartTime && !worker.fineEndTime) {
      errors.push(`员工${index + 1}：填写了细拣开始时间，请同时填写结束时间`);
    } else if (!worker.fineStartTime && worker.fineEndTime) {
      errors.push(`员工${index + 1}：填写了细拣结束时间，请同时填写开始时间`);
    }
    
    // 细拣数量验证（可选）
    if (worker.fineCount !== undefined && worker.fineCount !== '') {
      const fineCount = Number(worker.fineCount);
      if (isNaN(fineCount) || fineCount < 0) {
        errors.push(`员工${index + 1}：细拣数量必须是非负数字`);
      }
    }

    return errors;
  };

  // 全局数据校验函数
  const validateAllData = (data) => {
    const errors = [];

    // 检查日期
    if (!data.date) {
      errors.push('请选择日期');
    }

    // 检查是否有员工数据
    if (!data.workers || data.workers.length === 0) {
      errors.push('请至少添加一个员工');
      return errors;
    }

    // 检查每个员工的数据
    data.workers.forEach((worker, index) => {
      const workerErrors = validateWorkerData(worker, index);
      errors.push(...workerErrors);
    });

    return errors;
  };

  const handleFormSubmit = async (data) => {
    // 全局数据校验
    const allErrors = validateAllData(data);

    if (allErrors.length > 0) {
      alert('数据校验失败：\n' + allErrors.join('\n'));
      return;
    }

    const records = data.workers
      .filter(worker => worker.name.trim()) // 只提交有姓名的员工数据
      .map(worker => ({
        date: data.date,
        name: worker.name,
        coarseStartTime: worker.coarseStartTime,
        coarseEndTime: worker.coarseEndTime,
        fineStartTime: worker.fineStartTime,
        fineEndTime: worker.fineEndTime,
        coarseCount: Number(worker.coarseCount) || 0,
        fineCount: Number(worker.fineCount) || 0 // 细拣数量为空时默认为0
      }));

    if (records.length === 0) {
      alert('请至少添加一个员工的数据');
      return;
    }

    // 批量提交所有记录
    let success = true;
    let successCount = 0;
    let failedRecords = [];

    for (const record of records) {
      const result = await onSubmit(record);
      if (result) {
        successCount++;
      } else {
        failedRecords.push(record.name);
        success = false;
      }
    }

    // 显示提交结果
    if (success) {
      alert(`✅ 批量添加成功！\n\n成功添加 ${successCount} 条员工记录：\n${records.map(r => `• ${r.name}`).join('\n')}`);
    } else {
      const successNames = records.filter(r => !failedRecords.includes(r.name)).map(r => r.name);
      const message = [
        `⚠️ 部分数据添加失败`,
        `\n成功添加 ${successCount} 条记录：`,
        ...successNames.map(name => `• ${name}`),
        `\n失败的记录：`,
        ...failedRecords.map(name => `• ${name}`)
      ].join('\n');
      alert(message);
    }

    if (success) {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        workers: [
          {
            name: '',
            coarseStartTime: '',
            coarseEndTime: '',
            fineStartTime: '',
            fineEndTime: '',
            coarseCount: '',
            fineCount: ''
          }
        ]
      });
      // 清空全局时间
      setGlobalCoarseStartTime('');
      setGlobalCoarseEndTime('');
      setGlobalFineStartTime('');
      setGlobalFineEndTime('');
      onNamesUpdate?.();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-primary-600" />
          批量录入员工数据
        </h3>
        <p className="mt-1 text-sm text-gray-600">一次性录入多个员工的生产力记录</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* 基本信息 */}
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
            </div>
          </div>

          {/* 全局时间控制 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-4 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              全局时间设置
            </h4>
            <p className="text-xs text-blue-700 mb-4">
              设置全局时间后，可以同步应用到所有员工。您也可以单独修改每个员工的时间。
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 全局粗拣时间 */}
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <h5 className="text-sm font-medium text-orange-700 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  全局粗拣时间
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      开始时间
                    </label>
                    <input
                      type="time"
                      value={globalCoarseStartTime}
                      onChange={(e) => handleGlobalTimeChange('coarseStart', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      结束时间
                    </label>
                    <input
                      type="time"
                      value={globalCoarseEndTime}
                      onChange={(e) => handleGlobalTimeChange('coarseEnd', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={syncCoarseTimes}
                  className="mt-2 w-full px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                >
                  同步粗拣时间
                </button>
              </div>

              {/* 全局细拣时间 */}
              <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                <h5 className="text-sm font-medium text-pink-700 mb-3 flex items-center">
                  <div className="w-3 h-3 bg-pink-500 rounded-full mr-2"></div>
                  全局细拣时间 <span className="text-gray-500 text-xs ml-1">(可选)</span>
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      开始时间
                    </label>
                    <input
                      type="time"
                      value={globalFineStartTime}
                      onChange={(e) => handleGlobalTimeChange('fineStart', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      结束时间
                    </label>
                    <input
                      type="time"
                      value={globalFineEndTime}
                      onChange={(e) => handleGlobalTimeChange('fineEnd', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={syncFineTimes}
                  className="mt-2 w-full px-2 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
                >
                  同步细拣时间
                </button>
              </div>
            </div>
          </div>

          {/* 员工数据列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">员工数据</h4>
              <button
                type="button"
                onClick={addWorker}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                添加员工
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-sm font-medium text-gray-900">员工 {index + 1}</h5>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWorker(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* 员工姓名 - 1/3宽度 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      工人姓名 <span className="text-red-500">*</span>
                    </label>
                    <WorkerSelector
                      value={watchedValues.workers?.[index]?.name || ''}
                      onChange={(value) => setValue(`workers.${index}.name`, value)}
                      availableNames={availableNames}
                      register={register}
                      errors={errors}
                      disabled={isSubmitting}
                      name={`workers.${index}.name`}
                    />
                  </div>

                  {/* 工作时间记录 - 2/3宽度 */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    {/* 粗拣记录 */}
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <h6 className="text-xs font-medium text-orange-700 mb-2">粗拣记录</h6>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-700">开始时间</label>
                            <input
                              type="time"
                              {...register(`workers.${index}.coarseStartTime`)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700">结束时间</label>
                            <input
                              type="time"
                              {...register(`workers.${index}.coarseEndTime`)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700">处理数量</label>
                          <input
                            type="number"
                            {...register(`workers.${index}.coarseCount`, { 
                              min: { value: 0, message: '数量不能为负数' }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 细拣记录 */}
                    <div className="bg-pink-50 rounded-lg p-3 border border-pink-200">
                      <h6 className="text-xs font-medium text-pink-700 mb-2">细拣记录 <span className="text-gray-500 text-xs">(可选)</span></h6>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-700">开始时间</label>
                            <input
                              type="time"
                              {...register(`workers.${index}.fineStartTime`)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700">结束时间</label>
                            <input
                              type="time"
                              {...register(`workers.${index}.fineEndTime`)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700">处理数量</label>
                          <input
                            type="number"
                            {...register(`workers.${index}.fineCount`, { 
                              min: { value: 0, message: '数量不能为负数' }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 提交按钮 */}
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
                  <Users className="h-4 w-4 mr-2" />
                  批量添加记录
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiWorkerEntryForm; 