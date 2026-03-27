'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    User,
    Calendar,
    CreditCard,
    ArrowLeft,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    Phone,
    Mail,
    IdCard,
    Activity,
    ChevronRight,
    Plus,
    Zap,
    DollarSign
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getDaysUntilExpiration, isExpiringSoon } from '@/lib/utils';
import WhatsAppButton from '@/components/WhatsAppButton';
import RenewMemberModal, { RenewalFormData } from '@/components/RenewMemberModal';

interface MemberDetail {
    id: string;
    nombres: string;
    apellidos: string;
    dni: string;
    telefono: string | null;
    email: string | null;
    fecha_nacimiento: string | null;
    created_at: string;
    matriculas: any[];
    pagos: any[];
    asistencias: any[];
}

export default function MemberEliteProfile({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const memberId = resolvedParams.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState<MemberDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'asistencia' | 'progreso'>('resumen');
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

    useEffect(() => {
        if (memberId) {
            loadMemberFullData();
        }
    }, [memberId]);

    const loadMemberFullData = async () => {
        try {
            setLoading(true);

            // 1. Cargar datos básicos y matrículas
            const { data: clientData, error: clientError } = await (supabase
                .from('clientes') as any)
                .select(`
          *,
          matriculas (
            *,
            planes (nombre)
          ),
          asistencias (
            *
          )
        `)
                .eq('id', memberId)
                .single();

            if (clientError || !clientData) {
                toast.error('No se pudo encontrar el socio');
                router.push('/clientes');
                return;
            }

            // 2. Cargar todos los pagos de todas las matrículas del socio
            const matriculaIds = clientData.matriculas?.map((m: any) => m.id) || [];
            const { data: pagosData, error: pagosError } = await (supabase
                .from('pagos') as any)
                .select('*')
                .in('matricula_id', matriculaIds)
                .order('fecha_pago', { ascending: false });

            if (pagosError) console.error('Error al cargar pagos:', pagosError);

            setMember({
                ...clientData,
                pagos: pagosData || []
            });

        } catch (error) {
            console.error('Error loadMemberFullData:', error);
            toast.error('Error al cargar el perfil del socio');
        } finally {
            setLoading(false);
        }
    };

    const handleRenewMember = async (formData: RenewalFormData) => {
        if (!member) return;

        try {
            // 1. Crear nueva matrícula
            const { data: newMatricula, error: matriculaError } = await (supabase
                .from('matriculas') as any)
                .insert([{
                    cliente_id: member.id,
                    plan_id: formData.planId,
                    fecha_inicio: formData.fechaInicio,
                    fecha_vencimiento: formData.fechaVencimiento,
                    monto_total: formData.montoTotal,
                    estado: 'activo'
                }])
                .select()
                .single();

            if (matriculaError) throw matriculaError;

            // 2. Registrar pago
            if (formData.montoPagado > 0 && newMatricula) {
                const { error: pagoError } = await (supabase
                    .from('pagos') as any)
                    .insert([{
                        matricula_id: newMatricula.id,
                        monto_pagado: formData.montoPagado,
                        metodo_pago: formData.metodoPago,
                        fecha_pago: new Date().toISOString()
                    }]);

                if (pagoError) throw pagoError;
            }

            toast.success('¡Membresía renovada exitosamente!');
            setIsRenewModalOpen(false);

            // 3. Recargar datos del perfil
            await loadMemberFullData();

        } catch (error) {
            console.error('Error al renovar:', error);
            toast.error('Error al renovar membresía');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0a0a0a] text-white">
                <Sidebar />
                <main className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-[#AB8745]/20 border-t-[#AB8745] rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-medium animate-pulse">Cargando perfil elite...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!member) return null;

    const ultimaMatricula = member.matriculas?.length > 0
        ? [...member.matriculas].sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0]
        : null;

    const diasRestantes = ultimaMatricula ? getDaysUntilExpiration(ultimaMatricula.fecha_vencimiento) : 0;
    const isVencido = diasRestantes <= 0;
    const totalPagado = member.pagos?.reduce((sum, p) => sum + (p.monto_pagado || 0), 0) || 0;

    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white">
            <Sidebar />

            <main className="flex-1 p-6 md:p-10 overflow-y-auto">
                {/* Back Button & Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:border-[#AB8745]/30">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-semibold uppercase tracking-widest text-xs">Volver a Clientes</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <WhatsAppButton
                            telefono={member.telefono || ''}
                            nombre={`${member.nombres} ${member.apellidos}`}
                            fechaVencimiento={ultimaMatricula?.fecha_vencimiento || ''}
                        />
                        <button
                            onClick={() => setIsRenewModalOpen(true)}
                            className="px-6 py-2.5 bg-linear-to-r from-[#AB8745] to-[#D4A865] rounded-xl font-bold text-sm shadow-lg shadow-[#AB8745]/20 hover:scale-105 transition-all"
                        >
                            Renovar Membresía
                        </button>
                    </div>
                </div>

                {/* Hero Section - PROFILE CARD */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">

                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1 bg-linear-to-b from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center relative overflow-hidden group"
                    >
                        <div className="absolute top-0 inset-x-0 h-32 bg-linear-to-b from-[#AB8745]/20 to-transparent"></div>

                        <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-full border-4 border-[#AB8745]/30 p-1 bg-[#0a0a0a]">
                                <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                                    <User className="w-16 h-16 text-[#D4A865]" />
                                </div>
                            </div>
                            <div className={`absolute bottom-1 right-1 w-8 h-8 rounded-full border-4 border-[#0a0a0a] flex items-center justify-center ${isVencido ? 'bg-red-500' : 'bg-green-500'}`}>
                                {isVencido ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </div>
                        </div>

                        <h3 className="text-2xl font-black mb-1 leading-tight">{member.nombres}<br />{member.apellidos}</h3>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-tighter mb-6">{ultimaMatricula?.planes?.nombre || 'Sin Plan Activo'}</p>

                        <div className="w-full space-y-3 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                                    <IdCard className="w-4 h-4" />
                                </div>
                                <span className="text-gray-300 font-medium">DNI {member.dni}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <span className="text-gray-300 font-medium">{member.telefono || 'No registrado'}</span>
                            </div>
                            {member.email && (
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span className="text-gray-300 font-medium truncate max-w-[150px]">{member.email}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Stats Grid */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Stat: Dias Restantes */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:border-[#AB8745]/40 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-4 rounded-2xl ${isVencido ? 'bg-red-500/20 text-red-400' : 'bg-[#AB8745]/20 text-[#D4A865]'}`}>
                                    <Clock className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-500">Membresía</span>
                            </div>
                            <div>
                                <h4 className="text-sm text-gray-400 font-bold uppercase mb-1">{isVencido ? 'Expiró hace' : 'Días Restantes'}</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-black ${isVencido ? 'text-red-500' : 'text-white'}`}>{Math.abs(diasRestantes)}</span>
                                    <span className="text-gray-500 font-bold uppercase text-xs">Días</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Stat: Asistencias */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:border-blue-500/40 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-500">Presencia</span>
                            </div>
                            <div>
                                <h4 className="text-sm text-gray-400 font-bold uppercase mb-1">Total Visitas</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white">{member.asistencias?.length || 0}</span>
                                    <span className="text-gray-500 font-bold uppercase text-xs">Entradas</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Stat: Inversión Total */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:border-emerald-500/40 transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-500">Finanzas</span>
                            </div>
                            <div>
                                <h4 className="text-sm text-gray-400 font-bold uppercase mb-1">Inversión Total</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white">S/ {totalPagado.toLocaleString()}</span>
                                    <span className="text-gray-500 font-bold uppercase text-xs">PEN</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Expired Alert / Active Info */}
                        <div className="md:col-span-3">
                            <div className={`p-6 rounded-4xl border flex items-center justify-between ${isVencido ? 'bg-red-500/10 border-red-500/30' : 'bg-[#AB8745]/10 border-[#AB8745]/30'}`}>
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isVencido ? 'bg-red-500/20 text-red-500' : 'bg-[#AB8745]/20 text-[#AB8745]'}`}>
                                        {isVencido ? <AlertCircle className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-lg">{isVencido ? 'Membresía Vencida' : 'Membresía Activa'}</h5>
                                        <p className="text-sm text-gray-400">
                                            {isVencido
                                                ? `El socio no tiene una membresía vigente desde el ${new Date(ultimaMatricula?.fecha_vencimiento).toLocaleDateString()}.`
                                                : `Vence el ${new Date(ultimaMatricula?.fecha_vencimiento).toLocaleDateString()}. Todavía le quedan ${diasRestantes} días de acceso.`}
                                        </p>
                                    </div>
                                </div>
                                {isVencido && (
                                    <button
                                        onClick={() => setIsRenewModalOpen(true)}
                                        className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors mb-0"
                                    >
                                        Renovar Ahora
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Content Tabs */}
                <div className="mb-8 border-b border-white/5 flex gap-8">
                    {[
                        { id: 'resumen', label: 'Resumen' },
                        { id: 'historial', label: 'Historial de Pagos' },
                        { id: 'asistencia', label: 'Asistencia' },
                        { id: 'progreso', label: 'Evolución Física' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-[#D4A865]' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 inset-x-0 h-1 bg-[#D4A865] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Dynamic Content */}
                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'resumen' && (
                            <motion.div
                                key="resumen"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-8"
                            >
                                {/* Info List */}
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-[#AB8745]" />
                                        Última Actividad
                                    </h3>
                                    <div className="space-y-4">
                                        {member.asistencias?.length > 0 ? (
                                            member.asistencias.slice(0, 5).map((asist, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">Ingreso detectado</p>
                                                            <p className="text-xs text-gray-500">Validación por DNI exitosa</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {new Date(asist.fecha_hora).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic">No hay registros de asistencia recientes.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Mini View */}
                                <div className="bg-linear-to-br from-[#1a1a1a] to-transparent border border-[#AB8745]/10 rounded-3xl p-8">
                                    <h3 className="text-xl font-bold mb-6">Detalles de la Membresía</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Plan contratado</span>
                                            <span className="font-bold text-[#D4A865]">{ultimaMatricula?.planes?.nombre || 'Ninguno'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Fecha de inicio</span>
                                            <span className="font-bold">{ultimaMatricula ? new Date(ultimaMatricula.fecha_inicio).toLocaleDateString() : '--'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                                            <span className="text-gray-400">Fecha de vencimiento</span>
                                            <span className="font-bold">{ultimaMatricula ? new Date(ultimaMatricula.fecha_vencimiento).toLocaleDateString() : '--'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-gray-400">Antigüedad como socio</span>
                                            <span className="font-bold">{new Date(member.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-4 bg-[#AB8745]/5 rounded-2xl border border-[#AB8745]/20">
                                        <p className="text-xs text-[#D4A865] font-black uppercase mb-1">Nota Administrativa</p>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Socio registrado bajo el plan {ultimaMatricula?.planes?.nombre || 'n/a'}. Se recomienda seguimiento de asistencia semanal.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'historial' && (
                            <motion.div
                                key="historial"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/10">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Fecha</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Concepto</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Método</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Monto</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {member.pagos?.length > 0 ? (
                                                member.pagos.map((pago: any) => (
                                                    <tr key={pago.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium">
                                                            {new Date(pago.fecha_pago).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            Pago Membresía
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-black uppercase">
                                                                {pago.metodo_pago}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-emerald-400">
                                                            S/ {pago.monto_pagado.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Confirmado
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No hay historial de pagos registrado.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'asistencia' && (
                            <motion.div
                                key="asistencia"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8">
                                        <h3 className="text-lg font-bold mb-6">Registro Mensual</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {/* Simulación visual de calendario de asistencia */}
                                            {Array.from({ length: 30 }).map((_, i) => {
                                                const date = new Date();
                                                date.setDate(date.getDate() - (29 - i));
                                                const hasAsistencia = member.asistencias?.some(a =>
                                                    new Date(a.fecha_hora).toDateString() === date.toDateString()
                                                );

                                                return (
                                                    <div
                                                        key={i}
                                                        title={date.toLocaleDateString()}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${hasAsistencia ? 'bg-[#AB8745] text-white' : 'bg-white/5 text-gray-700 border border-white/5'}`}
                                                    >
                                                        {date.getDate()}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-8 flex gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-[#AB8745]"></div>
                                                <span className="text-xs text-gray-400">Presente</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-white/5 border border-white/10"></div>
                                                <span className="text-xs text-gray-400">Ausente</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-linear-to-b from-[#AB8745]/10 to-transparent border border-[#AB8745]/20 rounded-3xl p-8">
                                        <h3 className="text-lg font-bold mb-4">Métrica de Uso</h3>
                                        <div className="text-center py-6">
                                            <div className="inline-flex items-baseline gap-1">
                                                <span className="text-6xl font-black text-white">
                                                    {member.asistencias?.filter(a => {
                                                        const aDate = new Date(a.fecha_hora);
                                                        const monthAgo = new Date();
                                                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                                                        return aDate > monthAgo;
                                                    }).length || 0}
                                                </span>
                                                <span className="text-gray-500 font-bold uppercase text-xs">visitas</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 font-bold uppercase">En los últimos 30 días</p>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-6">
                                            <div
                                                className="h-full bg-[#AB8745]"
                                                style={{ width: `${Math.min(((member.asistencias?.length || 0) / 20) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-2 text-center">Basado en promedio de 20 visitas/mes</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <AnimatePresence>
                    {activeTab === 'progreso' && (
                        <motion.div
                            key="progreso"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 border border-dashed border-[#AB8745]/30 rounded-[3rem]"
                        >
                            <div className="w-20 h-20 bg-[#AB8745]/10 rounded-full flex items-center justify-center mb-6 border border-[#AB8745]/20">
                                <TrendingUp className="w-10 h-10 text-[#D4A865]" />
                            </div>
                            <h3 className="text-2xl font-black mb-2 uppercase italic text-[#D4A865]">Próximamente: Evolution Pro</h3>
                            <p className="max-w-md text-gray-500 text-sm leading-relaxed">
                                Estamos preparando una sección elite para que puedas registrar el **peso, % de grasa y medidas** del socio, visualizando su progreso en gráficos profesionales.
                            </p>
                            <button className="mt-8 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#D4A865]">
                                Notificar al activarse
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Modal de Renovación */}
            {member && (
                <RenewMemberModal
                    isOpen={isRenewModalOpen}
                    onClose={() => setIsRenewModalOpen(false)}
                    onSubmit={handleRenewMember}
                    memberData={{
                        id: member.id,
                        nombre: `${member.nombres} ${member.apellidos}`,
                        dni: member.dni,
                        planActual: ultimaMatricula?.planes?.nombre || 'Sin Plan',
                        fechaVencimiento: ultimaMatricula?.fecha_vencimiento || ''
                    }}
                />
            )}
        </div>
    );
}
