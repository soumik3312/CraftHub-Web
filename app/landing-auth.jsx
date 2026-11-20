'use client';

import React, { useState, useEffect } from 'react';
import CyberBackground from './cyber-background';
import {
  IconSparkles,
  IconCode,
  IconGitHub,
  IconCollab,
  IconAiMatch,
  IconMessages,
  IconExternal,
  IconCheck,
  IconArrowLeft,
  IconPeople,
  IconDownload,
  IconSend,
  IconSearch,
} from './icons';

const genres = [
  'Web Development',
  'Mobile Apps',
  'AI & Machine Learning',
  'UI/UX Design',
  'Open Source',
  'Backend & APIs',
  'Game Dev',
  'Cloud & DevOps',
];

const techBadges = [
  'React 19',
  'Next.js 15',
  'Flutter',
  'Node.js',
  'Monaco Editor',
  'GitHub OAuth',
  'Socket.IO',
  'MongoDB',
  'Dart',
  'TypeScript',
  'Cloudinary',
  'Tailwind CSS',
];

export default function LandingAuth({ onAuth, flash, request }) {
  // 'landing' | 'login' | 'signup'
  const [view, setView] = useState('landing');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', username: '', password: '', bio: '' });
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState([]);

  // Interactive simulated commit bar in the hero preview
  const [simulatedCommit, setSimulatedCommit] = useState('feat: setup shared monaco workspace');
  const [pushed, setPushed] = useState(false);

  // Sync with window.location.hash if user visits #login or #signup
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === '#login') {
        setView('login');
      } else if (h === '#signup') {
        setView('signup');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (view === 'signup') {
        const fd = new FormData();
        Object.entries({
          ...form,
          email: email.trim().toLowerCase(),
          genres: selected.join(','),
        }).forEach(([k, v]) => fd.append(k, v));

        const d = await request('/auth/register', { method: 'POST', body: fd, form: true });
        setStep('otp');
        flash(d.message || 'Verification code sent to your email.');
      } else {
        try {
          const d = await request('/auth/login', {
            method: 'POST',
            body: { email: email.trim().toLowerCase(), password: form.password },
          });
          onAuth(d);
        } catch (error) {
          if (error.code === 'EMAIL_NOT_VERIFIED') {
            setStep('otp');
            flash('Verify this existing account once to finish signing in.');
            return;
          }
          throw error;
        }
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await request('/auth/verify-register', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), code: code.trim() },
      });
      onAuth(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await request('/auth/resend-register', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      });
      flash('A fresh verification code has been sent.');
    } catch (e) {
      setErr(e.message);
    }
  }

  function handleSimulatePush(e) {
    e.preventDefault();
    setPushed(true);
    setTimeout(() => setPushed(false), 2400);
  }

  const isAuthModal = view === 'login' || view === 'signup';

  return (
    <div className="landing-shell">
      {/* Dynamic 60fps video-like cyber canvas background */}
      <CyberBackground interactive={true} density="normal" />

      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div
            className="brand brand-glow"
            onClick={() => {
              setView('landing');
              window.history.replaceState(null, '', ' ');
            }}
          >
            <span className="brand-mark">
              <img src="/brand/app-logo.png" alt="CraftHub" />
            </span>
            <span className="brand-text">
              Craft<span className="brand-light">Hub</span>
            </span>
            <span className="brand-badge">2.0</span>
          </div>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#monaco">Cloud IDE</a>
            <a href="#mobile">Mobile App</a>
            <a href="#community">Community</a>
          </nav>

          <div className="landing-nav-actions">
            <button
              className="nav-ghost-btn"
              onClick={() => {
                setView('login');
                setStep('form');
                setErr('');
                window.location.hash = 'login';
              }}
            >
              Sign In
            </button>
            <button
              className="primary nav-cta-btn"
              onClick={() => {
                setView('signup');
                setStep('form');
                setErr('');
                window.location.hash = 'signup';
              }}
            >
              <span>Get Started Free</span>
              <IconSparkles size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="landing-main">
        {/* HERO SECTION */}
        <section className="landing-hero">
          <div className="hero-pill-badge">
            <i className="badge-glow-dot" />
            <span>REAL-TIME COLLABORATION PLATFORM FOR BUILDERS</span>
          </div>

          <h1 className="hero-headline">
            Where Builders Connect,
            <br />
            <span className="hero-gradient-text">Collaborate & Ship Real Software.</span>
          </h1>

          <p className="hero-lead">
            The open ecosystem uniting developers, designers, and creators. Build together with
            in-browser <strong>Monaco IDE</strong> workspaces, synchronized private <strong>GitHub repositories</strong>,
            and AI-powered matchmaking.
          </p>

          <div className="hero-cta-group">
            <button
              className="primary hero-btn-main"
              onClick={() => {
                setView('signup');
                setStep('form');
                setErr('');
                window.location.hash = 'signup';
              }}
            >
              Start building free →
            </button>

            <button
              className="secondary hero-btn-sub"
              onClick={() => {
                setView('login');
                setStep('form');
                setErr('');
                window.location.hash = 'login';
              }}
            >
              <IconGitHub size={16} style={{ marginRight: 6 }} />
              Sign in to workspace
            </button>
          </div>

          <div className="hero-metrics-bar">
            <div className="metric-item">
              <b>100% Realtime</b>
              <span>Socket.IO Sync</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <b>Monaco Editor</b>
              <span>Cloud IDE in Browser</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <b>Private GitHub</b>
              <span>Shared Team Repos</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <b>Flutter Parity</b>
              <span>iOS & Android App</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKSPACE PREVIEW CARD */}
        <section className="hero-preview-section" id="monaco">
          <div className="preview-window-frame">
            <div className="preview-window-bar">
              <div className="mac-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="preview-tabs">
                <div className="preview-tab active">
                  <IconCode size={13} style={{ marginRight: 6, color: '#a855f7' }} />
                  <span>workspace.controller.ts</span>
                </div>
                <div className="preview-tab">
                  <IconGitHub size={13} style={{ marginRight: 6, color: '#38bdf8' }} />
                  <span>team-repo / main</span>
                </div>
              </div>
              <div className="preview-status-pill">
                <i className="status-live-dot" />
                <span>2 Collaborators Live</span>
              </div>
            </div>

            <div className="preview-editor-body">
              <div className="preview-file-tree">
                <div className="tree-header">EXPLORER</div>
                <div className="tree-item active">▸ src/app.tsx</div>
                <div className="tree-item">▸ src/routes/collab.js</div>
                <div className="tree-item">▸ src/socket/sync.ts</div>
                <div className="tree-item">▸ package.json</div>
                <div className="tree-item">▸ README.md</div>
              </div>

              <div className="preview-code-pane">
                <div className="code-line">
                  <span className="ln">1</span>
                  <span className="token-kw">import</span> {'{ createWorkspace, syncGitHub }'} <span className="token-kw">from</span> <span className="token-str">'@crafthub/engine'</span>;
                </div>
                <div className="code-line">
                  <span className="ln">2</span>
                </div>
                <div className="code-line">
                  <span className="ln">3</span>
                  <span className="token-comment">// Real-time Monaco collaboration session</span>
                </div>
                <div className="code-line">
                  <span className="ln">4</span>
                  <span className="token-kw">export async function</span> <span className="token-fn">shipTogether</span>(teamId: <span className="token-type">string</span>) {'{'}
                </div>
                <div className="code-line">
                  <span className="ln">5</span>
                  &nbsp;&nbsp;<span className="token-kw">const</span> session = <span className="token-kw">await</span> createWorkspace({'{'}
                </div>
                <div className="code-line">
                  <span className="ln">6</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;projectId: teamId,
                </div>
                <div className="code-line">
                  <span className="ln">7</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;editor: <span className="token-str">'Monaco'</span>,
                </div>
                <div className="code-line">
                  <span className="ln">8</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;gitSync: <span className="token-bool">true</span>,
                </div>
                <div className="code-line">
                  <span className="ln">9</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;flutterSync: <span className="token-bool">true</span>,
                </div>
                <div className="code-line">
                  <span className="ln">10</span>
                  &nbsp;&nbsp;{'}'});
                </div>
                <div className="code-line highlight">
                  <span className="ln">11</span>
                  &nbsp;&nbsp;<span className="token-kw">return</span> session.pushToGitHub({'{'} autoDeploy: <span className="token-bool">true</span> {'}'});
                </div>
                <div className="code-line">
                  <span className="ln">12</span>
                  {'}'}
                </div>
              </div>
            </div>

            <div className="preview-bottom-bar">
              <form onSubmit={handleSimulatePush} className="preview-commit-form">
                <span className="git-branch-badge">
                  <IconGitHub size={13} style={{ marginRight: 4 }} /> main
                </span>
                <input
                  type="text"
                  value={simulatedCommit}
                  onChange={(e) => setSimulatedCommit(e.target.value)}
                  placeholder="Commit message..."
                  className="preview-commit-input"
                />
                <button type="submit" className="primary preview-commit-btn">
                  {pushed ? (
                    <>
                      <IconCheck size={13} style={{ marginRight: 4 }} /> Pushed!
                    </>
                  ) : (
                    <>
                      <IconSend size={13} style={{ marginRight: 4 }} /> Save & Push
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FEATURES BENTO GRID */}
        <section className="landing-section" id="features">
          <div className="section-eyebrow">BUILT FOR SPEED & REAL TEAMS</div>
          <h2 className="section-title">Everything modern builders require.</h2>
          <p className="section-sub">
            From the initial idea spark to multi-member code commits and product launch.
          </p>

          <div className="bento-grid">
            <div className="bento-card bento-wide">
              <div className="bento-icon-box">
                <IconCode size={24} />
              </div>
              <h3>Shared Monaco IDE & Private GitHub Workspace</h3>
              <p>
                Collaborate in an authentic browser-based Monaco editor. Files are committed directly
                to your team’s private GitHub repository with verified collaborator permissions.
              </p>
              <div className="bento-badge-row">
                <span className="bento-chip">Zero Local Setup</span>
                <span className="bento-chip">GitHub OAuth</span>
                <span className="bento-chip">Conflict-Safe Saves</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon-box cyan">
                <IconDownload size={24} />
              </div>
              <h3>Instant Flutter App Parity</h3>
              <p>
                CraftHub runs as a shared ecosystem. Every project, direct message, reaction, and workspace update
                syncs live between web and the CraftHub Flutter mobile app.
              </p>
              <div className="bento-badge-row">
                <span className="bento-chip">iOS & Android</span>
                <span className="bento-chip">Single Database</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-icon-box pink">
                <IconAiMatch size={24} />
              </div>
              <h3>AI Builder Matchmaking</h3>
              <p>
                Connect with co-founders and developers who match your tech stack, skills, and creative interests.
                Form high-momentum squads in seconds.
              </p>
              <div className="bento-badge-row">
                <span className="bento-chip">Algorithmic Match</span>
                <span className="bento-chip">Skill Align</span>
              </div>
            </div>

            <div className="bento-card bento-wide">
              <div className="bento-icon-box purple">
                <IconMessages size={24} />
              </div>
              <h3>Real-Time Project Workspaces & Group Chat</h3>
              <p>
                Accepted project collaborators automatically unlock dedicated workspace channels.
                Supports rich replies, reactions, file downloads, and member GitHub readiness tracking.
              </p>
              <div className="bento-badge-row">
                <span className="bento-chip">Socket.IO Broadcasts</span>
                <span className="bento-chip">Role-Based Rooms</span>
              </div>
            </div>
          </div>
        </section>

        {/* CONTINUOUS TECH STACK TICKER */}
        <section className="tech-ticker-wrap">
          <div className="tech-ticker-label">ENGINEERED WITH MODERN HIGH-PERFORMANCE TECH</div>
          <div className="tech-marquee">
            <div className="marquee-track">
              {techBadges.concat(techBadges).map((item, idx) => (
                <div className="tech-chip" key={idx}>
                  <i className="tech-chip-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MOBILE SHOWCASE SECTION */}
        <section className="mobile-showcase-section" id="mobile">
          <div className="mobile-showcase-card">
            <div className="showcase-content">
              <div className="section-eyebrow">TAKE CRAFTHUB ANYWHERE</div>
              <h2>Built for Web and Phones in Perfect Sync</h2>
              <p>
                Stay connected with your project team wherever you go. Check GitHub PRs, message in workspace chats,
                browse feeds, and review collaborator requests from your mobile browser or native app.
              </p>
              <div className="showcase-buttons">
                <button
                  className="primary"
                  onClick={() => {
                    setView('signup');
                    window.location.hash = 'signup';
                  }}
                >
                  Join the Network Free →
                </button>
                <button
                  className="secondary"
                  onClick={() => flash('Download CraftHub for iOS & Android or open in your mobile browser.')}
                >
                  Mobile App Available
                </button>
              </div>
            </div>
            <div className="showcase-visual">
              <div className="phone-mockup">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div className="screen-header">
                    <img src="/brand/app-logo.png" alt="" className="phone-logo" />
                    <span>CraftHub Mobile</span>
                  </div>
                  <div className="screen-card">
                    <b>Next-Gen Design System</b>
                    <small>4 Collaborators · GitHub Synced</small>
                  </div>
                  <div className="screen-chat">
                    <div className="bubble left">Pushed the latest Monaco fix! 🚀</div>
                    <div className="bubble right">Reviewing & merging now.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION BANNER */}
        <section className="landing-cta-banner" id="community">
          <div className="cta-banner-inner">
            <div className="sparkle-float">
              <IconSparkles size={36} />
            </div>
            <h2>Ready to build what’s next?</h2>
            <p>Join creators and engineers shipping real software on CraftHub right now.</p>
            <div className="cta-banner-buttons">
              <button
                className="primary large-cta"
                onClick={() => {
                  setView('signup');
                  setStep('form');
                  setErr('');
                  window.location.hash = 'signup';
                }}
              >
                Create your account free →
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setView('login');
                  setStep('form');
                  setErr('');
                  window.location.hash = 'login';
                }}
              >
                Log into workspace
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-mark">
                <img src="/brand/app-logo.png" alt="" />
              </span>
              <span>
                Craft<span className="brand-light">Hub</span>
              </span>
            </div>
            <p>The open collaboration network for builders, engineers, and creators.</p>
          </div>
          <div className="footer-col">
            <b>Product</b>
            <a href="#features">Features</a>
            <a href="#monaco">Monaco Cloud IDE</a>
            <a href="#mobile">Mobile App</a>
          </div>
          <div className="footer-col">
            <b>Community</b>
            <a href="#community">Explore Builders</a>
            <a href="#features">Projects</a>
            <a href="#features">AI Matchmaking</a>
          </div>
          <div className="footer-col">
            <b>Legal</b>
            <a href="#">Guidelines</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CraftHub · Built for builders</span>
          <span>CraftHub Web & Mobile Unified Platform</span>
        </div>
      </footer>

      {/* AUTH MODAL / DRAWER (WHEN VIEW IS 'login' OR 'signup') */}
      {isAuthModal && (
        <div className="auth-overlay-backdrop">
          <div className="auth-modal-card">
            <div className="auth-card-head">
              <button
                type="button"
                className="auth-back-btn"
                onClick={() => {
                  setView('landing');
                  window.history.replaceState(null, '', ' ');
                }}
              >
                <IconArrowLeft size={16} />
                <span>Explore CraftHub</span>
              </button>

              <div className="auth-brand-mini">
                <img src="/brand/app-logo.png" alt="" />
                <span>CraftHub</span>
              </div>
            </div>

            <div className="auth-mode-switch">
              <button
                className={`mode-tab ${view === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setView('login');
                  setStep('form');
                  setErr('');
                  window.location.hash = 'login';
                }}
              >
                Log in
              </button>
              <button
                className={`mode-tab ${view === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setView('signup');
                  setStep('form');
                  setErr('');
                  window.location.hash = 'signup';
                }}
              >
                Create account
              </button>
            </div>

            <div className="auth-card-body">
              <div className="eyebrow">
                {step === 'otp'
                  ? 'ONE-TIME EMAIL VERIFICATION'
                  : view === 'login'
                  ? 'WELCOME BACK, BUILDER'
                  : 'JOIN THE COMMUNITY'}
              </div>
              <h2 className="auth-title">
                {step === 'otp'
                  ? 'Check your inbox'
                  : view === 'login'
                  ? 'Sign in to your workspace'
                  : 'Start building on CraftHub'}
              </h2>
              <p className="auth-subtitle">
                {step === 'otp'
                  ? `Enter the 6-digit verification code sent to ${email}.`
                  : view === 'login'
                  ? 'Access your collaborated projects, Monaco workspaces, and conversations.'
                  : 'Find teammates, share code, and ship software with full mobile sync.'}
              </p>

              {step === 'form' ? (
                <form onSubmit={submit} className="auth-form-styled">
                  {view === 'signup' && (
                    <div className="auth-form-row-2">
                      <label>
                        Full name
                        <input
                          required
                          value={form.name}
                          onChange={(e) => setField('name', e.target.value)}
                          placeholder="Alex Morgan"
                        />
                      </label>
                      <label>
                        Username
                        <input
                          required
                          value={form.username}
                          onChange={(e) => setField('username', e.target.value)}
                          placeholder="alexmorgan"
                        />
                      </label>
                    </div>
                  )}

                  <label>
                    Email address
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                    />
                  </label>

                  <label>
                    Password
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder={
                        view === 'login'
                          ? 'Enter your account password'
                          : 'Create a password (minimum 7 characters)'
                      }
                    />
                  </label>

                  {view === 'signup' && (
                    <>
                      <label>
                        Short bio <span className="optional">optional</span>
                        <textarea
                          rows="2"
                          value={form.bio}
                          onChange={(e) => setField('bio', e.target.value)}
                          placeholder="What stacks are you working with or excited about?"
                        />
                      </label>

                      <div className="genre-select">
                        <span>Pick your primary interests</span>
                        <div className="genre-pills">
                          {genres.map((g) => (
                            <button
                              type="button"
                              className={selected.includes(g) ? 'selected' : ''}
                              onClick={() =>
                                setSelected((s) =>
                                  s.includes(g) ? s.filter((x) => x !== g) : [...s, g]
                                )
                              }
                              key={g}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <button className="primary full auth-submit-btn" disabled={busy}>
                    {busy
                      ? 'Please wait…'
                      : view === 'login'
                      ? 'Sign in to workspace →'
                      : 'Create account & verify →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={verify} className="auth-form-styled">
                  <label>
                    6-Digit Verification Code
                    <input
                      required
                      inputMode="numeric"
                      maxLength="6"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="000000"
                      className="otp-input-field"
                      autoFocus
                    />
                  </label>
                  <button className="primary full auth-submit-btn" disabled={busy}>
                    {busy ? 'Verifying…' : 'Verify & Continue →'}
                  </button>
                  <div className="otp-actions-row">
                    <button type="button" className="text-button" onClick={resend}>
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="text-button muted"
                      onClick={() => setStep('form')}
                    >
                      Use another email
                    </button>
                  </div>
                </form>
              )}

              {err && <div className="form-error">{err}</div>}

              <div className="auth-footer-terms">
                By continuing, you agree to CraftHub community guidelines and terms of service.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
