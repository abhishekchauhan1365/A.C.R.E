import { useCallback, useEffect, useState } from 'react';
import { Activity, Check, Clock3, Cpu, FileWarning, RefreshCw, Server, ShieldAlert, ShieldCheck, Terminal } from 'lucide-react';

const CONTROL_API = import.meta.env.VITE_ACRE_CONTROL_URL || 'http://127.0.0.1:4310';
const bytes = value => `${Math.round((value || 0) / 1024 / 1024)} MB`;

export default function DashboardPage() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); try { const response = await fetch(`${CONTROL_API}/api/v1/overview`); if (!response.ok) throw new Error('Daemon API is unavailable'); setData(await response.json()); setError(''); } catch { setError('A.C.R.E. daemon is not reachable. Run `acre-ai start`, then refresh this page.'); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);
  const approve = async incident => { await fetch(`${CONTROL_API}/api/v1/incidents/${incident.id}/approve`, { method: 'POST' }); refresh(); };
  const incidents = data?.incidents || []; const projects = data?.projects || [];
  return <main className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10 font-sans">
    <header className="max-w-6xl mx-auto flex flex-col gap-5 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6">
      <div><div className="flex items-center gap-3"><Activity className="text-emerald-400"/><h1 className="text-2xl font-semibold tracking-tight">A.C.R.E. Control Plane</h1></div><p className="mt-2 text-sm text-white/50">Local daemon monitoring, incident review, and remediation approvals.</p></div>
      <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button>
    </header>
    {error ? <section className="max-w-6xl mx-auto mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><div className="flex gap-3"><Terminal className="text-amber-400"/><div><h2 className="font-medium">Start the local control plane</h2><p className="mt-1 text-sm text-amber-100/70">{error}</p><code className="block mt-3 text-sm bg-black/30 rounded p-3">acre-ai start</code></div></div></section> : <>
      <section className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric icon={<Server/>} label="Monitored projects" value={projects.length}/><Metric icon={<FileWarning/>} label="Open incidents" value={incidents.filter(item => item.status === 'open').length}/><Metric icon={<Cpu/>} label="Daemon memory" value={bytes(data?.system?.process?.rss)}/><Metric icon={<Clock3/>} label="Auto-fix" value={data?.settings?.autoFix ? 'Enabled' : 'Approval only'}/>
      </section>
      <section className="max-w-6xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><h2 className="mb-3 text-lg font-medium">Incident timeline</h2><div className="space-y-4">{incidents.length ? incidents.map(incident => <Incident key={incident.id} incident={incident} approve={approve}/>) : <Empty message="No incidents recorded yet. A.C.R.E. is watching your configured logs."/>}</div></div><aside><h2 className="mb-3 text-lg font-medium">Projects</h2><div className="space-y-3">{projects.map(project => <div key={project.id} className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400"/><strong>{project.name}</strong></div><p className="mt-2 text-xs uppercase tracking-wider text-white/40">{project.framework} · {project.platform}</p><p className="mt-2 break-all font-mono text-xs text-white/50">{project.logPath}</p><div className="mt-3 rounded bg-white/5 p-2 text-xs text-white/60"><span className="block font-medium text-white/80">Local Policy</span>Auto-fix: Low-risk only</div></div>)}</div></aside></section>
      <section className="max-w-6xl mx-auto mt-8"><h2 className="mb-3 text-lg font-medium">Audit events</h2><div className="rounded-xl border border-white/10 bg-white/[.03] divide-y divide-white/5">{(data?.events || []).slice(0, 12).map((event, index) => <div key={`${event.at}-${index}`} className="flex gap-4 p-4 text-sm"><time className="shrink-0 font-mono text-xs text-white/40">{new Date(event.at).toLocaleTimeString()}</time><span className="text-white/60">{event.project}</span><span>{event.message}</span></div>)}</div></section>
    </>}</main>;
}
function Metric({ icon, label, value }) { return <div className="rounded-xl border border-white/10 bg-white/[.03] p-5"><div className="text-white/40">{icon}</div><div className="mt-5 text-2xl font-semibold">{value}</div><div className="mt-1 text-sm text-white/50">{label}</div></div>; }
function Empty({ message }) { return <div className="rounded-xl border border-dashed border-white/15 p-8 text-sm text-white/50">{message}</div>; }
function Incident({ incident, approve }) { 
  const isApproved = incident.status === 'approved'; 
  return (
    <article className="rounded-xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={17} className={incident.risk === 'high' ? 'text-red-400' : incident.risk === 'medium' ? 'text-amber-400' : 'text-blue-400'}/>
            <h3 className="font-medium">{incident.project} <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs uppercase text-white/60">{incident.risk} risk</span></h3>
          </div>
          <p className="mt-2 text-sm text-white/70">{incident.summary}</p>
        </div>
        <time className="font-mono text-xs text-white/40">{new Date(incident.timestamp).toLocaleString()}</time>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-xs uppercase tracking-wider text-white/40">Suggested remediation</p>
          <p className="mt-1 text-sm">{incident.action}</p>
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-white/60">View log context</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-red-200">{(incident.context || []).join('\n')}</pre>
        </details>
      </div>
      {!isApproved ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10">View patch</button>
          <button onClick={() => approve(incident)} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"><Check size={15}/> Apply manually</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20">Enable safe auto-fix</button>
        </div>
      ) : (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300"><Check size={15}/> Patch applied manually.</p>
      )}
    </article>
  ); 
}
