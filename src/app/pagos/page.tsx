'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { CreditCard, DollarSign, AlertCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PaymentStats {
  totalMes: number;
  pendientes: number;
  deudores: number;
}

interface PaymentHistory {
  id: string;
  nombre: string;
  dni: string;
  plan: string;
  monto_pagado: number;
  metodo_pago: string;
  fecha_pago: string;
}

export default function PagosPage() {
  const [stats, setStats] = useState<PaymentStats>({
    totalMes: 0,
    pendientes: 0,
    deudores: 0,
  });
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState<{ id: number, deuda: number, nombre: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadPaymentStats();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadPaymentStats();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadPaymentStats();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const loadPaymentStats = async () => {
    try {
      setLoading(true);
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const inicioMesStr = inicioMes.toISOString();

      // Ejecutar todas las consultas en paralelo para máximo rendimiento
      const [pagoRes, vencidoRes, matriculaRes, historialRes] = await Promise.all([
        (supabase.from('pagos') as any).select('monto_pagado').gte('fecha_pago', inicioMesStr),
        (supabase.from('matriculas') as any).select('*', { count: 'exact', head: true }).eq('estado', 'vencido'),
        (supabase.from('matriculas') as any).select(`
          id,
          monto_total,
          planes (nombre),
          clientes (id, nombres, apellidos, dni),
          pagos (monto_pagado)
        `).in('estado', ['activo', 'vencido']).order('created_at', { ascending: false }).limit(100),
        (supabase.from('pagos') as any).select(`
          id,
          monto_pagado,
          metodo_pago,
          fecha_pago,
          matriculas (
            planes (nombre),
            clientes (nombres, apellidos, dni)
          )
        `).order('fecha_pago', { ascending: false }).limit(50)
      ]);

      if (pagoRes.error) throw pagoRes.error;
      if (vencidoRes.error) throw vencidoRes.error;
      if (matriculaRes.error) throw matriculaRes.error;
      if (historialRes.error) throw historialRes.error;

      // 1. Calcular total del mes
      const totalMes = pagoRes.data?.reduce((sum: number, pago: any) => sum + (pago.monto_pagado || 0), 0) || 0;

      // 2. Procesar deudores
      const deudoresList: any[] = [];
      if (matriculaRes.data) {
        matriculaRes.data.forEach((m: any) => {
          const pagado = m.pagos?.reduce((sum: number, p: any) => sum + (p.monto_pagado || 0), 0) || 0;
          const deuda = m.monto_total - pagado;
          if (deuda > 0) {
            deudoresList.push({
              id: m.id,
              cliente_id: m.clientes.id,
              nombre: `${m.clientes.nombres} ${m.clientes.apellidos}`,
              dni: m.clientes.dni,
              plan: m.planes?.nombre || 'Personalizado',
              monto_pagado: pagado,
              monto_total: m.monto_total,
              deuda
            });
          }
        });
      }

      setStats({
        totalMes,
        pendientes: vencidoRes.count || 0,
        deudores: deudoresList.length,
      });

      setDebtors(deudoresList);
      setPaymentHistory(historialRes.data || []);
    } catch (error) {
      console.error('Error al cargar estadísticas de pagos:', error);
      toast.error('Error al cargar estadísticas de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (metodoPago: string) => {
    if (!selectedPaymentData || isProcessing) return;

    try {
      setIsProcessing(true);

      const { error: pagoError } = await (supabase
        .from('pagos') as any)
        .insert([{
          matricula_id: selectedPaymentData.id, // El ID guardado en deudoresList es el de la matrícula
          monto_pagado: selectedPaymentData.deuda,
          metodo_pago: metodoPago,
          fecha_pago: new Date().toISOString()
        }]);

      if (pagoError) throw pagoError;

      toast.success('Pago completado exitosamente');
      setShowPaymentModal(false);
      setSelectedPaymentData(null);
      loadPaymentStats();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al completar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    loadPaymentStats();
    toast.success('Datos actualizados');
  };

  const handleDeletePago = async (pagoId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) return;

    try {
      setIsProcessing(true);
      const { error } = await (supabase
        .from('pagos') as any)
        .delete()
        .eq('id', pagoId);

      if (error) throw error;

      toast.success('Pago eliminado correctamente');
      loadPaymentStats();
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      toast.error('Error al eliminar el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-4 md:p-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Pagos</h2>
              <p className="text-gray-400">Gestión de pagos y flujo de caja</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-[#AB8745]/20 hover:bg-[#AB8745]/30 border border-[#AB8745]/30 rounded-xl text-[#D4A865] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-bold">Actualizar Datos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 md:p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-600/30 group-hover:bg-green-600/30 transition-all">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                {loading ? (
                  <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-green-400 animate-spin" />
                ) : (
                  <span className="text-2xl md:text-3xl font-bold text-green-400">S/ {stats.totalMes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Total del Mes</h3>
              <p className="text-sm text-gray-500">Ingresos reales (Enero)</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 md:p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center border border-yellow-600/30 group-hover:bg-yellow-600/30 transition-all">
                  <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                {loading ? (
                  <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-spin" />
                ) : (
                  <span className="text-2xl md:text-3xl font-bold text-yellow-400">{stats.pendientes}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Membresías Vencidas</h3>
              <p className="text-sm text-gray-500">Requieren renovación</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 md:p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30 group-hover:bg-[#AB8745]/30 transition-all">
                  <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#D4A865]" />
                </div>
                {loading ? (
                  <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-[#D4A865] animate-spin" />
                ) : (
                  <span className="text-2xl md:text-3xl font-bold text-[#D4A865]">{stats.deudores}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Total Debts</h3>
              <p className="text-sm text-gray-500">Clientes con deuda</p>
            </div>
          </div>

          {/* Sección de Deudores / Pagos Pendientes */}
          <div className="bg-white/5 backdrop-blur-xl border border-yellow-500/20 rounded-2xl shadow-2xl overflow-hidden mb-8">
            <div className="p-6 border-b border-yellow-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Pagos Pendientes / Deudas</h3>
                <p className="text-sm text-gray-400 mt-1">Clientes con saldo pendiente de pago</p>
              </div>
              {debtors.length > 0 && (
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-medium">
                  {debtors.length} Deudores
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              </div>
            ) : debtors.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-gray-400 font-medium">¡No hay deudas pendientes!</p>
                <p className="text-gray-500 text-sm mt-1">Todos los clientes están al día con sus pagos.</p>
              </div>
            ) : (
              <>
                {/* Vista Desktop (Tabla) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-yellow-500/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pagado</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Deuda</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-500/10">
                      {debtors.map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{cliente.nombre}</div>
                              <div className="text-xs text-gray-400">DNI: {cliente.dni}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="capitalize text-sm text-gray-300">{cliente.plan}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-400">S/ {cliente.monto_pagado.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-yellow-400">S/ {cliente.deuda.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedPaymentData({ id: cliente.id, deuda: cliente.deuda, nombre: cliente.nombre });
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1.5 bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/20"
                            >
                              Completar Pago
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista Mobile (Tarjetas) */}
                <div className="md:hidden divide-y divide-yellow-500/10">
                  {debtors.map((cliente) => (
                    <div key={cliente.id} className="p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-lg leading-tight">{cliente.nombre}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">DNI: {cliente.dni}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                            <span className="text-xs text-yellow-400 font-bold uppercase">{cliente.plan}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Pagado</p>
                          <p className="text-sm font-bold text-gray-300">S/ {cliente.monto_pagado.toFixed(2)}</p>
                        </div>
                        <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                          <p className="text-[10px] text-yellow-500/70 uppercase font-black tracking-widest mb-1">Deuda</p>
                          <p className="text-sm font-black text-yellow-400">S/ {cliente.deuda.toFixed(2)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPaymentData({ id: cliente.id, deuda: cliente.deuda, nombre: cliente.nombre });
                          setShowPaymentModal(true);
                        }}
                        className="w-full py-3 bg-linear-to-r from-green-600 to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-5 h-5" />
                        Completar Pago Ahora
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Historial de Transacciones */}
          <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#AB8745]/20">
              <h3 className="text-xl font-bold text-white">Historial de Transacciones</h3>
              <p className="text-sm text-gray-400 mt-1">Registro detallado de ingresos (Tiempo Real)</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No hay pagos registrados</p>
              </div>
            ) : (
              <>
                {/* Vista Desktop (Tabla) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-[#AB8745]/20">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Concepto</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Método</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#AB8745]/10">
                      {paymentHistory.map((pago) => (
                        <tr key={pago.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300 font-medium">
                              {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pago.matriculas?.clientes ? (
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {pago.matriculas.clientes.nombres} {pago.matriculas.clientes.apellidos}
                                </div>
                                <div className="text-xs text-gray-400">DNI: {pago.matriculas.clientes.dni}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-red-400">Información no disponible</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-300">
                              {pago.matriculas?.planes?.nombre || 'Pago membresía'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${pago.metodo_pago === 'yape'
                              ? 'bg-purple-600/20 text-purple-400 border-purple-600/30'
                              : 'bg-green-600/20 text-green-400 border-green-600/30'
                              }`}>
                              {pago.metodo_pago || 'efectivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-[#D4A865]">S/ {pago.monto_pagado.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeletePago(pago.id)}
                              className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Eliminar Pago"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista Mobile (Tarjetas) */}
                <div className="md:hidden divide-y divide-[#AB8745]/10">
                  {paymentHistory.map((pago) => (
                    <div key={pago.id} className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1">
                            {new Date(pago.fecha_pago).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <h4 className="font-bold text-white text-sm">
                            {pago.matriculas?.clientes?.nombres} {pago.matriculas?.clientes?.apellidos}
                          </h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${pago.metodo_pago === 'yape' ? 'bg-purple-600/20 text-purple-400 border-purple-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}`}>
                          {pago.metodo_pago || 'efectivo'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          {pago.matriculas?.planes?.nombre || 'Pago membresía'}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-[#D4A865]">S/ {pago.monto_pagado.toFixed(2)}</span>
                          <button
                            onClick={() => handleDeletePago(pago.id)}
                            className="p-2 bg-red-600/10 text-red-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Payment Method Modal */}
      {showPaymentModal && selectedPaymentData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#AB8745]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">Completar Pago</h3>
            <p className="text-gray-400 mb-6">
              {selectedPaymentData.nombre} - Deuda: <span className="text-yellow-400 font-bold">S/ {selectedPaymentData.deuda.toFixed(2)}</span>
            </p>

            <p className="text-sm text-gray-300 mb-4">Selecciona el método de pago:</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleProcessPayment('efectivo')}
                disabled={isProcessing}
                className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💵</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Efectivo</p>
                    <p className="text-sm text-gray-400">Pago en efectivo</p>
                  </div>
                  {isProcessing && <Loader2 className="w-5 h-5 ml-auto animate-spin text-green-500" />}
                </div>
              </button>

              <button
                onClick={() => handleProcessPayment('yape')}
                disabled={isProcessing}
                className="w-full p-4 rounded-xl border-2 border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Yape</p>
                    <p className="text-sm text-gray-400">Pago digital</p>
                  </div>
                  {isProcessing && <Loader2 className="w-5 h-5 ml-auto animate-spin text-purple-500" />}
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                if (!isProcessing) {
                  setShowPaymentModal(false);
                  setSelectedPaymentData(null);
                }
              }}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
