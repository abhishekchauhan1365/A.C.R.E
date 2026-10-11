import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Bell, CheckCircle2, Clock3, Cpu, FileCode, FileWarning, 
  FolderKanban, Gauge, LayoutDashboard, LogOut, RefreshCw, RotateCcw, 
  Server, Settings, ShieldAlert, ShieldCheck, Terminal, Wrench 
} from 'lucide-react';
import SetupWizard from '../components/SetupWizard';

const API = import.meta.env.VITE_API_URL || '';
const mb = value => `${Math.round((value || 0) / 1024 / 1024)} MB`;
const gb = value => `${((value || 0) / 1024 / 1024 / 1024).toFixed(1)} GB`;

const getName = () => {
  try {
    return JSON.parse(localStorage.getItem('acre_user'))?.name || 'Local Operator';
  } catch {
    return 'Local Operator';
  }
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('overview');
  const [activePatchModal, setActivePatchModal] = useState(null);

  const navigate = useNavigate();

  const headers = () => {
    const token = localStorage.getItem('acre_token');
    return {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    };
  };

  const refresh = useCallback(async (show) => {
    if (show) setLoading(true);
    try {
      const r = await fetch(`${API}/api/v1/overview`, { headers: headers() });
      if (r.status === 401) {
        if (window.location.port !== '4310') {
          localStorage.clear();
          navigate('/login', { replace: true });
          return;
        }
      }
      if (!r.ok) throw new Error('Failed to fetch overview data.');
      const json = await r.json();
      setData(json);
      setError('');
    } catch {
      setError('The A.C.R.E. control server is not responding. Ensure `acre-ai start` or the backend server is running.');
    } finally {
      if (show) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const initial = setTimeout(() => refresh(false), 0);
    const interval = setInterval(() => refresh(false), 5000);

    let ws;
    try {
      const host = window.location.host;
      if (host) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${host}/api/v1/stream`);
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'log') refresh(false);
          } catch {}
        };
      }
    } catch {}

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      if (ws) {
        try { ws.close(); } catch {}
      }
    };
  }, [refresh]);

  const post = async (path, body) => {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body || {})
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error || 'Request failed.');
    return json;
  };

  const resolve = async (item) => {
    setBusy(item.id);
    try {
      await post('/api/resolve', { id: item.id });
      setNotice(`Incident ${item.id} resolved and recorded in audit trail.`);
      refresh(false);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy('');
    }
  };

  const generatePatch = async (item) => {
    setBusy(`patch-${item.id}`);
    try {
      const res = await post(`/api/v1/incidents/${item.id}/patch`, {});
      setNotice(`AI patch proposal staged for ${item.project}.`);
      setActivePatchModal(item.id);
      refresh(false);
      return res;
    } catch (e) {
      setNotice(`Patch generation failed: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const applyPatch = async (item) => {
    setBusy(`apply-${item.id}`);
    try {
      const res = await post(`/api/v1/incidents/${item.id}/apply-patch`, {});
      const status = res.result?.validation?.status || 'passed';
      setNotice(`Patch applied to ${item.project}. Validation: ${status}. Backup stored in .acre-backups.`);
      refresh(false);
    } catch (e) {
      setNotice(`Failed to apply patch: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const rollbackPatch = async (item) => {
    setBusy(`rollback-${item.id}`);
    try {
      await post(`/api/v1/incidents/${item.id}/rollback-patch`, {});
      setNotice(`Patch successfully rolled back from backup.`);
      refresh(false);
    } catch (e) {
      setNotice(`Rollback failed: ${e.message}`);
    } finally {
      setBusy('');
    }
  };

  const configure = async (values) => {
    setBusy('config');
    try {
      const res = await post('/api/config', values);
      setNotice(res.message || 'Configuration saved and monitoring started.');
      refresh(false);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy('');
    }
  };

  const signOut = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const projects = data?.projects || [];
  const incidents = data?.incidents || [];
  const events = data?.events || [];
  const name = getName();

  return (
    <div className="min-h-screen bg-[#f6f6f3] text-[#15171b] md:flex font-sans">
      <aside className="hidden w-[248px] shrink-0 flex-col bg-[#101216] p-4 text-white md:flex">
        <div className="mb-10 flex items-center gap-3 px-3 pt-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d5ff4f] text-black">
            <Activity size={19} />
          </div>
          <div>
            <b className="font-pixel text-xs tracking-[.2em]">A.C.R.E.</b>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">Control Plane</p>
          </div>
        </div>

        <nav className="space-y-1">
          <Nav icon={<LayoutDashboard size={16} />} text="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <Nav icon={<ShieldAlert size={16} />} text="Incidents" count={incidents.length} active={tab === 'incidents'} onClick={() => setTab('incidents')} />
          <Nav icon={<FolderKanban size={16} />} text="Projects" count={projects.length} active={tab === 'projects'} onClick={() => setTab('projects')} />
          <Nav icon={<Gauge size={16} />} text="System health" active={tab === 'health'} onClick={() => setTab('health')} />
          <div className="my-6 border-t border-white/10" />
          <Nav icon={<Settings size={16} />} text="Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
          <Nav icon={<Bell size={16} />} text="Audit Log" active={tab === 'notifications'} onClick={() => setTab('notifications')} />
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.045] p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold">
              {name[0]?.toUpperCase() || 'O'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{name}</p>
              <p className="text-[10px] text-white/40">
                {typeof window !== 'undefined' && window.location.port === '4310' ? 'CLI Daemon Operator' : 'Authenticated User'}
              </p>
            </div>
          </div>
          {typeof window !== 'undefined' && window.location.port !== '4310' && (
            <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/55 hover:bg-white/10 transition-colors">
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-9">
        <header className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[.16em] text-[#6e716f]">Operations / {tab}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] md:text-4xl text-[#111]">
              {tab === 'overview' ? `Welcome, ${name.split(' ')[0]}.` : tab[0].toUpperCase() + tab.slice(1)}
            </h1>
            <p className="mt-2 text-sm text-[#737674]">
              {tab === 'overview' ? 'Live status of monitored application streams and remediation tasks.' : 'Manage services and inspect real incident forensics.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white hover:bg-black/5 transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <span className="hidden rounded-xl bg-[#101216] px-4 py-2.5 text-xs text-white sm:block">
              <i className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#d5ff4f]" />
              {data?.daemon?.pid ? `Daemon Active (PID ${data.daemon.pid})` : 'Live Daemon'}
            </span>
          </div>
        </header>

        {notice && (
          <div className="mx-auto mt-6 max-w-7xl rounded-xl bg-[#effacb] border border-[#d5ff4f]/60 px-4 py-3 text-sm text-[#384610] flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-xs font-semibold hover:underline">Dismiss</button>
          </div>
        )}

        {error ? (
          <div className="mx-auto mt-8 max-w-7xl rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <Terminal size={18} />
              <h2>Control server connection error</h2>
            </div>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : !loading && !projects.length ? (
          <div className="mx-auto mt-8 max-w-2xl">
            <SetupWizard config={data || {}} saveConfig={configure} saving={busy === 'config'} error={notice} />
          </div>
        ) : (
          <Workspace
            tab={tab}
            projects={projects}
            incidents={incidents}
            events={events}
            data={data}
            busy={busy}
            resolve={resolve}
            generatePatch={generatePatch}
            applyPatch={applyPatch}
            rollbackPatch={rollbackPatch}
            activePatchModal={activePatchModal}
            setActivePatchModal={setActivePatchModal}
          />
        )}
      </main>
    </div>
  );
}

function Nav({ icon, text, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? 'bg-white text-black font-medium' : 'text-white/55 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span>{text}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold">{count}</span>
      )}
    </button>
  );
}

function Workspace({
  tab, projects, incidents, events, data, busy, resolve,
  generatePatch, applyPatch, rollbackPatch, activePatchModal, setActivePatchModal
}) {
  if (tab === 'incidents') {
    return (
      <Panel title="Active Incident Monitor" subtitle="Real detected errors with surrounding log context and AI patch generation">
        {incidents.length ? (
          incidents.map(item => (
            <IncidentCard
              key={item.id}
              item={item}
              busy={busy}
              resolve={resolve}
              generatePatch={generatePatch}
              applyPatch={applyPatch}
              rollbackPatch={rollbackPatch}
              showPatchModal={activePatchModal === item.id}
              togglePatchModal={() => setActivePatchModal(activePatchModal === item.id ? null : item.id)}
            />
          ))
        ) : (
          <Empty />
        )}
      </Panel>
    );
  }

  if (tab === 'projects') {
    return (
      <Panel title="Monitored Services" subtitle="Active file watchers and process boundaries">
        {projects.length ? (
          <div className="divide-y divide-black/5">
            {projects.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf2e4] text-[#6f861e]">
                    <Server size={18} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="text-sm text-[#111]">{p.name}</b>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-mono uppercase text-[#555]">
                        {p.framework || 'generic'}
                      </span>
                      {p.autoFix && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                          Auto-Fix Enabled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[#737674]">
                      <span className="text-[#9a9d9a]">Log: </span>{p.logPath}
                    </p>
                    {p.projectRoot && (
                      <p className="font-mono text-[11px] text-[#737674]">
                        <span className="text-[#9a9d9a]">Root: </span>{p.projectRoot}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right sm:self-center">
                  <span className="text-[11px] text-[#858886]">OS: {p.platform || process.platform}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    );
  }

  if (tab === 'health') {
    const sys = data?.system || {};
    const mem = sys.memory || {};
    return (
      <Panel title="Real-Time System Telemetry" subtitle="Host hardware, process metrics, and daemon status">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat icon={<Activity size={18} />} value={data?.daemon?.pid ? `PID ${data.daemon.pid}` : 'Offline'} label="Daemon Process" />
          <Stat icon={<Cpu size={18} />} value={sys.cpuCount ? `${sys.cpuCount} Cores` : 'Unknown'} label="Host CPU Cores" />
          <Stat icon={<Server size={18} />} value={projects.length} label="Active Watchers" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Stat icon={<Clock3 size={18} />} value={sys.platform || 'Unknown'} label="Operating System" />
          <Stat icon={<Cpu size={18} />} value={mb(sys.process?.rss)} label="Daemon RAM Usage" />
          <Stat icon={<Gauge size={18} />} value={mem.free ? `${gb(mem.free)} free / ${gb(mem.total)}` : 'N/A'} label="Host Memory" />
        </div>
      </Panel>
    );
  }

  if (tab === 'settings') {
    return (
      <Panel title="Engine Configuration" subtitle="Runtime safety policy and Groq LLM inference configuration">
        <div className="rounded-2xl bg-[#f7f7f4] border border-black/5 p-6 text-sm text-[#444] space-y-3">
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="font-medium text-[#111]">Groq Inference Model</span>
            <span className="font-mono text-xs">{data?.settings?.aiModel || 'llama-3.3-70b-versatile'}</span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="font-medium text-[#111]">Auto-Fix Restart Policy</span>
            <span>{data?.settings?.autoFix ? 'Low-risk automated restarts enabled' : 'Manual operator approval required'}</span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="font-medium text-[#111]">Notifications Webhook</span>
            <span>{data?.settings?.notifications?.slack ? 'Configured' : 'None'}</span>
          </div>
          <p className="mt-4 text-xs text-[#858886]">
            Configure additional projects and secrets anytime using the CLI: <code className="bg-black/5 px-1.5 py-0.5 rounded text-black font-mono">acre-ai init</code> or <code className="bg-black/5 px-1.5 py-0.5 rounded text-black font-mono">acre-ai login</code>.
          </p>
        </div>
      </Panel>
    );
  }

  if (tab === 'notifications') {
    return (
      <Panel title="Real Audit Trail" subtitle="Chronological history of watcher events and remediation decisions">
        {events.length ? (
          <div className="divide-y divide-black/5">
            {events.map((e, i) => (
              <div key={`${e.at}-${i}`} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#111]">{e.project || 'System'}</span>
                    <span className="rounded bg-black/5 px-1.5 py-0.2 text-[10px] font-mono text-[#666]">{e.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#555]">{e.message}</p>
                </div>
                <time className="text-[10px] text-[#9a9d9a] shrink-0">{new Date(e.at).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#858886]">No events recorded yet.</p>
        )}
      </Panel>
    );
  }

  return (
    <>
      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Server size={18} />} value={projects.length} label="Monitored projects" />
        <Stat icon={<FileWarning size={18} />} value={incidents.length} label="Open incidents" warm={incidents.length > 0} />
        <Stat icon={<Cpu size={18} />} value={mb(data?.system?.process?.rss)} label="Daemon memory" />
        <Stat icon={<Clock3 size={18} />} value={data?.settings?.autoFix ? 'Auto-Fix Active' : 'Manual Review'} label="Remediation mode" />
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[1.6fr_.9fr]">
        <Panel title="Incident Activity" subtitle="Real exceptions detected from your watched log files">
          {incidents.length ? (
            incidents.map(item => (
              <IncidentCard
                key={item.id}
                item={item}
                busy={busy}
                resolve={resolve}
                generatePatch={generatePatch}
                applyPatch={applyPatch}
                rollbackPatch={rollbackPatch}
                showPatchModal={activePatchModal === item.id}
                togglePatchModal={() => setActivePatchModal(activePatchModal === item.id ? null : item.id)}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Recent Audit Trail" subtitle="Immutable event logging">
          {events.length ? (
            <div className="divide-y divide-black/5">
              {events.slice(0, 8).map((e, i) => (
                <div key={`${e.at}-${i}`} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-[11px] text-[#888]">
                    <b>{e.project || 'Engine'}</b>
                    <time>{new Date(e.at).toLocaleTimeString()}</time>
                  </div>
                  <p className="mt-0.5 text-xs text-[#444]">{e.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#858886]">Activity will appear as logs are monitored.</p>
          )}
        </Panel>
      </section>
    </>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="mx-auto mt-6 max-w-7xl rounded-3xl border border-black/[.08] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-semibold tracking-tight text-[#111]">{title}</h2>
        <p className="mt-1 text-xs text-[#858886]">{subtitle}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Stat({ icon, value, label, warm }) {
  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${warm ? 'bg-amber-100 text-amber-700' : 'bg-[#f1f2ef] text-[#686c69]'}`}>
        {icon}
      </span>
      <p className="mt-4 text-2xl font-semibold text-[#111]">{value}</p>
      <p className="mt-1 text-xs font-medium text-[#555956]">{label}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-[#fafaf8] px-6 py-12 text-center">
      <ShieldCheck className="mx-auto text-[#8caa22]" size={32} />
      <h3 className="mt-3 font-semibold text-[#111]">Everything is healthy</h3>
      <p className="mt-1 text-xs text-[#777a78]">A.C.R.E. is tailing your active log streams with zero open crashes.</p>
    </div>
  );
}

function IncidentCard({
  item, busy, resolve, generatePatch, applyPatch, rollbackPatch,
  showPatchModal, togglePatchModal
}) {
  const high = item.risk === 'high';
  const hasPatch = Boolean(item.patch);
  const patchApplied = item.patch?.status === 'applied' || item.patch?.status === 'applied-validation-failed';

  return (
    <article className="rounded-2xl border border-black/[.08] p-4.5 bg-white shadow-sm mb-4 last:mb-0">
      <div className="flex gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${high ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          <ShieldAlert size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm text-[#111]">{item.project}</b>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              high ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {item.risk} risk
            </span>
            {item.status && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-mono text-[#666]">
                {item.status}
              </span>
            )}
            <time className="ml-auto text-[10px] text-[#929592]">
              {new Date(item.timestamp).toLocaleString()}
            </time>
          </div>

          <p className="mt-2 text-sm text-[#444] font-medium">{item.summary}</p>

          <div className="mt-3 rounded-xl bg-[#f7f7f4] border border-black/5 p-3 text-xs text-[#4b4f4c]">
            <b className="block text-[10px] uppercase tracking-widest text-[#9a9d9a] mb-1">Diagnosed Cause & Suggested Action</b>
            <span>{item.action}</span>
          </div>

          <div className="mt-3">
            <details>
              <summary className="cursor-pointer text-xs text-[#767a77] hover:text-black">
                View captured log context ({item.context?.length || 0} lines)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#121417] p-3 font-mono text-[11px] text-red-300">
                {(item.context || [item.log]).join('\n')}
              </pre>
            </details>
          </div>

          {/* Patch Review Section */}
          {hasPatch && (
            <div className="mt-4 rounded-xl border border-black/10 bg-[#fafaf8] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-[#111]">
                  <FileCode size={14} className="text-blue-600" />
                  Code Patch: {item.patch.summary}
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                  patchApplied ? 'bg-green-100 text-green-800 font-semibold' : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.patch.status}
                </span>
              </div>

              {item.patch.changes?.map((ch, idx) => (
                <div key={idx} className="mt-3 rounded-lg border border-black/5 bg-white p-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#666] font-mono mb-1.5">
                    <b>Target: {ch.path}</b>
                    <span>{ch.reason}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 font-mono text-[10px]">
                    <div className="rounded bg-red-50 p-2 text-red-900 border border-red-100 overflow-x-auto">
                      <span className="block text-[9px] uppercase tracking-wider text-red-500 font-sans mb-1">Remove:</span>
                      <pre>{ch.search}</pre>
                    </div>
                    <div className="rounded bg-emerald-50 p-2 text-emerald-900 border border-emerald-100 overflow-x-auto">
                      <span className="block text-[9px] uppercase tracking-wider text-emerald-500 font-sans mb-1">Replace With:</span>
                      <pre>{ch.replace}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3">
            <div className="flex items-center gap-2">
              {!hasPatch && (
                <button
                  disabled={busy === `patch-${item.id}`}
                  onClick={() => generatePatch(item)}
                  className="flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#111] hover:bg-black/5 disabled:opacity-50 transition-colors"
                >
                  <Wrench size={13} />
                  {busy === `patch-${item.id}` ? 'Generating AI patch…' : 'Generate Source Patch'}
                </button>
              )}

              {hasPatch && !patchApplied && (
                <button
                  disabled={busy === `apply-${item.id}`}
                  onClick={() => applyPatch(item)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 size={13} />
                  {busy === `apply-${item.id}` ? 'Applying patch…' : 'Apply Patch to Disk'}
                </button>
              )}

              {patchApplied && (
                <button
                  disabled={busy === `rollback-${item.id}`}
                  onClick={() => rollbackPatch(item)}
                  className="flex items-center gap-1.5 rounded-xl border border-black/20 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw size={13} />
                  {busy === `rollback-${item.id}` ? 'Rolling back…' : 'Rollback from Backup'}
                </button>
              )}
            </div>

            <button
              disabled={busy === item.id}
              onClick={() => resolve(item)}
              className="rounded-xl bg-[#151719] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-black/85 disabled:opacity-50 transition-colors"
            >
              {busy === item.id ? 'Resolving…' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

