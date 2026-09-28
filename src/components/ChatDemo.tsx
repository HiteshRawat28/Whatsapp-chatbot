import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, MoreVertical, Paperclip, Phone, Send, ShieldCheck, Smile } from 'lucide-react';
import { api } from '../api';
import type { AppConfig, ChatMessage, Conversation } from '../types';

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.type === 'system') return <div className="chat-system">{message.text}</div>;
  const outbound = message.sender === 'customer';
  return (
    <div className={`message-row ${outbound ? 'message-customer' : 'message-business'}`}>
      <div className="message-bubble">
        <p>{message.text}</p>
        <span className="message-meta">
          {timeLabel(message.createdAt)}
          {outbound && <CheckCheck size={14} />}
        </span>
      </div>
    </div>
  );
}

export function ChatDemo({ config }: { config: AppConfig | null }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const savedId = sessionStorage.getItem('voltassist-conversation');
        let next: Conversation;
        if (savedId) {
          try {
            next = await api.getConversation(savedId);
          } catch {
            next = await api.createConversation();
          }
        } else {
          next = await api.createConversation();
        }
        if (!cancelled) {
          sessionStorage.setItem('voltassist-conversation', next.id);
          setConversation(next);
        }
      } catch {
        if (!cancelled) setError('The demo service is unavailable. Please start the API server.');
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation?.messages.length, sending]);

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || !conversation || sending) return;
    setInput('');
    setSending(true);
    setError('');
    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      sender: 'customer',
      type: 'text',
      text: clean,
      status: 'read',
      createdAt: new Date().toISOString()
    };
    setConversation({ ...conversation, messages: [...conversation.messages, optimistic] });
    try {
      const updated = await api.sendCustomerMessage(conversation.id, clean);
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      setConversation(updated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Message failed to send');
      setConversation(conversation);
    } finally {
      setSending(false);
    }
  };

  const restartDemo = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const next = await api.createConversation();
      sessionStorage.setItem('voltassist-conversation', next.id);
      setConversation(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to restart the demo');
    } finally {
      setSending(false);
    }
  };

  const lastBotMessage = [...(conversation?.messages || [])].reverse().find((message) => message.sender === 'bot');

  return (
    <div className="phone-shell" id="live-demo">
      <div className="phone-topbar">
        <ArrowLeft size={20} />
        <div className="avatar avatar-bot">VA<span className="presence-dot" /></div>
        <div className="phone-contact">
          <strong>EnergINai</strong>
          <span>{sending ? 'typing…' : 'typically replies instantly'}</span>
        </div>
        <Phone size={18} />
        <MoreVertical size={19} />
      </div>

      <div className="phone-encryption"><ShieldCheck size={12} /> End-to-end encrypted customer channel</div>

      <div className="phone-messages" ref={scrollRef}>
        <div className="chat-date">TODAY</div>
        {conversation?.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {!conversation && !error && <div className="chat-loading">Starting secure conversation…</div>}
        {sending && (
          <div className="message-row message-business">
            <div className="typing-indicator"><span /><span /><span /></div>
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>

      {!!lastBotMessage?.quickReplies?.length && !sending && (
        <div className="quick-replies">
          {lastBotMessage.quickReplies.map((reply) => (
            <button key={reply.id} onClick={() => void sendMessage(reply.id)}>{reply.label}</button>
          ))}
        </div>
      )}

      <form className="phone-composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }}>
        <Smile size={21} />
        <input
          id="demo-input"
          aria-label="Message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type a message"
          disabled={!conversation || sending}
        />
        <Paperclip size={20} />
        <button aria-label="Send message" type="submit" disabled={!input.trim() || sending}>
          <Send size={18} />
        </button>
      </form>

      <div className="demo-mode">
        <span className="live-dot" /> {config?.mode || 'Demo mode'} · Backend responses
        <button type="button" onClick={() => void restartDemo()} disabled={sending}>Restart</button>
      </div>
    </div>
  );
}
