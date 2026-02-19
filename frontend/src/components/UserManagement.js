import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Users,
  Mail,
  Shield,
  Save,
  X,
  Building2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'cajero',
    branch_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      console.error('Error al cargar sucursales');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', email: '', password: '', rol: 'cajero', branch_id: '' });
    setEditingUser(null);
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        email: user.email,
        password: '',
        rol: user.rol,
        branch_id: user.branch_id || ''
      });
      setEditingUser(user);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = {
          nombre: formData.nombre,
          rol: formData.rol,
          branch_id: formData.branch_id || null
        };
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('Usuario actualizado exitosamente');
      } else {
        const createData = {
          nombre: formData.nombre,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          branch_id: formData.branch_id || null
        };
        await axios.post(`${API}/auth/register`, createData);
        toast.success('Usuario creado exitosamente');
      }
      fetchUsers();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar el usuario');
    }
  };

  const toggleUserActive = async (user) => {
    try {
      await axios.put(`${API}/users/${user.id}`, { activo: !user.activo });
      toast.success(`Usuario ${!user.activo ? 'activado' : 'desactivado'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const getRoleBadge = (rol) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      cajero: 'bg-green-100 text-green-800'
    };
    return styles[rol] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (rol) => {
    const labels = { admin: 'Admin', supervisor: 'Supervisor', cajero: 'Cajero' };
    return labels[rol] || rol;
  };

  const getBranchName = (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.nombre : '—';
  };

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
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th>Acciones</th>
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
                    {getBranchName(user.branch_id)}
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => toggleUserActive(user)}
                    className="flex items-center gap-1 text-sm"
                  >
                    {user.activo
                      ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-700">Activo</span></>
                      : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-500">Inactivo</span></>
                    }
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => openModal(user)}
                    className="text-blue-600 hover:text-blue-800"
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={closeModal} className="modal-close">
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
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="form-label">Sucursal</label>
                    <select
                      className="form-select"
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    >
                      <option value="">Sin sucursal</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
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

export default UserManagement;
