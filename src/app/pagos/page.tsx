'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { CreditCard, DollarSign, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase, cargarPreciosPlanes } from '@/lib/supabase';
import { toast } from 'sonner';

interface PaymentStats {
  totalMes: number;
  pendientes: number;
  vencidos: number;
}

interface PaymentHistory {
  id: number;
  nombre: string;
  dni: string;
  plan: string;
  monto_pagado: number;
  created_at: string;
  fecha_vencimiento: string;
}

export default function PagosPage() {
  const [stats, setStats] = useState<PaymentStats>({
    totalMes: 0,
    pendientes: 0,
    vencidos: 0,
  });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ id: number, precio: number } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('efectivo');

  useEffect(() => {
    loadPaymentStats();

    // Recargar cuando la página se vuelve visible (ej: al volver desde otra página)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPaymentStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Recargar cada 30 segundos mientras la página está abierta
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadPaymentStats();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  const loadPaymentStats = async () => {
    try {
      setLoading(true);
      const hoy = new Date().toISOString().split('T')[0];
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      // Cargar precios desde configuración
      const preciosPlanes = await cargarPreciosPlanes();
      setPlanPrices(preciosPlanes);

      // Total del Mes (clientes registrados este mes)
      const { data: clientesMes } = await supabase
        .from('clientes')
        .select('plan, monto_pagado')
        .gte('created_at', inicioMesStr);

      let totalMes = 0;
      if (clientesMes) {
        totalMes = clientesMes.reduce((sum, cliente) => {
          // Usar monto_pagado si existe y es mayor a 0, sino usar precio del plan
          const monto = (cliente.monto_pagado && cliente.monto_pagado > 0)
            ? cliente.monto_pagado
            : (preciosPlanes[cliente.plan] || 0);
          return sum + monto;
        }, 0);
      }

      // Pendientes (clientes con fecha_vencimiento < hoy)
      const { count: pendientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .lt('fecha_vencimiento', hoy);

      // Vencidos (mismo que pendientes en este caso)
      const vencidosCount = pendientesCount || 0;

      // Historial de pagos (todos los clientes ordenados por fecha de registro)
      const { data: historial } = await supabase
        .from('clientes')
        .select('id, nombre, dni, plan, monto_pagado, created_at, fecha_vencimiento')
        .order('created_at', { ascending: false })
        .limit(50);

      setStats({
        totalMes,
        pendientes: pendientesCount || 0,
        vencidos: vencidosCount,
      });

      setPaymentHistory(historial || []);
    } catch (error) {
      console.error('Error al cargar estadísticas de pagos:', error);
      toast.error('Error al cargar estadísticas de pagos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPaymentStats();
    toast.success('Datos actualizados');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Pagos</h2>
              <p className="text-gray-400">Gestión de pagos y facturación</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-[#AB8745]/20 hover:bg-[#AB8745]/30 border border-[#AB8745]/30 rounded-lg text-[#D4A865] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-600/30 group-hover:bg-green-600/30 transition-all">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-green-400">S/ {stats.totalMes.toLocaleString()}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Total del Mes</h3>
              <p className="text-sm text-gray-500">Ingresos recibidos</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center border border-yellow-600/30 group-hover:bg-yellow-600/30 transition-all">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-yellow-400">{stats.pendientes}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Renovaciones Pendientes</h3>
              <p className="text-sm text-gray-500">Membresías vencidas</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30 group-hover:bg-[#AB8745]/30 transition-all">
                  <CreditCard className="w-6 h-6 text-[#D4A865]" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-[#D4A865]">{stats.vencidos}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Vencidos</h3>
              <p className="text-sm text-gray-500">Requieren atención</p>
            </div>
          </div>

          {/* Historial de Pagos */}
          <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#AB8745]/20">
              <h3 className="text-xl font-bold text-white">Historial de Pagos</h3>
              <p className="text-sm text-gray-400 mt-1">Registro de todas las inscripciones y renovaciones</p>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-[#AB8745]/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Monto Pagado</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Deuda</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#AB8745]/10">
                    {paymentHistory.map((pago) => {
                      const precioPlan = planPrices[pago.plan] || 0;
                      const montoPagado = (pago.monto_pagado && pago.monto_pagado > 0) ? pago.monto_pagado : 0;
                      const deuda = precioPlan - montoPagado;
                      const tieneDeuda = deuda > 0;

                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const vencimiento = new Date(pago.fecha_vencimiento);
                      vencimiento.setHours(0, 0, 0, 0);
                      const estaVencido = vencimiento < hoy;

                      const handleCompletarPago = async () => {
                        try {
                          const { error } = await supabase
                            .from('clientes')
                            .update({
                              monto_pagado: precioPlan,
                              metodo_pago: selectedMethod
                            })
                            .eq('id', selectedPayment!.id);

                          if (error) {
                            toast.error('Error al completar el pago');
                            return;
                          }

                          toast.success('Pago completado exitosamente');
                          setShowPaymentMethodModal(false);
                          setSelectedPayment(null);
                          loadPaymentStats();
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Error al completar el pago');
                        }
                      };

                      return (
                        <tr key={pago.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{pago.nombre}</div>
                              <div className="text-xs text-gray-400">DNI: {pago.dni}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30 capitalize">
                              {pago.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-green-400 font-semibold">S/ {montoPagado.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">de S/ {precioPlan.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tieneDeuda ? (
                              <div className="text-sm text-yellow-400 font-semibold">S/ {deuda.toFixed(2)}</div>
                            ) : (
                              <div className="text-sm text-green-400">✓ Completo</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">
                              {new Date(pago.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${estaVencido
                                ? 'bg-[#AB8745]/20 text-[#D4A865] border border-[#AB8745]/30'
                                : 'bg-green-600/20 text-green-400 border border-green-600/30'
                                }`}
                            >
                              {estaVencido ? 'Vencido' : 'Activo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tieneDeuda ? (
                              <button
                                onClick={() => {
                                  setSelectedPayment({ id: pago.id, precio: precioPlan });
                                  setShowPaymentMethodModal(true);
                                }}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/20"
                              >
                                Completar Pago
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Payment Method Modal */}
      {showPaymentMethodModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-[#AB8745]/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">Seleccionar Método de Pago</h3>

            <div className="space-y-4 mb-6">
              <button
                onClick={() => setSelectedMethod('efectivo')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${selectedMethod === 'efectivo'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 hover:border-green-500/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💵</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Efectivo</p>
                    <p className="text-sm text-gray-400">Pago en efectivo</p>
                  </div>
                  {selectedMethod === 'efectivo' && (
                    <div className="ml-auto w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </div>
              </button>

              <button
                onClick={() => setSelectedMethod('yape')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${selectedMethod === 'yape'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 hover:border-purple-500/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Yape</p>
                    <p className="text-sm text-gray-400">Pago digital</p>
                  </div>
                  {selectedMethod === 'yape' && (
                    <div className="ml-auto w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentMethodModal(false);
                  setSelectedPayment(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const handleCompletarPago = async () => {
                    try {
                      const { error } = await supabase
                        .from('clientes')
                        .update({
                          monto_pagado: selectedPayment.precio,
                          metodo_pago: selectedMethod
                        })
                        .eq('id', selectedPayment.id);

                      if (error) {
                        toast.error('Error al completar el pago');
                        return;
                      }

                      toast.success('Pago completado exitosamente');
                      setShowPaymentMethodModal(false);
                      setSelectedPayment(null);
                      loadPaymentStats();
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error('Error al completar el pago');
                    }
                  };
                  handleCompletarPago();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg font-semibold transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
