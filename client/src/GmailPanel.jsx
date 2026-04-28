import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, LogOut, Loader2, Sparkles, ChevronDown, ExternalLink } from 'lucide-react';
import { api } from './api';

export function GmailPanel({ language, t }) {
  const [status, setStatus] = useState({ connected: false });
  const [emails, setEmails] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('INBOX');
  const [loading, setLoading] = useState(false);
  const [summarizingIds, setSummarizingIds] = useState({});
  const [summaries, setSummaries] = useState({});
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const refreshStatus = async () => {
    try {
      const res = await api.getGmailStatus();
      setStatus(res);
      if (res.connected) {
        loadLabels();
        loadEmails('INBOX');
      }
    } catch (err) { console.error(err); }
  };

  const loadLabels = async () => {
    try {
      const res = await api.getGmailLabels();
      const allowed = ['INBOX', 'Calendar', 'Jira', 'Notas de Gemini', 'Trello'];
      setLabels(res.labels.filter(l => allowed.includes(l.name) || l.id === 'INBOX'));
    } catch (err) { console.error(err); }
  };

  const loadEmails = async (labelId) => {
    setLoading(true);
    setSummaries({});
    try {
      const res = await api.getEmails(labelId || selectedLabel);
      setEmails(res.emails);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSummarize = async (email) => {
    setSummarizingIds(prev => ({ ...prev, [email.id]: true }));
    try {
      const content = `Asunto: ${email.subject}\n\n${email.body || email.snippet}`;
      const res = await api.aiSummarize(content, 'corto');
      setSummaries(prev => ({ ...prev, [email.id]: res.result }));
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      alert(errorMsg);
    } finally {
      setSummarizingIds(prev => ({ ...prev, [email.id]: false }));
    }
  };

  useEffect(() => { refreshStatus(); }, []);

  if (!status.connected) {
    return (
      <div className="gmail-panel-empty">
        <Mail size={40} className="dimmed" />
        <button className="primary" onClick={async () => {
          const { url } = await api.getGmailAuthUrl();
          const win = window.open(url, 'auth', 'width=500,height=600');
          const timer = setInterval(() => { if (win.closed) { clearInterval(timer); refreshStatus(); } }, 1000);
        }}> <Mail size={18} /> {language === 'es' ? 'Conectar Gmail' : 'Connect Gmail'} </button>
      </div>
    );
  }

  const truncateWords = (text, count) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    if (words.length <= count) return text;
    return words.slice(0, count).join(' ') + '...';
  };

  return (
    <div className="gmail-panel">
      <div className="gmail-header">
        <div className="gmail-title"><Mail size={20} /> <h3>{language === 'es' ? 'Correos' : 'Emails'}</h3></div>
        <div className="gmail-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="dimmed" style={{ fontSize: '12px', fontWeight: 'bold' }}>{language === 'es' ? 'Ver:' : 'View:'}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select 
                className="select-input"
                style={{ height: '32px', padding: '0 32px 0 12px', borderRadius: '999px', border: '1px solid var(--ko-border)', background: 'var(--ko-bg-card)', color: 'var(--ko-text)', fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                value={selectedLabel} onChange={(e) => { setSelectedLabel(e.target.value); loadEmails(e.target.value); }}
                onFocus={() => setIsSelectOpen(true)} onBlur={() => setIsSelectOpen(false)}
              >
                {labels.map(l => <option key={l.id} value={l.id}>{l.name === 'INBOX' ? (language === 'es' ? 'Recibidos' : 'Inbox') : l.name}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', transform: isSelectOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: '0.2s' }} />
            </div>
          </div>
          <div className="gmail-actions">
            <button className="themeToggle" onClick={() => loadEmails()}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
            <button className="themeToggle" onClick={async () => { if (confirm(language === 'es' ? '¿Desconectar?' : 'Disconnect?')) { await api.disconnectGmail(); setStatus({ connected: false }); } }}><LogOut size={18} /></button>
          </div>
        </div>
      </div>

      <div className="email-list">
        {loading && <div className="loading-state"><Loader2 className="spin" /> <span>Actualizando bandeja...</span></div>}
        {emails.map(email => (
          <div key={email.id} className="email-card">
            <div className="email-meta">
              <span className="email-from">{email.from}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a 
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--ko-text-dim)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '11px' }}
                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--ko-orange)'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--ko-text-dim)'}
                >
                  <ExternalLink size={12} /> Gmail
                </a>
                <span className="email-date">{new Date(email.date).toLocaleDateString()}</span>
              </div>
            </div>
            <h4 className="email-subject">{email.subject}</h4>
            <p className="email-snippet" style={{ fontSize: '13px', color: 'var(--ko-text-dim)', marginBottom: '12px', lineHeight: '1.4' }}>
              {truncateWords(email.body || email.snippet, 50)}
            </p>
            
            <div className="email-ai-actions" style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {!summaries[email.id] ? (
                <button 
                  className="primarySmall" 
                  style={{ height: '28px', padding: '0 14px', fontSize: '12px', background: 'var(--ko-purple)', borderColor: 'var(--ko-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => handleSummarize(email)}
                  disabled={summarizingIds[email.id]}
                >
                  {summarizingIds[email.id] ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                  {language === 'es' ? 'Resumir con IA' : 'Summarize with AI'}
                </button>
              ) : (
                <div className="email-summary" style={{ width: '100%', background: 'rgba(120, 60, 120, 0.08)', borderLeft: '3px solid var(--ko-purple)', padding: '10px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--ko-purple)' }}>IA SUMMARY</span>
                    <button onClick={() => setSummaries(prev => ({ ...prev, [email.id]: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ko-text-dim)', fontSize: '10px' }}>[X]</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.5' }}>{summaries[email.id]}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && emails.length === 0 && (
          <div className="emptyState" style={{ padding: '40px', textAlign: 'center' }}>
            <Mail size={40} className="dimmed" style={{ marginBottom: '12px' }} />
            <p className="dimmed">{language === 'es' ? 'No se encontraron correos.' : 'No emails found.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
