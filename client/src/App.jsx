import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, Bot, CheckCircle2, ClipboardList, KeyRound, ListChecks, Play, RefreshCw, Save, Star, Moon, Sun, Bell, MessageSquare, ArrowRightLeft, PlusCircle, ExternalLink, Send, Search, User, X, Activity, List, ListOrdered, Bold, Image as ImageIcon, Mail, Minus, LogOut, Shield } from 'lucide-react';
import { api } from './api.js';
import { formatMessage, translations } from './i18n.js';
import { GmailPanel } from './GmailPanel.jsx';
import { Login } from './Login.jsx';
import { UserManagementPanel } from './UserManagementPanel.jsx';
import { ProfilePanel } from './ProfilePanel.jsx';

const emptySettings = {
  trelloApiKey: '',
  trelloToken: '',
  jiraBaseUrl: '',
  jiraEmail: '',
  jiraApiToken: '',
  geminiApiKey: ''
};

const defaultAutomationDraft = {
  trelloListId: '',
  jiraProjectKey: '',
  jiraIssueType: 'Story',
  refineAI: false
};

function automationToDraft(automation) {
  if (!automation) return {};
  return {
    trelloListId: automation.trelloListId || '',
    jiraProjectKey: automation.jiraProjectKey || '',
    jiraIssueType: automation.jiraIssueType || 'Story',
    refineAI: automation.refineAI || false
  };
}

function mergeAutomationDrafts(current, boards) {
  return boards.reduce((drafts, board) => {
    drafts[board.id] = {
      ...defaultAutomationDraft,
      ...current[board.id],
      ...automationToDraft(board.automation)
    };
    return drafts;
  }, { ...current });
}

