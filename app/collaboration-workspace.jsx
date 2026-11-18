'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import styles from './collaboration-workspace.module.css';
import lightTheme from './collaboration-light.module.css';

function avatar(user, asset, size = '') {
  const image = user?.avatarUrl ? asset(user.avatarUrl) : '';
  return (
    <span
      className={`${styles.avatar} ${size ? styles[size] : ''}`}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
      aria-hidden="true"
    >
      {!image && (user?.name || user?.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function text(value, fallback = '') {
  const result = String(value || '').trim();
  return result || fallback;
}

function shortDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function relativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'just now';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function projectMembers(project) {
  const rows = [project?.owner, ...(project?.collaborators || [])].filter(Boolean);
  return [...new Map(rows.filter((member) => member?.id).map((member) => [member.id, member])).values()];
}

function languageFor(path) {
  const ext = String(path || '').split('.').pop().toLowerCase();
  return ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', html: 'html', css: 'css', scss: 'scss', md: 'markdown', py: 'python', dart: 'dart', java: 'java', kt: 'kotlin', swift: 'swift', yml: 'yaml', yaml: 'yaml', sh: 'shell', sql: 'sql', xml: 'xml' })[ext] || 'plaintext';
}

function mergeMessages(current, incoming) {
  if (!incoming?.id) return current;
  const index = current.findIndex((message) => message.id === incoming.id);
  if (index === -1) return [...current, incoming];
  const next = [...current];
  next[index] = incoming;
  return next;
}

export function CollaborationHub({ token, user, flash, refresh, onProfile, setPage, api, asset }) {
  const [projects, setProjects] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [requestTab, setRequestTab] = useState('incoming');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myProjects, received, sent] = await Promise.all([
        api('/projects/mine', { token }),
        api('/collab/requests/incoming', { token }),
        api('/collab/requests/outgoing', { token }),
      ]);
      const combined = new Map();
      for (const project of myProjects.owned || []) {
        const memberCount = Number(project.memberCount || 1);
        if (memberCount > 1 || (project.collaborators || []).length > 0) combined.set(project.id, project);
      }
      for (const project of myProjects.collaborating || []) combined.set(project.id, project);
      setProjects([...combined.values()].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));
      setIncoming(received.requests || []);
      setOutgoing(sent.requests || []);
    } catch (error) {
      flash(error.message);
    } finally {
      setLoading(false);
    }
  }, [api, flash, token]);

  useEffect(() => { load(); }, [load, refresh]);

  async function handleRequest(request, action) {
    try {
      await api(`/collab/requests/${request.id}/${action}`, { method: 'POST', token });
      flash(action === 'accept' ? 'Collaboration connected.' : 'Request declined.');
      load();
    } catch (error) {
      flash(error.message);
    }
  }

  const requests = requestTab === 'incoming' ? incoming : outgoing;
  return (
    <section className={`${styles.hub} ${lightTheme.root}`}>
      <header className={styles.hubHeader}>
        <div>
          <span className={styles.eyebrow}>COLLABORATION HUB</span>
          <h1>Build with your team.</h1>
          <p>Every project, workspace, contribution, and group chat stays shared with CraftHub mobile.</p>
        </div>
        <div className={styles.livePill}><i /> Live shared workspaces</div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><h2>Collaborated projects</h2><p>Your active work with other builders.</p></div>
          <span>{projects.length} active</span>
        </div>
        {loading ? <div className={styles.loading}>Loading team projects…</div> : projects.length ? (
          <div className={styles.projectGrid}>
            {projects.map((project) => {
              const workspace = project.workspace || {};
              const members = projectMembers(project);
              return <button className={styles.collabCard} key={project.id} onClick={() => setPage(`project:${project.id}`)}>
                <div className={styles.cardImage}>{project.imageUrls?.[0] ? <img src={asset(project.imageUrls[0])} alt="" /> : <span>✳</span>}</div>
                <div className={styles.cardCopy}>
                  <div className={styles.cardMeta}><span>{workspace.repoUrl ? 'Workspace ready' : 'Team project'}</span><time>{relativeTime(project.updatedAt || project.createdAt)}</time></div>
                  <h3>{project.title}</h3>
                  <p>{project.description || 'A shared CraftHub project.'}</p>
                  <div className={styles.cardStats}>
                    <span>⌘ {workspace.totalContributionCount || 0} contributions</span>
                    <span>◌ {project.memberCount || members.length || 1}/{project.maxMembers || 4} members</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.memberFaces}>{members.slice(0, 4).map((member) => <span key={member.id}>{avatar(member, asset, 'tiny')}</span>)}</span>
                    <b>Open project <span>↗</span></b>
                  </div>
                </div>
              </button>;
            })}
          </div>
        ) : <div className={styles.empty}><span>✦</span><h3>Your team space is ready when you are.</h3><p>Accept a project invite or bring collaborators into a project to start a shared workspace.</p></div>}
      </section>

      <section className={styles.requests}>
        <div className={styles.sectionHeading}>
          <div><h2>Project requests</h2><p>Keep your collaboration network moving.</p></div>
          <div className={styles.requestTabs}>
            <button className={requestTab === 'incoming' ? styles.selected : ''} onClick={() => setRequestTab('incoming')}>Received {incoming.length}</button>
            <button className={requestTab === 'outgoing' ? styles.selected : ''} onClick={() => setRequestTab('outgoing')}>Sent {outgoing.length}</button>
          </div>
        </div>
        <div className={styles.requestList}>
          {requests.length ? requests.map((request) => {
            const member = requestTab === 'incoming' ? request.fromUserId : request.toUserId;
            return <article className={styles.request} key={request.id}>
              <button onClick={() => member?.id && onProfile(member.id)}>{avatar(member, asset)}</button>
              <div><b>{member?.name || 'CraftHub member'}</b><p>{request.message || `Collaboration request for ${request.project?.title || 'a project'}.`}</p><small>{request.project?.title || 'Project'} · {relativeTime(request.createdAt)}</small></div>
              {requestTab === 'incoming' ? <div className={styles.requestActions}><button className={styles.primaryButton} onClick={() => handleRequest(request, 'accept')}>Accept</button><button className={styles.softButton} onClick={() => handleRequest(request, 'reject')}>Decline</button></div> : <span className={styles.pending}>Pending</span>}
            </article>;
          }) : <div className={styles.emptySmall}>No {requestTab} requests right now.</div>}
        </div>
      </section>
    </section>
  );
}

