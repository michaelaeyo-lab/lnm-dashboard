/* Remaining flows: New Brief, Command palette, Mobile sidebar, Writer states */

const { useState: useExS, useEffect: useExE, useRef: useExR, useMemo: useExM } = React;

// ============== NEW BRIEF FLOW ==============
// Three modes: 'generate' (AI agent), 'form' (manual), 'import' (paste outline)

const PIPELINE_STEPS = [
  { id: 1,  label: 'Researching keywords & SERP data',     icon: 'search'     },
  { id: 2,  label: 'Retrieving knowledge base',            icon: 'knowledge'  },
  { id: 3,  label: 'Collecting competitor data',           icon: 'layers'     },
  { id: 4,  label: 'Analyzing query intent & audience',    icon: 'target'     },
  { id: 5,  label: 'Analyzing SERP patterns',              icon: 'map'        },
  { id: 6,  label: 'Analyzing competitors in depth',       icon: 'eye'        },
  { id: 7,  label: 'Mapping contextual vectors & entities',icon: 'star'       },
  { id: 8,  label: 'Building heading hierarchy & title',   icon: 'layers'     },
  { id: 9,  label: 'Generating structure & mapping queries', icon: 'code'     },
  { id: 10, label: 'Mapping internal connections',         icon: 'link'       },
  { id: 11, label: 'Validating heading quality',           icon: 'shield'     },
  { id: 12, label: 'Scoring brief quality',                icon: 'star'       },
];

