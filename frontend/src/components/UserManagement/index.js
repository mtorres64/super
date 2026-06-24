import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../../App';
import { toast } from 'sonner';
import useModalClose from '../../useModalClose';
import { useSortableData } from '../../hooks/useSortableData';
import UserManagementView from './UserManagementView';

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
    branch_ids: []
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
    setFormData({ nombre: '', email: '', password: '', rol: 'cajero', branch_ids: [] });
    setEditingUser(null);
  };

  const openModal = (user = null) => {
    if (user) {
      setFormData({
        nombre: user.nombre,
        email: user.email,
        password: '',
        rol: user.rol,
        branch_ids: user.branch_ids || []
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
  const [modalClosing, handleModalClose] = useModalClose(closeModal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = {
          nombre: formData.nombre,
          rol: formData.rol,
          branch_ids: formData.branch_ids
        };
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('Usuario actualizado exitosamente');
      } else {
        const createData = {
          nombre: formData.nombre,
          email: formData.email.toLowerCase(),
          password: formData.password,
          rol: formData.rol,
          branch_ids: formData.branch_ids
        };
        await axios.post(`${API}/auth/register`, createData);
        toast.success('Usuario creado exitosamente');
      }
      fetchUsers();
      handleModalClose();
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

  const getBranchNames = (branchIds) => {
    if (!branchIds || branchIds.length === 0) return '—';
    return branchIds.map(id => {
      const branch = branches.find(b => b.id === id);
      return branch ? branch.nombre : '?';
    }).join(', ');
  };

  const { sortedItems: sortedUsers, sortConfig, requestSort } = useSortableData(users);

  return (
    <UserManagementView
      users={sortedUsers}
      branches={branches}
      limiteAlcanzado={users.length >= 15}
      sortConfig={sortConfig}
      requestSort={requestSort}
      loading={loading}
      showModal={showModal}
      editingUser={editingUser}
      formData={formData}
      modalClosing={modalClosing}
      setFormData={setFormData}
      openModal={openModal}
      handleModalClose={handleModalClose}
      handleSubmit={handleSubmit}
      toggleUserActive={toggleUserActive}
      getRoleBadge={getRoleBadge}
      getRoleLabel={getRoleLabel}
      getBranchNames={getBranchNames}
    />
  );
};

export default UserManagement;
