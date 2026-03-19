import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (success && !loading) {
            const timer = setTimeout(() => {
                setRedirecting(true);
                setTimeout(() => {
                    navigate("/newcase");
                }, 1000);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [success, loading, navigate]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        console.log("Login Attempt with:", { email, password });

        // Simulate API call
        setTimeout(() => {
            if (email && password) {
                setSuccess("✓ Authentication successful! Redirecting...");
                setLoading(false);
            } else {
                setError("Please fill in all mandatory fields");
                setLoading(false);
            }
        }, 1200);
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        setResetLoading(true);
        setError("");

        console.log("Password Reset for:", resetEmail);

        setTimeout(() => {
            setResetSuccess(true);
            setResetEmail("");
            setResetLoading(false);

            setTimeout(() => {
                setResetSuccess(false);
                setIsForgotPassword(false);
            }, 3500);
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-2 relative overflow-hidden font-sans">
            {/* Subtle, Formal Background Effects */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-green-600/10 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

            {/* Main Container */}
            <div className="w-full max-w-md relative z-10">

                {/* Loading Redirect Overlay */}
                {redirecting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl p-8 text-center shadow-2xl border-t-4 border-orange-500">
                            <div className="mb-4 flex justify-center">
                                <div className="relative w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                    <Shield className="text-slate-800" size={32} />
                                </div>
                            </div>
                            <p className="text-slate-800 font-bold text-lg">Securing Session...</p>
                            <p className="text-slate-500 text-sm mt-1">Routing to dashboard</p>
                            <div className="mt-4 flex gap-1 justify-center">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Card */}
                {!isForgotPassword ? (
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-slate-200 transform transition-all">
                        
                        {/* Official Header */}
                        <div className="relative px-8 py-10 bg-[#0f172a] text-center overflow-hidden">
                            {/* Tricolor Top Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                                <div className="flex-1 bg-[#FF9933]"></div>
                                <div className="flex-1 bg-white"></div>
                                <div className="flex-1 bg-[#138808]"></div>
                            </div>

                            {/* subtle background pattern in header */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                            {/* Government Logo Space */}
                            <div className="relative z-10 mb-5 flex justify-center">
                                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg p-2 border-2 border-slate-700">
                                    <img 
                                        src="/images-removebg-preview.png" 
                                        alt="Emblem" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>

                            {/* Header Text */}
                            <div className="relative z-10">
                                <p className="text-[#FF9933] text-xs font-bold tracking-[0.2em] uppercase mb-1">
                                    Government of India
                                </p>
                                <h1 className="text-2xl font-black text-white uppercase tracking-wide">
                                    Ministry of Culture
                                </h1>
                                <div className="mt-3 inline-block px-4 py-1 bg-slate-800/80 rounded-full border border-slate-700">
                                    <p className="text-slate-300 text-xs font-medium tracking-wide">
                                        Ministerial Request & Referral Portal
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="px-8 py-8">
                            {/* Success Message */}
                            {success && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-slideIn">
                                    <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-medium text-green-800">{success}</p>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slideIn">
                                    <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-medium text-red-800">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                {/* Email Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Official Email ID
                                    </label>
                                    <div className="relative group">
                                        <div className="relative flex items-center">
                                            <Mail size={18} className="absolute left-4 text-slate-400 group-focus-within:text-[#FF9933] transition-colors" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="officer@gov.in"
                                                className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:border-[#FF9933] transition-all bg-white hover:border-slate-400 text-slate-800 placeholder-slate-400 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <div className="relative flex items-center">
                                            <Lock size={18} className="absolute left-4 text-slate-400 group-focus-within:text-[#FF9933] transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-11 pr-11 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:border-[#FF9933] transition-all bg-white hover:border-slate-400 text-slate-800 placeholder-slate-400 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Remember & Forgot */}
                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-[#FF9933] focus:ring-[#FF9933]"
                                        />
                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsForgotPassword(true)}
                                        className="text-sm font-semibold text-slate-700 hover:text-[#FF9933] transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                {/* Login Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !email || !password}
                                    className="w-full mt-2 px-6 py-3 bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Secure Login</span>
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* Forgot Password Card */
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="relative px-8 py-10 bg-[#0f172a] text-center overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                                <div className="flex-1 bg-[#FF9933]"></div>
                                <div className="flex-1 bg-white"></div>
                                <div className="flex-1 bg-[#138808]"></div>
                            </div>

                            <div className="relative z-10 mb-5 flex justify-center">
                                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-700">
                                    <Lock className="text-slate-300" size={28} />
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h1 className="text-xl font-bold text-white mb-2">Account Recovery</h1>
                                <p className="text-slate-400 text-sm px-4">Enter your official ID to receive a secure reset link.</p>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="px-8 py-8">
                            {resetSuccess && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-slideIn">
                                    <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-medium text-green-800">
                                        Recovery instructions have been dispatched to your official email.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Official Email ID
                                    </label>
                                    <div className="relative group">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF9933] transition-colors" />
                                        <input
                                            type="email"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            required
                                            placeholder="officer@gov.in"
                                            className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:border-[#FF9933] transition-all bg-white text-sm text-slate-800"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={resetLoading || !resetEmail}
                                    className="w-full px-6 py-3 bg-[#FF9933] hover:bg-[#e68a2e] disabled:bg-slate-300 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
                                >
                                    {resetLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span>Dispatch Reset Link</span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(false);
                                        setError("");
                                    }}
                                    className="w-full px-6 py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                                >
                                    Return to Secure Login
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default Login;