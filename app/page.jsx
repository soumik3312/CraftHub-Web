"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  CollaborationHub,
  CollaborationProjectDetail,
  ProjectWorkspaceChat,
} from './collaboration-workspace';
import {
  IconAiMatch,
  IconArrowLeft,
  IconArrowUp,
  IconCheck,
  IconClose,
  IconCode,
  IconCollab,
  IconComment,
  IconCraftBro,
  IconDots,
  IconDownload,
  IconEdit,
  IconExplore,
  IconExternal,
  IconGitHub,
  IconHeart,
  IconHome,
  IconImage,
  IconMessages,
  IconPeople,
  IconPlus,
  IconProjects,
  IconRefresh,
  IconSearch,
  IconSend,
  IconSettings,
  IconShare,
  IconSignOut,
  IconSparkles,
  IconSuggest,
  IconTrash,
} from './icons';

const API = (process.env.NEXT_PUBLIC_API_BASE || 'https://crafthub-backend.onrender.com').replace(/\/$/, '');
const APP_DOWNLOAD = process.env.NEXT_PUBLIC_ANDROID_APP_URL || process.env.NEXT_PUBLIC_IOS_APP_URL || '';
const genres = [
  'App development',
  'IoT',
  'AI / ML',
  'Cybersecurity',
  'Cloud',
  'Web development',
  'Game development',
  'Data science',
  'DevOps',
  'Blockchain',
  'UI / UX',
  'Open source',
];

const nav = [
  [IconHome, 'Home', 'feed'],
  [IconExplore, 'Explore', 'explore'],
  [IconProjects, 'Projects', 'projects'],
  [IconPeople, 'People', 'people'],
  [IconMessages, 'Messages', 'messages'],
  [IconCraftBro, 'CraftBro AI', 'craftbro'],
  [IconSearch, 'Search', 'search'],
];

