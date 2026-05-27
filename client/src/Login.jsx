import React, { useState } from 'react';
import { Send, Lock, Mail, AlertCircle } from 'lucide-react';

export function Login({ onLogin, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <header className="loginHeader">
          <div className="brandMark large">
            <img src="/favicon.png" alt="Logo" />
          </div>
          <h1>PO Assistant</h1>
          <p>El asistente para POs de Known Online</p>
        </header>

        <form onSubmit={handleSubmit} className="loginForm">
          {error && (
            <div className="errorBanner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email institucional</label>
            <div className="inputWithIcon">
              <Mail size={18} className="inputIcon" />
              <input
                id="email"
                type="email"
                placeholder="usuario@knownonline.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="inputWithIcon">
              <Lock size={18} className="inputIcon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="primary fullWidth" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            {!loading && <Send size={18} style={{ marginLeft: '8px' }} />}
          </button>
        </form>

        <footer className="loginFooter">
          <p>&copy; 2026 Known Online. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
