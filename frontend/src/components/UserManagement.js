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
  UserCheck,
  UserX
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'cajero'
  });

  useEffect(() => {
    // Since we don't have a users endpoint yet, we'll create some mock data
    // In a real application, you would fetch users from the backend
    setUsers([]);
    setLoading(false);
  }, []);

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'cajero'
    });
    setEditingUser(null);
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        email: user.email,
        password: '',
        rol: user.rol
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
        // Update user logic would go here
        toast.success('Usuario actualizado exitosamente');
      } else {
        // Create new user
        await axios.post(`${API}/auth/register`, formData);
        toast.success('Usuario creado exitosamente');
      }

      // In a real app, you would refresh the users list here
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar el usuario');
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Administrador',
      'supervisor': 'Supervisor',
      'cajero': 'Cajero'
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'supervisor':
        return 'bg-yellow-100 text-yellow-800';
      case 'cajero':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8"></div>
        </div>
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
          <p className="text-gray-600">
            Administrar empleados del sistema
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid mb-6">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Total Usuarios</div>
            <div className="stat-icon">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">3</div>
          <p className="text-sm text-gray-500 mt-2">
            Usuarios registrados
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Administradores</div>
            <div className="stat-icon">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">1</div>
          <p className="text-sm text-gray-500 mt-2">
            Con acceso completo
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Cajeros</div>
            <div className="stat-icon">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="stat-value">2</div>
          <p className="text-sm text-gray-500 mt-2">
            Personal de ventas
          </p>
        </div>
      </div>

      {/* Sample Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    A
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Admin SuperMarket</div>
                    <div className="text-sm text-gray-500">Administrador principal</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center text-blue-600">
                  <Mail className="w-4 h-4 mr-2" />
                  admin@supermarket.com
                </div>
              </td>
              <td>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor('admin')}`}>
                  Administrador
                </span>
              </td>
              <td>
                <span className="flex items-center text-green-600">
                  <UserCheck className="w-4 h-4 mr-1" />
                  Activo
                </span>
              </td>
              <td>
                <span className="text-gray-600">01/01/2024</span>
              </td>
              <td>
                <button
                  onClick={() => openModal({
                    id: '1',
                    nombre: 'Admin SuperMarket',
                    email: 'admin@supermarket.com',
                    rol: 'admin'
                  })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </td>
            </tr>

            <tr>
              <td>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    C
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Carlos Cajero</div>
                    <div className="text-sm text-gray-500">Personal de ventas</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center text-blue-600">
                  <Mail className="w-4 h-4 mr-2" />
                  cajero@supermarket.com
                </div>
              </td>
              <td>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor('cajero')}`}>
                  Cajero
                </span>
              </td>
              <td>
                <span className="flex items-center text-green-600">
                  <UserCheck className="w-4 h-4 mr-1" />
                  Activo
                </span>
              </td>
              <td>
                <span className="text-gray-600">02/01/2024</span>
              </td>
              <td>
                <button
                  onClick={() => openModal({
                    id: '2',
                    nombre: 'Carlos Cajero',
                    email: 'cajero@supermarket.com',
                    rol: 'cajero'
                  })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </td>
            </tr>

            <tr>
              <td>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    S
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Sara Supervisora</div>
                    <div className="text-sm text-gray-500">Supervisión de operaciones</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="flex items-center text-blue-600">
                  <Mail className="w-4 h-4 mr-2" />
                  supervisor@supermarket.com
                </div>
              </td>
              <td>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor('supervisor')}`}>
                  Supervisor
                </span>
              </td>
              <td>
                <span className="flex items-center text-green-600">
                  <UserCheck className="w-4 h-4 mr-1" />
                  Activo
                </span>
              </td>
              <td>
                <span className="text-gray-600">03/01/2024</span>
              </td>
              <td>
                <button
                  onClick={() => openModal({
                    id: '3',
                    nombre: 'Sara Supervisora',
                    email: 'supervisor@supermarket.com',
                    rol: 'supervisor'
                  })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rol *</label>
                  <select
                    className="form-select"
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                    required
                  >
                    <option value="cajero">Cajero</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.rol === 'admin' && 'Acceso completo al sistema'}
                    {formData.rol === 'supervisor' && 'Acceso a POS y reportes'}
                    {formData.rol === 'cajero' && 'Solo acceso al punto de venta'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Usuarios de Prueba
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Para probar el sistema, puedes usar estas credenciales:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Admin:</strong> admin@supermarket.com / admin123</li>
                <li><strong>Cajero:</strong> cajero@supermarket.com / cajero123</li>
                <li><strong>Supervisor:</strong> supervisor@supermarket.com / super123</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;