function NewBriefFlow({ onCancel, onDone }) {
  const [mode, setMode] = useExS('generate'); // generate | form | import
  const [running, setRunning] = useExS(false);
  const [topic, setTopic] = useExS('');
  const [niche, setNiche] = useExS('B2B SaaS');
  const [pageType, setPageType] = useExS('comparison');
  const [location, setLocation] = useExS('');
  const [showAdv, setShowAdv] = useExS(false);

  // simulated progress
  const [currentStep, setCurrentStep] = useExS(0);
  const [progress, setProgress] = useExS(0);
  const [stepLabel, setStepLabel] = useExS('');
  const timer = useExR(null);

  useExE(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startGenerate = () => {
    if (!topic.trim()) return;
    setRunning(true);
    setCurrentStep(0);
    setProgress(0);
    setStepLabel('Booting pipeline…');
    let step = 0;
    timer.current = setInterval(() => {
      step += 1;
      if (step > PIPELINE_STEPS.length) {
        clearInterval(timer.current);
        setProgress(1);
        setStepLabel('Brief ready ·  v1 created');
        setTimeout(() => { setRunning(false); onDone?.(); }, 1100);
        return;
      }
      setCurrentStep(step);
      setProgress(step / PIPELINE_STEPS.length);
      setStepLabel(PIPELINE_STEPS[step - 1].label + '…');
    }, 700);
  };

  // Generating state
  if (running) {
    return (
      <div data-screen-label="04a New Brief — Generating">
        <div className="page-head">
          <div>
            <div className="crumb">Briefs · New</div>
            <h1 className="h1">Generating brief</h1>
            <p className="text-sm muted mt-1">{topic} · {niche} / {pageType}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { clearInterval(timer.current); setRunning(false); }}>
            <Icon name="x" size={12} /> Cancel
          </Button>
        </div>

        <div className="grid responsive-2col" style={{ gridTemplateColumns: '1fr 360px', gap: 16 }}>
          {/* Pipeline timeline */}
          <div className="card card-pad">
            <div className="flex items-center justify-between mb-4">
              <div className="h3">Pipeline</div>
              <div className="mono text-sm tabular-nums">
                <span style={{ color: 'var(--accent)' }}>{Math.round(progress * 100)}%</span>
                <span className="muted"> · step {Math.min(currentStep, 12)} / 12</span>
              </div>
            </div>
            <div className="mb-5">
              <Bar value={progress * 100} height={6} />
            </div>
            <div className="flex flex-col gap-1">
              {PIPELINE_STEPS.map(s => {
                const done = currentStep > s.id;
                const active = currentStep === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center',
                      background: done ? 'var(--mint-soft)' :
                                  active ? 'var(--accent-soft)' :
                                  'var(--surface)',
                      color: done ? 'var(--mint)' : active ? 'var(--accent-fg)' : 'var(--text-3)',
                      border: `1px solid ${done ? 'oklch(0.78 0.13 165 / 0.3)' : active ? 'oklch(0.68 0.17 290 / 0.4)' : 'var(--border)'}`,
                    }}>
                      {done ? <Icon name="check" size={11} /> :
                       active ? <span className="dot pulse" style={{ background: 'var(--accent)' }} /> :
                       <span className="mono text-xs">{s.id}</span>}
                    </div>
                    <span className="text-sm" style={{
                      color: done ? 'var(--text-2)' : active ? 'var(--text-1)' : 'var(--text-3)',
                      fontWeight: active ? 500 : 400,
                    }}>{s.label}</span>
                    {active && (
                      <span style={{ marginLeft: 'auto' }} className="mono text-xs muted pulse">running</span>
                    )}
                    {done && (
                      <span className="mono text-xs" style={{ marginLeft: 'auto', color: 'var(--mint)' }}>done</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mono text-xs muted mt-4" style={{ textAlign: 'center' }}>
              {stepLabel}
            </div>
          </div>

          {/* Live activity */}
          <div className="card card-pad" style={{ alignSelf: 'flex-start', position: 'sticky', top: 68 }}>
            <div className="eyebrow mb-3">Live signals</div>
            <div className="flex flex-col gap-3">
              <Signal label="SERP fetched" value="10 results" done={currentStep >= 1} />
              <Signal label="Knowledge chunks" value="14,130 indexed" done={currentStep >= 2} active={currentStep === 2} />
              <Signal label="Competitors mapped" value="4 deep-analyzed" done={currentStep >= 3} active={currentStep === 3} />
              <Signal label="Audience segments" value="3 detected" done={currentStep >= 4} active={currentStep === 4} />
              <Signal label="Entity map" value="16 entities" done={currentStep >= 7} active={currentStep === 7} />
              <Signal label="Headings drafted" value="10 H1–H4" done={currentStep >= 8} active={currentStep === 8} />
              <Signal label="Internal links" value="4 connections" done={currentStep >= 10} active={currentStep === 10} />
              <Signal label="Quality score" value={progress >= 1 ? '87 / 100' : '—'} done={progress >= 1} active={currentStep === 12} />
            </div>
            <div className="text-xs muted mt-4 p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Icon name="bolt" size={11} /> avg generation time · ~90s · models · gpt-4o · text-embedding-3-large
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode selector
  return (
    <div data-screen-label="04a New Brief">
      <div className="page-head">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-ghost" onClick={onCancel}>
            <Icon name="chevLeft" size={13} /> Briefs
          </button>
          <div>
            <h1 className="h1">New brief</h1>
            <p className="text-sm muted mt-1">Generate from a topic, build manually, or paste an outline.</p>
          </div>
        </div>
      </div>

      {/* Mode cards */}
      <div className="grid responsive-3col mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <ModeCard mode="generate" active={mode === 'generate'} onClick={() => setMode('generate')}
          icon="sparkles" title="AI Generate" sub="12-step agent pipeline · ~90s · v2"
          tag={<Badge tone="accent">recommended</Badge>} />
        <ModeCard mode="form" active={mode === 'form'} onClick={() => setMode('form')}
          icon="pencil" title="Quick form" sub="Type headings manually · skip the agent" />
        <ModeCard mode="import" active={mode === 'import'} onClick={() => setMode('import')}
          icon="upload" title="Import outline" sub="Paste markdown or numbered list" />
      </div>

      {mode === 'generate' && (
        <div className="grid responsive-2col" style={{ gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'flex-start' }}>
          <div className="card card-pad">
            <div className="h3 mb-4">Topic & context</div>
            <div className="mb-4">
              <div className="field-label">Topic *</div>
              <input className="input" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g., Best ERP software for manufacturing in 2026" autoFocus />
            </div>
            <div className="grid mb-4" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="field-label">Page type *</div>
                <select className="select" value={pageType} onChange={e => setPageType(e.target.value)}>
                  <option value="comparison">Comparison</option>
                  <option value="guide">Guide</option>
                  <option value="review">Vendor review</option>
                  <option value="service">Service page</option>
                  <option value="location">Location page</option>
                  <option value="blog">Blog post</option>
                  <option value="landing">Landing page</option>
                </select>
              </div>
              <div>
                <div className="field-label">Niche</div>
                <select className="select" value={niche} onChange={e => setNiche(e.target.value)}>
                  <option>B2B SaaS</option>
                  <option>AI tooling</option>
                  <option>SEO</option>
                  <option>Local SEO</option>
                  <option>Technical SEO</option>
                  <option>General</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <div className="field-label">Location (optional)</div>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Bristol, UK" />
            </div>

            <button className="btn btn-sm btn-ghost mb-3" onClick={() => setShowAdv(s => !s)}>
              <Icon name={showAdv ? 'chevDown' : 'chevRight'} size={11} /> Advanced options
            </button>
            {showAdv && (
              <div className="p-3 rounded mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div className="field-label">Client</div>
                    <input className="input" placeholder="e.g., Vector Industries" defaultValue="Vector Industries" />
                  </div>
                  <div>
                    <div className="field-label">Domain</div>
                    <input className="input mono" placeholder="example.com" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="field-label">Seed keywords (CSV upload)</div>
                  <div className="p-3 rounded text-center" style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
                    <Icon name="upload" size={16} />
                    <div className="text-xs muted mt-2">Drop CSV or <span style={{ color: 'var(--accent)' }}>browse</span> · keyword,volume,intent</div>
                  </div>
                </div>
              </div>
            )}

            <Button variant="primary" size="lg" leading={<Icon name="sparkles" size={13} />}
              onClick={startGenerate} disabled={!topic.trim()}>
              Generate brief
            </Button>
            <span className="text-xs muted" style={{ marginLeft: 12 }}>~90 seconds · 12 steps</span>
          </div>

          <div className="card card-pad">
            <div className="eyebrow mb-3">What the agent does</div>
            <div className="flex flex-col gap-3">
              {PIPELINE_STEPS.slice(0, 6).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <Icon name={s.icon} size={12} />
                  <span className="muted">{s.label}</span>
                </div>
              ))}
              <div className="text-xs muted mt-1">+ 6 more · validation & scoring</div>
            </div>
          </div>
        </div>
      )}

      {mode === 'form' && (
        <ManualForm topic={topic} setTopic={setTopic} niche={niche} setNiche={setNiche}
          pageType={pageType} setPageType={setPageType} location={location} setLocation={setLocation}
          onSubmit={() => onDone?.()} />
      )}

      {mode === 'import' && (
        <ImportFlow onSubmit={() => onDone?.()} />
      )}
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, sub, tag }) {
  return (
    <button onClick={onClick}
      className="card card-pad cursor-pointer"
      style={{
        textAlign: 'left', border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent-faint)' : 'var(--bg-elev)', cursor: 'pointer', font: 'inherit', color: 'inherit',
        boxShadow: active ? '0 0 0 3px var(--accent-faint)' : 'none',
        transition: 'border-color .12s, box-shadow .12s, background .12s',
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{
          width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center',
          background: active ? 'var(--accent)' : 'var(--surface)',
          color: active ? 'white' : 'var(--text-2)',
        }}>
          <Icon name={icon} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold">{title}</div>
            {tag}
          </div>
          <div className="text-xs muted mt-1">{sub}</div>
        </div>
        {active && <Icon name="check" size={14} />}
      </div>
    </button>
  );
}

function Signal({ label, value, done, active }) {
  return (
    <div className="flex items-center gap-3">
      <span className="dot" style={{
        width: 8, height: 8,
        background: done ? 'var(--mint)' : active ? 'var(--accent)' : 'var(--text-4)',
      }} />
      <span className="text-sm" style={{ color: done || active ? 'var(--text-1)' : 'var(--text-3)' }}>{label}</span>
      <span className="mono text-xs muted tabular-nums" style={{ marginLeft: 'auto' }}>{value}</span>
    </div>
  );
}

function ManualForm({ topic, setTopic, niche, setNiche, pageType, setPageType, location, setLocation, onSubmit }) {
  const [headings, setHeadings] = useExS([{ level: 1, text: '', intent: '' }]);
  const add = () => setHeadings(h => [...h, { level: 2, text: '', intent: '' }]);
  const remove = i => setHeadings(h => h.length > 1 ? h.filter((_, x) => x !== i) : h);
  const update = (i, k, v) => setHeadings(h => h.map((x, j) => j === i ? { ...x, [k]: v } : x));
  return (
    <div className="card card-pad" style={{ maxWidth: 880 }}>
      <div className="h3 mb-4">Manual brief</div>
      <div className="grid mb-4" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="field-label">Page type</div>
          <select className="select" value={pageType} onChange={e => setPageType(e.target.value)}>
            <option value="comparison">Comparison</option><option value="guide">Guide</option>
            <option value="review">Review</option><option value="service">Service page</option>
            <option value="location">Location page</option><option value="blog">Blog post</option>
          </select>
        </div>
        <div>
          <div className="field-label">Niche</div>
          <select className="select" value={niche} onChange={e => setNiche(e.target.value)}>
            <option>B2B SaaS</option><option>AI tooling</option><option>SEO</option>
            <option>Local SEO</option><option>General</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <div className="field-label">Topic *</div>
        <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Main keyword / topic" />
      </div>
      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="field-label">Location</div>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div>
          <div className="field-label">Client / brand</div>
          <input className="input" placeholder="optional" />
        </div>
      </div>

      <div className="field-label flex items-center justify-between">
        <span>Headings *</span>
        <span className="mono text-xs">{headings.length} section{headings.length !== 1 && 's'}</span>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        {headings.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <select className="select" style={{ width: 70 }} value={h.level} onChange={e => update(i, 'level', +e.target.value)}>
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option><option value={4}>H4</option>
            </select>
            <input className="input flex-1" value={h.text} onChange={e => update(i, 'text', e.target.value)}
              placeholder={i === 0 ? 'Main heading (H1)…' : 'Section heading…'}
              style={{ paddingLeft: 12 + (h.level - 1) * 12 }} />
            <input className="input" style={{ width: 180 }} value={h.intent} onChange={e => update(i, 'intent', e.target.value)}
              placeholder="intent (optional)" />
            <button className="btn btn-sm btn-ghost" style={{ width: 28, padding: 0, justifyContent: 'center' }}
              onClick={() => remove(i)} disabled={headings.length === 1}>
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-ghost mb-4" onClick={add}>
        <Icon name="plus" size={11} /> Add heading
      </button>

      <div className="mb-5">
        <div className="field-label">Additional instructions</div>
        <textarea className="textarea" rows={2} placeholder="Any extra writing instructions…" />
      </div>

      <Button variant="primary" leading={<Icon name="check" size={12} />} onClick={onSubmit}
        disabled={!topic.trim() || !headings[0].text.trim()}>
        Create content session
      </Button>
    </div>
  );
}

function ImportFlow({ onSubmit }) {
  const [raw, setRaw] = useExS('');
  const [parsed, setParsed] = useExS(null);
  const parse = () => {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const headings = [];
    for (const line of lines) {
      const md = line.match(/^(#{1,4})\s+(.+)/);
      if (md) { headings.push({ level: md[1].length, text: md[2] }); continue; }
      const num = line.match(/^\d+[.)]\s+(.+)/);
      if (num) { headings.push({ level: 2, text: num[1] }); continue; }
      headings.push({ level: headings.length === 0 ? 1 : 2, text: line });
    }
    setParsed(headings);
  };
  return (
    <div className="card card-pad" style={{ maxWidth: 880 }}>
      <div className="h3 mb-2">Paste outline</div>
      <p className="text-sm muted mb-3">Accepts markdown (# / ##), numbered lists (1. / 2.), or plain text. Each line becomes a heading.</p>
      <textarea className="textarea mono" rows={10} value={raw} onChange={e => { setRaw(e.target.value); setParsed(null); }}
        placeholder={`# Best ERP software for manufacturing in 2026\n## What ERP does best for manufacturing\n### Discrete vs process manufacturing ERP\n## Top 11 ERP platforms ranked\n### SAP S/4HANA Cloud\n### Microsoft Dynamics 365\n## How to choose: a 7-step framework\n## Pricing & total cost of ownership\n## FAQ`} />
      <div className="flex items-center gap-2 mt-3">
        {!parsed && (
          <Button variant="primary" onClick={parse} disabled={!raw.trim()}
            leading={<Icon name="sparkles" size={12} />}>Parse headings</Button>
        )}
        {parsed && (
          <>
            <Button variant="primary" onClick={onSubmit} leading={<Icon name="check" size={12} />}>
              Create session · {parsed.length} sections
            </Button>
            <Button variant="ghost" onClick={() => setParsed(null)}>Re-parse</Button>
          </>
        )}
      </div>
      {parsed && (
        <div className="mt-4 p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-2">Parsed · {parsed.length} headings</div>
          <div className="flex flex-col gap-1">
            {parsed.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ paddingLeft: (h.level - 1) * 16 }}>
                <span className="mono text-xs muted">H{h.level}</span>
                <span>{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== COMMAND PALETTE (⌘K) ==============
function CommandPalette({ open, onClose, onAction }) {
  const [q, setQ] = useExS('');
  const inputRef = useExR(null);
  useExE(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ('');
  }, [open]);

  const allItems = useExM(() => [
    { id: 'go-dashboard',  group: 'Navigate', icon: 'dashboard', label: 'Go to Dashboard',  shortcut: 'G D', action: { type: 'nav', target: 'dashboard' } },
    { id: 'go-briefs',     group: 'Navigate', icon: 'briefs',    label: 'Go to Briefs',     shortcut: 'G B', action: { type: 'nav', target: 'briefs' } },
    { id: 'go-knowledge',  group: 'Navigate', icon: 'knowledge', label: 'Go to Knowledge',  shortcut: 'G K', action: { type: 'nav', target: 'knowledge' } },
    { id: 'go-write',      group: 'Navigate', icon: 'write',     label: 'Go to Writer',     shortcut: 'G W', action: { type: 'nav', target: 'write' } },
    { id: 'go-chat',       group: 'Navigate', icon: 'chat',      label: 'Go to Chat',       shortcut: 'G C', action: { type: 'nav', target: 'chat' } },
    { id: 'go-history',    group: 'Navigate', icon: 'history',   label: 'Go to History',    shortcut: 'G H', action: { type: 'nav', target: 'history' } },
    { id: 'new-brief',     group: 'Actions',  icon: 'sparkles',  label: 'New brief',        shortcut: 'N B', action: { type: 'new-brief' } },
    { id: 'new-chat',      group: 'Actions',  icon: 'chat',      label: 'New RAG chat',     shortcut: 'N C', action: { type: 'nav', target: 'chat' } },
    { id: 'toggle-theme',  group: 'Actions',  icon: 'sun',       label: 'Toggle theme',     shortcut: '⇧ T', action: { type: 'toggle-theme' } },
    { id: 'toggle-tweaks', group: 'Actions',  icon: 'settings',  label: 'Open Tweaks panel',shortcut: '',    action: { type: 'tweaks' } },
    ...window.BRIEFS_LIST.map(b => ({
      id: 'brief-' + b.id, group: 'Recent briefs', icon: 'briefs',
      label: b.topic, hint: `${b.niche} · v${b.version}`, status: b.status,
      action: { type: 'open-brief', brief: b },
    })),
    { id: 'kw-1', group: 'Knowledge search', icon: 'search', label: 'Topical map prioritization framework', hint: '02-topical-authority' },
    { id: 'kw-2', group: 'Knowledge search', icon: 'search', label: 'Featured snippet capture strategies', hint: '05-on-page-seo' },
  ], []);

  const filtered = useExM(() => {
    if (!q.trim()) return allItems;
    const ql = q.toLowerCase();
    return allItems.filter(i => i.label.toLowerCase().includes(ql) || (i.hint || '').toLowerCase().includes(ql));
  }, [q, allItems]);

  const groups = useExM(() => {
    const g = {};
    filtered.forEach(i => { (g[i.group] ||= []).push(i); });
    return g;
  }, [filtered]);

  const [selected, setSelected] = useExS(0);
  useExE(() => { setSelected(0); }, [q]);

  useExE(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); const item = filtered[selected]; if (item?.action) onAction(item.action); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selected, onAction, onClose]);

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)',
      display: 'grid', placeItems: 'start center', paddingTop: '12vh', zIndex: 100, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} className="slidein"
        style={{
          width: 'min(640px, 92vw)', background: 'var(--bg-elev)',
          border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 24px 60px oklch(0 0 0 / 0.5), 0 6px 16px oklch(0 0 0 / 0.4)',
          overflow: 'hidden',
        }}>
        {/* Input */}
        <div className="flex items-center gap-3" style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <Icon name="search" size={16} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search briefs, headings, entities, commands…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-1)', fontSize: 15, fontFamily: 'inherit',
            }} />
          <span className="kbd">ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '50vh', overflow: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div className="text-sm muted" style={{ padding: 24, textAlign: 'center' }}>
              No matches for <span className="mono">"{q}"</span>
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="eyebrow" style={{ padding: '8px 16px 4px' }}>{group}</div>
              {items.map((item) => {
                runningIdx += 1;
                const isSel = runningIdx === selected;
                return (
                  <button key={item.id}
                    onMouseEnter={() => setSelected(runningIdx)}
                    onClick={() => { if (item.action) onAction(item.action); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                      padding: '8px 16px', border: 'none', cursor: 'pointer',
                      background: isSel ? 'var(--surface)' : 'transparent',
                      borderLeft: `2px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                      color: 'var(--text-1)', textAlign: 'left',
                    }}>
                    <span style={{ color: 'var(--text-3)' }}><Icon name={item.icon} size={14} /></span>
                    <span className="text-sm flex-1 truncate">{item.label}</span>
                    {item.status && <StatusBadge status={item.status} />}
                    {item.hint && <span className="mono text-xs muted truncate" style={{ maxWidth: 180 }}>{item.hint}</span>}
                    {item.shortcut && <span className="kbd">{item.shortcut}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3" style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> select</span>
          <span><span className="kbd">esc</span> close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} result{filtered.length !== 1 && 's'}</span>
        </div>
      </div>
    </div>
  );
}

// ============== MOBILE SIDEBAR SHEET ==============
function MobileSidebarSheet({ open, onClose, children }) {
  useExE(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.55)', zIndex: 90,
      display: 'block', backdropFilter: 'blur(2px)',
    }}>
      <aside onClick={e => e.stopPropagation()} className="slidein"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
          background: 'var(--bg-elev)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideinLeft .2s ease both',
        }}>
        {children}
      </aside>
    </div>
  );
}

window.NewBriefFlow = NewBriefFlow;
window.CommandPalette = CommandPalette;
window.MobileSidebarSheet = MobileSidebarSheet;
