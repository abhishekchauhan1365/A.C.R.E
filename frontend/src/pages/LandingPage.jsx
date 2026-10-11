import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

// --- Reusable Elite Components ---

function MagneticButton({ children, className = "", onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    // Get bounding box of the stationary wrapper, NOT the moving button
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    
    // Move the button based on mouse position relative to the center of the wrapper
    x.set(middleX * 0.4); 
    y.set(middleY * 0.4);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative flex items-center justify-center p-2 -m-2 cursor-pointer" // Larger stationary hit area
    >
      <motion.button
        style={{ x: springX, y: springY }}
        className={className}
        whileTap={{ scale: 0.95 }}
      >
        {children}
      </motion.button>
    </div>
  );
}

function GlowCard({ children, className = "" }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 3D Tilt Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), springConfig);

  function handleMouseMove(e) {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);

    const xPct = (clientX - left) / width - 0.5;
    const yPct = (clientY - top) / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      className={`group relative rounded-[2rem] border border-black/[0.07] bg-white overflow-hidden transition-colors duration-500 hover:border-black/[0.12] hover:bg-[#fafaf8] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              rgba(0,0,0,0.035),
              transparent 80%
            )
          `,
          transform: "translateZ(0px)" 
        }}
      />
      <div className="relative z-10 flex flex-col h-full" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <motion.div 
      className="mb-20"
      initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-10 h-10 border border-black/[0.08] bg-white/50 rounded-xl flex items-center justify-center mb-6 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-black/80" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] tracking-widest font-sans text-black/40 bg-black/[0.04] mb-5">
        {subtitle}
      </div>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter leading-[1.05] text-[#111]">
        {title.map((line, i) => (
          <span key={i} className="block">{line}</span>
        ))}
      </h2>
    </motion.div>
  );
}

// --- Main Page Component ---

