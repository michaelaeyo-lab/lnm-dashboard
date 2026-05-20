/* LNM design — primitives + Sidebar */

// ===== Icon set (sized via prop, inherits color via currentColor) =====
const Icon = ({ name, size = 16 }) => {
  const paths = {
    dashboard: <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V10" />,
    knowledge: <path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 4h8M8 13h8M8 17h5" />,
    briefs: <path d="M9 3h6v3H9zM5 6h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zm3 6h8M8 16h8" />,
    write: <path d="M4 20h4l10-10-4-4L4 16v4zm14-14l2-2-4-4-2 2" />,
    chat: <path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />,
    history: <path d="M3 12a9 9 0 109-9 9.5 9.5 0 00-7 3M3 4v4h4M12 7v5l3 2" />,
    search: <path d="M21 21l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chevDown: <path d="M6 9l6 6 6-6" />,
    chevRight: <path d="M9 6l6 6-6 6" />,
    chevLeft: <path d="M15 6l-6 6 6 6" />,
    arrowRight: <path d="M5 12h14M13 5l7 7-7 7" />,
    check: <path d="M4 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M6 18L18 6" />,
    settings: <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005.18 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />,
    sparkles: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.5 8.5l2.1 2.1M5.6 18.4l2.1-2.1m8.5-8.5l2.1-2.1" />,
    star: <path d="M12 2l2.4 7.4H22l-6 4.4 2.4 7.2L12 16.6 5.6 21l2.4-7.2-6-4.4h7.6z" />,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
    link: <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1m-3 6a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />,
    target: <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z" />,
    map: <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />,
    shield: <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />,
    eye: <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7zm11 3a3 3 0 100-6 3 3 0 000 6z" />,
    flag: <path d="M4 21V4M4 4h13l-2 4 2 4H4" />,
    file: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M9 13h6M9 17h6" />,
    layers: <path d="M12 2l10 5-10 5L2 7l10-5zm10 10l-10 5-10-5m20 5l-10 5-10-5" />,
    code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
    paragraph: <path d="M13 4H8a4 4 0 000 8h1m4-8v16m-4-8h4m-4 0v8" />,
    table: <path d="M3 6h18M3 12h18M3 18h18M9 3v18m6-18v18" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    image: <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm4 7l3 3 4-5 5 6" />,
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7" />,
    sun: <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66l1.42-1.42M4.92 19.08l1.42-1.42M17.66 17.66l1.42 1.42M4.92 4.92l1.42 1.42M12 6a6 6 0 100 12 6 6 0 000-12z" />,
    moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    download: <path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14" />,
    upload: <path d="M12 21V9m0 0l-5 5m5-5l5 5M5 3h14" />,
    panelLeft: <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0v18" />,
    panelRight: <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0v18" />,
    filter: <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />,
    refresh: <path d="M20 11A8 8 0 116.5 5.5M20 4v6h-6" />,
    dots: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
    pencil: <path d="M17 3l4 4-13 13H4v-4L17 3z" />,
    play: <path d="M6 4l14 8-14 8V4z" />,
    pause: <path d="M6 4h4v16H6zM14 4h4v16h-4z" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H9a2 2 0 01-2-2V6h10z" />,
    alert: <path d="M12 9v4m0 4h.01M10.3 3.7L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
};

// ===== Badge =====
const Badge = ({ tone = 'default', children, dot, mono = true, style }) => {
  const cls = `badge ${tone !== 'default' ? `badge-${tone}` : ''}`;
  return (
    <span className={cls} style={{ ...style, fontFamily: mono ? undefined : 'var(--font-sans)' }}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

// ===== Status badge with semantic mapping =====
const STATUS_TONES = {
  draft: 'default',
  reviewing: 'amber',
  approved: 'mint',
  generating: 'cyan',
  failed: 'coral',
  done: 'mint',
  'in-progress': 'amber',
  pending: 'default',
  blocked: 'coral',
};
const StatusBadge = ({ status }) => (
  <Badge tone={STATUS_TONES[status] || 'default'} dot mono={false}>
    {status}
  </Badge>
);

// ===== Quality score ring =====
const ScoreRing = ({ score = 0, size = 88, label = 'Quality' }) => {
  const r = (size / 2) - 6;
  const c = 2 * Math.PI * r;
  const tone =
    score >= 80 ? 'var(--mint)' :
    score >= 60 ? 'var(--amber)' :
    'var(--coral)';
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className="track" cx={size/2} cy={size/2} r={r} />
        <circle className="fill" cx={size/2} cy={size/2} r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ stroke: tone }} />
      </svg>
      <div className="score-val" style={{ color: tone }}>
        {score}
      </div>
    </div>
  );
};

// ===== Bar (progress) =====
const Bar = ({ value = 0, tone, height = 4 }) => (
  <div className="bar" style={{ height }}>
    <div style={{
      width: `${value}%`,
      background:
        tone === 'mint' ? 'var(--mint)' :
        tone === 'amber' ? 'var(--amber)' :
        tone === 'coral' ? 'var(--coral)' :
        tone === 'cyan' ? 'var(--cyan)' :
        'var(--accent)',
    }} />
  </div>
);

