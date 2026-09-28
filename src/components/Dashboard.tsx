import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Headphones,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  Zap
} from 'lucide-react';
import { api } from '../api';
import type { AppConfig, ChatMessage, Conversation, DashboardData } from '../types';
import { Brand } from './Brand';
import { StatusBadge } from './StatusBadge';

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function messageTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function InboxMessage({ message }: { message: ChatMessage }) {
  if (message.type === 'system') return <div className="inbox-system"><span>{message.text}</span></div>;
  const isCustomer = message.sender === 'customer';
  return (
    <div className={`inbox-message ${isCustomer ? 'inbox-incoming' : 'inbox-outgoing'}`}>
      {!isCustomer && <span className="message-author">{message.sender === 'bot' ? 'Ava · AI' : 'You'}</span>}
      <div className="inbox-bubble">{message.text}</div>
      <span className="inbox-time">
        {messageTime(message.createdAt)}
        {!isCustomer && (message.status === 'read' ? <CheckCheck size={13} /> : <Check size={13} />)}
      </span>
    </div>
  );
}

export function Dashboard({ config, onExit }: { config: AppConfig | null; onExit: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'attention'>('all');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadDashboard = async (preserveSelection = true) => {
    try {
      const next = await api.getDashboard();
      setData(next);
      setSelectedId((current) => {
        if (preserveSelection && current && next.conversations.some((item) => item.id === current)) return current;
        return next.conversations[0]?.id || '';
      });
      setError('');
    } catch {
      setError('Unable to load the inbox. Check that the backend is running.');
    }
  };

  useEffect(() => {
    void loadDashboard(false);
    const timer = window.setInterval(() => void loadDashboard(), 4_000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = data?.conversations.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selected?.messages.length]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.conversations || []).filter((conversation) => {
      const matchesFilter = filter === 'all' || conversation.status === 'human_requested';
      const lastMessage = conversation.messages.at(-1)?.text || '';
      const matchesQuery = !normalized || `${conversation.contact.name} ${conversation.contact.phone} ${lastMessage}`.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [data, query, filter]);

  const updateConversation = (updated: Conversation) => {
    setData((current) => current ? {
      ...current,
      conversations: current.conversations.map((item) => item.id === updated.id ? updated : item)
    } : current);
  };

  const runAction = async (action: () => Promise<Conversation>) => {
    setBusy(true);
    try {
      updateConversation(await action());
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!selected || !text || busy) return;
    setReply('');
    await runAction(() => api.sendAgentMessage(selected.id, text));
  };

  return (
    <div className="dashboard-app">
      <aside className="dash-sidebar">
        <Brand compact />
        <nav>
          <button className="active" aria-label="Inbox"><Inbox size={20} /></button>
          <button aria-label="Dashboard"><LayoutDashboard size={20} /></button>
          <button aria-label="Customers"><Users size={20} /></button>
          <button aria-label="Analytics"><BarChart3 size={20} /></button>
        </nav>
        <div className="sidebar-bottom">
          <button aria-label="Settings"><Settings size={20} /></button>
          <div className="avatar avatar-user">YO</div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <button className="back-link" onClick={onExit}><ArrowLeft size={16} /> Back to showcase</button>
            <h1>Customer conversations</h1>
            <p>Monitor automation and step in when a customer needs you.</p>
          </div>
          <div className="header-actions">
            <div className="connection-chip"><span className="live-dot" /> {config?.mode || 'Demo mode'}</div>
            <button className="icon-button"><Settings size={18} /></button>
            <div className="avatar avatar-user">YO</div>
          </div>
        </header>

        <section className="stats-grid">
          <article><span><MessageCircle size={18} /></span><div><strong>{data?.stats.totalConversations ?? '—'}</strong><small>Total conversations</small></div><em>Live</em></article>
          <article><span><Zap size={18} /></span><div><strong>{data?.stats.automationRate ?? '—'}%</strong><small>Automated resolution</small></div><em className="positive">Healthy</em></article>
          <article><span><Headphones size={18} /></span><div><strong>{data?.stats.needsAttention ?? '—'}</strong><small>Needs attention</small></div><em className="attention">Review</em></article>
          <article><span><Clock3 size={18} /></span><div><strong>{data?.stats.averageResponseSeconds ?? '—'}s</strong><small>Average response</small></div><em className="positive">Fast</em></article>
        </section>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="inbox-layout">
          <div className="conversation-panel">
            <div className="conversation-panel-head">
              <div className="filter-tabs">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>Needs attention</button>
              </div>
              <div className="conversation-search"><Search size={16} /><input placeholder="Search conversations" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            </div>
            <div className="conversation-list">
              {filtered.map((conversation) => {
                const last = conversation.messages.at(-1);
                return (
                  <button
                    key={conversation.id}
                    className={`conversation-item ${selectedId === conversation.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    <div className="avatar avatar-contact">{initials(conversation.contact.name)}</div>
                    <div className="conversation-summary">
                      <div><strong>{conversation.contact.name}</strong><time>{relativeTime(conversation.updatedAt)}</time></div>
                      <p>{last?.sender === 'bot' ? 'Ava: ' : ''}{last?.text}</p>
                      <StatusBadge status={conversation.status} />
                    </div>
                    {conversation.unreadCount > 0 && <span className="unread-count">{conversation.unreadCount}</span>}
                  </button>
                );
              })}
              {!filtered.length && <div className="empty-state">No conversations match this view.</div>}
            </div>
          </div>

          <div className="thread-panel">
            {selected ? (
              <>
                <header className="thread-header">
                  <div className="avatar avatar-contact">{initials(selected.contact.name)}</div>
                  <div><strong>{selected.contact.name}</strong><span><span className="presence-inline" /> WhatsApp · active now</span></div>
                  <div className="thread-actions">
                    <StatusBadge status={selected.status} />
                    <button><Phone size={17} /></button>
                    <button><MoreHorizontal size={19} /></button>
                  </div>
                </header>
                <div className="automation-banner">
                  <Sparkles size={16} />
                  <span><strong>{selected.status === 'human_active' ? 'You are handling this chat' : 'Ava is handling this conversation'}</strong>{selected.status === 'human_active' ? ' Send a reply or return control to automation.' : ' You can take over at any time.'}</span>
                  {selected.status === 'human_active' ? (
                    <button disabled={busy} onClick={() => void runAction(() => api.release(selected.id))}>Return to AI</button>
                  ) : (
                    <button disabled={busy} onClick={() => void runAction(() => api.takeover(selected.id))}>Take over</button>
                  )}
                </div>
                <div className="thread-messages" ref={scrollRef}>
                  <div className="thread-date">Today</div>
                  {selected.messages.map((message) => <InboxMessage key={message.id} message={message} />)}
                </div>
                <form className="thread-composer" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
                  <textarea
                    aria-label="Reply"
                    placeholder={selected.status === 'human_active' ? 'Write a reply…' : 'Take over the conversation to reply'}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    disabled={selected.status !== 'human_active'}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <div>
                    <span>Press Enter to send</span>
                    <button type="submit" disabled={!reply.trim() || busy || selected.status !== 'human_active'}><Send size={17} /> Send</button>
                  </div>
                </form>
              </>
            ) : <div className="thread-empty"><MessageCircle size={34} /><p>Select a conversation</p></div>}
          </div>

          <aside className="contact-panel">
            {selected && (
              <>
                <div className="contact-card-head">
                  <div className="avatar avatar-contact avatar-large">{initials(selected.contact.name)}</div>
                  <h3>{selected.contact.name}</h3>
                  <p>{selected.contact.phone}</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="contact-section">
                  <button className="contact-section-title">Contact details <ChevronDown size={16} /></button>
                  <dl>
                    <div><dt>Phone</dt><dd>{selected.contact.phone}</dd></div>
                    <div><dt>Language</dt><dd>{selected.contact.language}</dd></div>
                    <div><dt>Channel</dt><dd>{selected.channel === 'demo' ? 'Website demo' : 'WhatsApp'}</dd></div>
                  </dl>
                </div>
                <div className="contact-section">
                  <button className="contact-section-title">Conversation <ChevronDown size={16} /></button>
                  <dl>
                    <div><dt>Owner</dt><dd>{selected.assignedAgent || 'Ava · AI'}</dd></div>
                    <div><dt>24h window</dt><dd className="window-open">Open</dd></div>
                    <div><dt>Started</dt><dd>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(selected.createdAt))}</dd></div>
                  </dl>
                </div>
                <div className="contact-note"><Bot size={17} /><p><strong>AI summary</strong>Customer is asking about energy services. Review the full thread before taking action.</p></div>
                <button className="resolve-button" disabled={busy || selected.status === 'resolved'} onClick={() => void runAction(() => api.resolve(selected.id))}><Check size={17} /> Mark as resolved</button>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
