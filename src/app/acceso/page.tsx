'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Loader2, CheckCircle, XCircle, QrCode, Keyboard, Camera, UserPlus } from 'lucide-react';
import { supabase, calcularFechaVencimiento } from '@/lib/supabase';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import RenewMemberModal, { RenewalFormData } from '@/components/RenewMemberModal';
import AddMemberModal, { MemberFormData } from '@/components/AddMemberModal';

interface SearchResult {
    nombre: string;
    plan: string;
    vencido: boolean;
    fechaVencimiento?: string;
    dni: string;
    id: string; // Cambio a string para UUID
}

export default function AccesoPage() {
    const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
    const [dniSearch, setDniSearch] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [searching, setSearching] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [notFoundDni, setNotFoundDni] = useState('');
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (activeTab === 'qr' && !scanning) {
            setScanning(true);
            initScanner();
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [activeTab]);

    const initScanner = () => {
        const scanner = new Html5QrcodeScanner(
            'qr-reader',
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                videoConstraints: {
                    facingMode: 'environment'
                }
            },
            false
        );

        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
    };

    const onScanSuccess = async (decodedText: string) => {
        if (scannerRef.current) {
            await scannerRef.current.clear();
        }
        setScanning(false);
        await handleValidateAccess(decodedText);
    };

    const onScanError = (errorMessage: string) => {
        // Ignorar errores de escaneo continuo
        if (!errorMessage.includes('NotFoundException')) {
            // Ignorar errores de escaneo continuo
        }
    };

    const handleValidateAccess = async (dni?: string) => {
        const dniToValidate = dni || dniSearch;

        if (!dniToValidate) {
            toast.warning('Por favor, ingresa un DNI para validar');
            return;
        }

        setSearching(true);
        setSearchResult(null);

        try {
            const { data, error } = await (supabase
                .from('clientes') as any)
                .select(`
                    id, 
                    nombres, 
                    apellidos, 
                    dni,
                    matriculas (
                        id,
                        plan_id,
                        fecha_inicio,
                        fecha_vencimiento,
                        estado,
                        planes (nombre)
                    )
                `)
                .eq('dni', dniToValidate)
                .single();

            if (error || !data) {
                toast.error('Socio no encontrado');
                setNotFoundDni(dniToValidate);
                setSearchResult(null);
                return;
            }
            setNotFoundDni('');

            // Obtener la matrícula más reciente (activa o última vencida)
            const matriculas = data.matriculas || [];
            const ultimaMatricula = matriculas.length > 0
                ? [...matriculas].sort((a: any, b: any) => new Date(b.created_at || b.fecha_inicio).getTime() - new Date(a.created_at || a.fecha_inicio).getTime())[0]
                : null;

            const hoy = new Date();
            const fechaVenc = ultimaMatricula?.fecha_vencimiento ? new Date(ultimaMatricula.fecha_vencimiento) : null;
            const vencido = fechaVenc ? hoy > fechaVenc : true;

            const nombreCompleto = `${data.nombres} ${data.apellidos}`;

            setSearchResult({
                nombre: nombreCompleto,
                plan: ultimaMatricula?.planes?.nombre || 'Sin membresía',
                vencido: vencido,
                fechaVencimiento: ultimaMatricula?.fecha_vencimiento,
                dni: data.dni,
                id: data.id,
            });

            // Registrar asistencia si no está vencido
            if (!vencido) {
                await (supabase
                    .from('asistencias') as any)
                    .insert([{ cliente_id: data.id }]);
                toast.success(`${nombreCompleto} - Acceso permitido`);
            } else {
                toast.error(`${nombreCompleto} - Membresía vencida`);
            }
        } catch (error) {
            console.error('Error al validar acceso:', error);
            toast.error('Error al validar acceso');
        } finally {
            setSearching(false);
        }
    };

    const handleRenewMember = async (formData: RenewalFormData) => {
        if (!searchResult) return;

        try {
            // 1. Crear nueva matrícula
            const { data: newMatricula, error: matriculaError } = await (supabase
                .from('matriculas') as any)
                .insert([{
                    cliente_id: searchResult.id,
                    plan_id: formData.planId, // Ahora enviamos ID
                    fecha_inicio: formData.fechaInicio,
                    fecha_vencimiento: formData.fechaVencimiento,
                    monto_total: formData.montoTotal,
                    estado: 'activo'
                }])
                .select()
                .single();

            if (matriculaError) throw matriculaError;

            // 2. Registrar pago
            const { error: pagoError } = await (supabase
                .from('pagos') as any)
                .insert([{
                    matricula_id: newMatricula.id,
                    monto_pagado: formData.montoPagado,
                    metodo_pago: formData.metodoPago,
                    fecha_pago: new Date().toISOString()
                }]);

            if (pagoError) throw pagoError;

            toast.success('Membresía renovada exitosamente');
            setIsRenewModalOpen(false);

            // 3. Recargar validación
            handleValidateAccess(searchResult.dni);

        } catch (error) {
            console.error('Error al renovar:', error);
            toast.error('Error al renovar membresía');
        }
    };

    const handleAddMember = async (formData: MemberFormData) => {
        try {
            // 0. Buscar el plan para obtener la duración (si existe)
            let planData = null;
            if (formData.planId) {
                const { data: pData } = await (supabase
                    .from('planes') as any)
                    .select('*')
                    .eq('id', formData.planId)
                    .single();
                planData = pData;
            }

            // 1. Calcular fecha de vencimiento
            const fechaVencimiento = planData ? calcularFechaVencimiento((planData as any).duracion_dias, formData.fechaInicio) : null;

            // 1. Insertar cliente
            const { data: newCliente, error: clientError } = await (supabase
                .from('clientes') as any)
                .insert([
                    {
                        nombres: formData.nombres?.trim() || 'Sin Nombre',
                        apellidos: formData.apellidos?.trim() || '',
                        dni: formData.dni?.trim() || null,
                        telefono: formData.telefono?.trim() || null,
                        email: formData.email || null,
                        fecha_nacimiento: formData.fechaNacimiento || null,
                    },
                ])
                .select()
                .single();

            if (clientError) throw clientError;

            if (newCliente) {
                // 2. Insertar matrícula solo si hay plan
                if (planData) {
                    const { data: newMatricula, error: matriculaError } = await (supabase
                        .from('matriculas') as any)
                        .insert([
                            {
                                cliente_id: (newCliente as any).id,
                                plan_id: formData.planId as number,
                                fecha_inicio: formData.fechaInicio,
                                fecha_vencimiento: fechaVencimiento,
                                monto_total: (planData as any).precio_base,
                                estado: 'activo'
                            }
                        ])
                        .select()
                        .single();

                    if (matriculaError) {
                        console.error('Error al crear matrícula:', matriculaError);
                    }

                    // 3. Registrar el pago si existe monto pagado
                    if (formData.montoPagado && formData.montoPagado > 0 && newMatricula) {
                        await (supabase
                            .from('pagos') as any)
                            .insert([{
                                matricula_id: (newMatricula as any).id,
                                monto_pagado: formData.montoPagado,
                                metodo_pago: formData.metodoPago,
                                fecha_pago: new Date().toISOString()
                            }]);
                    }
                }

                toast.success('Cliente registrado exitosamente');
                setIsAddModalOpen(false);
                setNotFoundDni('');
                handleValidateAccess((newCliente as any).dni || '');
            }
        } catch (error) {
            console.error('Error al agregar cliente:', error);
            toast.error('Error inesperado al agregar cliente');
        }
    };

    const handleClear = () => {
        setDniSearch('');
        setSearchResult(null);
        if (activeTab === 'qr' && !scanning) {
            setScanning(true);
            initScanner();
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
                <div className="p-4 md:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center md:text-left">Validar Acceso</h2>
                        <p className="text-gray-400 text-sm md:text-base text-center md:text-left">Verifica la membresía de los socios antes de permitir el ingreso</p>
                    </div>

                    {/* Validation Card */}
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl p-5 md:p-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#AB8745]/20 rounded-2xl flex items-center justify-center border border-[#AB8745]/30">
                                    <QrCode className="w-8 h-8 md:w-10 md:h-10 text-[#D4A865]" />
                                </div>
                            </div>

                            <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-2">Control de Acceso</h3>
                            <p className="text-gray-400 text-sm text-center mb-8">
                                Escanea el QR o ingresa el DNI del socio
                            </p>

                            {/* Tabs */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6">
                                <button
                                    onClick={() => {
                                        setActiveTab('qr');
                                        setSearchResult(null);
                                        setDniSearch('');
                                    }}
                                    className={`py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'qr'
                                        ? 'bg-[#AB8745] text-white shadow-lg shadow-[#AB8745]/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <Camera className="w-5 h-5" />
                                    <span>Escaneo QR</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('manual');
                                        setSearchResult(null);
                                        if (scannerRef.current) {
                                            scannerRef.current.clear().catch(console.error);
                                            setScanning(false);
                                        }
                                    }}
                                    className={`py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'manual'
                                        ? 'bg-[#AB8745] text-white shadow-lg shadow-[#AB8745]/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <Keyboard className="w-5 h-5" />
                                    <span>Ingreso DNI</span>
                                </button>
                            </div>

                            {/* QR Scanner Tab */}
                            {activeTab === 'qr' && !searchResult && (
                                <div className="mb-6">
                                    <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                                    <p className="text-center text-sm text-gray-400 mt-4">
                                        Apunta la cámara al código QR del socio
                                    </p>
                                </div>
                            )}

                            {/* Manual DNI Tab */}
                            {activeTab === 'manual' && !searchResult && (
                                <div className="mb-6">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={dniSearch}
                                            onChange={(e) => setDniSearch(e.target.value.replace(/\D/g, ''))}
                                            onKeyPress={(e) => e.key === 'Enter' && handleValidateAccess()}
                                            placeholder="Ingresa DNI"
                                            className="flex-1 px-6 py-4 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all text-xl text-center font-bold tracking-wider"
                                            autoFocus
                                        />
                                    </div>
                                    {notFoundDni && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 p-4 bg-[#AB8745]/10 border border-[#AB8745]/30 rounded-xl text-center"
                                        >
                                            <p className="text-[#D4A865] font-medium mb-3 italic">
                                                ¿El DNI <span className="font-bold underline">{notFoundDni}</span> no existe?
                                            </p>
                                            <button
                                                onClick={() => setIsAddModalOpen(true)}
                                                className="px-6 py-2 bg-[#AB8745] hover:bg-[#8B6935] text-white rounded-lg font-bold transition-all flex items-center gap-2 mx-auto"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Registrar Nuevo Socio
                                            </button>
                                        </motion.div>
                                    )}
                                    <button
                                        onClick={() => handleValidateAccess()}
                                        disabled={!dniSearch || searching}
                                        className="w-full mt-3 px-6 py-4 bg-linear-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-[#AB8745] text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {searching ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                Verificando...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-6 h-6" />
                                                Validar Acceso
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Result Display */}
                            {searchResult && (
                                <div className={`p-4 md:p-8 rounded-2xl border-4 ${searchResult.vencido
                                    ? 'bg-red-600/20 border-red-600/50'
                                    : 'bg-green-600/20 border-green-600/50'
                                    } animate-in fade-in zoom-in duration-300`}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-6 ${searchResult.vencido ? 'bg-red-600/30' : 'bg-green-600/30'
                                            }`}>
                                            {searchResult.vencido ? (
                                                <XCircle className="w-10 h-10 md:w-14 md:h-14 text-red-400" />
                                            ) : (
                                                <CheckCircle className="w-10 h-10 md:w-14 md:h-14 text-green-400" />
                                            )}
                                        </div>

                                        <h4 className={`text-2xl md:text-4xl font-black mb-4 tracking-tight ${searchResult.vencido ? 'text-red-400' : 'text-green-400'
                                            }`}>
                                            {searchResult.vencido ? '🚫 ACCESO DENEGADO' : '✅ ACCESO PERMITIDO'}
                                        </h4>

                                        <div className="bg-black/40 backdrop-blur-md rounded-xl p-5 md:p-6 w-full max-w-md mb-6 border border-white/5">
                                            <p className="text-white font-black text-xl md:text-2xl mb-2">{searchResult.nombre}</p>
                                            <div className="flex flex-col gap-1 items-center">
                                                <p className="text-gray-400 text-sm md:text-lg">
                                                    DNI: <span className="text-[#AB8745] font-bold">{searchResult.dni}</span>
                                                </p>
                                                <p className="text-gray-400 text-sm md:text-lg">
                                                    Plan: <span className="text-[#AB8745] font-bold">{searchResult.plan.charAt(0).toUpperCase() + searchResult.plan.slice(1)}</span>
                                                </p>

                                                {searchResult.fechaVencimiento && (
                                                    <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${searchResult.vencido ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'}`}>
                                                        Vence: {new Date(searchResult.fechaVencimiento).toLocaleDateString('es-PE')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {searchResult.vencido && (
                                            <div className="mb-6 p-4 bg-red-600/20 rounded-lg border border-red-600/50">
                                                <p className="text-red-300 font-bold text-lg">
                                                    ⚠️ MEMBRESÍA VENCIDA
                                                </p>
                                                <p className="text-red-400 text-sm mt-1 mb-4">
                                                    El socio debe renovar su membresía para poder ingresar
                                                </p>
                                                <button
                                                    onClick={() => setIsRenewModalOpen(true)}
                                                    className="w-full px-8 py-3 bg-linear-to-r from-[#AB8745] to-[#D4A865] hover:from-[#8B6935] hover:to-[#B68A45] text-white rounded-lg font-bold shadow-lg shadow-[#AB8745]/20 animate-pulse transition-all"
                                                >
                                                    Renovar Membresía Ahora
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleClear}
                                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/30"
                                        >
                                            {activeTab === 'qr' ? 'Escanear Otro' : 'Validar Otro'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Renovación */}
            {searchResult && (
                <RenewMemberModal
                    isOpen={isRenewModalOpen}
                    onClose={() => setIsRenewModalOpen(false)}
                    onSubmit={handleRenewMember}
                    memberData={{
                        id: searchResult.id,
                        nombre: searchResult.nombre,
                        dni: searchResult.dni,
                        planActual: searchResult.plan,
                        fechaVencimiento: searchResult.fechaVencimiento || ''
                    }}
                />
            )}

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddMember}
            />
        </div>
    );
}