export function CollaborationProjectDetail({ id, initialTab, token, user, flash, refresh, onProfile, setPage, api, asset, apiBase }) {
  const [project, setProject] = useState(null);
  const [github, setGithub] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [selectedImage, setSelectedImage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [savingRepoName, setSavingRepoName] = useState(false);

  const load = useCallback(async () => {
    try {
      const [projectData, githubStatus] = await Promise.all([
        api(`/projects/${id}`, { token }),
        api('/github/status', { token }).catch(() => null),
      ]);
      const next = projectData.project || projectData;
      setProject(next);
      setRepoName(next.workspace?.requestedRepoName || '');
      setGithub(githubStatus);
    } catch (error) {
      flash(error.message);
    }
  }, [api, flash, id, token]);

  useEffect(() => { load(); }, [load, refresh]);
  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);

  if (!project) return <div className={styles.loading}>Opening collaboration project…</div>;

  const workspace = project.workspace || {};
  const members = projectMembers(project);
  const isOwner = project.owner?.id === user.id || project.ownerId === user.id;
  const isMember = isOwner || members.some((member) => member.id === user.id);
  const gallery = project.imageUrls || [];
  const missingGithub = members.filter((member) => member.githubConnected !== true);
  const contributionRows = (workspace.contributions || []).map((entry) => ({ ...entry, member: members.find((member) => member.id === entry.userId) }));

  async function requestToJoin() {
    try {
      await api('/collab/requests', { method: 'POST', token, body: { toUserId: project.owner?.id || project.ownerId, type: 'project_request', projectId: id, message: 'I would love to collaborate on this project.' } });
      flash('Project collaboration request sent.');
    } catch (error) { flash(error.message); }
  }

  async function uploadPhotos(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setUploading(true);
    try {
      const data = new FormData();
      files.forEach((file) => data.append('images', file));
      await api(`/projects/${id}`, { method: 'PATCH', token, body: data, form: true });
      flash(files.length === 1 ? 'Project photo added.' : 'Project photos added.');
      event.target.value = '';
      load();
    } catch (error) { flash(error.message); } finally { setUploading(false); }
  }

  async function removePhoto(index) {
    if (!window.confirm('Remove this project photo?')) return;
    try {
      const data = new FormData();
      data.append('removeImageIndexes', String(index));
      await api(`/projects/${id}`, { method: 'PATCH', token, body: data, form: true });
      setSelectedImage(Math.max(0, Math.min(selectedImage, gallery.length - 2)));
      flash('Project photo removed.');
      load();
    } catch (error) { flash(error.message); }
  }

  async function saveRepoName(event) {
    event.preventDefault();
    if (!repoName.trim()) return;
    setSavingRepoName(true);
    try {
      await api(`/projects/${id}/workspace/name`, { method: 'PATCH', token, body: { repoName: repoName.trim() } });
      flash('Shared repository name saved.');
      load();
    } catch (error) { flash(error.message); } finally { setSavingRepoName(false); }
  }

  async function createWorkspace() {
    setCreating(true);
    try {
      await api(`/projects/${id}/workspace/create`, { method: 'POST', token });
      flash('Shared GitHub repository and workspace are ready.');
      load();
    } catch (error) { flash(error.message); } finally { setCreating(false); }
  }

  async function connectGithub() {
    try {
      const popup = window.open('about:blank', '_blank');
      if (!popup) { flash('Allow popups to connect GitHub.'); return; }
      const start = await api('/github/connect/start', { method: 'POST', token });
      popup.opener = null;
      popup.location = start.authorizeUrl;
      let tries = 0;
      const poll = window.setInterval(async () => {
        try {
          const result = await api(`/github/connect/poll?state=${encodeURIComponent(start.flowToken)}`, { token });
          if (result.status === 'success') { window.clearInterval(poll); flash('GitHub connected. Your eligible shared workspace will be prepared.'); load(); }
          if (result.status === 'error' || result.status === 'expired' || ++tries > 45) window.clearInterval(poll);
        } catch { window.clearInterval(poll); }
      }, 2500);
    } catch (error) { flash(error.message); }
  }

  return <section className={`${styles.detail} ${lightTheme.root}`}>
    <button className={styles.back} onClick={() => setPage('collab')}>← Collaboration hub</button>
    <header className={styles.projectHero}>
      <div className={styles.gallery}>
        <div className={styles.heroImage}>{gallery[selectedImage] ? <img src={asset(gallery[selectedImage])} alt={`${project.title} project visual`} /> : <span>✳</span>}</div>
        {gallery.length > 1 && <div className={styles.thumbnails}>{gallery.map((image, index) => <button key={`${image}-${index}`} className={index === selectedImage ? styles.activeThumbnail : ''} onClick={() => setSelectedImage(index)}><img src={asset(image)} alt={`Project visual ${index + 1}`} /></button>)}</div>}
        {isMember && <div className={styles.photoActions}><label className={styles.softButton}>{uploading ? 'Adding photos…' : '＋ Add photos'}<input hidden type="file" accept="image/*" multiple onChange={uploadPhotos} disabled={uploading} /></label>{gallery.length > 0 && <button className={styles.subtleDanger} onClick={() => removePhoto(selectedImage)}>Remove current</button>}</div>}
      </div>
      <div className={styles.heroCopy}>
        <div className={styles.tagRow}>{(project.genres || []).map((genre) => <span key={genre}>{genre}</span>)}</div>
        <h1>{project.title}</h1>
        <p>{project.description || 'A shared project on CraftHub.'}</p>
        <button className={styles.owner} onClick={() => onProfile(project.owner?.id || project.ownerId)}>{avatar(project.owner, asset)}<span><b>{project.owner?.name || 'Project owner'}</b><small>@{project.owner?.username}</small></span></button>
        <div className={styles.heroActions}>
          {!isMember && <button className={styles.primaryButton} onClick={requestToJoin}>Request to join ↗</button>}
          {workspace.conversationId && isMember && <button className={styles.softButton} onClick={() => setPage(`workspace-chat:${workspace.conversationId}:${project.id}`)}>Open project chat</button>}
          {workspace.repoUrl && <a className={styles.softButton} href={workspace.repoUrl} target="_blank" rel="noreferrer">Open GitHub ↗</a>}
          {workspace.editorUrl && <a className={styles.softButton} href={workspace.editorUrl} target="_blank" rel="noreferrer">GitHub.dev ↗</a>}
          {isMember && workspace.repoUrl && <button className={styles.primaryButton} onClick={() => setActiveTab('workspace')}>Open workspace</button>}
        </div>
      </div>
    </header>

    <nav className={styles.tabs} aria-label="Project navigation">
      {['overview', 'workspace', 'team', 'activity'].map((tab) => <button key={tab} className={activeTab === tab ? styles.activeTab : ''} onClick={() => setActiveTab(tab)}>{tab === 'team' ? `Team (${members.length})` : tab[0].toUpperCase() + tab.slice(1)}</button>)}
    </nav>

    {activeTab === 'overview' && <div className={styles.overviewGrid}>
      <article className={styles.panel}><span className={styles.eyebrow}>PROJECT BRIEF</span><h2>About this project</h2><p>{project.description || 'No project description yet.'}</p><h3>Tech stack</h3><div className={styles.stack}>{(project.techStack || []).length ? project.techStack.map((item) => <span key={item}>{item}</span>) : <small>Tech stack has not been added yet.</small>}</div></article>
      <article className={styles.pulsePanel}><span className={styles.eyebrow}>PROJECT PULSE</span><div className={styles.pulseStats}><div><b>{workspace.totalContributionCount || 0}</b><span>Contributions</span></div><div><b>{project.memberCount || members.length}</b><span>Collaborators</span></div><div><b>{workspace.repoUrl ? '1' : '0'}</b><span>Shared repo</span></div><div><b>{project.likeCount || 0}</b><span>Appreciations</span></div></div><div className={styles.projectFacts}><span>Created {shortDate(project.createdAt)}</span><span>{workspace.repoUrl ? 'GitHub workspace connected' : 'Repository setup pending'}</span></div></article>
      <article className={`${styles.panel} ${styles.fullPanel}`}><span className={styles.eyebrow}>PROJECT MATERIALS</span><h2>Source and links</h2><div className={styles.materialActions}>{project.sourceFile?.url ? <a className={styles.softButton} href={asset(project.sourceFile.url)} target="_blank" rel="noreferrer">Download {project.sourceFile.originalName || 'source file'} ↗</a> : <span className={styles.muted}>No source file attached.</span>}{project.githubUrl && <a className={styles.softButton} href={project.githubUrl} target="_blank" rel="noreferrer">Open project repository ↗</a>}</div></article>
      <CollaborationProjectInteractions project={project} token={token} user={user} api={api} asset={asset} flash={flash} refresh={refresh} />
    </div>}

    {activeTab === 'workspace' && <section className={styles.workspacePanel}>
      <header className={styles.workspaceHeading}><div><span className={styles.eyebrow}>SHARED CODE SPACE</span><h2>Workspace controls</h2><p>Files are edited in Monaco and committed directly to the shared GitHub repository.</p></div>{workspace.repoFullName && <span className={styles.repoName}>⌘ {workspace.repoFullName}</span>}</header>
      {!isMember ? <div className={styles.empty}><span>⌘</span><h3>Join this project to use its workspace.</h3><p>Only the owner and accepted collaborators can read, edit, or push code.</p></div> : workspace.repoUrl ? <WorkspaceEditor project={project} token={token} api={api} flash={flash} asset={asset} refresh={refresh} /> : <div className={styles.workspaceSetup}>
        <div className={styles.setupCard}><h3>Prepare the shared repository</h3><p>The workspace chat appears after collaboration connects. The repository and code editor unlock when every project member has connected GitHub.</p>{workspace.conversationId && <button className={styles.softButton} onClick={() => setPage(`workspace-chat:${workspace.conversationId}:${project.id}`)}>Open workspace chat</button>}</div>
        <div className={styles.setupCard}><h3>Repository name</h3>{workspace.requestedRepoName ? <p>Requested name: <b>{workspace.requestedRepoName}</b></p> : <p>Choose the name that will be used when the shared repository is created.</p>}<form className={styles.repoForm} onSubmit={saveRepoName}><input value={repoName} onChange={(event) => setRepoName(event.target.value)} placeholder="my-team-project" disabled={Boolean(workspace.repoUrl)} /><button className={styles.softButton} disabled={savingRepoName || Boolean(workspace.repoUrl)}>{savingRepoName ? 'Saving…' : 'Save name'}</button></form></div>
        <div className={styles.setupCard}><h3>GitHub readiness</h3>{github?.user?.githubConnected || github?.connected ? <p className={styles.ready}>✓ Your GitHub is connected.</p> : <button className={styles.primaryButton} onClick={connectGithub}>Connect my GitHub</button>}{missingGithub.length ? <p className={styles.waiting}>Waiting for: {missingGithub.map((member) => member.name).join(', ')}</p> : <p className={styles.ready}>✓ All team members have GitHub connected.</p>}{isOwner && <button className={styles.primaryButton} disabled={creating || missingGithub.length > 0} onClick={createWorkspace}>{creating ? 'Creating workspace…' : 'Create shared workspace'}</button>}{!isOwner && <p className={styles.muted}>The owner can create the shared repository once every member is ready.</p>}</div>
      </div>}
    </section>}

    {activeTab === 'team' && <section className={styles.teamSection}><div className={styles.sectionHeading}><div><h2>Active collaborators</h2><p>{project.slotsLeft || 0} of {project.maxMembers || 4} project spots remain.</p></div></div><div className={styles.teamGrid}>{members.map((member) => <button className={styles.memberCard} key={member.id} onClick={() => onProfile(member.id)}>{avatar(member, asset, 'large')}<b>{member.name}</b><small>@{member.username}</small><span>{member.id === project.owner?.id ? 'Project owner' : member.githubConnected ? 'GitHub connected' : 'Collaborator'}</span></button>)}</div></section>}

    {activeTab === 'activity' && <section className={styles.activitySection}><div className={styles.sectionHeading}><div><h2>Project activity</h2><p>GitHub-backed contribution history for this shared project.</p></div></div>{contributionRows.length ? <div className={styles.activityList}>{contributionRows.sort((a, b) => new Date(b.lastSavedAt || 0) - new Date(a.lastSavedAt || 0)).map((entry) => <article key={entry.userId} className={styles.activity}><span>{avatar(entry.member, asset, 'tiny')}</span><p><b>{entry.member?.name || 'Collaborator'}</b> saved <strong>{entry.lastFilePath || 'a workspace file'}</strong><small>{relativeTime(entry.lastSavedAt)}</small></p><span className={styles.contributionCount}>{entry.commitCount || 0} commits</span></article>)}</div> : <div className={styles.emptySmall}>No saved workspace contributions yet. The first Monaco save will appear here.</div>}</section>}
  </section>;
}

