/* Other pages: Login, Dashboard, Briefs list, Knowledge, Write, Chat, History */

const { useState: useState_p, useRef: useRef_p, useEffect: useEffect_p } = React;

// ============== LOGIN ==============
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState_p('michael@lnm.so');
  const [password, setPassword] = useState_p('•••••••••');

  return (
    <div data-screen-label="01 Login" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="flex items-center gap-3 mb-8" style={{ justifyContent: 'center' }}>
          <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18, borderRadius: 10 }}>L</div>
          <div>
            <div className="font-semibold" style={{ fontSize: 16 }}>LNM Platform</div>
            <div className="mono text-xs muted">multi-agent · seo</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: 28 }}>
          <h1 className="h2 mb-1">Sign in</h1>
          <p className="text-sm muted mb-6">Welcome back. Two-user agency workspace.</p>

          <div className="mb-3">
            <div className="field-label">Email</div>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="mb-5">
            <div className="field-label flex items-center justify-between">
              <span>Password</span>
              <a className="text-xs" style={{ color: 'var(--accent)', textTransform: 'none', letterSpacing: 0 }}>Forgot?</a>
            </div>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button variant="primary" size="lg" style={{ width: '100%', justifyContent: 'center' }} onClick={onLogin}>Continue →</Button>
          <div className="text-xs muted mt-4" style={{ textAlign: 'center' }}>
            Protected by 2FA · last sign in 2 hours ago
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs muted" style={{ justifyContent: 'center' }}>
          <Icon name="shield" size={11} /> Two-user agency account · Vector Industries
        </div>
      </div>
    </div>
  );
}

