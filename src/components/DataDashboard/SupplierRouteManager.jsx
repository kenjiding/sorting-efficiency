import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Link2 } from 'lucide-react';
import Modal from '../common/Modal';
import apiClient from '../../api/apiClient';

const SupplierRouteManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('suppliers'); // suppliers, routes, mappings
  
  // 表单状态
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showBulkRouteForm, setShowBulkRouteForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', code: '' });
  const [bulkRouteData, setBulkRouteData] = useState({ codes: '', description: '' });
  const [mappingData, setMappingData] = useState({ supplierId: '', routeCodes: [] });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersData, routesData, mappingsData] = await Promise.all([
        apiClient.inboundData.getSuppliers(),
        apiClient.inboundData.getRoutes(),
        apiClient.inboundData.getMappings()
      ]);
      setSuppliers(suppliersData);
      setRoutes(routesData);
      setMappings(mappingsData);
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 供应商管理
  const handleCreateSupplier = async () => {
    if (!formData.name.trim()) {
      alert('请输入供应商名称');
      return;
    }
    try {
      await apiClient.inboundData.createSupplier({
        name: formData.name,
        description: formData.description
      });
      await loadData();
      setShowSupplierForm(false);
      setFormData({ name: '', description: '', code: '' });
    } catch (error) {
      alert('创建失败: ' + error.message);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!formData.name.trim()) {
      alert('请输入供应商名称');
      return;
    }
    try {
      await apiClient.inboundData.updateSupplier(editingSupplier._id, {
        name: formData.name,
        description: formData.description
      });
      await loadData();
      setShowSupplierForm(false);
      setEditingSupplier(null);
      setFormData({ name: '', description: '', code: '' });
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('确定要删除这个供应商吗？')) return;
    try {
      await apiClient.inboundData.deleteSupplier(id);
      await loadData();
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  };

  // 路由管理
  const handleCreateRoute = async () => {
    if (!formData.code.trim()) {
      alert('请输入路由编码');
      return;
    }
    try {
      await apiClient.inboundData.createRoute({
        code: formData.code,
        description: formData.description
      });
      await loadData();
      setShowRouteForm(false);
      setFormData({ name: '', description: '', code: '' });
    } catch (error) {
      alert('创建失败: ' + error.message);
    }
  };

  const handleUpdateRoute = async () => {
    if (!formData.code.trim()) {
      alert('请输入路由编码');
      return;
    }
    try {
      await apiClient.inboundData.updateRoute(editingRoute._id, {
        code: formData.code,
        description: formData.description
      });
      await loadData();
      setShowRouteForm(false);
      setEditingRoute(null);
      setFormData({ name: '', description: '', code: '' });
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };

  const handleDeleteRoute = async (id) => {
    if (!window.confirm('确定要删除这个路由吗？')) return;
    try {
      await apiClient.inboundData.deleteRoute(id);
      await loadData();
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  };

  // 批量创建路由
  const handleBulkCreateRoutes = async () => {
    if (!bulkRouteData.codes.trim()) {
      alert('请输入路由编码');
      return;
    }

    // 解析路由编码（支持换行、逗号、分号分隔）
    const routeCodes = bulkRouteData.codes
      .split(/[\n,，;；\s]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);

    if (routeCodes.length === 0) {
      alert('没有有效的路由编码');
      return;
    }

    try {
      // 批量创建路由
      const results = await Promise.allSettled(
        routeCodes.map(code =>
          apiClient.inboundData.createRoute({
            code: code,
            description: bulkRouteData.description || ''
          })
        )
      );

      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const failedCodes = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          // 检查是否是重复错误
          const errorMessage = result.reason?.message || '';
          if (errorMessage.includes('已存在') || errorMessage.includes('duplicate')) {
            skippedCount++;
          } else {
            failedCount++;
            failedCodes.push(routeCodes[index]);
          }
        }
      });

      await loadData();
      setShowBulkRouteForm(false);
      setBulkRouteData({ codes: '', description: '' });

      let message = `成功创建 ${successCount} 个路由`;
      if (skippedCount > 0) {
        message += `，跳过 ${skippedCount} 个已存在的路由`;
      }
      if (failedCount > 0) {
        message += `，失败 ${failedCount} 个`;
        if (failedCodes.length > 0 && failedCodes.length <= 5) {
          message += `：${failedCodes.join(', ')}`;
        }
      }
      alert(message);
    } catch (error) {
      alert('批量创建失败: ' + error.message);
    }
  };

  // 关联管理
  const handleRouteCodeToggle = (routeCode) => {
    setMappingData(prev => {
      const routeCodes = prev.routeCodes || [];
      if (routeCodes.includes(routeCode)) {
        return { ...prev, routeCodes: routeCodes.filter(code => code !== routeCode) };
      } else {
        return { ...prev, routeCodes: [...routeCodes, routeCode] };
      }
    });
  };

  const handleSelectAllRoutes = () => {
    const allRouteCodes = routes.map(route => route.code);
    setMappingData(prev => ({
      ...prev,
      routeCodes: prev.routeCodes.length === allRouteCodes.length ? [] : allRouteCodes
    }));
  };

  const handleCreateMapping = async () => {
    if (!mappingData.supplierId || !mappingData.routeCodes || mappingData.routeCodes.length === 0) {
      alert('请选择供应商和至少一个路由编码');
      return;
    }
    try {
      // 为每个选中的路由编码创建关联
      const promises = mappingData.routeCodes.map(routeCode =>
        apiClient.inboundData.createMapping({
          supplierId: mappingData.supplierId,
          routeCode: routeCode
        })
      );
      
      await Promise.all(promises);
      await loadData();
      setShowMappingForm(false);
      setMappingData({ supplierId: '', routeCodes: [] });
    } catch (error) {
      alert('创建关联失败: ' + error.message);
    }
  };

  const handleDeleteMapping = async (id) => {
    if (!window.confirm('确定要删除这个关联吗？')) return;
    try {
      await apiClient.inboundData.deleteMapping(id);
      await loadData();
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  };

  const openSupplierForm = (supplier = null) => {
    setEditingSupplier(supplier);
    setFormData(supplier ? { name: supplier.name, description: supplier.description || '', code: '' } : { name: '', description: '', code: '' });
    setShowSupplierForm(true);
  };

  const openRouteForm = (route = null) => {
    setEditingRoute(route);
    setFormData(route ? { name: '', description: route.description || '', code: route.code } : { name: '', description: '', code: '' });
    setShowRouteForm(true);
  };

  // 获取路由对应的供应商
  const getSuppliersForRoute = (routeCode) => {
    return mappings
      .filter(m => m.routeCode === routeCode && m.supplierId)
      .map(m => m.supplierId.name);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">供应商与路由管理</h3>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'suppliers'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            供应商
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'routes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            路由
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'mappings'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            关联关系
          </button>
        </nav>
      </div>

      <div className="p-6">
        {/* 供应商列表 */}
        {activeTab === 'suppliers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">供应商列表</h4>
              <button
                onClick={() => openSupplierForm()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加供应商
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{supplier.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{supplier.description || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openSupplierForm(supplier)}
                          className="text-primary-600 hover:text-primary-800 mr-3"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 路由列表 */}
        {activeTab === 'routes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">路由列表</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBulkRouteForm(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  批量添加
                </button>
                <button
                  onClick={() => openRouteForm()}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加路由
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">路由编码</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联供应商</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {routes.map((route) => (
                    <tr key={route._id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{route.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{route.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getSuppliersForRoute(route.code).join(', ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openRouteForm(route)}
                          className="text-primary-600 hover:text-primary-800 mr-3"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 关联关系列表 */}
        {activeTab === 'mappings' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-900">供应商-路由关联</h4>
              <button
                onClick={() => setShowMappingForm(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Link2 className="h-4 w-4 mr-2" />
                添加关联
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">路由编码</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings.map((mapping) => (
                    <tr key={mapping._id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {mapping.supplierId?.name || '未知'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{mapping.routeCode}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleDeleteMapping(mapping._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 供应商表单模态框 */}
      <Modal
        isOpen={showSupplierForm}
        onClose={() => { setShowSupplierForm(false); setEditingSupplier(null); setFormData({ name: '', description: '', code: '' }); }}
        title={editingSupplier ? '编辑供应商' : '添加供应商'}
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">供应商名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入供应商名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows="3"
              placeholder="请输入描述（可选）"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); setFormData({ name: '', description: '', code: '' }); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>

      {/* 路由表单模态框 */}
      <Modal
        isOpen={showRouteForm}
        onClose={() => { setShowRouteForm(false); setEditingRoute(null); setFormData({ name: '', description: '', code: '' }); }}
        title={editingRoute ? '编辑路由' : '添加路由'}
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">路由编码 *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="请输入路由编码"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows="3"
              placeholder="请输入描述（可选）"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => { setShowRouteForm(false); setEditingRoute(null); setFormData({ name: '', description: '', code: '' }); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={editingRoute ? handleUpdateRoute : handleCreateRoute}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            保存
          </button>
        </div>
      </Modal>

      {/* 批量添加路由表单模态框 */}
      <Modal
        isOpen={showBulkRouteForm}
        onClose={() => { setShowBulkRouteForm(false); setBulkRouteData({ codes: '', description: '' }); }}
        title="批量添加路由"
        maxWidth="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              路由编码 * (每行一个，或用逗号/分号分隔)
            </label>
            <textarea
              value={bulkRouteData.codes}
              onChange={(e) => setBulkRouteData({ ...bulkRouteData, codes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
              rows="10"
              placeholder="请输入路由编码，每行一个，例如：&#10;AA01&#10;AA02&#10;AA03&#10;&#10;或者用逗号分隔：AA01, AA02, AA03"
            />
            <p className="mt-2 text-xs text-gray-500">
              提示：支持换行、逗号、分号分隔。系统会自动去除空格并转换为大写。
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">描述（可选，将应用于所有路由）</label>
            <textarea
              value={bulkRouteData.description}
              onChange={(e) => setBulkRouteData({ ...bulkRouteData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows="3"
              placeholder="请输入描述（可选）"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => { setShowBulkRouteForm(false); setBulkRouteData({ codes: '', description: '' }); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleBulkCreateRoutes}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            批量创建
          </button>
        </div>
      </Modal>

      {/* 关联表单模态框 */}
      <Modal
        isOpen={showMappingForm}
        onClose={() => { setShowMappingForm(false); setMappingData({ supplierId: '', routeCodes: [] }); }}
        title="添加关联"
        maxWidth="max-w-md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">供应商 *</label>
            <select
              value={mappingData.supplierId}
              onChange={(e) => setMappingData({ ...mappingData, supplierId: e.target.value, routeCodes: [] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">请选择供应商</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              路由编码 * (可多选)
              {mappingData.routeCodes && mappingData.routeCodes.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  (已选择 {mappingData.routeCodes.length} 个)
                </span>
              )}
            </label>
            {mappingData.supplierId ? (
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {/* 全选选项 */}
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <label className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                    <input
                      type="checkbox"
                      checked={routes.length > 0 && mappingData.routeCodes.length === routes.length}
                      onChange={handleSelectAllRoutes}
                      className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {routes.length > 0 && mappingData.routeCodes.length === routes.length ? '取消全选' : '选择全部'}
                    </span>
                    {routes.length > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({routes.length}个)
                      </span>
                    )}
                  </label>
                </div>
                {/* 路由编码列表 */}
                <div className="p-1">
                  {routes.length > 0 ? (
                    routes.map((route) => (
                      <label
                        key={route._id}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          checked={mappingData.routeCodes.includes(route.code)}
                          onChange={() => handleRouteCodeToggle(route.code)}
                          className="mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">
                          {route.code}
                          {route.description && (
                            <span className="ml-2 text-xs text-gray-500">- {route.description}</span>
                          )}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      暂无路由编码，请先添加路由
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500 text-center border border-gray-300 rounded-lg bg-gray-50">
                请先选择供应商
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => { setShowMappingForm(false); setMappingData({ supplierId: '', routeCodes: [] }); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreateMapping}
            disabled={!mappingData.supplierId || !mappingData.routeCodes || mappingData.routeCodes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存 {mappingData.routeCodes && mappingData.routeCodes.length > 0 && `(${mappingData.routeCodes.length}个)`}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SupplierRouteManager;

