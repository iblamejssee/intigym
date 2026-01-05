'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { Search, Loader2, CheckCircle, XCircle, QrCode, Keyboard, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface SearchResult {
    nombre: string;
    plan: string;
    vencido: boolean;
    fechaVencimiento?: string;
    dni: string;
}

export default function AccesoPage() {
    const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr');
    const [dniSearch, setDniSearch] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [searching, setSearching] = useState(false);
    const [scanning, setScanning] = useState(false);
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

        if (!dniToValidate || dniToValidate.length !== 8) {
            toast.error('DNI inválido (debe tener 8 dígitos)');
            return;
        }

        setSearching(true);
        setSearchResult(null);

        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('nombre, plan, fecha_vencimiento, dni')
                .eq('dni', dniToValidate)
                .single();

            if (error || !data) {
                toast.error('Socio no encontrado');
                setSearchResult(null);
                return;
            }

            // Verificar si está vencido
            const hoy = new Date();
            const fechaVenc = data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null;
            const vencido = fechaVenc ? hoy > fechaVenc : true;

            setSearchResult({
                nombre: data.nombre,
                plan: data.plan,
                vencido: vencido,
                fechaVencimiento: data.fecha_vencimiento,
                dni: data.dni,
            });

            if (vencido) {
                toast.error(`${data.nombre} - Membresía vencida`);
            } else {
                toast.success(`${data.nombre} - Acceso permitido`);
            }
        } catch (error) {
            console.error('Error al validar acceso:', error);
            toast.error('Error al validar acceso');
        } finally {
            setSearching(false);
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
                <div className="p-6 md:p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Validar Acceso</h2>
                        <p className="text-gray-400">Verifica la membresía de los socios antes de permitir el ingreso</p>
                    </div>

                    {/* Validation Card */}
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl p-8">
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-[#AB8745]/20 rounded-2xl flex items-center justify-center border border-[#AB8745]/30">
                                    <QrCode className="w-10 h-10 text-[#D4A865]" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-white text-center mb-2">Control de Acceso</h3>
                            <p className="text-gray-400 text-center mb-8">
                                Escanea el QR o ingresa el DNI del socio
                            </p>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => {
                                        setActiveTab('qr');
                                        setSearchResult(null);
                                        setDniSearch('');
                                    }}
                                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'qr'
                                        ? 'bg-[#AB8745] text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <Camera className="w-5 h-5" />
                                    Escanear QR
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
                                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'manual'
                                        ? 'bg-[#AB8745] text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <Keyboard className="w-5 h-5" />
                                    Ingresar DNI
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
                                            onChange={(e) => setDniSearch(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                            onKeyPress={(e) => e.key === 'Enter' && handleValidateAccess()}
                                            placeholder="Ingresa DNI (8 dígitos)"
                                            className="flex-1 px-6 py-4 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all text-xl text-center font-bold tracking-wider"
                                            maxLength={8}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleValidateAccess()}
                                        disabled={dniSearch.length !== 8 || searching}
                                        className="w-full mt-3 px-6 py-4 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-[#AB8745] text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <div className={`p-8 rounded-xl border-4 ${searchResult.vencido
                                    ? 'bg-red-600/20 border-red-600/50'
                                    : 'bg-green-600/20 border-green-600/50'
                                    } animate-in fade-in zoom-in duration-300`}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${searchResult.vencido ? 'bg-red-600/30' : 'bg-green-600/30'
                                            }`}>
                                            {searchResult.vencido ? (
                                                <XCircle className="w-14 h-14 text-red-400" />
                                            ) : (
                                                <CheckCircle className="w-14 h-14 text-green-400" />
                                            )}
                                        </div>

                                        <h4 className={`text-4xl font-bold mb-4 ${searchResult.vencido ? 'text-red-400' : 'text-green-400'
                                            }`}>
                                            {searchResult.vencido ? '🚫 ACCESO DENEGADO' : '✅ ACCESO PERMITIDO'}
                                        </h4>

                                        <div className="bg-black/30 rounded-lg p-6 w-full max-w-md mb-6">
                                            <p className="text-white font-bold text-2xl mb-2">{searchResult.nombre}</p>
                                            <p className="text-gray-300 text-lg mb-1">
                                                DNI: <span className="text-[#AB8745] font-bold">{searchResult.dni}</span>
                                            </p>
                                            <p className="text-gray-300 text-lg mb-3">
                                                Plan: <span className="text-[#AB8745] font-bold">{searchResult.plan.charAt(0).toUpperCase() + searchResult.plan.slice(1)}</span>
                                            </p>

                                            {searchResult.fechaVencimiento && (
                                                <p className={`text-sm ${searchResult.vencido ? 'text-red-400' : 'text-green-400'}`}>
                                                    Vencimiento: {new Date(searchResult.fechaVencimiento).toLocaleDateString('es-PE')}
                                                </p>
                                            )}
                                        </div>

                                        {searchResult.vencido && (
                                            <div className="mb-6 p-4 bg-red-600/20 rounded-lg border border-red-600/50">
                                                <p className="text-red-300 font-bold text-lg">
                                                    ⚠️ MEMBRESÍA VENCIDA
                                                </p>
                                                <p className="text-red-400 text-sm mt-1">
                                                    El socio debe renovar su membresía para poder ingresar
                                                </p>
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
        </div>
    );
}