// ============== DASHBOARD (phase tracker) ==============
function Dashboard({ onNav }) {
  const phases = window.PHASES;
  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const done = phases.reduce((s, p) => s + p.tasks.filter(t => t.status === 'done').length, 0);
  const inProg = phases.reduce((s, p) => s + p.tasks.filter(t => t.status === 'in-progress').length, 0);
  const blocked = phases.reduce((s, p) => s + p.tasks.filter(t => t.status === 'blocked').length, 0);
  const pct = Math.round((done / totalTasks) * 100);

  return (
    <div data-screen-label="02 Dashboard">
      <div className="page-head">
        <div>
          <div className="crumb">Workspace</div>
          <h1 className="h1">Q1 Content Sprint</h1>
          <p className="text-sm muted mt-1">Vector Industries · 11 weeks · 8 pillar pieces</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Icon name="download" size={12} />}>Export</Button>
          <Button size="sm" leading={<Icon name="plus" size={12} />}>Add phase</Button>
          <Button variant="primary" size="sm" leading={<Icon name="sparkles" size={12} />} onClick={() => onNav('briefs')}>New brief</Button>
        </div>
      </div>

      {/* Workflow ribbon */}
      <div className="card card-pad mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h3">Pipeline</div>
          <div className="flex gap-3 text-xs muted">
            <span className="flex items-center gap-1.5"><span className="dot" style={{ background: 'var(--mint)' }} /> {done} done</span>
            <span className="flex items-center gap-1.5"><span className="dot" style={{ background: 'var(--amber)' }} /> {inProg} active</span>
            <span className="flex items-center gap-1.5"><span className="dot" style={{ background: 'var(--coral)' }} /> {blocked} blocked</span>
            <span className="flex items-center gap-1.5"><span className="dot" style={{ background: 'var(--text-4)' }} /> {totalTasks - done - inProg - blocked} pending</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['Discovery', 'Briefing', 'Writing', 'Publishing'].map((step, i) => {
            const p = phases[i];
            const sDone = p.tasks.filter(t => t.status === 'done').length;
            const sTotal = p.tasks.length;
            const sPct = Math.round((sDone / sTotal) * 100);
            return (
              <React.Fragment key={step}>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{step}</div>
                    <div className="mono text-xs muted tabular-nums">{sDone}/{sTotal}</div>
                  </div>
                  <Bar value={sPct} tone={sPct === 100 ? 'mint' : sPct > 0 ? 'amber' : undefined} height={6} />
                </div>
                {i < 3 && <Icon name="chevRight" size={14} />}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <ScoreRing score={pct} size={56} />
          <div>
            <div className="text-sm font-medium">Overall progress · {pct}%</div>
            <div className="text-xs muted">{done} of {totalTasks} tasks complete · 3 weeks remaining</div>
          </div>
          <div style={{ marginLeft: 'auto' }} className="flex items-center gap-2">
            <Badge tone="amber">2 blocked</Badge>
            <Badge tone="cyan">on schedule</Badge>
          </div>
        </div>
      </div>

      {/* Phase columns */}
      <div className="grid responsive-2col" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {phases.map(p => (
          <div key={p.id} className="phase-card">
            <div className="phase-head">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h3">{p.title}</div>
                  <div className="text-xs muted mt-1">{p.description}</div>
                </div>
                <button className="btn btn-sm btn-ghost" style={{ padding: 0, width: 24, height: 24, justifyContent: 'center' }}>
                  <Icon name="dots" size={13} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs mono muted">
                {p.tasks.filter(t => t.status === 'done').length}/{p.tasks.length} tasks
                <Bar value={(p.tasks.filter(t => t.status === 'done').length / p.tasks.length) * 100} height={3} />
              </div>
            </div>
            <div className="phase-tasks">
              {p.tasks.map(t => (
                <div key={t.id} className="task-mini">
                  <span className="dot" style={{
                    background:
                      t.status === 'done' ? 'var(--mint)' :
                      t.status === 'in-progress' ? 'var(--amber)' :
                      t.status === 'blocked' ? 'var(--coral)' :
                      'var(--text-4)',
                  }} />
                  <span className="flex-1" style={{
                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                    color: t.status === 'done' ? 'var(--text-3)' : 'var(--text-1)',
                  }}>
                    {t.title}
                  </span>
                  {t.status === 'in-progress' && <Icon name="bolt" size={11} />}
                  {t.status === 'blocked' && <Icon name="alert" size={11} />}
                </div>
              ))}
              <button className="task-mini" style={{ background: 'transparent', borderStyle: 'dashed', color: 'var(--text-3)', justifyContent: 'center' }}>
                <Icon name="plus" size={11} /> Add task
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity rail */}
      <div className="grid mt-6 responsive-2col" style={{ gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-4">
            <div className="h3">Recent briefs</div>
            <Button variant="ghost" size="sm" trailing={<Icon name="arrowRight" size={11} />} onClick={() => onNav('briefs')}>View all</Button>
          </div>
          <div className="flex flex-col">
            {window.BRIEFS_LIST.slice(0, 4).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="mono text-xs muted" style={{ width: 60 }}>{b.id}</span>
                <span className="text-sm flex-1 truncate">{b.topic}</span>
                <StatusBadge status={b.status} />
                <span className="mono text-xs tabular-nums" style={{ minWidth: 40, textAlign: 'right',
                  color: b.quality >= 80 ? 'var(--mint)' : b.quality >= 60 ? 'var(--amber)' : 'var(--coral)' }}>{b.quality}</span>
                <span className="mono text-xs muted" style={{ width: 50, textAlign: 'right' }}>{b.updated}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3 mb-4">Knowledge base</div>
          <div className="flex items-baseline gap-2 mb-3">
            <div className="mono tabular-nums" style={{ fontSize: 28, fontWeight: 600 }}>14,130</div>
            <div className="text-xs muted">chunks indexed</div>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="muted">Topical authority</span><span className="mono">3,240</span></div>
            <div className="flex justify-between"><span className="muted">Content strategy</span><span className="mono">2,810</span></div>
            <div className="flex justify-between"><span className="muted">Technical SEO</span><span className="mono">2,160</span></div>
            <div className="flex justify-between"><span className="muted">17 other pools</span><span className="mono">5,920</span></div>
          </div>
          <Button variant="ghost" size="sm" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
            leading={<Icon name="search" size={11} />} onClick={() => onNav('knowledge')}>Browse knowledge</Button>
        </div>
      </div>
    </div>
  );
}

// ============== BRIEFS LIST ==============
function BriefsList({ onOpen, onNew }) {
  const [filter, setFilter] = useState_p('all');
  const items = filter === 'all' ? window.BRIEFS_LIST : window.BRIEFS_LIST.filter(b => b.status === filter);
  const counts = {
    all: window.BRIEFS_LIST.length,
    draft: window.BRIEFS_LIST.filter(b => b.status === 'draft').length,
    reviewing: window.BRIEFS_LIST.filter(b => b.status === 'reviewing').length,
    approved: window.BRIEFS_LIST.filter(b => b.status === 'approved').length,
  };
  return (
    <div data-screen-label="04 Briefs">
      <div className="page-head">
        <div>
          <div className="crumb">Library</div>
          <h1 className="h1">Content Briefs</h1>
          <p className="text-sm muted mt-1">AI-generated briefs with heading hierarchy, entity mapping, and SERP rules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Icon name="filter" size={12} />}>Filter</Button>
          <Button variant="ghost" size="sm" leading={<Icon name="upload" size={12} />}>Import</Button>
          <Button variant="primary" size="sm" leading={<Icon name="sparkles" size={12} />} onClick={onNew}>New brief</Button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 mb-4">
        <Tabs
          items={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'draft', label: 'Draft', count: counts.draft },
            { id: 'reviewing', label: 'Review', count: counts.reviewing },
            { id: 'approved', label: 'Approved', count: counts.approved },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div style={{ flex: 1 }} />
        <div className="flex items-center gap-2" style={{ flex: 1, maxWidth: 320 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
              <Icon name="search" size={13} />
            </span>
            <input className="input input-sm" style={{ paddingLeft: 30, height: 30 }} placeholder="Find brief by topic, niche…" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll card">
      <div className="table-grid" style={{ background: 'var(--bg-elev)' }}>
        <div className="grid" style={{
          gridTemplateColumns: '56px minmax(0,1fr) 130px 130px 100px 90px 100px 80px 28px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-3)', gap: 12, alignItems: 'center',
        }}>
          <span>ID</span>
          <span>Topic</span>
          <span>Niche</span>
          <span>Type</span>
          <span style={{ textAlign: 'right' }}>Quality</span>
          <span style={{ textAlign: 'right' }}>Volume</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Updated</span>
          <span />
        </div>
        {items.map(b => (
          <div key={b.id} className="grid"
            onClick={() => onOpen(b)}
            style={{
              gridTemplateColumns: '56px minmax(0,1fr) 130px 130px 100px 90px 100px 80px 28px',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', alignItems: 'center', gap: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <span className="mono text-xs muted truncate">{b.id}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{b.topic}</div>
              {b.hasWriter && (
                <div className="mono text-xs flex items-center gap-1.5 mt-1" style={{ color: 'var(--cyan)' }}>
                  <Icon name="write" size={10} /> writer session
                </div>
              )}
            </div>
            <span className="text-sm muted truncate">{b.niche}</span>
            <Badge mono={false}>{b.pageType}</Badge>
            <div className="flex items-center gap-2 justify-end">
              <Bar value={b.quality} tone={b.quality >= 80 ? 'mint' : b.quality >= 60 ? 'amber' : 'coral'} height={4} />
              <span className="mono text-xs tabular-nums" style={{ minWidth: 24, textAlign: 'right',
                color: b.quality >= 80 ? 'var(--mint)' : b.quality >= 60 ? 'var(--amber)' : 'var(--coral)' }}>
                {b.quality}
              </span>
            </div>
            <span className="mono text-xs tabular-nums" style={{ textAlign: 'right' }}>{(b.volume / 1000).toFixed(1)}k</span>
            <StatusBadge status={b.status} />
            <span className="mono text-xs muted" style={{ textAlign: 'right' }}>{b.updated}</span>
            <button className="btn btn-sm btn-ghost" style={{ padding: 0, width: 24, height: 24, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
              <Icon name="dots" size={13} />
            </button>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ============== KNOWLEDGE BROWSER ==============
function Knowledge() {
  const [query, setQuery] = useState_p('topical map for comparison pages');
  const [cat, setCat] = useState_p('all');
  const [topK, setTopK] = useState_p(10);
  const results = window.KNOWLEDGE_RESULTS;

  return (
    <div data-screen-label="03 Knowledge">
      <div className="page-head">
        <div>
          <div className="crumb">Library</div>
          <h1 className="h1">Knowledge Base</h1>
          <p className="text-sm muted mt-1">14,130 chunks across 17 agent pools · hybrid search (vector + BM25)</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="card card-pad mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
              <Icon name="search" size={14} />
            </span>
            <input className="input" style={{ paddingLeft: 36, height: 36, fontSize: 14 }} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Button variant="primary" leading={<Icon name="sparkles" size={12} />}>Search</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="eyebrow">Pool</span>
          {['all', 'semantic-seo', 'topical-authority', 'content-strategy', 'technical-seo', 'on-page-seo', 'schema'].map(p => (
            <button key={p} className={`tab ${cat === p ? 'active' : ''}`} onClick={() => setCat(p)} style={{ background: cat === p ? 'var(--surface)' : 'transparent' }}>
              {p}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="eyebrow">Top K</span>
          <input className="input input-sm mono" style={{ width: 60 }} value={topK} onChange={e => setTopK(e.target.value)} />
        </div>
      </div>

      <div className="text-xs muted mb-3 mono">
        {results.length} results · 38ms · embedding model · text-embedding-3-large
      </div>

      <div className="flex flex-col gap-3">
        {results.map(r => (
          <div key={r.id} className="card card-pad cursor-pointer" style={{ transition: 'border-color .12s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
            <div className="flex items-start gap-3 mb-3">
              <div style={{
                width: 44, height: 44, borderRadius: 8, display: 'grid', placeItems: 'center',
                background: 'var(--accent-faint)', color: 'var(--accent-fg)',
              }}><Icon name="file" size={18} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold truncate">{r.title}</div>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge>{r.category.replace(/^\d+-/, '')}</Badge>
                  <Badge tone="cyan">{r.sourceType}</Badge>
                  <Badge tone="default">{r.contentType}</Badge>
                  <span className="mono text-xs muted">{r.tokenCount.toLocaleString()} tok</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>
                  {(r.score * 100).toFixed(1)}%
                </div>
                <div className="eyebrow" style={{ fontSize: 9 }}>similarity</div>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              {r.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== WRITE / CONTENT WRITER ==============
function Write({ writerState = 'streaming' }) {
  const brief = window.SAMPLE_BRIEF;
  const [sel, setSel] = useState_p(3);
  const [state, setState] = useState_p(writerState); // streaming | paused | error | done | refining
  const [feedback, setFeedback] = useState_p('');

  useEffect_p(() => setState(writerState), [writerState]);

  const sec = brief.data.headings[sel];

  return (
    <div data-screen-label="06 Write">
      <div className="page-head">
        <div>
          <div className="crumb">Workspace · Writer</div>
          <h1 className="h1" style={{ fontSize: 22 }}>{brief.topic}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge tone="cyan">session · ws_a09f1</Badge>
            <span className="text-xs muted">10 sections · 2 drafted · streaming GPT-4o</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Icon name="download" size={12} />}>Export Markdown</Button>
          <Button size="sm" leading={<Icon name="check" size={12} />}>Mark complete</Button>
        </div>
      </div>

      {/* 3-pane: outline | editor | meta */}
      <div className="grid responsive-3col" style={{ gridTemplateColumns: '280px minmax(0,1fr) 280px', gap: 16, alignItems: 'flex-start' }}>
        {/* Outline */}
        <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 68 }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h3">Outline</div>
            <Badge>{brief.data.headings.length}</Badge>
          </div>
          {brief.data.headings.map((h, i) => {
            const drafted = i < 3;
            const generating = i === 3 && state === 'streaming';
            const errored = i === 3 && state === 'error';
            const active = i === sel;
            return (
              <button key={i} onClick={() => setSel(i)}
                className="w-full text-left"
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '8px 12px', paddingLeft: 12 + (h.level - 1) * 12,
                  background: active ? 'var(--surface)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                <span className="mono text-xs muted" style={{ minWidth: 18 }}>H{h.level}</span>
                <span className="text-sm flex-1" style={{
                  color: drafted ? 'var(--text-2)' : 'var(--text-1)',
                  textDecoration: drafted ? 'line-through' : 'none',
                }}>{h.text}</span>
                {drafted && <Icon name="check" size={11} />}
                {generating && <span className="dot pulse" style={{ background: 'var(--accent)' }} />}
                {errored && <span style={{ color: 'var(--coral)' }}><Icon name="alert" size={11} /></span>}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="card card-pad">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="mono text-xs muted">H{sec.level} · section {sel + 1}/{brief.data.headings.length}</span>
            <Badge tone={PATTERN_TONE[sec.contentDesignPattern]} mono={false}>
              <Icon name={PATTERN_ICON[sec.contentDesignPattern]} size={11} />
              {sec.contentDesignPattern}
            </Badge>
            <Badge tone="default">~{sec.wordCountTarget}w target</Badge>
            {state === 'streaming' && <Badge tone="cyan"><span className="dot pulse" style={{ background: 'var(--cyan)' }} /> streaming</Badge>}
            {state === 'paused' && <Badge tone="amber"><Icon name="pause" size={10} /> paused</Badge>}
            {state === 'error' && <Badge tone="coral"><Icon name="alert" size={10} /> failed</Badge>}
            {state === 'done' && <Badge tone="mint"><Icon name="check" size={10} /> accepted</Badge>}
            {state === 'refining' && <Badge tone="violet"><Icon name="sparkles" size={10} /> refining</Badge>}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" leading={<Icon name="refresh" size={11} />} onClick={() => setState('streaming')}>Regenerate</Button>
          </div>

          {/* Error banner */}
          {state === 'error' && (
            <div className="p-3 rounded mb-4 flex items-start gap-3" style={{
              background: 'var(--coral-soft)', border: '1px solid oklch(0.70 0.18 25 / 0.4)',
            }}>
              <Icon name="alert" size={14} />
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--coral)' }}>Generation failed at token 142/220</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>OpenAI returned 529 (overloaded). Output was preserved as a partial draft.</div>
              </div>
              <Button size="sm" leading={<Icon name="refresh" size={11} />} onClick={() => setState('streaming')}>Retry</Button>
            </div>
          )}

          <h2 className="h2 mb-3" style={{ fontSize: 20 }}>{sec.text}</h2>

          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-2)' }}>
            <p style={{ marginTop: 0 }}>
              Choosing the right enterprise resource planning (ERP) software is one of the most consequential decisions a manufacturer will make this decade. The 11 platforms compared below represent the top of the 2026 market by analyst coverage, deployment footprint, and verified G2 ratings. Each is positioned for a specific intersection of <span className="mono" style={{ background: 'var(--accent-faint)', padding: '0 4px', borderRadius: 3, color: 'var(--accent-fg)' }}>company size</span>, <span className="mono" style={{ background: 'var(--accent-faint)', padding: '0 4px', borderRadius: 3, color: 'var(--accent-fg)' }}>manufacturing sub-vertical</span>, and <span className="mono" style={{ background: 'var(--accent-faint)', padding: '0 4px', borderRadius: 3, color: 'var(--accent-fg)' }}>deployment preference</span> — none is universally "best."
            </p>
            {state !== 'error' && (
              <p>
                For mid-market discrete manufacturers, NetSuite and Microsoft Dynamics 365 lead on time-to-value and Power Platform extensibility. Large process manufacturers gravitate to SAP S/4HANA and Infor CloudSuite for their depth in batch and recipe management. Niche
                {state === 'streaming' && (
                  <span style={{ display: 'inline-block', width: 6, height: 14, background: 'var(--accent)', verticalAlign: 'text-bottom', animation: 'pulse-soft 1s infinite', marginLeft: 2 }} />
                )}
              </p>
            )}
            {state === 'paused' && (
              <div className="text-xs muted" style={{ marginTop: 8 }}>… stopped at "Niche" · resume to continue</div>
            )}
            {state === 'done' && (
              <p>... vendors like IFS Cloud and Plex Systems serve specialized verticals (process, aerospace, defense). The recommendation matrix below maps each vendor to its strongest match.</p>
            )}
          </div>

          {/* Refine input */}
          {state === 'refining' && (
            <div className="p-3 rounded mt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="field-label flex items-center justify-between">
                <span>Refine prompt</span>
                <Badge tone="violet">applies to this section only</Badge>
              </div>
              <textarea className="textarea" rows={2} value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Describe what to change — 'Add 2026 G2 ratings to each vendor', 'Cut the intro by half', 'Add citation links'…" autoFocus />
              <div className="flex items-center gap-2 mt-2">
                <Button variant="primary" size="sm" leading={<Icon name="sparkles" size={11} />}
                  onClick={() => { setState('streaming'); setFeedback(''); }}
                  disabled={!feedback.trim()}>Apply refinement</Button>
                <Button variant="ghost" size="sm" onClick={() => setState('paused')}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Footer toolbar */}
          <div className="flex items-center gap-2 mt-4 pt-3 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
            <Badge mono={false} tone="cyan"><Icon name="bolt" size={11} /> gpt-4o</Badge>
            <span className="mono text-xs muted tabular-nums">
              {state === 'done' ? '220' : state === 'paused' ? '142' : '142'}/220 words
            </span>
            <span style={{ flex: 1 }} />
            {state === 'streaming' && (
              <Button variant="ghost" size="sm" leading={<Icon name="pause" size={11} />} onClick={() => setState('paused')}>Pause</Button>
            )}
            {state === 'paused' && (
              <Button variant="ghost" size="sm" leading={<Icon name="play" size={11} />} onClick={() => setState('streaming')}>Resume</Button>
            )}
            {state !== 'refining' && (
              <Button variant="ghost" size="sm" leading={<Icon name="pencil" size={11} />} onClick={() => setState('refining')}>Refine</Button>
            )}
            <Button size="sm" trailing={<Icon name="arrowRight" size={11} />} onClick={() => { setState('done'); setSel(s => Math.min(s + 1, brief.data.headings.length - 1)); }}>
              Accept &amp; next
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-3" style={{ position: 'sticky', top: 68 }}>
          <div className="card card-pad">
            <div className="eyebrow mb-2">Target queries</div>
            <div className="flex flex-col gap-2">
              {sec.targetQueries.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate">{q.query}</span>
                  <span className="mono muted tabular-nums">{q.volume.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="eyebrow mb-2">Rule codes</div>
            <div className="flex gap-1.5 flex-wrap">
              {sec.ruleCodes.map(c => <Badge key={c} tone="cyan">{c}</Badge>)}
              {sec.snippetTarget && <Badge tone="accent">FS target</Badge>}
              {sec.paaTarget && <Badge tone="amber">PAA target</Badge>}
            </div>
          </div>
          <div className="card card-pad">
            <div className="eyebrow mb-2">Structure instructions</div>
            <div className="text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
              {sec.structureInstructions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== CHAT ==============
function Chat() {
  const [pool, setPool] = useState_p('all');
  const [input, setInput] = useState_p('What featured snippets should I target?');
  const pools = [
    { value: 'all', label: 'All knowledge' },
    { value: 'content', label: 'Content' },
    { value: 'technical', label: 'Technical' },
    { value: 'local', label: 'Local SEO' },
    { value: 'on-page', label: 'On-page' },
    { value: 'strategy', label: 'Strategy' },
  ];
  const history = window.CHAT_HISTORY;
  return (
    <div data-screen-label="07 Chat" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="crumb">Workspace</div>
          <h1 className="h1">RAG Chat</h1>
          <p className="text-sm muted mt-1">Ask about SEO strategy across 14,130 indexed chunks from Koray's resources.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="eyebrow">Agent pool</span>
        {pools.map(p => (
          <button key={p.value} className={`tab ${pool === p.value ? 'active' : ''}`}
            onClick={() => setPool(p.value)}
            style={{ background: pool === p.value ? 'var(--surface)' : 'transparent' }}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
        <div className="flex flex-col gap-4">
          {history.map((m, i) => (
            <div key={i} className="flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div className="avatar" style={{ width: 28, height: 28, marginRight: 10, alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}>
                  <Icon name="sparkles" size={13} />
                </div>
              )}
              <div className="flex flex-col gap-2" style={{ maxWidth: '70%', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div className={`bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
                {m.sources && (
                  <div className="flex items-center gap-2 flex-wrap" style={{ paddingLeft: 4 }}>
                    <span className="eyebrow" style={{ fontSize: 9 }}>sources</span>
                    {m.sources.map(s => (
                      <span key={s.id} className="source-pill"><Icon name="file" size={10} /> {s.title}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* streaming bubble */}
          <div className="flex" style={{ justifyContent: 'flex-start' }}>
            <div className="avatar" style={{ width: 28, height: 28, marginRight: 10, alignSelf: 'flex-start',
              background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}>
              <Icon name="sparkles" size={13} />
            </div>
            <div className="bubble bubble-ai pulse" style={{ display: 'inline-flex', gap: 4 }}>
              <span className="dot" style={{ background: 'var(--text-3)' }} />
              <span className="dot" style={{ background: 'var(--text-3)' }} />
              <span className="dot" style={{ background: 'var(--text-3)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card card-pad mt-4" style={{ padding: 14 }}>
        <div className="flex items-center gap-2 mb-2 text-xs muted">
          <Icon name="layers" size={11} />
          <span className="mono">retrieving · top 8 from <span style={{ color: 'var(--accent)' }}>{pool === 'all' ? '17 pools' : pool}</span></span>
          <span style={{ flex: 1 }} />
          <span className="mono">⌘↵ to send</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea className="textarea" rows={2} value={input} onChange={e => setInput(e.target.value)} style={{ resize: 'none', flex: 1 }} />
          <Button variant="primary" trailing={<Icon name="arrowRight" size={12} />}>Send</Button>
        </div>
      </div>
    </div>
  );
}

// ============== HISTORY ==============
function History() {
  const items = window.HISTORY_ITEMS;
  const kindMeta = {
    brief:   { tone: 'accent', icon: 'briefs', label: 'Brief' },
    section: { tone: 'cyan',   icon: 'write', label: 'Section' },
    chat:    { tone: 'violet', icon: 'chat', label: 'Chat' },
  };
  return (
    <div data-screen-label="08 History">
      <div className="page-head">
        <div>
          <div className="crumb">Library</div>
          <h1 className="h1">Generation history</h1>
          <p className="text-sm muted mt-1">All AI generations across briefs, sections, and chat.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leading={<Icon name="filter" size={12} />}>Filter</Button>
          <Button variant="ghost" size="sm" leading={<Icon name="download" size={12} />}>Export CSV</Button>
        </div>
      </div>

      <div className="grid mb-4 responsive-2col" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="card card-pad">
          <div className="eyebrow mb-2">7 days</div>
          <div className="flex items-baseline gap-2">
            <div className="mono tabular-nums" style={{ fontSize: 24, fontWeight: 600 }}>47</div>
            <div className="text-xs muted">generations</div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow mb-2">Tokens used</div>
          <div className="flex items-baseline gap-2">
            <div className="mono tabular-nums" style={{ fontSize: 24, fontWeight: 600 }}>184k</div>
            <div className="text-xs muted">/ 500k</div>
          </div>
          <Bar value={37} height={3} />
        </div>
        <div className="card card-pad">
          <div className="eyebrow mb-2">Avg quality</div>
          <div className="flex items-baseline gap-2">
            <div className="mono tabular-nums" style={{ fontSize: 24, fontWeight: 600, color: 'var(--mint)' }}>84</div>
            <div className="text-xs muted">/ 100</div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow mb-2">Briefs published</div>
          <div className="flex items-baseline gap-2">
            <div className="mono tabular-nums" style={{ fontSize: 24, fontWeight: 600 }}>6</div>
            <div className="text-xs muted">/ 8 planned</div>
          </div>
        </div>
      </div>

      <div className="table-scroll card">
      <div className="table-grid" style={{ background: 'var(--bg-elev)' }}>
        <div className="grid" style={{
          gridTemplateColumns: '110px minmax(0,1fr) 120px 100px 140px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--text-3)', gap: 12,
        }}>
          <span>Kind</span>
          <span>Topic</span>
          <span>Agent</span>
          <span style={{ textAlign: 'right' }}>Tokens</span>
          <span style={{ textAlign: 'right' }}>When</span>
        </div>
        {items.map(it => {
          const km = kindMeta[it.kind];
          return (
            <div key={it.id} className="grid"
              style={{
                gridTemplateColumns: '110px minmax(0,1fr) 120px 100px 140px',
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <Badge tone={km.tone} mono={false}><Icon name={km.icon} size={11} /> {km.label}</Badge>
              <span className="text-sm truncate">{it.topic}</span>
              <span className="mono text-xs muted">{it.agent}</span>
              <span className="mono text-xs tabular-nums" style={{ textAlign: 'right' }}>{it.tokens.toLocaleString()}</span>
              <span className="mono text-xs muted" style={{ textAlign: 'right' }}>{it.at}</span>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginPage, Dashboard, BriefsList, Knowledge, Write, Chat, History });