// ===== Tabs =====
const Tabs = ({ items, value, onChange }) => (
  <div className="tabs">
    {items.map(it => (
      <button key={it.id}
        className={`tab ${value === it.id ? 'active' : ''}`}
        onClick={() => onChange(it.id)}>
        {it.label}
        {typeof it.count === 'number' && <span className="tab-count">{it.count}</span>}
      </button>
    ))}
  </div>
);

// ===== Button =====
const Button = ({ variant = 'default', size = 'md', children, leading, trailing, onClick, disabled, style }) => {
  const cls = `btn ${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : variant === 'success' ? 'btn-success' : ''} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''}`;
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style}>
      {leading}
      {children}
      {trailing}
    </button>
  );
};

// ===== Chip =====
const Chip = ({ children, tone, onRemove, style }) => (
  <span className="chip" style={{
    ...style,
    background: tone ? `var(--${tone}-soft)` : undefined,
    borderColor: tone ? `oklch(0.75 0.15 290 / 0.3)` : undefined,
    color: tone ? `var(--${tone})` : undefined,
  }}>
    {children}
    {onRemove && (
      <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
        <Icon name="x" size={11} />
      </button>
    )}
  </span>
);

// ===== Sidebar =====
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/' },
  { id: 'briefs', label: 'Briefs', icon: 'briefs', href: '/briefs', count: 14 },
  { id: 'write', label: 'Write', icon: 'write', href: '/write' },
  { id: 'chat', label: 'Chat', icon: 'chat', href: '/chat' },
];
const NAV_DATA = [
  { id: 'knowledge', label: 'Knowledge', icon: 'knowledge', href: '/knowledge', count: '14k' },
  { id: 'history', label: 'History', icon: 'history', href: '/history' },
];

const Sidebar = ({ active, onNav, user, onLogout }) => (
  <aside className="sidebar">
    <div className="sidebar-brand">
      <div className="brand-mark">L</div>
      <div className="min-w-0">
        <div className="brand-name truncate">LNM Platform</div>
        <div className="brand-sub truncate">multi-agent · seo</div>
      </div>
    </div>

    <div className="sidebar-section">
      <div className="sidebar-section-label">Workspace</div>
      {NAV.map(it => (
        <button key={it.id} className={`nav-item ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
          <Icon name={it.icon} />
          <span className="nav-label">{it.label}</span>
          {it.count && <span className="nav-count">{it.count}</span>}
        </button>
      ))}
    </div>

    <div className="sidebar-section">
      <div className="sidebar-section-label">Library</div>
      {NAV_DATA.map(it => (
        <button key={it.id} className={`nav-item ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
          <Icon name={it.icon} />
          <span className="nav-label">{it.label}</span>
          {it.count && <span className="nav-count">{it.count}</span>}
        </button>
      ))}
    </div>

    <div className="sidebar-foot">
      <div className="user-card" onClick={onLogout}>
        <div className="avatar">{(user?.name || 'M')[0].toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="user-name truncate">{user?.name || 'Michael'}</div>
          <div className="user-email truncate">{user?.email || 'm@lnm.so'}</div>
        </div>
        <Icon name="settings" size={14} />
      </div>
    </div>
  </aside>
);

// ===== Topbar =====
const Topbar = ({ crumbs = [], right, onCmdK, mobileNav }) => (
  <header className="topbar">
    {mobileNav && (
      <button className="btn btn-sm btn-ghost hamburger" onClick={mobileNav} style={{ padding: 0, width: 30, justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    )}
    <div className="topbar-title">
      {crumbs.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="sep" style={{ margin: '0 8px' }}>/</span>}
          <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
        </span>
      ))}
    </div>
    <div style={{ flex: 1 }} />
    <button className="btn btn-sm btn-ghost topbar-search" onClick={onCmdK} style={{ gap: 8 }}>
      <Icon name="search" size={13} />
      <span className="muted topbar-search-label">Search briefs, headings, entities…</span>
      <span className="kbd">⌘K</span>
    </button>
    {right}
  </header>
);

// ===== Empty state =====
const Empty = ({ title, sub, icon = 'sparkles', action }) => (
  <div className="empty">
    <div style={{ display: 'inline-flex', padding: 12, borderRadius: 12, background: 'var(--surface)', marginBottom: 12, color: 'var(--text-3)' }}>
      <Icon name={icon} size={22} />
    </div>
    <div className="h3 mb-2" style={{ color: 'var(--text-1)' }}>{title}</div>
    {sub && <div className="text-sm muted mb-4">{sub}</div>}
    {action}
  </div>
);

// Export
Object.assign(window, {
  Icon, Badge, StatusBadge, ScoreRing, Bar, Tabs, Button, Chip,
  Sidebar, Topbar, Empty,
  NAV, NAV_DATA,
});