function CollaborationProjectInteractions({ project, token, user, api, asset, flash, refresh }) {
  const [liked, setLiked] = useState(project.likedByMe || false);
  const [likes, setLikes] = useState(project.likeCount || 0);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  useEffect(() => { setLiked(project.likedByMe || false); setLikes(project.likeCount || 0); }, [project.id, project.likedByMe, project.likeCount, refresh]);
  useEffect(() => { api(`/projects/${project.id}/comments`, { token }).then((data) => setComments(data.comments || [])).catch(() => {}); }, [api, project.id, token, refresh]);
  async function toggleLike() { try { const data = await api(`/projects/${project.id}/like`, { method: liked ? 'DELETE' : 'POST', token }); setLiked(data.likedByMe); setLikes(data.likeCount); } catch (error) { flash(error.message); } }
  async function addComment(event) { event.preventDefault(); if (!comment.trim()) return; try { const data = await api(`/projects/${project.id}/comment`, { method: 'POST', token, body: { text: comment.trim() } }); setComments((rows) => [data.comment, ...rows]); setComment(''); } catch (error) { flash(error.message); } }
  return <article className={`${styles.panel} ${styles.fullPanel}`}><div className={styles.interactionHeading}><div><span className={styles.eyebrow}>PROJECT CONVERSATION</span><h2>Share a thought</h2></div><button className={liked ? styles.liked : styles.softButton} onClick={toggleLike}>{liked ? '♥' : '♡'} {likes} appreciations</button></div><div className={styles.commentList}>{comments.map((row) => <div className={styles.comment} key={row.id}>{avatar(row.user, asset, 'tiny')}<div><b>{row.user?.name || 'CraftHub member'}</b><p>{row.text}</p><small>{relativeTime(row.createdAt)}</small></div></div>)}</div><form className={styles.commentForm} onSubmit={addComment}>{avatar(user, asset, 'tiny')}<input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment to this project…" /><button className={styles.primaryButton}>Comment</button></form></article>;
}

