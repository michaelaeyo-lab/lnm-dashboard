/* Brief Detail — two-pane outline + inspector */

const { useState, useMemo } = React;

const PATTERN_ICON = { paragraph: 'paragraph', table: 'table', list: 'list', comparison: 'layers', visual: 'image' };
const PATTERN_TONE = { paragraph: 'default', table: 'cyan', list: 'amber', comparison: 'violet', visual: 'mint' };

// ===== Outline heading row =====
function HeadingRow({ heading, idx, active, onSelect }) {
  const totalVol = heading.targetQueries.reduce((s, q) => s + q.volume, 0);
  return (
    <div
      className={`outline-row indent-${heading.level} ${active ? 'expanded' : ''}`}
      onClick={() => onSelect(idx)}
      data-comment-anchor={`heading-${idx}`}
    >
      <div className="outline-level mono">H{heading.level}</div>
      <div className="outline-text">{heading.text}</div>
      <div className="outline-meta">
        {heading.contentDesignPattern && (
          <Badge tone={PATTERN_TONE[heading.contentDesignPattern]} mono={false}>
            <Icon name={PATTERN_ICON[heading.contentDesignPattern] || 'paragraph'} size={11} />
            {heading.contentDesignPattern}
          </Badge>
        )}
        {heading.snippetTarget && <Badge tone="accent">FS</Badge>}
        {heading.paaTarget && <Badge tone="amber">PAA</Badge>}
        {totalVol > 0 && (
          <span className="mono text-xs muted tabular-nums" style={{ minWidth: 70, textAlign: 'right' }}>
            {totalVol.toLocaleString()}/mo
          </span>
        )}
      </div>
    </div>
  );
}

