import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User, Loader2, Mail, Lock, UserCircle } from 'lucide-react';
import { api } from './api.js';

export function UserManagementPanel({ language, t }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'user' });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res?.users) setUsers(res.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.registerUser(form);
      setForm({ fullName: '', email: '', password: '', role: 'user' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(id) {
    if (!confirm(language === 'es' ? '¿Estás seguro de eliminar este usuario?' : 'Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      await api.deleteUser(id);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel userManagementPanel">
      <div className="panelHeader">
        <Shield size={20} color="var(--ko-orange)" />
        <h3>{language === 'es' ? 'Gestión de Usuarios' : 'User Management'}</h3>
      </div>

      <form onSubmit={handleCreateUser} className="userForm">
        <div className="formGrid">
          <label className="field">
            <span>{language === 'es' ? 'Nombre Completo' : 'Full Name'}</span>
            <div className="inputWithIcon">
              <UserCircle size={16} className="inputIcon" />
              <input 
                type="text" 
                value={form.fullName} 
                onChange={e => setForm({...form, fullName: e.target.value})} 
                placeholder="Ej: Juan Perez"
                required 
              />
            </div>
          </label>
          <label className="field">
            <span>Email</span>
            <div className="inputWithIcon">
              <Mail size={16} className="inputIcon" />
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                placeholder="usuario@knownonline.com"
                required 
              />
            </div>
          </label>
          <label className="field">
            <span>{language === 'es' ? 'Contraseña' : 'Password'}</span>
            <div className="inputWithIcon">
              <Lock size={16} className="inputIcon" />
              <input 
                type="password" 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
                placeholder="••••••••"
                required 
              />
            </div>
          </label>
        </div>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />}
          {language === 'es' ? 'Crear Usuario' : 'Create User'}
        </button>
      </form>

      {error && <div className="errorBanner" style={{ marginTop: '20px' }}>{error}</div>}

      <div className="userList">
        <header className="listHeader">
          <span>{language === 'es' ? 'Usuario' : 'User'}</span>
          <span>Email</span>
          <span>{language === 'es' ? 'Rol' : 'Role'}</span>
          <span style={{ textAlign: 'right' }}>{language === 'es' ? 'Acciones' : 'Actions'}</span>
        </header>
        {users.map(u => (
          <div key={u._id} className="userRow">
            <div className="userInfo">
              <div className="userAvatar">{u.fullName.charAt(0).toUpperCase()}</div>
              <strong>{u.fullName}</strong>
            </div>
            <span>{u.email}</span>
            <span className={`roleBadge ${u.role}`}>{u.role === 'user' ? 'PO' : 'Admin'}</span>
            <div className="userActions">
              {u.role !== 'admin' && (
                <button onClick={() => handleDeleteUser(u._id)} className="deleteBtn" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