function WorkspaceEditor({ project, token, api, flash, refresh }) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const settingValue = useRef(false);
  const syncedRefreshRef = useRef(refresh);
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState('');
  const [active, setActive] = useState('');
  const [sha, setSha] = useState('');
  const [status, setStatus] = useState('Opening shared workspace…');
  const [dirty, setDirty] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [editorError, setEditorError] = useState('');

  const call = useCallback((method, suffix, body) => api(`/projects/${project.id}/workspace${suffix}`, { method, token, body }), [api, project.id, token]);
  const loadTree = useCallback(async (directory = '') => {
    try {
      setStatus('Loading files…');
      const result = await call('GET', `/tree?path=${encodeURIComponent(directory)}`);
      setPath(result.path || '');
      setFiles([...(result.entries || [])].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)));
      setStatus('Workspace ready');
    } catch (error) { setStatus(error.message); flash(error.message); }
  }, [call, flash]);

  useEffect(() => {
    let disposed = false;
    let script;
    const boot = () => {
      if (disposed || !containerRef.current || !window.require) return;
      window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
      window.require(['vs/editor/editor.main'], () => {
        if (disposed || !containerRef.current) return;
        monacoRef.current = window.monaco;
        const editor = window.monaco.editor.create(containerRef.current, { value: '', language: 'plaintext', theme: 'vs-dark', automaticLayout: true, minimap: { enabled: false }, fontSize: 14, fontFamily: 'JetBrains Mono, Consolas, monospace', padding: { top: 16 }, scrollBeyondLastLine: false });
        editor.onDidChangeModelContent(() => { if (!settingValue.current) setDirty(true); });
        editorRef.current = editor;
        loadTree('');
      });
    };
    if (window.require) boot();
    else {
      script = document.querySelector('script[data-crafthub-monaco]');
      if (!script) { script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js'; script.dataset.crafthubMonaco = 'true'; document.body.appendChild(script); }
      script.addEventListener('load', boot, { once: true });
      script.addEventListener('error', () => setEditorError('Monaco could not load. Check your internet connection and try again.'), { once: true });
    }
    return () => { disposed = true; editorRef.current?.dispose(); editorRef.current = null; };
  }, [loadTree]);

  useEffect(() => {
    if (syncedRefreshRef.current === refresh) return;
    syncedRefreshRef.current = refresh;
    if (!editorRef.current) return;
    loadTree(path).then(() => {
      setStatus(dirty ? 'Team update available — your unsaved code is safe' : 'Workspace synced with team changes');
    });
  }, [dirty, loadTree, path, refresh]);

  async function openFile(filePath) {
    if (dirty && !window.confirm('You have unsaved changes. Open another file anyway?')) return;
    try {
      setStatus(`Opening ${filePath}…`);
      const result = await call('GET', `/file?path=${encodeURIComponent(filePath)}`);
      setActive(result.path || filePath);
      setSha(result.sha || '');
      setCommitMessage(`Update ${result.path || filePath} from CraftHub web`);
      settingValue.current = true;
      editorRef.current?.setValue(result.content || '');
      const model = editorRef.current?.getModel();
      if (model && monacoRef.current) monacoRef.current.editor.setModelLanguage(model, languageFor(result.path || filePath));
      requestAnimationFrame(() => { settingValue.current = false; setDirty(false); });
      setStatus(`Editing ${result.path || filePath}`);
    } catch (error) { setStatus(error.message); flash(error.message); }
  }

  function goUp() { const parent = path.split('/').filter(Boolean).slice(0, -1).join('/'); loadTree(parent); }
  function startNewFile() { setNewPath(path ? `${path}/new-file.js` : 'new-file.js'); setNewFileOpen(true); }
  function createFile(event) { event.preventDefault(); const filePath = newPath.trim().replace(/^\/+/, ''); if (!filePath) return; setActive(filePath); setSha(''); setCommitMessage(`Create ${filePath} from CraftHub web`); settingValue.current = true; editorRef.current?.setValue(''); const model = editorRef.current?.getModel(); if (model && monacoRef.current) monacoRef.current.editor.setModelLanguage(model, languageFor(filePath)); requestAnimationFrame(() => { settingValue.current = false; setDirty(true); }); setNewFileOpen(false); setStatus(`New file: ${filePath}`); }
  async function save() { if (!active) { flash('Open a file or create one first.'); return; } try { setStatus('Pushing your changes to GitHub…'); const result = await call('PUT', '/file', { path: active, content: editorRef.current?.getValue() || '', sha, message: commitMessage.trim() || `Update ${active} from CraftHub web` }); setSha(result.sha || sha); setDirty(false); setStatus(`Saved ${active} to GitHub`); flash('Changes pushed to the shared GitHub repository.'); loadTree(path); } catch (error) { setStatus(error.message); flash(error.message); } }

  return <div className={styles.editorShell}>
    <div className={styles.editorToolbar}><div><b>⌘ {project.workspace?.repoFullName || project.title}</b><span className={styles.editorStatus}><i /> {status}</span></div><div className={styles.toolbarActions}><a className={styles.softButton} href={project.workspace?.repoUrl} target="_blank" rel="noreferrer">GitHub ↗</a><button className={styles.softButton} onClick={startNewFile}>＋ New file</button><button className={styles.primaryButton} onClick={save} disabled={!active}>Save & push {dirty ? '•' : '↗'}</button></div></div>
    {newFileOpen && <form className={styles.newFileForm} onSubmit={createFile}><label>New file path<input autoFocus value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="src/app.js" /></label><button className={styles.primaryButton}>Create file</button><button type="button" className={styles.softButton} onClick={() => setNewFileOpen(false)}>Cancel</button></form>}
    <div className={styles.editorWorkspace}><aside className={styles.fileTree}><div className={styles.treeTop}><span>EXPLORER</span><div><button onClick={goUp} disabled={!path} title="Go up one folder">↑</button><button onClick={() => loadTree(path)} title="Refresh files">↻</button></div></div><button className={styles.rootButton} onClick={() => loadTree('')}>⌄ {path || 'Repository root'}</button>{files.map((entry) => <button className={`${styles.fileButton} ${active === entry.path ? styles.activeFile : ''}`} key={entry.path} onClick={() => entry.type === 'dir' ? loadTree(entry.path) : openFile(entry.path)}><span>{entry.type === 'dir' ? '▸' : '◇'}</span>{entry.name}</button>)}</aside><div className={styles.editorColumn}><div className={styles.editorTab}><span>◇ {active || 'Select a file'}</span>{active && <span>{dirty ? 'Unsaved changes' : languageFor(active)}</span>}</div>{editorError ? <div className={styles.editorError}>{editorError}</div> : <div ref={containerRef} className={styles.monaco} />}</div></div>
    <div className={styles.commitRow}><label>Commit message<input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Describe your change" disabled={!active} /></label><span>{active ? `${active}${dirty ? ' · unsaved' : ' · synced'}` : 'Choose a file to begin'}</span></div>
  </div>;
}

