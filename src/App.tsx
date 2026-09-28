import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Headphones,
  Layers3,
  LockKeyhole,
  MessageCircleMore,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap
} from 'lucide-react';
import { api } from './api';
import type { AppConfig } from './types';
import { Brand } from './components/Brand';
import { ChatDemo } from './components/ChatDemo';
import { Dashboard } from './components/Dashboard';

function Home({ config, openDashboard }: { config: AppConfig | null; openDashboard: () => void }) {
  const scrollToDemo = () => {
    const demoEl = document.getElementById('live-demo');
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      demoEl.classList.remove('pulse-highlight');
      void demoEl.offsetWidth; // Trigger reflow to restart animation
      demoEl.classList.add('pulse-highlight');
    }
    setTimeout(() => document.getElementById('demo-input')?.focus(), 600);
  };
  return (
    <div className="site-shell">
      <nav className="site-nav">
        <Brand />
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#capabilities">Capabilities</a>
          <button className="nav-dashboard" onClick={openDashboard}>Open agent inbox <ArrowRight size={16} /></button>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span><Sparkles size={14} /></span> WhatsApp automation, made tangible</div>
            <h1>Every customer heard.<br /><em>Every conversation moving.</em></h1>
            <p className="hero-lead">A production-minded AI support experience that answers instantly, captures qualified leads, and brings a human in exactly when needed.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={scrollToDemo}>Try the live conversation <ArrowRight size={17} /></button>
              <button className="secondary-button" onClick={openDashboard}>Explore agent inbox</button>
            </div>
            <div className="hero-proof">
              <div><span><CheckCircle2 size={16} /></span><p><strong>24/7</strong> instant responses</p></div>
              <div><span><CheckCircle2 size={16} /></span><p><strong>Human</strong> handoff built in</p></div>
              <div><span><CheckCircle2 size={16} /></span><p><strong>API-ready</strong> architecture</p></div>
            </div>
          </div>
          <div className="hero-demo-wrap">
            <div className="demo-orbit orbit-one" />
            <div className="demo-orbit orbit-two" />
            <ChatDemo config={config} />
            <div className="floating-card floating-card-top"><span><Zap size={15} /></span><div><strong>2.4 sec</strong><small>Avg. response time</small></div></div>
            <div className="floating-card floating-card-bottom"><span><Headphones size={15} /></span><div><strong>Smart handoff</strong><small>Context stays intact</small></div></div>
          </div>
        </section>

        <section className="metric-strip">
          <div><strong>&lt; 3 sec</strong><span>Typical AI response</span></div>
          <div><strong>4</strong><span>Service journeys</span></div>
          <div><strong>24/7</strong><span>Customer availability</span></div>
          <div><strong>100%</strong><span>Conversation visibility</span></div>
        </section>

        <section className="workflow-section" id="how-it-works">
          <div className="section-heading">
            <span className="section-kicker">The complete loop</span>
            <h2>Automation that knows<br />when to step aside.</h2>
            <p>From the first “hello” to specialist follow-up, every interaction is connected and visible.</p>
          </div>
          <div className="workflow-grid">
            <article>
              <div className="step-top"><span>01</span><MessageCircleMore size={23} /></div>
              <h3>Customer starts on WhatsApp</h3>
              <p>A familiar channel removes friction. The webhook captures each message securely and reliably.</p>
              <div className="mini-ui mini-message"><span className="mini-avatar">RS</span><div><strong>Riya Sharma</strong><small>I’d like to know about rooftop solar.</small></div></div>
            </article>
            <article>
              <div className="step-top"><span>02</span><Bot size={23} /></div>
              <h3>AI understands and responds</h3>
              <p>Structured intent detection answers common questions and guides qualified consultation requests.</p>
              <div className="mini-ui intent-tags"><span>Intent: Solar</span><span>Confidence: 96%</span></div>
            </article>
            <article>
              <div className="step-top"><span>03</span><Headphones size={23} /></div>
              <h3>Humans handle the moments that matter</h3>
              <p>Low confidence, technical issues, and explicit requests route to the inbox with full context.</p>
              <div className="mini-ui handoff-mini"><div className="avatar avatar-user">YO</div><div><strong>Assigned to you</strong><small>Conversation context preserved</small></div><ChevronRight size={18} /></div>
            </article>
          </div>
        </section>

        <section className="capabilities-section" id="capabilities">
          <div className="section-heading light-heading">
            <span className="section-kicker">Built beyond the happy path</span>
            <h2>A showcase with a real backend.</h2>
            <p>This is not a static chat mockup. Every conversation is persisted, classified and available to the operator inbox.</p>
          </div>
          <div className="capability-grid">
            <article><Webhook /><h3>Meta webhook-ready</h3><p>Completes Meta’s verification challenge and validates every event with an HMAC-SHA256 signature.</p></article>
            <article><Layers3 /><h3>Guided journeys</h3><p>Service discovery, pricing guidance and structured consultation capture.</p></article>
            <article><CircleGauge /><h3>Live operations</h3><p>Conversation status, unread counts, assignment and response metrics in one view.</p></article>
            <article><ShieldCheck /><h3>Safe escalation</h3><p>Two low-confidence turns trigger human handoff with a direct support number.</p></article>
            <article><LockKeyhole /><h3>Server-side secrets</h3><p>Provider credentials never enter browser code and payload sizes are restricted.</p></article>
            <article><PhoneCall /><h3>Direct contact fallback</h3><p>Customers can always reach a specialist at <a href={config?.whatsappUrl}>{config?.escalationPhoneDisplay || '+91 74550 85375'}</a>.</p></article>
          </div>
        </section>

        <section className="cta-section">
          <div>
            <span className="section-kicker">See both sides of the experience</span>
            <h2>Start as a customer.<br />Finish as the support team.</h2>
          </div>
          <button className="primary-button inverse" onClick={openDashboard}>Open the agent inbox <ArrowRight size={18} /></button>
        </section>
      </main>

      <footer>
        <Brand />
        <p>Professional WhatsApp automation showcase · Built for demonstration</p>
        <a href={config?.whatsappUrl || 'https://wa.me/917455085375'} target="_blank" rel="noreferrer"><MessageCircleMore size={16} /> +91 74550 85375</a>
      </footer>

      <a
        href={config?.whatsappUrl || 'https://wa.me/917455085375?text=Hi!%20I%20would%20like%20to%20know%20more.'}
        target="_blank"
        rel="noreferrer"
        className="floating-wa-button"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'home' | 'dashboard'>(() => window.location.hash === '#dashboard' ? 'dashboard' : 'home');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => { void api.getConfig().then(setConfig).catch(() => undefined); }, []);

  const navigate = (next: 'home' | 'dashboard') => {
    setView(next);
    window.location.hash = next === 'dashboard' ? 'dashboard' : '';
    window.scrollTo({ top: 0 });
  };

  return view === 'dashboard'
    ? <Dashboard config={config} onExit={() => navigate('home')} />
    : <Home config={config} openDashboard={() => navigate('dashboard')} />;
}
