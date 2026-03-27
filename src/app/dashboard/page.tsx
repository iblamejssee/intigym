'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import {
    Users,
    CreditCard,
    DollarSign,
    Loader2,
    TrendingUp,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Smartphone,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getDaysUntilExpiration, isExpiringSoon, getExpirationAlertColor } from '@/lib/utils';
import WhatsAppButton from '@/components/WhatsAppButton';

interface DashboardStats {
    totalSocios: number;
    pagosPendientes: number;
    ingresosMes: number;
    ingresosPorMetodo: {
        efectivo: number;
        yape: number;
        plin: number;
        transferencia: number;
    };
}

interface ExpiringMember {
    id: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    plan: string;
    fecha_vencimiento: string;
    dias_restantes: number;
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalSocios: 0,
        pagosPendientes: 0,
        ingresosMes: 0,
        ingresosPorMetodo: { efectivo: 0, yape: 0, plin: 0, transferencia: 0 },
    });
    const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
    const [currentDate, setCurrentDate] = useState<string>('');

    useEffect(() => {
        loadAllData();
        setCurrentDate(new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const hoy = new Date().toISOString().split('T')[0];
            const inicioMes = new Date();
            inicioMes.setDate(1);
            const inicioMesStr = inicioMes.toISOString().split('T')[0];

            // 1. Total Socios (Contar registros en clientes)
            const { count: totalCount } = await (supabase
                .from('clientes') as any)
                .select('*', { count: 'exact', head: true });

            // 2. Pagos Pendientes (Vencidos hoy)
            const { count: pendientesCount } = await (supabase
                .from('matriculas') as any)
                .select('*', { count: 'exact', head: true })
                .eq('estado', 'vencido');

            // 3. Ingresos del Mes (Desde la tabla pagos)
            const { data: pagosMes } = await (supabase
                .from('pagos') as any)
                .select('monto_pagado, metodo_pago')
                .gte('fecha_pago', inicioMesStr);

            let totalIngresos = 0;
            const porMetodo = { efectivo: 0, yape: 0, plin: 0, transferencia: 0 };

            if (pagosMes) {
                pagosMes.forEach((p: any) => {
                    const monto = p.monto_pagado || 0;
                    totalIngresos += monto;
                    const metodo = (p.metodo_pago || 'efectivo').toLowerCase();
                    if (metodo === 'yape') porMetodo.yape += monto;
                    else if (metodo === 'plin') porMetodo.plin += monto;
                    else if (metodo === 'transferencia') porMetodo.transferencia += monto;
                    else porMetodo.efectivo += monto;
                });
            }

            setStats({
                totalSocios: totalCount || 0,
                pagosPendientes: pendientesCount || 0,
                ingresosMes: totalIngresos,
                ingresosPorMetodo: porMetodo,
            });

            // 4. Socios próximos a vencer (Próximos 7 días)
            const en7Dias = new Date();
            en7Dias.setDate(new Date().getDate() + 7);
            const { data: vencimientos } = await (supabase
                .from('matriculas') as any)
                .select(`
          fecha_vencimiento,
          planes (nombre),
          clientes (id, nombres, apellidos, telefono)
        `)
                .gte('fecha_vencimiento', hoy)
                .lte('fecha_vencimiento', en7Dias.toISOString().split('T')[0])
                .eq('estado', 'activo')
                .order('fecha_vencimiento', { ascending: true })
                .limit(6);

            if (vencimientos) {
                setExpiringMembers(vencimientos.map((m: any) => ({
                    id: m.clientes.id,
                    nombres: m.clientes.nombres,
                    apellidos: m.clientes.apellidos,
                    telefono: m.clientes.telefono,
                    plan: m.planes.nombre,
                    fecha_vencimiento: m.fecha_vencimiento,
                    dias_restantes: getDaysUntilExpiration(m.fecha_vencimiento)
                })));
            }

        } catch (error) {
            console.error('Error loadStats:', error);
            toast.error('Ocurrió un error al cargar el resumen');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white">
            <Sidebar expiringCount={expiringMembers.length} />

            <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full">
                <header className="mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Resumen Ejecutivo</h1>
                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#AB8745]" />
                                {currentDate || 'Cargando fecha...'}
                            </p>
                        </div>
                        <button
                            onClick={loadAllData}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-[#AB8745]/30 rounded-full transition-all flex items-center gap-2 text-sm font-medium"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#D4A865]" /> : <TrendingUp className="w-4 h-4 text-[#D4A865]" />}
                            Actualizar datos
                        </button>
                    </motion.div>
                </header>

                {/* Info Grid (Bento Style) */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-10">

                    {/* Main Stat: Ingresos */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 row-span-2 bg-linear-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#AB8745]/20 rounded-3xl p-5 md:p-8 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#AB8745]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[#AB8745]/10 transition-all duration-500"></div>

                        <div className="flex justify-between items-start mb-10">
                            <div className="w-16 h-16 bg-[#AB8745]/20 rounded-2xl flex items-center justify-center border border-[#AB8745]/30">
                                <DollarSign className="w-8 h-8 text-[#D4A865]" />
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#AB8745]">Ingresos del Mes</span>
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin mt-2 ml-auto" />
                                ) : (
                                    <h2 className="text-3xl md:text-5xl font-black mt-1">S/ {stats.ingresosMes.toLocaleString()}</h2>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-auto">
                            <div className="bg-white/5 rounded-2xl p-3 md:p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] text-gray-400 font-medium">Efectivo</span>
                                </div>
                                <p className="text-lg md:text-xl font-bold">S/ {stats.ingresosPorMetodo.efectivo.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 md:p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-[#7331D2]"></div>
                                    <span className="text-[10px] text-gray-400 font-medium">Yape</span>
                                </div>
                                <p className="text-lg md:text-xl font-bold">S/ {stats.ingresosPorMetodo.yape.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 md:p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-[#00D1FF]"></div>
                                    <span className="text-[10px] text-gray-400 font-medium">Plin</span>
                                </div>
                                <p className="text-lg md:text-xl font-bold">S/ {stats.ingresosPorMetodo.plin.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 md:p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span className="text-[10px] text-gray-400 font-medium">Transf.</span>
                                </div>
                                <p className="text-lg md:text-xl font-bold">S/ {stats.ingresosPorMetodo.transferencia.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-sm text-green-400 font-medium">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Crecimiento sostenido este mes</span>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-[#AB8745]/40 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Socios Totales</p>
                                    <h3 className="text-2xl font-black">{stats.totalSocios}</h3>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '85%' }}
                                    className="h-full bg-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-[#AB8745]/40 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center animate-pulse">
                                    <AlertCircle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Membresías Vencidas</p>
                                    <h3 className="text-2xl font-black">{stats.pagosPendientes}</h3>
                                </div>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: stats.totalSocios > 0 ? `${(stats.pagosPendientes / stats.totalSocios) * 100}%` : '0%' }}
                                    className="h-full bg-red-500"
                                />
                            </div>
                        </div>

                        {/* Metodo de Pago Breakdown Card */}
                        <div className="col-span-1 sm:col-span-2 bg-linear-to-r from-[#AB8745]/10 to-transparent border border-[#AB8745]/20 rounded-3xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-[#7331D2]/20 rounded-2xl border border-[#7331D2]/30">
                                    <Smartphone className="w-8 h-8 text-[#7331D2]" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold">Predominancia Yape</h4>
                                    <p className="text-sm text-gray-400">Las transferencias digitales representan el {stats.ingresosMes > 0 ? (((stats.ingresosPorMetodo.yape + stats.ingresosPorMetodo.plin + stats.ingresosPorMetodo.transferencia) / stats.ingresosMes) * 100).toFixed(0) : 0}%</p>
                                </div>
                            </div>
                            <div className="hidden md:block text-[#AB8745]">
                                <ArrowUpRight className="w-8 h-8 opacity-50" />
                            </div>
                        </div>

                    </div>

                    {/* Expiring Members Section */}
                    <div className="col-span-1 md:col-span-4 lg:col-span-6 bg-white/5 border border-white/10 rounded-3xl p-5 md:p-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-orange-400" />
                                </div>
                                <h3 className="text-2xl font-bold italic">Alertas de Vencimiento</h3>
                            </div>
                            <span className="text-xs text-gray-500 font-bold uppercase">Próximos 7 días</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {expiringMembers.length > 0 ? expiringMembers.map((member, idx) => {
                                    const alertColor = getExpirationAlertColor(member.dias_restantes);
                                    return (
                                        <motion.div
                                            key={member.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className={`p-5 rounded-2xl border ${alertColor.border} bg-white/5 hover:bg-white/10 transition-colors group relative overflow-hidden`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="z-10">
                                                    <h4 className="font-bold text-lg text-white group-hover:text-[#D4A865] transition-colors">{member.nombres} {member.apellidos}</h4>
                                                    <p className="text-xs text-gray-400 font-medium">{member.plan}</p>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${alertColor.badge} z-10`}>
                                                    {member.dias_restantes} d
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between z-10">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Vence el</p>
                                                    <p className="text-sm font-semibold text-gray-300">
                                                        {new Date(member.fecha_vencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                </div>
                                                <WhatsAppButton
                                                    telefono={member.telefono}
                                                    nombre={`${member.nombres} ${member.apellidos}`}
                                                    fechaVencimiento={member.fecha_vencimiento}
                                                    size="sm"
                                                />
                                            </div>
                                            {/* Abstract Background Element */}
                                            <div className={`absolute -right-4 -bottom-4 w-16 h-16 pointer-events-none opacity-10 group-hover:opacity-20 transition-all ${alertColor.text}`}>
                                                <AlertCircle className="w-full h-full" />
                                            </div>
                                        </motion.div>
                                    )
                                }) : (
                                    <div className="col-span-full h-40 flex flex-col items-center justify-center bg-white/5 border border-white/5 rounded-3xl border-dashed">
                                        <CheckCircle2 className="w-10 h-10 text-green-500 mb-3 opacity-30" />
                                        <p className="text-gray-500 font-medium">No hay vencimientos próximos. ¡Todo al día!</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="mt-8 flex justify-center">
                            <button className="text-xs font-bold uppercase tracking-widest text-[#AB8745] hover:text-[#D4A865] transition-colors flex items-center gap-2">
                                Ver reporte completo de socios <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer info */}
                <footer className="mt-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Sistema Operativo • V1.5 Normalizado
                    </div>
                    <p className="text-xs font-medium">INTI-GYM © 2026 Admin Panel</p>
                </footer>
            </main>
        </div>
    );
}
