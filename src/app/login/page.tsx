'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Error de login:', error);
                toast.error('Credenciales incorrectas');
                return;
            }

            if (data.session) {
                toast.success('¡Bienvenido a IntiGym!');
                // Esperar un momento para que las cookies se guarden
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            }
        } catch (error) {
            console.error('Error inesperado:', error);
            toast.error('Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-3 sm:p-4 md:p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-[#AB8745]/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-[#32556E]/5 rounded-full blur-3xl"></div>
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl p-6 sm:p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-52 md:h-52 mb-4 sm:mb-6 relative">
                            <img
                                src="/intigym-logo.png"
                                alt="IntiGym Logo"
                                className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(171,135,69,0.3)]"
                            />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">INTI-GYM</h1>
                        <div className="flex items-center gap-2">
                            <div className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent to-[#AB8745]"></div>
                            <p className="text-xs sm:text-sm text-[#AB8745] font-semibold tracking-wider">AYACUCHO</p>
                            <div className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent to-[#AB8745]"></div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@intigym.com"
                                    disabled={loading}
                                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={loading}
                                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-[#AB8745] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                    <span className="hidden xs:inline">Iniciando sesión...</span>
                                    <span className="xs:hidden">Iniciando...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 sm:mt-8 text-center">
                        <p className="text-xs sm:text-sm text-gray-500">
                            Sistema protegido con Supabase Auth - JoséAT
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