// ===== Inspector: per-heading detail =====
function HeadingInspector({ heading, idx, total, onClose }) {
  return (
    <div className="slidein">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="mono text-xs muted">H{heading.level} · {idx + 1}/{total}</span>
          <div className="h2" style={{ fontSize: 16 }}>{heading.text}</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          <Icon name="x" size={13} />
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {heading.contentDesignPattern && (
          <Badge tone={PATTERN_TONE[heading.contentDesignPattern]} mono={false}>
            <Icon name={PATTERN_ICON[heading.contentDesignPattern]} size={11} /> {heading.contentDesignPattern}
          </Badge>
        )}
        {heading.snippetTarget && <Badge tone="accent">FS target</Badge>}
        {heading.paaTarget && <Badge tone="amber">PAA target</Badge>}
        {heading.ruleCodes.map(c => <Badge key={c} tone="cyan">{c}</Badge>)}
      </div>

      <div className="mb-4">
        <div className="field-label">Structure Instructions</div>
        <textarea className="textarea" rows={3} defaultValue={heading.structureInstructions} />
      </div>

      <div className="grid mb-4" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="field-label">Intent</div>
          <input className="input" defaultValue={heading.intent} />
        </div>
        <div>
          <div className="field-label">Word Count Target</div>
          <input className="input mono" defaultValue={heading.wordCountTarget} />
        </div>
      </div>

      {heading.targetQueries.length > 0 && (
        <div className="mb-4">
          <div className="field-label flex items-center justify-between">
            <span>Target Queries · {heading.targetQueries.length}</span>
            <span className="mono">{heading.targetQueries.reduce((s,q)=>s+q.volume,0).toLocaleString()}/mo</span>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {heading.targetQueries.map((q, i) => (
              <div key={i} className="flex items-center gap-3 p-3" style={{ borderBottom: i < heading.targetQueries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 text-sm">{q.query}</div>
                <Badge tone="default" mono={false}>{q.intent}</Badge>
                <span className="mono text-xs tabular-nums" style={{ minWidth: 64, textAlign: 'right' }}>
                  {q.volume.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {heading.serpFeatures.length > 0 && (
        <div className="mb-4">
          <div className="field-label">SERP Features</div>
          <div className="flex gap-2 flex-wrap">
            {heading.serpFeatures.map(f => (
              <span key={f} className="serp-feat on"><Icon name="check" size={10} /> {f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Tabs panels =====
function AnalysisPanel({ q, s }) {
  if (!q && !s) return <Empty icon="alert" title="No analysis data" sub="This brief was generated with an older pipeline." />;
  return (
    <div className="flex flex-col gap-5">
      {q && (
        <div className="card card-pad">
          <div className="h3 mb-3">Query intent</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <KV label="Search intent" value={q.searchIntent} tone="accent" />
            <KV label="Query type" value={q.queryType} />
            <KV label="Business model" value={q.businessModel} />
            <KV label="Depth required" value={q.intentSatisfactionThreshold.depth} tone="cyan" />
            <KV label="Freshness" value={q.freshnessRequirement} tone="amber" />
            <KV label="Completeness" value={q.queryCompleteness.isComplete ? 'complete' : 'incomplete'} tone={q.queryCompleteness.isComplete ? 'mint' : 'coral'} />
          </div>
          {!q.queryCompleteness.isComplete && (
            <div className="mt-4">
              <div className="field-label">Missing qualifiers</div>
              <div className="flex gap-2 flex-wrap">
                {q.queryCompleteness.missingQualifiers.map(m => <Chip key={m} tone="coral">{m}</Chip>)}
              </div>
            </div>
          )}
          <div className="mt-4">
            <div className="field-label">Audience segments</div>
            <div className="flex gap-2 flex-wrap">
              <Chip tone="accent">primary · {q.audienceSegments.primary}</Chip>
              {q.audienceSegments.secondary && <Chip>secondary · {q.audienceSegments.secondary}</Chip>}
              {q.audienceSegments.tertiary && <Chip>tertiary · {q.audienceSegments.tertiary}</Chip>}
            </div>
          </div>
        </div>
      )}
      {s && (
        <>
          <div className="card card-pad">
            <div className="flex items-center justify-between mb-3">
              <div className="h3">SERP signals</div>
              {s.aiOverviewPresence && <Badge tone="violet"><Icon name="sparkles" size={11} /> AI overview live</Badge>}
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {Object.entries(s.serpFeaturePresence).map(([k, v]) => (
                <span key={k} className={`serp-feat ${v ? 'on' : ''}`}>
                  {v && <Icon name="check" size={10} />}
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div className="field-label" style={{ color: 'var(--mint)' }}>Gaps · opportunities ({s.serpGaps.length})</div>
                <div className="flex gap-2 flex-wrap">
                  {s.serpGaps.map(g => <Chip key={g} tone="mint">{g}</Chip>)}
                </div>
              </div>
              <div>
                <div className="field-label" style={{ color: 'var(--coral)' }}>Compression — avoid ({s.compressionPatterns.length})</div>
                <div className="flex gap-2 flex-wrap">
                  {s.compressionPatterns.map(p => <Chip key={p} tone="coral">{p}</Chip>)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="field-label">Consensus coverage — required ({s.consensusCoverage.length})</div>
              <div className="flex gap-2 flex-wrap">
                {s.consensusCoverage.map(c => <Chip key={c}>{c}</Chip>)}
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="h3 mb-3">Featured snippet opportunities</div>
            <div className="flex flex-col gap-2">
              {s.featuredSnippetOpportunities.map((fs, i) => (
                <div key={i} className="p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{fs.query}</span>
                    <Badge tone="default" mono={false}>{fs.currentFormat}</Badge>
                  </div>
                  <div className="text-xs muted">{fs.strategy}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KV({ label, value, tone }) {
  return (
    <div className="p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="eyebrow mb-1" style={{ fontSize: 9 }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: tone ? `var(--${tone})` : 'var(--text-1)', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

function EntitiesPanel({ entities }) {
  const groups = entities.reduce((acc, e) => {
    (acc[e.relevance] ||= []).push(e);
    return acc;
  }, {});
  const order = ['primary', 'secondary', 'contextual'];
  const toneFor = { primary: 'accent', secondary: 'cyan', contextual: 'default' };
  return (
    <div className="flex flex-col gap-4">
      {order.map(r => {
        const items = groups[r] || [];
        if (!items.length) return null;
        return (
          <div key={r} className="card card-pad">
            <div className="flex items-center gap-2 mb-3">
              <div className="h3 capitalize">{r}</div>
              <Badge tone={toneFor[r]}>{items.length}</Badge>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
              {items.map(e => (
                <div key={e.entity} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="text-sm flex-1 truncate">{e.entity}</span>
                  <span className="mono text-xs muted">{e.type}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopicalMapPanel({ topicalMap }) {
  const order = ['root', 'supporting', 'adjacent', 'downstream'];
  const desc = {
    root: 'Pillar — anchors the topical authority',
    supporting: 'Vertical depth — deepens entity coverage',
    adjacent: 'Horizontal expansion — neighboring intents',
    downstream: 'Conversion bridges — lead-magnets & tools',
  };
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between mb-4">
        <div className="h3">Topical map</div>
        <Badge>{topicalMap.length} topics</Badge>
      </div>
      <div className="flex flex-col gap-5">
        {order.map(rel => {
          const items = topicalMap.filter(t => t.relationship === rel);
          if (!items.length) return null;
          return (
            <div key={rel}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`topic-pill ${rel}`} style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                  {rel}
                </div>
                <span className="text-xs muted">{desc[rel]}</span>
                <span className="mono text-xs muted">· {items.length}</span>
              </div>
              <div className="flex gap-2 flex-wrap" style={{ paddingLeft: 4 }}>
                {items.map(t => (
                  <div key={t.topic} className={`topic-pill ${rel}`}>
                    {t.topic}
                    {t.suggestedPageType && <span className="mono text-xs opacity-60">/{t.suggestedPageType}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinksPanel({ connections }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="h3">Internal links</div>
        <Badge>{connections.length}</Badge>
      </div>
      {connections.map((c, i) => (
        <div key={i} className="px-4 py-3" style={{ borderBottom: i < connections.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div className="flex items-center gap-3 mb-1">
            <Icon name="link" size={13} />
            <span className="text-sm font-medium">{c.anchorText}</span>
            <Icon name="arrowRight" size={11} />
            <span className="mono text-xs muted">{c.toPage}</span>
          </div>
          <div className="text-xs muted" style={{ paddingLeft: 22 }}>
            from <span className="mono">{c.fromHeading}</span> — {c.reason}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompetitorsPanel({ competitors, deep }) {
  return (
    <div className="flex flex-col gap-4">
      {deep?.gapKeywords?.length > 0 && (
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-3">
            <div className="h3">Gap keywords</div>
            <Badge tone="mint">opportunities · {deep.gapKeywords.length}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {deep.gapKeywords.map(k => <Chip key={k} tone="mint">{k}</Chip>)}
          </div>
        </div>
      )}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="h3">Top SERP competitors</div>
          <Badge>{competitors.length}</Badge>
        </div>
        {competitors.map((c, i) => {
          const d = deep?.competitors?.find(dd => dd.url === c.url);
          return (
            <div key={i} className="p-4" style={{ borderBottom: i < competitors.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-start gap-3 mb-2">
                <div className="rank-pos" style={{
                  width: 28, height: 28, borderRadius: 6, display: 'grid', placeItems: 'center',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
                  color: c.serpPosition <= 3 ? 'var(--mint)' : 'var(--text-2)',
                }}>#{c.serpPosition}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="mono text-xs muted truncate">{c.url}</div>
                </div>
                {c.wordCount && (
                  <div className="text-right" style={{ minWidth: 80 }}>
                    <div className="mono text-sm tabular-nums">{c.wordCount.toLocaleString()}</div>
                    <div className="eyebrow" style={{ fontSize: 9 }}>words</div>
                  </div>
                )}
              </div>
              {d && (
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <div className="field-label" style={{ color: 'var(--mint)' }}>Strengths</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {d.strengths.map(s => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="field-label" style={{ color: 'var(--coral)' }}>Weaknesses</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {d.weaknesses.map(s => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValidationPanel({ validation, quality }) {
  const SEV_TONE = { high: 'coral', medium: 'amber', low: 'default' };
  return (
    <div className="flex flex-col gap-4">
      {quality && (
        <div className="card card-pad">
          <div className="flex items-center gap-5 mb-4">
            <ScoreRing score={quality.overallScore} size={92} />
            <div className="flex-1">
              <div className="h3 mb-1">Overall quality</div>
              <div className="text-sm muted">5-dimension breakdown across competitor coverage, intent satisfaction, semantic coherence, entity completeness, and heading quality.</div>
            </div>
          </div>
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            {Object.entries(quality.breakdown).map(([k, v]) => (
              <div key={k} className="grid" style={{ gridTemplateColumns: '200px 1fr 40px', gap: 12, alignItems: 'center' }}>
                <span className="text-sm muted" style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                <Bar value={v} tone={v >= 80 ? 'mint' : v >= 60 ? 'amber' : 'coral'} height={6} />
                <span className="mono text-sm tabular-nums" style={{ textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {validation && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h3">Heading validation</div>
            <Badge tone={validation.score >= 8 ? 'mint' : 'amber'}>{validation.score}/10</Badge>
          </div>
          {validation.issues.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: 'var(--mint)' }}>
              <Icon name="check" size={14} /> All headings passed validation.
            </div>
          ) : validation.issues.map((it, i) => (
            <div key={i} className="p-4" style={{ borderBottom: i < validation.issues.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={SEV_TONE[it.severity]} mono={false}>{it.severity}</Badge>
                <span className="mono text-xs muted">{it.issueType}</span>
                <span className="text-sm" style={{ marginLeft: 'auto' }}>{it.headingText}</span>
              </div>
              <div className="text-sm muted mt-2">{it.description}</div>
              {it.suggestedFix && (
                <div className="mt-2 p-2 rounded text-sm" style={{ background: 'var(--accent-faint)', color: 'var(--accent-fg)' }}>
                  <Icon name="sparkles" size={11} /> {it.suggestedFix}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {quality?.recommendations?.length > 0 && (
        <div className="card card-pad">
          <div className="h3 mb-3">Recommendations</div>
          <div className="flex flex-col gap-2">
            {quality.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--accent)' }}><Icon name="sparkles" size={14} /></div>
                <div className="text-sm flex-1">{r}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Brief Detail page =====
function BriefDetail({ brief, onBack }) {
  const d = brief.data;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState('outline');
  const [showInspector, setShowInspector] = useState(true);

  const totalVol = useMemo(
    () => d.headings.reduce((s, h) => s + h.targetQueries.reduce((ss, q) => ss + q.volume, 0), 0),
    [d.headings]
  );

  const tabs = [
    { id: 'outline', label: 'Outline', count: d.headings.length },
    { id: 'analysis', label: 'Analysis' },
    { id: 'entities', label: 'Entities', count: d.entityMap.length },
    { id: 'topical', label: 'Topics', count: d.topicalMap.length },
    { id: 'links', label: 'Links', count: d.connectionMap.length },
    { id: 'competitors', label: 'Competitors', count: d.competitors.length },
    { id: 'validation', label: 'Validation' },
  ];

  const selected = d.headings[selectedIdx];

  return (
    <div data-screen-label="05 Brief Detail">
      {/* Page head */}
      <div className="flex items-start gap-4 mb-5" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          <Icon name="chevLeft" size={13} /> Briefs
        </button>
        <div className="flex-1 min-w-0" style={{ minWidth: 280 }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge mono={false}>{brief.niche}</Badge>
            <span className="muted">·</span>
            <Badge mono={false}>{brief.pageType}</Badge>
            <span className="muted">·</span>
            <StatusBadge status={brief.status} />
            <span className="mono text-xs muted">v{brief.version}</span>
            <span className="muted text-xs">· updated {brief.updatedAt}</span>
          </div>
          <h1 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>{brief.topic}</h1>
          {d.titleTag?.titleTag && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="cyan">title tag</Badge>
              <span className="text-sm" style={{ color: 'var(--cyan)' }}>{d.titleTag.titleTag}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" leading={<Icon name="trash" size={12} />}>Delete</Button>
          <Button variant="ghost" size="sm" leading={<Icon name="download" size={12} />}>Export</Button>
          <Button size="sm" leading={<Icon name="check" size={12} />}>Approve</Button>
          <Button variant="primary" size="sm" trailing={<Icon name="arrowRight" size={12} />}>Go to Writer</Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="card mb-5" style={{ display: 'flex', overflow: 'auto', flexWrap: 'nowrap' }}>
        <Stat icon="layers" label="Headings" value={d.headings.length} />
        <Stat icon="target" label="Entities" value={d.entityMap.length} />
        <Stat icon="link" label="Internal links" value={d.connectionMap.length} />
        <Stat icon="search" label="Total volume" value={`${(totalVol/1000).toFixed(1)}k`} sub="searches/mo" />
        <Stat icon="map" label="Topics" value={d.topicalMap.length} />
        <Stat icon="bolt" label="Competitors" value={d.competitors.length} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="eyebrow" style={{ marginBottom: 2 }}>Quality</div>
            <div className="text-xs muted">5-dim composite</div>
          </div>
          <ScoreRing score={brief.qualityScore} size={62} />
        </div>
      </div>

      {/* Vectors + Gaps strip */}
      <div className="grid responsive-2col mb-5" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">Contextual vectors · {d.contextualVectors.length}</div>
            <Icon name="layers" size={12} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {d.contextualVectors.map(v => <Chip key={v}>{v}</Chip>)}
          </div>
        </div>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow" style={{ color: 'var(--coral)' }}>Knowledge gaps · {d.knowledgeGaps.length}</div>
            <Icon name="alert" size={12} />
          </div>
          <div className="flex flex-col gap-1.5">
            {d.knowledgeGaps.map((g, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="dot" style={{ background: 'var(--coral)' }} />
                {g}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs row */}
      <div className="flex items-center justify-between mb-4">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        {tab === 'outline' && (
          <Button size="sm" variant="ghost" leading={<Icon name="panelRight" size={12} />} onClick={() => setShowInspector(s => !s)}>
            {showInspector ? 'Hide inspector' : 'Show inspector'}
          </Button>
        )}
      </div>

      {/* Tab content */}
      {tab === 'outline' && (
        <div className="grid responsive-2col" style={{ gridTemplateColumns: showInspector ? 'minmax(0,1fr) 380px' : '1fr', gap: 16 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="row-list">
              {d.headings.map((h, i) => (
                <HeadingRow key={i} heading={h} idx={i}
                  active={i === selectedIdx}
                  onSelect={setSelectedIdx}
                />
              ))}
            </div>
          </div>
          {showInspector && (
            <div className="card card-pad" style={{ position: 'sticky', top: 68, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 96px)', overflow: 'auto' }}>
              <HeadingInspector heading={selected} idx={selectedIdx} total={d.headings.length} onClose={() => setShowInspector(false)} />
            </div>
          )}
        </div>
      )}
      {tab === 'analysis' && <AnalysisPanel q={d.queryPreAnalysis} s={d.serpAnalysis} />}
      {tab === 'entities' && <EntitiesPanel entities={d.entityMap} />}
      {tab === 'topical' && <TopicalMapPanel topicalMap={d.topicalMap} />}
      {tab === 'links' && <LinksPanel connections={d.connectionMap} />}
      {tab === 'competitors' && <CompetitorsPanel competitors={d.competitors} deep={d.deepCompetitorAnalysis} />}
      {tab === 'validation' && <ValidationPanel validation={d.headingValidation} quality={d.qualityReport} />}
    </div>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--text-3)' }}><Icon name={icon} size={12} /></span>
        <span className="eyebrow">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="mono tabular-nums" style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
        {sub && <div className="text-xs muted">{sub}</div>}
      </div>
    </div>
  );
}

window.BriefDetail = BriefDetail;
