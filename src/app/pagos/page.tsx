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
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState<{ id: number, deuda: number, nombre: string } | null>(null);

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
      const hoy = new Date().toISOString().split('T')[0];
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      // Cargar precios de planes
      const preciosPlanes = await cargarPreciosPlanes();
      setPlanPrices(preciosPlanes);

      // 1. Total del Mes: Suma de historial_pagos del mes actual
      const { data: pagosMes } = await supabase
        .from('historial_pagos')
        .select('monto')
        .gte('created_at', inicioMesStr);

      const totalMes = pagosMes?.reduce((sum, pago) => sum + (pago.monto || 0), 0) || 0;

      // 2. Pendientes y Vencidos (mismo lógica basada en clientes)
      const { count: pendientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .lt('fecha_vencimiento', hoy);

      // 3. Deudores: Clientes con deuda (monto_pagado < precio_plan)
      const { data: clientesActivos } = await supabase
        .from('clientes')
        .select('id, nombre, dni, plan, monto_pagado, created_at, fecha_vencimiento')
        .order('created_at', { ascending: false });

      const deudoresList = clientesActivos?.filter(cliente => {
        const precio = preciosPlanes[cliente.plan] || 0;
        const apagado = cliente.monto_pagado || 0;
        return apagado < precio; // Solo mostrar si deben algo
      }) || [];

      // 4. Historial de Pagos: Fetch directo de historial_pagos con join a clientes
      const { data: historial, error: historyError } = await supabase
        .from('historial_pagos')
        .select(`
          id,
          monto,
          metodo_pago,
          concepto,
          created_at,
          clientes (
            nombre,
            dni,
            plan
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;

      setStats({
        totalMes,
        pendientes: pendientesCount || 0,
        vencidos: pendientesCount || 0,
      });

      setDebtors(deudoresList);
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

      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-6 md:p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Pagos</h2>
              <p className="text-gray-400">Gestión de pagos y flujo de caja</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-600/30 group-hover:bg-green-600/30 transition-all">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-green-400">S/ {stats.totalMes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Total del Mes</h3>
              <p className="text-sm text-gray-500">Ingresos reales (Enero)</p>
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
              <h3 className="text-gray-300 font-semibold mb-1">Membresías Vencidas</h3>
              <p className="text-sm text-gray-500">Requieren renovación</p>
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
              <div className="overflow-x-auto">
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
                    {debtors.map((cliente) => {
                      const precioPlan = planPrices[cliente.plan] || 0;
                      const montoPagado = cliente.monto_pagado || 0;
                      const deuda = precioPlan - montoPagado;

                      return (
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
                            <span className="text-sm text-gray-400">S/ {montoPagado.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-yellow-400">S/ {deuda.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedPaymentData({ id: cliente.id, deuda, nombre: cliente.nombre });
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/20"
                            >
                              Completar Pago
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-[#AB8745]/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Concepto</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Método</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#AB8745]/10">
                    {paymentHistory.map((pago) => (
                      <tr key={pago.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300 font-medium">
                            {new Date(pago.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pago.clientes ? (
                            <div>
                              <div className="text-sm font-medium text-white">{pago.clientes.nombre}</div>
                              <div className="text-xs text-gray-400">DNI: {pago.clientes.dni}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-red-400">Cliente Eliminado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-300">{pago.concepto || 'Pago de membresía'}</span>
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
                          <div className="text-sm font-bold text-[#D4A865]">S/ {pago.monto.toFixed(2)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                onClick={async () => {
                  const handleCompletarPago = async (metodoPago: string) => {
                    try {
                      const { error: pagoError } = await supabase
                        .from('historial_pagos')
                        .insert([{
                          cliente_id: selectedPaymentData.id,
                          monto: selectedPaymentData.deuda,
                          metodo_pago: metodoPago,
                          concepto: 'Pago complementario de membresía'
                        }]);

                      if (pagoError) {
                        toast.error('Error al registrar el pago');
                        console.error(pagoError);
                        return;
                      }

                      // Calcular nuevo monto_pagado
                      const { data: cliente } = await supabase
                        .from('clientes')
                        .select('monto_pagado')
                        .eq('id', selectedPaymentData.id)
                        .single();

                      const nuevoMonto = (cliente?.monto_pagado || 0) + selectedPaymentData.deuda;

                      const { error } = await supabase
                        .from('clientes')
                        .update({ monto_pagado: nuevoMonto })
                        .eq('id', selectedPaymentData.id);

                      if (error) {
                        toast.error('Error al completar el pago');
                        return;
                      }

                      toast.success('Pago completado exitosamente');
                      setShowPaymentModal(false);
                      setSelectedPaymentData(null);
                      loadPaymentStats();
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error('Error al completar el pago');
                    }
                  };
                  await handleCompletarPago('efectivo');
                }}
                className="w-full p-4 rounded-xl border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💵</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Efectivo</p>
                    <p className="text-sm text-gray-400">Pago en efectivo</p>
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  const handleCompletarPago = async (metodoPago: string) => {
                    try {
                      const { error: pagoError } = await supabase
                        .from('historial_pagos')
                        .insert([{
                          cliente_id: selectedPaymentData.id,
                          monto: selectedPaymentData.deuda,
                          metodo_pago: metodoPago,
                          concepto: 'Pago complementario de membresía'
                        }]);

                      if (pagoError) {
                        toast.error('Error al registrar el pago');
                        console.error(pagoError);
                        return;
                      }

                      const { data: cliente } = await supabase
                        .from('clientes')
                        .select('monto_pagado')
                        .eq('id', selectedPaymentData.id)
                        .single();

                      const nuevoMonto = (cliente?.monto_pagado || 0) + selectedPaymentData.deuda;

                      const { error } = await supabase
                        .from('clientes')
                        .update({ monto_pagado: nuevoMonto })
                        .eq('id', selectedPaymentData.id);

                      if (error) {
                        toast.error('Error al completar el pago');
                        return;
                      }

                      toast.success('Pago completado exitosamente');
                      setShowPaymentModal(false);
                      setSelectedPaymentData(null);
                      loadPaymentStats();
                    } catch (error) {
                      console.error('Error:', error);
                      toast.error('Error al completar el pago');
                    }
                  };
                  await handleCompletarPago('yape');
                }}
                className="w-full p-4 rounded-xl border-2 border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <p className="text-white font-semibold">Yape</p>
                    <p className="text-sm text-gray-400">Pago digital</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedPaymentData(null);
              }}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