export default function LandingPage() {
  const navigate = useNavigate();
  const titleWords = ["Self-Healing", "Infrastructure.", "Powered", "by", "Deterministic", "AI."];

  return (
    <div className="bg-[#F5F4F0] text-[#111] min-h-screen font-sans antialiased selection:bg-black/10 relative">
      
      {/* Global Animated Noise Texture Overlay for Premium Vibe */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] opacity-[0.02] mix-blend-overlay" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* 1. Navbar */}
      <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl">
          <nav className="flex items-center justify-between px-6 py-4 rounded-2xl border border-black/[0.06] bg-[#f5f4f0]/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] transition-all">
            <span className="font-pixel text-xs tracking-[0.25em] text-black/80">A.C.R.E.</span>
            <div className="hidden md:flex items-center gap-8">
              {['Platform', 'Agents', 'Workflow', 'Security'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-medium text-black/50 hover:text-black transition-colors duration-200 tracking-widest uppercase">
                  {item}
                </a>
              ))}
            </div>
            <MagneticButton 
              onClick={() => navigate('/signup')}
              className="text-[11px] font-medium px-5 py-2.5 rounded-xl border border-black/10 text-black/80 hover:text-black hover:border-black/20 hover:bg-black/[0.03] transition-colors duration-200 tracking-widest"
            >
              START SRE LOOP
            </MagneticButton>
          </nav>
        </div>
      </div>

      {/* 2. Cinematic Hero */}
      <section className="relative min-h-screen overflow-hidden flex items-center pt-32 pb-12 perspective-1000">
        <div className="absolute inset-0 z-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="absolute inset-0 z-0 opacity-90">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover scale-105"
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/agentic-hero-9yW3wnTNMfn2U6lsVhTTZSJFEvAoSj.mp4"
          />
        </div>
        
        <div className="absolute inset-x-0 bottom-0 z-10 h-[70%] bg-gradient-to-t from-[#F5F4F0] via-[#f5f4f0]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[50%] backdrop-blur-sm [mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-[25%] backdrop-blur-xl [mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none" />

        <div className="relative z-20 w-full px-6 md:px-12 lg:px-20 max-w-7xl mx-auto flex flex-col justify-center">
          <div className="max-w-4xl mt-12 md:mt-24">
            
            <h1 className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[6.5rem] font-light text-[#111] leading-[0.92] tracking-tighter mb-16 flex flex-wrap gap-x-3 sm:gap-x-4">
              {titleWords.map((word, i) => {
                const isBreak = i === 1 || i === 4;
                return (
                  <React.Fragment key={i}>
                    <motion.span
                      initial={{ opacity: 0, filter: 'blur(20px)', y: 40, rotateX: -40 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0, rotateX: 0 }}
                      transition={{ duration: 1.2, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {word}
                    </motion.span>
                    {isBreak && <div className="w-full h-0" />}
                  </React.Fragment>
                );
              })}
            </h1>

            <div className="flex gap-12 sm:gap-20 border-t border-black/[0.06] pt-12">
              {[
                { stat: '<5s', label: 'SLA' },
                { stat: '100%', label: 'Automated' },
                { stat: 'Zero', label: 'Downtime' }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ duration: 1, delay: 0.8 + (index * 0.15), ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="text-4xl sm:text-5xl text-[#111] font-light tracking-tighter">{item.stat}</div>
                  <div className="text-[11px] text-black/40 tracking-[0.25em] uppercase mt-3 font-medium">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Features Grid (Bento Box Layout) */}
      <section id="platform" className="py-32 px-6 md:px-12 lg:px-20 perspective-1000">
        <div className="max-w-7xl mx-auto">
          <SectionHeading 
            subtitle="PLATFORM" 
            title={["Everything you need", "to automate SRE."]} 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Feature 1 - Large spanning card */}
            <GlowCard className="md:col-span-2 md:row-span-2 p-10 md:p-14 flex flex-col justify-between min-h-[400px]">
              <div className="w-12 h-12 rounded-2xl border border-black/10 bg-white shadow-sm flex items-center justify-center mb-12">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-3xl font-light tracking-tight mb-4">Deterministic Root Cause Analysis</h3>
                <p className="text-[13px] text-black/45 leading-[1.8] max-w-[40ch]">
                  Powered by Groq LLMs. Instantly parses logs, metrics, and traces to identify the exact point of failure. No hallucinations, just absolute deterministic answers.
                </p>
              </div>
            </GlowCard>

            {/* Feature 2 - Wide top card */}
            <GlowCard className="md:col-span-2 md:row-span-1 p-8 md:p-10 min-h-[260px] flex flex-col justify-end">
              <div className="w-10 h-10 rounded-xl border border-black/10 bg-black/[0.02] flex items-center justify-center mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3 className="text-2xl font-light tracking-tight mb-3">Real-time Telemetry</h3>
              <p className="text-[13px] text-black/45 leading-[1.8] max-w-[45ch]">
                Sub-second latency monitoring. Trace every packet and request through your entire stack, visualized in real-time.
              </p>
            </GlowCard>

            {/* Feature 3 - Standard square */}
            <GlowCard className="md:col-span-1 md:row-span-1 p-8 md:p-10 min-h-[260px] flex flex-col justify-end">
              <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-light tracking-tight mb-2">Automated Patching</h3>
              <p className="text-[13px] text-black/45 leading-[1.7] max-w-[28ch]">
                Safely apply config patches or restart pods without human intervention.
              </p>
            </GlowCard>

            {/* Feature 4 - Standard square */}
            <GlowCard className="md:col-span-1 md:row-span-1 p-8 md:p-10 min-h-[260px] flex flex-col justify-end">
              <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <path d="M8 10h8M8 14h5"></path>
                </svg>
              </div>
              <h3 className="text-xl font-light tracking-tight mb-2">Post-Mortems</h3>
              <p className="text-[13px] text-black/45 leading-[1.7] max-w-[28ch]">
                Generates detailed incident reports automatically. Know what broke.
              </p>
            </GlowCard>

          </div>
        </div>
      </section>

      {/* 4. Sticky Stacking Agents Section */}
      <section id="agents" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-24">
            <SectionHeading 
              subtitle="SRE AGENTS" 
              title={["Plug-and-play agents", "ready to deploy."]} 
            />
            <p className="text-[13px] text-black/45 leading-[1.8] max-w-sm lg:mb-20">
              Deploy specialized agents to handle your most critical infrastructure tasks. Each agent is isolated, deterministically verified, and operates at machine speed.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Card 1 */}
            <motion.div 
              className="sticky top-32 mb-6"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-[#faf9f7] rounded-[2rem] border border-black/[0.07] p-10 md:p-14 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
                <div>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] tracking-widest font-sans text-black/50 bg-black/[0.04] mb-8">
                    LOG ANALYST
                  </div>
                  <h3 className="text-4xl font-light tracking-tight mb-5">The Detective</h3>
                  <p className="text-[14px] text-black/50 leading-[1.8] max-w-[45ch]">
                    Ingests terabytes of log data per second. Instantly flags anomalies, stack traces, and silent failures before they impact your users.
                  </p>
                </div>
                <div className="flex gap-8 pt-8 border-t border-black/[0.05]">
                  <div>
                    <div className="text-4xl font-light tracking-tighter text-[#111]">10M+</div>
                    <div className="text-[10px] text-black/40 tracking-[0.25em] uppercase mt-2">Logs / Sec</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              className="sticky top-40 mb-6"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-[#f5f4f0] rounded-[2rem] border border-black/[0.08] p-10 md:p-14 shadow-md relative overflow-hidden h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-purple-50/50 to-transparent pointer-events-none" />
                <div>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] tracking-widest font-sans text-black/50 bg-black/[0.04] mb-8">
                    KUBERNETES OPERATOR
                  </div>
                  <h3 className="text-4xl font-light tracking-tight mb-5">The Orchestrator</h3>
                  <p className="text-[14px] text-black/50 leading-[1.8] max-w-[45ch]">
                    Manages pod lifecycles autonomously. Rolls back bad deployments, scales resources on demand, and ensures absolute high availability.
                  </p>
                </div>
                <div className="flex gap-8 pt-8 border-t border-black/[0.05]">
                  <div>
                    <div className="text-4xl font-light tracking-tighter text-[#111]">99.99%</div>
                    <div className="text-[10px] text-black/40 tracking-[0.25em] uppercase mt-2">Uptime</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              className="sticky top-48 mb-6"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-[#fafaf8] rounded-[2rem] border border-black/[0.09] p-10 md:p-14 shadow-xl relative overflow-hidden h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none" />
                <div>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] tracking-widest font-sans text-black/50 bg-black/[0.04] mb-8">
                    NETWORK ENGINEER
                  </div>
                  <h3 className="text-4xl font-light tracking-tight mb-5">The Router</h3>
                  <p className="text-[14px] text-black/50 leading-[1.8] max-w-[45ch]">
                    Detects latency spikes, packet loss, and DDoS attempts. Automatically reroutes traffic to healthy endpoints across regions.
                  </p>
                </div>
                <div className="flex gap-8 pt-8 border-t border-black/[0.05]">
                  <div>
                    <div className="text-4xl font-light tracking-tighter text-[#111]">&lt;2ms</div>
                    <div className="text-[10px] text-black/40 tracking-[0.25em] uppercase mt-2">Latency</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. Workflow Section (Spacious 2x2 Grid) */}
      <section id="workflow" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] overflow-hidden perspective-1000">
        <div className="max-w-7xl mx-auto">
          <SectionHeading 
            subtitle="WORKFLOW" 
            title={["From incident", "to resolution in seconds."]} 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { num: "01", title: "Detect", desc: "A.C.R.E. ingests telemetry and triggers the SRE loop the millisecond an anomaly occurs." },
              { num: "02", title: "Diagnose", desc: "Groq LLMs analyze the stack trace and identify the exact failing microservice." },
              { num: "03", title: "Remediate", desc: "Agents automatically apply the optimal configuration patch or rollback." },
              { num: "04", title: "Verify", desc: "Traffic is routed back only after full system health is verified." },
            ].map((step, i) => (
              <GlowCard key={i} className="p-10 md:p-12 flex flex-col justify-between min-h-[320px]">
                <span className="font-pixel text-[13px] text-black/20 tracking-widest block mb-12">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-2xl font-light tracking-tight mb-4">{step.title}</h3>
                  <p className="text-[13px] text-black/45 leading-[1.8] max-w-[40ch]">{step.desc}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Integrations */}
      <section id="integrations" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-20">
            <SectionHeading 
              subtitle="INTEGRATIONS" 
              title={["Connect any tool.", "Control any system."]} 
            />
            <p className="text-[13px] text-black/45 leading-[1.8] max-w-sm lg:mb-16">
              Native integrations with Datadog, AWS, Kubernetes, and PagerDuty. Plus a powerful SDK to build custom internal tools.
            </p>
          </div>
          <motion.div 
            className="rounded-[2rem] border border-black/[0.07] bg-[#fafaf8] p-10 md:p-14 relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
             <div className="flex-1 space-y-8 z-10 relative">
               <div className="rounded-2xl border border-white/50 p-8 bg-white/60 backdrop-blur-xl shadow-sm">
                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] tracking-widest font-sans text-black/40 bg-black/[0.04]">
                   SDK
                 </span>
                 <h3 className="mt-5 text-xl font-light tracking-tight mb-3">Build custom tools</h3>
                 <p className="text-[13px] text-black/45 leading-[1.8] mb-6">
                   Define any function as a tool your SRE agents can call during remediation.
                 </p>
                 <div className="bg-black/[0.03] rounded-xl border border-black/[0.06] p-5 font-mono text-[12px] text-black/50 leading-relaxed shadow-inner">
                   <span className="text-black/30">// custom remediation tool</span><br/>
                   <span className="text-blue-600/70">defineTool</span>(&#123;<br/>
                   &nbsp;&nbsp;<span className="text-amber-700/70">name</span>: <span className="text-green-700/70">'restartPod'</span>,<br/>
                   &nbsp;&nbsp;<span className="text-amber-700/70">run</span>: <span className="text-black/40">async (namespace) =&gt;</span><br/>
                   &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-600/70">k8s</span>.restart(namespace)<br/>
                   &#125;)
                 </div>
               </div>
             </div>
             <div className="flex-1 min-h-[400px] w-full border border-black/[0.05] rounded-2xl bg-[url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Org%20Arc%20-%20Upscaled-Sk90jShfu7nltLnhoQbaMJC1YaQKuU.png')] bg-cover bg-center shadow-sm" />
          </motion.div>
        </div>
      </section>

      {/* 7. Security / Audit Trail */}
      <section id="security" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] perspective-1000">
        <div className="max-w-7xl mx-auto">
          <SectionHeading 
            subtitle="SECURITY" 
            title={["Enterprise-grade", "from day one."]} 
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            <div className="space-y-12">
              <p className="text-[14px] text-black/50 leading-[1.8] max-w-md">
                Every action is logged, every decision is traceable. Built for engineering teams that need compliance without sacrificing speed.
              </p>
              <div className="space-y-8">
                {[
                  { title: "SOC 2 Type II", desc: "Independently audited security controls and infrastructure" },
                  { title: "Full Audit Trail", desc: "Every decision logged with cryptographic traceability" },
                  { title: "Human-in-the-Loop", desc: "Require manual approval for destructive operations" }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="w-1 bg-black/10 rounded-full shrink-0" />
                    <div>
                      <h3 className="text-base font-light tracking-tight mb-1">{feature.title}</h3>
                      <p className="text-[13px] text-black/40 leading-[1.7] max-w-[35ch]">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <GlowCard className="p-10 md:p-14">
              <div className="text-[11px] text-black/30 tracking-widest uppercase mb-8 font-medium">Live Audit Trail</div>
              <div className="space-y-4">
                {[
                  { time: "12:34:21", action: "traffic_rerouted", color: "bg-green-500" },
                  { time: "12:34:18", action: "remediation_applied", color: "bg-blue-500" },
                  { time: "12:34:15", action: "root_cause_identified", color: "bg-amber-500" },
                  { time: "12:34:12", action: "agent_dispatched", color: "bg-black/40" },
                  { time: "12:34:09", action: "anomaly_detected", color: "bg-red-500" }
                ].map((log, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-5 px-5 py-3.5 rounded-xl bg-black/[0.02] border border-black/[0.04]"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <span className="text-[11px] text-black/30 font-mono w-16">{log.time}</span>
                    <span className="text-[13px] text-black/60 font-light flex-1">{log.action}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${log.color} opacity-80`} />
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* 8. CTA */}
      <section className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] bg-[#111] text-[#F5F4F0] selection:bg-white/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            className="text-6xl md:text-8xl font-light tracking-tighter mb-8 leading-[0.95]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Stop fighting fires.<br />Start building.
          </motion.h2>
          <motion.p 
            className="text-lg md:text-xl text-white/50 font-light mb-14 max-w-xl mx-auto leading-relaxed tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Deploy A.C.R.E. in your cluster today and let deterministic AI handle your incident response.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center"
          >
            <MagneticButton 
              onClick={() => navigate('/signup')}
              className="px-10 py-5 rounded-2xl bg-white text-black text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-white/90 transition-colors shadow-2xl shadow-white/10"
            >
              Deploy SRE Agent
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* 9. Minimal Footer */}
      <footer className="py-14 px-6 md:px-12 lg:px-20 bg-[#111] text-white/40 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="font-pixel text-sm tracking-[0.25em] text-white/80">A.C.R.E.</span>
          <div className="flex items-center gap-8 text-[11px] font-medium tracking-widest uppercase">
            <a href="https://github.com/abhishekchauhan1365/A.C.R.E#readme" className="hover:text-white transition-colors">Documentation</a>
            <a href="https://github.com/abhishekchauhan1365/A.C.R.E" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
