import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, RefreshCw, LogOut, Loader2, Sparkles, ChevronDown, 
  ExternalLink, Archive, CheckCircle, Clock, AlertTriangle, 
  Users, Rocket, Bug, Calendar, Filter, Search, Tag, Inbox
} from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { url } = await api.getGmailAuthUrl();
      if (!url) throw new Error(t.gmail.noAuthUrl || 'Error context');
      const win = window.open(url, 'auth', 'width=500,height=600');
      if (!win) throw new Error('Popup blocked');
      const timer = setInterval(() => { if (win.closed) { clearInterval(timer); refreshStatus(); } }, 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsConnecting(false);
    }
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
    try {
      const res = await api.getEmails(labelId || selectedLabel);
      const emailList = Array.isArray(res.emails) ? res.emails : [];
      setEmails(emailList);
      const cached = {};
      emailList.forEach(e => { if (e && e.id && e.cachedSummary) cached[e.id] = e.cachedSummary; });
      setSummaries(prev => ({ ...prev, ...cached }));
    } catch (err) { 
      console.error(err);
      setEmails([]);
    } finally { setLoading(false); }
  };

  const handleSummarize = async (email) => {
    setSummarizingIds(prev => ({ ...prev, [email.id]: true }));
    try {
      const res = await api.gmailSummarize(email.id, email);
      setSummaries(prev => ({ ...prev, [email.id]: res.summary }));
    } catch (err) { alert(err.message); } 
    finally { setSummarizingIds(prev => ({ ...prev, [email.id]: false })); }
  };

  const handleArchive = async (id) => {
    try {
      await api.archiveEmail(id);
      setEmails(prev => prev.filter(e => e.id !== id));
    } catch (err) { alert(err.message); }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markEmailRead(id);
      setEmails(prev => prev.map(e => e.id === id ? { ...e, isUnread: false } : e));
    } catch (err) { alert(err.message); }
  };

  useEffect(() => { refreshStatus(); }, []);

  const filteredEmails = useMemo(() => {
    if (!Array.isArray(emails)) return [];
    let result = emails;
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(e => 
        e && (
          (e.subject && e.subject.toLowerCase().includes(s)) || 
          (e.from && e.from.toLowerCase().includes(s)) || 
          (e.snippet && e.snippet.toLowerCase().includes(s)) ||
          (e.project && e.project.toLowerCase().includes(s))
        )
      );
    }

    if (activeFilter !== 'all') {
      const filterToCategory = {
        'needsAttention': 'Needs Attention',
        'clientMessages': 'Client Messages',
        'deploys': 'Deploys & Releases',
        'blocker': 'Blocker',
        'followUp': 'Follow-up'
      };
      const target = filterToCategory[activeFilter];
      result = result.filter(e => 
        e && (
          (Array.isArray(e.categories) && e.categories.includes(target)) || 
          (Array.isArray(e.badges) && e.badges.some(b => b.label === target))
        )
      );
    }
    return result;
  }, [emails, searchTerm, activeFilter]);

  const stats = useMemo(() => {
    if (!Array.isArray(emails)) return { unread: 0, blockers: 0, clients: 0, deploys: 0 };
    return {
      unread: emails.filter(e => e && e.isUnread).length,
      blockers: emails.filter(e => e && Array.isArray(e.badges) && e.badges.some(b => b.label === 'Blocker')).length,
      clients: emails.filter(e => e && Array.isArray(e.categories) && e.categories.includes('Client Messages')).length,
      deploys: emails.filter(e => e && Array.isArray(e.categories) && e.categories.includes('Deploys & Releases')).length
    };
  }, [emails]);

  if (!status.connected) {
    return (
      <div className="gmail-panel-empty">
        <Mail size={40} className="dimmed" />
        <button className="primary" onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? <Loader2 size={18} className="spin" /> : <Mail size={18} />}
          {t.gmail.connectGmail || 'Conectar Gmail'}
        </button>
      </div>
    );
  }

  const renderBadge = (badge) => {
    if (!badge) return null;
    const colors = { red: 'rgba(239, 68, 68, 0.1)', yellow: 'rgba(245, 158, 11, 0.1)', green: 'rgba(16, 185, 129, 0.1)', orange: 'rgba(249, 115, 22, 0.1)', blue: 'rgba(59, 130, 246, 0.1)', purple: 'rgba(139, 92, 246, 0.1)' };
    const textColors = { red: '#ef4444', yellow: '#f59e0b', green: '#10b981', orange: '#f97316', blue: '#3b82f6', purple: '#8b5cf6' };
    const textColor = textColors[badge.color] || 'var(--ko-text-dim)';
    const bgColor = colors[badge.color] || 'rgba(0,0,0,0.05)';
    return (
      <span key={badge.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', background: bgColor, color: textColor, border: `1px solid ${textColor}22` }}>
        {badge.icon} {(badge.label || '').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="gmail-panel" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="card-mini" style={{ padding: '12px', borderRadius: '12px', background: 'var(--ko-bg-card)', border: '1px solid var(--ko-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="dimmed" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{t.gmail.unread}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Inbox size={16} className="dimmed" />
            <span style={{ fontSize: '18px', fontWeight: '900' }}>{stats.unread}</span>
          </div>
        </div>
        <div className="card-mini" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#ef4444' }}>{t.gmail.blockers}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444' }}>{stats.blockers}</span>
          </div>
        </div>
        <div className="card-mini" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#f97316' }}>{t.gmail.clients}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: '#f97316' }} />
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#f97316' }}>{stats.clients}</span>
          </div>
        </div>
        <div className="card-mini" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#10b981' }}>{t.gmail.deploys}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Rocket size={16} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>{stats.deploys}</span>
          </div>
        </div>
      </div>

      <div className="gmail-header">
        <div className="gmail-title"><Mail size={20} /> <h3>{t.gmail.opsCenter}</h3></div>
        <div className="gmail-actions">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--ko-text-dim)' }} />
            <input type="text" placeholder={t.gmail.search} style={{ height: '32px', padding: '0 12px 0 32px', borderRadius: '999px', border: '1px solid var(--ko-border)', background: 'var(--ko-bg-card)', color: 'var(--ko-text)', fontSize: '13px', outline: 'none', width: '150px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="themeToggle" onClick={() => loadEmails()} disabled={loading}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
          <button className="themeToggle" onClick={async () => { if (confirm(t.gmail.disconnect + '?')) { await api.disconnectGmail(); setStatus({ connected: false }); } }}><LogOut size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px' }}>
        {Object.entries(t.gmail.filters).map(([key, label]) => (
          <button key={key} onClick={() => setActiveFilter(key)} style={{ whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 'bold', border: '1px solid var(--ko-border)', background: activeFilter === key ? 'var(--ko-orange)' : 'var(--ko-bg-card)', color: activeFilter === key ? '#fff' : 'var(--ko-text-dim)', cursor: 'pointer', transition: '0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      <div className="email-list">
        {loading && <div className="loading-state"><Loader2 className="spin" /> <span>{t.gmail.refresh}...</span></div>}
        {filteredEmails.map(email => (
          <div key={email.id} className="email-card" style={{ padding: '12px', borderLeft: email.isUnread ? '4px solid var(--ko-orange)' : '1px solid var(--ko-border)', background: email.isUnread ? 'rgba(255, 122, 0, 0.02)' : 'var(--ko-bg-card)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="email-meta" style={{ marginBottom: 0, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="email-from" style={{ fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.from.split('<')[0] || email.from}</span>
                {email.project && <span style={{ fontSize: '10px', background: 'var(--ko-discrete)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{email.project.toUpperCase()}</span>}
                <div style={{ display: 'flex', gap: '4px' }}>{email.badges?.map(renderBadge)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="email-date" style={{ fontSize: '11px' }}>{new Date(email.date).toLocaleDateString()}</span>
                <div className="email-quick-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleMarkRead(email.id)} title="Read" style={{ background: 'none', border: 'none', color: 'var(--ko-text-dim)', cursor: 'pointer', padding: '2px' }}><CheckCircle size={14} /></button>
                  <button onClick={() => handleArchive(email.id)} title="Archive" style={{ background: 'none', border: 'none', color: 'var(--ko-text-dim)', cursor: 'pointer', padding: '2px' }}><Archive size={14} /></button>
                  <a href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ko-text-dim)', padding: '2px' }}><ExternalLink size={14} /></a>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <h4 className="email-subject" style={{ fontSize: '14px', fontWeight: email.isUnread ? '700' : '600', margin: '0 0 4px 0' }}>{email.subject}</h4>
                <p className="email-snippet" style={{ fontSize: '12px', margin: 0, opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{email.snippet}</p>
                {email.jiraIds && email.jiraIds.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {email.jiraIds.map(id => <span key={id} style={{ fontSize: '10px', color: 'var(--ko-purple)', fontWeight: 'bold', background: 'rgba(120,60,120,0.1)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(120,60,120,0.2)' }}>#{id}</span>)}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {!summaries[email.id] ? (
                  <button className="secondarySmall" style={{ height: '26px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleSummarize(email)} disabled={summarizingIds[email.id]}>
                    {summarizingIds[email.id] ? <Loader2 size={10} className="spin" /> : <Sparkles size={10} />} {t.gmail.aiButton}
                  </button>
                ) : (
                  <button style={{ background: 'rgba(120, 60, 120, 0.1)', border: '1px solid var(--ko-purple)', color: 'var(--ko-purple)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setSummaries(prev => ({ ...prev, [email.id]: null }))}>{t.gmail.viewSummary}</button>
                )}
              </div>
            </div>
            {summaries[email.id] && (
              <div className="email-summary" style={{ marginTop: '4px', width: '100%', background: 'rgba(120, 60, 120, 0.05)', borderLeft: '3px solid var(--ko-purple)', padding: '8px 12px', borderRadius: '0 4px 4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--ko-purple)', letterSpacing: '0.5px' }}>{t.gmail.aiSummary}</span>
                  <button onClick={() => setSummaries(prev => ({ ...prev, [email.id]: null }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ko-text-dim)', fontSize: '9px' }}>{t.gmail.hide}</button>
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', fontWeight: '500' }}>{summaries[email.id]}</p>
              </div>
            )}
          </div>
        ))}
        {!loading && filteredEmails.length === 0 && (
          <div className="emptyState" style={{ padding: '40px', textAlign: 'center' }}>
            <Mail size={40} className="dimmed" style={{ marginBottom: '12px' }} />
            <p className="dimmed">{t.gmail.noEmails}</p>
          </div>
        )}
      </div>
    </div>
  );
}