function avatar(user, size = '') {
  const imageUrl = user?.avatarUrl ? asset(user.avatarUrl) : '';
  return (
    <div
      className={`avatar ${size}`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
      aria-hidden="true"
    >
      {!imageUrl && (user?.name || user?.username || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

function asset(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API}${url}`;
}

async function request(path, { method = 'GET', body, token, form = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers,
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.code = data.code;
    throw error;
  }
  return data;
}

function timeAgo(date) {
  if (!date) return 'just now';
  const n = Math.floor((Date.now() - new Date(date)) / 60000);
  if (n < 1) return 'just now';
  if (n < 60) return `${n}m ago`;
  if (n < 1440) return `${Math.floor(n / 60)}h ago`;
  return `${Math.floor(n / 1440)}d ago`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('feed');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [systemTheme, setSystemTheme] = useState('dark');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => setSystemTheme(media.matches ? 'light' : 'dark');
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ch_token');
    if (saved) setToken(saved);
  }, []);

  const flash = useCallback((s) => {
    setNotice(s);
    setTimeout(() => setNotice(''), 3500);
  }, []);

  useEffect(() => {
    if (token) {
      request('/auth/me', { token })
        .then((d) => setUser(d.user || d))
        .catch(() => {
          localStorage.removeItem('ch_token');
          setToken(null);
          setUser(null);
        });
    }
  }, [token]);

  useEffect(() => {
    const route = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      if (h.startsWith('workspace-chat/')) {
        const [conversationId, projectId] = h.slice(15).split('/');
        if (conversationId && projectId) {
          setPage(`workspace-chat:${conversationId}:${projectId}`);
        }
      } else if (h.startsWith('project/')) {
        const [projectId, tab] = h.slice(8).split('/');
        if (projectId) {
          setPage(`project:${projectId}${tab ? `:${tab}` : ''}`);
        }
      } else if (h.startsWith('post/')) {
        setPage(`post:${h.slice(5)}`);
      } else if (h) {
        setPage(h);
      }
    };
    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);
    route();
    return () => {
      window.removeEventListener('hashchange', route);
      window.removeEventListener('popstate', route);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = io(API, { transports: ['websocket'], auth: { token } });
    socket.on('message_notification', () => setRefresh((x) => x + 1));
    socket.on('project_workspace_ready', () => setRefresh((x) => x + 1));
    socket.on('sync_event', () => setRefresh((x) => x + 1));
    return () => socket.disconnect();
  }, [token]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K focuses search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const signIn = (data) => {
    const t = data.token || data.accessToken;
    localStorage.setItem('ch_token', t);
    setToken(t);
    setUser(data.user);
    window.history.replaceState(null, '', '#feed');
    setPage('feed');
  };

  if (!token || !user) return <Auth onAuth={signIn} flash={flash} />;

  const change = (p) => {
    setPage(p);
    const hash = p.startsWith('project:')
      ? `project/${p.slice(8).split(':').map(encodeURIComponent).join('/')}`
      : p.startsWith('workspace-chat:')
      ? `workspace-chat/${p.slice(15).split(':').map(encodeURIComponent).join('/')}`
      : p.startsWith('post:')
      ? `post/${encodeURIComponent(p.slice(5))}`
      : p;
    if (window.location.hash !== `#${hash}`) {
      window.history.pushState(null, '', `#${hash}`);
    }
    if (p === 'feed' || p === 'projects' || p === 'people') {
      setRefresh((x) => x + 1);
    }
  };

  const themeMode = user.settings?.themeMode || 'dark';
  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  return (
    <div className="app-shell" data-theme={resolvedTheme}>
      <aside className="sidebar">
        <div className="brand" onClick={() => change('feed')}>
          <span className="brand-mark">
            <img src="/brand/app-logo.png" alt="" />
          </span>
          <span>
            Craft<span className="brand-light">Hub</span>
          </span>
        </div>

        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(([Icon, label, key]) => (
            <button
              key={key}
              className={`nav-item ${page === key ? 'active' : ''}`}
              onClick={() => change(key)}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span>{label}</span>
              {key === 'messages' && <i className="live-dot" />}
            </button>
          ))}
        </nav>

        <div className="side-label projects-label">CREATIVE LABS</div>
        <button
          className={`nav-item ${page === 'match' ? 'active' : ''}`}
          onClick={() => change('match')}
        >
          <span className="nav-icon">
            <IconAiMatch size={18} />
          </span>
          <span>AI Matchmaking</span>
          <span className="new-tag">AI</span>
        </button>
        <button
          className={`nav-item ${
            page === 'collab' || page.startsWith('project:') || page.startsWith('workspace-chat:')
              ? 'active'
              : ''
          }`}
          onClick={() => change('collab')}
        >
          <span className="nav-icon">
            <IconCollab size={18} />
          </span>
          <span>Collaboration</span>
          <span className="new-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>LIVE</span>
        </button>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="sparkle">
              <IconSparkles size={20} />
            </div>
            <b>
              Build the future
              <br />
              together.
            </b>
            <p>Find your co-founders, collaborators, and ship real code.</p>
            <button onClick={() => change('projects')}>
              Explore projects <IconExternal size={11} style={{ marginLeft: 4 }} />
            </button>
          </div>

          <button className="profile-mini" onClick={() => change('profile')}>
            {avatar(user)}
            <span>
              <b>{user.name}</b>
              <small>@{user.username}</small>
            </span>
            <span className="dots">
              <IconDots size={16} />
            </span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> <b>{pageTitle(page)}</b>
          </div>
          <div className="top-actions">
            <label className="top-search">
              <IconSearch size={15} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && change('search')}
                placeholder="Search projects, builders, skills..."
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" onClick={() => change('messages')} title="Messages">
              <IconMessages size={17} />
            </button>
            <button className="create-button" onClick={() => change('compose')}>
              <IconPlus size={15} /> <span>Create</span>
            </button>
          </div>
        </header>

        <div className="page-wrap">
          <Page
            page={page}
            setPage={change}
            token={token}
            user={user}
            query={query}
            setQuery={setQuery}
            flash={flash}
            refresh={refresh}
            onProfile={(id) => change(id ? `user:${id}` : `people`)}
            onLogout={() => {
              localStorage.removeItem('ch_token');
              setToken(null);
              setUser(null);
            }}
            onUser={setUser}
          />
        </div>
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function pageTitle(p) {
  if (p.startsWith('workspace-chat:')) return 'Project workspace chat';
  if (p.startsWith('project:')) return 'Project details & workspace';
  if (p.startsWith('post:')) return 'Community update';
  if (p.startsWith('user:')) return 'Creator profile';
  return (
    {
      feed: 'Community Feed',
      explore: 'Explore Ideas',
      projects: 'Projects Hub',
      people: 'Builders Directory',
      messages: 'Direct & Team Messages',
      craftbro: 'CraftBro AI Companion',
      search: 'Search CraftHub',
      match: 'AI Matchmaking',
      collab: 'Collaboration Hub',
      profile: 'Your Profile',
      compose: 'Share Update',
      settings: 'Preferences & Settings',
    }[p] || 'Workspace'
  );
}

function Auth({ onAuth, flash }) {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', username: '', password: '', bio: '' });
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState([]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (mode === 'signup') {
        const fd = new FormData();
        Object.entries({ ...form, email: email.trim().toLowerCase(), genres: selected.join(',') }).forEach(
          ([k, v]) => fd.append(k, v)
        );
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
      const d = await request('/auth/verify-register', { method: 'POST', body: { email: email.trim().toLowerCase(), code: code.trim() } });
      onAuth(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await request('/auth/resend-register', { method: 'POST', body: { email: email.trim().toLowerCase() } });
      flash('A fresh verification code has been sent.');
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-art">
        <div className="auth-art-top">
          <div className="brand">
            <span className="brand-mark">
              <img src="/brand/app-logo.png" alt="" />
            </span>
            <span>
              Craft<span className="brand-light">Hub</span>
            </span>
          </div>
          <div className="art-note">
            CREATORS, BUILDING WHAT’S NEXT ↗
          </div>
        </div>

        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />

        <div className="art-center">
          <span>
            <IconSparkles size={34} />
          </span>
          <b>
            Meet your next
            <br />
            co-builder.
          </b>
          <small>
            Good things happen when the right people connect.
            <br />
            Join the community of developers, creators, and tinkerers.
          </small>
        </div>

        <div className="art-stats">
          <div>
            <b>Build</b>
            <span>together</span>
          </div>
          <div>
            <b>Find</b>
            <span>your team</span>
          </div>
          <div>
            <b>Ship</b>
            <span>something real</span>
          </div>
        </div>

        <div className="auth-caption">The open community for builders and designers.</div>
      </div>

      <section className="auth-form-wrap">
        <div className="auth-switch">
          <span>{mode === 'login' ? 'New to CraftHub?' : 'Already building?'}</span>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setStep('form');
              setErr('');
            }}
          >
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </div>

        <div className="auth-form-inner">
          <div className="eyebrow">{step === 'otp' ? 'ONE QUICK CHECK' : 'YOUR NEXT CHAPTER'}</div>
          <h1>
            {step === 'otp'
              ? 'Check your inbox'
              : mode === 'login'
              ? 'Welcome back.'
              : 'Start building.'}
          </h1>
          <p className="auth-sub">
            {step === 'otp'
              ? `Enter the 6-digit code we sent to ${email}.`
              : 'Find collaborators, share progress, and build something worth showing.'}
          </p>

          {step === 'form' ? (
            <form onSubmit={submit} className="auth-form">
              {mode === 'signup' && (
                <>
                  <label>
                    Full name
                    <input
                      required
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Alex Morgan"
                    />
                  </label>
                  <label>
                    Username
                    <input
                      required
                      value={form.username}
                      onChange={(e) => set('username', e.target.value)}
                      placeholder="alexmorgan"
                    />
                  </label>
                </>
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
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={mode === 'login' ? 'Enter your account password' : 'Create a secure password'}
                />
              </label>

              {mode === 'signup' && (
                <>
                  <label>
                    Short bio <span className="optional">optional</span>
                    <textarea
                      value={form.bio}
                      onChange={(e) => set('bio', e.target.value)}
                      placeholder="What are you building or interested in?"
                      rows="2"
                    />
                  </label>
                  <div className="genre-select">
                    <span>What are you into?</span>
                    <div>
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

              <button className="primary full" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Continue →' : 'Create account →'}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="auth-form">
              <label>
                Verification code
                <input
                  required
                  inputMode="numeric"
                  maxLength="6"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="otp-input"
                />
              </label>
              <button className="primary full" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify and continue →'}
              </button>
              <button type="button" className="text-button" onClick={resend}>
                Resend code
              </button>
              <button
                type="button"
                className="text-button muted"
                onClick={() => setStep('form')}
              >
                Use a different email
              </button>
            </form>
          )}

          {err && <div className="form-error">{err}</div>}
          <div className="auth-terms">By continuing, you agree to the CraftHub community guidelines.</div>
        </div>

        <div className="auth-footer">
          © 2026 CraftHub <span>Built for the builders.</span>
        </div>
      </section>
    </div>
  );
}

function Page({
  page,
  setPage,
  token,
  user,
  query,
  setQuery,
  flash,
  refresh,
  onProfile,
  onLogout,
  onUser,
}) {
  if (page === 'collab') {
    return (
      <CollaborationHub
        token={token}
        user={user}
        flash={flash}
        refresh={refresh}
        onProfile={onProfile}
        setPage={setPage}
        api={request}
        asset={asset}
      />
    );
  }
  if (page.startsWith('project:')) {
    const [id, initialTab] = page.slice(8).split(':');
    return (
      <CollaborationProjectDetail
        id={id}
        initialTab={initialTab || 'overview'}
        token={token}
        user={user}
        flash={flash}
        refresh={refresh}
        onProfile={onProfile}
        setPage={setPage}
        api={request}
        asset={asset}
        apiBase={API}
      />
    );
  }
  if (page.startsWith('workspace-chat:')) {
    const [, conversationId, projectId] = page.split(':');
    return (
      <ProjectWorkspaceChat
        conversationId={conversationId}
        projectId={projectId}
        token={token}
        user={user}
        flash={flash}
        onProfile={onProfile}
        setPage={setPage}
        api={request}
        asset={asset}
        apiBase={API}
      />
    );
  }
  if (page.startsWith('post:')) {
    return (
      <PostDetail
        id={page.slice(5)}
        token={token}
        user={user}
        flash={flash}
        onProfile={onProfile}
      />
    );
  }
  if (page === 'feed') {
    return (
      <Feed
        token={token}
        user={user}
        flash={flash}
        refresh={refresh}
        onProfile={onProfile}
        setPage={setPage}
      />
    );
  }
  if (page === 'compose') {
    return <Compose token={token} user={user} flash={flash} done={() => setPage('feed')} />;
  }
  if (page === 'projects') {
    return (
      <Projects
        token={token}
        user={user}
        flash={flash}
        refresh={refresh}
        onProfile={onProfile}
      />
    );
  }
  if (page === 'explore') {
    return <Explore token={token} user={user} refresh={refresh} onProfile={onProfile} />;
  }
  if (page === 'people' || page === 'match') {
    return (
      <People
        token={token}
        page={page}
        user={user}
        flash={flash}
        onProfile={onProfile}
        setPage={setPage}
      />
    );
  }
  if (page === 'messages') {
    return <Messages token={token} user={user} flash={flash} refresh={refresh} />;
  }
  if (page === 'craftbro') {
    return <CraftBro token={token} flash={flash} />;
  }
  if (page === 'search') {
    return (
      <Search
        token={token}
        query={query}
        setQuery={setQuery}
        onProfile={onProfile}
        setPage={setPage}
      />
    );
  }
  if (page === 'profile') {
    return (
      <Profile
        token={token}
        user={user}
        onUser={onUser}
        flash={flash}
        onLogout={onLogout}
        setPage={setPage}
        refresh={refresh}
      />
    );
  }
  if (page === 'settings') {
    return (
      <Settings
        token={token}
        user={user}
        flash={flash}
        onLogout={onLogout}
        onUser={onUser}
      />
    );
  }
  if (page.startsWith('user:')) {
    return (
      <PublicProfile
        token={token}
        userId={page.slice(5)}
        onProfile={onProfile}
        flash={flash}
        setPage={setPage}
        refresh={refresh}
      />
    );
  }
  return (
    <Profile
      token={token}
      user={user}
      onUser={onUser}
      flash={flash}
      onLogout={onLogout}
      setPage={setPage}
      refresh={refresh}
    />
  );
}

function Feed({ token, user, flash, refresh, onProfile, setPage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () =>
      request('/posts/feed', { token })
        .then((d) => {
          if (live) setPosts(d.posts || []);
        })
        .catch((e) => {
          if (live) flash(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    load();
    const timer = setInterval(load, 90000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [token, refresh, flash]);

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR COMMUNITY, TODAY</div>
          <h1>
            {getGreeting()}, {user.name?.split(' ')[0] || 'builder'}{' '}
            <span className="wave">✦</span>
          </h1>
          <p>Here is what the builder community is shipping today.</p>
        </div>
        <button className="primary" onClick={() => setComposer(!composer)}>
          <IconPlus size={15} /> Share an update
        </button>
      </div>

      <div className="content-grid">
        <section className="feed-column">
          {composer && (
            <ComposeInline
              token={token}
              user={user}
              flash={flash}
              close={() => setComposer(false)}
            />
          )}
          <div className="section-head">
            <div>
              <h2>Your feed</h2>
              <span>Fresh updates from your network</span>
            </div>
            <button className="filter-pill">Following updates</button>
          </div>
          {loading ? (
            <div className="loading-card">Gathering latest community updates…</div>
          ) : posts.length ? (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                token={token}
                user={user}
                onProfile={onProfile}
                flash={flash}
              />
            ))
          ) : (
            <div className="empty-card">
              <div className="empty-icon">
                <IconSparkles size={24} />
              </div>
              <h3>Your feed is yours to shape.</h3>
              <p>Follow builders you admire or publish the first project update.</p>
              <button className="primary" onClick={() => setComposer(true)}>
                <IconPlus size={14} /> Share an update
              </button>
            </div>
          )}
        </section>

        <aside className="right-rail">
          <CommunityCard token={token} onProfile={onProfile} />
          <div className="tip-card">
            <span className="tip-icon">
              <IconSparkles size={20} />
            </span>
            <div>
              <b>Small steps, shipped.</b>
              <p>Share what you are building. Your next co-builder might be reading right now.</p>
            </div>
            <button onClick={() => setComposer(true)}>
              Post an update <IconExternal size={11} style={{ marginLeft: 3 }} />
            </button>
          </div>
          <Footer />
        </aside>
      </div>
    </>
  );
}

function ComposeInline({ token, user, flash, close }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !files.length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('text', text);
      [...files].forEach((f) => fd.append('images', f));
      await request('/posts/', { method: 'POST', body: fd, form: true, token });
      setText('');
      setFiles([]);
      close();
      flash('Your update is live on the feed.');
    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="compose-card" onSubmit={submit}>
      {avatar(user)}
      <div className="compose-body">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What are you building or exploring today?"
        />
        <div className="compose-actions">
          <label className="text-button">
            <IconImage size={15} /> Add images
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>
          <span>{files.length ? `${files.length} image(s) attached` : ''}</span>
          <button className="primary small" disabled={busy}>
            {busy ? 'Posting…' : 'Post update'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Compose({ token, user, flash, done }) {
  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">COMMUNITY UPDATE</div>
          <h1>Share something.</h1>
          <p>Give your work a little room to travel and find collaborators.</p>
        </div>
      </div>
      <div className="single-column">
        <ComposeInline token={token} user={user} flash={flash} close={done} />
      </div>
    </>
  );
}

function PostCard({ post, token, user, onProfile, flash }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [count, setCount] = useState(post.likeCount || 0);
  const [comments, setComments] = useState(false);
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [idea, setIdea] = useState('');
  const [menu, setMenu] = useState(false);

  async function like() {
    try {
      await request(`/posts/${post.id}/like`, { method: liked ? 'DELETE' : 'POST', token });
      setLiked(!liked);
      setCount(count + (liked ? -1 : 1));
    } catch (e) {
      flash(e.message);
    }
  }

  async function comment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const d = await request(`/posts/${post.id}/comment`, { method: 'POST', body: { text }, token });
      setRows([...rows, d.comment]);
      setText('');
    } catch (e) {
      flash(e.message);
    }
  }

  async function showComments() {
    if (!comments) {
      const d = await request(`/posts/${post.id}/comments`, { token });
      setRows(d.comments || []);
    }
    setComments(!comments);
  }

  async function showSuggestions() {
    if (!suggestions) {
      const d = await request(`/posts/${post.id}/comments`, { token });
      setIdeas(d.suggestions || []);
    }
    setSuggestions(!suggestions);
  }

  async function suggest(e) {
    e.preventDefault();
    if (!idea.trim()) return;
    try {
      const d = await request(`/posts/${post.id}/suggest`, { method: 'POST', body: { text: idea }, token });
      setIdeas([...ideas, d.suggestion]);
      setIdea('');
    } catch (e) {
      flash(e.message);
    }
  }

  async function share() {
    try {
      await request(`/posts/${post.id}/share`, { method: 'POST', token });
      await navigator.clipboard.writeText(`${location.origin}/#post/${post.id}`);
      flash('Post link copied to clipboard.');
    } catch {
      flash('Could not copy post link.');
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await request(`/posts/${post.id}`, { method: 'DELETE', token });
      flash('Post deleted.');
    } catch (e) {
      flash(e.message);
    }
    setMenu(false);
  }

  const isOwner = post.author?.id === user?.id;

  return (
    <article className="post-card">
      <div className="post-head">
        <button className="author-button" onClick={() => onProfile(post.author?.id)}>
          {avatar(post.author)}
          <span>
            <b>{post.author?.name}</b>
            <small>
              @{post.author?.username} · {timeAgo(post.createdAt)}
            </small>
          </span>
        </button>
        <div className="post-menu">
          <button className="more" onClick={() => setMenu(!menu)}>
            <IconDots size={16} />
          </button>
          {menu && (
            <div className="post-menu-pop">
              {isOwner ? (
                <button className="danger-text" onClick={remove}>
                  <IconTrash size={13} style={{ marginRight: 6 }} /> Delete post
                </button>
              ) : (
                <button onClick={share}>
                  <IconShare size={13} style={{ marginRight: 6 }} /> Share post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="post-text">{post.text}</div>

      {post.imageUrls?.length > 0 && (
        <div className={`post-images n${Math.min(post.imageUrls.length, 2)}`}>
          {post.imageUrls.map((url, i) => (
            <img
              key={i}
              src={asset(url)}
              alt="Post attachment"
              onClick={() => window.open(asset(url), '_blank')}
            />
          ))}
        </div>
      )}

      <div className="post-meta">
        <span>{count} appreciations</span>
        <button onClick={showComments}>{post.commentCount || rows.length} comments</button>
      </div>

      <div className="post-actions">
        <button className={liked ? 'liked' : ''} onClick={like}>
          <IconHeart size={15} filled={liked} /> Appreciate
        </button>
        <button onClick={showComments}>
          <IconComment size={15} /> Comment
        </button>
        <button onClick={showSuggestions}>
          <IconSuggest size={15} /> Suggest Idea
        </button>
        <button onClick={share}>
          <IconShare size={15} /> Share
        </button>
      </div>

      {comments && (
        <div className="comments">
          <div className="comment-list">
            {rows.map((c) => (
              <div className="comment-row" key={c.id}>
                {avatar(c.author, 'tiny')}
                <div>
                  <b>{c.author?.name}</b>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={comment}>
            {avatar(user, 'tiny')}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a thoughtful comment…"
            />
            <button>Send ↗</button>
          </form>
        </div>
      )}

      {suggestions && (
        <div className="comments suggestions-box">
          <div className="comment-list">
            {ideas.map((c) => (
              <div className="comment-row" key={c.id}>
                {avatar(c.author, 'tiny')}
                <div>
                  <b>{c.author?.name}</b>
                  <p>{c.text}</p>
                </div>
              </div>
            ))}
            {!ideas.length && (
              <small className="suggestions-empty">
                No suggestions yet. Share an idea to help this project!
              </small>
            )}
          </div>
          <form onSubmit={suggest}>
            {avatar(user, 'tiny')}
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Suggest an idea or improvement…"
            />
            <button>Suggest ↗</button>
          </form>
        </div>
      )}
    </article>
  );
}

function PostDetail({ id, token, user, flash, onProfile }) {
  const [post, setPost] = useState(null);
  useEffect(() => {
    request(`/posts/${id}`, { token })
      .then((d) => setPost(d.post || null))
      .catch((e) => flash(e.message));
  }, [id, token, flash]);

  return (
    <div className="single-column">
      <button className="back-link" onClick={() => (location.hash = 'feed')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <IconArrowLeft size={14} /> Back to feed
      </button>
      {post ? (
        <PostCard post={post} token={token} user={user} onProfile={onProfile} flash={flash} />
      ) : (
        <div className="loading-card">Opening update…</div>
      )}
    </div>
  );
}

function CommunityCard({ token, onProfile }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    request('/users/suggestions', { token })
      .then((d) => setUsers((d.users || []).slice(0, 3)))
      .catch(() => {});
  }, [token]);

  return (
    <div className="rail-card">
      <div className="rail-head">
        <div>
          <h3>Builders to know</h3>
          <span>Recommended creators</span>
        </div>
        <button onClick={() => onProfile(null)}>
          <IconExternal size={14} />
        </button>
      </div>
      {users.map((u) => (
        <button className="suggestion" key={u.id} onClick={() => onProfile(u.id)}>
          {avatar(u, 'small')}
          <span>
            <b>{u.name}</b>
            <small>@{u.username}</small>
          </span>
          <span className="suggest-arrow">↗</span>
        </button>
      ))}
      {!users.length && <div className="rail-empty">Follow builders to grow your network.</div>}
      <button className="rail-link" onClick={() => (location.hash = 'people')}>
        Discover more builders <IconExternal size={11} style={{ marginLeft: 4 }} />
      </button>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer-links">
      <div>About &nbsp;·&nbsp; Guidelines &nbsp;·&nbsp; Privacy &nbsp;·&nbsp; GitHub</div>
      <span>© 2026 CraftHub · Built for builders</span>
    </div>
  );
}

function Projects({ token, user, flash, refresh, onProfile }) {
  const [projects, setProjects] = useState([]);
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState('discover');
  const [cursor, setCursor] = useState(null);
  const [moreBusy, setMoreBusy] = useState(false);

  useEffect(() => {
    if (tab === 'discover') {
      request('/projects/explore', { token })
        .then((d) => {
          setProjects(d.projects || []);
          setCursor(d.nextCursor || null);
        })
        .catch((e) => flash(e.message));
    } else {
      request('/projects/mine', { token })
        .then((d) => {
          setProjects(d.projects || [...(d.owned || []), ...(d.collaborating || [])]);
          setCursor(null);
        })
        .catch((e) => flash(e.message));
    }
  }, [token, tab, refresh, flash]);

  async function loadMore() {
    if (!cursor || moreBusy) return;
    setMoreBusy(true);
    try {
      const d = await request(`/projects/explore?cursor=${encodeURIComponent(cursor)}`, { token });
      setProjects((rows) => [...rows, ...(d.projects || [])]);
      setCursor(d.nextCursor || null);
    } catch (e) {
      flash(e.message);
    } finally {
      setMoreBusy(false);
    }
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">IDEAS IN MOTION</div>
          <h1>Projects</h1>
          <p>Find work that sparks something. Or launch your own.</p>
        </div>
        <button className="primary" onClick={() => setShow(!show)}>
          <IconPlus size={15} /> New project
        </button>
      </div>

      {show && (
        <ProjectCreate
          token={token}
          flash={flash}
          done={() => {
            setShow(false);
            if (tab === 'mine') {
              request('/projects/mine', { token }).then((d) =>
                setProjects(d.projects || [...(d.owned || []), ...(d.collaborating || [])])
              );
            }
          }}
        />
      )}

      <div className="tabs">
        <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>
          Discover Projects
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My Projects
        </button>
      </div>

      <div className="project-grid">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            p={p}
            onClick={() => (location.hash = `project/${p.id}`)}
            onProfile={onProfile}
          />
        ))}
        {projects.length === 0 && (
          <div className="empty-card" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">
              <IconCode size={24} />
            </div>
            <h3>
              {tab === 'mine' ? 'Your next project starts here.' : 'The next great idea is waiting.'}
            </h3>
            <p>Browse projects and find your place on an ambitious team.</p>
            <button className="primary" onClick={() => setShow(true)}>
              <IconPlus size={14} /> Create a project
            </button>
          </div>
        )}
      </div>

      {tab === 'discover' && cursor && (
        <div className="load-more-row">
          <button className="secondary" disabled={moreBusy} onClick={loadMore}>
            {moreBusy ? 'Loading…' : 'Load more projects ↓'}
          </button>
        </div>
      )}
    </>
  );
}

function ProjectCard({ p, onClick, onProfile }) {
  const image = p.imageUrls?.[0];
  return (
    <article className="project-card" onClick={onClick}>
      {image ? (
        <img className="project-cover" src={asset(image)} alt="" />
      ) : (
        <div className="project-cover cover-gradient">
          <IconCode size={34} />
        </div>
      )}
      <div className="project-info">
        <div className="project-tags">
          {(p.genres || []).slice(0, 2).map((g) => (
            <span key={g}>{g}</span>
          ))}
          <span className="project-date">{timeAgo(p.updatedAt || p.createdAt)}</span>
        </div>
        <h3>{p.title}</h3>
        <p>{p.description || 'A project looking for its next collaborator.'}</p>
        <div className="project-bottom">
          <button
            className="author-button"
            onClick={(e) => {
              e.stopPropagation();
              onProfile(p.owner?.id || p.ownerId);
            }}
          >
            {avatar(p.owner, 'tiny')}
            <span>{p.owner?.name || 'CraftHub member'}</span>
          </button>
          <span>
            <IconPeople size={12} style={{ marginRight: 4, verticalAlign: -1 }} />{' '}
            {p.collaboratorIds?.length || p.collaborators?.length || 0} members
          </span>
        </div>
      </div>
    </article>
  );
}

function ProjectCreate({ token, flash, done }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [genresSel, setGenresSel] = useState([]);
  const [tech, setTech] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('githubUrl', githubUrl);
      fd.append('genres', genresSel.join(','));
      fd.append(
        'techStack',
        tech
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')
      );
      [...files].forEach((f) => fd.append('images', f));
      await request('/projects/', { method: 'POST', body: fd, form: true, token });
      flash('Project published.');
      done();
    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card project-create" onSubmit={submit}>
      <div className="section-head">
        <div>
          <h2>Start a project</h2>
          <span>Give collaborators enough context to join in.</span>
        </div>
        <button type="button" className="more" onClick={done}>
          <IconClose size={18} />
        </button>
      </div>
      <div className="form-grid">
        <label>
          Project name
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Next-gen Design Tool"
          />
        </label>
        <label>
          GitHub repository <span className="optional">optional</span>
          <input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/you/repo"
          />
        </label>
        <label className="span-two">
          Description
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you making, and who would you love to build it with?"
          />
        </label>
        <label>
          Tech stack
          <input
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            placeholder="React, Next.js, Node.js, Tailwind"
          />
        </label>
        <label>
          Project images
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
        </label>
      </div>
      <div className="genre-select">
        <span>Pick a few categories</span>
        <div>
          {genres.map((g) => (
            <button
              type="button"
              className={genresSel.includes(g) ? 'selected' : ''}
              onClick={() =>
                setGenresSel((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]))
              }
              key={g}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <button className="primary" disabled={busy}>
        {busy ? 'Publishing…' : 'Publish project ↗'}
      </button>
    </form>
  );
}

function Explore({ token, user, onProfile, refresh }) {
  const [projects, setProjects] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request('/projects/explore', { token })
      .then((d) => {
        setProjects(d.projects || []);
        setCursor(d.nextCursor || null);
      })
      .catch(() => {});
  }, [token, refresh]);

  async function more() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const d = await request(`/projects/explore?cursor=${encodeURIComponent(cursor)}`, { token });
      setProjects((rows) => [...rows, ...(d.projects || [])]);
      setCursor(d.nextCursor || null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">OPEN CALLS & NEW IDEAS</div>
          <h1>Explore</h1>
          <p>Discover ambitious projects looking for teammates and contributors.</p>
        </div>
      </div>
      <div className="project-grid">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            p={p}
            onClick={() => (location.hash = `project/${p.id}`)}
            onProfile={onProfile}
          />
        ))}
      </div>
      {cursor && (
        <div className="load-more-row">
          <button className="secondary" disabled={busy} onClick={more}>
            {busy ? 'Loading…' : 'Load more projects ↓'}
          </button>
        </div>
      )}
    </>
  );
}

function People({ token, page, user, flash, onProfile, setPage }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (page === 'match') {
      setLoading(false);
      return;
    }
    request('/users/suggestions', { token })
      .then((d) => setUsers(d.users || []))
      .catch((e) => flash(e.message))
      .finally(() => setLoading(false));
  }, [token, page, flash]);

  if (page === 'match') {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">AI POWERED DISCOVERY</div>
            <h1>AI Matchmaking</h1>
            <p>Find your next co-builder with interest-aware recommendations.</p>
          </div>
        </div>
        <div className="match-download">
          <div className="match-orbit">
            <IconAiMatch size={30} />
          </div>
          <div className="eyebrow">A CRAFTHUB APP FEATURE</div>
          <h2>
            Find your people,
            <br />
            wherever you build.
          </h2>
          <p>
            AI Matchmaking is available exclusively in the CraftHub mobile app. Download it to scan
            your interests and discover teammates matched directly to your skillsets.
          </p>
          <div className="download-actions">
            {APP_DOWNLOAD ? (
              <a className="primary" href={APP_DOWNLOAD} target="_blank" rel="noreferrer">
                Download the app <IconExternal size={12} style={{ marginLeft: 4 }} />
              </a>
            ) : (
              <button
                className="primary"
                onClick={() =>
                  flash('Set NEXT_PUBLIC_ANDROID_APP_URL or NEXT_PUBLIC_IOS_APP_URL in .env to enable the download link.')
                }
              >
                Download the app <IconExternal size={12} style={{ marginLeft: 4 }} />
              </button>
            )}
            <button className="secondary" onClick={() => setPage('people')}>
              Browse people on web
            </button>
          </div>
          <small>CraftHub AI Matchmaking · Powered by shared interests, skills, and project stacks</small>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR CREATIVE NETWORK</div>
          <h1>People</h1>
          <p>Meet makers, engineers, and curious minds across the ecosystem.</p>
        </div>
        <button className="secondary" onClick={() => setPage('match')}>
          <IconAiMatch size={15} style={{ marginRight: 6 }} /> AI Matchmaking
        </button>
      </div>

      <div className="people-grid">
        {loading ? (
          <div className="loading-card" style={{ gridColumn: '1 / -1' }}>
            Finding active builders…
          </div>
        ) : (
          users.map((u) => (
            <div className="person-card" key={u.id}>
              {avatar(u)}
              <button className="person-name" onClick={() => onProfile(u.id)}>
                <b>{u.name}</b>
                <small>@{u.username}</small>
              </button>
              <p>{u.bio || 'Building something interesting on CraftHub.'}</p>
              <div className="chip-row">
                {(u.genres || []).slice(0, 3).map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>
              <div className="person-actions">
                <button
                  className="secondary small"
                  onClick={async () => {
                    try {
                      await request(`/users/${u.id}/follow`, { method: 'POST', token });
                      flash(`Following ${u.name}.`);
                    } catch (e) {
                      flash(e.message);
                    }
                  }}
                >
                  <IconPlus size={12} style={{ marginRight: 4 }} /> Follow
                </button>
                <button className="text-button" onClick={() => onProfile(u.id)}>
                  View profile →
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && !users.length && (
          <div className="empty-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Fresh connections are on the way.</h3>
            <p>Add interests and skills to your profile to get matched recommendations.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Messages({ token, user, flash, refresh }) {
  const [convs, setConvs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupIds, setGroupIds] = useState([]);
  const messagesEndRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await request('/conversations', { token });
      setConvs(d.conversations || []);
      setContacts(d.contacts || []);
      if (!selected && d.conversations?.length) setSelected(d.conversations[0].id);
    } catch (e) {
      flash(e.message);
    } finally {
      setLoading(false);
    }
  }, [flash, selected, token]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    let live = true;
    const pull = () =>
      request(`/conversations/${selected}/messages`, { token })
        .then((d) => {
          if (live) setMessages(d.messages || []);
        })
        .catch(() => {});
    pull();
    const timer = setInterval(pull, 60000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [selected, token, refresh]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    try {
      await request(`/conversations/${selected}/messages`, {
        method: 'POST',
        token,
        body: { text, replyToMessageId: reply?.id },
      });
      setText('');
      setReply(null);
      const d = await request(`/conversations/${selected}/messages`, { token });
      setMessages(d.messages || []);
    } catch (e) {
      flash(e.message);
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    try {
      const d = await request('/conversations/group', {
        method: 'POST',
        token,
        body: { name: groupName, userIds: groupIds },
      });
      setGroupOpen(false);
      setGroupName('');
      setGroupIds([]);
      await load();
      setSelected(d.id);
      flash('Group chat created.');
    } catch (e) {
      flash(e.message);
    }
  }

  async function startDm(id) {
    try {
      const d = await request('/conversations/dm', { method: 'POST', token, body: { userId: id } });
      await load();
      setSelected(d.id);
    } catch (e) {
      flash(e.message);
    }
  }

  async function react(message, emoji) {
    try {
      const d = await request(`/conversations/${selected}/messages/${message.id}/react`, {
        method: 'POST',
        token,
        body: { emoji },
      });
      setMessages((rows) => rows.map((m) => (m.id === message.id ? d.message : m)));
    } catch (e) {
      flash(e.message);
    }
  }

  const active = convs.find((c) => c.id === selected);

  return (
    <div className="chat-window">
      <aside className="chat-list">
        <div className="chat-list-head">
          <div>
            <h2>Messages</h2>
            <span>Your conversations</span>
          </div>
          <button
            className="icon-button"
            onClick={() => setGroupOpen((v) => !v)}
            title="Create a group chat"
          >
            <IconPlus size={16} />
          </button>
        </div>

        {groupOpen && (
          <form className="group-create" onSubmit={createGroup}>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
            />
            <div className="group-contacts">
              {contacts.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={groupIds.includes(c.id)}
                    onChange={() =>
                      setGroupIds((ids) =>
                        ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <button className="primary small" disabled={groupIds.length === 0}>
              Create group
            </button>
          </form>
        )}

        {loading ? (
          <div className="rail-empty">Loading chats…</div>
        ) : (
          convs.map((c) => (
            <button
              className={`chat-row ${selected === c.id ? 'active' : ''}`}
              key={c.id}
              onClick={() => setSelected(c.id)}
            >
              {avatar(c.otherUsers?.[0], 'small')}
              <span>
                <b>{c.name}</b>
                <small>{c.lastMessageText || 'Start the conversation'}</small>
              </span>
              {c.unreadCount > 0 && <i className="unread-badge">{c.unreadCount}</i>}
            </button>
          ))
        )}

        {contacts.length > 0 && (
          <>
            <div className="chat-list-subhead">COLLABORATORS</div>
            {contacts
              .filter((c) => !convs.some((v) => v.otherUsers?.some((o) => o.id === c.id)))
              .map((c) => (
                <button className="chat-row" key={c.id} onClick={() => startDm(c.id)}>
                  {avatar(c, 'small')}
                  <span>
                    <b>{c.name}</b>
                    <small>@{c.username} · Start chat</small>
                  </span>
                </button>
              ))}
          </>
        )}

        {!loading && !convs.length && !contacts.length && (
          <div className="rail-empty">Chats unlock as you collaborate on projects.</div>
        )}
      </aside>

      <section className="chat-main">
        {active ? (
          <>
            <div className="chat-header">
              {avatar(active.otherUsers?.[0], 'small')}
              <div>
                <b>{active.name}</b>
                <small>
                  {active.type === 'group' ? 'Project workspace chat' : 'CraftHub conversation'}
                </small>
              </div>
              <span className="online-pill">
                <i /> Active conversation
              </span>
            </div>

            <div className="message-list">
              {messages.map((m) => (
                <div
                  className={`message-row ${m.sender?.id === user.id ? 'mine' : ''}`}
                  key={m.id}
                >
                  {m.sender?.id !== user.id && avatar(m.sender, 'tiny')}
                  <div className="message-bubble">
                    {m.replyTo && (
                      <small className="message-reply">
                        ↪ {m.replyTo.sender?.name || 'Reply'}: {m.replyTo.text}
                      </small>
                    )}
                    <p>{m.text}</p>
                    <small>{timeAgo(m.createdAt)}</small>
                    <div className="message-tools">
                      <button onClick={() => setReply(m)}>Reply</button>
                      {['👍', '❤️', '🔥', '🚀', '😂'].map((emoji) => (
                        <button key={emoji} onClick={() => react(m, emoji)}>
                          {emoji}
                          {m.reactions?.filter((r) => r.emoji === emoji).length || ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {reply && (
              <div className="replying-to">
                Replying to {reply.sender?.name || 'message'}: {reply.text?.slice(0, 90)}{' '}
                <button onClick={() => setReply(null)}>×</button>
              </div>
            )}

            <form className="message-form" onSubmit={send}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message…"
              />
              <button className="primary">
                <IconSend size={14} style={{ marginRight: 6 }} /> Send
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <span>
              <IconMessages size={36} />
            </span>
            <h2>Your next conversation starts here.</h2>
            <p>Select a chat from the left or connect on a project to open a shared conversation.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Search({ token, query, setQuery, onProfile, setPage }) {
  const [results, setResults] = useState(null);
  const [type, setType] = useState('all');

  useEffect(() => {
    if (!query?.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(
      () =>
        request(
          `/search?q=${encodeURIComponent(query)}&type=${
            type === 'users' ? 'user' : type === 'projects' ? 'project' : 'all'
          }`,
          { token }
        )
          .then(setResults)
          .catch(() => setResults({ users: [], projects: [] })),
      250
    );
    return () => clearTimeout(t);
  }, [query, type, token]);

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">FIND YOUR NEXT THING</div>
          <h1>Search CraftHub</h1>
          <p>People, projects, technologies, and ideas across the platform.</p>
        </div>
      </div>

      <label className="big-search">
        <IconSearch size={20} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try ‘fullstack’, ‘AI tools’, or a teammate's handle…"
        />
      </label>

      <div className="tabs">
        {['all', 'users', 'projects'].map((t) => (
          <button className={type === t ? 'active' : ''} onClick={() => setType(t)} key={t}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {!query ? (
        <div className="empty-card">
          <div className="empty-icon">
            <IconSearch size={22} />
          </div>
          <h3>What are you looking for?</h3>
          <p>Search builder handles, skills, open-source projects, and more.</p>
        </div>
      ) : results === null ? (
        <div className="loading-card">Searching the network…</div>
      ) : (
        <div className="search-results">
          {(results.users || results.people || []).map((u) => (
            <button className="suggestion result-row" key={u.id} onClick={() => onProfile(u.id)}>
              {avatar(u, 'small')}
              <span>
                <b>{u.name}</b>
                <small>
                  @{u.username} · {u.bio || 'CraftHub member'}
                </small>
              </span>
              <IconExternal size={14} />
            </button>
          ))}
          {(results.projects || []).map((p) => (
            <button
              className="suggestion result-row"
              key={p.id}
              onClick={() => setPage(`project:${p.id}`)}
            >
              <span className="result-icon">
                <IconCode size={18} />
              </span>
              <span>
                <b>{p.title}</b>
                <small>{p.description}</small>
              </span>
              <IconExternal size={14} />
            </button>
          ))}
          {!(results.users?.length || results.people?.length || results.projects?.length) && (
            <div className="empty-card">
              <h3>No results found for “{query}”</h3>
              <p>Try searching for different keywords or check spelling.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Profile({ token, user, onUser, flash, onLogout, setPage, refresh }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name || '',
    username: user.username || '',
    bio: user.bio || '',
  });
  const [selectedGenres, setSelectedGenres] = useState(user.genres || []);
  const [avatarFile, setAvatarFile] = useState(null);
  const [github, setGithub] = useState(null);
  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [tab, setTab] = useState('posts');
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    request(`/posts/user/${user.id}`, { token })
      .then((d) => setPosts(d.posts || []))
      .catch(() => {});
    request(`/users/${user.id}/public`, { token })
      .then((d) => setCounts({ followers: d.followerCount || 0, following: d.followingCount || 0 }))
      .catch(() => {});
    request('/github/status', { token })
      .then((d) =>
        setGithub({
          connected: d.user?.githubConnected,
          username: d.user?.githubUsername,
          configured: d.configured,
        })
      )
      .catch(() => {});
  }, [user.id, token, refresh]);

  async function openNetwork(type) {
    try {
      const d = await request(`/users/${user.id}/${type}`, { token });
      setNetwork({ type, users: d.users || [] });
    } catch (e) {
      flash(e.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('genres', selectedGenres.join(','));
      if (avatarFile) fd.append('avatar', avatarFile);
      const d = await request('/users/me', { method: 'PATCH', token, body: fd, form: true });
      onUser(d.user || d);
      setEditing(false);
      flash('Profile updated.');
    } catch (e) {
      flash(e.message);
    }
  }

  async function githubConnect() {
    try {
      const popup = window.open('about:blank', '_blank');
      if (!popup) {
        flash('Allow popups to connect GitHub.');
        return;
      }
      const d = await request('/github/connect/start', { method: 'POST', token });
      popup.opener = null;
      popup.location = d.authorizeUrl;
      let n = 0;
      const t = setInterval(async () => {
        try {
          const s = await request(`/github/connect/poll?state=${encodeURIComponent(d.flowToken)}`, {
            token,
          });
          if (s.status === 'success') {
            clearInterval(t);
            setGithub({ ...github, connected: true });
            flash('GitHub connected.');
          } else if (s.status === 'expired' || s.status === 'error') {
            clearInterval(t);
          }
        } catch {
          clearInterval(t);
        }
        if (++n > 45) clearInterval(t);
      }, 2500);
    } catch (e) {
      flash(e.message);
    }
  }

  async function githubDisconnect() {
    try {
      await request('/github/disconnect', { method: 'POST', token });
      setGithub({ ...github, connected: false });
      flash('GitHub disconnected.');
    } catch (e) {
      flash(e.message);
    }
  }

  return (
    <>
      <div className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-main">
          {avatar(user, 'profile-avatar')}
          <div className="profile-ident">
            <h1>{user.name}</h1>
            <span>@{user.username}</span>
            <p>{user.bio || 'Building things with good people.'}</p>
            <div className="chip-row">
              {(user.genres || []).map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
          </div>
          <button className="secondary" onClick={() => setEditing(!editing)}>
            <IconEdit size={14} style={{ marginRight: 6 }} /> Edit profile
          </button>
        </div>

        <div className="profile-stats">
          <div>
            <b>{posts.length}</b>
            <span>Posts</span>
          </div>
          <button className="profile-stat-button" onClick={() => openNetwork('followers')}>
            <b>{counts.followers}</b>
            <span>Followers</span>
          </button>
          <button className="profile-stat-button" onClick={() => openNetwork('following')}>
            <b>{counts.following}</b>
            <span>Following</span>
          </button>
          <div className="github-status">
            <span className={github?.connected ? 'connected-dot' : ''} />
            GitHub {github?.connected ? 'connected' : 'not connected'}
            <button onClick={github?.connected ? githubDisconnect : githubConnect}>
              {github?.connected ? 'Disconnect' : 'Connect ↗'}
            </button>
          </div>
        </div>
      </div>

      {network && (
        <NetworkPanel
          network={network}
          onClose={() => setNetwork(null)}
          onProfile={(id) => setPage(`user:${id}`)}
        />
      )}

      {github?.connected && <GitHubPanel token={token} userId={user.id} />}

      {editing && (
        <form className="form-card profile-edit" onSubmit={save}>
          <div className="section-head">
            <h2>Edit your profile</h2>
            <button type="button" className="more" onClick={() => setEditing(false)}>
              <IconClose size={18} />
            </button>
          </div>
          <div className="profile-avatar-edit">
            <label>
              Profile photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="genre-select">
              <span>Interests & Skills</span>
              <div>
                {genres.map((g) => (
                  <button
                    type="button"
                    className={selectedGenres.includes(g) ? 'selected' : ''}
                    key={g}
                    onClick={() =>
                      setSelectedGenres((xs) =>
                        xs.includes(g) ? xs.filter((x) => x !== g) : [...xs, g]
                      )
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Username
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label className="span-two">
              About you
              <textarea
                rows="3"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
          </div>
          <button className="primary">Save changes</button>
        </form>
      )}

      <div className="profile-tab-row">
        <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>
          Posts ({posts.length})
        </button>
        <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>
          Projects
        </button>
        <button className="text-button" onClick={() => setPage('settings')}>
          <IconSettings size={14} style={{ marginRight: 4 }} /> Settings & Preferences
        </button>
      </div>

      {tab === 'posts' ? (
        posts.length ? (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              token={token}
              user={user}
              onProfile={() => {}}
              flash={flash}
            />
          ))
        ) : (
          <div className="empty-card">
            <h3>No posts shared yet.</h3>
            <p>Publish project updates, learnings, or thoughts to your community.</p>
          </div>
        )
      ) : (
        <Projects token={token} user={user} flash={flash} refresh={0} onProfile={() => {}} />
      )}

      <button className="text-button signout" onClick={onLogout} style={{ marginTop: 32 }}>
        <IconSignOut size={14} style={{ marginRight: 6 }} /> Sign out of CraftHub
      </button>
    </>
  );
}

function PublicProfile({ token, userId, onProfile, flash, setPage, refresh }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [following, setFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    Promise.all([
      request(`/users/${userId}/public`, { token }),
      request(`/posts/user/${userId}`, { token }),
      request(`/projects/user/${userId}`, { token }),
    ])
      .then(([u, p, pr]) => {
        setUser(u.user || u);
        setPosts(p.posts || []);
        setProjects(pr.projects || []);
        setFollowing(u.isFollowing || false);
        setCounts({ followers: u.followerCount || 0, following: u.followingCount || 0 });
      })
      .catch((e) => flash(e.message));
  }, [userId, token, refresh, flash]);

  if (!user) return <div className="loading-card">Opening creator profile…</div>;

  async function openNetwork(type) {
    try {
      const d = await request(`/users/${userId}/${type}`, { token });
      setNetwork({ type, users: d.users || [] });
    } catch (e) {
      flash(e.message);
    }
  }

  async function follow() {
    try {
      await request(`/users/${userId}/follow`, { method: following ? 'DELETE' : 'POST', token });
      setFollowing(!following);
      flash(following ? 'Unfollowed.' : 'Following.');
    } catch (e) {
      flash(e.message);
    }
  }

  return (
    <>
      <div className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-main">
          {avatar(user, 'profile-avatar')}
          <div className="profile-ident">
            <h1>{user.name}</h1>
            <span>@{user.username}</span>
            <p>{user.bio || 'Building things with good people.'}</p>
            <div className="chip-row">
              {(user.genres || []).map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
          </div>
          <button className={following ? 'secondary' : 'primary'} onClick={follow}>
            {following ? (
              <>
                <IconCheck size={14} style={{ marginRight: 6 }} /> Following
              </>
            ) : (
              <>
                <IconPlus size={14} style={{ marginRight: 6 }} /> Follow
              </>
            )}
          </button>
        </div>

        <div className="profile-stats">
          <div>
            <b>{posts.length}</b>
            <span>Posts</span>
          </div>
          <button className="profile-stat-button" onClick={() => openNetwork('followers')}>
            <b>{counts.followers}</b>
            <span>Followers</span>
          </button>
          <button className="profile-stat-button" onClick={() => openNetwork('following')}>
            <b>{counts.following}</b>
            <span>Following</span>
          </button>
        </div>
      </div>

      {network && (
        <NetworkPanel
          network={network}
          onClose={() => setNetwork(null)}
          onProfile={onProfile}
        />
      )}

      <h2 className="section-title">Recent Updates</h2>
      {posts.length ? (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            token={token}
            user={user}
            onProfile={onProfile}
            flash={flash}
          />
        ))
      ) : (
        <div className="empty-card" style={{ marginBottom: 28 }}>
          <h3>No updates posted yet.</h3>
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: 32 }}>
        Projects
      </h2>
      <div className="project-grid">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            p={p}
            onClick={() => setPage(`project:${p.id}`)}
            onProfile={onProfile}
          />
        ))}
      </div>
    </>
  );
}

function NetworkPanel({ network, onClose, onProfile }) {
  return (
    <div className="network-panel form-card">
      <div className="section-head">
        <h2>{network.type === 'followers' ? 'Followers' : 'Following'}</h2>
        <button className="more" onClick={onClose}>
          <IconClose size={18} />
        </button>
      </div>
      {network.users.length ? (
        network.users.map((u) => (
          <button
            className="suggestion network-row"
            key={u.id}
            onClick={() => onProfile(u.id)}
          >
            {avatar(u, 'small')}
            <span>
              <b>{u.name}</b>
              <small>@{u.username}</small>
            </span>
            <IconExternal size={14} />
          </button>
        ))
      ) : (
        <p className="network-empty">No {network.type} yet.</p>
      )}
    </div>
  );
}

function CraftBro({ token, flash }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, busy]);

  async function send(e) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;
    const next = [...history, { role: 'user', content: prompt }];
    setHistory(next);
    setInput('');
    setBusy(true);
    try {
      const d = await request('/ai/craftbro', {
        method: 'POST',
        token,
        body: {
          message: prompt,
          history: history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setHistory([...next, { role: 'assistant', content: d.reply || 'I couldn’t put together a reply.' }]);
    } catch (e) {
      flash(e.message);
      setHistory([
        ...next,
        {
          role: 'assistant',
          content: 'I ran into an issue reaching CraftBro. Please try again in a moment.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR CREATIVE CO-PILOT</div>
          <h1>
            CraftBro <span className="wave">✧</span>
          </h1>
          <p>Architecture planning, tech stack decisions, code debugging, and project advice.</p>
        </div>
      </div>

      <div className="ai-chat">
        <div className="ai-welcome">
          <span>
            <IconCraftBro size={26} />
          </span>
          <h2>What are we building today?</h2>
          <p>Ask me anything about CraftHub, system design, or how to get your project unstuck.</p>
          <div className="prompt-chips">
            {[
              'Help me architect a fullstack web app',
              'How does GitHub workspace synchronization work?',
              'Suggest a modern tech stack for mobile and web',
              'Review my database schema idea',
            ].map((x) => (
              <button onClick={() => setInput(x)} key={x}>
                {x} ↗
              </button>
            ))}
          </div>
        </div>

        <div className="ai-messages">
          {history.map((m, i) => (
            <div className={`ai-message ${m.role}`} key={i}>
              <span>{m.role === 'user' ? 'You' : '✧ CraftBro AI'}</span>
              <p>{m.content}</p>
            </div>
          ))}
          {busy && (
            <div className="ai-message assistant">
              <span>✧ CraftBro AI</span>
              <p>Thinking and generating response…</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-input" onSubmit={send}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            placeholder="Ask CraftBro anything (Press Enter to send)…"
            rows="2"
          />
          <button className="primary" disabled={busy}>
            <IconSend size={14} style={{ marginRight: 6 }} /> Send
          </button>
        </form>

        <small className="ai-note">
          AI can make mistakes. Verify important technical details before pushing to production.
        </small>
      </div>
    </>
  );
}

function Settings({ token, user, flash, onLogout, onUser }) {
  const [settings, setSettings] = useState(
    user.settings || {
      themeMode: 'system',
      notifications: { enabled: true, directMessages: true, workspaceMessages: true },
    }
  );

  useEffect(() => {
    request('/users/me/settings', { token })
      .then((d) => setSettings(d.settings || settings))
      .catch(() => {});
  }, [token, settings]);

  async function patch(next) {
    setSettings(next);
    try {
      const d = await request('/users/me/settings', { method: 'PATCH', token, body: next });
      setSettings(d.settings || next);
      if (d.user) onUser(d.user);
    } catch (e) {
      flash(e.message);
    }
  }

  const toggle = (key) =>
    patch({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">PREFERENCES</div>
          <h1>Settings</h1>
          <p>Manage your CraftHub account preferences and notification controls.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="form-card">
          <div className="eyebrow">APPEARANCE</div>
          <h2>Display mode</h2>
          <p>Choose your visual theme on this browser.</p>

          <div className="setting-options">
            {['system', 'light', 'dark'].map((mode) => (
              <button
                className={settings.themeMode === mode ? 'selected' : ''}
                key={mode}
                onClick={() => patch({ ...settings, themeMode: mode })}
              >
                <b>{mode[0].toUpperCase() + mode.slice(1)}</b>
                <small>
                  {mode === 'system' ? 'Match device setting' : `Force ${mode} theme`}
                </small>
                {settings.themeMode === mode && (
                  <span style={{ position: 'absolute', right: 12, top: 12 }}>
                    <IconCheck size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="eyebrow settings-eyebrow">NOTIFICATIONS</div>
          <h2>Message alerts</h2>
          <SettingToggle
            title="All notifications"
            desc="Master control for CraftHub sound & visual alerts."
            value={settings.notifications.enabled}
            onClick={() => toggle('enabled')}
          />
          <SettingToggle
            title="Direct messages"
            desc="When a collaborator sends you a direct message."
            value={settings.notifications.directMessages}
            onClick={() => toggle('directMessages')}
          />
          <SettingToggle
            title="Workspace messages"
            desc="Realtime updates from project workspace chats."
            value={settings.notifications.workspaceMessages}
            onClick={() => toggle('workspaceMessages')}
          />
        </section>

        <section className="form-card">
          <div className="eyebrow">ACCOUNT & ACCESS</div>
          <h2>Security overview</h2>
          <p>
            Signed in as <b>{user.email}</b>
          </p>
          <p>
            Your account email is verified and synchronized with the CraftHub mobile app. Your
            encrypted session is stored securely in your browser.
          </p>
          <button className="secondary danger" onClick={onLogout} style={{ marginTop: 18 }}>
            <IconSignOut size={14} style={{ marginRight: 6 }} /> Sign out of this browser
          </button>
        </section>
      </div>
    </>
  );
}

function SettingToggle({ title, desc, value, onClick }) {
  return (
    <button className="setting-toggle" onClick={onClick}>
      <span>
        <b>{title}</b>
        <small>{desc}</small>
      </span>
      <i className={value ? 'on' : ''}>
        <em />
      </i>
    </button>
  );
}

function GitHubPanel({ token, userId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const path = userId ? `/github/activity/user/${userId}` : '/github/activity';
    request(path, { token })
      .then(setData)
      .catch(() => setData(null));
  }, [token, userId]);

  if (!data) return null;

  return (
    <section className="github-panel">
      <div className="github-panel-head">
        <div>
          <div className="eyebrow">GITHUB ACTIVITY</div>
          <h2>@{data.username}</h2>
          <span>
            {data.totalRecentCommits || 0} recent commits · 6-week contribution activity
          </span>
        </div>
        <a
          href={data.profileUrl || `https://github.com/${data.username}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconGitHub size={14} style={{ marginRight: 6 }} /> GitHub profile ↗
        </a>
      </div>

      <div className="contribution-grid">
        {(data.contributionSeries || []).map((d, i) => (
          <i
            key={`${d.date}-${i}`}
            title={`${d.date}: ${d.count} commits`}
            style={{
              opacity: d.count ? Math.min(0.35 + d.count * 0.16, 1) : 0.22,
              background: d.count ? '#c084fc' : '#282535',
            }}
          />
        ))}
      </div>

      <div className="github-repos">
        {(data.repositories || []).map((repo) => (
          <a href={repo.htmlUrl} key={repo.id} target="_blank" rel="noreferrer">
            <b>{repo.name}</b>
            <small>
              {repo.language || 'Repository'} · ★ {repo.stars}
            </small>
          </a>
        ))}
      </div>

      <div className="github-commits">
        {(data.recentCommits || []).slice(0, 3).map((c) => (
          <div key={c.id}>
            <b>{c.repoName}</b>
            <span>
              {c.messages?.[0] || `${c.commitCount} commits`} · {timeAgo(c.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
