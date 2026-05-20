/* LNM Redesign — App shell, router, Tweaks, Command palette */

const { useState: useS, useEffect: useE, useRef: useR } = React;

const ACCENTS = {
  violet:  { name: 'Violet',  base: 'oklch(0.68 0.17 290)' },
  mint:    { name: 'Mint',    base: 'oklch(0.78 0.13 165)' },
  amber:   { name: 'Amber',   base: 'oklch(0.80 0.14 75)'  },
  cyan:    { name: 'Cyan',    base: 'oklch(0.78 0.12 220)' },
  graphite: { name: 'Graphite', base: 'oklch(0.85 0.005 270)' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "violet",
  "density": "default",
  "sidebarWidth": 240,
  "writerState": "streaming"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  root.dataset.theme = t.theme;
  root.dataset.density = t.density;
  root.style.setProperty('--sidebar-w', t.sidebarWidth + 'px');
  const a = ACCENTS[t.accent] || ACCENTS.violet;
  root.style.setProperty('--accent', a.base);
  root.style.setProperty('--accent-soft', `color-mix(in oklab, ${a.base} 18%, transparent)`);
  root.style.setProperty('--accent-faint', `color-mix(in oklab, ${a.base} 10%, transparent)`);
  root.style.setProperty('--accent-fg', t.theme === 'light' ? a.base : `color-mix(in oklab, ${a.base} 75%, white 25%)`);
}

function LnmApp() {
  const [active, setActive] = useS('briefs');
  const [openBrief, setOpenBrief] = useS(null);
  const [showNewBrief, setShowNewBrief] = useS(false);
  const [loggedIn, setLoggedIn] = useS(true);
  const [cmdOpen, setCmdOpen] = useS(false);
  const [mobileNavOpen, setMobileNavOpen] = useS(false);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useE(() => { applyTweaks(tweaks); }, [tweaks]);

  // ⌘K / Ctrl+K global shortcut
  useE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen(c => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goTo = (id) => {
    setOpenBrief(null);
    setShowNewBrief(false);
    setActive(id);
    setMobileNavOpen(false);
  };

  const onCmdAction = (a) => {
    if (a.type === 'nav') goTo(a.target);
    else if (a.type === 'open-brief') {
      setShowNewBrief(false);
      setOpenBrief({ ...window.SAMPLE_BRIEF, ...a.brief, data: window.SAMPLE_BRIEF.data });
      setActive('briefs');
    }
    else if (a.type === 'new-brief') { setShowNewBrief(true); setOpenBrief(null); setActive('briefs'); }
    else if (a.type === 'toggle-theme') setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');
    else if (a.type === 'tweaks') window.parent?.postMessage({ type: '__activate_edit_mode' }, '*');
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  const user = { name: 'Michael', email: 'michael@lnm.so' };

  let crumbs = ['LNM'];
  if (openBrief) crumbs = ['LNM', 'Briefs', openBrief.id];
  else if (showNewBrief) crumbs = ['LNM', 'Briefs', 'New'];
  else crumbs = ['LNM', { dashboard: 'Dashboard', briefs: 'Briefs', write: 'Writer', chat: 'Chat', knowledge: 'Knowledge', history: 'History' }[active] || 'Dashboard'];

  const renderContent = () => {
    if (openBrief) return <BriefDetail brief={openBrief} onBack={() => setOpenBrief(null)} />;
    if (showNewBrief) return <NewBriefFlow onCancel={() => setShowNewBrief(false)} onDone={() => { setShowNewBrief(false); setOpenBrief(window.SAMPLE_BRIEF); }} />;
    if (active === 'dashboard') return <Dashboard onNav={goTo} />;
    if (active === 'briefs') return <BriefsList
      onOpen={(b) => setOpenBrief(b.id === window.SAMPLE_BRIEF.id ? window.SAMPLE_BRIEF : { ...window.SAMPLE_BRIEF, ...b, data: window.SAMPLE_BRIEF.data })}
      onNew={() => setShowNewBrief(true)}
    />;
    if (active === 'knowledge') return <Knowledge />;
    if (active === 'write') return <Write writerState={tweaks.writerState} />;
    if (active === 'chat') return <Chat />;
    if (active === 'history') return <History />;
    return null;
  };

  const sidebarEl = (
    <Sidebar
      active={openBrief || showNewBrief ? 'briefs' : active}
      user={user}
      onLogout={() => setLoggedIn(false)}
      onNav={goTo}
    />
  );

  return (
    <div className="app-shell">
      {sidebarEl}
      <div className="main">
        <Topbar
          crumbs={crumbs}
          onCmdK={() => setCmdOpen(true)}
          mobileNav={() => setMobileNavOpen(true)}
          right={
            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-ghost" onClick={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
                <Icon name={tweaks.theme === 'dark' ? 'sun' : 'moon'} size={13} />
              </button>
              <Button size="sm" variant="ghost" leading={<Icon name="sparkles" size={12} />} onClick={() => setShowNewBrief(true)}>New brief</Button>
            </div>
          }
        />
        <div className="content">
          {renderContent()}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <MobileSidebarSheet open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        {sidebarEl}
      </MobileSidebarSheet>

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onAction={onCmdAction} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio label="Mode" value={tweaks.theme} options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]} onChange={v => setTweak('theme', v)} />
        </TweakSection>

        <TweakSection label="Accent">
          <TweakColor label="Color"
            value={tweaks.accent}
            options={Object.entries(ACCENTS).map(([k, v]) => ({ value: k, label: v.name, color: v.base }))}
            onChange={v => setTweak('accent', v)}
          />
        </TweakSection>

        <TweakSection label="Density">
          <TweakRadio label="Spacing" value={tweaks.density} options={[
            { value: 'compact', label: 'Compact' },
            { value: 'default', label: 'Default' },
            { value: 'spacious', label: 'Roomy' },
          ]} onChange={v => setTweak('density', v)} />
        </TweakSection>

        <TweakSection label="Sidebar">
          <TweakSlider label="Width" value={tweaks.sidebarWidth} min={180} max={300} step={10} unit="px"
            onChange={v => setTweak('sidebarWidth', v)} />
        </TweakSection>

        <TweakSection label="Writer state">
          <TweakSelect label="Section state" value={tweaks.writerState}
            options={[
              { value: 'streaming', label: 'Streaming' },
              { value: 'paused', label: 'Paused' },
              { value: 'error', label: 'Error' },
              { value: 'refining', label: 'Refining' },
              { value: 'done', label: 'Accepted' },
            ]}
            onChange={v => { setTweak('writerState', v); goTo('write'); }}
          />
        </TweakSection>

        <TweakSection label="Navigation">
          <TweakSelect label="Jump to page" value={openBrief ? 'brief-detail' : showNewBrief ? 'new-brief' : active}
            options={[
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'briefs', label: 'Briefs list' },
              { value: 'brief-detail', label: 'Brief detail ★' },
              { value: 'new-brief', label: 'New brief flow' },
              { value: 'write', label: 'Writer' },
              { value: 'chat', label: 'Chat' },
              { value: 'knowledge', label: 'Knowledge' },
              { value: 'history', label: 'History' },
              { value: 'login', label: 'Login' },
            ]}
            onChange={v => {
              if (v === 'brief-detail') { setOpenBrief(window.SAMPLE_BRIEF); setShowNewBrief(false); setActive('briefs'); }
              else if (v === 'new-brief') { setShowNewBrief(true); setOpenBrief(null); setActive('briefs'); }
              else if (v === 'login') { setLoggedIn(false); }
              else { setOpenBrief(null); setShowNewBrief(false); setActive(v); }
            }}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<LnmApp />);
