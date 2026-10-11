import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const API = import.meta.env.VITE_API_URL || '';
            const res = await axios.post(`${API}/api/auth/login`, { email, password });

            localStorage.setItem('acre_token', res.data.token);
            localStorage.setItem('acre_user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Incorrect email or password.');
        }

        setLoading(false);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15, filter: 'blur(4px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <div className="min-h-screen flex font-sans antialiased bg-[#F5F4F0] text-[#111]">
            
            {/* Left Pane - Branding */}
            <div className="hidden lg:flex w-1/2 bg-[#111] text-[#F5F4F0] p-12 flex-col justify-between relative overflow-hidden">
                {/* Animated Noise Overlay */}
                <div 
                    className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] mix-blend-overlay" 
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                />
                
                <div className="absolute inset-0 z-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative z-20">
                    <Link to="/" className="inline-block font-pixel text-sm tracking-[0.25em] text-white/80 hover:text-white transition-colors">
                        A.C.R.E.
                    </Link>
                </div>

                <div className="relative z-20 max-w-lg">
                    <motion.h1 
                        className="text-5xl font-light tracking-tighter mb-6 leading-[1.05]"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        Welcome back to the Control Server.
                    </motion.h1>
                    <motion.p 
                        className="text-[14px] text-white/50 leading-[1.8] max-w-[40ch]"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    >
                        Sign in to monitor your infrastructure, review critical crash logs, and deploy deterministic AI-generated configuration patches instantly.
                    </motion.p>
                </div>
                
                <div className="relative z-20">
                    <div className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Deterministic SRE Platform</div>
                </div>
            </div>

            {/* Right Pane - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                
                {/* Mobile Branding */}
                <div className="absolute top-8 left-8 lg:hidden">
                    <Link to="/" className="font-pixel text-xs tracking-[0.25em] text-black/80 hover:text-black">
                        A.C.R.E.
                    </Link>
                </div>

                <motion.div 
                    className="w-full max-w-md"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    <motion.div variants={itemVariants} className="mb-10">
                        <h2 className="text-3xl font-light tracking-tight mb-2">Sign in</h2>
                        <p className="text-[13px] text-black/50">Enter your credentials to access your dashboard.</p>
                    </motion.div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px] font-medium"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <motion.div variants={itemVariants}>
                            <label className="block text-[11px] uppercase tracking-widest font-medium text-black/50 mb-2" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 focus:border-black/30 focus:ring-4 focus:ring-black/5 outline-none transition-all text-[14px] placeholder:text-black/30 shadow-sm"
                                required
                                autoFocus
                            />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[11px] uppercase tracking-widest font-medium text-black/50" htmlFor="password">
                                    Password
                                </label>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white border border-black/10 focus:border-black/30 focus:ring-4 focus:ring-black/5 outline-none transition-all text-[14px] placeholder:text-black/30 shadow-sm"
                                required
                            />
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-2">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 rounded-xl bg-[#111] text-white text-[12px] uppercase tracking-widest font-medium hover:bg-black/90 transition-all active:scale-[0.98] shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in to Console'}
                            </button>
                        </motion.div>
                    </form>

                    <motion.p variants={itemVariants} className="mt-8 text-center text-[13px] text-black/50">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-black font-medium hover:underline underline-offset-4">
                            Create one now
                        </Link>
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