export function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'es');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activePage, setActivePage] = useState('boards');
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(emptySettings);
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [jiraProjects, setJiraProjects] = useState([]);
  const [automationDrafts, setAutomationDrafts] = useState({});
  const [automationReports, setAutomationReports] = useState({});
  const [showReportBoardId, setShowReportBoardId] = useState(null);
  const [activeJiraIssueModal, setActiveJiraIssueModal] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [pendingRefineAI, setPendingRefineAI] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [jiraAlerts, setJiraAlerts] = useState([]);
  const [jiraDashboard, setJiraDashboard] = useState({
    needsReview: [],
    readyDeploy: [],
    blocked: [],
    forgotten: [],
    commentRadar: [],
    recentActivity: []
  });
  const [jiraStats, setJiraStats] = useState({
    reviewCount: 0,
    deployCount: 0,
    blockedCount: 0,
    forgottenCount: 0
  });
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const t = translations[language];

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = t.locale;
  }, [language, t.locale]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  useEffect(() => {
    if (token) {
      refreshStatus();
    }
  }, [token]);

  async function handleLogin(email, password) {
    const result = await run('login', () => api.login(email, password));
    if (result?.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.reload();
  }

  async function loadAlerts() {
    const result = await run('alerts', () => api.getAlerts());
    if (result) setAlerts(result.alerts);
  }

  async function loadJiraAlerts() {
    const result = await run('jiraAlerts', () => api.jiraAlerts());
    if (result) {
      setJiraAlerts(result.alerts || []);
      setJiraDashboard(result.dashboard || {});
      setJiraStats(result.stats || {});
    }
  }

  async function markJiraAlertAsRead(id) {
    await api.markJiraAlertAsRead(id);
    setJiraAlerts(current => current.filter(a => a.id !== id));
  }

  async function replyToAlert(cardId, text, attachment) {
    const result = await run(`reply:${cardId}`, () => api.replyToAlert({ cardId, text, attachment }));
    if (result) {
      await loadAlerts();
    }
  }

  async function loadPendingCards() {
    const result = await run('pendingCards', () => api.pendingCards());
    if (result) setCards(result.cards);
  }

  useEffect(() => {
    if (!token) return;
    if (activePage === 'alerts') {
      loadAlerts();
    }
    if (activePage === 'jiraAlerts') {
      loadJiraAlerts();
    }
    if (activePage === 'sync') {
      loadPendingCards();
    }
  }, [activePage, token]);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId),
    [boards, selectedBoardId]
  );

  async function run(label, action, successMessage) {
    setLoading(label);
    setError('');
    try {
      const result = await action();
      return result;
    } catch (caught) {
      const msg = caught.response?.data?.message || caught.message;
      setError(msg);
      return null;
    } finally {
      setLoading('');
    }
  }

  async function refreshStatus() {
    try {
      const nextStatus = await api.credentialStatus();
      if (nextStatus) {
        setStatus(nextStatus);
        if (nextStatus.trelloConfigured && boards.length === 0) {
          loadBoards();
        }
      }
    } catch (e) {
      console.error('Failed to fetch status', e);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(settings).filter(([, value]) => value.trim() !== '')
    );
    await run(
      'settings',
      async () => {
        await api.saveSettings(payload);
        await refreshStatus();
        setSettings(emptySettings);
      },
      t.messages.credentialsSaved
    );
  }

  async function loadBoards() {
    const result = await run('boards', () => api.boards(), t.messages.boardsLoaded);
    if (result) {
      setBoards(result.boards);
      setAutomationDrafts((current) => mergeAutomationDrafts(current, result.boards));
      setActivePage('boards');
    }
  }

  async function validateTrello() {
    const result = await run('validateTrello', () => api.validateTrello());
    if (result?.member) {
      addLog(
        'success',
        formatMessage(t.messages.trelloValidated, {
          name: result.member.fullName || result.member.username
        })
      );
    }
  }

  async function loadJiraProjects() {
    const result = await run('jiraProjects', () => api.jiraProjects(), t.messages.jiraProjectsLoaded);
    if (result) setJiraProjects(result.projects);
  }

  async function selectBoard(boardId) {
    setSelectedBoardId(boardId);
    setSelectedListId('');
    setCards([]);
    const result = await run('lists', () => api.lists(boardId), t.messages.listsLoaded);
    if (result) setLists(result.lists);
  }

  async function loadCards(listId = selectedListId) {
    if (!selectedBoardId) return;
    const result = await run('cards', () => api.cards(selectedBoardId, listId), t.messages.cardsLoaded);
    if (result) {
      setCards(result.cards);
      setActivePage('sync');
    }
  }

  async function previewSync() {
    if (!selectedBoardId) return;
    const result = await run(
      'preview',
      () =>
        api.syncPreview({
          boardId: selectedBoardId,
          listId: selectedListId || undefined
        }),
      t.messages.previewReady
    );
    if (result) setCards(result.cards);
  }

  function updateAutomationDraft(boardId, patch) {
    setAutomationDrafts((current) => ({
      ...current,
      [boardId]: {
        ...defaultAutomationDraft,
        ...current[boardId],
        ...patch
      }
    }));
  }

  async function saveBoardAutomation(board) {
    const draft = automationDrafts[board.id] || defaultAutomationDraft;
    const selectedList = lists.find((list) => list.id === draft.trelloListId);
    const result = await run(
      `saveAutomation:${board.id}`,
      () =>
        api.saveAutomation({
          trelloBoardId: board.id,
          trelloBoardName: board.name,
          trelloListId: draft.trelloListId,
          trelloListName: selectedList?.name || '',
          jiraProjectKey: draft.jiraProjectKey,
          jiraIssueType: draft.jiraIssueType,
          refineAI: draft.refineAI,
          favorite: board.automation?.favorite || false,
          enabled: true
        }),
      formatMessage(t.messages.automationSaved, { board: board.name })
    );

    if (result) {
      setBoards((current) =>
        current.map((item) => (item.id === board.id ? { ...item, automation: result.automation } : item))
      );
      updateAutomationDraft(board.id, automationToDraft(result.automation));
    }
  }

  async function runBoardAutomation(board) {
    const result = await run(
      `runAutomation:${board.id}`,
      () => api.runBoardAutomation(board.id),
      formatMessage(t.messages.automationFinished, { board: board.name })
    );

    if (result?.result) {
      const summary = result.result;
      setAutomationReports((current) => ({
        ...current,
        [board.id]: summary
      }));
      setShowReportBoardId(board.id);
      addLog(
        summary.errors.length ? 'error' : 'success',
        formatMessage(t.messages.automationSummary, {
          board: board.name,
          created: summary.created.length,
          repaired: (summary.repaired || []).length,
          skipped: summary.skipped.length,
          errors: summary.errors.length
        })
      );
      await loadBoards();
    }
  }

  async function syncSingleCard(cardId, boardId) {
    const result = await run(
      `syncCard:${cardId}`,
      () => api.syncCard({ cardId, boardId, refineAI: pendingRefineAI }),
      language === 'es' ? 'Tarea enviada a Jira con éxito.' : 'Task sent to Jira successfully.'
    );
    if (result) {
      // Remove card from pending list
      setCards(current => current.filter(c => (c.id || c.trelloCardId) !== cardId));
    }
  }

  async function toggleBoardFavorite(board) {
    const isFavorite = !board.automation?.favorite;
    const result = await api.saveAutomation({
      trelloBoardId: board.id,
      trelloBoardName: board.name,
      favorite: isFavorite
    });

    if (result) {
      setBoards((current) =>
        current.map((item) => (item.id === board.id ? { ...item, automation: result.automation } : item))
      );
    }
  }

  function credentialFieldStatus(field) {
    const currentValue = settings[field] || '';
    if (currentValue.trim()) {
      return {
        state: 'pending',
        label: language === 'es' ? 'Sin guardar' : 'Unsaved'
      };
    }

    const diagnostics = status?.diagnostics || {};
    const configured = {
      trelloApiKey: (diagnostics.trelloApiKey?.length || 0) > 0,
      trelloToken: (diagnostics.trelloTokenLength || 0) > 0,
      jiraBaseUrl: Boolean(status?.jiraBaseUrl),
      jiraEmail: Boolean(diagnostics.jiraEmail),
      jiraApiToken: (diagnostics.jiraApiTokenLength || 0) > 0,
      geminiApiKey: Boolean(status?.geminiConfigured || (diagnostics.geminiApiKey?.length || 0) > 0)
    }[field];

    return {
      state: configured ? 'ready' : 'missing',
      label: configured
        ? (language === 'es' ? 'Cargado' : 'Loaded')
        : (language === 'es' ? 'No cargado' : 'Not loaded')
    };
  }

  if (!token) {
    return <Login onLogin={handleLogin} loading={loading === 'login'} error={error} />;
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark" style={{ overflow: 'hidden' }}>
            <img 
              src="/favicon.png" 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} 
            />
          </div>
          <div>
            <h1>PO Assistant</h1>
            <p>{t.appSubtitle}</p>
          </div>
        </div>

        <nav className="nav">
          <button className={activePage === 'boards' ? 'active' : ''} onClick={() => setActivePage('boards')}>
            <ClipboardList size={18} /> {t.nav.boards}
          </button>
          <button className={activePage === 'sync' ? 'active' : ''} onClick={() => setActivePage('sync')}>
            <List size={18} /> {t.nav.sync}
          </button>
          <button className={activePage === 'alerts' ? 'active' : ''} onClick={() => setActivePage('alerts')}>
            <Bell size={18} /> {t.nav.alerts}
          </button>
          <button className={activePage === 'jiraAlerts' ? 'active' : ''} onClick={() => setActivePage('jiraAlerts')}>
            <Activity size={18} /> {t.nav.jiraAlerts}
          </button>
          <button className={activePage === 'mail' ? 'active' : ''} onClick={() => setActivePage('mail')}>
            <Mail size={18} /> {language === 'es' ? 'Correos' : 'Mail'}
          </button>
          <button className={activePage === 'settings' ? 'active' : ''} onClick={() => setActivePage('settings')}>
            <KeyRound size={18} /> {t.nav.settings}
          </button>
          {user?.role === 'admin' && (
            <button className={activePage === 'users' ? 'active' : ''} onClick={() => setActivePage('users')}>
              <Shield size={18} /> {language === 'es' ? 'Usuarios' : 'Users'}
            </button>
          )}
        </nav>

        <div className="sidebarFooter">
          <div className="sidebarProfile">
            <strong>{user?.fullName}</strong>
            <span>{user?.email}</span>
          </div>

          <div className="languageControl" aria-label={t.language.label}>
            <span>{t.language.label}</span>
            <button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')}>
              {t.language.es}
            </button>
            <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
              {t.language.en}
            </button>
          </div>
          
          <button 
            className={`profileButton ${activePage === 'profile' ? 'active' : ''}`} 
            onClick={() => setActivePage('profile')}
          >
            <User size={18} />
            <span>{language === 'es' ? 'Mi Perfil' : 'My Profile'}</span>
          </button>

          <button className="logoutButton" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t.eyebrow} / {t.nav[activePage] || activePage}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2>{t.nav[activePage] || activePage}</h2>
            </div>
          </div>
          <div className="topbarControls">
            <button 
              className="themeToggle" 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={language === 'es' ? 'Cambiar tema' : 'Toggle theme'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        {error && <div className="errorBanner">{error}</div>}

        {activePage === 'profile' && (
          <ProfilePanel user={user} language={language} />
        )}

        {activePage === 'settings' && (
          <section className="panel">
            <form className="settingsGrid" onSubmit={saveSettings}>
              <Field label={t.settings.trelloApiKey} status={credentialFieldStatus('trelloApiKey')} type="password" value={settings.trelloApiKey} onChange={(trelloApiKey) => setSettings({ ...settings, trelloApiKey })} />
              <Field label={t.settings.trelloToken} status={credentialFieldStatus('trelloToken')} type="password" value={settings.trelloToken} onChange={(trelloToken) => setSettings({ ...settings, trelloToken })} />
              <Field label={t.settings.jiraBaseUrl} status={credentialFieldStatus('jiraBaseUrl')} placeholder="https://your-domain.atlassian.net" value={settings.jiraBaseUrl} onChange={(jiraBaseUrl) => setSettings({ ...settings, jiraBaseUrl })} />
              <Field label={t.settings.jiraEmail} status={credentialFieldStatus('jiraEmail')} value={settings.jiraEmail} onChange={(jiraEmail) => setSettings({ ...settings, jiraEmail })} />
              <Field label={t.settings.jiraApiToken} status={credentialFieldStatus('jiraApiToken')} type="password" value={settings.jiraApiToken} onChange={(jiraApiToken) => setSettings({ ...settings, jiraApiToken })} />
              <Field label={t.settings.geminiApiKey} status={credentialFieldStatus('geminiApiKey')} type="password" value={settings.geminiApiKey} onChange={(geminiApiKey) => setSettings({ ...settings, geminiApiKey })} />
              <div className="actions">
                <button className="primary" disabled={loading === 'settings'}>
                  <CheckCircle2 size={18} /> {t.settings.save}
                </button>
                <button type="button" className="secondary" onClick={loadBoards} disabled={!status?.trelloConfigured || loading === 'boards'}>
                  <RefreshCw size={18} /> {t.settings.loadBoards}
                </button>
                <button type="button" className="secondary" onClick={validateTrello} disabled={!status?.trelloConfigured || loading === 'validateTrello'}>
                  <CheckCircle2 size={18} /> {t.settings.validateTrello}
                </button>
              </div>
            </form>
          </section>
        )}

        {activePage === 'users' && user?.role === 'admin' && (
          <UserManagementPanel language={language} t={t} />
        )}

        {activePage === 'boards' && (
          <section className="workspace">
            <div className="toolbar">
              <button className="primary" onClick={loadBoards} disabled={loading === 'boards'}>
                <RefreshCw size={18} /> {t.boards.refresh}
              </button>
              <button className="secondary" onClick={loadJiraProjects} disabled={!status?.jiraConfigured || loading === 'jiraProjects'}>
                <Bot size={18} /> {t.boards.loadJira}
              </button>
              {selectedBoard && <span>{selectedBoard.name}</span>}
            </div>

            {/* Favoritos */}
            {boards.some(b => b.automation?.favorite) && (
              <div className="boardGroup">
                <h3><Star size={18} fill="currentColor" /> {language === 'es' ? 'Favoritos' : 'Favorites'}</h3>
                <div className="boardGrid">
                  {boards.filter(b => b.automation?.favorite).map(board => (
                    <BoardCard 
                      key={board.id} 
                      board={board} 
                      t={t} 
                      selectedBoardId={selectedBoardId}
                      loading={loading}
                      jiraProjects={jiraProjects}
                      automationDrafts={automationDrafts}
                      automationReports={automationReports}
                      onSelect={() => selectBoard(board.id)}
                      onToggleFavorite={() => toggleBoardFavorite(board)}
                      onUpdateDraft={(patch) => updateAutomationDraft(board.id, patch)}
                      onSave={() => saveBoardAutomation(board)}
                      onRun={() => runBoardAutomation(board)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resto de tableros */}
            <div className="boardGroup">
              <h3><ClipboardList size={18} /> {language === 'es' ? 'Todos los tableros' : 'All boards'}</h3>
              <div className="boardGrid">
                {boards.filter(b => !b.automation?.favorite).map(board => (
                  <BoardCard 
                    key={board.id} 
                    board={board} 
                    t={t} 
                    selectedBoardId={selectedBoardId}
                    loading={loading}
                    jiraProjects={jiraProjects}
                    automationDrafts={automationDrafts}
                    automationReports={automationReports}
                    onSelect={() => selectBoard(board.id)}
                    onToggleFavorite={() => toggleBoardFavorite(board)}
                    onUpdateDraft={(patch) => updateAutomationDraft(board.id, patch)}
                    onSave={() => saveBoardAutomation(board)}
                    onRun={() => runBoardAutomation(board)}
                  />
                ))}
              </div>
            </div>

            <datalist id="jiraProjects">
              {jiraProjects.map((project) => (
                <option key={project.id} value={project.key}>
                  {project.name}
                </option>
              ))}
            </datalist>
          </section>
        )}

        {activePage === 'sync' && (
          <section className="workspace">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>{t.sync.title}</h3>
                <p className="dimmed" style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{t.sync.subtitle}</p>
              </div>
              <button className="primary" onClick={loadPendingCards} disabled={loading === 'pendingCards'}>
                <RefreshCw size={18} className={loading === 'pendingCards' ? 'spin' : ''} /> {t.sync.fetchCards}
              </button>
            </div>
            <label className="toggle pendingAiToggle">
              <input
                type="checkbox"
                checked={pendingRefineAI}
                onChange={(event) => setPendingRefineAI(event.target.checked)}
              />
              {t.sync.refineAI}
            </label>
            
            <div className="cardTable">
              <div className="tableHeader">
                <span>{t.sync.card}</span>
                <span>{t.sync.board}</span>
                <span>{t.sync.labels}</span>
                <span>{t.sync.due}</span>
                <span>Acción</span>
              </div>
              {cards.map((card) => {
                const cardId = card.id || card.trelloCardId;
                const isSyncing = loading === `syncCard:${cardId}`;
                return (
                  <div className="tableRow" key={cardId}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{card.summary || card.title}</strong>
                      <a 
                        href={card.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="trelloLink"
                        style={{ 
                          fontSize: '11px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          color: 'var(--ko-text-dim)',
                          textDecoration: 'none',
                          transition: 'color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--ko-orange)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--ko-text-dim)'}
                      >
                        <ExternalLink size={10} /> Trello
                      </a>
                    </div>
                    <span className="boardTag">{card.boardName}</span>
                    <span>{(card.labels || []).map((label) => label.name || label).join(', ') || t.sync.noLabels}</span>
                    <span>{card.due ? new Date(card.due).toLocaleDateString(t.locale) : t.sync.noDueDate}</span>
                    <button 
                      className="primarySmall" 
                      onClick={() => syncSingleCard(cardId, card.boardId)}
                      disabled={isSyncing}
                      style={{ width: '100%' }}
                    >
                      {isSyncing ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                      {isSyncing ? t.sync.sendingToJira : t.sync.sendToJira}
                    </button>
                  </div>
                );
              })}
              {cards.length === 0 && !loading && (
                <div className="emptyState" style={{ gridColumn: '1 / span 5', padding: '40px' }}>
                  <CheckCircle2 size={48} color="var(--ko-orange)" />
                  <p>{t.sync.empty}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === 'alerts' && (
          <AlertsPage 
            alerts={alerts} 
            boards={boards} 
            loading={loading} 
            t={t} 
            onRefresh={loadAlerts} 
            onReply={replyToAlert} 
          />
        )}

        {activePage === 'jiraAlerts' && (
          <JiraAlertsPage 
            alerts={jiraAlerts} 
            dashboard={jiraDashboard}
            stats={jiraStats}
            loading={loading} 
            t={t} 
            language={language}
            onRefresh={loadJiraAlerts} 
            onMarkAsRead={markJiraAlertAsRead}
            onOpenComment={(issue, mode) => setActiveJiraIssueModal({ issue, mode })}
          />
        )}

        {activePage === 'mail' && (
          <section className="workspace">
            <GmailPanel language={language} t={t} />
          </section>
        )}
      </main>

      {showReportBoardId && (
        <div className="modalOverlay" onClick={() => setShowReportBoardId(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>{language === 'es' ? 'Resultado de Automatización' : 'Automation Result'}</h2>
              <button className="closeButton" onClick={() => setShowReportBoardId(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modalBody">
              <AutomationReport 
                report={automationReports[showReportBoardId]} 
                t={t} 
              />
            </div>
            <div className="modalFooter">
              <button className="primarySmall" onClick={() => setShowReportBoardId(null)}>
                {language === 'es' ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeJiraIssueModal && (
        <JiraCommentReplyModal
          issue={activeJiraIssueModal.issue}
          mode={activeJiraIssueModal.mode}
          language={language}
          t={t}
          onClose={() => setActiveJiraIssueModal(null)}
          onRefresh={loadJiraAlerts}
        />
      )}
      <PositoChat />
    </div>
  );
}

function PositoChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hola, soy POsito. ¿Sobre qué querés consultar hoy?'
    }
  ]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  useEffect(() => {
    api.assistantQuestions()
      .then((result) => {
        const cats = result.categories || [];
        const qs = result.questions || [];
        setAllQuestions(qs);
        setCategories(cats);
        
        // Populate initial message with categories
        setMessages(current => {
          if (current.length === 1 && current[0].role === 'assistant' && !current[0].suggestions) {
            return [{
              ...current[0],
              suggestions: cats.map(c => ({ ...c, type: 'category' }))
            }];
          }
          return current;
        });
      })
      .catch(console.error);
  }, []);

  async function handleSelect(item) {
    if (item.type === 'category') {
      const filtered = allQuestions.filter(q => q.categoryId === item.id);
      setMessages(current => [
        ...current,
        { role: 'user', text: item.text },
        {
          role: 'assistant',
          text: `Preguntas sobre ${item.text}:`,
          suggestions: [
            ...filtered.map(q => ({ ...q, type: 'question' })),
            { id: 'back', text: '⬅️ Volver a temas principales', type: 'back' }
          ]
        }
      ]);
    } else if (item.type === 'back') {
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          text: '¿Sobre qué otro tema querés consultar?',
          suggestions: categories.map(c => ({ ...c, type: 'category' }))
        }
      ]);
    } else {
      ask(item);
    }
  }

  async function ask(question) {
    const text = question?.text || draft.trim();
    if (!text || isThinking) return;

    if (!question) {
      setMessages(current => [...current, { role: 'user', text }]);
    }
    
    setDraft('');
    setIsThinking(true);

    try {
      const result = await api.assistantQuery({
        questionId: question?.id,
        text
      });
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          text: result.answer,
          details: result.details || [],
          suggestions: (result.suggestions || []).length > 0 
            ? result.suggestions.map(s => ({ ...s, type: 'question' }))
            : [{ id: 'back-auto', text: '⬅️ Ver otros temas', type: 'back' }]
        }
      ]);
    } catch (error) {
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          text: error.message || 'POsito no pudo responder esa consulta.',
          suggestions: [{ id: 'back-err', text: '⬅️ Volver al inicio', type: 'back' }]
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    ask();
  }

  return (
    <div className={`positoWidget ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <section className="positoPanel" aria-label="POsito">
          <header className="positoHeader">
            <div>
              <strong>POsito</strong>
              <span>Asistente de estado</span>
            </div>
            <div className="positoHeaderActions">
              <button className="positoActionBtn" onClick={() => setIsOpen(false)} aria-label="Minimizar POsito">
                <Minus size={18} />
              </button>
              <button className="positoActionBtn" onClick={() => setIsOpen(false)} aria-label="Cerrar POsito">
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="positoMessages">
            {messages.map((message, index) => (
              <div key={index} className={`positoMessage ${message.role}`}>
                <p>{message.text}</p>
                {message.details?.length > 0 && (
                  <ul>
                    {message.details.map((detail, detailIndex) => (
                      <li key={detailIndex}>{detail}</li>
                    ))}
                  </ul>
                )}
                {message.suggestions?.length > 0 && (
                  <div className="positoSuggestionsInChat">
                    {message.suggestions.map((suggestion, sIdx) => (
                      <button key={`${suggestion.id}-${sIdx}`} type="button" onClick={() => handleSelect(suggestion)}>
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="positoMessage assistant">
                <p>Consultando datos...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="positoInput" onSubmit={handleSubmit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Preguntale a POsito..."
            />
            <button type="submit" disabled={!draft.trim() || isThinking} aria-label="Enviar pregunta">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button className="positoLauncher" onClick={() => setIsOpen(current => !current)}>
        <Bot size={22} />
        <span>POsito</span>
      </button>
    </div>
  );
}

function AlertsPage({ alerts, boards, loading, t, onRefresh, onReply }) {
  const favoriteBoards = boards.filter(b => b.automation?.favorite);
  const [filterBoardId, setFilterBoardId] = useState('all');

  const filteredAlerts = useMemo(() => {
    if (filterBoardId === 'all') return alerts;
    return alerts.filter(alert => alert.boardId === filterBoardId);
  }, [alerts, filterBoardId]);

  return (
    <section className="workspace alertsWorkspace">
      <div className="alertsLayout">
        <aside className="alertsConfig">
          <h3>{t.alerts.monitoredBoards}</h3>
          <p className="compactFieldLabel">{favoriteBoards.length > 0 ? t.alerts.monitoredCount : t.alerts.noFavorites}</p>
          <div className="monitoredList">
            <button 
              className={filterBoardId === 'all' ? 'boardFilterItem active' : 'boardFilterItem'}
              onClick={() => setFilterBoardId('all')}
            >
              <span>{t.language.es === 'ES' ? 'Todos' : 'All'}</span>
            </button>
            {favoriteBoards.map(board => (
              <button 
                key={board.id} 
                className={filterBoardId === board.id ? 'boardFilterItem active' : 'boardFilterItem'}
                onClick={() => setFilterBoardId(board.id)}
              >
                <Star size={14} fill={filterBoardId === board.id ? 'currentColor' : 'none'} className="starIcon" />
                <span>{board.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="alertsFeed">
          <div className="toolbar">
            <button className="primary" onClick={onRefresh} disabled={loading === 'alerts'}>
              <RefreshCw size={18} className={loading === 'alerts' ? 'spin' : ''} /> {t.alerts.refresh}
            </button>
          </div>

          {favoriteBoards.length === 0 ? (
            <div className="emptyState">
              <Star size={48} />
              <p>{t.alerts.noFavorites}</p>
            </div>
          ) : (
            <div className="alertList">
              {filteredAlerts.length === 0 ? (
                <p className="empty">{t.alerts.noAlerts}</p>
              ) : (
                filteredAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} t={t} loading={loading} onReply={onReply} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AlertCard({ alert, t, loading, onReply, language }) {
  const [isReplying, setIsReplying] = useState(false);
  
  // Mention state
  const [members, setMembers] = useState([]);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const editorRef = useRef(null);

  useEffect(() => {
    if (isReplying && alert.type === 'comment' && alert.username) {
      // Small timeout to ensure editorRef is mounted
      setTimeout(() => {
        if (editorRef.current && editorRef.current.innerHTML === '') {
          editorRef.current.innerHTML = `<strong style="color: var(--ko-orange);" contenteditable="false">@${alert.username}</strong>&nbsp;`;
          
          // Place cursor at the end
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          editorRef.current.focus();
        }
      }, 50);
    }
  }, [isReplying, alert.username, alert.type]);

  useEffect(() => {
    if (isReplying && alert.boardId) {
      api.boardMembers(alert.boardId).then(res => {
        if (res?.members) setMembers(res.members);
      }).catch(console.error);
    }
  }, [isReplying, alert.boardId]);

  const filteredMembers = useMemo(() => {
    if (mentionSearch === null) return [];
    const q = mentionSearch.query.toLowerCase();
    return members.filter(m => 
      m.username.toLowerCase().includes(q) || 
      m.fullName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [members, mentionSearch]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = (e) => {
    const text = e.target.innerText;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const lastAtMatch = textBeforeCursor.match(/@(\w*)$/);

    if (lastAtMatch) {
      setMentionSearch({
        query: lastAtMatch[1],
        startIndex: lastAtMatch.index,
        node: range.startContainer,
        offset: range.startOffset
      });
      setActiveMemberIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const selectMember = (member) => {
    if (!mentionSearch) return;
    const { node, offset, query } = mentionSearch;
    const content = node.textContent;
    const before = content.substring(0, offset - query.length - 1);
    const after = content.substring(offset);
    
    node.textContent = before;
    const mentionNode = document.createElement('strong');
    mentionNode.style.color = 'var(--ko-orange)';
    mentionNode.textContent = `@${member.username}`;
    mentionNode.contentEditable = 'false';
    
    const spaceNode = document.createTextNode(' ');
    
    if (node.nextSibling) {
      node.parentNode.insertBefore(mentionNode, node.nextSibling);
      node.parentNode.insertBefore(spaceNode, mentionNode.nextSibling);
    } else {
      node.parentNode.appendChild(mentionNode);
      node.parentNode.appendChild(spaceNode);
    }

    const range = document.createRange();
    range.setStartAfter(spaceNode);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    setMentionSearch(null);
    editorRef.current?.focus();
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const res = await api.uploadTrelloImage(alert.cardId, event.target.result);
            if (res?.url) {
              const img = document.createElement('img');
              img.src = res.url;
              img.style.maxWidth = '100%';
              img.style.borderRadius = '8px';
              img.style.display = 'block';
              img.style.margin = '10px 0';
              
              const range = window.getSelection().getRangeAt(0);
              range.insertNode(img);
              range.collapse(false);
            }
          } catch (err) {
            console.error('Failed to upload image', err);
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const htmlToMarkdown = (html) => {
    let md = html
      .replace(/<b>(.*?)<\/b>|<strong>(.*?)<\/strong>/g, '**$1$2**')
      .replace(/<i>(.*?)<\/i>|<em>(.*?)<\/em>/g, '*$1$2*')
      .replace(/<div><br><\/div>/g, '\n')
      .replace(/<div>(.*?)<\/div>/g, '\n$1')
      .replace(/<br>/g, '\n')
      .replace(/<img.*?src="(.*?)".*?>/g, '\n\n![]($1)\n\n')
      .replace(/<ul>(.*?)<\/ul>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '\n- $1'))
      .replace(/<ol>(.*?)<\/ol>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '\n1. $1'))
      .replace(/<[^>]*>/g, ''); // Limpiar cualquier otro tag
    return md.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const markdown = htmlToMarkdown(editorRef.current.innerHTML);
    if (!markdown) return;
    await onReply(alert.cardId, markdown);
    editorRef.current.innerHTML = '';
    setIsReplying(false);
  };

  const markdownToHtml = (text) => {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" alt="image" style="max-width:100%; border-radius:8px; margin:8px 0; display:block;" />')
      .replace(/\[(.*?)\]\((https?:\/\/.*?)(?:\s+".*?")?\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--ko-orange); font-weight: 700; text-decoration: underline;">$1</a>')
      .replace(/\n- (.*?)(?=\n|$)/g, '<li>$1</li>')
      .replace(/\n\d+\. (.*?)(?=\n|$)/g, '<li>$1</li>')
      .replace(/\n/g, '<br />');
    
    if (html.includes('<li>')) {
      html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    }
    return html;
  };

  const icons = {
    comment: <MessageSquare size={18} />,
    move: <ArrowRightLeft size={18} />,
    creation: <PlusCircle size={18} />
  };

  return (
    <article className={`alertItem ${alert.type}`}>
      <div className="alertHeader">
        <div className={`alertIcon type-${alert.type}`}>
          {icons[alert.type]}
        </div>
        <div className="alertMeta">
          <strong>{alert.user}</strong>
          <span className="dot">·</span>
          <span className="boardTag">{alert.boardName}</span>
          <span className="dot">·</span>
          <time>{new Date(alert.date).toLocaleTimeString('es-AR', { hour12: false })}</time>
        </div>
      </div>

      <div className="alertContent">
        {alert.type === 'comment' && (
          <>
            <p className="alertAction">
              {t.alerts.messages.commented} <strong>{alert.cardName}</strong>
            </p>
            <blockquote 
              className="commentText" 
              dangerouslySetInnerHTML={{ __html: markdownToHtml(alert.text) }}
            />
            {!isReplying ? (
              <button className="iconTextButton replyToggle" onClick={() => setIsReplying(true)}>
                {t.alerts.replyButton}
              </button>
            ) : (
              <form className="replyForm" onSubmit={handleSubmit}>
                <div className="editorToolbar">
                  <button type="button" onClick={() => execCommand('bold')} title="Negrita"><Bold size={16} /></button>
                  <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullets"><List size={16} /></button>
                  <button type="button" onClick={() => execCommand('insertOrderedList')} title="Lista numerada"><ListOrdered size={16} /></button>
                </div>
                <div className="mentionWrapper">
                  <div 
                    ref={editorRef}
                    contentEditable
                    className="richEditor"
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (mentionSearch && filteredMembers.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveMemberIndex(i => (i + 1) % filteredMembers.length);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveMemberIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          selectMember(filteredMembers[activeMemberIndex]);
                        } else if (e.key === 'Escape') {
                          setMentionSearch(null);
                        }
                      }
                    }}
                  />
                  {mentionSearch && filteredMembers.length > 0 && (
                    <div className="mentionDropdown">
                      {filteredMembers.map((member, index) => (
                        <button
                          key={member.id}
                          type="button"
                          className={index === activeMemberIndex ? 'mentionItem active' : 'mentionItem'}
                          onClick={() => selectMember(member)}
                        >
                          <User size={14} />
                          <div className="memberInfo">
                            <strong>{member.fullName}</strong>
                            <small>@{member.username}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="replyActions">
                  <button type="button" className="ghost" onClick={() => setIsReplying(false)}>
                    {t.language.es === 'ES' ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button type="submit" className="primarySmall" disabled={loading === `reply:${alert.cardId}`}>
                    {t.alerts.replyButton}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {alert.type === 'move' && (
          <p className="alertAction">
            <strong>{alert.cardName}</strong> {formatMessage(t.alerts.messages.moved, { from: alert.fromList, to: alert.toList })}
          </p>
        )}

        {alert.type === 'creation' && (
          <p className="alertAction">
            <strong>{alert.cardName}</strong> {formatMessage(t.alerts.messages.created, { list: alert.listName })}
          </p>
        )}

        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href={alert.cardUrl} target="_blank" rel="noopener noreferrer" className="alertLink">
            <ExternalLink size={14} /> Trello
          </a>
        </div>
      </div>
    </article>
  );
}

function BoardCard({ 
  board, t, selectedBoardId, loading, jiraProjects, 
  automationDrafts, automationReports, onSelect, 
  onToggleFavorite, onUpdateDraft, onSave, onRun 
}) {
  const draft = automationDrafts[board.id] || defaultAutomationDraft;
  const automationReady = Boolean(board.automation?.jiraProjectKey);
  const isFavorite = Boolean(board.automation?.favorite);

  return (
    <article className={`boardCard ${selectedBoardId === board.id ? 'selected' : ''}`}>
      <div className="boardHeader">
        <button className="boardSelect" onClick={onSelect}>
          <span>{board.name}</span>
          <small>{board.url}</small>
        </button>
        <button 
          className={`favoriteButton ${isFavorite ? 'active' : ''}`} 
          onClick={onToggleFavorite}
          title={t.boards.save}
        >
          <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="automationBox">
        <div className="automationTitle">
          <Bot size={16} />
          <strong>{automationReady ? `${t.boards.syncsTo} ${board.automation.jiraProjectKey}` : t.boards.noAutomation}</strong>
        </div>
        <p className="automationRule">{t.boards.syncRule}</p>

        <div className="automationGrid">
          <label className="compactField">
            <span>{t.boards.jiraProject}</span>
            <input
              list="jiraProjects"
              placeholder="PROJ"
              value={draft.jiraProjectKey}
              onChange={(event) => onUpdateDraft({ jiraProjectKey: event.target.value })}
            />
          </label>
          <label className="compactField">
            <span>{t.boards.issueType}</span>
            <select
              value={draft.jiraIssueType}
              onChange={(event) => onUpdateDraft({ jiraIssueType: event.target.value })}
            >
              <option value="Story">{t.boards.issueTypes.Story}</option>
              <option value="Task">{t.boards.issueTypes.Task}</option>
              <option value="Bug">{t.boards.issueTypes.Bug}</option>
            </select>
          </label>
        </div>

        <div className="automationFooter">
          <label className="toggle" style={{ fontSize: '13px' }}>
            <input 
              type="checkbox" 
              checked={draft.refineAI} 
              onChange={(e) => onUpdateDraft({ refineAI: e.target.checked })} 
            />
            {t.boards.refineAI}
          </label>
          <div className="footerButtons">
            <button
              className="iconTextButton"
              onClick={onSave}
              disabled={!draft.jiraProjectKey || loading === `saveAutomation:${board.id}`}
            >
              <Save size={16} /> {t.boards.save}
            </button>
            <button
              className="iconTextButton primarySmall"
              onClick={onRun}
              disabled={!automationReady || loading === `runAutomation:${board.id}`}
            >
              {loading === `runAutomation:${board.id}`
                ? <RefreshCw size={16} className="spin" />
                : <Play size={16} />}
              {loading === `runAutomation:${board.id}` ? t.boards.running : t.boards.run}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', status }) {
  return (
    <label className="field">
      <span className="fieldHeader">
        <span>{label}</span>
        {status && (
          <span className={`fieldSyncStatus ${status.state}`}>
            {status.state === 'ready' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {status.label}
          </span>
        )}
      </span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AutomationReport({ report, t }) {
  const newCards = (report.created || []).filter(item => item.isNew);
  const errors = report.errors || [];

  if (newCards.length === 0 && errors.length === 0) {
    return <p className="dimmed">{t.boards.reportNoCreated}</p>;
  }

  return (
    <div className={errors.length ? 'automationReport warning' : 'automationReport'}>
      {newCards.length > 0 && (
        <>
          <strong>{formatMessage(t.boards.reportCreated, { count: newCards.length })}</strong>
          <ul className="successList">
            {newCards.map((item) => (
              <li key={item.trelloCardId}>
                <span className="badge created">New</span>{' '}
                {item.title} {'->'}{' '}
                <a href={item.jiraIssueUrl} target="_blank" rel="noopener noreferrer" className="jiraLink">
                  {item.jiraIssueKey}
                </a>
                {item.aiError && (
                  <span className="dimmed"> · IA no refinada: {item.aiError}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {errors.length > 0 && (
        <ul className="errorList">
          {errors.map((error, index) => (
            <li key={error.trelloCardId || index}>
              <strong>{error.title || 'Error'}:</strong> {error.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const priorityWeights = {
  'Highest': 5,
  'High': 4,
  'Medium': 3,
  'Low': 2,
  'Lowest': 1
};

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('revis') || s.includes('review')) return 'status-review';
  if (s.includes('deploy') || s.includes('release') || s.includes('finaliza')) return 'status-deploy';
  if (s.includes('bloque') || s.includes('block')) return 'status-blocked';
  if (s.includes('progr') || s.includes('dev') || s.includes('progress')) return 'status-progress';
  if (s.includes('todo') || s.includes('hacer') || s.includes('backlog')) return 'status-todo';
  return 'status-default';
}

function formatHours(hours) {
  if (hours <= 0) return '';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function JiraAlertsPage({ dashboard, stats, loading, t, language, onRefresh, onOpenComment }) {
  const [activeTab, setActiveTab] = useState('needsReview');
  const [monthFilter, setMonthFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  const categories = [
    { id: 'needsReview', title: t.jiraAlerts.sections.review, icon: <ListChecks size={18} />, issues: dashboard.needsReview || [] },
    { id: 'readyDeploy', title: t.jiraAlerts.sections.deploy, icon: <Play size={18} />, issues: dashboard.readyDeploy || [] },
    { id: 'blocked', title: language === 'es' ? 'Bloqueadas' : 'Blocked', icon: <X size={18} />, issues: dashboard.blocked || [] },
    { id: 'forgotten', title: t.jiraAlerts.sections.forgotten, icon: <Activity size={18} />, issues: dashboard.forgotten || [] },
    { id: 'commentRadar', title: t.jiraAlerts.sections.comments, icon: <MessageSquare size={18} />, issues: dashboard.commentRadar || [] },
    { id: 'myAssignments', title: language === 'es' ? 'Mis Asignaciones' : 'My Assignments', icon: <User size={18} />, issues: dashboard.myAssignments || [] },
    { id: 'reportedByMe', title: language === 'es' ? 'Informadas por mí' : 'Reported by me', icon: <ClipboardList size={18} />, issues: dashboard.reportedByMe || [] },
    { id: 'allOpen', title: language === 'es' ? 'Todas' : 'All', icon: <ListOrdered size={18} />, issues: dashboard.allOpen || [] }
  ];

  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    const allIssues = dashboard.allOpen || [];
    allIssues.forEach(issue => {
      const dateStr = issue.created || issue.updated;
      if (dateStr) {
        const date = new Date(dateStr);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${y}-${m}`);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [dashboard.allOpen]);

  const formatMonthYearStr = (ymStr) => {
    if (!ymStr) return '';
    const [year, month] = ymStr.split('-');
    const monthNamesEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const names = language === 'es' ? monthNamesEs : monthNamesEn;
    const idx = parseInt(month, 10) - 1;
    return `${names[idx]} ${year}`;
  };

  const activeCategory = categories.find(cat => cat.id === activeTab) || categories[0];

  const filteredAndSortedIssues = useMemo(() => {
    let list = [...activeCategory.issues];

    if (monthFilter !== 'all') {
      list = list.filter(issue => {
        const dateStr = issue.created || issue.updated;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}` === monthFilter;
      });
    }

    if (ageFilter !== 'all') {
      const now = new Date();
      list = list.filter(issue => {
        const dateStr = issue.created || issue.updated;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (ageFilter === '7d') return diffDays > 7;
        if (ageFilter === '30d') return diffDays > 30;
        if (ageFilter === '90d') return diffDays > 90;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'priority') {
        const wA = priorityWeights[a.priority] || 0;
        const wB = priorityWeights[b.priority] || 0;
        if (wA !== wB) return wB - wA;
        return new Date(b.updated) - new Date(a.updated);
      } else if (sortBy === 'newest') {
        const dateA = new Date(a.created || a.updated);
        const dateB = new Date(b.created || b.updated);
        return dateB - dateA;
      } else if (sortBy === 'oldest') {
        const dateA = new Date(a.created || a.updated);
        const dateB = new Date(b.created || b.updated);
        return dateA - dateB;
      }
      return 0;
    });

    return list;
  }, [activeCategory.issues, monthFilter, ageFilter, sortBy]);

  return (
    <section className="jiraDashboard">
      <div className="toolbar" style={{ justifyContent: 'space-between', padding: '0 0 10px 0' }}>
        <div className="jiraStats">
          <JiraStatCard label={t.jiraAlerts.stats.review} value={stats.reviewCount} onClick={() => setActiveTab('needsReview')} active={activeTab === 'needsReview'} />
          <JiraStatCard label={t.jiraAlerts.stats.deploy} value={stats.deployCount} onClick={() => setActiveTab('readyDeploy')} active={activeTab === 'readyDeploy'} />
          <JiraStatCard label={t.jiraAlerts.stats.stuck} value={stats.blockedCount} onClick={() => setActiveTab('blocked')} active={activeTab === 'blocked'} />
          <JiraStatCard label={t.jiraAlerts.stats.forgotten} value={stats.forgottenCount} onClick={() => setActiveTab('forgotten')} active={activeTab === 'forgotten'} />
        </div>
        <button className="primary" onClick={onRefresh} disabled={loading === 'jiraAlerts'} style={{ alignSelf: 'flex-start' }}>
          <RefreshCw size={18} className={loading === 'jiraAlerts' ? 'spin' : ''} /> {t.jiraAlerts.refresh}
        </button>
      </div>

      <div className="jiraTabs">
        {categories.map(cat => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`jiraTabButton ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(cat.id)}
            >
              {cat.icon}
              <span>{cat.title}</span>
              <span className="tabBadge">{cat.issues?.length || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="jiraFiltersBar">
        <div className="jiraFilterSelectGroup">
          <span className="jiraFilterLabel">{language === 'es' ? 'Mes:' : 'Month:'}</span>
          <select 
            className="jiraFilterSelect" 
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="all">{language === 'es' ? 'Todos los meses' : 'All months'}</option>
            {availableMonths.map(ym => (
              <option key={ym} value={ym}>{formatMonthYearStr(ym)}</option>
            ))}
          </select>
        </div>

        <div className="jiraFilterSelectGroup">
          <span className="jiraFilterLabel">{language === 'es' ? 'Antigüedad:' : 'Age:'}</span>
          <select 
            className="jiraFilterSelect" 
            value={ageFilter} 
            onChange={(e) => setAgeFilter(e.target.value)}
          >
            <option value="all">{language === 'es' ? 'Cualquiera' : 'Any age'}</option>
            <option value="7d">{language === 'es' ? 'Más de 7 días' : 'Older than 7 days'}</option>
            <option value="30d">{language === 'es' ? 'Más de 30 días' : 'Older than 30 days'}</option>
            <option value="90d">{language === 'es' ? 'Más de 90 días' : 'Older than 90 days'}</option>
          </select>
        </div>

        <div className="jiraFilterSelectGroup">
          <span className="jiraFilterLabel">{language === 'es' ? 'Ordenar por:' : 'Sort by:'}</span>
          <select 
            className="jiraFilterSelect" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="priority">{language === 'es' ? 'Prioridad' : 'Priority'}</option>
            <option value="newest">{language === 'es' ? 'Más reciente' : 'Newest'}</option>
            <option value="oldest">{language === 'es' ? 'Más antigua' : 'Oldest'}</option>
          </select>
        </div>

        {(monthFilter !== 'all' || ageFilter !== 'all') && (
          <button 
            type="button" 
            className="jiraClearFiltersBtn"
            onClick={() => { setMonthFilter('all'); setAgeFilter('all'); }}
          >
            {language === 'es' ? 'Limpiar filtros' : 'Clear filters'}
          </button>
        )}
      </div>

      <div className="jiraTabContent">
        {filteredAndSortedIssues.map(issue => (
          <JiraTicketCard 
            key={issue.id} 
            issue={issue} 
            t={t} 
            language={language} 
            onRefresh={onRefresh} 
            onOpenComment={(mode) => onOpenComment(issue, mode)}
          />
        ))}
        {filteredAndSortedIssues.length === 0 && (
          <div className="emptyState" style={{ gridColumn: '1 / -1', padding: '40px' }}>
            <AlertCircle size={36} color="var(--ko-text-dim)" />
            <p className="dimmed">{language === 'es' ? 'No se encontraron tareas con los filtros seleccionados.' : 'No issues found with the selected filters.'}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function JiraStatCard({ label, value, onClick, active }) {
  return (
    <div className={`statCard ${active ? 'active' : ''}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <span className="statValue">{value}</span>
      <span className="statLabel">{label}</span>
    </div>
  );
}

function JiraTicketCard({ issue, t, language, onRefresh, onOpenComment }) {
  const [showStatus, setShowStatus] = useState(false);
  const [transitions, setTransitions] = useState([]);
  const [isMovingStatus, setIsMovingStatus] = useState(false);
  const [localStatus, setLocalStatus] = useState(issue.status);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    setLocalStatus(issue.status);
  }, [issue.status]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onRefresh();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onRefresh]);

  async function handleUpdateStatus(tid) {
    if (isMovingStatus || countdown !== null) return;
    setIsMovingStatus(true);
    try {
      const selectedTransition = transitions.find(tr => tr.id === tid);
      const newStatusName = selectedTransition ? selectedTransition.name : 'Actualizado';

      await api.jiraUpdateStatus(issue.key, tid);
      
      setLocalStatus(newStatusName);
      setCountdown(3);
    } catch (err) {
      alert(err.message || 'Error al actualizar el estado.');
    } finally {
      setIsMovingStatus(false);
      setShowStatus(false);
    }
  }

  async function loadTransitions() {
    if (transitions.length > 0) return;
    const res = await api.jiraTransitions(issue.key);
    if (res?.transitions) setTransitions(res.transitions);
  }

  const copyUpdate = () => {
    let text = '';
    const status = localStatus;
    if (status === 'Listo para Deploy' || status === 'Ready for Deploy' || status === 'Ready for deployment' || status === 'Ready for Release') {
      text = t.jiraAlerts.templates.readyDeploy;
    } else {
      text = t.jiraAlerts.templates.inDev;
    }
    navigator.clipboard.writeText(text);
  };

  const priorityClass = issue.priority ? `priority-${issue.priority.toLowerCase()}` : '';

  return (
    <div className={`jiraCard ${issue.staleness} ${priorityClass}`}>
      <div className="cardHeader">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="ticketKey">{issue.key} · {issue.reporterName || issue.author || 'Sistema'}</span>
          <strong className="ticketTitle">{issue.summary}</strong>
        </div>
        <a href={issue.url} target="_blank" rel="noopener noreferrer" className="iconTextButton">
          <ExternalLink size={14} />
        </a>
      </div>

      {countdown !== null && (
        <div className="countdownBanner">
          <RefreshCw size={12} className="spin" />
          <span>
            {language === 'es' 
              ? `La tarjeta se moverá de pestaña en ${countdown}...` 
              : `The card will move tabs in ${countdown}...`}
          </span>
        </div>
      )}

      <div className="cardMeta">
        <span className={`pill ${getStatusClass(localStatus)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
          {localStatus === 'Finalizar' ? 'Finalizado' : localStatus}
        </span>
        {issue.priority && (
          <span className={`priorityBadge ${issue.priority.toLowerCase()}`}>
            {issue.priority}
          </span>
        )}
        {issue.assigneeName && <span><User size={10} /> {issue.assigneeName}</span>}
        {issue.lastUpdateHours > 0 && <span>{formatMessage(t.jiraAlerts.waiting, { time: formatHours(issue.lastUpdateHours) })}</span>}
        {issue.sprint && <span className="badge" style={{ fontSize: '10px' }}>{issue.sprint.name}</span>}
      </div>

      {issue.commentText && (
        <div 
          className="commentPreview"
          onClick={() => onOpenComment('view')}
          style={{ cursor: 'pointer' }}
          title={language === 'es' ? 'Ver comentario completo' : 'View full comment'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <strong style={{ fontSize: '11.5px', color: 'var(--ko-orange)' }}>{issue.commentAuthor || issue.author}</strong>
            <span style={{ fontSize: '10px', color: 'var(--ko-text-muted)' }}>{language === 'es' ? 'comentó:' : 'commented:'}</span>
          </div>
          <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
            "{issue.commentText.length <= 150 
                ? issue.commentText 
                : issue.commentText.substring(0, 150) + '...'}"
          </div>
          {issue.commentText.length > 150 && (
            <span 
              style={{
                display: 'block',
                marginTop: '6px',
                color: 'var(--ko-orange)',
                fontSize: '11.5px',
                fontWeight: '700',
                textDecoration: 'underline'
              }}
            >
              {language === 'es' ? 'Ver comentario completo' : 'Show full comment'}
            </span>
          )}
        </div>
      )}

      {issue.remoteLinks?.length > 0 && (
        <div className="remoteLinksList">
          {issue.remoteLinks.map((link, idx) => (
            <a 
              key={idx} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`remoteLinkItem ${link.isPR ? 'is-pr' : 'is-workspace'}`}
            >
              {link.isPR ? <Bot size={12} /> : <ExternalLink size={12} />}
              <span>{link.title || (link.isPR ? 'PR' : 'Workspace')}</span>
            </a>
          ))}
        </div>
      )}

      <div className="cardActions">
        <button className="actionBtn" onClick={copyUpdate} title={t.jiraAlerts.actions.copyUpdate}>
          <ClipboardList size={14} /> {t.jiraAlerts.actions.copyUpdate}
        </button>
        
        <div style={{ position: 'relative' }}>
          <button 
            className="actionBtn" 
            onClick={() => { setShowStatus(!showStatus); loadTransitions(); }}
            disabled={isMovingStatus}
          >
            {isMovingStatus ? <RefreshCw size={14} className="spin" /> : <ArrowRightLeft size={14} />}
            {' '}
            {isMovingStatus ? (language === 'es' ? 'Moviendo...' : 'Moving...') : t.jiraAlerts.actions.moveTo}
          </button>
          {showStatus && (
            <div className="mentionDropdown" style={{ bottom: '100%', left: 0, marginBottom: '5px', width: '200px' }}>
              {transitions.map(tr => (
                <button key={tr.id} className="mentionItem" onClick={() => handleUpdateStatus(tr.id)}>
                  {tr.name === 'Finalizar' ? 'Finalizada' : tr.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="actionBtn" onClick={() => onOpenComment('reply')}>
          <MessageSquare size={14} /> {language === 'es' ? 'Responder' : 'Reply'}
        </button>
      </div>
    </div>
  );
}

function JiraCommentReplyModal({ issue, mode, language, onClose, onRefresh, t }) {
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [members, setMembers] = useState([]);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const editorRef = useRef(null);

  useEffect(() => {
    api.jiraUsersSearch('').then(res => {
      if (res?.users) {
        setMembers(res.users.map(u => ({
          id: u.id || u.accountId,
          username: u.displayName.toLowerCase().replace(/\s+/g, '.'),
          fullName: u.displayName,
          avatarUrl: u.avatarUrl
        })));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (mode === 'reply' && editorRef.current) {
      setTimeout(() => {
        editorRef.current.focus();
      }, 100);
    }
  }, [mode]);

  const filteredMembers = useMemo(() => {
    if (mentionSearch === null) return [];
    const q = mentionSearch.query.toLowerCase();
    return members.filter(m => 
      m.username.toLowerCase().includes(q) || 
      m.fullName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [members, mentionSearch]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = (e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const lastAtMatch = textBeforeCursor.match(/@(\w*)$/);

    if (lastAtMatch) {
      setMentionSearch({
        query: lastAtMatch[1],
        startIndex: lastAtMatch.index,
        node: range.startContainer,
        offset: range.startOffset
      });
      setActiveMemberIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const selectMember = (member) => {
    if (!mentionSearch) return;
    const { node, offset, query } = mentionSearch;
    const content = node.textContent;
    const before = content.substring(0, offset - query.length - 1);
    const after = content.substring(offset);
    
    node.textContent = before;
    const mentionNode = document.createElement('strong');
    mentionNode.setAttribute('data-mention-id', member.id);
    mentionNode.style.color = 'var(--ko-orange)';
    mentionNode.textContent = `@${member.username}`;
    mentionNode.contentEditable = 'false';
    
    const spaceNode = document.createTextNode(' ');
    
    if (node.nextSibling) {
      node.parentNode.insertBefore(mentionNode, node.nextSibling);
      node.parentNode.insertBefore(spaceNode, mentionNode.nextSibling);
    } else {
      node.parentNode.appendChild(mentionNode);
      node.parentNode.appendChild(spaceNode);
    }

    const range = document.createRange();
    range.setStartAfter(spaceNode);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    setMentionSearch(null);
    editorRef.current?.focus();
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const res = await api.uploadJiraImage(issue.key, event.target.result);
            if (res?.url) {
              const img = document.createElement('img');
              img.src = res.url;
              img.style.maxWidth = '100%';
              img.style.borderRadius = '8px';
              img.style.display = 'block';
              img.style.margin = '10px 0';
              
              const range = window.getSelection().getRangeAt(0);
              range.insertNode(img);
              range.collapse(false);
            }
          } catch (err) {
            console.error('Failed to upload image', err);
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const htmlToMarkdown = (html) => {
    let md = html
      .replace(/<strong data-mention-id="(.*?)"[^>]*>@(.*?)<\/strong>/g, '[mention:$1](@$2)')
      .replace(/<b>(.*?)<\/b>|<strong>(.*?)<\/strong>/g, '**$1$2**')
      .replace(/<i>(.*?)<\/i>|<em>(.*?)<\/em>/g, '*$1$2*')
      .replace(/<div><br><\/div>/g, '\n')
      .replace(/<div>(.*?)<\/div>/g, '\n$1')
      .replace(/<br>/g, '\n')
      .replace(/<img.*?src="(.*?)".*?>/g, '\n\n![]($1)\n\n')
      .replace(/<ul>(.*?)<\/ul>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '\n- $1'))
      .replace(/<ol>(.*?)<\/ol>/gs, (m, p1) => p1.replace(/<li>(.*?)<\/li>/g, '\n1. $1'))
      .replace(/<[^>]*>/g, '');
    return md.trim();
  };

  async function handleSendReply(e) {
    e.preventDefault();
    const markdown = htmlToMarkdown(editorRef.current.innerHTML);
    if (!markdown || isSendingReply) return;
    setIsSendingReply(true);
    try {
      await api.jiraAddComment(issue.key, markdown);
      alert(language === 'es' ? 'Respuesta enviada a Jira con éxito.' : 'Reply sent to Jira successfully.');
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message || 'Error al enviar comentario');
    } finally {
      setIsSendingReply(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '100%' }}>
        <div className="modalHeader">
          <h2>{language === 'es' ? 'Detalle de Comentario' : 'Comment Details'}</h2>
          <button className="closeButton" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modalBody" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '24px' }}>
          {/* Comment Author Header & Body (only if a comment exists) */}
          {(issue.commentText || issue.commentHtml) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--ko-border)', paddingBottom: '12px' }}>
                <div className="userAvatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                  {(issue.commentAuthor || issue.author || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ fontSize: '14px' }}>{issue.commentAuthor || issue.author || 'Sistema'}</strong>
                  {issue.updated && (
                    <div style={{ fontSize: '11px', color: 'var(--ko-text-muted)', marginTop: '2px' }}>
                      {new Date(issue.updated).toLocaleString(language === 'es' ? 'es-AR' : 'en-US')}
                    </div>
                  )}
                </div>
              </div>
              
              <div 
                className="fullCommentHtml"
                dangerouslySetInnerHTML={{ 
                  __html: (issue.commentHtml || `<p>${issue.commentText}</p>`).replace(/\/api\/jira\/attachment\//g, `${api.API_BASE}/jira/attachment/`)
                }}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--ko-text)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  marginBottom: '24px'
                }}
              />
            </>
          )}

          {/* Reply Form */}
          <div style={{ borderTop: '1px solid var(--ko-border)', paddingTop: '20px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: 'var(--ko-orange)' }}>
              {language === 'es' ? 'Escribir respuesta' : 'Write reply'}
            </h4>
            <form className="replyForm" onSubmit={handleSendReply} style={{ marginTop: '0' }}>
              <div className="editorToolbar">
                <button type="button" onClick={() => execCommand('bold')} title="Negrita"><Bold size={16} /></button>
                <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullets"><List size={16} /></button>
                <button type="button" onClick={() => execCommand('insertOrderedList')} title="Lista numerada"><ListOrdered size={16} /></button>
              </div>
              <div className="mentionWrapper">
                <div 
                  ref={editorRef}
                  contentEditable
                  className="richEditor"
                  onInput={handleInput}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (mentionSearch && filteredMembers.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveMemberIndex(i => (i + 1) % filteredMembers.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveMemberIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length);
                      } else if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        selectMember(filteredMembers[activeMemberIndex]);
                      } else if (e.key === 'Escape') {
                        setMentionSearch(null);
                      }
                    }
                  }}
                  placeholder={language === 'es' ? "Escribe una respuesta..." : "Write a reply..."}
                />
                {mentionSearch && filteredMembers.length > 0 && (
                  <div className="mentionDropdown" style={{ width: '100%', bottom: '100%' }}>
                    {filteredMembers.map((member, index) => (
                      <button
                        key={member.id}
                        type="button"
                        className={index === activeMemberIndex ? 'mentionItem active' : 'mentionItem'}
                        onClick={() => selectMember(member)}
                      >
                        <User size={14} />
                        <div className="memberInfo">
                          <strong>{member.fullName}</strong>
                          <small>@{member.username}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="replyActions" style={{ marginTop: '8px' }}>
                <button type="button" className="ghost" onClick={onClose}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button type="submit" className="primarySmall" disabled={isSendingReply}>
                  {isSendingReply ? <RefreshCw size={12} className="spin" /> : (language === 'es' ? 'Responder' : 'Reply')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