export function ProjectWorkspaceChat({ conversationId, projectId, token, user, flash, onProfile, setPage, api, asset, apiBase }) {
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => { try { const data = await api(`/conversations/${conversationId}/messages`, { token }); setMessages(data.messages || []); } catch (error) { flash(error.message); } finally { setLoading(false); } }, [api, conversationId, flash, token]);
  useEffect(() => { api(`/projects/${projectId}`, { token }).then((data) => setProject(data.project || data)).catch(() => {}); loadMessages(); }, [api, loadMessages, projectId, token]);
  useEffect(() => {
    const socket = io(apiBase, { transports: ['websocket'], auth: { token } });
    const join = () => socket.emit('join', conversationId);
    const onMessage = (incoming) => { if (incoming?.conversationId === conversationId) setMessages((rows) => mergeMessages(rows, incoming)); };
    const onReaction = (incoming) => { if (incoming?.conversationId === conversationId) setMessages((rows) => mergeMessages(rows, incoming)); };
    socket.on('connect', join); socket.on('message', onMessage); socket.on('message_reaction', onReaction); if (socket.connected) join();
    return () => { socket.emit('leave', conversationId); socket.disconnect(); };
  }, [apiBase, conversationId, token]);

  async function send(event) { event.preventDefault(); if (!message.trim()) return; try { const data = await api(`/conversations/${conversationId}/messages`, { method: 'POST', token, body: { text: message.trim(), replyToMessageId: reply?.id } }); setMessages((rows) => mergeMessages(rows, data.message)); setMessage(''); setReply(null); } catch (error) { flash(error.message); } }
  async function react(row, emoji) { try { const data = await api(`/conversations/${conversationId}/messages/${row.id}/react`, { method: 'POST', token, body: { emoji } }); setMessages((rows) => mergeMessages(rows, data.message)); } catch (error) { flash(error.message); } }

  return <section className={`${styles.projectChat} ${lightTheme.root}`}><button className={styles.back} onClick={() => setPage(`project:${projectId}`)}>← Back to project</button><header className={styles.chatHeader}><div><span className={styles.eyebrow}>PROJECT GROUP CHAT</span><h1>{project?.title || 'Workspace chat'}</h1><p>Messages, code changes, and team progress belong to the same project conversation as mobile.</p></div><div>{project?.workspace?.repoUrl && <button className={styles.softButton} onClick={() => setPage(`project:${projectId}:workspace`)}>Open workspace</button>}</div></header><div className={styles.chatShell}><div className={styles.chatStatus}><span><i /> Project workspace</span><span>{project?.workspace?.repoFullName || 'Shared collaboration chat'}</span></div><div className={styles.messageList}>{loading ? <div className={styles.loading}>Loading project chat…</div> : messages.map((row) => <div className={`${styles.messageRow} ${row.sender?.id === user.id ? styles.mine : ''}`} key={row.id}>{row.sender?.id !== user.id && <button onClick={() => row.sender?.id && onProfile(row.sender.id)}>{avatar(row.sender, asset, 'tiny')}</button>}<article className={styles.bubble}>{row.replyTo && <small className={styles.replyQuote}>↪ {row.replyTo.sender?.name || 'Reply'}: {row.replyTo.text}</small>}<p>{row.text}</p><small>{relativeTime(row.createdAt)}</small><div className={styles.messageTools}><button onClick={() => setReply(row)}>Reply</button>{['👍', '❤️', '😂'].map((emoji) => <button key={emoji} onClick={() => react(row, emoji)}>{emoji}{row.reactions?.filter((reaction) => reaction.emoji === emoji).length || ''}</button>)}</div></article></div>)}</div>{reply && <div className={styles.replyBar}>Replying to {reply.sender?.name || 'message'} <button onClick={() => setReply(null)}>×</button></div>}<form className={styles.chatForm} onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message your project team…" /><button className={styles.primaryButton}>Send ↗</button></form></div></section>;
}
