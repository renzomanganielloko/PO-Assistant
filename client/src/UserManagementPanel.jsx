import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User, Loader2, Mail, Lock, UserCircle, Pause, Play } from 'lucide-react';
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

  async function handleToggleStatus(id) {
    setLoading(true);
    try {
      await api.toggleUserStatus(id);
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
        <div className="formGrid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
          <label className="field">
            <span>{language === 'es' ? 'Rol' : 'Role'}</span>
            <select 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})}
              className="roleSelect"
              style={{
                width: '100%',
                padding: '12px',
                border: '1.5px solid var(--ko-border)',
                borderRadius: '12px',
                fontSize: '14px',
                background: 'var(--ko-input-bg)',
                color: 'var(--ko-text)',
                height: '48px',
                marginTop: '4px',
                appearance: 'auto',
                WebkitAppearance: 'auto',
                MozAppearance: 'auto'
              }}
            >
              <option value="user">PO</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />}
          {language === 'es' ? 'Crear Usuario' : 'Create User'}
        </button>
      </form>

      {error && <div className="errorBanner" style={{ marginTop: '20px' }}>{error}</div>}

      <div className="userList" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <header style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px', gap: '10px', padding: '12px 24px', fontSize: '12px', fontWeight: 800, color: 'var(--ko-text-muted)', textTransform: 'uppercase' }}>
          <span>{language === 'es' ? 'Usuario' : 'User'}</span>
          <span>Email</span>
          <span>{language === 'es' ? 'Rol' : 'Role'}</span>
          <span style={{ textAlign: 'right' }}>{language === 'es' ? 'Acciones' : 'Actions'}</span>
        </header>
        {users.map(u => (
          <div key={u._id} className="userRow" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px', gap: '10px', alignItems: 'center', padding: '16px 24px', background: 'var(--ko-bg-card)', border: '1px solid var(--ko-border)', borderRadius: '16px', opacity: u.isActive !== false ? 1 : 0.6 }}>
            <div className="userInfo" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div className="userAvatar" style={{ background: u.isActive !== false ? 'var(--ko-orange)' : '#94a3b8' }}>
                {u.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong>{u.fullName}</strong>
                {u.isActive === false && <span style={{display: 'block', fontSize: '11px', color: '#ef4444', fontWeight: 700}}>PAUSADO</span>}
              </div>
            </div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
            <span className={`roleBadge ${u.role}`}>{u.role === 'user' ? 'PO' : 'Admin'}</span>
            <div className="userActions" style={{ gap: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              {u.role !== 'admin' ? (
                <>
                  <button onClick={() => handleToggleStatus(u._id)} className="pauseBtn" title={u.isActive !== false ? 'Pausar' : 'Activar'} style={{ background: 'var(--ko-secondary-btn)' }}>
                    {u.isActive !== false ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => handleDeleteUser(u._id)} className="deleteBtn" title="Eliminar" style={{ background: '#fee2e2' }}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--ko-text-muted)' }}>Admin</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
