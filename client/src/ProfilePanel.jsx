import React, { useState } from 'react';
import { Shield, Lock, Loader2, Save, User as UserIcon } from 'lucide-react';
import { api } from './api.js';

export function ProfilePanel({ user, language }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError(language === 'es' ? 'Las contraseñas nuevas no coinciden.' : 'New passwords do not match.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError(language === 'es' ? 'La nueva contraseña debe tener al menos 6 caracteres.' : 'New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(form.currentPassword, form.newPassword);
      setSuccess(language === 'es' ? 'Contraseña actualizada exitosamente.' : 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel userManagementPanel">
      <div className="panelHeader">
        <UserIcon size={20} color="var(--ko-orange)" />
        <h3>{language === 'es' ? 'Mi Perfil' : 'My Profile'}</h3>
      </div>

      <div className="userForm" style={{ marginBottom: '24px' }}>
        <p><strong>{language === 'es' ? 'Nombre:' : 'Name:'}</strong> {user?.fullName}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>{language === 'es' ? 'Rol:' : 'Role:'}</strong> <span className={`roleBadge ${user?.role}`}>{user?.role === 'user' ? 'PO' : 'Admin'}</span></p>
      </div>

      <div className="panelHeader" style={{ marginTop: '32px' }}>
        <Shield size={20} color="var(--ko-orange)" />
        <h3>{language === 'es' ? 'Cambiar Contraseña' : 'Change Password'}</h3>
      </div>

      <form onSubmit={handleSubmit} className="userForm">
        <div className="formGrid">
          <label className="field">
            <span>{language === 'es' ? 'Contraseña Actual' : 'Current Password'}</span>
            <div className="inputWithIcon">
              <Lock size={16} className="inputIcon" />
              <input 
                type="password" 
                value={form.currentPassword} 
                onChange={e => setForm({...form, currentPassword: e.target.value})} 
                placeholder="••••••••"
                required 
              />
            </div>
          </label>
          <label className="field">
            <span>{language === 'es' ? 'Nueva Contraseña' : 'New Password'}</span>
            <div className="inputWithIcon">
              <Lock size={16} className="inputIcon" />
              <input 
                type="password" 
                value={form.newPassword} 
                onChange={e => setForm({...form, newPassword: e.target.value})} 
                placeholder="••••••••"
                required 
              />
            </div>
          </label>
          <label className="field">
            <span>{language === 'es' ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}</span>
            <div className="inputWithIcon">
              <Lock size={16} className="inputIcon" />
              <input 
                type="password" 
                value={form.confirmPassword} 
                onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                placeholder="••••••••"
                required 
              />
            </div>
          </label>
        </div>
        
        {error && <div className="errorBanner" style={{ marginBottom: '16px' }}>{error}</div>}
        {success && <div className="successBanner" style={{ marginBottom: '16px', background: '#f0fdf4', color: '#166534', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>{success}</div>}

        <button type="submit" className="primary" disabled={loading}>
          {loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}
