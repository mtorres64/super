import React from 'react';
import {
  Plus,
  Edit,
  Users,
  Mail,
  Shield,
  Save,
  X,
  Building2,
} from 'lucide-react';
import SortIcon from '../ui/SortIcon';

const UserManagementView = ({
  users,
  branches,
  loading,
  showModal,
  editingUser,
  formData,
  modalClosing,
  setFormData,
  openModal,
  handleModalClose,
  handleSubmit,
  toggleUserActive,
  getRoleBadge,
  getRoleLabel,
  getBranchNames,
  sortConfig,
  requestSort,
}) => {
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600">{users.length} usuario(s) registrado(s)</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => requestSort('nombre')} className="cursor-pointer select-none hover:bg-gray-50">Usuario <SortIcon columnKey="nombre" sortConfig={sortConfig} /></th>
              <th onClick={() => requestSort('email')} className="cursor-pointer select-none hover:bg-gray-50">Email <SortIcon columnKey="email" sortConfig={sortConfig} /></th>
              <th onClick={() => requestSort('rol')} className="cursor-pointer select-none hover:bg-gray-50">Rol <SortIcon columnKey="rol" sortConfig={sortConfig} /></th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="font-medium text-gray-900">{user.nombre}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-gray-400" />
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadge(user.rol)}`}>
                      {getRoleLabel(user.rol)}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {getBranchNames(user.branch_ids)}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleUserActive(user)}
                    title={user.activo ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1"
                    style={{ background: user.activo ? '#22c55e' : '#d1d5db' }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: user.activo ? 'translateX(1.1rem)' : 'translateX(0.2rem)' }}
                    />
                  </button>
                </td>
                <td className="text-center">
                  <button
                    onClick={() => openModal(user)}
                    className="btn-edit mx-auto"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className={`modal-overlay${modalClosing ? ' closing' : ''}`}>
          <div className={`modal-content${modalClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={handleModalClose} className="modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                {!editingUser && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Rol *</label>
                  <select
                    className="form-select"
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  >
                    <option value="cajero">Cajero</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sucursales</label>
                  {branches.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay sucursales registradas</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                      {branches.map(branch => (
                        <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                          <input
                            type="checkbox"
                            className="accent-green-600"
                            checked={formData.branch_ids.includes(branch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, branch_ids: [...formData.branch_ids, branch.id] });
                              } else {
                                setFormData({ ...formData, branch_ids: formData.branch_ids.filter(id => id !== branch.id) });
                              }
                            }}
                          />
                          {branch.nombre}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={handleModalClose} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
